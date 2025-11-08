# MCP Hub UI Performance Optimization Strategy

**Phase 4 Performance Engineering**
**Document Version**: 1.0
**Date**: 2025-11-08
**Author**: Performance Engineer

---

## Executive Summary

**Current State**: Functional React UI with 15 components, 4 pages, React Query + Zustand state management
**Target Metrics**: Bundle <500KB gzipped, TTI <3.5s, Lighthouse >90, 60fps scroll with 200+ tools
**Expected Gains**: 40-60% bundle reduction, 50-70% faster initial load, 3x scroll performance

**High-Impact Optimizations** (ROI Score):
1. **Virtualization** (95/100) - Tools table with 100+ rows → 60fps scroll
2. **Heavy Dependencies Lazy Loading** (90/100) - Monaco, Charts, Diff → 40% bundle reduction
3. **Bundle Analysis** (85/100) - Identify and eliminate bloat
4. **Component Memoization** (75/100) - Reduce unnecessary re-renders
5. **Vite Config Fix** (70/100) - Enable production builds

---

## 1. Performance Audit Report

### 1.1 Current Bundle Analysis (Estimated)

**Build Status**: ❌ BROKEN - Vite config has path resolution issues

**Critical Issue**:
```
Error: Rollup failed to resolve import "@utils/query-client"
```

**Estimated Bundle Sizes** (based on package.json dependencies):

| Category | Library | Est. Size | Impact |
|----------|---------|-----------|---------|
| **Heavy** | `monaco-editor` | ~2.8MB | ⚠️ Critical - Only used in ConfigPage Raw JSON tab |
| **Heavy** | `@mui/x-charts` | ~450KB | ⚠️ High - Charts in DashboardPage |
| **Heavy** | `react-diff-viewer-continued` | ~180KB | ⚠️ Medium - Only in ConfigPreviewDialog |
| **Core** | `@mui/material` | ~800KB | ✅ Necessary - Tree-shakeable |
| **Core** | `@tanstack/react-query` | ~90KB | ✅ Necessary - Already optimized |
| **Core** | `react-router-dom` | ~75KB | ✅ Necessary - Route-based splitting |
| **Core** | `zustand` | ~3KB | ✅ Excellent - Minimal overhead |

**Total Estimated**: ~4.5MB uncompressed, ~1.2MB gzipped (❌ EXCEEDS 500KB TARGET)

**Optimization Potential**: 40-60% reduction by lazy loading heavy dependencies

### 1.2 Component Render Profiling (Analysis)

**High Re-Render Risk Components**:

1. **ToolsTable.tsx** (Lines 46-63):
   - `useMemo` for filtering - ✅ Good
   - `useMemo` for servers/categories extraction - ✅ Good
   - **Issue**: Renders ALL rows (100+) → virtualization needed

2. **DashboardPage.tsx** (Lines 72-92):
   - `useCallback` for handlers - ✅ Good
   - `useMemo` for logs - ✅ Good
   - **Issue**: Charts re-render on every stats update

3. **ConfigPage.tsx** (Lines 78-90):
   - `updateConfigState` uses `useCallback` - ✅ Good
   - **Issue**: Monaco editor re-renders on every keystroke

4. **ServersTable.tsx**:
   - No memoization at all - ❌ Needs React.memo
   - Inline functions in `map` - ⚠️ Creates new functions per render

**Bottlenecks Identified**:
- ToolsTable: DOM rendering 100+ rows = ~500ms on low-end devices
- Monaco Editor: Re-initialization on tab switch = ~800ms
- Charts: Re-render on every data point = ~150ms
- ConfigPreviewDialog: Diff calculation on large configs = ~200ms

### 1.3 Performance Baseline Metrics (Estimated)

**Without Optimizations**:
- **TTI**: ~5.2s (❌ Target: <3.5s)
- **Bundle Size**: ~1.2MB gzipped (❌ Target: <500KB)
- **FCP**: ~2.1s (❌ Target: <1.8s)
- **LCP**: ~3.8s (❌ Target: <2.5s)
- **Scroll Performance**: 30fps with 100+ tools (❌ Target: 60fps)

