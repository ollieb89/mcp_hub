# Vite Dynamic Import Fix - DashboardPage Resolution Issue

## Problem Summary

**Error**: `Uncaught TypeError: Failed to fetch dynamically imported module: http://localhost:5173/pages/DashboardPage.tsx`

**Root Cause**: Vite's dependency scanner was attempting to pre-bundle project source files that use path aliases (`@pages`, `@components`, `@theme`, etc.) as if they were external npm packages.

## Technical Details

### Error Chain
1. React Router uses `React.lazy()` to dynamically import DashboardPage
2. Vite sees `import("@pages/DashboardPage")` during dependency scan
3. Vite misinterprets `@pages` as an npm package (due to `@` prefix convention)
4. Pre-bundling fails because `@pages` is not in `node_modules`
5. Runtime module fetch fails with 404-like behavior

### Configuration Issue

The `vite.config.ts` had path aliases defined:
```typescript
resolve: {
  alias: {
    '@pages': path.resolve(__dirname, 'src/ui/pages'),
    // ... other aliases
  },
}
```

However, Vite's dependency scanner runs **before** alias resolution during pre-bundling, causing it to search for these as external dependencies.

## Solution

Added `optimizeDeps.exclude` configuration to explicitly tell Vite not to pre-bundle project source code paths:

```typescript
// vite.config.ts
export default defineConfig({
  // ... other config
  optimizeDeps: {
    // Exclude these from pre-bundling since they're project source files
    exclude: ['@ui', '@api', '@components', '@pages', '@hooks', '@theme'],
  },
});
```

## Verification

**Before Fix**:
```
(!) Failed to run dependency scan. Skipping dependency pre-bundling.
Error: The following dependencies are imported but could not be resolved:
  @theme (imported by /home/ob/Development/Tools/mcp-hub/src/ui/main.tsx)
  @components/Sidebar (imported by /home/ob/Development/Tools/mcp-hub/src/ui/App.tsx)
  @components/Header (imported by /home/ob/Development/Tools/mcp-hub/src/ui/App.tsx)
  @pages/DashboardPage (imported by /home/ob/Development/Tools/mcp-hub/src/ui/App.tsx)
```

**After Fix**:
```
VITE v7.1.12  ready in 143 ms
  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose

✨ new dependencies optimized: @mui/material/styles, @mui/icons-material/...
✨ optimized dependencies changed. reloading
```

Server responds with HTTP 200 and DashboardPage module loads correctly.

## Files Modified

- `vite.config.ts:32-35` - Added `optimizeDeps.exclude` configuration

## Testing

```bash
# Clear Vite cache and restart
rm -rf node_modules/.vite
bun vite dev

# Verify server responds
curl -I http://localhost:5173
# HTTP/1.1 200 OK

# Verify DashboardPage module loads
curl -s "http://localhost:5173/pages/DashboardPage.tsx" | head -10
# Should return transformed module code, not 404
```

## Related Documentation

- [Vite Dependency Pre-Bundling](https://vite.dev/guide/dep-pre-bundling.html)
- [Vite optimizeDeps.exclude](https://vite.dev/config/dep-optimization-options.html#optimizedeps-exclude)
- [React Router Code Splitting](https://reactrouter.com/en/main/guides/code-splitting)

## Prevention

When adding new path aliases to `vite.config.ts`, remember to:
1. Add the alias to `resolve.alias`
2. Add the same alias to `optimizeDeps.exclude`
3. Keep TypeScript `tsconfig.json` paths in sync

## Date
2025-11-08
