import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// An isolated native host keeps these tests independent of Cargo, the bundled
// websites, signing credentials, and the generated production Xcode project.
const directory = fileURLToPath(new URL('.', import.meta.url));
const args = process.argv.slice(2);
if (args.some(argument => argument !== '--build-only')) {
    throw new Error('Usage: node scripts/apple/tests/run-recovery-tests.mjs [--build-only]');
}
if (process.platform !== 'darwin') throw new Error('The native recovery tests require macOS and Xcode.');
const temporary = mkdtempSync(path.join(os.tmpdir(), 'rmt-recovery-tests-'));
let simulator;
let succeeded = false;

function run(command, arguments_, { log = false } = {}) {
    const result = spawnSync(command, arguments_, {
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
    });
    if (log) writeFileSync(path.join(temporary, 'xcodebuild.log'), result.stdout + result.stderr);
    if (result.error || result.status !== 0) {
        const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
        throw new Error(`${command} failed (${result.status ?? result.error?.message}).\n${output.slice(-16000)}`);
    }
    return result.stdout.trim();
}

try {
    const spec = {
        name: 'RecoveryTests',
        options: { deploymentTarget: { iOS: '15.0' } },
        settings: {
            base: {
                CLANG_ENABLE_OBJC_ARC: true,
                CODE_SIGNING_ALLOWED: false,
                GENERATE_INFOPLIST_FILE: true,
                TARGETED_DEVICE_FAMILY: '1,2',
            },
        },
        targets: {
            RecoveryHost: {
                type: 'application',
                platform: 'iOS',
                sources: [path.join(directory, 'RecoveryHost.m')],
                info: {
                    path: 'HostInfo.plist',
                    properties: {
                        UILaunchScreen: {},
                        UIApplicationSceneManifest: {
                            UIApplicationSupportsMultipleScenes: false,
                            UISceneConfigurations: {
                                UIWindowSceneSessionRoleApplication: [
                                    {
                                        UISceneConfigurationName: 'Recovery Tests',
                                        UISceneDelegateClassName: 'RMTRecoveryTestScene',
                                    },
                                ],
                            },
                        },
                    },
                },
                settings: { base: { PRODUCT_BUNDLE_IDENTIFIER: 'org.railmapgen.recovery-test-host' } },
            },
            RecoveryTests: {
                type: 'bundle.unit-test',
                platform: 'iOS',
                sources: [
                    path.join(directory, 'WebViewRecoveryTests.mm'),
                    path.resolve(directory, '../WebViewRecovery.mm'),
                ],
                dependencies: [{ target: 'RecoveryHost' }, { sdk: 'UIKit.framework' }, { sdk: 'WebKit.framework' }],
                settings: {
                    base: {
                        PRODUCT_BUNDLE_IDENTIFIER: 'org.railmapgen.recovery-tests',
                        TEST_HOST: '$(BUILT_PRODUCTS_DIR)/RecoveryHost.app/RecoveryHost',
                        BUNDLE_LOADER: '$(TEST_HOST)',
                    },
                },
            },
        },
        schemes: {
            RecoveryTests: {
                build: { targets: { RecoveryHost: 'all', RecoveryTests: 'test' } },
                test: { targets: ['RecoveryTests'] },
            },
        },
    };
    const specPath = path.join(temporary, 'project.json');
    writeFileSync(specPath, JSON.stringify(spec, null, 2));
    run('xcodegen', ['generate', '--spec', specPath]);
    const buildOnly = args.includes('--build-only');
    let destination = 'generic/platform=iOS Simulator';
    if (!buildOnly) {
        const runtimes = JSON.parse(run('xcrun', ['simctl', 'list', 'runtimes', '--json'])).runtimes;
        const runtime = runtimes
            .filter(item => item.isAvailable && item.identifier.includes('.iOS-'))
            .sort((left, right) => right.version.localeCompare(left.version, undefined, { numeric: true }))[0];
        if (!runtime) throw new Error('No available iOS Simulator runtime. Install one in Xcode Settings > Platforms.');
        const types =
            runtime.supportedDeviceTypes ??
            JSON.parse(run('xcrun', ['simctl', 'list', 'devicetypes', '--json'])).devicetypes;
        const type = types.find(item => item.identifier.includes('.iPhone-') && item.productFamily === 'iPhone');
        if (!type) throw new Error('No available iPhone Simulator device type.');
        simulator = run('xcrun', [
            'simctl',
            'create',
            'RMT WebView Recovery Tests',
            type.identifier,
            runtime.identifier,
        ]);
        destination = `platform=iOS Simulator,id=${simulator}`;
        console.log(`Running native recovery tests on ${type.name}, iOS ${runtime.version}.`);
    }
    run(
        'xcodebuild',
        [
            buildOnly ? 'build-for-testing' : 'test',
            '-project',
            path.join(temporary, 'RecoveryTests.xcodeproj'),
            '-scheme',
            'RecoveryTests',
            '-destination',
            destination,
            '-derivedDataPath',
            path.join(temporary, 'DerivedData'),
            '-resultBundlePath',
            path.join(temporary, 'Results.xcresult'),
            '-parallel-testing-enabled',
            'NO',
            'CODE_SIGNING_ALLOWED=NO',
        ],
        { log: true }
    );
    const log = readFileSync(path.join(temporary, 'xcodebuild.log'), 'utf8');
    console.log(
        log
            .split('\n')
            .filter(line => /Executed \d+ tests?|Test Suite .*passed|\*\* TEST/.test(line))
            .join('\n')
    );
    succeeded = true;
} finally {
    if (simulator) {
        const result = spawnSync('xcrun', ['simctl', 'delete', simulator], { encoding: 'utf8' });
        if (result.status !== 0) console.error(`Could not remove test simulator ${simulator}: ${result.stderr}`);
    }
    if (succeeded) rmSync(temporary, { recursive: true, force: true });
    else console.error(`Native recovery test artifacts: ${temporary}`);
}
