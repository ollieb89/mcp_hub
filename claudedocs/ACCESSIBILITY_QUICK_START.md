# MCP Hub UI - Accessibility Quick Start Guide

**Goal**: Get started with accessibility improvements in 30 minutes
**Target**: Frontend developers ready to implement Phase 4

---

## 1. Install Dependencies (5 minutes)

```bash
# Navigate to project
cd /home/ob/Development/Tools/mcp-hub

# Install accessibility testing tools
bun add -D @axe-core/react vitest-axe eslint-plugin-jsx-a11y

# Verify installation
bun list | grep -E "axe|jsx-a11y"
```

**Expected Output**:
```
@axe-core/react@4.x.x
vitest-axe@0.x.x
eslint-plugin-jsx-a11y@6.x.x
```

---

## 2. Configure ESLint (5 minutes)

**Edit**: `eslint.config.js`

```javascript
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  // ... existing config
  {
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...jsxA11y.configs.recommended.rules,
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/img-redundant-alt': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/no-autofocus': 'warn',
    },
  },
];
```

**Test**:
```bash
bunx eslint src/ui --ext .tsx,.ts
```

**Expected**: List of accessibility violations to fix

---

## 3. Create Global Accessibility Styles (5 minutes)

**Create**: `/src/ui/styles/accessibility.css`

```css
/* Visually hidden but accessible to screen readers */
.visually-hidden {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

/* Skip navigation link */
.skip-link {
  position: absolute;
  top: -100px;
  left: 0;
  background: #6C5CE7;
  color: white;
  padding: 8px 16px;
  text-decoration: none;
  border-radius: 0 0 4px 0;
  font-weight: 600;
  z-index: 10000;
  transition: top 0.3s ease;
}

.skip-link:focus {
  top: 0;
  outline: 2px solid #8B7FF5;
  outline-offset: 2px;
}

/* Global focus indicators */
[tabindex]:focus-visible {
  outline: 2px solid #8B7FF5;
  outline-offset: 2px;
  border-radius: 4px;
}
```

**Import in**: `/src/ui/main.tsx`

```tsx
import './styles/accessibility.css';
```

---

## 4. Add Skip Navigation (5 minutes)

**Edit**: `/src/ui/App.tsx`

```tsx
const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* ADD THIS: Skip navigation link */}
    <a href="#main-content" className="skip-link">
      Skip to main content
    </a>

    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <Box component="main" sx={{ flex: 1 }}>
        <Header />
        <Toolbar sx={{ minHeight: 64 }} />

        {/* ADD THIS: ID and tabindex */}
        <Box
          id="main-content"
          component="section"
          tabIndex={-1}
          sx={{ flex: 1, p: 3, overflow: "auto" }}
        >
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* ... */}
            </Routes>
          </Suspense>
        </Box>
      </Box>
    </Box>
  </QueryClientProvider>
);
```

**Test**:
1. Start dev server: `bun run dev:ui`
2. Open http://localhost:5173
3. Press `Tab` once
4. Verify "Skip to main content" appears
5. Press `Enter`
6. Verify focus moves to main content

---

## 5. Fix Header Accessibility (10 minutes)

**Edit**: `/src/ui/components/Header.tsx`

```tsx
const Header = () => (
  <AppBar
    position="fixed"
    elevation={0}
    sx={{
      zIndex: (theme) => theme.zIndex.drawer + 1,
      backgroundColor: "background.paper",
      color: "text.primary",
      borderBottom: "1px solid",
      borderColor: "divider",
    }}
  >
    <Toolbar sx={{ minHeight: 64, px: 3 }}>
      <Box sx={{ flex: 1 }}>
        <Typography variant="h6" component="h1" fontWeight={600}>
          MCP Hub Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Monitor servers, tools, and filtering in real time.
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} alignItems="center">
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon fontSize="small" />}
          aria-label="Refresh dashboard data"  {/* ADD THIS */}
        >
          Refresh
        </Button>
        <IconButton
          size="small"
          aria-label="View notifications"  {/* ADD THIS */}
        >
          <NotificationsNoneIcon />
        </IconButton>
      </Stack>
    </Toolbar>
  </AppBar>
);
```

**Changes Made**:
1. ✅ Added `aria-label` to Refresh button
2. ✅ Added `aria-label` to Notifications button
3. ✅ Changed Typography to `component="h1"` for proper heading hierarchy

**Test**:
1. Inspect with browser DevTools
2. Verify both buttons have accessible names
3. Run: `bunx eslint src/ui/components/Header.tsx`
4. Verify: 0 accessibility warnings

