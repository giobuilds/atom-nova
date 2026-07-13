'use strict';

/**
 * keytar@4.x ships nan@2.14, which still uses ArrayBuffer::GetContents and
 * fails to compile against Electron 14+ (V8 GetBackingStore era).
 *
 * Prefer the repo-root `nan` (or a known-good nested copy ≥ 2.22) so
 * electron-rebuild / node-gyp can produce keytar.node.
 *
 * Idempotent. Usage: node script/lib/patch-keytar-nan.js [repoRoot]
 */

const fs = require('fs');
const path = require('path');

const MIN_MAJOR = 2;
const MIN_MINOR = 22;

const repoRoot = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const keytarRoot = path.join(repoRoot, 'node_modules', 'keytar');
const keytarNan = path.join(keytarRoot, 'node_modules', 'nan');
const rootNan = path.join(repoRoot, 'node_modules', 'nan');

function readVersion(pkgDir) {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8')
    );
    return pkg.version || '0.0.0';
  } catch (e) {
    return null;
  }
}

function versionOk(version) {
  if (!version) return false;
  const parts = String(version)
    .split('.')
    .map(n => parseInt(n, 10) || 0);
  const major = parts[0] || 0;
  const minor = parts[1] || 0;
  return major > MIN_MAJOR || (major === MIN_MAJOR && minor >= MIN_MINOR);
}

function copyDir(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  // Node 16+: fs.cpSync
  if (typeof fs.cpSync === 'function') {
    fs.cpSync(src, dest, { recursive: true });
  } else {
    // Minimal fallback
    const { execFileSync } = require('child_process');
    execFileSync('cp', ['-R', src, dest], { stdio: 'inherit' });
  }
}

if (!fs.existsSync(keytarRoot)) {
  console.log('patch-keytar-nan: keytar not installed; skip');
  process.exit(0);
}

const nestedVer = readVersion(keytarNan);
if (versionOk(nestedVer)) {
  console.log(`patch-keytar-nan: keytar nan@${nestedVer} already OK`);
  process.exit(0);
}

const rootVer = readVersion(rootNan);
if (!versionOk(rootVer)) {
  console.warn(
    `patch-keytar-nan: root nan@${rootVer || 'missing'} is too old; ` +
      `install nan@>=${MIN_MAJOR}.${MIN_MINOR} or rebuild may fail`
  );
  process.exit(0);
}

console.log(
  `patch-keytar-nan: replacing keytar nan@${nestedVer || 'missing'} with root nan@${rootVer}`
);
copyDir(rootNan, keytarNan);
console.log('patch-keytar-nan: done (rebuild keytar for Electron ABI next)');
