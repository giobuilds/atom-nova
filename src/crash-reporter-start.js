module.exports = function(params) {
  const { crashReporter } = require('electron');
  const os = require('os');
  const platformRelease = os.release();
  const arch = os.arch();
  const { releaseChannel } = params;

  // Electron 14+: crashReporter.start exists only in the main process.
  // Renderer still requires this module for historical reasons; no-op there.
  if (!crashReporter || typeof crashReporter.start !== 'function') {
    return;
  }

  // Local crash reporting only — never submit to atom.io or other endpoints.
  // submitURL is required by Electron but unused when uploadToServer is false.
  crashReporter.start({
    productName: 'AtomNova',
    companyName: 'AtomNova',
    submitURL: 'https://127.0.0.1/atomnova-crash-reports-disabled',
    uploadToServer: false,
    ignoreSystemCrashHandler: false,
    // Electron 9+ uses globalExtra / extra differently; keep both safe.
    extra: { platformRelease, arch, releaseChannel },
    globalExtra: {
      _companyName: 'AtomNova',
      _productName: 'AtomNova',
      platformRelease,
      arch,
      releaseChannel: String(releaseChannel || '')
    }
  });
};
