"""Offline tests; Apple signing and upload services are never contacted."""

import importlib.util
import json
from pathlib import Path
import plistlib
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import zipfile


SPEC = importlib.util.spec_from_file_location("connect", Path(__file__).resolve().parents[1] / "connect.py")
connect = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(connect)

TEAM = "ABCDE12345"
IPA = "gen/apple/build/arm64/Rail Map Toolkit.ipa"


class ConnectTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.environment = {
            "RUNNER_TEMP": str(self.root / "runner"),
            "HOME": str(self.root / "home"),
            "GITHUB_ENV": str(self.root / "github-env"),
            "GITHUB_WORKSPACE": str(self.root / "workspace"),
            "RMT_DISTRIBUTION_CHANNEL": "internal",
            "RMT_APPLE_BUILD_NUMBER": "84.2",
            "APPLE_DEVELOPMENT_TEAM": TEAM,
            "APP_STORE_CONNECT_API_KEY_ID": "KEY1234567",
            "APP_STORE_CONNECT_API_ISSUER_ID": "12345678-1234-1234-1234-123456789abc",
            "APP_STORE_CONNECT_API_PRIVATE_KEY": "-----BEGIN PRIVATE KEY-----\nprivate-key-sentinel\n-----END PRIVATE KEY-----",
        }

    def test_channels_export_with_automatic_signing_without_renumbering(self):
        for channel in ("appstore", "internal"):
            with self.subTest(channel=channel):
                options = connect.export_options(channel, TEAM)
                self.assertEqual(options["method"], "app-store-connect")
                self.assertEqual(options["destination"], "export")
                self.assertEqual(options["signingStyle"], "automatic")
                self.assertEqual(options["teamID"], TEAM)
                self.assertIs(options["testFlightInternalTestingOnly"], channel == "internal")
                self.assertIs(options["manageAppVersionAndBuildNumber"], False)
                self.assertNotIn("signingCertificate", options)
                self.assertNotIn("provisioningProfiles", options)
        with self.assertRaises(connect.ConnectError):
            connect.export_options("testflight", TEAM)

    @patch.object(connect.subprocess, "run")
    def test_prepare_and_cleanup_both_channels_without_local_signing_material(self, run):
        for channel in ("appstore", "internal"):
            with self.subTest(channel=channel):
                self.environment["RMT_DISTRIBUTION_CHANNEL"] = channel
                env_file = Path(self.environment["GITHUB_ENV"])
                env_file.unlink(missing_ok=True)
                with patch("builtins.print"):
                    connect.prepare(self.environment)
                root = connect.signing_root(self.environment)
                options = plistlib.loads((root / "ExportOptions.plist").read_bytes())
                self.assertEqual(options, connect.export_options(channel, TEAM))
                self.assertEqual(root.stat().st_mode & 0o777, 0o700)
                key = root / "AuthKey_KEY1234567.p8"
                self.assertEqual(key.stat().st_mode & 0o777, 0o600)
                self.assertEqual(key.read_text().strip(), self.environment["APP_STORE_CONNECT_API_PRIVATE_KEY"])
                outputs = dict(line.split("=", 1) for line in env_file.read_text().splitlines())
                self.assertEqual(outputs, {
                    "RMT_CONNECT_API_KEY_PATH": str(key),
                    "RMT_EXPORT_OPTIONS_PLIST": str(root / "ExportOptions.plist"),
                })
                self.assertNotIn("private-key-sentinel", env_file.read_text())
                self.assertEqual({item.name for item in root.iterdir()}, {key.name, "ExportOptions.plist"})
                with patch("builtins.print"):
                    connect.cleanup(self.environment)
                self.assertFalse(root.exists())
        run.assert_not_called()

    def test_invalid_configuration_fails_before_writing_private_material(self):
        invalid_values = {
            "RMT_DISTRIBUTION_CHANNEL": "testflight",
            "APPLE_DEVELOPMENT_TEAM": "invalid-team-sentinel",
            "APP_STORE_CONNECT_API_KEY_ID": "invalid-key-id-sentinel",
            "APP_STORE_CONNECT_API_ISSUER_ID": "invalid-issuer-sentinel",
            "APP_STORE_CONNECT_API_PRIVATE_KEY": "invalid-private-key-sentinel",
        }
        for name, value in invalid_values.items():
            with self.subTest(name=name):
                environment = {**self.environment, name: value}
                with self.assertRaises(connect.ConnectError) as failure:
                    connect.prepare(environment)
                self.assertNotIn(value, str(failure.exception))
                self.assertFalse(connect.signing_root(environment).exists())
                self.assertFalse(Path(environment["GITHUB_ENV"]).exists())

    def test_cleanup_after_partial_prepare_preserves_unrelated_files(self):
        self.environment["GITHUB_ENV"] = str(self.root / "missing/github-env")
        with self.assertRaises(OSError):
            connect.prepare(self.environment)
        root = connect.signing_root(self.environment)
        self.assertTrue((root / "AuthKey_KEY1234567.p8").is_file())
        unrelated = root.parent / "unrelated.p8"
        unrelated.write_text("preserve")
        with patch("builtins.print"):
            connect.cleanup(self.environment)
            connect.cleanup(self.environment)
        self.assertFalse(root.exists())
        self.assertEqual(unrelated.read_text(), "preserve")

    def test_prepare_and_cleanup_reject_symlink_to_unrelated_directory(self):
        root = connect.signing_root(self.environment)
        root.parent.mkdir(parents=True)
        unrelated = self.root / "unrelated"
        unrelated.mkdir()
        private = unrelated / "private.p8"
        private.write_text("preserve")
        root.symlink_to(unrelated, target_is_directory=True)
        with self.assertRaises(connect.ConnectError):
            connect.prepare(self.environment)
        with self.assertRaises(connect.ConnectError):
            connect.cleanup(self.environment)
        self.assertTrue(root.is_symlink())
        self.assertEqual(private.read_text(), "preserve")

    def make_ipa(self):
        tauri = self.root / "workspace/tauri"
        tauri.mkdir(parents=True)
        app = self.root / "fixture/Payload/Rail Map Toolkit.app"
        app.mkdir(parents=True)
        (tauri.parent / "package.json").write_text(json.dumps({"version": "3.2.49"}))
        info = {
            "CFBundleIdentifier": connect.BUNDLE_ID,
            "CFBundleShortVersionString": "3.2.49",
            "CFBundleVersion": "84.2",
            "CFBundleExecutable": "Rail Map Toolkit",
            "UIDeviceFamily": [1, 2],
            "NSPhotoLibraryAddUsageDescription": "Save exports",
            "UIApplicationSceneManifest": {
                "UIApplicationSupportsMultipleScenes": False,
                "UISceneConfigurations": {"UIWindowSceneSessionRoleApplication": [{"UISceneDelegateClassName": "RMTSceneDelegate"}]},
            },
        }
        (app / "Info.plist").write_bytes(plistlib.dumps(info))
        (app / "Rail Map Toolkit").write_bytes(bytes.fromhex("cffaedfe") + b"device binary")
        (app / "embedded.mobileprovision").write_bytes(b"public signed profile")
        for component in ("", *connect.CHILDREN):
            resource = app / "assets/ui" / component
            resource.mkdir(parents=True, exist_ok=True)
            (resource / "index.html").write_text("<html>rmt-native-edge-to-edge</html>")
            (resource / "info.json").write_text(json.dumps({"instance": "AppStore"}))
        self.write_ipa(tauri, app)
        return tauri, app

    def write_ipa(self, tauri, app):
        ipa = tauri / IPA
        ipa.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(ipa, "w") as package:
            for item in app.rglob("*"):
                package.write(item, item.relative_to(app.parent.parent))

    def ipa_command(self, arguments, **kwargs):
        output = b""
        if arguments[:3] == ["ditto", "-x", "-k"]:
            with zipfile.ZipFile(arguments[-2]) as package:
                package.extractall(arguments[-1])
        elif arguments[:3] == ["xcrun", "lipo", "-archs"]:
            output = b"arm64\n"
        elif arguments[:3] == ["xcrun", "vtool", "-show-build"]:
            output = b"    platform IOS\n"
        elif arguments[:2] == ["codesign", "-dv"]:
            output = f"Authority=Apple Distribution: Example\nTeamIdentifier={TEAM}\n".encode()
        return subprocess.CompletedProcess(arguments, 0, stdout=output, stderr=b"")

    @patch.object(connect.subprocess, "run")
    def test_verify_signed_ipa_checks_signature_and_removes_extracted_files(self, run):
        run.side_effect = self.ipa_command
        tauri, _ = self.make_ipa()
        with patch("builtins.print"):
            connect.verify(self.environment, tauri)
        calls = [call.args[0] for call in run.call_args_list]
        self.assertTrue(any(arguments[:4] == ["codesign", "--verify", "--deep", "--strict"] for arguments in calls))
        extraction = next(arguments[-1] for arguments in calls if arguments[:3] == ["ditto", "-x", "-k"])
        self.assertFalse(Path(extraction).exists())

    @patch.object(connect.subprocess, "run")
    def test_verify_rejects_wrong_build_private_keys_runner_paths_and_missing_resources(self, run):
        run.side_effect = self.ipa_command
        tauri, app = self.make_ipa()
        self.environment["RMT_APPLE_BUILD_NUMBER"] = "85.1"
        with self.assertRaisesRegex(connect.ConnectError, "build number"):
            connect.verify(self.environment, tauri)
        self.environment["RMT_APPLE_BUILD_NUMBER"] = "84.2"
        private = app / "private.p8"
        private.write_text("private material")
        self.write_ipa(tauri, app)
        with self.assertRaisesRegex(connect.ConnectError, "private signing"):
            connect.verify(self.environment, tauri)
        private.unlink()
        binary = app / "Rail Map Toolkit"
        binary.write_bytes(binary.read_bytes() + self.environment["GITHUB_WORKSPACE"].encode())
        self.write_ipa(tauri, app)
        with self.assertRaisesRegex(connect.ConnectError, "private runner path"):
            connect.verify(self.environment, tauri)
        binary.write_bytes(bytes.fromhex("cffaedfe") + b"device binary")
        (app / "assets/ui/rmp/index.html").unlink()
        self.write_ipa(tauri, app)
        with self.assertRaisesRegex(connect.ConnectError, "missing a bundled application"):
            connect.verify(self.environment, tauri)

    @patch.object(connect.subprocess, "run")
    def test_verify_rejects_unsigned_wrong_team_or_unprovisioned_ipa(self, run):
        tauri, app = self.make_ipa()

        def unsigned(arguments, **kwargs):
            if arguments[:2] == ["codesign", "--verify"]:
                return subprocess.CompletedProcess(arguments, 1, stdout=b"", stderr=b"not signed")
            return self.ipa_command(arguments, **kwargs)

        run.side_effect = unsigned
        with self.assertRaisesRegex(connect.ConnectError, "signature verification failed"):
            connect.verify(self.environment, tauri)

        def wrong_team(arguments, **kwargs):
            if arguments[:2] == ["codesign", "-dv"]:
                return subprocess.CompletedProcess(arguments, 0, stdout=b"TeamIdentifier=OTHER12345\n", stderr=b"")
            return self.ipa_command(arguments, **kwargs)

        run.side_effect = wrong_team
        with self.assertRaisesRegex(connect.ConnectError, "different Apple team"):
            connect.verify(self.environment, tauri)
        run.side_effect = self.ipa_command
        (app / "embedded.mobileprovision").unlink()
        self.write_ipa(tauri, app)
        with self.assertRaisesRegex(connect.ConnectError, "embedded provisioning profile"):
            connect.verify(self.environment, tauri)


if __name__ == "__main__":
    unittest.main()
