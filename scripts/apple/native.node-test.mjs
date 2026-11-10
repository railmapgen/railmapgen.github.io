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
import { configuration, iosTriple, run, withResourceLock } from './common.mjs';
import {
    cargoArguments,
    iosEnvironment,
    swiftArguments,
    synchronizeResources,
    synchronizeResourcesWithLock,
} from './build.mjs';
import { generateIosIcons, iosSpec, macScheme, macSpec, nodeLauncher, scaffoldIos } from './project.mjs';

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
        assert.match(result.stderr, /Unknown Apple command|Unknown option|Choose an Apple build operation/);
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

test('iOS app icons have the required dimensions and no alpha channel', { skip: process.platform !== 'darwin' }, () => {
    const temporary = mkdtempSync(path.join(os.tmpdir(), 'rmt ios icons '));
    try {
        scaffoldIos(temporary);
        const iconSet = path.join(temporary, 'Assets.xcassets/AppIcon.appiconset');
        generateIosIcons(iconSet);
        const { images } = JSON.parse(readFileSync(path.join(iconSet, 'Contents.json')));
        assert.ok(images.some(image => image.idiom === 'ios-marketing'));
        const files = images.map(({ filename, size, scale }) => {
            const file = path.join(iconSet, filename);
            const png = readFileSync(file);
            const pixels = Number(size.split('x')[0]) * Number(scale.replace('x', ''));
            assert.equal(png.subarray(1, 4).toString(), 'PNG');
            assert.equal(png.readUInt32BE(16), pixels, filename);
            assert.equal(png.readUInt32BE(20), pixels, filename);
            assert.equal(png[25], 2, `${filename} must be RGB`);
            return file;
        });
        const metadata = execFileSync('/usr/bin/sips', ['--getProperty', 'hasAlpha', ...files], { encoding: 'utf8' });
        assert.equal((metadata.match(/hasAlpha: no/g) ?? []).length, images.length);
        assert.doesNotMatch(metadata, /hasAlpha: yes/);
    } finally {
        rmSync(temporary, { recursive: true, force: true });
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
