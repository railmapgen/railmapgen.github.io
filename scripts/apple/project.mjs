import { chmodSync, cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
    appleRoot,
    appleChannel,
    buildRoot,
    capture,
    cli,
    hostTriple,
    readJson,
    repoRoot,
    run,
    shellQuote,
    tauriRoot,
    workspace,
    writeJson,
    xmlEscape,
} from './common.mjs';
import { prepareResources } from './resources.mjs';
import { appleBuildNumber, resolveAppleBuildNumber } from './build-number.mjs';

const buildScript = operation =>
    [
        'set -eu',
        'rmt_repository=$(CDPATH= cd -- "$SRCROOT/../../.." && pwd)',
        `"$rmt_repository/tauri/.build/xcode/node" "$rmt_repository/scripts/apple/apple.mjs" build ${operation}`,
    ].join('\n');

export function iosSpec({ version, team = '', channel = 'stable', buildNumber = '1' }) {
    const swiftPaths = [
        '$(inherited)',
        '$(SDKROOT)/usr/lib/swift',
        '$(DEVELOPER_DIR)/Toolchains/XcodeDefault.xctoolchain/usr/lib/swift/$(PLATFORM_NAME)',
    ];
    return {
        name: 'railmapgen',
        options: { bundleIdPrefix: 'org.railmapgen', deploymentTarget: { iOS: '15.0' } },
        configs: { Debug: 'debug', Release: 'release' },
        fileGroups: ['../../src', '../../../scripts/apple'],
        targets: {
            railmapgen_iOS: {
                type: 'application',
                platform: 'iOS',
                sources: [
                    'Sources',
                    'Assets.xcassets',
                    { path: 'Externals', excludes: ['**/*.a'] },
                    { path: 'railmapgen_iOS', excludes: ['Settings.bundle'] },
                    { path: 'railmapgen_iOS/Settings.bundle', type: 'folder', buildPhase: 'resources' },
                ],
                info: {
                    path: 'railmapgen_iOS/Info.plist',
                    properties: {
                        LSRequiresIPhoneOS: true,
                        CFBundleDevelopmentRegion: 'en',
                        CFBundleLocalizations: ['en', 'zh-Hans', 'zh-Hant', 'ja', 'ko'],
                        NSPhotoLibraryAddUsageDescription:
                            'Save exported images and videos to your photo library when you choose Save Image or Save Video.',
                        UILaunchScreen: {},
                        UIApplicationSceneManifest: {
                            UIApplicationSupportsMultipleScenes: false,
                            UISceneConfigurations: {
                                UIWindowSceneSessionRoleApplication: [
                                    {
                                        UISceneConfigurationName: 'Rail Map Toolkit',
                                        UISceneDelegateClassName: 'RMTSceneDelegate',
                                    },
                                ],
                            },
                        },
                        UISupportedInterfaceOrientations: [
                            'UIInterfaceOrientationPortrait',
                            'UIInterfaceOrientationLandscapeLeft',
                            'UIInterfaceOrientationLandscapeRight',
                        ],
                        'UISupportedInterfaceOrientations~ipad': [
                            'UIInterfaceOrientationPortrait',
                            'UIInterfaceOrientationPortraitUpsideDown',
                            'UIInterfaceOrientationLandscapeLeft',
                            'UIInterfaceOrientationLandscapeRight',
                        ],
                        CFBundleShortVersionString: version,
                        CFBundleVersion: '$(CURRENT_PROJECT_VERSION)',
                    },
                },
                entitlements: { path: 'railmapgen_iOS/railmapgen_iOS.entitlements' },
                settings: {
                    base: {
                        PRODUCT_NAME: 'Rail Map Toolkit',
                        PRODUCT_BUNDLE_IDENTIFIER: 'org.railmapgen',
                        CURRENT_PROJECT_VERSION: appleBuildNumber(buildNumber),
                        RMT_APPLE_CHANNEL: appleChannel(channel),
                        TARGETED_DEVICE_FAMILY: '1,2',
                        ARCHS: '$(ARCHS_STANDARD)',
                        'EXCLUDED_ARCHS[sdk=iphoneos*]': 'x86_64',
                        ENABLE_BITCODE: false,
                        CLANG_ENABLE_OBJC_ARC: true,
                        ASSETCATALOG_COMPILER_APPICON_NAME: 'AppIcon',
                        ENABLE_USER_SCRIPT_SANDBOXING: false,
                        ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES: true,
                        CODE_SIGN_STYLE: 'Automatic',
                        DEVELOPMENT_TEAM: team,
                        SUPPORTS_MACCATALYST: false,
                        SUPPORTED_PLATFORMS: 'iphoneos iphonesimulator',
                        LIBRARY_SEARCH_PATHS: swiftPaths,
                        'LIBRARY_SEARCH_PATHS[arch=arm64]': [
                            '$(PROJECT_DIR)/Externals/$(PLATFORM_NAME)/arm64/$(CONFIGURATION)',
                            ...swiftPaths,
                        ],
                        'LIBRARY_SEARCH_PATHS[arch=x86_64]': [
                            '$(PROJECT_DIR)/Externals/$(PLATFORM_NAME)/x86_64/$(CONFIGURATION)',
                            ...swiftPaths,
                        ],
                        OTHER_LDFLAGS: ['$(inherited)', '-lapp', '-lc++'],
                    },
                    configs: {
                        Debug: { ONLY_ACTIVE_ARCH: true },
                        Release: { ONLY_ACTIVE_ARCH: false, ENABLE_NS_ASSERTIONS: false },
                    },
                },
                dependencies: [
                    'AudioToolbox',
                    'AVFoundation',
                    'CoreGraphics',
                    'CoreMedia',
                    'CoreVideo',
                    'Foundation',
                    'Metal',
                    'MetalKit',
                    'QuartzCore',
                    'SafariServices',
                    'Security',
                    'UIKit',
                    'VideoToolbox',
                    'WebKit',
                ].map(name => ({ sdk: `${name}.framework` })),
                preBuildScripts: [
                    {
                        name: 'Build current frontend and Rust',
                        script: buildScript('ios'),
                        basedOnDependencyAnalysis: false,
                    },
                ],
                postBuildScripts: [
                    {
                        name: 'Synchronize offline applications',
                        script: buildScript('ios-resources'),
                        basedOnDependencyAnalysis: false,
                    },
                ],
                scheme: { gatherCoverageData: false },
            },
        },
    };
}

