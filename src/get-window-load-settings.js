// remote is polyfilled onto electron in static/index.js for Electron 14+.
// Keep this free of @electron/remote so it can live in the startup snapshot.
const { remote } = require('electron');

let windowLoadSettings = null;

module.exports = () => {
  if (!windowLoadSettings) {
    windowLoadSettings = JSON.parse(remote.getCurrentWindow().loadSettingsJSON);
  }
  return windowLoadSettings;
};
