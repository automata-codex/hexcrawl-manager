module.exports = {
  forbidden: [
    // Only import package *public* APIs (barrels)
    {
      name: "no-deep-package-internals",
      severity: "error",
      from: { path: "^(cli|src|packages)/" },
      to:   { path: "^packages/[^/]+/src/(?!index\\.(ts|js)$).+" }
    },
    // No cross-command reaches inside the CLI
    {
      name: "no-cross-command-imports",
      severity: "error",
      from: { path: "^cli/commands/([^/]+)/" },
      to:   { path: "^cli/commands/(?!\\1)/" }
    }
  ],
  options: {
    tsConfig: { fileName: "tsconfig.json" }, // your existing Astro-rooted tsconfig is fine
    doNotFollow: { path: ["node_modules"] }
  }
};