**Critical Path Analysis**:
```
Initial Load:
1. Main bundle download: 1.2MB @ 2.5MB/s = 480ms
2. React hydration: ~300ms
3. Initial queries (servers/tools): ~400ms (parallel)
4. First meaningful paint: ~1.2s

Dashboard Route:
1. Route lazy load: ~150ms
2. Chart libraries load: ~600ms (Monaco NOT needed here!)
3. Stats query: ~200ms
4. Total TTI: ~2.1s from route navigation
```

---

## 2. Optimization Roadmap

### Priority 1: Critical Fixes (Week 1)

#### Task 1.1: Fix Vite Build Configuration
**Impact**: ⚠️ BLOCKER - Cannot measure or optimize without working builds
**Effort**: 1 hour
**Expected Gain**: Enables all other optimizations

**Actions**:
1. Fix alias resolution in `vite.config.ts`
2. Add missing alias for `@utils`
3. Verify production build works
4. Generate baseline bundle stats

**Implementation**:
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
    '@utils': path.resolve(__dirname, 'src/ui/utils'), // MISSING!
  },
}
```

#### Task 1.2: Bundle Analysis Setup
**Impact**: 🎯 Provides data for all optimizations
**Effort**: 2 hours
**Expected Gain**: Visibility into actual bundle composition

**Actions**:
1. Install `rollup-plugin-visualizer`
2. Configure bundle analysis in `vite.config.ts`
3. Generate and analyze bundle report
4. Identify actual heavy dependencies
5. Create optimization priority list

**Implementation**:
```bash
bun add -D rollup-plugin-visualizer
```

```typescript
// vite.config.ts
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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material'],
          'vendor-query': ['@tanstack/react-query'],
        }
      }
    }
  }
});
```

### Priority 2: Heavy Dependencies Lazy Loading (Week 1)

#### Task 2.1: Monaco Editor Lazy Loading
**Impact**: 📉 ~2.8MB reduction (60% of total!)
**Effort**: 3 hours
**Expected Gain**: 40% bundle reduction, 1.5s faster initial load

**Current State**: Monaco imported in RawJsonEditor.tsx (already has lazy loading!)
**Optimization**: Already partially done, but improve further

**Actions**:
1. ✅ Monaco already lazy loaded in RawJsonEditor (lines 4-7)
2. Ensure Monaco worker files are properly chunked
3. Add preload hint for ConfigPage Raw JSON tab
4. Test Monaco loads only when tab activated

**Additional Config**:
```typescript
// vite.config.ts - Monaco optimization
build: {
  rollupOptions: {
    output: {
      manualChunks: (id) => {
        // Monaco editor in separate chunk
        if (id.includes('monaco-editor')) {
          return 'monaco-vendor';
        }
      }
    }
  }
}
```

#### Task 2.2: Charts Lazy Loading
**Impact**: 📉 ~450KB reduction
**Effort**: 2 hours
**Expected Gain**: 10% bundle reduction

**Current State**: Charts already lazy loaded in DashboardPage.tsx! (lines 27-28)
**Optimization**: ✅ Already implemented correctly

**Verify**:
- ToolPieChart lazy loaded (line 27)
- CacheLineChart lazy loaded (line 28)
- Suspense boundaries with fallbacks (lines 30-54)

#### Task 2.3: Diff Viewer Lazy Loading
**Impact**: 📉 ~180KB reduction
**Effort**: 1 hour
**Expected Gain**: 4% bundle reduction

**Current State**: Imported directly in ConfigPreviewDialog.tsx (line 14)
**Action Required**: Convert to lazy loaded component

**Implementation**:
```typescript
// ConfigPreviewDialog.tsx - Lazy load diff viewer
import { Suspense, lazy } from 'react';

const ReactDiffViewer = lazy(() => import('react-diff-viewer-continued'));

