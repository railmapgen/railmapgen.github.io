"""Prepare automatic signing, verify a signed IPA, and clean up Connect credentials."""

import json
import os
from pathlib import Path
import plistlib
import re
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory
from uuid import UUID


BUNDLE_ID = "org.railmapgen"
CHILDREN = ("rmg", "rmg-palette", "rmg-templates", "rmp", "rmp-gallery", "rmp-designer", "rma", "rsg")
PRIVATE_SUFFIXES = {".p12", ".pfx", ".p8", ".pem", ".key"}
MACHO_MAGIC = {bytes.fromhex(value) for value in (
    "feedface", "cefaedfe", "feedfacf", "cffaedfe", "cafebabe", "bebafeca", "cafebabf", "bfbafeca"
)}


class ConnectError(Exception):
    pass


def check(condition, message):
    if not condition:
        raise ConnectError(message)


def required(environment, name):
    value = environment.get(name)
    check(isinstance(value, str) and bool(value.strip()), f"{name} is not configured.")
    return value


def command(arguments, message, combine=False):
    result = subprocess.run(
        [str(argument) for argument in arguments],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT if combine else subprocess.PIPE,
        check=False,
    )
    check(result.returncode == 0, message)
    return result.stdout


def validate_uuid(value, message):
    try:
        check(isinstance(value, str) and str(UUID(value)) == value.lower(), message)
    except ValueError:
        raise ConnectError(message) from None
    return value


def export_options(channel, team):
    check(channel in {"appstore", "internal"}, "Choose the appstore or internal distribution channel.")
    return {
        "method": "app-store-connect",
        "destination": "export",
        "signingStyle": "automatic",
        "teamID": team,
        "manageAppVersionAndBuildNumber": False,
        "uploadSymbols": True,
        "testFlightInternalTestingOnly": channel == "internal",
    }


def signing_root(environment):
    runner = Path(required(environment, "RUNNER_TEMP"))
    check(runner.is_absolute(), "RUNNER_TEMP must be an absolute path.")
    return runner / "rmt-app-store-connect"


def prepare(environment):
    channel = required(environment, "RMT_DISTRIBUTION_CHANNEL")
    export_options(channel, "")
    team = required(environment, "APPLE_DEVELOPMENT_TEAM")
    check(bool(re.fullmatch(r"[A-Z0-9]{10}", team)), "APPLE_DEVELOPMENT_TEAM must be a 10-character team ID.")
    key_id = required(environment, "APP_STORE_CONNECT_API_KEY_ID")
    check(bool(re.fullmatch(r"[A-Z0-9]{10}", key_id)), "APP_STORE_CONNECT_API_KEY_ID must be a 10-character key ID.")
    validate_uuid(required(environment, "APP_STORE_CONNECT_API_ISSUER_ID"), "APP_STORE_CONNECT_API_ISSUER_ID must be a UUID.")
    key = required(environment, "APP_STORE_CONNECT_API_PRIVATE_KEY").strip()
    check(key.startswith("-----BEGIN PRIVATE KEY-----") and key.endswith("-----END PRIVATE KEY-----"), "APP_STORE_CONNECT_API_PRIVATE_KEY must contain the contents of the .p8 file.")
    github_env = Path(required(environment, "GITHUB_ENV"))
    root = signing_root(environment)
    check(not root.exists() and not root.is_symlink(), "The temporary Connect signing directory already exists.")
    root.mkdir(mode=0o700, parents=True)
    api_key = root / f"AuthKey_{key_id}.p8"
    api_key.write_text(key + "\n", encoding="utf-8")
    api_key.chmod(0o600)
    options_file = root / "ExportOptions.plist"
    options_file.write_bytes(plistlib.dumps(export_options(channel, team)))
    values = {
        "RMT_CONNECT_API_KEY_PATH": str(api_key),
        "RMT_EXPORT_OPTIONS_PLIST": str(options_file),
    }
    check(all("\n" not in value and "\r" not in value for value in values.values()), "Invalid path in the signing environment.")
    with github_env.open("a", encoding="utf-8") as stream:
        stream.writelines(f"{name}={value}\n" for name, value in values.items())
    print("Prepared App Store Connect API key and automatic-signing options.")


def verify(environment, tauri_root=None):
    tauri_root = Path(tauri_root or Path.cwd())
    ipa = tauri_root / "gen/apple/build/arm64/Rail Map Toolkit.ipa"
    check(ipa.is_file(), "The signed device IPA is missing.")
    with TemporaryDirectory(prefix="rmt-connect-verify-") as extracted:
        # ditto preserves bundle metadata and symlinks for codesign verification.
        command(["ditto", "-x", "-k", ipa, extracted], "Could not extract the signed IPA.")
        apps = list((Path(extracted) / "Payload").glob("*.app"))
        check(len(apps) == 1, "Expected one signed device application in the IPA.")
        verify_app(environment, tauri_root, apps[0])


