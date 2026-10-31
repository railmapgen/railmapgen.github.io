import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { generateManifest, validateManifest } from './generate-tauri-latest-json.mjs';

function fixture(t, { includeMacUpdaters = true } = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tauri-updater-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const signatures = path.join(directory, 'signatures');
  fs.mkdirSync(signatures);
  const updaterAssets = [
    'Rail.Map.Toolkit_aarch64.app.tar.gz',
    'Rail.Map.Toolkit_x64.app.tar.gz',
    'Rail.Map.Toolkit_26.10.22_x64-setup.exe',
    'Rail.Map.Toolkit_26.10.22_arm64-setup.exe',
    'Rail.Map.Toolkit_26.10.22_amd64.AppImage',
  ].filter((asset) => includeMacUpdaters || !asset.endsWith('.app.tar.gz'));
  for (const [index, asset] of updaterAssets.entries()) fs.writeFileSync(path.join(signatures, `${asset}.sig`), `signature-${index}\n`);
  const assets = [
    ...updaterAssets.flatMap((asset) => [asset, `${asset}.sig`]),
    'Rail.Map.Toolkit_26.10.22_aarch64.dmg',
    'Rail.Map.Toolkit_26.10.22_x64.dmg',
  ];
  const assetsFile = path.join(directory, 'assets.txt');
  fs.writeFileSync(assetsFile, `${assets.join('\n')}\n`);
  const notesFile = path.join(directory, 'notes.md');
  fs.writeFileSync(notesFile, 'Release notes');
  return { directory, signatures, assetsFile, notesFile, assets };
}

function manifestOptions(files) {
  return {
    repo: 'railmapgen/railmapgen.github.io',
    tag: 'tauri-20261022',
    version: '26.10.22',
    'sig-dir': files.signatures,
    'assets-file': files.assetsFile,
    'notes-file': files.notesFile,
    output: path.join(files.directory, 'latest.json'),
  };
}

test('generates all five platforms from release asset names with monlor URLs and trimmed signatures', (t) => {
  const files = fixture(t);
  const options = manifestOptions(files);
  const manifest = generateManifest(options);

  assert.deepEqual(Object.keys(manifest.platforms).sort(), [
    'darwin-aarch64', 'darwin-x86_64', 'linux-x86_64', 'windows-aarch64', 'windows-x86_64',
  ]);
  assert.equal(manifest.platforms['darwin-aarch64'].signature, 'signature-0');
  assert.equal(manifest.platforms['darwin-x86_64'].url, 'https://gh.monlor.com/https://github.com/railmapgen/railmapgen.github.io/releases/download/tauri-20261022/Rail.Map.Toolkit_x64.app.tar.gz');
  assert.match(manifest.platforms['windows-x86_64'].url, /x64-setup\.exe$/);
  assert.doesNotMatch(JSON.stringify(manifest), /api\.github\.com/);
  assert.deepEqual(JSON.parse(fs.readFileSync(options.output, 'utf8')), manifest);
});

function assertMissingMacPlatforms(message) {
  const missing = message.match(/\bmissing:\s*([^);\n]+)/i)?.[1];
  assert.ok(missing, 'Error should list the missing updater platforms');
  assert.deepEqual(missing.split(',').map((platform) => platform.trim()).sort(), [
    'darwin-aarch64', 'darwin-x86_64',
  ]);
}

test('reports both missing macOS updater archives when the release contains only DMGs', (t) => {
  const options = manifestOptions(fixture(t, { includeMacUpdaters: false }));

  assert.throws(() => generateManifest(options), (error) => {
    assertMissingMacPlatforms(error.message);
    return true;
  });
  assert.equal(fs.existsSync(options.output), false);
});

test('CLI fails without writing a manifest when macOS updater archives are missing', (t) => {
  const options = manifestOptions(fixture(t, { includeMacUpdaters: false }));
  const script = fileURLToPath(new URL('./generate-tauri-latest-json.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [
    script,
    ...Object.entries(options).flatMap(([key, value]) => [`--${key}`, value]),
  ], { encoding: 'utf8', timeout: 5000 });

  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assertMissingMacPlatforms(result.stderr);
  assert.equal(fs.existsSync(options.output), false);
});