const DiffFallback = () => (
  <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <CircularProgress aria-label="Loading diff viewer" />
  </Box>
);

// In render:
<Suspense fallback={<DiffFallback />}>
  <ReactDiffViewer
    oldValue={currentJson}
    newValue={proposedJson}
    // ... props
  />
</Suspense>
```

### Priority 3: Virtualization (Week 2)

#### Task 3.1: Tools Table Virtualization
**Impact**: 🚀 60fps scroll with 200+ tools (currently 30fps with 100+)
**Effort**: 6 hours
**Expected Gain**: 3x scroll performance, 80% memory reduction for large tables

**Actions**:
1. Install `@tanstack/react-virtual`
2. Replace MUI Table with virtualized implementation
3. Maintain filtering and sorting functionality
4. Add windowing with 20-row buffer

**Implementation Strategy**:
```typescript
// ToolsTable.tsx - Virtualized version
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

const ToolsTable = ({ tools, loading }: ToolsTableProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // ... existing filtering logic

  const virtualizer = useVirtualizer({
    count: filteredTools.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 53, // Row height in pixels
    overscan: 10, // Render 10 extra rows above/below viewport
  });

  return (
    <Box>
      {/* ... filters ... */}

      <TableContainer
        ref={parentRef}
        sx={{ height: 600, overflow: 'auto' }}
      >
        <Table>
          <TableHead>
            {/* ... headers ... */}
          </TableHead>
          <TableBody sx={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const tool = filteredTools[virtualRow.index];
              return (
                <TableRow
                  key={`${tool.server}-${tool.name}`}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {/* ... cells ... */}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
```

**Performance Gains**:
- **Before**: Render 200 rows = 200 DOM nodes = ~500ms + 30fps scroll
- **After**: Render 20 rows (10 visible + 10 overscan) = 20 DOM nodes = ~50ms + 60fps scroll
- **Memory**: 90% reduction in DOM nodes

#### Task 3.2: Servers Table Optimization (Optional)
**Impact**: 🔧 Minor (10-25 rows typical)
**Effort**: 2 hours
**Expected Gain**: Minimal - only worthwhile if >50 servers

**Decision**: Skip unless users report >50 servers scenario

### Priority 4: Component Memoization (Week 2)

#### Task 4.1: Memoize Expensive Components
**Impact**: 📉 30-50% reduction in unnecessary re-renders
**Effort**: 4 hours
**Expected Gain**: Smoother UI, lower CPU usage

**Components to Memoize**:

1. **ServersTable.tsx**:
```typescript
import { memo } from 'react';

const ServersTable = memo(({ servers, loading, onRefresh, onToggle, onRestart }: ServersTableProps) => {
  // ... component logic
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if servers array actually changed
  return (
    prevProps.servers === nextProps.servers &&
    prevProps.loading === nextProps.loading
  );
});

export default ServersTable;
```

2. **MetricCard.tsx**:
```typescript
export default memo(MetricCard, (prev, next) => {
  return prev.value === next.value && prev.subtitle === next.subtitle;
});
```

3. **ActiveFiltersCard.tsx**:
```typescript
export default memo(ActiveFiltersCard, (prev, next) => {
  return prev.stats === next.stats;
});
```

#### Task 4.2: Optimize Callback Functions
**Impact**: 🔧 Prevent child re-renders
**Effort**: 2 hours

**ServersTable.tsx - Fix inline functions**:
```typescript
// BEFORE (creates new functions on every render):
{servers.map((server) => (
  <TableRow key={server.name}>
    <Switch onChange={(event) => onToggle(server, event.target.checked)} />
    <IconButton onClick={() => onRestart(server)} />
  </TableRow>
))}

// AFTER (stable references):
const ServerRow = memo(({ server, onToggle, onRestart }) => {
  const handleToggle = useCallback(
    (event) => onToggle(server, event.target.checked),
    [server, onToggle]
  );

  const handleRestart = useCallback(
    () => onRestart(server),
    [server, onRestart]
  );

  return (
    <TableRow>
      <Switch onChange={handleToggle} />
      <IconButton onClick={handleRestart} />
    </TableRow>
  );
});
```

### Priority 5: Bundle Optimization (Week 3)

#### Task 5.1: Manual Chunk Splitting
**Impact**: 📦 Faster initial load, better caching
**Effort**: 3 hours
**Expected Gain**: 20% faster subsequent visits

**Strategy**:
```typescript
// vite.config.ts - Optimize chunk splitting
build: {
  rollupOptions: {
    output: {
      manualChunks: (id) => {
        // Vendor chunks (cached across deployments)
        if (id.includes('node_modules')) {
          if (id.includes('react') || id.includes('react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('@mui')) {
            return 'vendor-mui';
          }
          if (id.includes('react-query')) {
            return 'vendor-query';
          }
          if (id.includes('monaco-editor')) {
            return 'vendor-monaco';
          }
          if (id.includes('recharts') || id.includes('@mui/x-charts')) {
            return 'vendor-charts';
          }
          return 'vendor-other';
        }
      },
      // Optimize chunk size
      chunkFileNames: 'assets/[name]-[hash].js',
      assetFileNames: 'assets/[name]-[hash].[ext]',
    }
  },
  chunkSizeWarningLimit: 600, // Warn if chunk >600KB
  target: 'es2020', // Modern browsers only
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true, // Remove console.log in production
      drop_debugger: true,
    },
  },
}
```

#### Task 5.2: Tree Shaking Verification
**Impact**: 🌳 Eliminate unused code
**Effort**: 2 hours
**Expected Gain**: 5-10% bundle reduction

**Actions**:
1. Enable sideEffects in package.json
2. Verify MUI imports use named imports (not `import * as`)
3. Check for unused dependencies

**package.json**:
```json
{
  "sideEffects": [
    "*.css",
    "*.scss"
  ]
}
```

**Code Review**:
```typescript
// GOOD (tree-shakeable):
import { Button, TextField } from '@mui/material';

// BAD (imports everything):
import * as MUI from '@mui/material';
```

#### Task 5.3: Asset Optimization
**Impact**: 🖼️ Faster asset loading
**Effort**: 1 hour
**Expected Gain**: Minor (no large images detected)

**Actions**:
1. Audit for any images/fonts
2. Use WebP for images
3. Subset fonts if custom fonts used
4. Lazy load non-critical assets

---

## 3. Implementation Guides

### 3.1 Code Splitting Best Practices

**Route-Based Splitting** ✅ Already implemented:
```typescript
// App.tsx - CORRECT implementation
const DashboardPage = lazy(() => import("@pages/DashboardPage"));
const ServersPage = lazy(() => import("@pages/ServersPage"));
const ToolsPage = lazy(() => import("@pages/ToolsPage"));
const ConfigPage = lazy(() => import("@pages/ConfigPage"));
```

**Component-Based Splitting** ⚠️ Needs improvement:
```typescript
// Heavy components should be lazy loaded
// BEFORE:
import ReactDiffViewer from 'react-diff-viewer-continued';

// AFTER:
const ReactDiffViewer = lazy(() => import('react-diff-viewer-continued'));
```

**Library-Based Splitting**:
```typescript
// For large utility libraries
const processLargeData = async (data) => {
  const { default: heavyLib } = await import('heavy-library');
  return heavyLib.process(data);
};
```

### 3.2 Virtualization Implementation

**Step-by-Step for ToolsTable**:

1. **Install dependency**:
```bash
bun add @tanstack/react-virtual
```

2. **Setup virtualizer**:
```typescript
const parentRef = useRef<HTMLDivElement>(null);
const virtualizer = useVirtualizer({
  count: filteredTools.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 53, // Measure actual row height
  overscan: 10,
});
```

3. **Render virtual rows**:
```typescript
<TableBody sx={{
  height: `${virtualizer.getTotalSize()}px`,
  position: 'relative'
}}>
  {virtualizer.getVirtualItems().map((virtualRow) => {
    const tool = filteredTools[virtualRow.index];
    return (
      <TableRow
        key={virtualRow.key}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          transform: `translateY(${virtualRow.start}px)`,
        }}
      >
        {/* Cells */}
      </TableRow>
    );
  })}
</TableBody>
```

4. **Test scroll performance**:
- Create test data with 500+ tools
- Verify 60fps scroll with DevTools Performance tab
- Check memory usage doesn't grow with dataset size

### 3.3 Memoization Patterns

**When to use React.memo**:
```typescript
// ✅ Use for components with:
// - Expensive rendering
// - Frequently updated parent
// - Props that rarely change

const ExpensiveComponent = memo(({ data, onAction }) => {
  // Complex rendering logic
}, (prevProps, nextProps) => {
  // Custom comparison (optional)
  return prevProps.data.id === nextProps.data.id;
});
```

**When to use useMemo**:
```typescript
// ✅ Use for:
// - Expensive calculations
// - Filtering/sorting large arrays
// - Derived data

const filteredItems = useMemo(() => {
  return items.filter(item =>
    item.name.toLowerCase().includes(query.toLowerCase())
  );
}, [items, query]);
```

**When to use useCallback**:
```typescript
// ✅ Use for:
// - Event handlers passed to memoized children
// - Dependency arrays of other hooks

const handleClick = useCallback((id: string) => {
  // Action
}, [/* stable dependencies */]);

<MemoizedChild onClick={handleClick} />
```

---

## 4. Performance Budget

### 4.1 Bundle Size Limits

| Route | Target (gzipped) | Current Est. | Budget |
|-------|------------------|--------------|--------|
| **Shared** (React, MUI, Query) | 280KB | ~400KB | ❌ -120KB needed |
| **Dashboard** | 80KB | ~150KB | ❌ -70KB needed |
| **Servers** | 60KB | ~80KB | ⚠️ -20KB needed |
| **Tools** | 70KB | ~90KB | ⚠️ -20KB needed |
| **Config** | 300KB | ~600KB | ❌ -300KB needed (Monaco!) |
| **TOTAL** | 500KB | ~1.2MB | ❌ -700KB needed |

**After Optimizations** (Projected):
- Shared: 280KB (tree shaking, chunk splitting)
- Dashboard: 60KB (charts already lazy)
- Servers: 50KB (memoization)
- Tools: 55KB (virtualization doesn't affect bundle)
- Config: 80KB base + 280KB on-demand Monaco = 360KB total
- **TOTAL: 445KB** ✅ UNDER BUDGET

### 4.2 Performance Metric Budgets

| Metric | Target | Current | After Optimization |
|--------|--------|---------|-------------------|
| **TTI** | <3.5s | ~5.2s | ~2.8s ✅ |
| **FCP** | <1.8s | ~2.1s | ~1.2s ✅ |
| **LCP** | <2.5s | ~3.8s | ~2.1s ✅ |
| **CLS** | <0.1 | ~0.05 | ~0.05 ✅ |
| **Lighthouse** | >90 | ~68 | ~94 ✅ |

### 4.3 Component Render Budgets

| Component | Max Render Time | Current | After Optimization |
|-----------|----------------|---------|-------------------|
| ToolsTable (100 rows) | 50ms | ~500ms | ~50ms ✅ |
| ToolsTable (200 rows) | 50ms | ~1000ms | ~50ms ✅ |
| ServersTable | 30ms | ~80ms | ~30ms ✅ |
| DashboardPage charts | 100ms | ~150ms | ~80ms ✅ |
| ConfigPage Monaco load | 300ms | ~800ms | ~300ms ✅ |

### 4.4 Network Request Limits

**API Calls per Page Load**:
- Dashboard: Max 3 parallel (health, stats, servers) ✅ Already optimized
- Servers: Max 1 (servers) ✅
- Tools: Max 1 (tools) ✅
- Config: Max 1 (config) ✅

**SSE Connection**: 1 persistent connection ✅ Good

---

## 5. Monitoring Strategy

### 5.1 CI/CD Performance Checks

**Bundle Size Monitoring**:
```json
// package.json - Add bundle size check
{
  "scripts": {
    "build:ui": "vite build",
    "build:analyze": "vite build && open dist/bundle-stats.html",
    "test:bundle": "bun run build:ui && node scripts/check-bundle-size.js"
  }
}
```

**scripts/check-bundle-size.js**:
```javascript
import { readFileSync, readdirSync } from 'fs';
import { gzipSync } from 'zlib';
import { join } from 'path';

const distPath = './dist/ui/assets';
const budgets = {
  'vendor-react': 100 * 1024,      // 100KB
  'vendor-mui': 180 * 1024,        // 180KB
  'vendor-monaco': 300 * 1024,     // 300KB (lazy loaded)
  'index': 100 * 1024,             // 100KB main bundle
};

let failed = false;

for (const [name, budget] of Object.entries(budgets)) {
  const files = readdirSync(distPath).filter(f => f.includes(name));

  for (const file of files) {
    const content = readFileSync(join(distPath, file));
    const gzipped = gzipSync(content);
    const size = gzipped.length;

    if (size > budget) {
      console.error(`❌ ${file}: ${(size/1024).toFixed(1)}KB > ${(budget/1024).toFixed(1)}KB budget`);
      failed = true;
    } else {
      console.log(`✅ ${file}: ${(size/1024).toFixed(1)}KB < ${(budget/1024).toFixed(1)}KB budget`);
    }
  }
}

process.exit(failed ? 1 : 0);
```

### 5.2 Lighthouse CI Integration

**Install Lighthouse CI**:
```bash
bun add -D @lhci/cli
```

**lighthouserc.json**:
```json
{
  "ci": {
    "collect": {
      "startServerCommand": "bun run preview:ui",
      "url": ["http://localhost:4173"],
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 0.9}],
        "first-contentful-paint": ["error", {"maxNumericValue": 1800}],
        "largest-contentful-paint": ["error", {"maxNumericValue": 2500}],
        "interactive": ["error", {"maxNumericValue": 3500}],
        "total-byte-weight": ["error", {"maxNumericValue": 512000}]
      }
    }
  }
}
```

**package.json**:
```json
{
  "scripts": {
    "lighthouse": "lhci autorun"
  }
}
```

### 5.3 Runtime Performance Tracking

**Web Vitals Monitoring**:
```typescript
// src/ui/utils/web-vitals.ts
import { onCLS, onFCP, onFID, onLCP, onTTFB } from 'web-vitals';

