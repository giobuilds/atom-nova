'use strict';

const path = require('path');
const {
  classifyCallerPath,
  baseModuleId,
  isAuditEnabled,
  isRestrictEnabled
} = require('../src/package-require-audit');

describe('package-require-audit / N3.2 classifyCallerPath', function() {
  it('classifies asar paths as bundled', function() {
    expect(
      classifyCallerPath(
        '/app/out/Chevron-linux-x64/resources/app.asar/node_modules/settings-view/lib/main.js'
      )
    ).toBe('bundled');
  });

  it('classifies resources/app paths as bundled', function() {
    expect(
      classifyCallerPath(
        '/home/user/chevron/out/app/node_modules/tree-view/lib/main.js'
      )
    ).toBe('bundled');
  });

  it('classifies ~/.atom/packages as community', function() {
    expect(
      classifyCallerPath(
        '/home/user/.atom/packages/minimap/lib/minimap.js'
      )
    ).toBe('community');
  });

  it('classifies ~/.chevron/packages as community', function() {
    expect(
      classifyCallerPath(
        '/home/user/.chevron/packages/linter/lib/main.js'
      )
    ).toBe('community');
  });

  it('classifies monorepo packages/ as bundled', function() {
    expect(
      classifyCallerPath(
        path.join(
          '/home/user/Workspace/chevron/packages/welcome/lib/main.js'
        )
      )
    ).toBe('bundled');
  });

  it('classifies src as core', function() {
    expect(
      classifyCallerPath('/home/user/Workspace/chevron/src/atom-environment.js')
    ).toBe('core');
  });

  it('parses base module ids', function() {
    expect(baseModuleId('fs')).toBe('fs');
    expect(baseModuleId('fs/promises')).toBe('fs');
    expect(baseModuleId('@atom/watcher')).toBe('@atom/watcher');
    expect(baseModuleId('./relative')).toBe(null);
  });

  it('env flags default off', function() {
    const prevA = process.env.CHEVRON_AUDIT_PACKAGE_REQUIRES;
    const prevR = process.env.CHEVRON_RESTRICT_PACKAGE_REQUIRES;
    delete process.env.CHEVRON_AUDIT_PACKAGE_REQUIRES;
    delete process.env.CHEVRON_RESTRICT_PACKAGE_REQUIRES;
    expect(isAuditEnabled()).toBe(false);
    expect(isRestrictEnabled()).toBe(false);
    if (prevA !== undefined) process.env.CHEVRON_AUDIT_PACKAGE_REQUIRES = prevA;
    if (prevR !== undefined)
      process.env.CHEVRON_RESTRICT_PACKAGE_REQUIRES = prevR;
  });
});
