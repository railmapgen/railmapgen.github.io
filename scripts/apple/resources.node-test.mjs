import assert from 'node:assert/strict';
import test from 'node:test';
import {
    childApplications,
    detectAdapter,
    injectNativeLayout,
    normalizeChildSafeArea,
    prepareResources,
    repositoryUrl,
} from './resources.mjs';
import { mkdtemp, mkdir, readFile, rename, rm, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { withResourceLock } from './common.mjs';

test('optional public mirror preserves canonical source and rejects credential-bearing endpoints', () => {
    assert.equal(repositoryUrl('rmp', ''), 'https://github.com/railmapgen/rmp.git');
    assert.equal(
        repositoryUrl('rmp', 'https://ghfast.top/'),
        'https://ghfast.top/https://github.com/railmapgen/rmp.git'
    );
    assert.throws(() => repositoryUrl('rmp', 'http://example.invalid'), /public HTTPS URL/);
    assert.throws(() => repositoryUrl('rmp', 'https://secret@example.invalid'), /public HTTPS URL/);
    assert.throws(() => repositoryUrl('rmp', 'https://example.invalid?secret=token'), /public HTTPS URL/);
});

test('recognises actual modern and legacy semantic component APIs, not runtime references alone', () => {
    assert.equal(
        detectAdapter('rmg', '6.0.5', 'className:h(`rm-window`,a), header:"rm-window__header"').family,
        'mantine'
    );
    assert.equal(
        detectAdapter('rmp', '6.1.7', 'className:"rmg-window ".concat(a); header:"rmg-window__header "').family,
        'chakra'
    );
    assert.throws(
        () => detectAdapter('rmg', '99.0', 'runtime mentions rm-window__header but no component'),
        /rmg@99.0: unsupported/
    );
});

test('published child CSS and JavaScript style literals consume host-owned safe variables exactly once', () => {
    const location = { component: 'rmg', version: '6.0.5', filename: 'assets/editor.css' };
    const source =
        '.toolbar{padding:8px 12px;height:calc(40px + env(safe-area-inset-top));padding-bottom:max(env(safe-area-inset-bottom, 20px), 8px)}';
    const normalized = normalizeChildSafeArea(source, location);
    assert.equal(
        normalized,
        '.toolbar{padding:8px 12px;height:calc(40px + var(--rmt-safe-area-top,0px));padding-bottom:max(var(--rmt-safe-area-bottom,0px), 8px)}'
    );
    const js = 'const style={left:"env(safe-area-inset-left,0px)",right:`calc(4px + env(safe-area-inset-right))`};';
    assert.equal(
        normalizeChildSafeArea(js, { ...location, filename: 'assets/editor.js' }),
        'const style={left:"var(--rmt-safe-area-left,0px)",right:`calc(4px + var(--rmt-safe-area-right,0px))`};'
    );
    const html = '<button style="top:env( safe-area-inset-top , 0px );margin:12px">Save</button>';
    assert.equal(
        normalizeChildSafeArea(html, { ...location, filename: 'index.html' }),
        '<button style="top:var(--rmt-safe-area-top,0px);margin:12px">Save</button>'
    );
    assert.equal(normalizeChildSafeArea(normalized, location), normalized);
});

test('unsupported nested or malformed physical fallbacks fail with exact application and file context', () => {
    for (const literal of [
        'env(safe-area-inset-bottom, calc(1px + 2px))',
        'env(safe-area-inset-bottom, var(--padding, 0px))',
        'env(safe-area-inset-top, env(safe-area-inset-bottom))',
        'env(safe-area-inset-left,)',
        'env(safe-area-inset-top',
    ]) {
        assert.throws(
            () =>
                normalizeChildSafeArea(`padding:${literal};`, {
                    component: 'rmp',
                    version: '6.1.7',
                    filename: 'assets/tools.js',
                }),
            /rmp@6\.1\.7: assets\/tools\.js: unsupported physical safe-area/
        );
    }
});

test('injects Apple layout once while preserving existing HTML classes and enabling viewport cover', () => {
    const source =
        '<!doctype html><html lang="en" class="old"><head><meta name="viewport" content="width=device-width, maximum-scale=1, viewport-fit=contain"></head><body></body></html>';
    const adapted = injectNativeLayout(source, 'rmp', { family: 'chakra', revision: 1 });
    assert.match(adapted, /class="old rmt-native-edge-to-edge"/);
    assert.match(adapted, /data-rmt-component="rmp"/);
    assert.match(adapted, /viewport-fit=cover/);
    assert.match(adapted, /maximum-scale=1/);
    assert.doesNotMatch(adapted, /viewport-fit=contain/);
    assert.match(adapted, /href="\/_rmt-native\/edge-to-edge.css"/);
    assert.equal(injectNativeLayout(adapted, 'rmp', { family: 'chakra', revision: 1 }), adapted);
    assert.throws(() => injectNativeLayout('<body></body>', 'rmp', {}), /invalid HTML entry/);
});

test('offline cache failure keeps previously prepared resources untouched', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'rmt resource test '));
    try {
        await mkdir(path.join(directory, 'tauri/ui'), { recursive: true });
        await writeFile(path.join(directory, 'tauri/ui/index.html'), 'previous working bundle');
        await assert.rejects(
            prepareResources({ root: directory, buildHost: false, offline: true }),
            /rmg: offline resource cache is missing/
        );
        assert.equal(await readFile(path.join(directory, 'tauri/ui/index.html'), 'utf8'), 'previous working bundle');
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test('offline preparation overlays current host, adapts children and removes deleted resources', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'rmt offline bundle '));
    const html = '<html><head></head><body><div id="root"></div></body></html>';
    const put = async (filename, contents) => {
        await mkdir(path.dirname(filename), { recursive: true });
        await writeFile(filename, contents);
    };
    const git = (cwd, ...args) => {
        const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
        assert.equal(result.status, 0, result.stderr);
    };
    try {
        await put(path.join(directory, 'package.json'), JSON.stringify({ version: '1.2.3' }));
        const hostInfo = { component: 'railmapgen.github.io', instance: 'localhost' };
        await put(path.join(directory, 'info.json'), JSON.stringify(hostInfo));
        await put(path.join(directory, 'dist/index.html'), html);
        await put(path.join(directory, 'dist/fonts/config.json'), '{}');
        await put(path.join(directory, 'dist/current.txt'), 'fresh host');
        await put(path.join(directory, 'dist/host.css'), '.host{top:env(safe-area-inset-top)}');
        await put(path.join(directory, 'dist/google-verification.html'), 'google-site-verification: abc');
        git(directory, 'init', '--quiet');
        git(directory, 'add', 'package.json', 'info.json');
        git(
            directory,
            '-c',
            'user.name=Resource Test',
            '-c',
            'user.email=resource-test@example.invalid',
            'commit',
            '--quiet',
            '-m',
            'fixture'
        );
        for (const component of childApplications) {
            const cache = path.join(directory, 'tauri/.build/apple-cache/repos', component);
            await put(path.join(cache, 'index.html'), html);
            await put(
                path.join(cache, 'info.json'),
                JSON.stringify({ component, version: '1.0.0', instance: 'GitHub' })
            );
            await put(
                path.join(cache, 'assets/index.js'),
                'const view={className:h(`rm-window`,a),header:"rm-window__header",style:"env(safe-area-inset-top,0px)"};'
            );
            await put(
                path.join(cache, 'assets/index.css'),
                '.toolbar{padding:8px;height:calc(40px + env(safe-area-inset-top))}'
            );
            await put(path.join(cache, 'assets/index.css.map'), '{"sourcesContent":["env(safe-area-inset-top)"]}');
            await put(path.join(cache, 'assets/test.wasm'), Buffer.from('binary env(safe-area-inset-top)'));
            if (component === 'rmp') await put(path.join(cache, 'fonts/test.ttf'), 'font-fixture');
            git(cache, 'init', '--quiet');
            git(cache, 'add', '.');
            git(
                cache,
                '-c',
                'user.name=Resource Test',
                '-c',
                'user.email=resource-test@example.invalid',
                'commit',
                '--quiet',
                '-m',
                'fixture'
            );
        }
        const manifest = await prepareResources({ root: directory, buildHost: false, offline: true });
        assert.equal(manifest.appVersion, '1.2.3');
        assert.equal(manifest.sources.length, 8);
        assert.deepEqual(JSON.parse(await readFile(path.join(directory, 'tauri/ui/info.json'))), {
            ...hostInfo,
            version: '1.2.3',
            environment: 'PRD',
            instance: 'AppStore',
        });
        assert.deepEqual(JSON.parse(await readFile(path.join(directory, 'info.json'))), hostInfo);
        assert.equal(await readFile(path.join(directory, 'tauri/ui/current.txt'), 'utf8'), 'fresh host');
        assert.equal(
            await readFile(path.join(directory, 'tauri/ui/host.css'), 'utf8'),
            '.host{top:env(safe-area-inset-top)}'
        );
        assert.equal(
            await readFile(path.join(directory, 'tauri/ui/google-verification.html'), 'utf8'),
            'google-site-verification: abc'
        );
        for (const component of childApplications) {
            assert.match(
                await readFile(path.join(directory, 'tauri/ui', component, 'index.html'), 'utf8'),
                new RegExp(`data-rmt-component="${component}"`)
            );
            assert.equal(
                JSON.parse(await readFile(path.join(directory, 'tauri/ui', component, 'info.json'))).instance,
                'AppStore'
            );
            const cache = path.join(directory, 'tauri/.build/apple-cache/repos', component);
            assert.deepEqual(JSON.parse(await readFile(path.join(cache, 'info.json'))), {
                component,
                version: '1.0.0',
                instance: 'GitHub',
            });
            const cacheStatus = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], {
                cwd: cache,
                encoding: 'utf8',
            });
            assert.equal(cacheStatus.status, 0, cacheStatus.stderr);
            assert.equal(cacheStatus.stdout, '', `${component}: published source cache changed`);
            assert.match(
                await readFile(path.join(directory, 'tauri/ui', component, 'assets/index.css'), 'utf8'),
                /padding:8px;height:calc\(40px \+ var\(--rmt-safe-area-top,0px\)\)/
            );
            assert.match(
                await readFile(path.join(directory, 'tauri/ui', component, 'assets/index.js'), 'utf8'),
                /style:"var\(--rmt-safe-area-top,0px\)"/
            );
            assert.match(
                await readFile(
                    path.join(directory, 'tauri/.build/apple-cache/repos', component, 'assets/index.css'),
                    'utf8'
                ),
                /env\(safe-area-inset-top\)/
            );
            assert.equal(
                await readFile(path.join(directory, 'tauri/ui', component, 'assets/index.css.map'), 'utf8'),
                '{"sourcesContent":["env(safe-area-inset-top)"]}'
            );
            assert.equal(
                await readFile(path.join(directory, 'tauri/ui', component, 'assets/test.wasm'), 'utf8'),
                'binary env(safe-area-inset-top)'
            );
            await assert.rejects(access(path.join(directory, 'tauri/ui', component, '.git')));
        }
        await rm(path.join(directory, 'dist/current.txt'));
        await prepareResources({ root: directory, buildHost: false, offline: true });
        await assert.rejects(access(path.join(directory, 'tauri/ui/current.txt')));
        assert.equal(JSON.parse(await readFile(path.join(directory, 'tauri/ui/info.json'))).version, '1.2.3');

        const incompatible = path.join(directory, 'tauri/.build/apple-cache/repos/rmg');
        await put(
            path.join(incompatible, 'assets/index.css'),
            '.toolbar{padding-top:env(safe-area-inset-top, var(--fallback))}'
        );
        git(incompatible, 'add', 'assets/index.css');
        git(
            incompatible,
            '-c',
            'user.name=Resource Test',
            '-c',
            'user.email=resource-test@example.invalid',
            'commit',
            '--quiet',
            '-m',
            'incompatible upstream fixture'
        );
        await assert.rejects(
            prepareResources({ root: directory, buildHost: false, offline: true }),
            /rmg@1\.0\.0: assets\/index\.css: unsupported physical safe-area/
        );
        assert.match(
            await readFile(path.join(directory, 'tauri/ui/rmg/assets/index.css'), 'utf8'),
            /var\(--rmt-safe-area-top,0px\)/
        );
        await put(path.join(directory, 'tauri/.build/apple-cache/repos/rmg/extra.txt'), 'unverified edit');
        await assert.rejects(
            prepareResources({ root: directory, buildHost: false, offline: true }),
            /resource cache has local changes/
        );
        assert.equal(JSON.parse(await readFile(path.join(directory, 'tauri/ui/info.json'))).version, '1.2.3');
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

