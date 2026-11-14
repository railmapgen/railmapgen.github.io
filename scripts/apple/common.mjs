import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdir, open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

export const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
export const tauriRoot = path.join(repoRoot, 'tauri');
export const appleRoot = path.join(tauriRoot, 'gen/apple');
export const buildRoot = path.join(tauriRoot, '.build/xcode');
export const workspace = path.join(tauriRoot, 'gen/xcode/RailMapToolkit.xcworkspace');
export const cli = path.join(repoRoot, 'node_modules/@tauri-apps/cli/tauri.js');
export const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
export function writeJson(file, value) {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
export function run(command, args = [], options = {}) {
    const result = spawnSync(command, args, { cwd: repoRoot, stdio: 'inherit', ...options });
    if (result.error) throw new Error(`Cannot run ${command}: ${result.error.message}`);
    if (result.status !== 0)
        throw new Error(
            `${command} failed (${result.status ?? result.signal}).${typeof result.stderr === 'string' && result.stderr.trim() ? `\n${result.stderr.trim()}` : ''}`
        );
    return typeof result.stdout === 'string' ? result.stdout.trim() : '';
}
export const capture = (command, args = [], options = {}) =>
    run(command, args, { stdio: 'pipe', encoding: 'utf8', ...options });
export const shellQuote = value => "'" + String(value).replaceAll("'", "'\\''") + "'";
export const xmlEscape = value =>
    String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function configuration(value) {
    if (value?.toLowerCase() === 'debug') return 'Debug';
    if (value?.toLowerCase() === 'release') return 'Release';
    throw new Error(`Unsupported Xcode configuration: ${value}. Choose Debug or Release.`);
}
export function appleChannel(value = 'stable') {
    const channel = typeof value === 'string' ? value.trim().toLowerCase() : undefined;
    if (channel === 'stable' || channel === 'testflight') return channel;
    throw new Error(`Unsupported Apple channel: ${value}. Choose stable or TestFlight.`);
}
export function appleBuildNumber(value = '1') {
    if (typeof value !== 'string' || value.trim() !== value || !/^(0|[1-9]\d*)(\.(0|[1-9]\d*)){0,2}$/.test(value))
        throw new Error(
            'Choose an Apple build number with one to three integers, such as 4 or 84.1, without leading zeros.'
        );
    return value;
}

export function resolveAppleBuildNumber(value, environment = {}) {
    return appleBuildNumber(value ?? environment.RMT_APPLE_BUILD_NUMBER);
}
export function iosTriple(platform, arch) {
    const triples = {
        'iphoneos/arm64': 'aarch64-apple-ios',
        'iphonesimulator/arm64': 'aarch64-apple-ios-sim',
        'iphonesimulator/x86_64': 'x86_64-apple-ios',
    };
    const triple = triples[`${platform}/${arch}`];
    if (!triple) throw new Error(`Unsupported iOS SDK/architecture: ${platform}/${arch}.`);
    return triple;
}
export function hostTriple(arch = process.arch) {
    if (['arm64', 'aarch64'].includes(arch)) return 'aarch64-apple-darwin';
    if (['x64', 'x86_64'].includes(arch)) return 'x86_64-apple-darwin';
    throw new Error(`Unsupported macOS architecture: ${arch}.`);
}

const defaultTimeout = 120_000;
const incompleteOwnerGrace = 30_000;

function isAlive(pid) {
    if (!Number.isSafeInteger(pid) || pid <= 0) return false;
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        if (error.code === 'EPERM') return true;
        if (error.code === 'ESRCH') return false;
        throw error;
    }
}

async function readOwner(filename) {
    try {
        return JSON.parse(await readFile(filename, 'utf8'));
    } catch (error) {
        if (error.code === 'ENOENT' || error instanceof SyntaxError) return undefined;
        throw error;
    }
}

async function sameDirectory(directory, identity) {
    try {
        const current = await stat(directory);
        return current.dev === identity.dev && current.ino === identity.ino;
    } catch (error) {
        if (error.code === 'ENOENT') return false;
        throw error;
    }
}

