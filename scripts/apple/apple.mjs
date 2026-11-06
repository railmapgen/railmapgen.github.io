import { existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { capture, cli, run, tauriRoot, workspace } from './common.mjs';
import { generate } from './project.mjs';
import { build, swift } from './build.mjs';
import { prepareResources } from './resources.mjs';

const help = `Usage: node scripts/apple/apple.mjs <command> [options]

Commands:
  generate   Generate Xcode projects (--ios-only, --ci, --refresh-assets)
  open       Open the generated Xcode workspace
  build      Build for Xcode (ios, macos, ios-resources)
  resources  Prepare offline resources (--refresh-assets, --offline, --skip-host-build)
  tauri      Forward arguments to the pinned Tauri CLI
  swift      Forward arguments to Swift with the iOS compatibility settings
`;

function validateOptions(args, allowed) {
    const invalid = args.filter(arg => !allowed.includes(arg));
    if (invalid.length) throw new Error(`Unknown option: ${invalid.join(', ')}`);
}

export async function main([command, ...args] = process.argv.slice(2)) {
    switch (command) {
        case undefined:
        case '--help':
        case '-h':
            console.log(help);
            return;
        case 'generate':
            validateOptions(args, ['--ios-only', '--ci', '--refresh-assets']);
            return generate({
                iosOnly: args.includes('--ios-only'),
                ci: args.includes('--ci'),
                refreshAssets: args.includes('--refresh-assets'),
            });
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
        case 'build':
            if (args.length !== 1 || !['ios', 'macos', 'ios-resources'].includes(args[0]))
                throw new Error('Choose an Apple build operation: ios, macos, ios-resources.');
            return build(args[0]);
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
    main().catch(error => {
        console.error(`Apple command failed: ${error.message}`);
        process.exitCode = 1;
    });
}
