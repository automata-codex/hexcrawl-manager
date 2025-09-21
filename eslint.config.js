import js from "@eslint/js";
import ts from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import astroPlugin from "eslint-plugin-astro";
import sveltePlugin from "eslint-plugin-svelte";
import importPlugin from "eslint-plugin-import";
import prettierConfig from "eslint-config-prettier";

export default [
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.astro", "**/*.svelte"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { sourceType: "module" },
    },
    plugins: {
      "@typescript-eslint": ts,
      astro: astroPlugin,
      svelte: sveltePlugin,
      import: importPlugin,
    },
    rules: {
      "import/order": ["error", { "newlines-between": "always" }],
      // add other rules here
    },
  },
  prettierConfig,
];
