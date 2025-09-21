/** @type {import('prettier').Config} */
module.exports = {
  plugins: ['prettier-plugin-astro', 'prettier-plugin-svelte'],
  overrides: [
    { files: '*.astro',  options: { parser: 'astro' } },
    { files: '*.svelte', options: { parser: 'svelte' } },
  ],

  // Project prefs
  printWidth: 80,
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
};
