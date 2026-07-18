const { net, protocol } = require('electron');
const fs = require('fs-plus');
const path = require('path');
const { pathToFileURL } = require('url');

// Handles requests with the 'atom' and 'chevron' protocols.
//
// It's created by {AtomApplication} upon instantiation and is used to create a
// custom resource loader for 'atom://' and 'chevron://' URLs (same search paths).
//
// The following directories are searched in order:
//   * $ATOM_HOME/assets  (config home; may be ~/.atom or ~/.chevron)
//   * $ATOM_HOME/dev/packages (unless in safe mode)
//   * $ATOM_HOME/packages
//   * RESOURCE_PATH/node_modules
//
module.exports = class AtomProtocolHandler {
  constructor(resourcePath, safeMode) {
    this.loadPaths = [];

    if (!safeMode) {
      this.loadPaths.push(path.join(process.env.ATOM_HOME, 'dev', 'packages'));
      this.loadPaths.push(path.join(resourcePath, 'packages'));
    }

    this.loadPaths.push(path.join(process.env.ATOM_HOME, 'packages'));
    this.loadPaths.push(path.join(resourcePath, 'node_modules'));

    this.registerAtomProtocol();
  }

  // Register both product schemes; packages still use atom:// as the public API.
  registerAtomProtocol() {
    for (const scheme of ['atom', 'chevron']) {
      this.registerScheme(scheme);
    }
  }

  registerScheme(scheme) {
    if (typeof protocol.registerFileProtocol === 'function') {
      protocol.registerFileProtocol(scheme, (request, callback) => {
        callback(this.resolveAtomUrl(request.url));
      });
    } else {
      // Electron 25+ replacement; registerFileProtocol was removed after
      // a long deprecation. Serve the resolved file via net.fetch.
      protocol.handle(scheme, request => {
        const filePath = this.resolveAtomUrl(request.url);
        if (!filePath) return new Response('', { status: 404 });
        return net.fetch(pathToFileURL(filePath).toString());
      });
    }
  }

  resolveAtomUrl(url) {
    let relativePath;
    if (url.startsWith('atom://')) {
      relativePath = path.normalize(url.slice('atom://'.length));
    } else if (url.startsWith('chevron://')) {
      relativePath = path.normalize(url.slice('chevron://'.length));
    } else {
      relativePath = path.normalize(url);
    }

    let filePath;
    if (relativePath.indexOf('assets/') === 0) {
      const assetsPath = path.join(process.env.ATOM_HOME, relativePath);
      const stat = fs.statSyncNoException(assetsPath);
      if (stat && stat.isFile()) filePath = assetsPath;
    }

    if (!filePath) {
      for (let loadPath of this.loadPaths) {
        filePath = path.join(loadPath, relativePath);
        const stat = fs.statSyncNoException(filePath);
        if (stat && stat.isFile()) break;
      }
    }

    return filePath;
  }
};
