'use strict';

/**
 * V8 10.x (Electron 21/22) removed v8::Object::CreationContext(); the
 * replacement is GetCreationContext(), which returns a MaybeLocal.
 * Old natives (tree-sitter runtime, superstring) still use the removed form.
 *
 * Rewrites `->CreationContext()` to `->GetCreationContext().ToLocalChecked()`
 * in both node_modules copies and the vendored packages/ sources (the
 * vendored superstring overwrites node_modules during bootstrap).
 *
 * Idempotent. Usage: node script/lib/patch-v8-api.js [repoRoot]
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(
  process.argv[2] || path.join(__dirname, '..', '..')
);

const ROOTS = [
  'node_modules/tree-sitter/src',
  'node_modules/superstring/src',
  'packages/tree-sitter/src',
  'packages/superstring/src'
];

const BROKEN = '->CreationContext()';
const FIXED = '->GetCreationContext().ToLocalChecked()';

function* sourceFiles(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) yield* sourceFiles(p);
    else if (/\.(cc|cpp|h)$/.test(ent.name)) yield p;
  }
}

let patched = 0;
for (const root of ROOTS) {
  const abs = path.join(repoRoot, root);
  if (!fs.existsSync(abs)) continue;
  for (const file of sourceFiles(abs)) {
    const text = fs.readFileSync(file, 'utf8');
    if (!text.includes(BROKEN)) continue;
    fs.writeFileSync(file, text.split(BROKEN).join(FIXED));
    console.log(`patch-v8-api: patched ${path.relative(repoRoot, file)}`);
    patched++;
  }
}
console.log(`patch-v8-api: done (${patched} files)`);
