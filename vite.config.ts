import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  root: path.resolve(__dirname, 'src/ui'),
  plugins: [
    react({
      babel: {
        plugins: [
          [
            'babel-plugin-import',
            {
              libraryName: '@mui/material',
              libraryDirectory: '',
              camel2DashComponentName: false,
            },
            '@mui/material',
          ],
          [
            'babel-plugin-import',
            {
              libraryName: '@mui/icons-material',
              libraryDirectory: '',
              camel2DashComponentName: false,
            },
            '@mui/icons-material',
          ],
        ],
      },
    }),
    // Only include visualizer in build (not dev)
    {
      ...visualizer({
        filename: './dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
      apply: 'build',
    } as any,
  ],
  build: {
    outDir: path.resolve(__dirname, 'dist/ui'),
    emptyOutDir: true,
    sourcemap: false, // Disabled for production - reduces build size and time
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
      },
    },

    rollupOptions: {
      output: {
        manualChunks: {
          // Core React framework (changes rarely, excellent caching)
          'react-core': [
            'react',
            'react-dom',
            'react/jsx-runtime',
            'react-router-dom',
          ],

          // MUI and styling (large but stable)
          'mui-core': [
            '@mui/material',
            '@mui/icons-material',
            '@emotion/react',
            '@emotion/styled',
            '@emotion/cache',
          ],

          // State management and utilities (smaller, may change with app logic)
          'state-utils': [
            '@tanstack/react-query',
            'zustand',
            'zod',
          ],

          // Charts library (only loaded on dashboard)
          'charts': [
            '@mui/x-charts',
          ],

          // Monaco editor (only loaded on config page)
          'monaco': [
            '@monaco-editor/react',
            'monaco-editor',
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:7000',
        changeOrigin: true,
        // Don't proxy requests to .ts/.tsx files (source modules)
        bypass: (req) => {
          if (req.url?.match(/\.(ts|tsx|js|jsx)$/)) {
            return req.url;
          }
          return null; // Explicitly proxy to backend
        },
      },
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
      '@utils': path.resolve(__dirname, 'src/ui/utils'),
    },
  },
  optimizeDeps: {
    // Exclude these from pre-bundling since they're project source files
    exclude: ['@ui', '@api', '@components', '@pages', '@hooks', '@theme', '@utils'],
  },
});