def verify_app(environment, tauri_root, app):
    info = plistlib.loads((app / "Info.plist").read_bytes())
    version = json.loads((tauri_root.parent / "package.json").read_text())["version"]
    build_number = required(environment, "RMT_APPLE_BUILD_NUMBER")
    team = required(environment, "APPLE_DEVELOPMENT_TEAM")
    check(info.get("CFBundleIdentifier") == BUNDLE_ID, "IPA bundle identifier does not match the Connect application.")
    check(info.get("CFBundleShortVersionString") == version, "IPA version does not match package.json.")
    check(info.get("CFBundleVersion") == build_number, "IPA build number does not match this workflow run.")
    check(sorted(info.get("UIDeviceFamily", [])) == [1, 2], "IPA must support iPhone and iPad.")
    check(bool(info.get("NSPhotoLibraryAddUsageDescription")), "Missing photo-library export purpose.")
    scene = info.get("UIApplicationSceneManifest", {})
    check(scene.get("UIApplicationSupportsMultipleScenes") is False, "Expected the single-scene host.")
    configurations = scene.get("UISceneConfigurations", {}).get("UIWindowSceneSessionRoleApplication", [])
    check(bool(configurations) and configurations[0].get("UISceneDelegateClassName") == "RMTSceneDelegate", "Missing native scene lifecycle.")
    executable_name = info.get("CFBundleExecutable", "")
    check(bool(executable_name) and Path(executable_name).name == executable_name, "Invalid IPA executable.")
    executable = app / executable_name
    check(command(["xcrun", "lipo", "-archs", executable], "Could not inspect IPA architecture.").strip() == b"arm64", "IPA is not an arm64 device build.")
    platform = command(["xcrun", "vtool", "-show-build", executable], "Could not inspect the IPA platform.").decode()
    check(bool(re.search(r"^\s*platform IOS\s*$", platform, re.M)), "IPA is not an iPhone device binary.")
    check((app / "embedded.mobileprovision").is_file(), "The signed IPA has no embedded provisioning profile.")
    command(["codesign", "--verify", "--deep", "--strict", app], "IPA code signature verification failed.")
    signature = command(["codesign", "-dv", "--verbose=4", app], "Could not inspect the IPA signature.", combine=True).decode()
    check(bool(re.search(rf"^TeamIdentifier={re.escape(team)}\s*$", signature, re.M)), "IPA signature belongs to a different Apple team.")

    ui = app / "assets/ui"
    for entry in [Path("index.html"), *(Path(name) / "index.html" for name in CHILDREN)]:
        html = ui / entry
        check(html.is_file(), "IPA is missing a bundled application.")
        check("rmt-native-edge-to-edge" in html.read_text(), "A bundled application is missing the native adapter.")
        runtime_info = json.loads(html.with_name("info.json").read_text())
        check(runtime_info.get("instance") == "AppStore", "A bundled application has the wrong runtime instance.")
    check(not list(ui.rglob(".git")), "IPA includes bundled Git metadata.")
    private_paths = [environment[name].encode() for name in ("HOME", "GITHUB_WORKSPACE") if environment.get(name)]
    for path in app.rglob("*"):
        check(path.suffix.lower() not in PRIVATE_SUFFIXES, "IPA includes a private signing file.")
        check(path.suffix.lower() not in {".dsym", ".bcsymbolmap"}, "IPA includes debug symbols in the application.")
        if path.is_file():
            with path.open("rb") as stream:
                is_macho = stream.read(4) in MACHO_MAGIC
            if is_macho:
                data = path.read_bytes()
                check(all(value not in data for value in private_paths), "IPA binary contains a private runner path.")
    print(f"Verified signed arm64 iOS IPA {version} ({build_number}).")


def cleanup(environment):
    root = signing_root(environment)
    if not root.exists():
        return
    check(root.is_dir() and not root.is_symlink(), "Refusing to clean an unexpected signing directory.")
    shutil.rmtree(root)
    print("Removed temporary App Store Connect API key.")


def main(arguments=None):
    arguments = sys.argv[1:] if arguments is None else arguments
    check(len(arguments) == 1 and arguments[0] in {"prepare", "verify", "cleanup"}, "Usage: connect.py prepare|verify|cleanup")
    {"prepare": prepare, "verify": verify, "cleanup": cleanup}[arguments[0]](os.environ)


if __name__ == "__main__":
    try:
        main()
    except ConnectError as error:
        print(f"::error::{error}", file=sys.stderr)
        sys.exit(1)
    except Exception:
        # Filesystem/parser errors can contain credentials or private paths.
        print("::error::App Store Connect helper failed; check signing configuration and IPA contents.", file=sys.stderr)
        sys.exit(1)
