import { defineConfig } from 'eslint/config';
import globals from 'globals';
import js from '@eslint/js';

// TypeScript (parser + rules)
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

// Astro + Svelte + import order + prettier
import astro from 'eslint-plugin-astro';
import svelte from 'eslint-plugin-svelte';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-config-prettier';

const importOrder = [
  'error',
  {
    groups: [
      ['builtin', 'external'],
      'internal',
      'parent',
      ['index', 'sibling'],
      'type',
    ],
    'newlines-between': 'always',
    alphabetize: { order: 'asc', caseInsensitive: true },
  },
];

export default defineConfig([
  // 1) Ignores
  {
    ignores: [
      // root & common
      '.astro/**',
      '.build/**',
      '.svelte-kit/**',
      '.vercel/**',
      '_reports/**',
      'coverage/**',
      'dist/**',
      'node_modules/**',

      // packages
      'packages/**/dist/**',

      // apps (build & framework dirs)
      'apps/**/dist/**',
      'apps/**/build/**',
      'apps/**/.vercel/**',
      'apps/web/.svelte-kit/**',
      'apps/web/.astro/**',

      // python venvs in scripts
      'scripts/clue-linker/.venv-clue-linker/**',
      'scripts/elevation-solver/.venv-clue-linker/**',
    ],
  },

  // 2) Base JS recommendations
  js.configs.recommended,

  // 3) Astro + Svelte recommended presets (flat versions)
  astro.configs['flat/recommended'],
  svelte.configs['flat/recommended'],

  // 4) Global defaults that make sense repo-wide
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      astro,
      svelte,
      import: importPlugin,
    },
  },

  // 5) Node contexts: CLIs, packages, scripts, and app config files
  {
    files: [
      // monorepo nodes
      'scripts/**/*.{js,ts}',
      'packages/**/src/**/*.{js,ts}',
      // app: CLI source
      'apps/cli/**/*.{js,ts}',
      // app & framework config files that run in Node
      'apps/**/astro.config.{js,cjs,mjs,ts}',
      'apps/**/svelte.config.{js,cjs,mjs,ts}',
      'apps/**/vite.config.{js,cjs,mjs,ts}',
      'apps/**/tailwind.config.{js,cjs,mjs,ts}',
      // (optional) any server code paths you keep under apps/**
      'apps/**/server/**/*.{js,ts}',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parser: tsParser,
      parserOptions: {
        // Add project references here if you enable type-aware rules later
        // project: ['apps/cli/tsconfig.json', 'packages/*/tsconfig.json'],
      },
    },
    rules: {
      'import/order': importOrder,
      // Allow console usage in Node code (CLIs, scripts, packages)
      'no-console': 'off',
    },
  },

  // 6) Web/browser code: the web app’s source
  {
    files: [
      'apps/web/src/**/*.{js,ts,jsx,tsx,astro,svelte}',
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      // parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        // extraFileExtensions: ['.svelte', '.astro'],
      },
    },
    rules: {
      // Import ordering across web files
      'import/order': importOrder,
      // Keep console mostly clean on the web; change to 'off' if you prefer
      'no-console': 'warn',
    },
  },

  // 7) Astro: ensure frontmatter uses TS parser so import rules apply there too
  {
    files: ['**/*.astro'],
    languageOptions: {
      parserOptions: {
        // `astro.configs["flat/recommended"]` already sets the Astro parser;
        // this nests TS parser to handle frontmatter JS/TS.
        parser: tsParser,
      },
    },
    rules: {
      'import/order': importOrder,
    },
  },

  // 8) Svelte: ensure <script> uses TS parser so import rules apply there too
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
        sourceType: 'module',
        extraFileExtensions: ['.svelte'],
      },
    },
    rules: {
      'import/order': importOrder,
      'svelte/no-at-html-tags': 'off',
      'svelte/no-navigation-without-resolve': 'off',
    },
  },

  // 9) TypeScript files anywhere (shared TS rules)
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        // Add projects if/when you enable type-aware rules
        // project: ['apps/cli/tsconfig.json', 'apps/web/tsconfig.json'],
      },
    },
    rules: {
      'import/order': importOrder,
    },
  },

  // 10) Scoped override for the CLI (kept explicit)
  {
    files: ['apps/cli/**/*.{ts,tsx,js}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // 11) Put Prettier last to disable conflicting stylistic rules
  prettier,
]);
