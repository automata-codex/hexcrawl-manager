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
      '.astro/**',
      '.build/**',
      '.svelte-kit/**',
      '.vercel/**',
      '_reports/**',
      'coverage/**',
      'dist/**',
      'packages/**/dist/**',
      'node_modules/**',
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
    // plugins used in later rule blocks
    plugins: {
      '@typescript-eslint': tsPlugin,
      astro,
      svelte,
      import: importPlugin,
    },
  },

  // 5) CLI, packages, & Scripts (Node) — give Node globals like `console`, `process`, `__dirname`
  {
    files: [
      'cli/**/*.{js,ts}',
      'scripts/**/*.{js,ts}',
      'schemas/**/*.{js,ts}',
      'lib/**/*.{js,ts}',
      'packages/**/src/**/*.{js,ts}',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parser: tsParser,
      parserOptions: {
        // add a project here if you use type-aware rules
        // project: ["cli/tsconfig.json"],
      },
    },
    rules: {
      'import/order': importOrder,
      // Allow console usage in Node code (CLIs, scripts, packages)
      'no-console': 'off',
    },
  },

  // 6) Web (browser) — give browser globals like `window`, `document`, `console`
  {
    files: ['src/**/*.{js,ts,jsx,tsx,astro,svelte}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    // Import ordering across web files
    rules: {
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
        parser: tsParser, // <- inner <script> uses TS parser
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

  // 9) TypeScript files anywhere (shared TS rules if you want them)
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        // add projects if/when you enable type-aware rules
        // project: ["cli/tsconfig.json", "web/tsconfig.json"],
      },
    },
    // lightweight recommended TS rules (optional to expand)
    rules: {
      'import/order': importOrder,
    },
  },

  // 10) Put Prettier last to disable conflicting stylistic rules
  prettier,
]);
