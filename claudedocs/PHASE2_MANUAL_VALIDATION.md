# Phase 2 Manual UI Validation Checklist

## Server Startup Instructions

```bash
# Terminal 1: Start MCP Hub backend
bun start

# Terminal 2 (optional): Start Vite dev server for hot-reload
bun run dev:ui

# Access: http://localhost:7000
```

## Pre-Flight Checks

### 1. Build Verification
- [x] Production build completed successfully (6.79s)
- [x] 3 vendor chunks generated:
  - react-core-*.js (16.33 KB gzipped)
  - mui-core-*.js (48.66 KB gzipped)
  - state-utils-*.js (23.89 KB gzipped)
- [x] Lazy chunks present:
  - ChartsWrapper-*.js (61.01 KB gzipped)
  - ConfigPage-*.js (18.10 KB gzipped)
- [x] All size-limit checks passing
- [x] Test suite: 433/562 passing (baseline maintained)

### 2. Browser DevTools Setup
Before testing, open DevTools:
1. Press F12 or Ctrl+Shift+I
2. Go to Network tab
3. Check "Disable cache" for accurate testing
4. Clear existing cache (Ctrl+Shift+Del)

## UI Validation Tests

### Dashboard Page (/)

**Initial Load - Empty Cache:**
- [ ] Page loads without errors
- [ ] Network tab shows parallel chunk loading:
  - [ ] react-core-*.js loads
  - [ ] mui-core-*.js loads
  - [ ] state-utils-*.js loads
  - [ ] index-*.js (main app) loads
  - [ ] DashboardPage-*.js loads
- [ ] Charts load dynamically:
  - [ ] ChartsWrapper-*.js lazy loads when needed
  - [ ] Tool Distribution Pie Chart renders
  - [ ] Cache Performance Line Chart renders
- [ ] Statistics display correctly:
  - [ ] Total servers count
  - [ ] Active tools count
  - [ ] Tool filtering stats (if configured)
- [ ] SSE connection establishes (check Console for "SSE Connected")
- [ ] Real-time updates work (server status changes reflect)

**Performance Checks:**
- [ ] Initial page render < 2 seconds
- [ ] Charts render smoothly (no lag)
- [ ] No console errors or warnings
- [ ] No chunk loading failures

### Servers Page (/servers)

**Functionality:**
- [ ] Page loads without errors
- [ ] Server list displays correctly
- [ ] Server cards show:
  - [ ] Server name
  - [ ] Status (connected/disconnected)
  - [ ] Tool count
  - [ ] Resource count
- [ ] Action buttons work:
  - [ ] Start button (if server stopped)
  - [ ] Stop button (if server running)
  - [ ] Restart button
- [ ] Status updates via SSE (real-time)
- [ ] Filtering/search works (if present)

**Performance:**
- [ ] Page render < 1 second
- [ ] Button clicks responsive
- [ ] No UI freezing during operations

### Config Page (/config)

**Editor Loading:**
- [ ] Page loads without errors
- [ ] Monaco editor lazy loads:
  - [ ] ConfigPage-*.js chunk loads in Network tab
  - [ ] Editor renders correctly
  - [ ] Syntax highlighting works
- [ ] Configuration displays in editor
- [ ] Line numbers visible
- [ ] Scroll works smoothly

**Functionality:**
- [ ] View configuration works
- [ ] Edit mode (if enabled):
  - [ ] Changes can be made
  - [ ] Save button works
  - [ ] Validation works
- [ ] No editor initialization errors

**Performance:**
- [ ] Editor loads < 2 seconds
- [ ] Typing has no lag
- [ ] Large configs scroll smoothly

### Tools Page (/tools)

**Display:**
- [ ] Page loads without errors
- [ ] Tool list displays
- [ ] Tool cards show:
  - [ ] Tool name
  - [ ] Server name (namespaced)
  - [ ] Description
  - [ ] Input schema
- [ ] Filtering works:
  - [ ] Search by name
  - [ ] Filter by server
  - [ ] Category filters (if present)
- [ ] Tool details expand/collapse

**Performance:**
- [ ] List renders < 1 second
- [ ] Filtering is instant
- [ ] Scrolling smooth with many tools

## Cache Behavior Testing

### Test 1: Hard Refresh (Empty Cache)
1. Clear browser cache (Ctrl+Shift+Del)
2. Visit http://localhost:7000
3. Check Network tab:
   - [ ] All chunks download
   - [ ] Parallel loading observed
   - [ ] Total download < 270 KB gzipped

### Test 2: Normal Reload (Cache Enabled)
1. Uncheck "Disable cache" in DevTools
2. Reload page (F5 or Ctrl+R)
3. Check Network tab:
   - [ ] Vendor chunks served from cache (200 from disk cache)
   - [ ] Only app chunks may reload
   - [ ] Significantly faster load time

### Test 3: Code Change Scenario (Simulated)
1. Note current chunk hashes in Network tab
2. Reload page multiple times
3. Verify:
   - [ ] Vendor chunk hashes stable (react-core, mui-core, state-utils)
   - [ ] Same files = same hashes (good caching)

## Browser Console Checks

### Expected Console Output
- [ ] No red errors
- [ ] SSE connection messages present
- [ ] React StrictMode warnings acceptable
- [ ] No chunk loading failures
- [ ] No MUI warnings (tree-shaking working)

### Known Acceptable Warnings
- React 19 StrictMode double-render warnings
- Development-only warnings (if dev:ui mode)

## Network Tab Analysis

### Chunk Loading Pattern
Expected load order:
1. index.html
2. Parallel vendor chunks:
   - react-core-*.js
   - mui-core-*.js
   - state-utils-*.js
3. Main app bundle (index-*.js)
4. Page-specific chunks (DashboardPage, etc.)
5. Lazy chunks on demand:
   - ChartsWrapper-*.js (when charts needed)
   - ConfigPage-*.js (when config page visited)

### Performance Metrics
Target metrics:
- [ ] DOMContentLoaded < 1 second
- [ ] Page Load complete < 3 seconds
- [ ] Largest Contentful Paint (LCP) < 2.5 seconds
- [ ] First Input Delay (FID) < 100ms
- [ ] Cumulative Layout Shift (CLS) < 0.1

## Regression Checks

### Things That Should NOT Break
- [ ] Routing works (all page navigation)
- [ ] SSE real-time updates function
- [ ] Forms and inputs work
- [ ] MUI theme applied correctly
- [ ] Icons display (MUI icons)
- [ ] Tooltips and dialogs work
- [ ] Responsive design intact (try mobile view)

## Known Issues (Pre-existing, Not Phase 2 Related)
- Test failures: 124 fail, 22 errors (documented in codebase)
- Schema export errors (pre-existing)
- These should NOT prevent UI validation

## Phase 2 Success Criteria

All checks must pass:
- [x] Build succeeds with 3 vendor chunks
- [x] All size-limit checks pass
- [x] Test suite: 433 passing (baseline maintained)
- [ ] All 4 pages functional
- [ ] No new console errors
- [ ] Chunks load in parallel
- [ ] Lazy loading works
- [ ] Cache behavior improved

## Failure Investigation

If any test fails:
1. Check browser console for errors
2. Verify chunk files exist in dist/ui/assets/
3. Check Network tab for 404 or loading errors
4. Validate vite.config.ts changes
5. Ensure babel-plugin-import installed
6. Review size-limit output

## Completion

When all checks pass:
1. Document any observations
2. Capture performance metrics
3. Note cache hit rates
4. Prepare Phase 3 recommendations
