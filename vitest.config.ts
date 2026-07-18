import {defineConfig} from 'vitest/config';

// The search normalizer is pure TS (no DOM, no Next runtime), so the plain
// node environment is all we need. Integration/DB checks live in *-smoke.ts
// scripts (run via tsx), not here.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
