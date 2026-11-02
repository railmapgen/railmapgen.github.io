#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const REQUIRED_PLATFORMS = [
  'darwin-aarch64',
  'darwin-x86_64',
  'windows-x86_64',
  'windows-aarch64',
  'linux-x86_64',
];

const DOWNLOAD_MIRROR = 'https://gh.monlor.com/';

const USAGE = `Usage:
  node tauri/scripts/generate-tauri-latest-json.mjs --repo owner/repo --tag tag --version 1.2.3 \
    --sig-dir updater-sigs --assets-file release-assets.txt --notes-file release-notes.md --output latest.json
  node tauri/scripts/generate-tauri-latest-json.mjs --verify latest.json`;

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--verify') {
      args.verify = argv[++index];
    } else if (arg.startsWith('--')) {
      const value = argv[++index];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      args[arg.slice(2)] = value;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }
  return args;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertVersion(version) {
  assert(/^\d+\.\d+\.\d+$/.test(version), `Invalid SemVer version: ${version}`);
}

function normalizeAssetName(name) {
  return name.trim().toLowerCase().replace(/[ .]+/g, '_');
}

function platformForAsset(name) {
  const normalized = normalizeAssetName(name);
  if (/_aarch64_app_tar_gz$/.test(normalized)) return 'darwin-aarch64';
  if (/(?:^|_)x64_app_tar_gz$/.test(normalized)) return 'darwin-x86_64';
  if (/_x64-setup_exe$/.test(normalized)) return 'windows-x86_64';
  if (/_arm64-setup_exe$/.test(normalized)) return 'windows-aarch64';
  if (/_amd64_appimage$/.test(normalized)) return 'linux-x86_64';
  return undefined;
}

function readLines(filePath) {
  return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function isReleaseAssetUrl(value) {
  if (typeof value !== 'string' || value !== value.trim() || value.includes('\\')) return false;
  try {
    const url = new URL(value.startsWith(DOWNLOAD_MIRROR) ? value.slice(DOWNLOAD_MIRROR.length) : value);
    if (url.origin !== 'https://github.com' || url.username || url.password) return false;
    const parts = url.pathname.slice(1).split('/');
    return parts.length === 6 && parts.every(Boolean) && parts[2] === 'releases' && parts[3] === 'download';
  } catch {
    return false;
  }
}

function validateManifest(manifest) {
  assert(manifest && typeof manifest === 'object', 'Manifest must be an object');
  assertVersion(manifest.version);
  assert(typeof manifest.notes === 'string', 'Manifest notes must be a string');
  assert(typeof manifest.pub_date === 'string' && !Number.isNaN(Date.parse(manifest.pub_date)), 'Manifest pub_date must be an ISO date');
  assert(manifest.platforms && typeof manifest.platforms === 'object', 'Manifest platforms are required');
  const actualPlatforms = Object.keys(manifest.platforms);
  const missing = REQUIRED_PLATFORMS.filter((platform) => !actualPlatforms.includes(platform));
  const unexpected = actualPlatforms.filter((platform) => !REQUIRED_PLATFORMS.includes(platform));
  const details = [
    missing.length && `missing: ${missing.join(', ')}`,
    unexpected.length && `unexpected: ${unexpected.join(', ')}`,
  ].filter(Boolean).join('; ');
  assert(!missing.length && !unexpected.length, `Manifest must contain exactly the five required platforms (${details})`);
  for (const platform of REQUIRED_PLATFORMS) {
    const entry = manifest.platforms[platform];
    assert(entry && typeof entry.signature === 'string' && entry.signature.trim(), `Missing signature for ${platform}`);
    assert(isReleaseAssetUrl(entry.url), `Invalid updater download URL for ${platform}: expected a GitHub release asset URL, optionally prefixed with ${DOWNLOAD_MIRROR}`);
  }
  return manifest;
}

function verifyManifest(filePath) {
  const manifest = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  validateManifest(manifest);
  return manifest;
}

function generateManifest(options) {
  for (const required of ['repo', 'tag', 'version', 'sig-dir', 'assets-file', 'notes-file', 'output']) {
    assert(options[required], `Missing required option --${required}`);
  }
  assertVersion(options.version);

  const assets = readLines(options['assets-file']);
  const assetByNormalizedName = new Map(assets.map((asset) => [normalizeAssetName(asset), asset]));
  const platforms = {};
  const signatureFiles = fs.readdirSync(options['sig-dir']).filter((name) => name.endsWith('.sig'));

  for (const signatureFile of signatureFiles) {
    const signedAssetName = signatureFile.slice(0, -'.sig'.length);
    const assetName = assetByNormalizedName.get(normalizeAssetName(signedAssetName));
    if (!assetName) continue;
    const platform = platformForAsset(assetName);
    if (!platform) continue;
    assert(!platforms[platform], `Duplicate updater asset for ${platform}`);
    const signature = fs.readFileSync(path.join(options['sig-dir'], signatureFile), 'utf8').trim();
    assert(signature, `Empty signature for ${platform}`);
    const encodedAssetName = encodeURIComponent(assetName);
    platforms[platform] = {
      signature,
      url: `${DOWNLOAD_MIRROR}https://github.com/${options.repo}/releases/download/${encodeURIComponent(options.tag)}/${encodedAssetName}`,
    };
  }

  const manifest = {
    version: options.version,
    notes: fs.readFileSync(options['notes-file'], 'utf8'),
    pub_date: new Date().toISOString(),
    platforms,
  };
  try {
    validateManifest(manifest);
  } catch (error) {
    throw new Error([
      error.message,
      `Release assets: ${assets.join(', ') || '(none)'}`,
      `Downloaded signatures: ${signatureFiles.join(', ') || '(none)'}`,
    ].join('\n'));
  }
  fs.writeFileSync(options.output, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

function main(argv) {
  const options = parseArgs(argv);
  if (options.verify) {
    verifyManifest(options.verify);
    return;
  }
  generateManifest(options);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`${error.message}\n\n${USAGE}`);
    process.exitCode = 1;
  }
}

export { generateManifest, normalizeAssetName, platformForAsset, validateManifest, verifyManifest };
