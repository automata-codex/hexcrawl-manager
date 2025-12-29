import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  // Allow `vitest run --mode int` to switch patterns
  const isIntegration = mode === 'int';

  return {
    test: {
      include: isIntegration ? ['**/*.spec-int.ts'] : ['**/*.spec.ts'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.{idea,git,cache,output,temp}/**',
      ],
      dir: 'src', // base directory for discovery
      // Integration tests spawn child processes via execa, which crashes with
      // vitest's default threads pool (SIGSEGV/exit code 139). Use forks pool
      // with single worker to serialize test files and avoid resource contention.
      ...(isIntegration && {
        pool: 'forks' as const,
        poolOptions: {
          forks: {
            singleFork: true,
            isolate: true,
          },
        },
        maxWorkers: 1,
        minWorkers: 1,
      }),
    },
  };
});
