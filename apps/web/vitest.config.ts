import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['scripts/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
