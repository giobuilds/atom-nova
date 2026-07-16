'use strict';

/**
 * Preload entry for contextIsolation (Phase I / N3).
 *
 * Electron isolates the page world from Node when contextIsolation is true.
 * Atom (and packages) still need require/fs/natives, so the entire renderer
 * bootstrap runs here in the preload world — which has Node + Electron and
 * shares the same DOM as the page.
 *
 * Privilege map (do not expand casually):
 * - **Page world:** no Node, no electron, empty shell (static/index.html).
 * - **This preload world:** full Node + electron; boots Atom; loads packages.
 * - **Guest <webview>:** sandboxed, no Node, no this preload (see
 *   AtomWindow will-attach-webview).
 * - **GitHub worker BrowserWindows:** separate Node windows via remote-compat
 *   IPC (still a trusted exception; Phase N later).
 *
 * Natives that keep sandbox:false on the editor window: superstring,
 * pathwatcher, tree-sitter (+ grammars), oniguruma, keytar (packages), etc.
 * See docs/security-phase-n3.md.
 *
 * The page (index.html) intentionally loads no Node scripts.
 */

// Ensure electron.remote is the IPC compat layer before any package loads.
const electron = require('electron');
if (!electron.remote) {
  electron.remote = require('../src/remote-compat');
}

// Boot the historical renderer entry (sets window.onload → Atom).
require('./index.js');
