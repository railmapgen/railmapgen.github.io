import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withResourceLock } from './common.mjs';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const childApplications = [
    'rmg',
    'rmg-palette',
    'rmg-templates',
    'rmp',
    'rmp-gallery',
    'rmp-designer',
    'rma',
    'rsg',
];

const adapterRevision = 1;
const assetDirectory = '_rmt-native';

/** An explicit public HTTPS proxy is optional; canonical GitHub remains the default. */
export function repositoryUrl(component, mirror = process.env.RMT_GITHUB_MIRROR) {
    const canonical = `https://github.com/railmapgen/${component}.git`;
    if (!mirror) return canonical;
    const url = new URL(mirror);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
        throw new Error('RMT_GITHUB_MIRROR must be a public HTTPS URL without credentials, query or fragment.');
    }
    return `${url.href.replace(/\/$/, '')}/${canonical}`;
}

function run(command, args, cwd, capture = false) {
    const result = spawnSync(command, args, {
        cwd,
        env: process.env,
        encoding: 'utf8',
        stdio: capture ? 'pipe' : 'inherit',
    });
    if (result.error || result.status !== 0) {
        throw new Error(
            `${command} ${args.join(' ')} failed${result.error ? `: ${result.error.message}` : ` (${result.status})`}${capture ? `\n${result.stderr ?? ''}` : ''}`
        );
    }
    return capture ? result.stdout.trim() : undefined;
}

async function exists(filename) {
    return stat(filename).then(
        () => true,
        () => false
    );
}

async function* files(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (entry.name === '.git') continue;
        const filename = path.join(directory, entry.name);
        if (entry.isSymbolicLink()) throw new Error(`Cannot bundle a symbolic link: ${filename}`);
        if (entry.isDirectory()) yield* files(filename);
        else if (entry.isFile()) yield filename;
    }
}

