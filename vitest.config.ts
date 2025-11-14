import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, 'tests/setup.js')],
    globals: true,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
  },
  resolve: {
    alias: {
      '@ui': path.resolve(__dirname, 'src/ui'),
      '@api': path.resolve(__dirname, 'src/ui/api'),
      '@components': path.resolve(__dirname, 'src/ui/components'),
      '@pages': path.resolve(__dirname, 'src/ui/pages'),
      '@hooks': path.resolve(__dirname, 'src/ui/hooks'),
      '@theme': path.resolve(__dirname, 'src/ui/theme'),
    },
  },
});
