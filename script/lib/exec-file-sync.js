'use strict';

/**
 * execFileSync that works for npm.cmd / apm.cmd on Windows.
 *
 * Node's execFile cannot spawn .cmd/.bat without shell:true (EINVAL).
 * On POSIX, shell stays false for safer argv handling.
 */

const childProcess = require('child_process');

module.exports = function execFileSync(command, args, options) {
  options = Object.assign({}, options);
  if (process.platform === 'win32') {
    options.shell = true;
  }
  return childProcess.execFileSync(command, args || [], options);
};
