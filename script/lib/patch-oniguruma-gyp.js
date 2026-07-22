'use strict';

/**
 * GCC 14+ treats K&R-style int (*)() in oniguruma's vendored st.c as zero-arg
 * functions and fails the build. Force gnu89 + don't promote pointer warnings
 * to errors on Linux.
 *
 * Idempotent. Called from bootstrap-modern before native rebuilds.
 */

const fs = require('fs');
const path = require('path');

const LINUX_CFLAGS = `['OS=="linux"', {
          'cflags': [
            '-std=gnu89',
            '-w',
            '-Wno-error',
            '-Wno-error=incompatible-pointer-types',
            '-Wno-incompatible-pointer-types',
          ],
        }]`;

function patchFile(abs) {
  if (!fs.existsSync(abs)) return false;
  let text = fs.readFileSync(abs, 'utf8');
  if (text.includes('-std=gnu89')) return false;

  const old = `['OS=="linux"', {
          'cflags': [
            '-w',
          ],
        }]`;
  if (text.includes(old)) {
    text = text.replace(old, LINUX_CFLAGS);
    fs.writeFileSync(abs, text);
    return true;
  }
  if (text.includes('OS=="linux"')) return false;
  text = text.replace(
    /(\['OS=="win"', \{[\s\S]*?\}\],)/,
    `$1\n        ${LINUX_CFLAGS},`
  );
  fs.writeFileSync(abs, text);
  return true;
}

module.exports = function patchOnigurumaGyp(repoRoot) {
  const root = repoRoot || path.join(__dirname, '..', '..');
  const gyp = path.join(root, 'node_modules', 'oniguruma', 'binding.gyp');
  if (patchFile(gyp)) {
    console.log('patched: node_modules/oniguruma/binding.gyp (GCC 14 gnu89)');
  } else if (fs.existsSync(gyp)) {
    console.log('ok (already): node_modules/oniguruma/binding.gyp');
  } else {
    console.log('skip missing: node_modules/oniguruma/binding.gyp');
  }
};

if (require.main === module) {
  module.exports(process.argv[2]);
}
