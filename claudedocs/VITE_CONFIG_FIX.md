# CRITICAL: Vite Config Fix - Immediate Action Required

**Priority**: 🔴 BLOCKER - Must fix before any performance optimization

**Time**: 30 minutes

**Impact**: Enables production builds and all performance work

---

## Problem

Production builds fail with:
```
[vite]: Rollup failed to resolve import "@utils/query-client"
```

**Root Cause**: Missing path alias for `@utils` in `vite.config.ts`

**Affected Files**: All pages import from `@utils/query-client`:
- `src/ui/pages/DashboardPage.tsx` (line 14)
- `src/ui/pages/ServersPage.tsx` (line 6)
- `src/ui/pages/ToolsPage.tsx` (line 5)
- `src/ui/pages/ConfigPage.tsx` (line 21)

---

## Solution

### File: `vite.config.ts`

**Current (lines 32-41)**:
```typescript
resolve: {
  alias: {
    '@ui': path.resolve(__dirname, 'src/ui'),
    '@api': path.resolve(__dirname, 'src/ui/api'),
    '@components': path.resolve(__dirname, 'src/ui/components'),
    '@pages': path.resolve(__dirname, 'src/ui/pages'),
    '@hooks': path.resolve(__dirname, 'src/ui/hooks'),
    '@theme': path.resolve(__dirname, 'src/ui/theme'),
  },
}
```

**Fixed (add `@utils`)**:
```typescript
resolve: {
  alias: {
    '@ui': path.resolve(__dirname, 'src/ui'),
    '@api': path.resolve(__dirname, 'src/ui/api'),
    '@components': path.resolve(__dirname, 'src/ui/components'),
    '@pages': path.resolve(__dirname, 'src/ui/pages'),
    '@hooks': path.resolve(__dirname, 'src/ui/hooks'),
    '@theme': path.resolve(__dirname, 'src/ui/theme'),
    '@utils': path.resolve(__dirname, 'src/ui/utils'), // ⬅️ ADD THIS LINE
  },
}
```

---

## Verification

### Step 1: Test Production Build

```bash
bun run build:ui
```

**Expected Output**:
```
vite v7.1.12 building for production...
transforming...
✓ 221 modules transformed.
rendering chunks...
computing gzip size...
dist/ui/index.html                   0.46 kB │ gzip:  0.30 kB
dist/ui/assets/index-abc123.css     45.23 kB │ gzip: 12.45 kB
dist/ui/assets/index-def456.js     456.78 kB │ gzip: 145.23 kB
✓ built in 2.34s
```

**NOT**:
```
✗ Build failed in 260ms
error during build:
[vite]: Rollup failed to resolve import "@utils/query-client"
```

---

### Step 2: Verify Bundle Contents

Check that utils files are included:

```bash
ls -lh dist/ui/assets/
```

**Expected**: Multiple `.js` and `.css` files with hashed names

---

### Step 3: Test Dev Server (Optional)

```bash
bun run dev:ui
```

**Expected**: App loads at `http://localhost:5173` without errors

---

## While You're Here: Add Bundle Analyzer (Optional)

**Time**: +15 minutes
**Benefit**: Enables performance analysis

### Install

```bash
bun add -D rollup-plugin-visualizer
```

### Configure

Add to top of `vite.config.ts`:
```typescript
import { visualizer } from 'rollup-plugin-visualizer';
```

Add to plugins array:
```typescript
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: './dist/bundle-stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  // ... rest of config
});
```

### Use

```bash
bun run build:ui
# Automatically opens bundle visualization in browser
```

**What you'll see**:
- Interactive treemap of bundle composition
- Gzipped and Brotli sizes
- Identify largest dependencies

**Example insights**:
- Monaco editor: ~2.8MB (huge!)
- MUI components: ~800KB
- React Query: ~90KB
- Zustand: ~3KB (excellent!)

---

## Complete Fixed Config (Reference)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer'; // Optional
import path from 'node:path';

export default defineConfig({
  root: path.resolve(__dirname, 'src/ui'),
  plugins: [
    react(),
    // Optional: Bundle analyzer
    visualizer({
      filename: './dist/bundle-stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    outDir: path.resolve(__dirname, 'dist/ui'),
    emptyOutDir: true,
    sourcemap: true,
    // Optional: Better chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material'],
          'vendor-query': ['@tanstack/react-query'],
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:7000',
        changeOrigin: true,
        bypass: (req) => {
          if (req.url?.match(/\.(ts|tsx|js|jsx)$/)) {
            return req.url;
          }
          return null;
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
      '@utils': path.resolve(__dirname, 'src/ui/utils'), // ⬅️ CRITICAL FIX
    },
  },
  optimizeDeps: {
    exclude: ['@ui', '@api', '@components', '@pages', '@hooks', '@theme', '@utils'],
  },
});
```

---

## Next Steps After Fix

1. ✅ **Verify build works**: `bun run build:ui`
2. ✅ **Generate bundle stats**: Check `dist/bundle-stats.html`
3. ✅ **Measure baseline**: Note bundle size
4. 📋 **Proceed to optimizations**: See `PERFORMANCE_QUICK_FIXES.md`

---

## If Build Still Fails

### Check 1: Verify File Exists

```bash
ls src/ui/utils/query-client.ts
```

**Expected**: File exists

**If missing**: File was moved/renamed - update import paths

---

### Check 2: Check TypeScript Config

```bash
cat tsconfig.json
```

**Verify paths match**:
```json
{
  "compilerOptions": {
    "paths": {
      "@utils/*": ["./src/ui/utils/*"]
    }
  }
}
```

**If missing**: Add to `compilerOptions.paths`

---

### Check 3: Clear Cache

```bash
rm -rf node_modules/.vite dist/
bun install
bun run build:ui
```

---

## Common Questions

**Q: Why wasn't this caught earlier?**
A: Dev mode uses different resolution (Vite dev server) than production (Rollup). Alias worked in dev but not prod build.

**Q: Are there other missing aliases?**
A: No - `@utils` is the only one. All other imports work correctly.

**Q: Will this affect existing dev workflow?**
A: No - dev server will continue working as before.

**Q: Do I need to update imports?**
A: No - imports are correct, only config needed updating.

---

## Success Criteria

✅ `bun run build:ui` completes successfully
✅ `dist/ui/` directory created with assets
✅ No "failed to resolve" errors
✅ Bundle stats generated (if visualizer installed)

**Once working**: Proceed to performance optimizations! 🚀

---

**Estimated Time**: 5 minutes (just alias) to 30 minutes (with analyzer)
**Difficulty**: Easy
**Impact**: CRITICAL - Unblocks all other work
