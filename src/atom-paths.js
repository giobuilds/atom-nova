const fs = require('fs-plus');
const path = require('path');

const hasWriteAccess = dir => {
  const testFilePath = path.join(dir, 'write.test');
  try {
    fs.writeFileSync(testFilePath, new Date().toISOString(), { flag: 'w+' });
    fs.unlinkSync(testFilePath);
    return true;
  } catch (err) {
    return false;
  }
};

const getAppDirectory = () => {
  switch (process.platform) {
    case 'darwin':
      return process.execPath.substring(
        0,
        process.execPath.indexOf('.app') + 4
      );
    case 'linux':
    case 'win32':
      return path.join(process.execPath, '..');
  }
};

/**
 * Resolve the config home directory with dual-support:
 *   1. CHEVRON_HOME (explicit)
 *   2. ATOM_HOME (explicit, Atom ecosystem)
 *   3. Portable sibling .chevron / .atom next to the app (if writable)
 *   4. ~/.chevron if it already exists
 *   5. ~/.atom (default — preserve existing Atom / Chevron users)
 */
function resolveConfigHome(homePath) {
  if (process.env.CHEVRON_HOME) {
    return process.env.CHEVRON_HOME;
  }
  if (process.env.ATOM_HOME) {
    return process.env.ATOM_HOME;
  }

  const appDir = getAppDirectory();
  if (appDir) {
    for (const dirName of ['.chevron', '.atom']) {
      const portableHomePath = path.join(appDir, '..', dirName);
      if (fs.existsSync(portableHomePath)) {
        if (hasWriteAccess(portableHomePath)) {
          return portableHomePath;
        }
        console.log(
          `Insufficient permission to portable home "${portableHomePath}".`
        );
      }
    }
  }

  const chevronHome = path.join(homePath, '.chevron');
  if (fs.existsSync(chevronHome)) {
    return chevronHome;
  }

  return path.join(homePath, '.atom');
}

module.exports = {
  setAtomHome: homePath => {
    const resolved = resolveConfigHome(homePath);
    process.env.ATOM_HOME = resolved;
    // Mirror for tooling that looks at CHEVRON_HOME after startup.
    if (!process.env.CHEVRON_HOME) {
      process.env.CHEVRON_HOME = resolved;
    }
  },

  resolveConfigHome,

  setUserData: app => {
    const electronUserDataPath = path.join(
      process.env.ATOM_HOME,
      'electronUserData'
    );
    if (fs.existsSync(electronUserDataPath)) {
      if (hasWriteAccess(electronUserDataPath)) {
        app.setPath('userData', electronUserDataPath);
      } else {
        console.log(
          `Insufficient permission to Electron user data "${electronUserDataPath}".`
        );
      }
    }
  },

  getAppDirectory: getAppDirectory,

  /**
   * Normalize chevron:// URIs to atom:// so package URI handlers keep working.
   * atom:// is the public package API (dual-support forever).
   */
  normalizeAppUri: uri => {
    if (typeof uri !== 'string') return uri;
    if (uri.startsWith('chevron://')) {
      return 'atom://' + uri.slice('chevron://'.length);
    }
    return uri;
  },

  isAppUri: uri =>
    typeof uri === 'string' &&
    (uri.startsWith('atom://') || uri.startsWith('chevron://'))
};
