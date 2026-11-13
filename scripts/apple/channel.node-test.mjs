import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parseChannelOptions } from './apple.mjs';
import { appleChannel } from './common.mjs';
import { iosEnvironment, macosEnvironment, resolveAppleChannel } from './build.mjs';
import { generate, iosSpec, macSpec } from './project.mjs';

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
        assert.deepEqual(ios.configs, { Debug: 'debug', Release: 'release' });
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
