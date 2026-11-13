"""Prepare signing, verify a device archive, and clean up Connect upload credentials."""

import base64
import hashlib
import json
import os
from pathlib import Path
import plistlib
import re
import secrets
import shlex
import shutil
import subprocess
import sys
from datetime import datetime, timezone
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


def decode_secret(environment, name):
    try:
        decoded = base64.b64decode("".join(required(environment, name).split()), validate=True)
    except ValueError:
        raise ConnectError(f"{name} must contain base64-encoded data.") from None
    check(bool(decoded), f"{name} contains no data.")
    return decoded


def validate_uuid(value, message):
    try:
        check(isinstance(value, str) and str(UUID(value)) == value.lower(), message)
    except ValueError:
        raise ConnectError(message) from None
    return value


def validate_profile(profile, team, now=None):
    """Reject development, ad hoc, enterprise, expired, or unrelated profiles."""
    validate_uuid(profile.get("UUID"), "Provisioning profile has an invalid UUID.")
    check(team in profile.get("TeamIdentifier", []), "Provisioning profile belongs to a different Apple team.")
    check("iOS" in profile.get("Platform", []), "An iOS provisioning profile is required.")
    expiry = profile.get("ExpirationDate")
    check(isinstance(expiry, datetime), "Provisioning profile has no expiration date.")
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    check(expiry > (now or datetime.now(timezone.utc)), "Provisioning profile has expired.")
    entitlements = profile.get("Entitlements", {})
    prefixes = profile.get("ApplicationIdentifierPrefix", [])
    check(
        any(entitlements.get("application-identifier") == f"{prefix}.{BUNDLE_ID}" for prefix in prefixes),
        f"Provisioning profile must explicitly match {BUNDLE_ID}.",
    )
    check(entitlements.get("com.apple.developer.team-identifier") == team, "Provisioning profile entitlement has a different Apple team.")
    check(
        entitlements.get("get-task-allow") is False
        and "ProvisionedDevices" not in profile
        and not profile.get("ProvisionsAllDevices"),
        "An App Store distribution provisioning profile is required.",
    )
    certificates = profile.get("DeveloperCertificates", [])
    check(bool(certificates) and all(isinstance(item, bytes) for item in certificates), "Provisioning profile has no valid signing certificates.")
    return profile["UUID"]


def export_options(channel, team, profile_uuid, identity):
    check(channel in {"appstore", "internal"}, "Choose the appstore or internal distribution channel.")
    return {
        "method": "app-store-connect",
        "destination": "upload",
        "signingStyle": "manual",
        "teamID": team,
        "signingCertificate": identity,
        "provisioningProfiles": {BUNDLE_ID: profile_uuid},
        "manageAppVersionAndBuildNumber": False,
        "uploadSymbols": True,
        "testFlightInternalTestingOnly": channel == "internal",
    }


def signing_root(environment):
    runner = Path(required(environment, "RUNNER_TEMP"))
    check(runner.is_absolute(), "RUNNER_TEMP must be an absolute path.")
    return runner / "rmt-app-store-connect"


def profile_directories(home):
    return (
        home / "Library/Developer/Xcode/UserData/Provisioning Profiles",
        home / "Library/MobileDevice/Provisioning Profiles",
    )


def write_state(root, state):
    (root / "state.json").write_text(json.dumps(state), encoding="utf-8")


