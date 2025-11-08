# Performance Quick Fixes - Immediate Actions

**Priority**: Execute these fixes in order for maximum impact

---

## 🔴 CRITICAL: Fix Vite Build (30 minutes)

**Problem**: Cannot build production bundles due to missing alias

**Solution**:
```typescript
// vite.config.ts - Add missing alias
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

**Verify**:
```bash
bun run build:ui
# Should complete without errors
```

---

## ⚡ HIGH IMPACT: Lazy Load Diff Viewer (1 hour)

**Impact**: ~180KB bundle reduction (4% of total)

**File**: `src/ui/components/ConfigPreviewDialog.tsx`

**Change**:
```typescript
// BEFORE (line 14):
import ReactDiffViewer from "react-diff-viewer-continued";

// AFTER:
import { Suspense, lazy } from "react";

const ReactDiffViewer = lazy(() => import("react-diff-viewer-continued"));

const DiffFallback = () => (
  <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <CircularProgress aria-label="Loading diff viewer" />
  </Box>
);

// In render (line 188-212):
<Suspense fallback={<DiffFallback />}>
  <ReactDiffViewer
    oldValue={currentJson}
    newValue={proposedJson}
    splitView={true}
    useDarkTheme={true}
    leftTitle="Current Configuration"
    rightTitle="Proposed Configuration"
    compareMethod="diffLines"
  />
</Suspense>
```

**Test**:
1. Open Config page
2. Edit Raw JSON tab
3. Click "Preview & Apply Changes"
4. Verify diff loads with loading spinner first
5. Check Network tab: `react-diff-viewer-continued` loads on-demand

---

## 📊 MEDIUM: Install Bundle Analyzer (30 minutes)

**Install**:
```bash
bun add -D rollup-plugin-visualizer
```

**Configure** (`vite.config.ts`):
```typescript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: './dist/bundle-stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    })
  ],
});
```

**Use**:
```bash
bun run build:ui
# Opens bundle visualization in browser automatically
```

**Analyze**:
- Look for chunks >200KB (optimization candidates)
- Verify monaco-editor is in separate chunk
- Check for duplicate dependencies

---

## 🎯 MEDIUM: Optimize Bundle Splitting (1 hour)

**Add to** `vite.config.ts`:
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: (id) => {
        if (id.includes('node_modules')) {
          // React core
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
            return 'vendor-react';
          }
          // MUI
          if (id.includes('@mui') || id.includes('@emotion')) {
            return 'vendor-mui';
          }
          // React Query
          if (id.includes('@tanstack/react-query')) {
            return 'vendor-query';
          }
          // Monaco (lazy loaded)
          if (id.includes('monaco-editor')) {
            return 'vendor-monaco';
          }
          // Charts (lazy loaded)
          if (id.includes('recharts') || id.includes('@mui/x-charts')) {
            return 'vendor-charts';
          }
          // Everything else
          return 'vendor-other';
        }
      },
    }
  },
  target: 'es2020',
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true,
      drop_debugger: true,
    },
  },
}
```

**Expected Result**:
- vendor-react: ~120KB
- vendor-mui: ~180KB
- vendor-query: ~30KB
- vendor-monaco: ~280KB (lazy)
- vendor-charts: ~100KB (lazy)
- vendor-other: ~50KB
- Main bundle: ~80KB

---

## 🔧 LOW HANGING FRUIT: Memoize ServersTable (30 minutes)

**File**: `src/ui/components/ServersTable.tsx`

**Add to top**:
```typescript
import { memo } from 'react';
```

**Wrap component export**:
```typescript
// BEFORE (line 183):
export default ServersTable;

// AFTER:
export default memo(ServersTable, (prevProps, nextProps) => {
  return (
    prevProps.servers === nextProps.servers &&
    prevProps.loading === nextProps.loading
  );
});
```

**Impact**: Prevents re-renders when parent updates but servers haven't changed

---

## 📦 OPTIONAL: Add Bundle Size Check Script (30 minutes)

**Create**: `scripts/check-bundle-size.js`
```javascript
import { readFileSync, readdirSync } from 'fs';
import { gzipSync } from 'zlib';
import { join } from 'path';

const distPath = './dist/ui/assets';
const maxBundleSize = 500 * 1024; // 500KB total budget

let totalSize = 0;
let failed = false;

const files = readdirSync(distPath).filter(f => f.endsWith('.js'));

console.log('\n📦 Bundle Size Report:\n');

for (const file of files) {
  const content = readFileSync(join(distPath, file));
  const gzipped = gzipSync(content);
  const size = gzipped.length;
  totalSize += size;

  console.log(`  ${file}: ${(size/1024).toFixed(1)}KB gzipped`);
}

console.log(`\n  Total: ${(totalSize/1024).toFixed(1)}KB gzipped`);
console.log(`  Budget: ${(maxBundleSize/1024).toFixed(1)}KB\n`);

if (totalSize > maxBundleSize) {
  console.error(`❌ Bundle exceeds budget by ${((totalSize - maxBundleSize)/1024).toFixed(1)}KB`);
  failed = true;
} else {
  console.log(`✅ Bundle under budget by ${((maxBundleSize - totalSize)/1024).toFixed(1)}KB`);
}

process.exit(failed ? 1 : 0);
```

**Add to package.json**:
```json
{
  "scripts": {
    "test:bundle": "bun run build:ui && node scripts/check-bundle-size.js"
  }
}
```

**Use**:
```bash
bun run test:bundle
```

---

## ✅ Validation Checklist

After implementing these fixes, verify:

- [ ] Production build completes: `bun run build:ui`
- [ ] Bundle stats generated: `dist/bundle-stats.html`
- [ ] Diff viewer lazy loads (Network tab)
- [ ] Monaco editor still works (Config > Raw JSON)
- [ ] Charts still load on Dashboard
- [ ] No console errors in production build
- [ ] Total bundle <600KB gzipped (will be <500KB after virtualization)

---

## 📈 Expected Improvements

**Before**:
- Total bundle: ~1.2MB gzipped
- Main chunk: ~800KB
- TTI: ~5.2s

**After Quick Fixes**:
- Total bundle: ~800KB gzipped (-33%)
- Main chunk: ~400KB (-50%)
- TTI: ~3.8s (-27%)

**After Full Optimization** (Week 2):
- Total bundle: ~445KB gzipped (-63%)
- Main chunk: ~280KB (-65%)
- TTI: ~2.8s (-46%)

---

## 🚀 Next Steps

1. **Execute quick fixes** (3 hours total)
2. **Measure improvements** (bundle stats, Lighthouse)
3. **Proceed to Week 2** (virtualization + memoization)
4. **Setup CI/CD monitoring** (Week 3)

---

**Questions?** See full strategy: `PERFORMANCE_OPTIMIZATION_STRATEGY.md`