async function reclaimStaleLock(directory, identity, owner) {
    // Reclaimers elect one winner inside the stale directory. Rechecking its
    // inode and owner after election prevents a delayed waiter from moving a
    // replacement lock already acquired by another process.
    const claimPath = path.join(directory, 'reclaim.json');
    let claim;
    try {
        claim = await open(claimPath, 'wx');
    } catch (error) {
        if (error.code === 'ENOENT') return;
        if (error.code !== 'EEXIST') throw error;
        const reclaimer = await readOwner(claimPath);
        let stale = reclaimer && !isAlive(reclaimer.pid);
        if (!reclaimer) {
            try {
                stale = Date.now() - (await stat(claimPath)).mtimeMs > incompleteOwnerGrace;
            } catch (statError) {
                if (statError.code !== 'ENOENT') throw statError;
            }
        }
        if (stale && (await sameDirectory(directory, identity))) await rm(claimPath, { force: true });
        return;
    }
    try {
        await claim.writeFile(JSON.stringify({ pid: process.pid, token: randomUUID() }));
        await claim.close();
        claim = undefined;
        if (!(await sameDirectory(directory, identity))) return;
        const currentOwner = await readOwner(path.join(directory, 'owner.json'));
        if (currentOwner?.token !== owner?.token || (currentOwner && isAlive(currentOwner.pid))) return;
        const quarantine = `${directory}.stale-${randomUUID()}`;
        try {
            await rename(directory, quarantine);
        } catch (error) {
            if (error.code === 'ENOENT') return;
            throw error;
        }
        await rm(quarantine, { recursive: true, force: true });
    } finally {
        await claim?.close();
        if (await sameDirectory(directory, identity)) await rm(claimPath, { force: true });
    }
}

/** Serialize downloads, frontend builds and resource swaps across Xcode processes. */
export async function withResourceLock(root, callback, { timeoutMs = defaultTimeout, pollMs = 100 } = {}) {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Resource lock timeout must be positive.');
    const directory = path.join(root, 'tauri/.build/apple-resources.lock');
    await mkdir(path.dirname(directory), { recursive: true });
    const owner = { pid: process.pid, token: randomUUID(), startedAt: new Date().toISOString() };
    const deadline = Date.now() + timeoutMs;
    let lastOwner;
    let identity;
    let announced = false;
    for (;;) {
        try {
            await mkdir(directory);
            identity = await stat(directory);
            try {
                await writeFile(path.join(directory, 'owner.json'), JSON.stringify(owner) + '\n', { flag: 'wx' });
            } catch (error) {
                await rm(directory, { recursive: true, force: true });
                throw error;
            }
            break;
        } catch (error) {
            if (error.code !== 'EEXIST') throw error;
        }
        let existing;
        try {
            existing = await stat(directory);
        } catch (error) {
            if (error.code === 'ENOENT') continue;
            throw error;
        }
        lastOwner = await readOwner(path.join(directory, 'owner.json'));
        if (
            (lastOwner && !isAlive(lastOwner.pid)) ||
            (!lastOwner && Date.now() - existing.mtimeMs > incompleteOwnerGrace)
        ) {
            await reclaimStaleLock(directory, existing, lastOwner);
            if (!(await sameDirectory(directory, existing))) continue;
        }
        if (Date.now() >= deadline) {
            throw new Error(
                `Timed out waiting for Apple resource preparation${lastOwner?.pid ? ` (owner PID ${lastOwner.pid})` : ''}. Another Xcode build or apple:generate is using this checkout. Wait for it to finish and retry; lock: ${directory}`
            );
        }
        if (!announced) {
            console.log(`Waiting for Apple resource preparation${lastOwner?.pid ? ` (PID ${lastOwner.pid})` : ''}...`);
            announced = true;
        }
        await delay(Math.min(pollMs, Math.max(1, deadline - Date.now())));
    }
    try {
        return await callback();
    } finally {
        if (await sameDirectory(directory, identity)) {
            const currentOwner = await readOwner(path.join(directory, 'owner.json'));
            if (currentOwner?.token === owner.token) await rm(directory, { recursive: true, force: true });
        }
    }
}
