import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: path.resolve(__dirname, 'src/ui'),
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, 'dist/ui'),
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:7000',
      '/events': 'http://localhost:7000',
      '/mcp': 'http://localhost:7000',
      '/messages': 'http://localhost:7000',
    },
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