export function macSpec({ channel = 'stable' } = {}) {
    return {
        name: 'RailMapToolkit-macOS',
        configs: { Debug: 'debug', Release: 'release' },
        settings: {
            base: {
                SDKROOT: 'macosx',
                RMT_APPLE_CHANNEL: appleChannel(channel),
                SUPPORTED_PLATFORMS: 'macosx',
                ENABLE_USER_SCRIPT_SANDBOXING: false,
            },
        },
        aggregateTargets: {
            'RailMapToolkit-macOS': {
                buildScripts: [
                    {
                        name: 'Build Tauri macOS application',
                        script: buildScript('macos'),
                        basedOnDependencyAnalysis: false,
                    },
                ],
            },
        },
    };
}

export function macScheme(config, executable) {
    const escaped = xmlEscape(executable);
    return `<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="1600" version="1.3">
  <BuildAction parallelizeBuildables="NO" buildImplicitDependencies="YES">
    <BuildActionEntries><BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">
      <BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="RMT_MACOS_TARGET" BuildableName="RailMapToolkit-macOS" BlueprintName="RailMapToolkit-macOS" ReferencedContainer="container:RailMapToolkit-macOS.xcodeproj"/>
    </BuildActionEntry></BuildActionEntries>
  </BuildAction>
  <LaunchAction buildConfiguration="${config}" selectedDebuggerIdentifier="${config === 'Debug' ? 'Xcode.DebuggerFoundation.Debugger.LLDB' : ''}" selectedLauncherIdentifier="${config === 'Debug' ? 'Xcode.IDEFoundation.Launcher.LLDB' : 'Xcode.IDEFoundation.Launcher.PosixSpawn'}" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" allowLocationSimulation="YES">
    <PathRunnable runnableDebuggingMode="0" FilePath="${escaped}"/>
  </LaunchAction>
  <ProfileAction buildConfiguration="${config}" shouldUseLaunchSchemeArgsEnv="YES" useCustomWorkingDirectory="NO" debugDocumentVersioning="YES"><PathRunnable runnableDebuggingMode="0" FilePath="${escaped}"/></ProfileAction>
  <AnalyzeAction buildConfiguration="${config}"/>
  <ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/>
</Scheme>\n`;
}

