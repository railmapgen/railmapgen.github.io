import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { generateManifest, validateManifest } from './generate-tauri-latest-json.mjs';

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tauri-updater-'));
  const signatures = path.join(directory, 'signatures');
  fs.mkdirSync(signatures);
  const assets = [
    'Rail.Map.Toolkit_26.10.22_aarch64.app.tar.gz',
    'Rail Map Toolkit_26.10.22_x64.app.tar.gz',
    'Rail.Map.Toolkit_26.10.22_x64-setup.exe',
    'Rail.Map.Toolkit_26.10.22_arm64-setup.exe',
    'Rail.Map.Toolkit_26.10.22_amd64.AppImage',
  ];
  for (const [index, asset] of assets.entries()) fs.writeFileSync(path.join(signatures, `${asset}.sig`), `signature-${index}\n`);
  const assetsFile = path.join(directory, 'assets.txt');
  fs.writeFileSync(assetsFile, `${assets.join('\n')}\n`);
  const notesFile = path.join(directory, 'notes.md');
  fs.writeFileSync(notesFile, 'Release notes');
  return { directory, signatures, assetsFile, notesFile, assets };
}

test('generates all five platforms with ghfast URLs and trimmed signatures', () => {
  const files = fixture();
  const output = path.join(files.directory, 'latest.json');
  const manifest = generateManifest({
    repo: 'railmapgen/railmapgen.github.io',
    tag: 'tauri-20261022',
    version: '26.10.22',
    'sig-dir': files.signatures,
    'assets-file': files.assetsFile,
    'notes-file': files.notesFile,
    output,
  });

  assert.deepEqual(Object.keys(manifest.platforms).sort(), [
    'darwin-aarch64', 'darwin-x86_64', 'linux-x86_64', 'windows-aarch64', 'windows-x86_64',
  ]);
  assert.equal(manifest.platforms['darwin-aarch64'].signature, 'signature-0');
  assert.equal(manifest.platforms['darwin-x86_64'].url, 'https://ghfast.top/https://github.com/railmapgen/railmapgen.github.io/releases/download/tauri-20261022/Rail%20Map%20Toolkit_26.10.22_x64.app.tar.gz');
  assert.match(manifest.platforms['windows-x86_64'].url, /x64-setup\.exe$/);
  assert.doesNotMatch(JSON.stringify(manifest), /api\.github\.com/);
});

test('rejects a manifest missing a platform', () => {
  assert.throws(() => validateManifest({
    version: '26.10.22',
    notes: '',
    pub_date: new Date().toISOString(),
    platforms: {},
  }), /exactly the five required platforms/);
});

test('rejects API URLs during verification', () => {
  assert.throws(() => validateManifest({
    version: '26.10.22',
    notes: '',
    pub_date: new Date().toISOString(),
    platforms: Object.fromEntries([
      ['darwin-aarch64', 'a'], ['darwin-x86_64', 'b'], ['windows-x86_64', 'c'], ['windows-aarch64', 'd'], ['linux-x86_64', 'e'],
    ].map(([platform, signature]) => [platform, { signature, url: 'https://api.github.com/bad' }])),
  }), /ghfast URL/);
});
