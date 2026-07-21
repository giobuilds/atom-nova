const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CONFIG = require('../config');
const FINGERPRINT_PATH = path.join(
  CONFIG.repositoryRootPath,
  'node_modules',
  '.dependencies-fingerprint'
);

module.exports = {
  write: function() {
    const fingerprint = this.compute();
    fs.writeFileSync(FINGERPRINT_PATH, fingerprint);
    console.log(
      'Wrote Dependencies Fingerprint:',
      FINGERPRINT_PATH,
      fingerprint
    );
  },
  read: function() {
    return fs.existsSync(FINGERPRINT_PATH)
      ? fs.readFileSync(FINGERPRINT_PATH, 'utf8')
      : null;
  },
  isOutdated: function() {
    const fingerprint = this.read();
    return fingerprint ? fingerprint !== this.compute() : false;
  },
  compute: function() {
    // Electron minor + package-lock identity + host Node (Phase 0: host npm, not apm).
    const electronVersion = CONFIG.appMetadata.electronVersion.replace(
      /\.\d+$/,
      ''
    );
    const lockPath = path.join(CONFIG.repositoryRootPath, 'package-lock.json');
    let lockPart = 'nolock';
    if (fs.existsSync(lockPath)) {
      lockPart = crypto
        .createHash('sha1')
        .update(fs.readFileSync(lockPath))
        .digest('hex')
        .slice(0, 16);
    }
    const body =
      electronVersion +
      lockPart +
      process.platform +
      process.version +
      process.arch +
      'host-npm';
    return crypto
      .createHash('sha1')
      .update(body)
      .digest('hex');
  }
};
