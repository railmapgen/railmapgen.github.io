import { existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { appleBuildNumber, appleChannel, capture, cli, run, tauriRoot, workspace } from './common.mjs';
import { generate } from './project.mjs';
import { build, swift } from './build.mjs';
import { prepareResources } from './resources.mjs';

const help = `Usage: node scripts/apple/apple.mjs <command> [options]

Commands:
  generate   Generate Xcode projects (--ios-only, --ci, --refresh-assets, --channel stable|TestFlight, --build-number NUMBER)
  open       Open the generated Xcode workspace
  build      Build for Xcode (ios, macos, ios-resources; --channel stable|TestFlight)
  resources  Prepare offline resources (--refresh-assets, --offline, --skip-host-build)
  tauri      Forward arguments to the pinned Tauri CLI
  swift      Forward arguments to Swift with the iOS compatibility settings
`;

function validateOptions(args, allowed) {
    const invalid = args.filter(arg => !allowed.includes(arg));
    if (invalid.length) throw new Error(`Unknown option: ${invalid.join(', ')}`);
}

export function parseChannelOptions(args) {
    const remaining = [];
    let channel;
    for (let index = 0; index < args.length; index++) {
        const argument = args[index];
        if (argument === '--channel' || argument.startsWith('--channel=')) {
            if (channel !== undefined) throw new Error('Choose --channel only once.');
            const value = argument === '--channel' ? args[++index] : argument.slice('--channel='.length);
            if (value === undefined) throw new Error('Choose an Apple channel: stable or TestFlight.');
            channel = appleChannel(value);
        } else remaining.push(argument);
    }
    return { args: remaining, channel };
}

export function parseBuildNumberOptions(args) {
    const remaining = [];
    let buildNumber;
    for (let index = 0; index < args.length; index++) {
        const argument = args[index];
        if (argument === '--build-number' || argument.startsWith('--build-number=')) {
            if (buildNumber !== undefined) throw new Error('Choose --build-number only once.');
            const value = argument === '--build-number' ? args[++index] : argument.slice('--build-number='.length);
            if (value === undefined) throw new Error('Choose an Apple build number, such as 4 or 84.1.');
            buildNumber = appleBuildNumber(value);
        } else remaining.push(argument);
    }
    return { args: remaining, buildNumber };
}

export async function main([command, ...args] = process.argv.slice(2)) {
    switch (command) {
        case undefined:
        case '--help':
        case '-h':
            console.log(help);
            return;
        case 'generate': {
            const channelOptions = parseChannelOptions(args);
            const options = parseBuildNumberOptions(channelOptions.args);
            validateOptions(options.args, ['--ios-only', '--ci', '--refresh-assets']);
            return generate({
                iosOnly: options.args.includes('--ios-only'),
                ci: options.args.includes('--ci'),
                refreshAssets: options.args.includes('--refresh-assets'),
                channel: channelOptions.channel,
                buildNumber: options.buildNumber,
            });
        }
        case 'open':
            validateOptions(args, []);
            if (process.platform !== 'darwin') throw new Error('Opening Xcode requires macOS.');
            if (!existsSync(workspace))
                throw new Error('Xcode workspace is missing. Run npm run apple:generate first.');
            return run('/usr/bin/open', [
                '-a',
                path.resolve(capture('/usr/bin/xcode-select', ['-p']), '../..'),
                workspace,
            ]);
        case 'build': {
            const options = parseChannelOptions(args);
            if (options.args.length !== 1 || !['ios', 'macos', 'ios-resources'].includes(options.args[0]))
                throw new Error('Choose an Apple build operation: ios, macos, ios-resources.');
            return build(options.args[0], { channel: options.channel });
        }
        case 'resources':
            validateOptions(args, ['--refresh-assets', '--offline', '--skip-host-build']);
            return prepareResources({
                refreshAssets: args.includes('--refresh-assets'),
                offline: args.includes('--offline'),
                buildHost: !args.includes('--skip-host-build'),
            });
        case 'tauri':
            return run(process.execPath, [cli, ...args], { cwd: tauriRoot });
        case 'swift':
            return swift(args);
        default:
            throw new Error(`Unknown Apple command: ${command}. Run node scripts/apple/apple.mjs --help.`);
    }
}

if (
    process.argv[1] &&
    existsSync(process.argv[1]) &&
    realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
    main().catch(() => {
        console.error('Apple command failed.');
        process.exitCode = 1;
    });
}
