"""Offline tests; signing commands are mocked and never touch the real keychain."""

import base64
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import hashlib
import importlib.util
import json
from pathlib import Path
import plistlib
import subprocess
import tempfile
import unittest
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location("connect", Path(__file__).resolve().parents[1] / "connect.py")
connect = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(connect)

TEAM = "ABCDE12345"
PROFILE_UUID = "12345678-1234-1234-1234-123456789ABC"
CERTIFICATE = b"test distribution certificate"
IDENTITY = hashlib.sha1(CERTIFICATE).hexdigest().upper()
NOW = datetime(2026, 11, 13, tzinfo=timezone.utc)


def profile():
    return {
        "UUID": PROFILE_UUID,
        "TeamIdentifier": [TEAM],
        "Platform": ["iOS"],
        "ApplicationIdentifierPrefix": [TEAM],
        "ExpirationDate": datetime.now() + timedelta(days=30),
        "Entitlements": {
            "application-identifier": f"{TEAM}.{connect.BUNDLE_ID}",
            "com.apple.developer.team-identifier": TEAM,
            "get-task-allow": False,
        },
        "DeveloperCertificates": [CERTIFICATE],
    }


class ConnectTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.home = self.root / "home"
        self.home.mkdir()
        self.environment = {
            "RUNNER_TEMP": str(self.root / "runner"),
            "HOME": str(self.home),
            "GITHUB_ENV": str(self.root / "github-env"),
            "GITHUB_WORKSPACE": str(self.root / "workspace"),
            "RMT_DISTRIBUTION_CHANNEL": "internal",
            "RMT_APPLE_BUILD_NUMBER": "84.2",
            "APPLE_DEVELOPMENT_TEAM": TEAM,
            "APPLE_CERTIFICATE_P12_BASE64": base64.b64encode(b"fake p12").decode(),
            "APPLE_CERTIFICATE_PASSWORD": "test certificate password",
            "APPLE_PROVISIONING_PROFILE_BASE64": base64.b64encode(b"signed profile").decode(),
            "APP_STORE_CONNECT_API_KEY_ID": "KEY1234567",
            "APP_STORE_CONNECT_API_ISSUER_ID": "12345678-1234-1234-1234-123456789abc",
            "APP_STORE_CONNECT_API_PRIVATE_KEY": "-----BEGIN PRIVATE KEY-----\nprivate-key-sentinel\n-----END PRIVATE KEY-----",
        }
        self.calls = []

    def signing_command(self, arguments, **kwargs):
        self.calls.append(arguments)
        output = b""
        if arguments[:3] == ["security", "cms", "-D"]:
            output = plistlib.dumps(profile())
        elif arguments[:2] == ["security", "create-keychain"]:
            Path(arguments[-1]).write_bytes(b"test keychain")
        elif arguments[:2] == ["security", "list-keychains"] and "-s" not in arguments:
            output = b'"/test/login.keychain-db"\n'
        elif arguments[:2] == ["security", "find-identity"]:
            output = f'  1) {IDENTITY} "Apple Distribution: Example ({TEAM})"\n'.encode()
        return subprocess.CompletedProcess(arguments, 0, stdout=output, stderr=b"")

    def test_channels_upload_without_renumbering_or_local_export(self):
        for channel in ("appstore", "internal"):
            with self.subTest(channel=channel):
                options = connect.export_options(channel, TEAM, PROFILE_UUID, IDENTITY)
                self.assertEqual(options["method"], "app-store-connect")
                self.assertEqual(options["destination"], "upload")
                self.assertIs(options["testFlightInternalTestingOnly"], channel == "internal")
                self.assertIs(options["manageAppVersionAndBuildNumber"], False)
                self.assertEqual(options["provisioningProfiles"], {connect.BUNDLE_ID: PROFILE_UUID})
        with self.assertRaises(connect.ConnectError):
            connect.export_options("testflight", TEAM, PROFILE_UUID, IDENTITY)

    def test_profile_requires_unexpired_explicit_app_store_profile(self):
        valid = profile()
        valid["ExpirationDate"] = NOW + timedelta(days=1)
        self.assertEqual(connect.validate_profile(valid, TEAM, now=NOW), PROFILE_UUID)
        mutations = {
            "expired": lambda item: item.update(ExpirationDate=NOW - timedelta(seconds=1)),
            "another team": lambda item: item.update(TeamIdentifier=["OTHER12345"]),
            "another platform": lambda item: item.update(Platform=["OSX"]),
            "wildcard app": lambda item: item["Entitlements"].update({"application-identifier": f"{TEAM}.*"}),
            "wrong app": lambda item: item["Entitlements"].update({"application-identifier": f"{TEAM}.another.app"}),
            "entitlement team": lambda item: item["Entitlements"].update({"com.apple.developer.team-identifier": "OTHER12345"}),
            "development": lambda item: item["Entitlements"].update({"get-task-allow": True}),
            "ad hoc": lambda item: item.update(ProvisionedDevices=["device-id"]),
            "enterprise": lambda item: item.update(ProvisionsAllDevices=True),
            "no certificate": lambda item: item.update(DeveloperCertificates=[]),
            "invalid UUID": lambda item: item.update(UUID="../../other-file"),
        }
        for label, mutation in mutations.items():
            with self.subTest(label=label):
                invalid = deepcopy(valid)
                mutation(invalid)
                with self.assertRaises(connect.ConnectError):
                    connect.validate_profile(invalid, TEAM, now=NOW)

    def test_legacy_app_identifier_prefix_can_differ_from_team(self):
        valid = profile()
        valid["ApplicationIdentifierPrefix"] = ["OLDPREFIX1"]
        valid["Entitlements"]["application-identifier"] = f"OLDPREFIX1.{connect.BUNDLE_ID}"
        self.assertEqual(connect.validate_profile(valid, TEAM), PROFILE_UUID)

    @patch.object(connect.subprocess, "run")
    def test_prepare_and_cleanup_both_channels(self, run):
        run.side_effect = self.signing_command
        for channel in ("appstore", "internal"):
            with self.subTest(channel=channel):
                self.environment["RMT_DISTRIBUTION_CHANNEL"] = channel
                with patch("builtins.print"):
                    connect.prepare(self.environment)
                root = connect.signing_root(self.environment)
                options = plistlib.loads((root / "ExportOptions.plist").read_bytes())
                self.assertEqual(options, connect.export_options(channel, TEAM, PROFILE_UUID, IDENTITY))
                self.assertEqual(root.stat().st_mode & 0o777, 0o700)
                self.assertFalse((root / "certificate.p12").exists())
                key = root / "AuthKey_KEY1234567.p8"
                self.assertEqual(key.stat().st_mode & 0o777, 0o600)
                outputs = Path(self.environment["GITHUB_ENV"]).read_text()
                self.assertIn(f"RMT_SIGNING_CERTIFICATE={IDENTITY}\n", outputs)
                self.assertIn(f"RMT_PROVISIONING_PROFILE_UUID={PROFILE_UUID}\n", outputs)
                self.assertNotIn("private-key-sentinel", outputs)
                for directory in connect.profile_directories(self.home):
                    self.assertEqual((directory / f"{PROFILE_UUID}.mobileprovision").read_bytes(), b"signed profile")
                with patch("builtins.print"):
                    connect.cleanup(self.environment)
                self.assertFalse(root.exists())
                self.assertTrue(all(not list(directory.glob("*.mobileprovision")) for directory in connect.profile_directories(self.home)))

    @patch.object(connect.subprocess, "run")
    def test_partial_failure_can_clean_up_without_github_env_outputs(self, run):
        def fail_import(arguments, **kwargs):
            if arguments[:2] == ["security", "import"]:
                return subprocess.CompletedProcess(arguments, 1, stdout=b"private-error-sentinel", stderr=b"")
            return self.signing_command(arguments, **kwargs)

        run.side_effect = fail_import
        with self.assertRaisesRegex(connect.ConnectError, "Could not import") as failure:
            connect.prepare(self.environment)
        self.assertNotIn("private-error-sentinel", str(failure.exception))
        self.assertFalse(Path(self.environment["GITHUB_ENV"]).exists())
        with patch("builtins.print"):
            connect.cleanup(self.environment)
        self.assertFalse(connect.signing_root(self.environment).exists())
        self.assertTrue(any(call[:2] == ["security", "delete-keychain"] for call in self.calls))

    @patch.object(connect.subprocess, "run")
    def test_cleanup_preserves_existing_profiles_and_unrelated_files(self, run):
        run.side_effect = self.signing_command
        existing = connect.profile_directories(self.home)[0] / f"{PROFILE_UUID}.mobileprovision"
        existing.parent.mkdir(parents=True)
        existing.write_bytes(b"signed profile")
        unrelated = existing.parent / "unrelated.mobileprovision"
        unrelated.write_bytes(b"other profile")
        with patch("builtins.print"):
            connect.prepare(self.environment)
            connect.cleanup(self.environment)
        self.assertEqual(existing.read_bytes(), b"signed profile")
        self.assertEqual(unrelated.read_bytes(), b"other profile")

    @patch.object(connect.subprocess, "run")
    def test_cleanup_removes_private_material_even_if_a_profile_changed(self, run):
        run.side_effect = self.signing_command
        with patch("builtins.print"):
            connect.prepare(self.environment)
        installed = connect.profile_directories(self.home)[0] / f"{PROFILE_UUID}.mobileprovision"
        installed.write_bytes(b"replacement that must be preserved")
        with self.assertRaisesRegex(connect.ConnectError, "changed files were preserved"):
            connect.cleanup(self.environment)
        self.assertEqual(installed.read_bytes(), b"replacement that must be preserved")
        self.assertFalse(connect.signing_root(self.environment).exists())
        self.assertTrue(any(call[:2] == ["security", "delete-keychain"] for call in self.calls))

    @patch.object(connect.subprocess, "run")
    def test_rejects_identity_that_is_not_in_the_profile(self, run):
        def wrong_identity(arguments, **kwargs):
            if arguments[:2] == ["security", "find-identity"]:
                return subprocess.CompletedProcess(arguments, 0, stdout=f'1) {"F" * 40} "Apple Distribution: Wrong"'.encode(), stderr=b"")
            return self.signing_command(arguments, **kwargs)

        run.side_effect = wrong_identity
        with self.assertRaisesRegex(connect.ConnectError, "matching the provisioning profile"):
            connect.prepare(self.environment)
        with patch("builtins.print"):
            connect.cleanup(self.environment)

    @patch.object(connect.subprocess, "run")
    def test_invalid_secret_fails_before_creating_signing_files(self, run):
        self.environment["APPLE_CERTIFICATE_P12_BASE64"] = "secret-invalid-base64!"
        with self.assertRaisesRegex(connect.ConnectError, "APPLE_CERTIFICATE_P12_BASE64") as failure:
            connect.prepare(self.environment)
        self.assertNotIn("secret-invalid-base64", str(failure.exception))
        self.assertFalse(connect.signing_root(self.environment).exists())
        run.assert_not_called()

    def make_archive(self):
        tauri = self.root / "workspace/tauri"
        app = tauri / "gen/apple/build/railmapgen.xcarchive/Products/Applications/Rail Map Toolkit.app"
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
        return tauri, app

    def archive_command(self, arguments, **kwargs):
        output = b""
        if arguments[:3] == ["xcrun", "lipo", "-archs"]:
            output = b"arm64\n"
        elif arguments[:3] == ["xcrun", "vtool", "-show-build"]:
            output = b"    platform IOS\n"
        elif arguments[:2] == ["codesign", "-dv"]:
            output = f"Authority=Apple Distribution: Example\nTeamIdentifier={TEAM}\n".encode()
        return subprocess.CompletedProcess(arguments, 0, stdout=output, stderr=b"")

    @patch.object(connect.subprocess, "run")
    def test_verify_signed_archive_accepts_embedded_profile(self, run):
        run.side_effect = self.archive_command
        tauri, app = self.make_archive()
        with patch("builtins.print"):
            connect.verify(self.environment, tauri)
        self.assertTrue((app / "embedded.mobileprovision").is_file())
        self.assertTrue(any(call.args[0][:4] == ["codesign", "--verify", "--deep", "--strict"] for call in run.call_args_list))

    @patch.object(connect.subprocess, "run")
    def test_verify_rejects_wrong_build_private_keys_runner_paths_and_missing_resources(self, run):
        run.side_effect = self.archive_command
        tauri, app = self.make_archive()
        self.environment["RMT_APPLE_BUILD_NUMBER"] = "85.1"
        with self.assertRaisesRegex(connect.ConnectError, "build number"):
            connect.verify(self.environment, tauri)
        self.environment["RMT_APPLE_BUILD_NUMBER"] = "84.2"
        private = app / "private.p8"
        private.write_text("private material")
        with self.assertRaisesRegex(connect.ConnectError, "private signing"):
            connect.verify(self.environment, tauri)
        private.unlink()
        binary = app / "Rail Map Toolkit"
        binary.write_bytes(binary.read_bytes() + self.environment["GITHUB_WORKSPACE"].encode())
        with self.assertRaisesRegex(connect.ConnectError, "private runner path"):
            connect.verify(self.environment, tauri)
        binary.write_bytes(bytes.fromhex("cffaedfe") + b"device binary")
        (app / "assets/ui/rmp/index.html").unlink()
        with self.assertRaisesRegex(connect.ConnectError, "missing a bundled application"):
            connect.verify(self.environment, tauri)

    @patch.object(connect.subprocess, "run")
    def test_verify_rejects_unsigned_or_wrong_team_archive(self, run):
        tauri, _ = self.make_archive()

        def unsigned(arguments, **kwargs):
            if arguments[:2] == ["codesign", "--verify"]:
                return subprocess.CompletedProcess(arguments, 1, stdout=b"", stderr=b"not signed")
            return self.archive_command(arguments, **kwargs)

        run.side_effect = unsigned
        with self.assertRaisesRegex(connect.ConnectError, "signature verification failed"):
            connect.verify(self.environment, tauri)

        def wrong_team(arguments, **kwargs):
            if arguments[:2] == ["codesign", "-dv"]:
                return subprocess.CompletedProcess(arguments, 0, stdout=b"TeamIdentifier=OTHER12345\n", stderr=b"")
            return self.archive_command(arguments, **kwargs)

        run.side_effect = wrong_team
        with self.assertRaisesRegex(connect.ConnectError, "different Apple team"):
            connect.verify(self.environment, tauri)


if __name__ == "__main__":
    unittest.main()
