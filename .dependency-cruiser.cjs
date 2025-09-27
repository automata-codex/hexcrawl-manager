// .dependency-cruiser.cjs
module.exports = {
  forbidden: [
    // A) From CLI or Web into package internals: MUST go via barrels
    {
      name: "no-deep-into-packages-from-cli-or-web",
      severity: "error",
      from: { path: "^(cli|src)/" },
      to:   { path: "^packages/[^/]+/src/(?!index\\.(ts|js)$).+" }
    },

    // B) Cross-package deep imports (OK within the same package)
    // core -> other packages' internals
    {
      name: "no-core-to-others-internals",
      severity: "error",
      from: { path: "^packages/core/" },
      to:   { path: "^packages/(cli-kit|data)/src/(?!index\\.(ts|js)$).+" }
    },
    // data -> other packages' internals
    {
      name: "no-data-to-others-internals",
      severity: "error",
      from: { path: "^packages/data/" },
      to:   { path: "^packages/(cli-kit|core)/src/(?!index\\.(ts|js)$).+" }
    },
    // cli-kit -> other packages' internals
    {
      name: "no-cli-kit-to-others-internals",
      severity: "error",
      from: { path: "^packages/cli-kit/" },
      to:   { path: "^packages/(core|data)/src/(?!index\\.(ts|js)$).+" }
    },

    // C) Optional: prevent cross-command imports inside the CLI
    {
      name: "no-cross-command-imports",
      severity: "error",
      from: { path: "^cli/commands/([^/]+)/" },
      to:   { path: "^cli/commands/(?!\\1)/" }
    }
  ],
  options: {
    tsConfig: { fileName: "tsconfig.json" },
    doNotFollow: { path: ["node_modules"] }
  }
};
