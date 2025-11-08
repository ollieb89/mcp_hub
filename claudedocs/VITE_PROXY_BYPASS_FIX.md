# Vite Proxy Bypass Fix - Source File Conflict Resolution

## Problem Summary

**Error**: `Failed to load resource: 500 (Internal Server Error) @ http://localhost:5173/api/filtering.ts`

**Symptom**: React DashboardPage component would load briefly then unmount, causing UI to disappear.

**Root Cause**: Vite's module transformation was adding `.ts` extension to transformed imports (e.g., `import { ... } from "@api/filtering"` became `import { ... } from "/api/filtering.ts"`). The `/api` proxy configuration was catching these source file requests and forwarding them to the backend server, which doesn't serve TypeScript files, resulting in 500 errors.

## Technical Details

### Error Chain
1. React component imports: `import { getFilteringStats } from "@api/filtering"`
2. Vite transforms to: `import { getFilteringStats } from "/api/filtering.ts"`
3. Browser requests: `http://localhost:5173/api/filtering.ts`
4. Vite proxy catches `/api` prefix → forwards to `http://localhost:7000/api/filtering.ts`
5. Backend server doesn't handle `.ts` files → 500 Internal Server Error
6. Module load fails → React component crashes → UI unmounts

### Configuration Conflict

**Original proxy configuration (problematic)**:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:7000',
    changeOrigin: true,
  },
  // ... other endpoints
}
```

This configuration proxied **all** requests starting with `/api`, including source files.

## Solution

Added `bypass` function to the proxy configuration to exclude source files from being proxied:

```typescript
// vite.config.ts
export default defineConfig({
  // ... other config
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
        },
      },
      '/events': 'http://localhost:7000',
      '/mcp': 'http://localhost:7000',
      '/messages': 'http://localhost:7000',
    },
  },
});
```

### How bypass Works

The `bypass` function intercepts proxy requests and can:
- Return `null` or `undefined`: Continue with proxy (forward to backend)
- Return a string (URL): Bypass proxy and serve the request locally

In our case:
- Requests to `/api/filtering.ts` → bypass returns `/api/filtering.ts` → Vite serves the file
- Requests to `/api/filtering/stats` → bypass returns nothing → proxied to backend

## Verification

**Before Fix**:
```
GET http://localhost:5173/api/filtering.ts → 500 Internal Server Error
DashboardPage fails to load → UI disappears
```

**After Fix**:
```
GET http://localhost:5173/api/filtering.ts → 200 OK (served by Vite)
GET http://localhost:5173/api/filtering/stats → 200 OK (proxied to backend)
DashboardPage loads successfully → UI stable
```

**Network Request Evidence**:
- `http://localhost:5173/api/filtering.ts` → 200 OK (source file)
- `http://localhost:5173/api/filtering/stats` → 200 OK (API endpoint)
- All other source files with path aliases → 200 OK
- No 500 errors, no module loading failures

## Files Modified

- `vite.config.ts:15-25` - Added `bypass` function to `/api` proxy configuration

## Related Documentation

- [Vite Proxy Configuration](https://vite.dev/config/server-options.html#server-proxy)
- [Vite Module Resolution](https://vite.dev/guide/features.html#typescript)
- Previous fix: `VITE_DYNAMIC_IMPORT_FIX.md` (optimizeDeps.exclude for dependency scan)

## Prevention

When configuring Vite proxy with path prefixes that match source file paths:
1. Use `bypass` function to exclude source files (`.ts`, `.tsx`, `.js`, `.jsx`)
2. Consider using unique API path prefixes (e.g., `/rest-api` instead of `/api`)
3. Test both source file loading and API endpoint proxying after configuration changes
4. Use browser DevTools Network tab to verify correct routing

## Additional Issue: MUI X Charts Library Bug

**Error**: `TypeError: createSelector expects all input-selectors to be functions, but received the following types: [function selector(), function selector(), function selector(), function selectorChartControlledCartesianAxisHighlight(), function selector(), function selector(), undefined]`

**Symptom**: After fixing the proxy bypass, dashboard still showed "Loading page content" indefinitely with charts failing to render.

**Root Cause**: MUI X Charts v8.16.0 had a bug in the `createSelector` function that caused chart components to crash during rendering.

**Solution**: Updated `@mui/x-charts` from v8.16.0 to v8.17.0:

```bash
bun update @mui/x-charts
```

**Result**: Charts render successfully, dashboard fully functional with:
- Tool Distribution pie chart
- Cache Performance line chart
- All metrics and filtering cards
- Live log streaming

## Files Modified

- `vite.config.ts:15-25` - Added `bypass` function to `/api` proxy configuration
- `package.json` - Updated `@mui/x-charts` from ^8.16.0 to ^8.17.0

## Date
2025-11-08