export function reportWebVitals() {
  onCLS(console.log);
  onFCP(console.log);
  onFID(console.log);
  onLCP(console.log);
  onTTFB(console.log);
}

// In production, send to analytics:
// onLCP(metric => sendToAnalytics(metric));
```

**main.tsx integration**:
```typescript
import { reportWebVitals } from '@utils/web-vitals';

// After React render
if (import.meta.env.PROD) {
  reportWebVitals();
}
```

### 5.4 Performance Regression Detection

**GitHub Actions Workflow**:
```yaml
# .github/workflows/performance.yml
name: Performance Tests

on: [pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Build UI
        run: bun run build:ui

      - name: Check bundle size
        run: bun run test:bundle

      - name: Run Lighthouse CI
        run: bun run lighthouse
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}

      - name: Comment PR with results
        uses: actions/github-script@v6
        with:
          script: |
            // Post bundle size and Lighthouse score to PR
```

---

## 6. Week-by-Week Implementation Plan

### Week 1: Foundation & Quick Wins (Days 1-5)

**Day 1: Build Infrastructure** (4 hours)
- [ ] Fix Vite config path aliases
- [ ] Verify production build works
- [ ] Install and configure bundle analyzer
- [ ] Generate baseline bundle report
- [ ] Document current metrics

**Day 2-3: Heavy Dependencies** (12 hours)
- [ ] Lazy load react-diff-viewer in ConfigPreviewDialog
- [ ] Verify Monaco editor lazy loading
- [ ] Configure manual chunk splitting
- [ ] Test lazy loading works correctly
- [ ] Measure bundle reduction

**Day 4-5: Bundle Optimization** (12 hours)
- [ ] Implement terser minification
- [ ] Tree shaking verification
- [ ] Manual chunk splitting strategy
- [ ] Asset optimization
- [ ] Generate optimized bundle report

**Week 1 Goals**:
- ✅ Working production builds
- ✅ 40% bundle reduction
- ✅ Lighthouse score >85

### Week 2: Performance Deep Dive (Days 6-10)

**Day 6-7: Virtualization** (12 hours)
- [ ] Install @tanstack/react-virtual
- [ ] Implement ToolsTable virtualization
- [ ] Test with 200+ tool dataset
- [ ] Measure scroll performance
- [ ] Fix any scrolling bugs

**Day 8-9: Memoization** (12 hours)
- [ ] Add React.memo to ServersTable
- [ ] Add React.memo to MetricCard
- [ ] Add React.memo to ActiveFiltersCard
- [ ] Fix inline functions in ServersTable
- [ ] Optimize callback stability
- [ ] Profile re-render reduction

**Day 10: Testing & Validation** (6 hours)
- [ ] Load test with large datasets
- [ ] Performance profiling
- [ ] Fix any regressions
- [ ] Document optimizations

**Week 2 Goals**:
- ✅ 60fps scroll with 200+ tools
- ✅ 30% reduction in re-renders
- ✅ Lighthouse score >90

### Week 3: Monitoring & Polish (Days 11-15)

**Day 11-12: CI/CD Integration** (12 hours)
- [ ] Setup bundle size checks
- [ ] Configure Lighthouse CI
- [ ] Create GitHub Actions workflow
- [ ] Document performance budgets

**Day 13: Web Vitals** (6 hours)
- [ ] Implement web-vitals tracking
- [ ] Add performance monitoring
- [ ] Create performance dashboard (optional)

**Day 14-15: Documentation & Training** (12 hours)
- [ ] Write performance guide
- [ ] Create optimization checklist
- [ ] Document monitoring strategy
- [ ] Team knowledge transfer

**Week 3 Goals**:
- ✅ Automated performance monitoring
- ✅ Performance budget enforcement
- ✅ Complete documentation

---

## 7. Success Metrics & Validation

### 7.1 Quantitative Metrics

**Bundle Size**:
- Before: ~1.2MB gzipped
- Target: <500KB gzipped
- Expected: ~445KB gzipped
- **Success**: ✅ 63% reduction

**Time to Interactive**:
- Before: ~5.2s
- Target: <3.5s
- Expected: ~2.8s
- **Success**: ✅ 46% improvement

**Lighthouse Score**:
- Before: ~68
- Target: >90
- Expected: ~94
- **Success**: ✅ 38% improvement

**Scroll Performance**:
- Before: 30fps with 100 tools
- Target: 60fps with 200 tools
- Expected: 60fps with 500+ tools
- **Success**: ✅ 2x capacity, 2x framerate

### 7.2 Qualitative Metrics

**Developer Experience**:
- Bundle analysis integrated in CI/CD
- Performance budgets enforced
- Optimization patterns documented
- Monitoring alerts configured

**User Experience**:
- Faster initial page load
- Smoother scrolling
- Responsive interactions
- No visual regressions

### 7.3 Validation Checklist

**Build & Bundle**:
- [ ] Production build completes without errors
- [ ] Bundle size report generated
- [ ] All bundles under budget
- [ ] Tree shaking verified
- [ ] Chunk splitting optimal

**Runtime Performance**:
- [ ] TTI <3.5s on 3G throttled
- [ ] FCP <1.8s
- [ ] LCP <2.5s
- [ ] 60fps scroll with 200+ tools
- [ ] No layout shifts

**Monitoring**:
- [ ] Bundle size checks in CI
- [ ] Lighthouse CI configured
- [ ] Web vitals tracking
- [ ] Performance regression detection
- [ ] Alerts configured

**Documentation**:
- [ ] Performance guide complete
- [ ] Optimization checklist created
- [ ] Monitoring strategy documented
- [ ] Team trained on best practices

---

## 8. Risk Mitigation

### 8.1 Potential Risks

**Risk 1: Virtualization Breaks Accessibility**
- **Likelihood**: Medium
- **Impact**: High
- **Mitigation**:
  - Use semantic HTML with proper ARIA
  - Test with screen readers
  - Maintain keyboard navigation
  - Add skip links for long tables

**Risk 2: Lazy Loading Causes UI Jank**
- **Likelihood**: Low
- **Impact**: Medium
- **Mitigation**:
  - Proper Suspense boundaries
  - Skeleton loaders for fallbacks
  - Preload on route hover
  - Test on slow connections

**Risk 3: Over-Memoization Hurts Readability**
- **Likelihood**: Medium
- **Impact**: Low
- **Mitigation**:
  - Document why components are memoized
  - Only memoize expensive components
  - Keep comparison functions simple
  - Code review all memo usage

**Risk 4: Bundle Splitting Breaks Offline Usage**
- **Likelihood**: Low
- **Impact**: Low
- **Mitigation**:
  - This is a local server UI, not PWA
  - Chunks load from same origin
  - Service worker not required

### 8.2 Rollback Plan

**If optimizations cause regressions**:
1. Revert to previous commit
2. Identify specific optimization causing issue
3. Disable that optimization only
4. Re-test and validate
5. Fix and re-deploy

**Feature flags for gradual rollout**:
```typescript
// config.ts
export const FEATURES = {
  VIRTUALIZATION: import.meta.env.VITE_ENABLE_VIRTUALIZATION !== 'false',
  LAZY_MONACO: import.meta.env.VITE_ENABLE_LAZY_MONACO !== 'false',
};

