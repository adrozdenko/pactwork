import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/index.ts'],
    },
  },
  resolve: {
    alias: {
      'pactwork/runtime': path.resolve(__dirname, '../../dist/runtime/index.js'),
      'pactwork': path.resolve(__dirname, '../../dist/index.js'),
    },
  },
});
