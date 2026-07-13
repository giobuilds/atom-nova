// Electron 14+: remote is polyfilled onto electron in static/index.js.
module.exports = require('electron').remote;

const Grim = require('grim');
Grim.deprecate(
  'Use `require("electron").remote` instead of `require("remote")`'
);

// Ensure each package that requires this shim causes a deprecation warning
delete require.cache[__filename];
