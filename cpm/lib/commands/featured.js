'use strict';

/**
 * List featured packages/themes from the registry (apm-compatible).
 * settings-view runs: `apm featured --json [--themes] [--compatible VER]`.
 */

const { getRegistryBaseUrl, getFeaturedPackages } = require('../registry');

async function featuredCommand(options = {}) {
  const themes = Boolean(options.themes);
  let list;
  try {
    list = await getFeaturedPackages({ themes });
  } catch (err) {
    process.stderr.write(`cpm featured: ${err.message}\n`);
    return 1;
  }

  const compatible = options.compatible;
  if (compatible && typeof compatible === 'string') {
    try {
      const semver = require('semver');
      const product = semver.coerce(compatible) || compatible;
      list = list.filter(pack => {
        const engine =
          (pack.engines && pack.engines.atom) ||
          (pack.metadata &&
            pack.metadata.engines &&
            pack.metadata.engines.atom) ||
          '*';
        try {
          return semver.satisfies(product, engine);
        } catch (_) {
          return true;
        }
      });
    } catch (_) {
      /* leave unfiltered if no semver */
    }
  }

  if (options.json) {
    process.stdout.write(JSON.stringify(list) + '\n');
    return 0;
  }

  process.stdout.write(
    `Featured ${themes ? 'themes' : 'packages'} (${list.length}) — ${getRegistryBaseUrl()}\n`
  );
  for (const pack of list.slice(0, 30)) {
    const ver = pack.version || '';
    const desc = pack.description || '';
    process.stdout.write(
      `├── ${pack.name}${ver ? '@' + ver : ''} ${desc.slice(0, 60)}\n`
    );
  }
  return 0;
}

module.exports = { featuredCommand };
