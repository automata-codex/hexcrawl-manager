// .dependency-cruiser.cjs
module.exports = {
  forbidden: [
    // A) From CLI or Web into package internals: MUST go via barrels
    {
      name: 'no-deep-into-packages-from-cli-or-web',
      severity: 'error',
      from: { path: '^(cli|src)/' },
      to: { path: '^packages/[^/]+/src/(?!index\\.(ts|js)$).+' },
    },

    // B) Cross-package deep imports (OK within the same package)
    // core -> other packages' internals
    {
      name: 'no-core-to-others-internals',
      severity: 'error',
      from: { path: '^packages/core/' },
      to: {
        path: '^packages/(cli-kit|data|schemas)/src/(?!index\\.(ts|js)$).+',
      },
    },
    // data -> other packages' internals
    {
      name: 'no-data-to-others-internals',
      severity: 'error',
      from: { path: '^packages/data/' },
      to: {
        path: '^packages/(cli-kit|core|schemas)/src/(?!index\\.(ts|js)$).+',
      },
    },
    // cli-kit -> other packages' internals
    {
      name: 'no-cli-kit-to-others-internals',
      severity: 'error',
      from: { path: '^packages/cli-kit/' },
      to: { path: '^packages/(core|data|schemas)/src/(?!index\\.(ts|js)$).+' },
    },
    // schemas -> other packages' internals
    {
      name: 'no-schemas-to-others-internals',
      severity: 'error',
      from: { path: '^packages/schemas/' },
      to: { path: '^packages/(cli-kit|core|data)/src/(?!index\\.(ts|js)$).+' },
    },

    // C) Optional: prevent cross-command imports inside the CLI
    {
      name: 'no-cross-command-imports',
      severity: 'error',
      from: { path: '^cli/commands/([^/]+)/' },
      to: { path: '^cli/commands/(?!\\1)/' },
    },

    // D) Limits on `cli-kit`
    {
      name: 'no-cli-kit-to-core-or-data',
      from: { path: '^packages/cli-kit/src' },
      to: { path: '^packages/(core|data)/src' },
    },
    {
      name: 'no-core-io',
      from: { path: '^packages/core/src' },
      to: {
        path: '^(fs|path|yaml|child_process|simple-git)',
        dependencyTypes: ['core', 'npm'],
      },
    },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' },
    doNotFollow: { path: ['node_modules'] },
  },
};
