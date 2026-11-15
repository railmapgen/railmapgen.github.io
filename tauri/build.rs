use std::{env, fs, path::PathBuf, process::Command};

fn output(command: &mut Command) -> String {
    let result = command
        .output()
        .expect("Could not run the Apple Swift compiler");
    assert!(
        result.status.success(),
        "Apple subscription bridge compilation failed:\n{}",
        String::from_utf8_lossy(&result.stderr)
    );
    String::from_utf8(result.stdout).expect("Swift compiler output was not UTF-8")
}

fn build_subscriptions() {
    let os = env::var("CARGO_CFG_TARGET_OS").unwrap();
    if os != "ios" && !(os == "macos" && env::var_os("CARGO_FEATURE_APPLE_BUNDLE_ASSETS").is_some())
    {
        return;
    }

    println!("cargo:rerun-if-changed=../scripts/apple/Subscriptions.swift");
    println!("cargo:rerun-if-env-changed=IPHONEOS_DEPLOYMENT_TARGET");
    println!("cargo:rerun-if-env-changed=MACOSX_DEPLOYMENT_TARGET");
    println!("cargo:rerun-if-env-changed=DEVELOPER_DIR");
    println!("cargo:rerun-if-env-changed=RMT_APPLE_CHANNEL");
    let channel = env::var("RMT_APPLE_CHANNEL")
        .unwrap_or_else(|_| "stable".to_owned())
        .trim()
        .to_ascii_lowercase();
    let swift_channel = match channel.as_str() {
        "stable" => "RMT_STABLE",
        "testflight" => "RMT_TESTFLIGHT",
        _ => panic!("Invalid RMT_APPLE_CHANNEL: {channel}. Choose stable or testflight."),
    };
    let rust_target = env::var("TARGET").unwrap();
    let arch = match env::var("CARGO_CFG_TARGET_ARCH").unwrap().as_str() {
        "aarch64" => "arm64",
        "x86_64" => "x86_64",
        other => panic!("Unsupported Apple architecture: {other}"),
    };
    let simulator = rust_target.ends_with("-sim") || (os == "ios" && arch == "x86_64");
    let sdk_name = if os == "macos" {
        "macosx"
    } else if simulator {
        "iphonesimulator"
    } else {
        "iphoneos"
    };
    let version = env::var(if os == "ios" {
        "IPHONEOS_DEPLOYMENT_TARGET"
    } else {
        "MACOSX_DEPLOYMENT_TARGET"
    })
    .unwrap_or_else(|_| if os == "ios" { "15.0" } else { "10.13" }.to_owned());
    let swift_target = format!(
        "{arch}-apple-{}{version}{}",
        if os == "ios" { "ios" } else { "macosx" },
        if simulator { "-simulator" } else { "" }
    );
    let sdk = output(Command::new("/usr/bin/xcrun").args(["--sdk", sdk_name, "--show-sdk-path"]));
    let sdk = sdk.trim();
    let source = PathBuf::from(env::var_os("CARGO_MANIFEST_DIR").unwrap())
        .join("../scripts/apple/Subscriptions.swift");
    let destination = PathBuf::from(env::var_os("OUT_DIR").unwrap());
    let archive = destination.join("librmt_subscriptions.a");
    let module_cache = destination.join("swift-module-cache");
    let mut compile = Command::new("/usr/bin/xcrun");
    compile
        .args([
            "--sdk",
            sdk_name,
            "swiftc",
            "-emit-library",
            "-static",
            "-parse-as-library",
        ])
        .args([
            "-module-name",
            "RMTSubscriptions",
            "-target",
            &swift_target,
            "-sdk",
            sdk,
        ])
        .args(["-D", swift_channel])
        .arg("-module-cache-path")
        .arg(&module_cache)
        .arg(if env::var("PROFILE").as_deref() == Ok("release") {
            "-O"
        } else {
            "-Onone"
        })
        .arg(&source)
        .arg("-o")
        .arg(&archive)
        .env("SDKROOT", sdk);
    // Only Debug payment configuration can report an incomplete local StoreKit
    // setup. Release payment configuration always verifies the real environment.
    if env::var("PROFILE").as_deref() == Ok("debug") {
        compile.args(["-D", "RMT_DEVELOPMENT"]);
    }
    output(&mut compile);

    // Swift's object files carry framework/runtime autolink directives. Make
    // their SDK and toolchain libraries visible to Rust's final Apple linker.
    let info = output(Command::new("/usr/bin/xcrun").args([
        "--sdk",
        sdk_name,
        "swiftc",
        "-print-target-info",
        "-target",
        &swift_target,
        "-sdk",
        sdk,
    ]));
    let info: serde_json::Value =
        serde_json::from_str(&info).expect("Invalid Swift target information");
    for directory in info["paths"]["runtimeLibraryPaths"].as_array().unwrap() {
        println!(
            "cargo:rustc-link-search=native={}",
            directory.as_str().unwrap()
        );
    }
    println!("cargo:rustc-link-search=native={sdk}/usr/lib/swift");
    println!("cargo:rustc-link-search=native={}", destination.display());
    println!("cargo:rustc-link-lib=static=rmt_subscriptions");
    for framework in [
        "Foundation",
        "WebKit",
        "StoreKit",
        if os == "ios" { "UIKit" } else { "AppKit" },
    ] {
        println!("cargo:rustc-link-lib=framework={framework}");
    }
    // SwiftUI is unavailable on the oldest supported macOS versions; all
    // native store UI calls are availability guarded in the Swift bridge.
    println!("cargo:rustc-link-arg=-Wl,-weak_framework,SwiftUI");
    // Swift concurrency needs compatibility archives when targeting the older
    // systems still supported by the existing application deployment target.
    if let Some(libraries) = info["target"]["compatibilityLibraries"].as_array() {
        for library in libraries {
            if let Some(name) = library["libraryName"].as_str() {
                let source = info["paths"]["runtimeLibraryPaths"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .map(|directory| {
                        PathBuf::from(directory.as_str().unwrap()).join(format!("lib{name}.a"))
                    })
                    .find(|path| path.is_file())
                    .unwrap_or_else(|| panic!("Missing Swift compatibility library: {name}"));
                println!("cargo:rerun-if-changed={}", source.display());
                // Rust can bundle ordinary archives into the iOS staticlib,
                // but cannot read Xcode's universal simulator archives. Give
                // the target-only archive a distinct name so library lookup
                // cannot select the universal copy from a prior search path.
                let alias = format!("rmt_{name}");
                let target_archive = destination.join(format!("lib{alias}.a"));
                let bytes = fs::read(&source).expect("Could not read Swift compatibility library");
                let universal = bytes.starts_with(&[0xca, 0xfe, 0xba, 0xbe])
                    || bytes.starts_with(&[0xbe, 0xba, 0xfe, 0xca])
                    || bytes.starts_with(&[0xca, 0xfe, 0xba, 0xbf])
                    || bytes.starts_with(&[0xbf, 0xba, 0xfe, 0xca]);
                if universal {
                    output(
                        Command::new("/usr/bin/xcrun")
                            .args(["lipo", "-thin", arch])
                            .arg(&source)
                            .arg("-output")
                            .arg(&target_archive),
                    );
                } else {
                    fs::copy(&source, &target_archive)
                        .expect("Could not stage Swift compatibility library");
                }
                println!("cargo:rustc-link-lib=static={alias}");
            }
        }
    }
    println!("cargo:rustc-link-arg=-Wl,-rpath,/usr/lib/swift");
}

fn main() {
    tauri_build::build();
    build_subscriptions();
}