// Usage
{FEATURES.VIRTUALIZATION ? <VirtualizedTable /> : <StandardTable />}
```

---

## 9. Next Steps

### Immediate Actions (This Week)

1. **Fix Vite Config** (Priority: CRITICAL)
   - Add missing `@utils` alias
   - Verify production build
   - Generate baseline metrics

2. **Install Bundle Analyzer** (Priority: HIGH)
   - Install rollup-plugin-visualizer
   - Generate bundle report
   - Identify actual heavy dependencies

3. **Lazy Load Diff Viewer** (Priority: HIGH)
   - Quick win: ~180KB reduction
   - 1 hour implementation
   - Test ConfigPreviewDialog

### Long-Term Optimizations (Post Phase 4)

1. **Server-Side Rendering** (if needed)
   - Only if SEO required
   - Would improve FCP further
   - Not priority for admin UI

2. **Progressive Web App** (optional)
   - Offline capability
   - Install to home screen
   - Push notifications
   - Low priority for server admin tool

3. **Advanced Caching** (future)
   - Service worker for assets
   - IndexedDB for large data
   - Background sync
   - Only if offline usage required

---

## 10. Conclusion

**Current State**: Functional UI with performance gaps
**Target State**: Highly optimized, production-ready UI
**Path Forward**: 3-week optimization sprint

**Key Takeaways**:
1. **Biggest Impact**: Lazy loading heavy dependencies (Monaco, Diff, Charts)
2. **Best ROI**: Virtualization for large tables
3. **Foundation**: Fix Vite config first (enables all other work)
4. **Monitoring**: CI/CD integration prevents regressions

**Expected Outcomes**:
- 63% smaller bundles
- 46% faster load times
- 2x scroll performance
- Lighthouse score >90

**Confidence Level**: HIGH - All optimizations are well-established patterns with proven results.

---

**Next Actions**: Review this strategy, fix Vite config, start Week 1 implementation.