def prepare(environment):
    channel = required(environment, "RMT_DISTRIBUTION_CHANNEL")
    export_options(channel, "", "", "")
    team = required(environment, "APPLE_DEVELOPMENT_TEAM")
    check(bool(re.fullmatch(r"[A-Z0-9]{10}", team)), "APPLE_DEVELOPMENT_TEAM must be a 10-character team ID.")
    key_id = required(environment, "APP_STORE_CONNECT_API_KEY_ID")
    check(bool(re.fullmatch(r"[A-Z0-9]{10}", key_id)), "APP_STORE_CONNECT_API_KEY_ID must be a 10-character key ID.")
    validate_uuid(required(environment, "APP_STORE_CONNECT_API_ISSUER_ID"), "APP_STORE_CONNECT_API_ISSUER_ID must be a UUID.")
    key = required(environment, "APP_STORE_CONNECT_API_PRIVATE_KEY").strip()
    check(key.startswith("-----BEGIN PRIVATE KEY-----") and key.endswith("-----END PRIVATE KEY-----"), "APP_STORE_CONNECT_API_PRIVATE_KEY must contain the contents of the .p8 file.")
    certificate = decode_secret(environment, "APPLE_CERTIFICATE_P12_BASE64")
    password = required(environment, "APPLE_CERTIFICATE_PASSWORD")
    profile_data = decode_secret(environment, "APPLE_PROVISIONING_PROFILE_BASE64")
    home = Path(required(environment, "HOME"))
    github_env = Path(required(environment, "GITHUB_ENV"))
    root = signing_root(environment)
    check(not root.exists() and not root.is_symlink(), "The temporary Connect signing directory already exists.")
    root.mkdir(mode=0o700, parents=True)
    state = {"profiles": [], "keychains": []}
    write_state(root, state)

    profile_file = root / "profile.mobileprovision"
    profile_file.write_bytes(profile_data)
    profile = plistlib.loads(command(["security", "cms", "-D", "-i", profile_file], "Could not decode the provisioning profile."))
    profile_uuid = validate_profile(profile, team)
    profile_hash = hashlib.sha256(profile_data).hexdigest()
    for directory in profile_directories(home):
        directory.mkdir(parents=True, exist_ok=True)
        installed = directory / f"{profile_uuid}.mobileprovision"
        if installed.exists():
            check(installed.read_bytes() == profile_data, "A different profile already uses this provisioning UUID.")
            continue
        # Record before installation so a later failure can still clean up this file.
        state["profiles"].append({"path": str(installed), "sha256": profile_hash})
        write_state(root, state)
        with installed.open("xb") as stream:
            stream.write(profile_data)

    keychain = root / "signing.keychain-db"
    keychain_password = secrets.token_urlsafe(32)
    state["keychains"] = shlex.split(command(["security", "list-keychains", "-d", "user"], "Could not inspect the keychain search list.").decode())
    write_state(root, state)
    command(["security", "create-keychain", "-p", keychain_password, keychain], "Could not create the temporary signing keychain.")
    command(["security", "set-keychain-settings", "-lut", "21600", keychain], "Could not configure the temporary signing keychain.")
    command(["security", "unlock-keychain", "-p", keychain_password, keychain], "Could not unlock the temporary signing keychain.")
    certificate_file = root / "certificate.p12"
    certificate_file.write_bytes(certificate)
    command(["security", "import", certificate_file, "-P", password, "-t", "cert", "-f", "pkcs12", "-k", keychain, "-T", "/usr/bin/codesign", "-T", "/usr/bin/security"], "Could not import the Apple Distribution certificate and private key.")
    certificate_file.unlink()
    command(["security", "set-key-partition-list", "-S", "apple-tool:,apple:,codesign:", "-s", "-k", keychain_password, keychain], "Could not grant codesign access to the signing key.")
    command(["security", "list-keychains", "-d", "user", "-s", keychain, *state["keychains"]], "Could not add the temporary signing keychain to the search list.")
    identities = command(["security", "find-identity", "-v", "-p", "codesigning", keychain], "Could not inspect the signing identity.").decode()
    allowed = {hashlib.sha1(item).hexdigest().upper() for item in profile["DeveloperCertificates"]}
    matching = [identity.upper() for identity in re.findall(r'^\s*\d+\) ([A-Fa-f0-9]{40}) "Apple Distribution:[^"\n]+"', identities, re.M) if identity.upper() in allowed]
    check(len(matching) == 1, "Expected one valid Apple Distribution identity matching the provisioning profile.")

    api_key = root / f"AuthKey_{key_id}.p8"
    api_key.write_text(key + "\n", encoding="utf-8")
    api_key.chmod(0o600)
    options_file = root / "ExportOptions.plist"
    options_file.write_bytes(plistlib.dumps(export_options(channel, team, profile_uuid, matching[0])))
    values = {
        "RMT_SIGNING_CERTIFICATE": matching[0],
        "RMT_PROVISIONING_PROFILE_UUID": profile_uuid,
        "RMT_SIGNING_KEYCHAIN": str(keychain),
        "RMT_CONNECT_API_KEY_PATH": str(api_key),
        "RMT_EXPORT_OPTIONS_PLIST": str(options_file),
    }
    check(all("\n" not in value and "\r" not in value for value in values.values()), "Invalid path in the signing environment.")
    with github_env.open("a", encoding="utf-8") as stream:
        stream.writelines(f"{name}={value}\n" for name, value in values.items())
    print("Prepared App Store Connect signing and direct-upload options.")