export function nodeLauncher(nodePath, args = []) {
    return `#!/bin/sh\nset -eu\nexport PATH=${shellQuote(path.dirname(nodePath))}:"$PATH"\nexec ${[nodePath, ...args].map(shellQuote).join(' ')} "$@"\n`;
}

/** Minimal Tauri mobile host. Plugins and Swift packages are built by Cargo. */
export function scaffoldIos(root) {
    const sources = path.join(root, 'Sources/railmapgen');
    mkdirSync(sources, { recursive: true });
    cpSync(path.join(repoRoot, 'scripts/apple/SceneDelegate.mm'), path.join(sources, 'SceneDelegate.mm'));
    cpSync(path.join(repoRoot, 'scripts/apple/Preferences.mm'), path.join(sources, 'Preferences.mm'));
    for (const file of ['WebViewRecovery.h', 'WebViewRecovery.mm'])
        cpSync(path.join(repoRoot, 'scripts/apple', file), path.join(sources, file));
    writeFileSync(
        path.join(sources, 'main.mm'),
        '// tauri::mobile_entry_point supplies the UIKit application and plugin runtime.\nextern "C" void start_app();\nint main(int argc, char *argv[]) { start_app(); return 0; }\n'
    );
    mkdirSync(path.join(root, 'Externals'), { recursive: true });
    mkdirSync(path.join(root, 'railmapgen_iOS'), { recursive: true });
    cpSync(path.join(repoRoot, 'scripts/apple/Settings.bundle'), path.join(root, 'railmapgen_iOS/Settings.bundle'), {
        recursive: true,
    });
    const entitlements = path.join(root, 'railmapgen_iOS/railmapgen_iOS.entitlements');
    if (!existsSync(entitlements))
        writeFileSync(entitlements, '<?xml version="1.0" encoding="UTF-8"?>\n<plist version="1.0"><dict/></plist>\n');
    cpSync(path.join(tauriRoot, 'icons/Assets.xcassets'), path.join(root, 'Assets.xcassets'), { recursive: true });
}

function findTool(name, advice, options = {}) {
    try {
        return capture('/usr/bin/which', [name], options);
    } catch {
        throw new Error(`Missing ${name}. ${advice}`);
    }
}

export function preflight({ iosOnly = false, ci = false } = {}) {
    if (process.platform !== 'darwin') throw new Error('Apple Xcode projects must be generated on macOS.');
    const developer = capture('/usr/bin/xcode-select', ['-p']);
    if (
        !existsSync(path.join(developer, 'usr/bin/xcodebuild')) ||
        !existsSync(path.join(developer, 'Platforms/iPhoneOS.platform'))
    ) {
        throw new Error('Select full Xcode: sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer');
    }
    const xcodeVersion = capture('/usr/bin/xcodebuild', ['-version']);
    const xcodeMajor = Number(xcodeVersion.match(/Xcode (\d+)/)?.[1]);
    if (!existsSync(cli)) throw new Error('Missing pinned Tauri CLI. Run npm ci in the repository root.');
    const xcodegen = findTool('xcodegen', 'Run brew install xcodegen.');
    const cargoBin = path.join(process.env.CARGO_HOME ?? path.join(os.homedir(), '.cargo'), 'bin');
    const environment = { ...process.env, PATH: `${cargoBin}${path.delimiter}${process.env.PATH}` };
    const cargo = findTool('cargo', 'Install Rust using rustup: https://rustup.rs', { env: environment });
    const rustup = findTool('rustup', 'Install Rust using rustup: https://rustup.rs', { env: environment });
    const installed = capture(rustup, ['target', 'list', '--installed'], { env: environment }).split(/\s+/);
    const required = ['aarch64-apple-ios'];
    if (!ci) required.push('aarch64-apple-ios-sim', 'x86_64-apple-ios');
    if (!iosOnly) required.push(hostTriple());
    const missing = required.filter(target => !installed.includes(target));
    if (missing.length) throw new Error(`Missing Rust targets. Run: rustup target add ${missing.join(' ')}`);
    const swift = capture('/usr/bin/xcrun', ['--find', 'swift']);
    return {
        node: process.execPath,
        cargo,
        rustup,
        xcodegen,
        swift,
        xcodeMajor,
        hostTriple: hostTriple(),
        developer,
    };
}