---

## 6. Write First Accessibility Test (5 minutes)

**Create**: `/src/ui/components/__tests__/Header.a11y.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'vitest-axe';
import { ThemeProvider } from '@mui/material/styles';
import theme from '@/theme';
import Header from '../Header';

expect.extend(toHaveNoViolations);

describe('Header - Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <Header />
      </ThemeProvider>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have accessible button labels', () => {
    const { getAllByRole } = render(
      <ThemeProvider theme={theme}>
        <Header />
      </ThemeProvider>
    );

    const buttons = getAllByRole('button');
    buttons.forEach((button) => {
      const label = button.getAttribute('aria-label') || button.textContent;
      expect(label).toBeTruthy();
      expect(label!.trim().length).toBeGreaterThan(0);
    });
  });
});
```

**Run Test**:
```bash
bun test src/ui/components/__tests__/Header.a11y.test.tsx
```

**Expected**: ✅ 2 tests passing

---

## 7. Verification Checklist

After completing steps 1-6, verify:

**Automated**:
- [ ] `bunx eslint src/ui/components/Header.tsx` shows 0 violations
- [ ] `bun test` shows Header.a11y.test passing
- [ ] No console errors in browser

**Manual**:
- [ ] Skip link appears when pressing Tab
- [ ] Skip link disappears after use
- [ ] Main content receives focus after skip
- [ ] All buttons have visible text or aria-label
- [ ] Tab order is logical (sidebar → header → main)

**Screen Reader** (Optional):
- [ ] Screen reader announces page title
- [ ] Screen reader announces button labels
- [ ] Screen reader announces skip link

---

## Next Steps

You've completed the foundational accessibility setup!

**Continue with**:
1. [ACCESSIBILITY_REMEDIATION_PLAN.md](./ACCESSIBILITY_REMEDIATION_PLAN.md) - Week 1, Day 1 tasks
2. [ACCESSIBILITY_CODE_EXAMPLES.md](./ACCESSIBILITY_CODE_EXAMPLES.md) - Copy-paste implementations
3. [ACCESSIBILITY_TESTING_GUIDE.md](./ACCESSIBILITY_TESTING_GUIDE.md) - Comprehensive testing

**Priority Tasks** (Next 2 hours):
1. Fix ServersTable ARIA labels (30 min)
2. Fix ToolsTable ARIA labels (30 min)
3. Add global focus indicators to theme (30 min)
4. Write accessibility tests for tables (30 min)

**Reference**:
- Full audit: [ACCESSIBILITY_AUDIT_REPORT.md](./ACCESSIBILITY_AUDIT_REPORT.md)
- Phase 4 summary: [ACCESSIBILITY_PHASE4_SUMMARY.md](./ACCESSIBILITY_PHASE4_SUMMARY.md)

---

## Common Issues & Solutions

### Issue: ESLint shows "jsx-a11y not found"

**Solution**:
```bash
bun install
bunx eslint --print-config src/ui/App.tsx | grep jsx-a11y
```

### Issue: Tests fail with "axe is not defined"

**Solution**: Create `vitest.setup.ts`:
```typescript
import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'vitest-axe';

expect.extend(toHaveNoViolations);
```

Add to `vitest.config.ts`:
```typescript
export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

### Issue: Skip link doesn't appear

**Solution**: Ensure CSS is imported in `main.tsx`:
```tsx
import './styles/accessibility.css';
```

Clear browser cache and restart dev server.

---

## Quick Commands Reference

```bash
# Run accessibility tests only
bun test -- --grep "a11y"

# Run ESLint on UI
bunx eslint src/ui --ext .tsx,.ts

# Fix auto-fixable issues
bunx eslint src/ui --ext .tsx,.ts --fix

# Start dev server
bun run dev:ui

# Run all tests
bun test

# Check test coverage
bun test -- --coverage
```

---

## Time Estimate Validation

If you completed all steps in **≤30 minutes**, you're ready for Week 1!

If it took **>30 minutes**:
- Review steps 1-3 (should be <15 min total)
- Familiarize with MUI component structure
- Read [ACCESSIBILITY_CODE_EXAMPLES.md](./ACCESSIBILITY_CODE_EXAMPLES.md) for patterns

**Questions?** Review the comprehensive guides:
- Audit Report for "what to fix"
- Remediation Plan for "how to fix"
- Code Examples for "copy-paste solutions"
- Testing Guide for "how to validate"
