# Update Package Dependencies package

Runs the product package manager (`cpm`, also available as the `apm` shim) with
`install` in the current project's directory. This installs dependencies from
`package.json` into `node_modules`.

Uses `atom.packages.getApmPath()`, which points at **cpm** in modern Chevron
builds (Phase 4+).
