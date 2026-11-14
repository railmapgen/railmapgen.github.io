import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import {
    cpSync,
    mkdtempSync,
    mkdirSync,
    readFileSync,
    realpathSync,
    rmSync,
    symlinkSync,
    writeFileSync,
    chmodSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parseBuildNumberOptions, parseChannelOptions } from './apple.mjs';
import {
    appleBuildNumber,
    appleChannel,
    configuration,
    iosTriple,
    resolveAppleBuildNumber,
    run,
    withResourceLock,
} from './common.mjs';
import {
    cargoArguments,
    iosEnvironment,
    macosEnvironment,
    resolveAppleChannel,
    swiftArguments,
    synchronizeResources,
} from './build.mjs';
import { generate, iosSpec, macScheme, macSpec, nodeLauncher, scaffoldIos } from './project.mjs';

test('the shared CLI imports without side effects and rejects invalid input before running tools', () => {
    const entry = new URL('./apple.mjs', import.meta.url);
    assert.equal(
        execFileSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(entry.href)})`], {
            encoding: 'utf8',
        }),
        ''
    );
    const filename = fileURLToPath(entry);
    assert.match(execFileSync(process.execPath, [filename, '--help'], { encoding: 'utf8' }), /generate[\s\S]*swift/);
    for (const args of [['missing-command'], ['generate', '--invalid'], ['resources', '--invalid'], ['build']]) {
        const result = spawnSync(process.execPath, [filename, ...args], { encoding: 'utf8' });
        assert.equal(result.status, 1, result.stderr);
        assert.equal(result.stdout, '');
        assert.equal(result.stderr, 'Apple command failed.\n');
    }
});

test('the shared CLI forwards Tauri arguments and its exit status', () => {
    const entry = fileURLToPath(new URL('./apple.mjs', import.meta.url));
    const direct = fileURLToPath(new URL('../../node_modules/@tauri-apps/cli/tauri.js', import.meta.url));
    const version = execFileSync(process.execPath, [direct, '--version'], { encoding: 'utf8' });
    assert.equal(execFileSync(process.execPath, [entry, 'tauri', '--version'], { encoding: 'utf8' }), version);
    const result = spawnSync(process.execPath, [entry, 'tauri', '--invalid-rmt-option'], { encoding: 'utf8' });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /unexpected argument/);
});

test('the shared Swift entry preserves arguments and the package directory while applying compatibility', () => {
    const temporary = mkdtempSync(path.join(os.tmpdir(), "rmt swift's "));
    try {
        const scripts = path.join(temporary, 'scripts/apple');
        const tools = path.join(temporary, 'tauri/.build/xcode');
        mkdirSync(scripts, { recursive: true });
        mkdirSync(tools, { recursive: true });
        for (const name of ['apple', 'build', 'common', 'project', 'resources'])
            cpSync(new URL(`./${name}.mjs`, import.meta.url), path.join(scripts, `${name}.mjs`));
        const probe = path.join(temporary, 'probe.mjs');
        const swift = path.join(temporary, 'swift probe');
        writeFileSync(probe, 'console.log(JSON.stringify({args:process.argv.slice(2),cwd:process.cwd()}));');
        writeFileSync(swift, nodeLauncher(process.execPath, [probe]));
        chmodSync(swift, 0o755);
        writeFileSync(path.join(tools, 'toolchain.json'), JSON.stringify({ swift }));
        const args = ['build', '-c', 'release', '--triple', 'arm64-apple-ios15.0', "argument with 'quotes'"];
        const result = execFileSync(process.execPath, [path.join(scripts, 'apple.mjs'), 'swift', ...args], {
            cwd: temporary,
            env: { ...process.env, RMT_SWIFT_NATIVE_BUILD_SYSTEM: '1' },
            encoding: 'utf8',
        });
        assert.deepEqual(JSON.parse(result), {
            args: [...args, '--build-system', 'native'],
            cwd: realpathSync(temporary),
        });
    } finally {
        rmSync(temporary, { recursive: true, force: true });
    }
});

test('device and simulator build the correct Cargo target and profile; unsupported settings fail', () => {
    assert.equal(iosTriple('iphoneos', 'arm64'), 'aarch64-apple-ios');
    assert.equal(iosTriple('iphonesimulator', 'arm64'), 'aarch64-apple-ios-sim');
    assert.equal(iosTriple('iphonesimulator', 'x86_64'), 'x86_64-apple-ios');
    assert.throws(() => iosTriple('iphoneos', 'x86_64'), /Unsupported/);
    assert.equal(configuration('release'), 'Release');
    assert.throws(() => configuration('Profile'), /Unsupported/);
    assert.ok(cargoArguments('iphoneos', 'arm64', 'Release').includes('--release'));
    assert.ok(!cargoArguments('iphonesimulator', 'arm64', 'Debug').includes('--release'));
    assert.ok(cargoArguments('iphoneos', 'arm64', 'Release').includes('--locked'));
    assert.equal(cargoArguments('iphoneos', 'arm64', 'Release')[0], 'rustc');
    assert.ok(cargoArguments('iphoneos', 'arm64', 'Release').includes('staticlib'));
});

test('Xcode frontend environment keeps host and target SDKs separate', () => {
    const env = iosEnvironment(
        { PATH: '/usr/bin', CFLAGS_aarch64_apple_darwin: '-O2' },
        {
            sdk: '/SDK/iOS.sdk',
            macSdk: '/SDK/Mac SDK.sdk',
            tools: { node: '/Node Folder/node', cargo: '/Cargo Folder/cargo' },
            version: '3.2.41',
        }
    );
    assert.match(env.CFLAGS_aarch64_apple_darwin, /^-O2 .*Mac SDK/);
    assert.equal(env.SDKROOT, '/SDK/iOS.sdk');
    assert.equal(env.CC_SHELL_ESCAPED_FLAGS, '1');
    assert.equal(env.IPHONEOS_DEPLOYMENT_TARGET, '15.0');
    assert.ok(env.PATH.includes(':/Cargo Folder:/Node Folder:'));
    assert.deepEqual(JSON.parse(env.TAURI_CONFIG), { version: '3.2.41', bundle: { resources: [] } });
});

test('SwiftPM compatibility is limited to affected iOS package builds', () => {
    const ios = ['build', '-c', 'release', '--triple', 'arm64-apple-ios15.0'];
    assert.deepEqual(swiftArguments(ios, true).slice(-2), ['--build-system', 'native']);
    assert.deepEqual(swiftArguments(ios, false), ios);
    assert.deepEqual(swiftArguments(['--version'], true), ['--version']);
    const mac = ['build', '--triple', 'arm64-apple-macos15.0'];
    assert.deepEqual(swiftArguments(mac, true), mac);
});

test('iOS scaffold can be regenerated and preserves local plugin entitlements', () => {
    const temporary = mkdtempSync(path.join(os.tmpdir(), 'rmt scaffold '));
    try {
        scaffoldIos(temporary);
        const entitlements = path.join(temporary, 'railmapgen_iOS/railmapgen_iOS.entitlements');
        writeFileSync(entitlements, 'plugin entitlements');
        scaffoldIos(temporary);
        assert.equal(readFileSync(entitlements, 'utf8'), 'plugin entitlements');
        assert.match(readFileSync(path.join(temporary, 'Sources/railmapgen/main.mm'), 'utf8'), /start_app/);
        assert.match(
            readFileSync(path.join(temporary, 'Sources/railmapgen/Preferences.mm'), 'utf8'),
            /rmt-native-preferences/
        );
        for (const file of ['WebViewRecovery.h', 'WebViewRecovery.mm'])
            assert.equal(
                readFileSync(path.join(temporary, 'Sources/railmapgen', file), 'utf8'),
                readFileSync(new URL(`./${file}`, import.meta.url), 'utf8')
            );
        const settings = path.join(temporary, 'railmapgen_iOS/Settings.bundle');
        assert.match(readFileSync(path.join(settings, 'Root.plist'), 'utf8'), /rmtAppearance/);
        for (const language of ['en', 'zh-Hans', 'zh-Hant', 'ja', 'ko'])
            assert.match(readFileSync(path.join(settings, `${language}.lproj/Root.strings`), 'utf8'), /"Appearance"/);
        const icons = JSON.parse(
            readFileSync(path.join(temporary, 'Assets.xcassets/AppIcon.appiconset/Contents.json'))
        );
        assert.ok(icons.images.some(image => image.idiom === 'ipad'));
        assert.ok(icons.images.some(image => image.idiom === 'iphone'));
    } finally {
        rmSync(temporary, { recursive: true, force: true });
    }
});

test('packaged iOS app icons have the required dimensions and RGB format', () => {
    const iconSet = new URL('../../tauri/icons/Assets.xcassets/AppIcon.appiconset/', import.meta.url);
    const { images } = JSON.parse(readFileSync(new URL('Contents.json', iconSet)));
    assert.ok(images.some(image => image.idiom === 'ios-marketing'));
    for (const { filename, size, scale } of images) {
        const png = readFileSync(new URL(filename, iconSet));
        const pixels = Number(size.split('x')[0]) * Number(scale.replace('x', ''));
        assert.equal(png.subarray(1, 4).toString(), 'PNG');
        assert.equal(png.readUInt32BE(16), pixels, filename);
        assert.equal(png.readUInt32BE(20), pixels, filename);
        assert.equal(png[25], 2, `${filename} must be RGB`);
    }
});

test(
    'Xcode packages the complete Settings bundle and declares all web UI languages',
    { skip: process.platform !== 'darwin' },
    t => {
        if (spawnSync('xcodegen', ['--version']).status !== 0) return t.skip('XcodeGen is not installed');
        const temporary = mkdtempSync(path.join(os.tmpdir(), 'rmt settings bundle '));
        try {
            scaffoldIos(temporary);
            const spec = iosSpec({ version: '3.2.41' });
            spec.fileGroups = [];
            const specPath = path.join(temporary, 'project.json');
            writeFileSync(specPath, JSON.stringify(spec));
            execFileSync('xcodegen', ['generate', '--spec', specPath], { stdio: 'pipe' });
            const project = JSON.parse(
                execFileSync('/usr/bin/plutil', [
                    '-convert',
                    'json',
                    '-o',
                    '-',
                    path.join(temporary, 'railmapgen.xcodeproj/project.pbxproj'),
                ])
            );
            const [referenceId, reference] =
                Object.entries(project.objects).find(
                    ([, object]) => object.isa === 'PBXFileReference' && object.path.endsWith('Settings.bundle')
                ) ?? [];
            assert.ok(referenceId, 'Settings.bundle must remain an intact resource reference');
            assert.equal(reference.lastKnownFileType, 'folder');
            const [buildFileId] =
                Object.entries(project.objects).find(
                    ([, object]) => object.isa === 'PBXBuildFile' && object.fileRef === referenceId
                ) ?? [];
            assert.ok(
                Object.values(project.objects).some(
                    object => object.isa === 'PBXResourcesBuildPhase' && object.files.includes(buildFileId)
                )
            );
            const info = JSON.parse(
                execFileSync('/usr/bin/plutil', [
                    '-convert',
                    'json',
                    '-o',
                    '-',
                    path.join(temporary, 'railmapgen_iOS/Info.plist'),
                ])
            );
            assert.deepEqual(info.CFBundleLocalizations, ['en', 'zh-Hans', 'zh-Hant', 'ja', 'ko']);
            const settings = JSON.parse(
                execFileSync('/usr/bin/plutil', [
                    '-convert',
                    'json',
                    '-o',
                    '-',
                    path.join(temporary, 'railmapgen_iOS/Settings.bundle/Root.plist'),
                ])
            );
            const preferences = settings.PreferenceSpecifiers.filter(preference => preference.Key);
            assert.deepEqual(
                preferences.map(preference => [preference.Key, preference.DefaultValue]),
                [['rmtAppearance', 'system']]
            );
            assert.deepEqual(preferences[0].Values, ['system', 'light', 'dark']);
        } finally {
            rmSync(temporary, { recursive: true, force: true });
        }
    }
);

test('GUI Node launcher handles spaces and apostrophes, and propagates process failure', () => {
    const temporary = mkdtempSync(path.join(os.tmpdir(), "rmt path's "));
    try {
        const node = path.join(temporary, 'node binary');
        symlinkSync(process.execPath, node);
        const launcher = path.join(temporary, 'launcher');
        writeFileSync(launcher, nodeLauncher(node));
        chmodSync(launcher, 0o755);
        assert.equal(
            execFileSync(launcher, ['-p', '"space and quote work"'], { encoding: 'utf8' }).trim(),
            'space and quote work'
        );
        const probe = path.join(temporary, 'argument probe.mjs');
        const args = ['--triple', 'arm64-apple-ios15.0', "path with spaces and 'quotes'", '--'];
        writeFileSync(probe, 'console.log(JSON.stringify({args:process.argv.slice(2),cwd:process.cwd()}));');
        writeFileSync(launcher, nodeLauncher(node, [probe, 'swift']));
        assert.deepEqual(JSON.parse(execFileSync(launcher, args, { cwd: temporary, encoding: 'utf8' })), {
            args: ['swift', ...args],
            cwd: realpathSync(temporary),
        });
        assert.throws(() => run(process.execPath, ['-e', 'process.exit(19)'], { stdio: 'pipe' }), /failed \(19\)/);
    } finally {
        rmSync(temporary, { recursive: true, force: true });
    }
});

test('native resources replace removed files and merge both font directories', () => {
    const temporary = mkdtempSync(path.join(os.tmpdir(), 'rmt resources '));
    try {
        const app = path.join(temporary, 'Example.app');
        const ui = path.join(temporary, 'ui');
        mkdirSync(path.join(app, 'assets/ui'), { recursive: true });
        mkdirSync(path.join(ui, 'fonts'), { recursive: true });
        mkdirSync(path.join(ui, 'rmp/fonts'), { recursive: true });
        writeFileSync(path.join(app, 'assets/ui/stale.txt'), 'old');
        writeFileSync(path.join(ui, 'index.html'), 'new');
        writeFileSync(path.join(ui, 'fonts/host.ttf'), 'host font');
        writeFileSync(path.join(ui, 'rmp/fonts/rmp.ttf'), 'rmp font');
        synchronizeResources(app, ui);
        assert.equal(readFileSync(path.join(app, 'assets/ui/index.html'), 'utf8'), 'new');
        assert.equal(readFileSync(path.join(app, 'assets/fonts/host.ttf'), 'utf8'), 'host font');
        assert.equal(readFileSync(path.join(app, 'assets/fonts/rmp.ttf'), 'utf8'), 'rmp font');
        assert.throws(() => readFileSync(path.join(app, 'assets/ui/stale.txt')), /ENOENT/);
        assert.throws(() => synchronizeResources(temporary, ui), /Missing built/);
    } finally {
        rmSync(temporary, { recursive: true, force: true });
    }
});

test('an iOS resource consumer waits for another process to publish the complete UI', async () => {
    const temporary = mkdtempSync(path.join(os.tmpdir(), 'rmt consumer lock '));
    const app = path.join(temporary, 'Example.app');
    const ui = path.join(temporary, 'ui');
    let child;
    let done;
    try {
        mkdirSync(path.join(app, 'assets/ui'), { recursive: true });
        mkdirSync(path.join(ui, 'fonts'), { recursive: true });
        mkdirSync(path.join(ui, 'rmp/fonts'), { recursive: true });
        writeFileSync(path.join(app, 'assets/ui/index.html'), 'previous application');
        writeFileSync(path.join(ui, 'index.html'), 'previous source');
        writeFileSync(path.join(ui, 'fonts/host.ttf'), 'host font');
        writeFileSync(path.join(ui, 'rmp/fonts/rmp.ttf'), 'RMP font');
        const worker = path.join(temporary, 'consumer.mjs');
        writeFileSync(
            worker,
            `import { synchronizeResourcesWithLock } from ${JSON.stringify(new URL('./build.mjs', import.meta.url).href)};
await synchronizeResourcesWithLock(${JSON.stringify(app)}, ${JSON.stringify(ui)}, ${JSON.stringify(temporary)});`
        );
        await withResourceLock(temporary, async () => {
            child = spawn(process.execPath, [worker], { stdio: ['ignore', 'pipe', 'pipe'] });
            let output = '';
            let timer;
            let observed;
            const waiting = new Promise((resolve, reject) => {
                observed = resolve;
                timer = setTimeout(() => reject(new Error('Consumer did not wait for resource ownership')), 5000);
            });
            child.stdout.on('data', data => {
                output += data;
                if (output.includes('Waiting for Apple resource preparation')) observed();
            });
            child.stderr.on('data', data => {
                output += data;
            });
            done = new Promise((resolve, reject) => {
                child.once('error', reject);
                child.once('exit', code => resolve({ code, output }));
            });
            try {
                await Promise.race([
                    waiting,
                    done.then(result => {
                        throw new Error(`Consumer exited before acquiring lock: ${result.output}`);
                    }),
                ]);
            } finally {
                clearTimeout(timer);
            }
            assert.equal(readFileSync(path.join(app, 'assets/ui/index.html'), 'utf8'), 'previous application');
            writeFileSync(path.join(ui, 'index.html'), 'complete updated UI');
        });
        const result = await done;
        assert.equal(result.code, 0, result.output);
        assert.equal(readFileSync(path.join(app, 'assets/ui/index.html'), 'utf8'), 'complete updated UI');
        assert.equal(readFileSync(path.join(app, 'assets/fonts/host.ttf'), 'utf8'), 'host font');
        assert.equal(readFileSync(path.join(app, 'assets/fonts/rmp.ttf'), 'utf8'), 'RMP font');
    } finally {
        if (child?.exitCode === null) child.kill();
        await done?.catch(() => {});
        rmSync(temporary, { recursive: true, force: true });
    }
});

test('schemes and SDK-separated link paths are generated without a CLI daemon', () => {
    const spec = iosSpec({ version: '3.2.41', team: 'LOCALTEAM' });
    assert.match(
        spec.targets.railmapgen_iOS.info.properties.NSPhotoLibraryAddUsageDescription,
        /exported images and videos/
    );
    const target = spec.targets.railmapgen_iOS;
    assert.equal(spec.options.deploymentTarget.iOS, '15.0');
    assert.equal(target.settings.base.TARGETED_DEVICE_FAMILY, '1,2');
    assert.match(
        target.settings.base['LIBRARY_SEARCH_PATHS[arch=arm64]'][0],
        /\$\(PLATFORM_NAME\)\/arm64\/\$\(CONFIGURATION\)/
    );
    assert.equal(target.settings.base.DEVELOPMENT_TEAM, 'LOCALTEAM');
    assert.ok(!JSON.stringify(spec).includes('xcode-script'));
    assert.match(target.preBuildScripts[0].script, /apple\.mjs" build ios$/);
    assert.match(target.postBuildScripts[0].script, /apple\.mjs" build ios-resources$/);
    assert.match(macSpec().aggregateTargets['RailMapToolkit-macOS'].buildScripts[0].script, /apple\.mjs" build macos$/);
    const scheme = macScheme('Debug', '/some path/A & B.app/Contents/MacOS/railmapgen');
    assert.match(scheme, /<PathRunnable/);
    assert.match(scheme, /A &amp; B.app/);
    assert.match(scheme, /buildConfiguration="Debug"/);
    assert.ok(!macScheme('Release', '/app').includes('Debugger.LLDB'));
});

test('Apple channel defaults to stable and accepts the displayed TestFlight name', () => {
    assert.equal(appleChannel(), 'stable');
    assert.equal(appleChannel('stable'), 'stable');
    assert.equal(appleChannel('Stable'), 'stable');
    assert.equal(appleChannel('TestFlight'), 'testflight');
    assert.equal(appleChannel('testflight'), 'testflight');
    for (const value of ['', 'beta', 'production', null, 1])
        assert.throws(() => appleChannel(value), /Choose stable or TestFlight/);
});

test('channel arguments retain existing generate flags and build operation', () => {
    assert.deepEqual(parseChannelOptions(['--ios-only', '--channel', 'TestFlight', '--ci']), {
        args: ['--ios-only', '--ci'],
        channel: 'testflight',
    });
    assert.deepEqual(parseChannelOptions(['ios', '--channel=stable']), { args: ['ios'], channel: 'stable' });
    assert.deepEqual(parseChannelOptions(['macos']), { args: ['macos'], channel: undefined });
    assert.throws(() => parseChannelOptions(['--channel']), /Choose an Apple channel/);
    assert.throws(() => parseChannelOptions(['--channel', 'stable', '--channel', 'TestFlight']), /only once/);
});

test('CLI rejects invalid channel selections before generating or building', async () => {
    const cli = fileURLToPath(new URL('./apple.mjs', import.meta.url));
    for (const args of [
        ['generate', '--channel', 'preview'],
        ['build', 'ios', '--channel', 'preview'],
        ['build', 'macos', '--channel'],
        ['build', 'ios-resources', '--channel=preview'],
    ]) {
        const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
        assert.equal(result.status, 1, result.stderr);
        assert.equal(result.stdout, '');
        assert.equal(result.stderr, 'Apple command failed.\n');
    }
    await assert.rejects(generate({ channel: 'preview' }), /Choose stable or TestFlight/);
});

test('CLI failures do not log environment-derived channel values', () => {
    const cli = fileURLToPath(new URL('./apple.mjs', import.meta.url));
    const result = spawnSync(process.execPath, [cli, 'build', 'ios-resources'], {
        encoding: 'utf8',
        env: { ...process.env, RMT_APPLE_CHANNEL: 'private-test-channel-sentinel' },
    });
    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, 'Apple command failed.\n');
});

test('Xcode exposes the selected channel independently of Debug and Release', () => {
    for (const input of ['stable', 'TestFlight']) {
        const ios = iosSpec({ version: '1.2.3', channel: input });
        const mac = macSpec({ channel: input });
        assert.equal(ios.targets.railmapgen_iOS.settings.base.RMT_APPLE_CHANNEL, appleChannel(input));
        assert.equal(mac.settings.base.RMT_APPLE_CHANNEL, appleChannel(input));
        assert.deepEqual(ios.configs, { debug: 'debug', release: 'release' });
        assert.deepEqual(mac.configs, { Debug: 'debug', Release: 'release' });
    }
    assert.equal(iosSpec({ version: '1.2.3' }).targets.railmapgen_iOS.settings.base.RMT_APPLE_CHANNEL, 'stable');
    assert.equal(macSpec().settings.base.RMT_APPLE_CHANNEL, 'stable');
});

test('build channel precedence is CLI, Xcode environment, generated selection, then stable', () => {
    const environment = { RMT_APPLE_CHANNEL: 'stable' };
    const tools = { channel: 'testflight' };
    assert.equal(resolveAppleChannel('TestFlight', environment, tools), 'testflight');
    assert.equal(resolveAppleChannel(undefined, environment, tools), 'stable');
    assert.equal(resolveAppleChannel(undefined, {}, tools), 'testflight');
    assert.equal(resolveAppleChannel(), 'stable');
    assert.throws(() => resolveAppleChannel(undefined, { RMT_APPLE_CHANNEL: '' }, tools), /Unsupported Apple channel/);
});

test('both native build environments receive the resolved channel without changing the caller', () => {
    const environment = { PATH: '/usr/bin', TAURI_CONFIG: 'old-xcode-config', RMT_APPLE_CHANNEL: 'stable' };
    const tools = { node: '/Node/node', cargo: '/Cargo/cargo', xcodeMajor: 27, channel: 'stable' };
    const ios = iosEnvironment(environment, {
        sdk: '/SDK/iOS',
        macSdk: '/SDK/macOS',
        tools,
        version: '1.2.3',
        channel: 'TestFlight',
    });
    const mac = macosEnvironment(environment, tools, 'TestFlight');
    assert.equal(ios.RMT_APPLE_CHANNEL, 'testflight');
    assert.equal(mac.RMT_APPLE_CHANNEL, 'testflight');
    assert.equal(mac.TAURI_CONFIG, undefined);
    assert.equal(environment.TAURI_CONFIG, 'old-xcode-config');
    assert.equal(environment.RMT_APPLE_CHANNEL, 'stable');
    assert.equal(
        macosEnvironment({ PATH: '/usr/bin' }, { ...tools, channel: 'testflight' }).RMT_APPLE_CHANNEL,
        'testflight'
    );
});

test('Apple build numbers accept canonical integer components and reject invalid bundle values', () => {
    assert.equal(appleBuildNumber(), '1');
    for (const value of ['0', '4', '84.1', '84.10', '84.1.0']) assert.equal(appleBuildNumber(value), value);
    for (const value of ['', ' 4', '4 ', '01', '84.01', '1.2.3.4', '1.', '.1', '-1', '+1', '1e3', '4a', '1\n', null, 4])
        assert.throws(() => appleBuildNumber(value), /build number/);
});

test('explicit build numbers override the environment and local generation defaults to one', () => {
    const environment = { RMT_APPLE_BUILD_NUMBER: '84.2' };
    assert.equal(resolveAppleBuildNumber('4', environment), '4');
    assert.equal(resolveAppleBuildNumber(undefined, environment), '84.2');
    assert.equal(resolveAppleBuildNumber(), '1');
    assert.equal(resolveAppleBuildNumber(undefined, { GITHUB_RUN_NUMBER: '84', GITHUB_RUN_ATTEMPT: '2' }), '1');
    assert.deepEqual(environment, { RMT_APPLE_BUILD_NUMBER: '84.2' });
    assert.throws(() => resolveAppleBuildNumber(undefined, { RMT_APPLE_BUILD_NUMBER: '' }), /build number/);
    assert.throws(() => resolveAppleBuildNumber('invalid', environment), /build number/);
});

test('build number arguments coexist with channel selection and existing generation flags', () => {
    const channel = parseChannelOptions(['--ios-only', '--build-number', '4', '--channel', 'TestFlight', '--ci']);
    assert.equal(channel.channel, 'testflight');
    assert.deepEqual(parseBuildNumberOptions(channel.args), { args: ['--ios-only', '--ci'], buildNumber: '4' });
    assert.deepEqual(parseBuildNumberOptions(['--build-number=84.2', '--refresh-assets']), {
        args: ['--refresh-assets'],
        buildNumber: '84.2',
    });
    assert.deepEqual(parseBuildNumberOptions(['--ios-only']), { args: ['--ios-only'], buildNumber: undefined });
    assert.throws(() => parseBuildNumberOptions(['--build-number']), /build number/);
    assert.throws(() => parseBuildNumberOptions(['--build-number', '--ci']), /build number/);
    assert.throws(() => parseBuildNumberOptions(['--build-number=']), /build number/);
    assert.throws(() => parseBuildNumberOptions(['--build-number', '4', '--build-number=5']), /only once/);
});

test('invalid build numbers fail before project generation or resource preparation', async () => {
    const cli = fileURLToPath(new URL('./apple.mjs', import.meta.url));
    for (const args of [
        ['generate', '--build-number', '4a'],
        ['generate', '--build-number'],
        ['generate', '--build-number='],
    ]) {
        const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
        assert.equal(result.status, 1, result.stderr);
        assert.equal(result.stdout, '');
        assert.equal(result.stderr, 'Apple command failed.\n');
    }
    const result = spawnSync(process.execPath, [cli, 'generate'], {
        encoding: 'utf8',
        env: { ...process.env, RMT_APPLE_BUILD_NUMBER: 'invalid' },
    });
    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, 'Apple command failed.\n');
    await assert.rejects(generate({ buildNumber: 'invalid' }), /build number/);
});

test('iOS release versions remain independent of local and CI build numbers', () => {
    for (const buildNumber of ['4', '84.1', '84.2']) {
        const target = iosSpec({ version: '3.2.47', buildNumber }).targets.railmapgen_iOS;
        assert.equal(target.info.properties.CFBundleShortVersionString, '3.2.47');
        assert.equal(target.info.properties.CFBundleVersion, '$(CURRENT_PROJECT_VERSION)');
        assert.equal(target.settings.base.CURRENT_PROJECT_VERSION, buildNumber);
    }
    assert.equal(iosSpec({ version: '3.2.47' }).targets.railmapgen_iOS.settings.base.CURRENT_PROJECT_VERSION, '1');
    assert.throws(() => iosSpec({ version: '3.2.47', buildNumber: 'invalid' }), /build number/);
});

test(
    'XcodeGen preserves the build setting and its Info.plist reference in every configuration',
    { skip: process.platform !== 'darwin' },
    t => {
        if (spawnSync('xcodegen', ['--version']).status !== 0) return t.skip('XcodeGen is not installed');
        const temporary = mkdtempSync(path.join(os.tmpdir(), 'rmt build number '));
        try {
            scaffoldIos(temporary);
            const spec = iosSpec({ version: '3.2.47', buildNumber: '84.2' });
            spec.fileGroups = [];
            const specPath = path.join(temporary, 'project.json');
            writeFileSync(specPath, JSON.stringify(spec));
            execFileSync('xcodegen', ['generate', '--spec', specPath], { stdio: 'pipe' });
            const project = JSON.parse(
                execFileSync('/usr/bin/plutil', [
                    '-convert',
                    'json',
                    '-o',
                    '-',
                    path.join(temporary, 'railmapgen.xcodeproj/project.pbxproj'),
                ])
            );
            const target = Object.values(project.objects).find(object => object.isa === 'PBXNativeTarget');
            const configurations = project.objects[target.buildConfigurationList].buildConfigurations;
            assert.equal(configurations.length, 2);
            assert.deepEqual(configurations.map(id => project.objects[id].name).sort(), ['debug', 'release']);
            for (const identifier of configurations)
                assert.equal(project.objects[identifier].buildSettings.CURRENT_PROJECT_VERSION, '84.2');
            const info = JSON.parse(
                execFileSync('/usr/bin/plutil', [
                    '-convert',
                    'json',
                    '-o',
                    '-',
                    path.join(temporary, 'railmapgen_iOS/Info.plist'),
                ])
            );
            assert.equal(info.CFBundleShortVersionString, '3.2.47');
            assert.equal(info.CFBundleVersion, '$(CURRENT_PROJECT_VERSION)');
            assert.match(
                readFileSync(path.join(temporary, 'railmapgen.xcodeproj/project.pbxproj'), 'utf8'),
                /CURRENT_PROJECT_VERSION/
            );
        } finally {
            rmSync(temporary, { recursive: true, force: true });
        }
    }
);
