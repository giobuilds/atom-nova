'use strict';

/**
 * Install dependencies in a package directory using **host npm**.
 *
 * Historically this ran classic `apm install` (Node 12). After cpm Phase 0–4,
 * monorepo and test tooling use host npm; user/in-app installs use **cpm**.
 * The module name is kept so older script call sites keep working.
 *
 * @param {string} packagePath
 * @param {boolean} [ci] - if true and packagePath is repo root, prefer `npm ci`
 * @param {string|string[]} [stdioOptions]
 * @param {{ignoreScripts?: boolean}} [options]
 */

const path = require('path');

const CONFIG = require('../config');
const installAppDependencies = require('./install-app-dependencies');
const installPackageDepsHostNpm = require('./install-package-deps-host-npm');

module.exports = function runApmInstall(packagePath, ci, stdioOptions, options) {
  options = options || {};
  const ignoreScripts = options.ignoreScripts !== false;
  const resolved = path.resolve(packagePath);
  const repoRoot = path.resolve(CONFIG.repositoryRootPath);

  if (resolved === repoRoot) {
    installAppDependencies(Boolean(ci), { ignoreScripts });
    return;
  }

  installPackageDepsHostNpm(packagePath, {
    ignoreScripts,
    stdio: stdioOptions || 'inherit'
  });
};