async function put(filename, contents) {
    await mkdir(path.dirname(filename), { recursive: true });
    await writeFile(filename, contents);
}

function git(cwd, ...args) {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
}

function start(filename, root, env = {}) {
    const child = spawn(process.execPath, [filename, root], {
        env: { ...process.env, ...env },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', data => {
        output += data;
    });
    child.stderr.on('data', data => {
        output += data;
    });
    const done = new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('exit', code => resolve({ code, output }));
    });
    return { child, done };
}

async function waitFor(filename) {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
        try {
            await access(filename);
            return;
        } catch {
            await delay(10);
        }
    }
    throw new Error(`Timed out waiting for fixture build: ${filename}`);
}

async function fixture() {
    const root = await mkdtemp(path.join(tmpdir(), 'rmt process resource lock '));
    await put(
        path.join(root, 'package.json'),
        JSON.stringify({ version: '1.2.3', scripts: { build: 'node fixture-build.cjs' } })
    );
    await put(path.join(root, 'info.json'), JSON.stringify({ component: 'railmapgen.github.io' }));
    await put(path.join(root, 'tauri/ui/index.html'), 'previous complete UI');
    await put(
        path.join(root, 'fixture-build.cjs'),
        `
const fs = require('node:fs');
const path = require('node:path');
const state = 'tauri/.build';
fs.mkdirSync(state,{recursive:true});
const active = path.join(state,'fixture-build-active');
fs.writeFileSync(active, String(process.pid), {flag:'wx'});
const countFile = path.join(state,'fixture-build-count');
const count = (fs.existsSync(countFile) ? Number(fs.readFileSync(countFile,'utf8')) : 0) + 1;
fs.writeFileSync(countFile,String(count));
fs.rmSync('dist',{recursive:true,force:true});
setTimeout(() => {
  fs.mkdirSync('dist/fonts',{recursive:true});
  fs.writeFileSync('dist/fonts/config.json','{}');
  fs.writeFileSync('dist/index.html','<html><head><title>build '+count+'</title></head><body><div id="root"></div></body></html>');
  fs.writeFileSync('dist/build-number.txt',String(count));
  fs.unlinkSync(active);
  if (process.env.RMT_TEST_BUILD_FAIL === '1') { console.error('intentional fixture build failure'); process.exit(1); }
}, 250);
`
    );
    await put(
        path.join(root, 'worker.mjs'),
        `import { prepareResources } from ${JSON.stringify(new URL('./resources.mjs', import.meta.url).href)};
prepareResources({root:process.argv[2],offline:true}).catch(error=>{console.error(error.message);process.exitCode=1});`
    );
    git(root, 'init', '--quiet');
    git(root, 'add', 'package.json', 'info.json');
    git(
        root,
        '-c',
        'user.name=Resource Test',
        '-c',
        'user.email=resource-test@example.invalid',
        'commit',
        '--quiet',
        '-m',
        'fixture'
    );
    for (const component of childApplications) {
        const cache = path.join(root, 'tauri/.build/apple-cache/repos', component);
        await put(path.join(cache, 'index.html'), '<html><head></head><body></body></html>');
        await put(path.join(cache, 'info.json'), JSON.stringify({ component, version: '1.0.0' }));
        await put(
            path.join(cache, 'assets/index.js'),
            'const view={className:h(`rm-window`,a),header:"rm-window__header"};'
        );
        if (component === 'rmp') await put(path.join(cache, 'fonts/test.ttf'), 'font');
        git(cache, 'init', '--quiet');
        git(cache, 'add', '.');
        git(
            cache,
            '-c',
            'user.name=Resource Test',
            '-c',
            'user.email=resource-test@example.invalid',
            'commit',
            '--quiet',
            '-m',
            'fixture'
        );
    }
    return root;
}

