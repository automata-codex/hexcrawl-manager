import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  // Allow `vitest run --mode int` to switch patterns
  const isIntegration = mode === 'int';

  return {
    test: {
      include: isIntegration
        ? ['**/*.spec-int.ts']
        : ['**/*.spec.ts'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.{idea,git,cache,output,temp}/**',
      ],
      dir: 'src', // base directory for discovery
    },
  };
});
