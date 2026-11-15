import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import {
    appleRoot,
    appleChannel,
    buildRoot,
    capture,
    cli,
    configuration,
    iosTriple,
    readJson,
    repoRoot,
    run,
    shellQuote,
    tauriRoot,
    writeJson,
    withResourceLock,
} from './common.mjs';
import { prepareResources } from './resources.mjs';

// A cold macOS consumer can include a full Cargo build. Waiting for that owner
// is bounded separately from the shorter frontend-preparation wait.
const consumerLockTimeoutMs = 15 * 60 * 1000;

// Keep the native SwiftPM build system for affected iOS packages so their C
// entry points remain visible to Rust in Release builds.
export function swiftArguments(args, useNative) {
    const triple = args[args.indexOf('--triple') + 1];
    return useNative &&
        args[0] === 'build' &&
        args.includes('--triple') &&
        triple.includes('ios') &&
        !args.includes('--build-system')
        ? [...args, '--build-system', 'native']
        : args;
}

export function swift(args) {
    const tools = readJson(path.join(buildRoot, 'toolchain.json'));
    return run(tools.swift, swiftArguments(args, process.env.RMT_SWIFT_NATIVE_BUILD_SYSTEM === '1'), {
        cwd: process.cwd(),
    });
}

export function cargoArguments(platform, arch, config) {
    return [
        'rustc',
        '--locked',
        '--lib',
        '--crate-type',
        'staticlib',
        '--target',
        iosTriple(platform, arch),
        '--features',
        'custom-protocol',
        ...(configuration(config) === 'Release' ? ['--release'] : []),
    ];
}

export const resolveAppleChannel = (channel, environment = {}, tools = {}) =>
    appleChannel(channel ?? environment.RMT_APPLE_CHANNEL ?? tools.channel);

export function iosEnvironment(environment, { sdk, macSdk, tools, version, channel }) {
    const env = {
        ...environment,
        PATH: `${path.join(buildRoot, 'bin')}:${path.dirname(tools.cargo)}:${path.dirname(tools.node)}:${environment.PATH}`,
        SDKROOT: sdk,
        CC_SHELL_ESCAPED_FLAGS: '1',
        CARGO_TARGET_DIR: path.join(tauriRoot, 'target'),
        IPHONEOS_DEPLOYMENT_TARGET: '15.0',
        TAURI_IOS_PROJECT_PATH: appleRoot,
        TAURI_IOS_APP_NAME: 'railmapgen',
        // The locked Xcode resource phase is the sole bundle-resource writer.
        // Suppress tauri-build's duplicate UI scan/copy during Cargo compilation,
        // allowing independent SDK builds to compile without holding this lock.
        TAURI_CONFIG: JSON.stringify({ version, bundle: { resources: [] } }),
        RMT_SWIFT_NATIVE_BUILD_SYSTEM: tools.xcodeMajor >= 27 ? '1' : '0',
        RMT_APPLE_CHANNEL: resolveAppleChannel(channel, environment, tools),
    };
    // Xcode supplies an iOS SDKROOT even to host build scripts. Host C/C++
    // dependencies need the macOS SDK, while target dependencies need iOS.
    for (const arch of ['aarch64', 'x86_64']) {
        for (const flag of ['CFLAGS', 'CXXFLAGS']) {
            const key = `${flag}_${arch}_apple_darwin`;
            env[key] = `${environment[key] ?? ''} -isysroot ${shellQuote(macSdk)}`.trim();
        }
    }
    return env;
}

export function synchronizeResources(appPath, source = path.join(tauriRoot, 'ui')) {
    if (!appPath.endsWith('.app') || !existsSync(appPath)) throw new Error(`Missing built iOS application: ${appPath}`);
    if (!existsSync(path.join(source, 'index.html')))
        throw new Error('Offline resources are missing. Run npm run apple:generate.');
    const assets = path.join(appPath, 'assets');
    mkdirSync(assets, { recursive: true });
    for (const name of ['ui', 'fonts']) rmSync(path.join(assets, name), { recursive: true, force: true });
    cpSync(source, path.join(assets, 'ui'), { recursive: true });
    const fonts = path.join(assets, 'fonts');
    mkdirSync(fonts, { recursive: true });
    for (const directory of [path.join(source, 'fonts'), path.join(source, 'rmp/fonts')]) {
        if (!existsSync(directory)) throw new Error(`Missing font directory: ${directory}`);
        cpSync(directory, fonts, { recursive: true });
    }
}

export async function synchronizeResourcesWithLock(appPath, source = path.join(tauriRoot, 'ui'), root = repoRoot) {
    return withResourceLock(root, () => synchronizeResources(appPath, source), { timeoutMs: consumerLockTimeoutMs });
}

