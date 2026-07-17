#!/usr/bin/env node
'use strict';

/**
 * Launch smoke test for the packaged app.
 *
 * Boots the packaged AtomNova with a throwaway ATOM_HOME, attaches over the
 * Chrome DevTools Protocol, and asserts inside the *isolated world* (with
 * contextIsolation, `atom` lives in the preload context — main-world evals
 * silently see nothing):
 *
 *   1. the workspace window loads and packages activate,
 *   2. zero fatal/error notifications during startup,
 *   3. probe files open with the right contents,
 *   4. native tree-sitter grammars resolve (TypeScript, CSS) — this exercises
 *      the natives most likely to break on an Electron/V8 bump.
 *
 * Usage: node script/ci/smoke-test.js [path-to-app-bundle]
 * Exits 0 on success, 1 on assertion failure, 2 on timeout/infrastructure.
 */

const childProcess = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const WebSocket = require('ws');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PORT = 9451;
const STARTUP_TIMEOUT_MS = 120 * 1000;
const MIN_ACTIVE_PACKAGES = 50;

function findAppBinary(appArg) {
  if (process.platform === 'darwin') {
    let bundle = appArg;
    if (!bundle) {
      const outDir = path.join(REPO_ROOT, 'out');
      const names = fs.readdirSync(outDir).filter(name => name.endsWith('.app'));
      // Prefer Chevron.app if both exist during rebrand transitions
      const preferred =
        names.find(n => /^Chevron/i.test(n)) ||
        names.find(n => /^Atom/i.test(n)) ||
        names[0];
      bundle = preferred ? path.join(outDir, preferred) : null;
    }
    if (!bundle) throw new Error('no .app bundle found in out/');
    const macOSDir = path.join(bundle, 'Contents', 'MacOS');
    const binary = fs
      .readdirSync(macOSDir)
      .map(name => path.join(macOSDir, name))[0];
    return binary;
  }
  // Linux: electron-packager dir e.g. out/Chevron-linux-x64/chevron
  let appDir = appArg;
  if (!appDir) {
    const outDir = path.join(REPO_ROOT, 'out');
    if (!fs.existsSync(outDir)) {
      throw new Error('out/ does not exist; build the app first');
    }
    const candidates = fs
      .readdirSync(outDir)
      .map(name => path.join(outDir, name))
      .filter(p => {
        try {
          return fs.statSync(p).isDirectory();
        } catch (error) {
          return false;
        }
      })
      .filter(p => {
        const base = path.basename(p);
        // Prefer packager layout; also accept legacy atom-<ver>-<arch> dirs.
        return (
          base.includes('-linux-') ||
          /^(Chevron|Atom|chevron|atom)([-_]|$)/i.test(base)
        );
      });
    // Prefer product-named dirs (Chevron-linux-*) over legacy Atom-*
    candidates.sort((a, b) => {
      const score = p => {
        const base = path.basename(p);
        if (/^Chevron-linux-/i.test(base)) return 0;
        if (/-linux-/i.test(base) && /Chevron/i.test(base)) return 1;
        if (/-linux-/i.test(base)) return 2;
        if (/^chevron/i.test(base)) return 3;
        if (/^atom/i.test(base)) return 4;
        return 5;
      };
      return score(a) - score(b);
    });
    appDir = candidates[0];
  }
  if (!appDir) throw new Error('no packaged Linux app directory found in out/');
  const preferredNames = [
    'chevron',
    'chevron-beta',
    'chevron-nightly',
    'chevron-dev',
    'atom',
    'Chevron',
    'Atom'
  ];
  for (const name of preferredNames) {
    const candidate = path.join(appDir, name);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch (error) {
      /* try next */
    }
  }
  // Last resort: any executable that is not a helper/script noise
  const skip = new Set([
    'chrome_crashpad_handler',
    'chrome-sandbox',
    'resources'
  ]);
  const binary = fs
    .readdirSync(appDir)
    .filter(name => !skip.has(name))
    .map(name => path.join(appDir, name))
    .find(candidate => {
      try {
        fs.accessSync(candidate, fs.constants.X_OK);
        return fs.statSync(candidate).isFile();
      } catch (error) {
        return false;
      }
    });
  if (!binary) {
    throw new Error(`no executable found in ${appDir}`);
  }
  return binary;
}

function jsonList() {
  return new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port: PORT, path: '/json/list' }, res => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', reject);
  });
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// The state we assert on, evaluated inside the app. Returns 'pending' until
// the workspace and all three probe editors are ready.
const PROBE_EXPR = `(function() {
  if (typeof atom === 'undefined' || !atom.workspace) return 'pending';
  const editors = atom.workspace.getTextEditors();
  if (editors.length < 3) return 'pending';
  const byExt = ext =>
    editors.find(e => (e.getPath() || '').endsWith(ext));
  if (!byExt('.txt') || !byExt('.ts') || !byExt('.css')) return 'pending';
  return JSON.stringify({
    packagesActive: atom.packages.getActivePackages().length,
    notifications: atom.notifications
      .getNotifications()
      .filter(n => ['error', 'fatal'].includes(n.getType()))
      .map(n => n.getType() + ': ' + n.getMessage()),
    txtText: byExt('.txt').getText(),
    tsGrammar: byExt('.ts').getGrammar() && byExt('.ts').getGrammar().name,
    cssGrammar: byExt('.css').getGrammar() && byExt('.css').getGrammar().name,
    electron: process.versions.electron
  });
})()`;

