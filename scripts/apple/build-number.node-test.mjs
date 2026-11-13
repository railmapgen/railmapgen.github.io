import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parseBuildNumberOptions, parseChannelOptions } from './apple.mjs';
import { appleBuildNumber, resolveAppleBuildNumber } from './build-number.mjs';
import { generate, iosSpec, scaffoldIos } from './project.mjs';

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
