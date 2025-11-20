import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, 'tests/setup-ui.js')],
    globals: true,
    include: ['src/ui/**/*.test.ts', 'src/ui/**/*.test.tsx', 'tests/ui/**/*.test.ts', 'tests/ui/**/*.test.tsx'],
    exclude: [
      'node_modules/**',
      'dist/**',
      '**/*.d.ts',
    ],
    coverage: {
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        'tests/**',
        'scripts/**',
      ],
    },
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
      '@utils': path.resolve(__dirname, 'src/ui/utils'),
      '@theme': path.resolve(__dirname, 'src/ui/theme'),
    },
  },
});