def verify(environment, tauri_root=None):
    tauri_root = Path(tauri_root or Path.cwd())
    archive = tauri_root / "gen/apple/build/railmapgen.xcarchive"
    apps = list((archive / "Products/Applications").glob("*.app"))
    check(len(apps) == 1, "Expected one signed device application in the archive.")
    app = apps[0]
    info = plistlib.loads((app / "Info.plist").read_bytes())
    version = json.loads((tauri_root.parent / "package.json").read_text())["version"]
    build_number = required(environment, "RMT_APPLE_BUILD_NUMBER")
    team = required(environment, "APPLE_DEVELOPMENT_TEAM")
    check(info.get("CFBundleIdentifier") == BUNDLE_ID, "Archive bundle identifier does not match the Connect application.")
    check(info.get("CFBundleShortVersionString") == version, "Archive version does not match package.json.")
    check(info.get("CFBundleVersion") == build_number, "Archive build number does not match this workflow run.")
    check(sorted(info.get("UIDeviceFamily", [])) == [1, 2], "Archive must support iPhone and iPad.")
    check(bool(info.get("NSPhotoLibraryAddUsageDescription")), "Missing photo-library export purpose.")
    scene = info.get("UIApplicationSceneManifest", {})
    check(scene.get("UIApplicationSupportsMultipleScenes") is False, "Expected the single-scene host.")
    configurations = scene.get("UISceneConfigurations", {}).get("UIWindowSceneSessionRoleApplication", [])
    check(bool(configurations) and configurations[0].get("UISceneDelegateClassName") == "RMTSceneDelegate", "Missing native scene lifecycle.")
    executable_name = info.get("CFBundleExecutable", "")
    check(bool(executable_name) and Path(executable_name).name == executable_name, "Invalid archive executable.")
    executable = app / executable_name
    check(command(["xcrun", "lipo", "-archs", executable], "Could not inspect archive architecture.").strip() == b"arm64", "Archive is not an arm64 device build.")
    platform = command(["xcrun", "vtool", "-show-build", executable], "Could not inspect the archive platform.").decode()
    check(bool(re.search(r"^\s*platform IOS\s*$", platform, re.M)), "Archive is not an iPhone device binary.")
    check((app / "embedded.mobileprovision").is_file(), "The signed archive has no embedded provisioning profile.")
    command(["codesign", "--verify", "--deep", "--strict", app], "Archive code signature verification failed.")
    signature = command(["codesign", "-dv", "--verbose=4", app], "Could not inspect the archive signature.", combine=True).decode()
    check(bool(re.search(rf"^TeamIdentifier={re.escape(team)}\s*$", signature, re.M)), "Archive signature belongs to a different Apple team.")

    ui = app / "assets/ui"
    for entry in [Path("index.html"), *(Path(name) / "index.html" for name in CHILDREN)]:
        html = ui / entry
        check(html.is_file(), "Archive is missing a bundled application.")
        check("rmt-native-edge-to-edge" in html.read_text(), "A bundled application is missing the native adapter.")
        runtime_info = json.loads(html.with_name("info.json").read_text())
        check(runtime_info.get("instance") == "AppStore", "A bundled application has the wrong runtime instance.")
    check(not list(ui.rglob(".git")), "Archive includes bundled Git metadata.")
    private_paths = [environment[name].encode() for name in ("HOME", "GITHUB_WORKSPACE") if environment.get(name)]
    for path in app.rglob("*"):
        check(path.suffix.lower() not in PRIVATE_SUFFIXES, "Archive includes a private signing file.")
        check(path.suffix.lower() not in {".dsym", ".bcsymbolmap"}, "Archive includes debug symbols in the application.")
        if path.is_file():
            with path.open("rb") as stream:
                is_macho = stream.read(4) in MACHO_MAGIC
            if is_macho:
                data = path.read_bytes()
                check(all(value not in data for value in private_paths), "Archive binary contains a private runner path.")
    print(f"Verified signed arm64 iOS archive {version} ({build_number}).")


def cleanup(environment):
    root = signing_root(environment)
    if not root.exists():
        return
    check(root.is_dir() and not root.is_symlink(), "Refusing to clean an unexpected signing directory.")
    state_file = root / "state.json"
    check(state_file.is_file(), "The signing directory has no cleanup state.")
    state = {}
    failure = None
    try:
        state = json.loads(state_file.read_text())
        home = Path(required(environment, "HOME"))
        for item in state.get("profiles", []):
            installed = Path(item["path"])
            check(installed.parent in profile_directories(home), "Refusing to clean an unrelated provisioning profile.")
            validate_uuid(installed.stem, "Refusing to clean an unexpected profile filename.")
            check(installed.suffix == ".mobileprovision", "Refusing to clean an unexpected profile file.")
            if installed.is_file() and not installed.is_symlink():
                check(hashlib.sha256(installed.read_bytes()).hexdigest() == item["sha256"], "The installed profile changed; refusing to delete it.")
                installed.unlink()
    except Exception:
        failure = "Could not clean every installed profile; unrelated or changed files were preserved."
    try:
        previous = state.get("keychains", [])
        if previous:
            command(["security", "list-keychains", "-d", "user", "-s", *previous], "Could not restore the keychain search list.")
    except Exception:
        failure = "Could not restore the keychain search list."
    try:
        keychain = root / "signing.keychain-db"
        if keychain.exists():
            command(["security", "delete-keychain", keychain], "Could not unregister the temporary signing keychain.")
    except Exception:
        failure = "Could not unregister the temporary signing keychain."
    finally:
        # Even a changed profile or keychain-tool failure must not retain our private key.
        shutil.rmtree(root)
    check(failure is None, failure)
    print("Removed temporary App Store Connect signing material.")


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
        # Filesystem/parser errors can contain credentials or decoded signing data.
        print("::error::App Store Connect helper failed; check signing configuration and archive contents.", file=sys.stderr)
        sys.exit(1)