test('local RMP survives offline preparation, records private-path-free provenance and can be reverted', async () => {
    const root = await fixture();
    const directory = path.join(root, 'local rmp dist');
    const config = path.join(root, 'tauri/.build/apple-local-resources.json');
    const published = path.join(root, 'tauri/.build/apple-cache/repos/rmp');
    try {
        await put(path.join(root, 'dist/index.html'), '<html><head></head><body></body></html>');
        await put(path.join(root, 'dist/fonts/config.json'), '{}');
        await put(path.join(directory, 'index.html'), '<html><head></head><body>local RMP</body></html>');
        const localInfo = JSON.stringify({ component: 'rmp', version: '6.1.7-local', instance: 'localhost' });
        await put(path.join(directory, 'info.json'), localInfo);
        await put(
            path.join(directory, 'assets/local.js'),
            'const view={className:"rmg-window ",header:"rmg-window__header",top:"env(safe-area-inset-top)"};'
        );
        await put(path.join(directory, 'fonts/local.ttf'), 'local font');
        await put(config, JSON.stringify({ rmp: { directory, commit: 'a'.repeat(40), dirty: false } }));
        // A local build must work even when the published RMP cache is unavailable.
        await rename(published, published + '.saved');
        const first = await prepareResources({ root, buildHost: false, offline: true });
        const local = first.sources.find(application => application.component === 'rmp');
        assert.equal(local.kind, 'local');
        assert.equal(local.commit, 'a'.repeat(40));
        assert.equal(local.dirty, false);
        assert.match(local.contentSha256, /^[a-f0-9]{64}$/);
        assert.equal(Object.hasOwn(local, 'repository'), false);
        assert.equal(Object.hasOwn(local, 'retrievedFrom'), false);
        assert.equal(JSON.stringify(first).includes(directory), false);
        assert.equal(first.sources.filter(application => application.kind === 'local').length, 1);
        for (const component of ['', ...childApplications]) {
            assert.equal(
                JSON.parse(await readFile(path.join(root, 'tauri/ui', component, 'info.json'))).instance,
                'AppStore'
            );
        }
        assert.equal(await readFile(path.join(directory, 'info.json'), 'utf8'), localInfo);
        assert.match(await readFile(path.join(root, 'tauri/ui/rmp/index.html'), 'utf8'), /local RMP/);
        assert.match(await readFile(path.join(root, 'tauri/ui/rmp/index.html'), 'utf8'), /data-rmt-component="rmp"/);
        assert.match(
            await readFile(path.join(root, 'tauri/ui/rmp/assets/local.js'), 'utf8'),
            /var\(--rmt-safe-area-top,0px\)/
        );
        assert.match(await readFile(path.join(directory, 'assets/local.js'), 'utf8'), /env\(safe-area-inset-top\)/);
        const second = await prepareResources({ root, buildHost: false, offline: true });
        assert.equal(
            second.sources.find(application => application.component === 'rmp').contentSha256,
            local.contentSha256
        );
        await put(path.join(directory, 'fonts/local.ttf'), 'changed local font');
        const changed = await prepareResources({ root, buildHost: false, offline: true });
        assert.notEqual(
            changed.sources.find(application => application.component === 'rmp').contentSha256,
            local.contentSha256
        );

        await put(config, JSON.stringify({ rmp: { directory: path.join(root, 'missing build') } }));
        await assert.rejects(prepareResources({ root, buildHost: false, offline: true }), /ENOENT/);
        assert.match(await readFile(path.join(root, 'tauri/ui/rmp/index.html'), 'utf8'), /local RMP/);

        await rename(published + '.saved', published);
        await rm(config);
        const restored = await prepareResources({ root, buildHost: false, offline: true });
        const upstream = restored.sources.find(application => application.component === 'rmp');
        assert.equal(upstream.version, '1.0.0');
        assert.equal(upstream.repository, 'https://github.com/railmapgen/rmp.git');
        assert.equal(Object.hasOwn(upstream, 'kind'), false);
        assert.equal(JSON.parse(await readFile(path.join(root, 'tauri/ui/rmp/info.json'))).instance, 'AppStore');
        await assert.rejects(access(path.join(root, 'tauri/ui/rmp/assets/local.js')));
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test('invalid local-resource configuration fails before replacing the previous bundle', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'rmt invalid local resources '));
    try {
        await put(path.join(root, 'tauri/ui/index.html'), 'previous complete UI');
        for (const invalid of [
            '{broken',
            'null',
            '[]',
            '{"rmg":{}}',
            '{"rmp":null}',
            '{"rmp":{"directory":"relative/dist"}}',
            JSON.stringify({ rmp: { directory: root, commit: 'not-a-commit' } }),
            JSON.stringify({ rmp: { directory: root, dirty: 'false' } }),
            JSON.stringify({ rmp: { directory: root, repository: 'pretend upstream' } }),
        ]) {
            await put(path.join(root, 'tauri/.build/apple-local-resources.json'), invalid);
            await assert.rejects(prepareResources({ root, buildHost: false, offline: true }), /Invalid/);
            assert.equal(await readFile(path.join(root, 'tauri/ui/index.html'), 'utf8'), 'previous complete UI');
        }
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test('two Xcode processes serialize the whole frontend build and publish complete resources', async () => {
    const root = await fixture();
    const children = [];
    try {
        const first = start(path.join(root, 'worker.mjs'), root);
        children.push(first);
        await waitFor(path.join(root, 'tauri/.build/fixture-build-active'));
        const second = start(path.join(root, 'worker.mjs'), root);
        children.push(second);
        const results = await Promise.all(children.map(child => child.done));
        for (const result of results) assert.equal(result.code, 0, result.output);
        assert.match(results[1].output, /Waiting for Apple resource preparation/);
        assert.equal(await readFile(path.join(root, 'tauri/ui/build-number.txt'), 'utf8'), '2');
        assert.match(await readFile(path.join(root, 'tauri/ui/index.html'), 'utf8'), /data-rmt-component="host"/);
        for (const component of childApplications) await access(path.join(root, 'tauri/ui', component, 'index.html'));
        await assert.rejects(access(path.join(root, 'tauri/.build/apple-resources.lock')));
    } finally {
        for (const item of children) if (item.child.exitCode === null) item.child.kill();
        await Promise.allSettled(children.map(child => child.done));
        await rm(root, { recursive: true, force: true });
    }
});

test('concurrent failed builds retain prior UI and release the lock for a later successful build', async () => {
    const root = await fixture();
    const children = [];
    try {
        const first = start(path.join(root, 'worker.mjs'), root, { RMT_TEST_BUILD_FAIL: '1' });
        children.push(first);
        await waitFor(path.join(root, 'tauri/.build/fixture-build-active'));
        const second = start(path.join(root, 'worker.mjs'), root, { RMT_TEST_BUILD_FAIL: '1' });
        children.push(second);
        const results = await Promise.all(children.map(child => child.done));
        for (const result of results) {
            assert.equal(result.code, 1, result.output);
            assert.match(result.output, /intentional fixture build failure/);
        }
        assert.equal(await readFile(path.join(root, 'tauri/ui/index.html'), 'utf8'), 'previous complete UI');
        await assert.rejects(access(path.join(root, 'tauri/.build/apple-resources.lock')));
        const recovery = start(path.join(root, 'worker.mjs'), root);
        children.push(recovery);
        const result = await recovery.done;
        assert.equal(result.code, 0, result.output);
        assert.equal(await readFile(path.join(root, 'tauri/ui/build-number.txt'), 'utf8'), '3');
    } finally {
        for (const item of children) if (item.child.exitCode === null) item.child.kill();
        await Promise.allSettled(children.map(child => child.done));
        await rm(root, { recursive: true, force: true });
    }
});

test('a live owner times out with an actionable message, while a dead owner is reclaimed', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'rmt stale resource lock '));
    try {
        await withResourceLock(root, async () => {
            await assert.rejects(
                withResourceLock(root, () => {}, { timeoutMs: 30, pollMs: 5 }),
                error => {
                    assert.match(error.message, new RegExp(`owner PID ${process.pid}`));
                    assert.match(error.message, /Wait for it to finish and retry/);
                    return true;
                }
            );
        });
        const worker = path.join(root, 'abandoned.mjs');
        await put(
            worker,
            `import {withResourceLock} from ${JSON.stringify(new URL('./common.mjs', import.meta.url).href)}; await withResourceLock(process.argv[2],()=>{process.exit(0)});`
        );
        const abandoned = await start(worker, root).done;
        assert.equal(abandoned.code, 0, abandoned.output);
        await access(path.join(root, 'tauri/.build/apple-resources.lock/owner.json'));
        assert.equal(await withResourceLock(root, () => 'reclaimed'), 'reclaimed');
        await assert.rejects(access(path.join(root, 'tauri/.build/apple-resources.lock')));
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});