export async function generate(options = {}) {
    const channel = appleChannel(options.channel ?? process.env.RMT_APPLE_CHANNEL);
    const buildNumber = resolveAppleBuildNumber(options.buildNumber, process.env);
    const tools = preflight(options);
    mkdirSync(buildRoot, { recursive: true });
    writeJson(path.join(buildRoot, 'toolchain.json'), { ...tools, channel });
    const launcher = path.join(buildRoot, 'node');
    writeFileSync(launcher, nodeLauncher(tools.node));
    chmodSync(launcher, 0o755);
    const swiftLauncher = path.join(buildRoot, 'bin/swift');
    mkdirSync(path.dirname(swiftLauncher), { recursive: true });
    writeFileSync(swiftLauncher, nodeLauncher(tools.node, [path.join(repoRoot, 'scripts/apple/apple.mjs'), 'swift']));
    chmodSync(swiftLauncher, 0o755);
    await prepareResources({
        refreshAssets: options.refreshAssets,
        buildHost: true,
    });
    const version = readJson(path.join(repoRoot, 'package.json')).version;
    let team = process.env.APPLE_DEVELOPMENT_TEAM ?? '';
    const specPath = path.join(appleRoot, 'project.yml');
    if (!team && existsSync(specPath)) {
        try {
            team = readJson(specPath).targets.railmapgen_iOS.settings.base.DEVELOPMENT_TEAM ?? '';
        } catch {
            /* The initial Tauri template is YAML. */
        }
    }
    const env = {
        ...process.env,
        PATH: `${path.dirname(tools.cargo)}:${path.dirname(tools.node)}:${process.env.PATH}`,
        TAURI_CONFIG: JSON.stringify({ version }),
    };
    // A fixed mobile_entry_point host avoids `ios init`'s global Ruby/gem
    // update checks. Swift plugins still compile through Tauri's Cargo hooks.
    scaffoldIos(appleRoot);
    writeJson(specPath, iosSpec({ version, team, channel, buildNumber }));
    run(tools.xcodegen, ['generate', '--spec', specPath]);
    const projects = ['../apple/railmapgen.xcodeproj'];
    if (!options.iosOnly) {
        const macRoot = path.join(tauriRoot, 'gen/macos');
        const macProject = path.join(macRoot, 'RailMapToolkit-macOS.xcodeproj');
        writeJson(path.join(macRoot, 'project.yml'), macSpec({ channel }));
        run(tools.xcodegen, ['generate', '--spec', path.join(macRoot, 'project.yml')]);
        const pbx = JSON.parse(
            capture('/usr/bin/plutil', ['-convert', 'json', '-o', '-', path.join(macProject, 'project.pbxproj')])
        );
        const target = Object.entries(pbx.objects).find(
            ([, value]) => value.isa === 'PBXAggregateTarget' && value.name === 'RailMapToolkit-macOS'
        )?.[0];
        if (!target) throw new Error('Generated macOS aggregate target is missing.');
        const schemes = path.join(macProject, 'xcshareddata/xcschemes');
        mkdirSync(schemes, { recursive: true });
        for (const config of ['Debug', 'Release']) {
            const executable = path.join(buildRoot, 'macos', config, 'Rail Map Toolkit.app/Contents/MacOS/railmapgen');
            writeFileSync(
                path.join(schemes, `RailMapToolkit-macOS-${config}.xcscheme`),
                macScheme(config, executable).replace('RMT_MACOS_TARGET', target)
            );
        }
        projects.push('../macos/RailMapToolkit-macOS.xcodeproj');
    }
    mkdirSync(workspace, { recursive: true });
    writeFileSync(
        path.join(workspace, 'contents.xcworkspacedata'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<Workspace version="1.0">\n${projects.map(project => `  <FileRef location="group:${xmlEscape(project)}"/>`).join('\n')}\n</Workspace>\n`
    );
    console.log(
        `\nReady: ${workspace}\niOS version: ${version} (${buildNumber})\nApple channel: ${channel}\nOpen this workspace in Xcode and select a scheme and destination. No CLI process needs to stay running.`
    );
    return workspace;
}