/** Select only adapters backed by the actual downloaded semantic component API. */
export function detectAdapter(component, version, source) {
    const modern =
        /className\s*:\s*[^;]{0,160}["'`]rm-window[ "'`]/.test(source) && source.includes('rm-window__header');
    const legacy = /className\s*:\s*["'`]rmg-window[ "'`]/.test(source) && source.includes('rmg-window__header');
    if (!modern && !legacy) {
        throw new Error(
            `${component}@${version}: unsupported Apple layout structure; expected rm-window/rmg-window and its semantic header. Update the native adapter before refreshing this application.`
        );
    }
    return { revision: adapterRevision, family: modern ? 'mantine' : 'chakra' };
}

/** Route published child styles through the host-owned, already-consumed insets. */
export function normalizeChildSafeArea(source, { component, version, filename }) {
    const normalized = source.replace(
        /\benv\(\s*safe-area-inset-(top|right|bottom|left)\s*(?:,\s*([^()]*?))?\)/gi,
        (literal, edge, fallback) =>
            fallback !== undefined && !fallback.trim() ? literal : `var(--rmt-safe-area-${edge.toLowerCase()},0px)`
    );
    if (/\benv\s*\(\s*safe-area-inset-/i.test(normalized)) {
        throw new Error(
            `${component}@${version}: ${filename}: unsupported physical safe-area env() literal. Update the Apple resource normalizer before packaging this application.`
        );
    }
    return normalized;
}

/** Add local, offline-only native styles without changing the published source cache. */
export function injectNativeLayout(html, component, adapter) {
    if (!/<html\b/i.test(html) || !/<\/head\s*>/i.test(html)) {
        throw new Error(`${component}: invalid HTML entry (missing html/head)`);
    }
    if (html.includes('data-rmt-native-assets=')) return html;
    html = html.replace(/<html\b([^>]*)>/i, (_, attributes) => {
        const classes = attributes.match(/\bclass\s*=\s*(["'])(.*?)\1/i);
        if (classes)
            attributes = attributes.replace(
                classes[0],
                `class=${classes[1]}${classes[2]} rmt-native-edge-to-edge${classes[1]}`
            );
        else attributes += ' class="rmt-native-edge-to-edge"';
        return `<html${attributes} data-rmt-component="${component}" data-rmt-native-adapter="${adapter.family}:${adapter.revision}">`;
    });
    // Keep editor-specific scale settings while enabling drawing behind system cutouts.
    if (/<meta\b[^>]*\bname\s*=\s*["']viewport["'][^>]*>/i.test(html)) {
        html = html.replace(/<meta\b[^>]*\bname\s*=\s*["']viewport["'][^>]*>/i, meta => {
            const content = meta.match(/\bcontent\s*=\s*(["'])(.*?)\1/i);
            const viewport =
                content?.[2].replace(/(?:^|,)\s*viewport-fit\s*=\s*[^,]+/gi, '').replace(/^\s*,/, '') ??
                'width=device-width, initial-scale=1';
            const attribute = `content="${viewport}, viewport-fit=cover"`;
            return content ? meta.replace(content[0], attribute) : meta.replace(/\s*\/?>$/, ` ${attribute} />`);
        });
    } else
        html = html.replace(
            /<head\b[^>]*>/i,
            '$&\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />'
        );
    return html.replace(
        /<\/head\s*>/i,
        `<link data-rmt-native-assets="1" rel="stylesheet" href="/${assetDirectory}/edge-to-edge.css" />\n<script defer src="/${assetDirectory}/edge-to-edge.js"></script>\n</head>`
    );
}

async function inspectApplication(directory, component) {
    const info = JSON.parse(await readFile(path.join(directory, 'info.json'), 'utf8'));
    if (info.component !== component || typeof info.version !== 'string') {
        throw new Error(`${component}: invalid info.json component/version`);
    }
    if (!(await exists(path.join(directory, 'index.html'))))
        throw new Error(`${component}@${info.version}: missing index.html`);
    const code = [];
    for await (const filename of files(directory)) {
        if (/\.(?:m?js|css)$/.test(filename)) code.push(await readFile(filename, 'utf8'));
    }
    return { info, adapter: detectAdapter(component, info.version, code.join('\n')) };
}

/** Local test bundles are opt-in, checkout-local, and never claim published provenance. */
async function loadLocalApplications(root) {
    const filename = path.join(root, 'tauri/.build/apple-local-resources.json');
    let source;
    try {
        source = await readFile(filename, 'utf8');
    } catch (error) {
        if (error.code === 'ENOENT') return {};
        throw error;
    }
    let config;
    try {
        config = JSON.parse(source);
    } catch {
        throw new Error('Invalid apple-local-resources.json: expected a JSON object.');
    }
    if (
        !config ||
        typeof config !== 'object' ||
        Array.isArray(config) ||
        Object.keys(config).some(key => key !== 'rmp')
    )
        throw new Error('Invalid apple-local-resources.json: only an rmp override is supported.');
    if (!Object.hasOwn(config, 'rmp')) return {};
    const override = config.rmp;
    if (
        !override ||
        typeof override !== 'object' ||
        Array.isArray(override) ||
        Object.keys(override).some(key => !['directory', 'commit', 'dirty'].includes(key)) ||
        typeof override.directory !== 'string' ||
        !path.isAbsolute(override.directory) ||
        (override.commit !== undefined && !/^[a-f0-9]{40}$/.test(override.commit)) ||
        (override.dirty !== undefined && typeof override.dirty !== 'boolean')
    ) {
        throw new Error(
            'Invalid local rmp override: directory must be an absolute built-resource path; commit and dirty are optional source metadata.'
        );
    }
    const { info, adapter } = await inspectApplication(override.directory, 'rmp');
    const filenames = [];
    for await (const file of files(override.directory)) filenames.push(file);
    const hash = createHash('sha256');
    for (const file of filenames.sort()) {
        const data = await readFile(file);
        const relative = path.relative(override.directory, file).split(path.sep).join('/');
        hash.update(relative + '\0' + data.length + '\0').update(data);
    }
    console.log(
        `Using local RMP test resources (${info.version}). Remove apple-local-resources.json to restore published RMP.`
    );
    return {
        rmp: {
            cache: override.directory,
            component: 'rmp',
            version: info.version,
            kind: 'local',
            contentSha256: hash.digest('hex'),
            ...(override.commit === undefined ? {} : { commit: override.commit }),
            ...(override.dirty === undefined ? {} : { dirty: override.dirty }),
            adapter,
        },
    };
}

async function loadCachedApplication(root, component, { refreshAssets, offline }) {
    const cache = path.join(root, 'tauri/.build/apple-cache/repos', component);
    const valid = (await exists(path.join(cache, '.git'))) && (await exists(path.join(cache, 'index.html')));
    if (offline && (!valid || refreshAssets)) {
        throw new Error(
            `${component}: offline resource cache is missing. Run npm run apple:generate in Terminal first.`
        );
    }
    if (!valid || refreshAssets) {
        await mkdir(path.dirname(cache), { recursive: true });
        const temporary = `${cache}.download-${process.pid}`;
        await rm(temporary, { recursive: true, force: true });
        try {
            const canonical = `https://github.com/railmapgen/${component}.git`;
            const retrievalUrl = repositoryUrl(component);
            // Never trust a proxy's branch identity: independently obtain the current
            // branch commit directly from GitHub, then verify the genuine Git objects.
            const expectedCommit =
                retrievalUrl === canonical
                    ? undefined
                    : run('git', ['ls-remote', canonical, 'refs/heads/gh-pages'], root, true).split(/\s+/)[0];
            if (retrievalUrl !== canonical && !/^[a-f0-9]{40}$/.test(expectedCommit ?? ''))
                throw new Error(`${component}: cannot verify upstream gh-pages commit`);
            run(
                'git',
                [
                    'clone',
                    '--depth',
                    '1',
                    '--single-branch',
                    '--branch',
                    'gh-pages',
                    '--no-tags',
                    retrievalUrl,
                    temporary,
                ],
                root
            );
            if (expectedCommit && run('git', ['-C', temporary, 'rev-parse', 'HEAD'], root, true) !== expectedCommit) {
                throw new Error(
                    `${component}: mirror commit does not match the independently verified GitHub commit ${expectedCommit}; retry the refresh.`
                );
            }
            run('git', ['-C', temporary, 'remote', 'set-url', 'origin', canonical], root);
            run('git', ['-C', temporary, 'config', 'rmt.retrievedFrom', retrievalUrl], root);
            // Inspect before replacing the previous usable cache.
            await inspectApplication(temporary, component);
            await rm(cache, { recursive: true, force: true });
            await rename(temporary, cache);
        } finally {
            await rm(temporary, { recursive: true, force: true });
        }
    }
    const { info, adapter } = await inspectApplication(cache, component);
    const commit = run('git', ['-C', cache, 'rev-parse', 'HEAD'], root, true);
    if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error(`${component}: invalid cached commit`);
    // Cache source snapshots remain immutable; accidental edits must not silently enter a bundle.
    if (run('git', ['-C', cache, 'status', '--porcelain', '--untracked-files=all'], root, true)) {
        throw new Error(
            `${component}@${info.version}: resource cache has local changes; regenerate with --refresh-assets.`
        );
    }
    const retrieval = spawnSync('git', ['-C', cache, 'config', '--get', 'rmt.retrievedFrom'], {
        cwd: root,
        encoding: 'utf8',
    });
    if (retrieval.error || ![0, 1].includes(retrieval.status))
        throw new Error(`${component}: cannot inspect cache provenance`);
    return {
        cache,
        component,
        version: info.version,
        commit,
        adapter,
        repository: `https://github.com/railmapgen/${component}.git`,
        retrievedFrom:
            retrieval.status === 0 ? retrieval.stdout.trim() : `https://github.com/railmapgen/${component}.git`,
    };
}

async function copyApplication(source, destination) {
    await cp(source, destination, { recursive: true, filter: filename => path.basename(filename) !== '.git' });
}

async function normalizeChildApplication(directory, component, version) {
    for await (const filename of files(directory)) {
        if (!['.css', '.js', '.html'].includes(path.extname(filename).toLowerCase())) continue;
        const source = await readFile(filename, 'utf8');
        const normalized = normalizeChildSafeArea(source, {
            component,
            version,
            filename: path.relative(directory, filename),
        });
        if (normalized !== source) await writeFile(filename, normalized);
    }
}

async function adaptApplication(directory, component, adapter) {
    for await (const filename of files(directory)) {
        if (path.extname(filename) === '.html') {
            const html = await readFile(filename, 'utf8');
            // Public bundles also contain verification tokens and HTML snippets,
            // which are resources rather than application documents.
            if (!/<html\b/i.test(html) && filename !== path.join(directory, 'index.html')) continue;
            try {
                await writeFile(filename, injectNativeLayout(html, component, adapter));
            } catch (error) {
                throw new Error(`${component}/${path.relative(directory, filename)}: ${error.message}`);
            }
        }
    }
    const infoPath = path.join(directory, 'info.json');
    const info = JSON.parse(await readFile(infoPath, 'utf8'));
    info.instance = 'AppStore';
    await writeFile(infoPath, JSON.stringify(info, null, 2) + '\n');
}

/**
 * Prepare a complete Apple resource tree. Generation may download; Xcode must use offline:true.
 * The old tree is retained until all downloads, adapter checks and the local host build succeed.
 */
export async function prepareResources({
    refreshAssets = false,
    buildHost = true,
    offline = false,
    root = repoRoot,
    lockTimeoutMs,
} = {}) {
    return withResourceLock(root, () => prepareResourcesLocked({ refreshAssets, buildHost, offline, root }), {
        timeoutMs: lockTimeoutMs,
    });
}

async function prepareResourcesLocked({ refreshAssets, buildHost, offline, root }) {
    const localApplications = await loadLocalApplications(root);
    const applications = [];
    for (const component of childApplications) {
        applications.push(
            localApplications[component] ?? (await loadCachedApplication(root, component, { refreshAssets, offline }))
        );
    }
    if (buildHost) run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], root);
    const host = path.join(root, 'dist');
    if (!(await exists(path.join(host, 'index.html'))))
        throw new Error('Local host build is missing. Run npm run build before preparing resources.');
    const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
    const stage = path.join(root, `tauri/.build/apple-ui-stage-${process.pid}`);
    const output = path.join(root, 'tauri/ui');
    const backup = `${output}.previous`;
    await rm(stage, { recursive: true, force: true });
    try {
        await copyApplication(host, stage);
        const hostInfo = JSON.parse(await readFile(path.join(root, 'info.json'), 'utf8'));
        Object.assign(hostInfo, { version: pkg.version, environment: 'PRD', instance: 'AppStore' });
        await writeFile(path.join(stage, 'info.json'), JSON.stringify(hostInfo, null, 2) + '\n');
        await adaptApplication(stage, 'host', { family: 'host', revision: adapterRevision });
        for (const application of applications) {
            const destination = path.join(stage, application.component);
            await copyApplication(application.cache, destination);
            await normalizeChildApplication(destination, application.component, application.version);
            await adaptApplication(destination, application.component, application.adapter);
        }
        await mkdir(path.join(stage, assetDirectory), { recursive: true });
        const hashes = {};
        for (const filename of ['edge-to-edge.css', 'edge-to-edge.js']) {
            const data = await readFile(path.join(repoRoot, 'scripts/apple', filename));
            await writeFile(path.join(stage, assetDirectory, filename), data);
            hashes[filename] = createHash('sha256').update(data).digest('hex');
        }
        const fontConfig = JSON.parse(await readFile(path.join(stage, 'fonts/config.json'), 'utf8'));
        if (fontConfig == null || typeof fontConfig !== 'object') throw new Error('Invalid host font manifest');
        const strings = value =>
            typeof value === 'string'
                ? [value]
                : value && typeof value === 'object'
                  ? Object.values(value).flatMap(strings)
                  : [];
        for (const source of strings(fontConfig)) {
            for (const match of source.matchAll(/url\(['"]?(\/[^)'"\s]+)['"]?\)/g)) {
                const relative = decodeURIComponent(match[1]).replace(/^\//, '').split(/[?#]/)[0];
                const filename = path.resolve(stage, relative);
                if (!filename.startsWith(stage + path.sep) || !(await exists(filename))) {
                    throw new Error(`Missing required font resource: ${relative}`);
                }
            }
        }
        // RMP publishes its native fonts directly, without a config.json manifest.
        if (!(await readdir(path.join(stage, 'rmp/fonts'))).some(filename => /\.(?:ttf|otf|woff2?)$/i.test(filename))) {
            throw new Error('Missing RMP native font resources');
        }
        const manifest = {
            appVersion: pkg.version,
            host: {
                repository: 'https://github.com/railmapgen/railmapgen.github.io.git',
                commit: run('git', ['rev-parse', 'HEAD'], root, true),
                dirty: Boolean(run('git', ['status', '--porcelain', '--untracked-files=normal'], root, true)),
            },
            adapterRevision,
            safeAreaNormalizationRevision: 1,
            adapterHashes: hashes,
            sources: applications.map(({ cache, ...application }) => application),
        };
        await writeFile(path.join(stage, assetDirectory, 'ui-sources.json'), JSON.stringify(manifest, null, 2) + '\n');
        await mkdir(path.join(root, 'tauri/.build/artifacts'), { recursive: true });
        await writeFile(
            path.join(root, 'tauri/.build/artifacts/ui-sources.json'),
            JSON.stringify(manifest, null, 2) + '\n'
        );
        await rm(backup, { recursive: true, force: true });
        const hadOutput = await exists(output);
        if (hadOutput) await rename(output, backup);
        try {
            await rename(stage, output);
        } catch (error) {
            if (hadOutput) await rename(backup, output);
            throw error;
        }
        await rm(backup, { recursive: true, force: true });
        console.log(
            `Prepared Apple offline resources: local host ${pkg.version}, ${applications.length} child applications (${Object.keys(localApplications).length} local).`
        );
        return manifest;
    } finally {
        await rm(stage, { recursive: true, force: true });
    }
}
