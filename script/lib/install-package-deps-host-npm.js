'use strict';

/**
 * Host-npm install inside a package directory (build-time helper).
 * Replaces package-local `runApmInstall` for atomTranspilers prep.
 */

const CONFIG = require('../config');
const execFileSync = require('./exec-file-sync');

module.exports = function installPackageDepsHostNpm(
  packagePath,
  options
) {
  options = options || {};
  const ignoreScripts = options.ignoreScripts !== false;
  const args = ['--loglevel=error'];
  if (ignoreScripts) args.push('--ignore-scripts');
  args.push('--legacy-peer-deps');
  args.push('install');

  execFileSync(CONFIG.getNpmBinPath(false), args, {
    env: process.env,
    cwd: packagePath,
    stdio: options.stdio || 'inherit'
  });
};