async function buildIos(tools, config, channel) {
    await prepareResources({ buildHost: true, offline: true });
    const platform = process.env.PLATFORM_NAME;
    const arches = [...new Set((process.env.ARCHS ?? '').trim().split(/\s+/).filter(Boolean))];
    if (!arches.length) throw new Error('Xcode did not provide ARCHS. Build using the generated iOS scheme.');
    const sdk = process.env.SDKROOT || capture('/usr/bin/xcrun', ['--sdk', platform, '--show-sdk-path']);
    const macSdk = capture('/usr/bin/xcrun', ['--sdk', 'macosx', '--show-sdk-path']);
    const version = readJson(path.join(repoRoot, 'package.json')).version;
    const baseEnv = iosEnvironment(process.env, { sdk, macSdk, tools, version, channel });
    for (const arch of arches) {
        const triple = iosTriple(platform, arch);
        const env = { ...baseEnv };
        if (env.RMT_SWIFT_NATIVE_BUILD_SYSTEM === '1') {
            // Include the compatibility mode in Cargo's fingerprint so old
            // SwiftPM-built archives cannot be reused after regeneration.
            if (env.CARGO_ENCODED_RUSTFLAGS) env.CARGO_ENCODED_RUSTFLAGS += '\u001f--cfg\u001frmt_swiftpm_native';
            else {
                const key = `CARGO_TARGET_${triple.toUpperCase().replaceAll('-', '_')}_RUSTFLAGS`;
                env[key] = `${env[key] ?? env.RUSTFLAGS ?? ''} --cfg rmt_swiftpm_native`.trim();
            }
        }
        const minimumFlag =
            platform === 'iphonesimulator' ? '-mios-simulator-version-min=15.0' : '-miphoneos-version-min=15.0';
        for (const flag of ['CFLAGS', 'CXXFLAGS']) {
            const key = `${flag}_${triple.replaceAll('-', '_')}`;
            env[key] = `${process.env[key] ?? ''} -isysroot ${shellQuote(sdk)} ${minimumFlag}`.trim();
        }
        run(tools.cargo, cargoArguments(platform, arch, config), { cwd: tauriRoot, env });
        const source = path.join(env.CARGO_TARGET_DIR, triple, config.toLowerCase(), 'libapp_lib.a');
        const destination = path.join(appleRoot, 'Externals', platform, arch, process.env.CONFIGURATION);
        if (!existsSync(source)) throw new Error(`Cargo succeeded without creating ${source}.`);
        mkdirSync(destination, { recursive: true });
        cpSync(source, path.join(destination, 'libapp.a'));
    }
}

export function macosEnvironment(environment, tools, channel) {
    const env = {
        ...environment,
        PATH: `${path.dirname(tools.cargo)}:${path.dirname(tools.node)}:${environment.PATH}`,
        CARGO_TARGET_DIR: path.join(tauriRoot, 'target'),
        RMT_APPLE_CHANNEL: resolveAppleChannel(channel, environment, tools),
    };
    // A Tauri subprocess must not inherit Xcode's product/executable names.
    delete env.TAURI_CONFIG;
    return env;
}

async function buildMacos(tools, config, channel) {
    await prepareResources({ buildHost: true, offline: true });
    const version = readJson(path.join(repoRoot, 'package.json')).version;
    const configPath = path.join(buildRoot, `macos-${config}.config.json`);
    const base = readJson(path.join(tauriRoot, 'tauri.conf.json'));
    const override = {
        version,
        build: { frontendDist: [] },
        bundle: { createUpdaterArtifacts: false, resources: { 'ui/': 'ui/' } },
        app: { windows: base.app.windows.map(window => ({ ...window, label: window.label ?? 'main', create: false })) },
    };
    if (config === 'Debug')
        override.bundle.macOS = { entitlements: path.join(repoRoot, 'scripts/apple/macos-debug.entitlements') };
    writeJson(configPath, override);
    const env = macosEnvironment(process.env, tools, channel);
    // Tauri copies UI/fonts during its build and bundling stages, so retain the
    // same lock until the complete signed app has been staged for Xcode Run.
    // Preparation is deliberately outside this callback to avoid nested locks.
    await withResourceLock(
        repoRoot,
        () => {
            run(
                tools.node,
                [
                    cli,
                    'build',
                    '--features',
                    'apple-bundle-assets',
                    '--target',
                    tools.hostTriple,
                    '--bundles',
                    'app',
                    '--config',
                    configPath,
                    ...(config === 'Debug' ? ['--debug'] : []),
                ],
                { cwd: tauriRoot, env }
            );
            const appName = 'Rail Map Toolkit.app';
            const source = path.join(
                env.CARGO_TARGET_DIR,
                tools.hostTriple,
                config.toLowerCase(),
                'bundle/macos',
                appName
            );
            if (!existsSync(path.join(source, 'Contents/MacOS/railmapgen')))
                throw new Error(`Tauri did not create ${source}.`);
            const destination = path.join(buildRoot, 'macos', config, appName);
            mkdirSync(path.dirname(destination), { recursive: true });
            rmSync(destination, { recursive: true, force: true });
            cpSync(source, destination, { recursive: true, verbatimSymlinks: true, preserveTimestamps: true });
        },
        { timeoutMs: consumerLockTimeoutMs }
    );
}

export async function build(operation, options = {}) {
    // Reject an invalid explicit selection before any native build or resource write.
    if (options.channel !== undefined || process.env.RMT_APPLE_CHANNEL !== undefined)
        resolveAppleChannel(options.channel, process.env);
    if (operation === 'ios-resources') {
        if (!process.env.TARGET_BUILD_DIR || !process.env.WRAPPER_NAME)
            throw new Error('Missing Xcode application resource destination.');
        await synchronizeResourcesWithLock(path.join(process.env.TARGET_BUILD_DIR, process.env.WRAPPER_NAME));
        return;
    }
    const toolsPath = path.join(buildRoot, 'toolchain.json');
    if (!existsSync(toolsPath)) throw new Error('Toolchain settings are missing. Run npm run apple:generate.');
    const tools = readJson(toolsPath);
    const channel = resolveAppleChannel(options.channel, process.env, tools);
    const config = configuration(process.env.CONFIGURATION);
    console.log(`Building Apple ${channel} (${config}).`);
    if (operation === 'ios') await buildIos(tools, config, channel);
    else if (operation === 'macos') await buildMacos(tools, config, channel);
    else throw new Error(`Unknown Apple build operation: ${operation}`);
}