async function probeWindow() {
  const targets = await jsonList();
  const page = targets.find(
    target => target.type === 'page' && /index\.html/.test(target.url)
  );
  if (!page) return 'pending';

  const ws = new WebSocket(page.webSocketDebuggerUrl, {
    maxPayload: 256 * 1024 * 1024
  });
  try {
    await new Promise((resolve, reject) => {
      ws.once('open', resolve);
      ws.once('error', reject);
    });

    let messageId = 0;
    const pending = new Map();
    const contexts = [];
    ws.on('message', raw => {
      const message = JSON.parse(raw);
      if (message.id && pending.has(message.id)) {
        pending.get(message.id)(message.result);
        pending.delete(message.id);
      } else if (message.method === 'Runtime.executionContextCreated') {
        contexts.push(message.params.context.id);
      }
    });
    const call = (method, params = {}) =>
      new Promise(resolve => {
        const id = ++messageId;
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });

    await call('Runtime.enable');
    await delay(500); // let executionContextCreated events arrive

    for (const contextId of contexts) {
      const result = await call('Runtime.evaluate', {
        expression: PROBE_EXPR,
        returnByValue: true,
        contextId
      });
      const value = result && result.result && result.result.value;
      if (value && value !== 'pending') return JSON.parse(value);
    }
    return 'pending';
  } finally {
    ws.close();
  }
}

async function main() {
  const binary = findAppBinary(process.argv[2]);
  console.log(`smoke-test: launching ${binary}`);

  const atomHome = fs.mkdtempSync(path.join(os.tmpdir(), 'atomnova-smoke-'));
  // Pre-create electronUserData so Chromium state is isolated too
  fs.mkdirSync(path.join(atomHome, 'electronUserData'), { recursive: true });

  const probeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atomnova-probes-'));
  const probes = {
    txt: path.join(probeDir, 'probe.txt'),
    ts: path.join(probeDir, 'probe.ts'),
    css: path.join(probeDir, 'probe.css')
  };
  fs.writeFileSync(probes.txt, 'smoke test probe\n');
  fs.writeFileSync(probes.ts, 'const n: number = 1;\n');
  fs.writeFileSync(probes.css, 'body { color: red; }\n');

  const app = childProcess.spawn(
    binary,
    [
      `--remote-debugging-port=${PORT}`,
      '--user-data-dir=' + path.join(atomHome, 'electronUserData'),
      probes.txt,
      probes.ts,
      probes.css
    ],
    {
      env: Object.assign({}, process.env, { ATOM_HOME: atomHome }),
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
  let appOutput = '';
  app.stdout.on('data', chunk => (appOutput += chunk));
  app.stderr.on('data', chunk => (appOutput += chunk));
  let appExited = false;
  app.on('exit', () => (appExited = true));

  const shutdown = () => {
    try {
      if (!appExited) app.kill('SIGKILL');
    } catch (error) {
      /* already gone */
    }
  };

  try {
    const deadline = Date.now() + STARTUP_TIMEOUT_MS;
    let state = 'pending';
    while (Date.now() < deadline) {
      if (appExited) {
        console.error('smoke-test: app exited during startup');
        console.error(appOutput.slice(-4000));
        process.exit(1);
      }
      try {
        state = await probeWindow();
      } catch (error) {
        state = 'pending';
      }
      if (state !== 'pending') break;
      await delay(2000);
    }

    if (state === 'pending') {
      console.error('smoke-test: TIMEOUT waiting for workspace');
      console.error(appOutput.slice(-4000));
      process.exit(2);
    }

    console.log('smoke-test: state', JSON.stringify(state, null, 2));

    const failures = [];
    if (state.notifications.length > 0) {
      failures.push(`error notifications: ${state.notifications.join('; ')}`);
    }
    if (state.packagesActive < MIN_ACTIVE_PACKAGES) {
      failures.push(
        `only ${state.packagesActive} packages active (< ${MIN_ACTIVE_PACKAGES})`
      );
    }
    if (state.txtText !== 'smoke test probe\n') {
      failures.push(`probe.txt contents wrong: ${JSON.stringify(state.txtText)}`);
    }
    if (state.tsGrammar !== 'TypeScript') {
      failures.push(`probe.ts grammar: ${state.tsGrammar} (expected TypeScript)`);
    }
    if (state.cssGrammar !== 'CSS') {
      failures.push(`probe.css grammar: ${state.cssGrammar} (expected CSS)`);
    }

    if (failures.length > 0) {
      console.error('smoke-test: FAILED');
      for (const failure of failures) console.error(`  - ${failure}`);
      process.exit(1);
    }
    console.log(
      `smoke-test: PASSED on Electron ${state.electron} ` +
        `(${state.packagesActive} packages active)`
    );
    process.exit(0);
  } finally {
    shutdown();
  }
}

main().catch(error => {
  console.error('smoke-test: infrastructure error:', error.stack || error);
  process.exit(2);
});