test('rejects a manifest missing a platform', () => {
  assert.throws(() => validateManifest({
    version: '26.10.22',
    notes: '',
    pub_date: new Date().toISOString(),
    platforms: {},
  }), /exactly the five required platforms/);
});

function manifestWithUrl(url) {
  return {
    version: '26.10.22',
    notes: '',
    pub_date: new Date().toISOString(),
    platforms: Object.fromEntries([
      ['darwin-aarch64', 'a'], ['darwin-x86_64', 'b'], ['windows-x86_64', 'c'], ['windows-aarch64', 'd'], ['linux-x86_64', 'e'],
    ].map(([platform, signature]) => [platform, { signature, url }])),
  };
}

test('accepts monlor, direct GitHub, and legacy ghfast release asset URLs', () => {
  const assetUrl = 'https://github.com/railmapgen/railmapgen.github.io/releases/download/tauri-20261031/Rail.Map.Toolkit_aarch64.app.tar.gz';
  for (const prefix of ['https://gh.monlor.com/', '', 'https://ghfast.top/']) {
    assert.doesNotThrow(() => validateManifest(manifestWithUrl(`${prefix}${assetUrl}`)));
  }
});

test('preserves encoded tags and filenames in generated monlor URLs', (t) => {
  const files = fixture(t);
  const originalAsset = 'Rail.Map.Toolkit_x64.app.tar.gz';
  const asset = 'Rail Map Toolkit + test_x64.app.tar.gz';
  fs.renameSync(path.join(files.signatures, `${originalAsset}.sig`), path.join(files.signatures, `${asset}.sig`));
  fs.writeFileSync(files.assetsFile, fs.readFileSync(files.assetsFile, 'utf8').replaceAll(originalAsset, asset));
  const manifest = generateManifest({ ...manifestOptions(files), tag: 'release/test build' });
  const expected = 'https://gh.monlor.com/https://github.com/railmapgen/railmapgen.github.io/releases/download/release%2Ftest%20build/Rail%20Map%20Toolkit%20%2B%20test_x64.app.tar.gz';
  assert.equal(manifest.platforms['darwin-x86_64'].url, expected);
});

test('rejects API, spoofed hosts, insecure URLs, credentials, and incomplete asset paths', () => {
  const path = '/railmapgen/railmapgen.github.io/releases/download/tag/app.tar.gz';
  const invalidUrls = [
    `https://api.github.com${path}`,
    `https://github.com.evil.example${path}`,
    `http://github.com${path}`,
    `https://user:password@github.com${path}`,
    `https://github.com:444${path}`,
    `https://gh.monlor.com.evil.example/https://github.com${path}`,
    `https://gh.monlor.com@evil.example/https://github.com${path}`,
    `http://gh.monlor.com/https://github.com${path}`,
    `https://gh.monlor.com/http://github.com${path}`,
    `https://gh.monlor.com/https://user@github.com${path}`,
    `https://gh.monlor.com/https://api.github.com${path}`,
    `https://ghfast.top/https://github.com.evil.example${path}`,
    'https://github.com/railmapgen/railmapgen.github.io/releases/latest',
    'https://github.com/railmapgen/releases/download/tag/app.tar.gz',
    'https://github.com/railmapgen/railmapgen.github.io/releases/download//app.tar.gz',
    'https://github.com/railmapgen/railmapgen.github.io/releases/download/tag/',
    'https://github.com/railmapgen/railmapgen.github.io/releases/download/tag',
    'https://github.com\\railmapgen/railmapgen.github.io/releases/download/tag/app.tar.gz',
    ` ${'https://github.com'}${path}`,
    'not a URL',
  ];
  for (const url of invalidUrls) {
    assert.throws(() => validateManifest(manifestWithUrl(url)), /Invalid updater download URL/, url);
  }
});
