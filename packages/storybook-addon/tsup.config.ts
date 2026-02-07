import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/manager.ts',
    'src/preview.ts',
    'src/preset.ts',
  ],
  format: ['esm'], // ESM-only for Storybook 10
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node20',
  outDir: 'dist',
  splitting: false,
  treeshake: true,
  external: [
    'storybook',
    'storybook/internal/manager-api',
    'storybook/internal/preview-api',
    'storybook/internal/csf',
    '@storybook/components',
    '@storybook/theming',
    'react',
    'react-dom',
    'msw',
    'pactwork',
    'pactwork/runtime',
  ],
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
});
