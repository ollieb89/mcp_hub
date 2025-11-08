# MCP Hub UI Accessibility Remediation Plan

**Timeline**: 4 weeks
**Target**: WCAG 2.1 AA Compliance (95%+)
**Resources**: 1 Frontend Developer (Full-time)

---

## Week 1: Quick Wins & Foundation (40 hours)

### Goals
- Fix all critical ARIA label violations
- Establish global focus indicators
- Add skip navigation
- Set up automated testing infrastructure

### Tasks

#### Day 1-2: ARIA Labels & Semantic HTML (16h)

**1.1 Add ARIA Labels to Icon-Only Buttons** (4h)
- Header.tsx: Notifications button
- ServersTable.tsx: Restart buttons
- ToolsTable.tsx: Clear search button
- All components: Loading spinners

**Files to Edit**:
- `/src/ui/components/Header.tsx`
- `/src/ui/components/ServersTable.tsx`
- `/src/ui/components/ToolsTable.tsx`

**Example**:
```tsx
// Before
<IconButton size="small">
  <NotificationsNoneIcon />
</IconButton>

// After
<IconButton size="small" aria-label="View notifications">
  <NotificationsNoneIcon />
</IconButton>
```

**1.2 Add Table Captions & Labels** (4h)
- ServersTable.tsx: Add descriptive caption
- ToolsTable.tsx: Add descriptive caption
- Add visually-hidden class

**Example**:
```tsx
<Table size="small" aria-label="Connected MCP servers">
  <caption className="visually-hidden">
    List of {servers.length} connected servers with status and controls
  </caption>
  {/* ... */}
</Table>
```

**1.3 Add Landmark Labels** (4h)
- App.tsx: Main content region
- Sidebar.tsx: Navigation landmark
- DashboardPage.tsx: Article landmark
- All pages: Section landmarks

**1.4 Fix Heading Hierarchy** (4h)
- DashboardPage.tsx: h5 → h1
- ServersPage.tsx: h5 → h1
- ToolsPage.tsx: h5 → h1
- ConfigPage.tsx: h5 → h1
- Add visually-hidden h2 for sections

#### Day 3: Global Focus Indicators & Skip Navigation (8h)

**1.5 Enhance Theme with Focus Styles** (4h)

**File**: `/src/ui/theme/index.ts`

```typescript
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#6C5CE7",
      light: "#8B7FF5", // NEW: For better text contrast
    },
    secondary: {
      main: "#00CEC9",
    },
    background: {
      default: "#121212",
      paper: "#1E1E28",
    },
    text: {
      disabled: "#888888", // NEW: Improved contrast
    },
  },
  typography: {
    fontFamily: "Inter, system-ui, sans-serif",
  },
  components: {
    // NEW: Global focus indicators
    MuiButtonBase: {
      defaultProps: {
        disableRipple: false,
      },
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: '2px solid #8B7FF5',
            outlineOffset: '2px',
            borderRadius: '4px',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: '2px solid #8B7FF5',
            outlineOffset: '2px',
            borderRadius: '50%',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: '2px solid #8B7FF5',
            outlineOffset: '-2px',
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: '2px solid #8B7FF5',
            outlineOffset: '2px',
          },
        },
      },
    },
  },
});

export default theme;
```

**1.6 Add Global CSS for Accessibility** (2h)

**New File**: `/src/ui/styles/accessibility.css`

```css
/* Visually hidden but accessible to screen readers */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Skip navigation link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #6C5CE7;
  color: white;
  padding: 8px 16px;
  text-decoration: none;
  border-radius: 0 0 4px 0;
  z-index: 10000;
  transition: top 0.2s ease;
}

.skip-link:focus {
  top: 0;
  outline: 2px solid #8B7FF5;
  outline-offset: 2px;
}

/* Focus visible for custom elements */
[tabindex]:focus-visible {
  outline: 2px solid #8B7FF5;
  outline-offset: 2px;
}
```

**Import in main.tsx**:
```typescript
import './styles/accessibility.css';
```

**1.7 Add Skip Navigation** (2h)

**File**: `/src/ui/App.tsx`

```tsx
const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* NEW: Skip navigation link */}
    <a href="#main-content" className="skip-link">
      Skip to main content
    </a>

    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <Box component="main" sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Header />
        <Toolbar sx={{ minHeight: 64 }} />
        <Box
          id="main-content" // NEW: Skip link target
          component="section"
          tabIndex={-1} // NEW: Programmatically focusable
          sx={{ flex: 1, p: 3, overflow: "auto" }}
        >
          {/* ... */}
        </Box>
      </Box>
    </Box>
  </QueryClientProvider>
);
```

#### Day 4-5: Automated Testing Setup (16h)

**1.8 Install Accessibility Testing Tools** (2h)

```bash
bun add -D @axe-core/react jest-axe eslint-plugin-jsx-a11y
bun add -D @testing-library/jest-dom vitest-axe
```

**1.9 Configure ESLint for Accessibility** (2h)

**File**: `eslint.config.js`

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
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/img-redundant-alt': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/no-autofocus': 'warn',
    },
  },
];
```

**1.10 Create Vitest Accessibility Helpers** (4h)

**New File**: `/src/ui/utils/test-helpers/accessibility.ts`

```typescript
import { axe, toHaveNoViolations } from 'vitest-axe';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import theme from '@/theme';
import type { RenderResult } from '@testing-library/react';

expect.extend(toHaveNoViolations);

/**
 * Render component with theme and run axe accessibility tests
 */
export async function renderAndTestA11y(
  component: React.ReactElement,
  options?: {
    rules?: Record<string, { enabled: boolean }>;
  }
): Promise<{ container: HTMLElement; results: any }> {
  const { container } = render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );

  const results = await axe(container, {
    rules: options?.rules || {
      'color-contrast': { enabled: true },
      'label': { enabled: true },
      'aria-required-attr': { enabled: true },
    },
  });

  return { container, results };
}

/**
 * Test keyboard navigation
 */
export function testKeyboardNavigation(
  element: HTMLElement,
  expectedFocusableElements: number
): void {
  const focusableElements = element.querySelectorAll(
    'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  expect(focusableElements).toHaveLength(expectedFocusableElements);

  // Ensure tab order is logical
  focusableElements.forEach((el, index) => {
    const tabIndex = el.getAttribute('tabindex');
    if (tabIndex && tabIndex !== '0') {
      console.warn(`Element ${index} has explicit tabindex: ${tabIndex}`);
    }
  });
}
```

**1.11 Write Accessibility Tests for Components** (8h)

**New File**: `/src/ui/components/__tests__/Header.a11y.test.tsx`

```typescript
import { describe, it, expect } from 'vitest';
import { renderAndTestA11y } from '@/utils/test-helpers/accessibility';
import Header from '../Header';

describe('Header - Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { results } = await renderAndTestA11y(<Header />);
    expect(results).toHaveNoViolations();
  });

  it('should have proper landmark roles', async () => {
    const { container } = await renderAndTestA11y(<Header />);
    const banner = container.querySelector('[role="banner"]');
    expect(banner).toBeInTheDocument();
  });

  it('should have accessible button labels', async () => {
    const { container } = await renderAndTestA11y(<Header />);
    const buttons = container.querySelectorAll('button');

    buttons.forEach((button) => {
      const label = button.getAttribute('aria-label') || button.textContent;
      expect(label).toBeTruthy();
      expect(label.trim().length).toBeGreaterThan(0);
    });
  });
});
```

**Similar test files**:
- `ServersTable.a11y.test.tsx`
- `ToolsTable.a11y.test.tsx`
- `ConfigTabs.a11y.test.tsx`
- `Sidebar.a11y.test.tsx`

### Week 1 Deliverables

- ✅ All icon-only buttons have ARIA labels
- ✅ Tables have descriptive captions
- ✅ Landmarks properly labeled
- ✅ Heading hierarchy fixed
- ✅ Global focus indicators implemented
- ✅ Skip navigation added
- ✅ Automated testing infrastructure set up
- ✅ ESLint accessibility rules enforced
- ✅ 5+ component accessibility tests written

---

## Week 2: Color Contrast & Visual Improvements (40 hours)

### Goals
- Fix all color contrast violations
- Enhance status indicators with non-color encoding
- Improve disabled state visibility
- Audit and fix link contrast

### Tasks

#### Day 1-2: Color Contrast Fixes (16h)

**2.1 Update Theme Colors** (4h)

**File**: `/src/ui/theme/index.ts`

```typescript
const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#6C5CE7",      // Backgrounds only
      light: "#8B7FF5",     // Text/icons (4.8:1 contrast)
      dark: "#5243C2",      // Hover states
    },
    secondary: {
      main: "#00CEC9",
      light: "#1DE4DC",     // Text (5.2:1 contrast)
    },
    text: {
      primary: "#FFFFFF",   // 18.6:1 contrast
      secondary: "#B0B0B0", // 8.2:1 contrast
      disabled: "#888888",  // 4.6:1 contrast (improved)
    },
    action: {
      disabled: "#888888",
      disabledBackground: "#333333",
    },
  },
});
```

**2.2 Audit and Fix Link Contrast** (4h)

**Create Link Component**: `/src/ui/components/common/AccessibleLink.tsx`

```typescript
import { Link as MuiLink, LinkProps } from '@mui/material';

const AccessibleLink = (props: LinkProps) => (
  <MuiLink
    {...props}
    sx={{
      color: 'primary.light', // Use light variant for contrast
      textDecorationColor: 'primary.light',
      '&:hover': {
        color: 'secondary.light',
      },
      '&:focus-visible': {
        outline: '2px solid',
        outlineColor: 'primary.light',
        outlineOffset: '2px',
        borderRadius: '2px',
      },
      ...props.sx,
    }}
  />
);

export default AccessibleLink;
```

**Replace all Link usage**:
- Search: `grep -r "MuiLink\|<Link" src/ui/components`
- Replace with AccessibleLink

**2.3 Add Icons to Status Chips** (8h)

**Create Status Icon Component**: `/src/ui/components/common/StatusIcon.tsx`

```typescript
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import BlockIcon from '@mui/icons-material/Block';

type Status = 'connected' | 'connecting' | 'disconnected' | 'disabled';

interface StatusIconProps {
  status: Status;
  fontSize?: 'small' | 'medium' | 'large';
}

const StatusIcon = ({ status, fontSize = 'small' }: StatusIconProps) => {
  const icons = {
    connected: <CheckCircleIcon fontSize={fontSize} />,
    connecting: <WarningIcon fontSize={fontSize} />,
    disconnected: <ErrorIcon fontSize={fontSize} />,
    disabled: <BlockIcon fontSize={fontSize} />,
  };

  return icons[status] || null;
};

export default StatusIcon;
```

**Update ServersTable.tsx**:

```tsx
import StatusIcon from '@components/common/StatusIcon';

<Chip
  size="small"
  color={statusColor}
  label={server.status}
  icon={<StatusIcon status={server.status} />}
  role="status"
  aria-label={`Server status: ${server.status}`}
/>
```

#### Day 3: Form Control Visibility (8h)

**2.4 Improve Switch Visibility** (4h)

**Update ServersTable.tsx**:

```tsx
<TableCell align="right">
  <FormControlLabel
    control={
      <Switch
        checked={enabled}
        onChange={(event) => onToggle(server, event.target.checked)}
        color="primary"
      />
    }
    label={
      <Typography variant="body2" color="text.secondary">
        {enabled ? 'Enabled' : 'Disabled'}
      </Typography>
    }
    labelPlacement="start"
    sx={{ margin: 0 }}
  />
</TableCell>
```

**2.5 Add Disabled State Indicators** (4h)

**Create Disabled Button Wrapper**: `/src/ui/components/common/AccessibleButton.tsx`

```tsx
import { Button, ButtonProps, Tooltip } from '@mui/material';

interface AccessibleButtonProps extends ButtonProps {
  disabledReason?: string;
}

const AccessibleButton = ({ disabledReason, disabled, ...props }: AccessibleButtonProps) => {
  const button = (
    <Button
      {...props}
      disabled={disabled}
      sx={{
        '&.Mui-disabled': {
          opacity: 0.6,
          cursor: 'not-allowed',
          pointerEvents: 'auto', // Allow tooltip on disabled
        },
        ...props.sx,
      }}
    />
  );

  if (disabled && disabledReason) {
    return (
      <Tooltip title={disabledReason}>
        <span>{button}</span>
      </Tooltip>
    );
  }

  return button;
};

export default AccessibleButton;
```

#### Day 4-5: Visual Testing & Documentation (16h)

**2.6 Contrast Testing Suite** (8h)

**New File**: `/src/ui/utils/test-helpers/contrast-checker.ts`

```typescript
import { hex, score } from 'wcag-contrast';

interface ContrastTest {
  name: string;
  foreground: string;
  background: string;
  expectedRatio: number;
  wcagLevel: 'AA' | 'AAA';
}

const contrastTests: ContrastTest[] = [
  {
    name: 'Primary text on default background',
    foreground: '#FFFFFF',
    background: '#121212',
    expectedRatio: 18.6,
    wcagLevel: 'AAA',
  },
  {
    name: 'Primary button text',
    foreground: '#FFFFFF',
    background: '#6C5CE7',
    expectedRatio: 5.8,
    wcagLevel: 'AA',
  },
  {
    name: 'Link text (light variant)',
    foreground: '#8B7FF5',
    background: '#121212',
    expectedRatio: 4.8,
    wcagLevel: 'AA',
  },
  // ... add all color combinations
];

export function runContrastTests(): void {
  console.log('🎨 Running color contrast tests...\n');

  const results = contrastTests.map((test) => {
    const ratio = hex(test.foreground, test.background);
    const passes = score(ratio) >= test.wcagLevel;

    return {
      ...test,
      actualRatio: ratio,
      passes,
    };
  });

  const failures = results.filter((r) => !r.passes);

  if (failures.length > 0) {
    console.error('❌ Contrast failures:');
    failures.forEach((f) => {
      console.error(`  - ${f.name}: ${f.actualRatio.toFixed(2)}:1 (expected ${f.wcagLevel})`);
    });
    throw new Error(`${failures.length} contrast tests failed`);
  }

  console.log('✅ All contrast tests passed!');
}
```

**2.7 Visual Regression Testing Setup** (4h)

```bash
bun add -D @storybook/react @storybook/addon-a11y
```

**Configure Storybook** (optional but recommended):

**New File**: `.storybook/main.ts`

```typescript
export default {
  stories: ['../src/ui/components/**/*.stories.tsx'],
  addons: [
    '@storybook/addon-a11y', // Accessibility addon
    '@storybook/addon-essentials',
  ],
};
```

**2.8 Document Color System** (4h)

**New File**: `/claudedocs/ACCESSIBILITY_COLOR_SYSTEM.md`

(Document all color combinations, contrast ratios, usage guidelines)

### Week 2 Deliverables

- ✅ All text meets WCAG AA contrast requirements
- ✅ Links use high-contrast color variant
- ✅ Status indicators include icons (not color-only)
- ✅ Disabled states have improved visibility
- ✅ Contrast testing suite implemented
- ✅ Color system documented

---

## Week 3: Dynamic Content & Keyboard Navigation (40 hours)

### Goals
- Implement ARIA live regions for real-time updates
- Add keyboard navigation to tables
- Enhance modal focus management
- Fix loading state announcements

### Tasks

#### Day 1-2: ARIA Live Regions (16h)

**3.1 LogsPanel Real-Time Announcements** (4h)

**File**: `/src/ui/components/LogsPanel.tsx`

```tsx
import { useRef, useEffect } from 'react';

const LogsPanel = ({ logs, loading, onViewAll }: LogsPanelProps) => {
  const latestLogRef = useRef<string>('');
  const [announcement, setAnnouncement] = useState<string>('');

  // Announce new logs to screen readers
  useEffect(() => {
    if (logs.length > 0 && logs[0].timestamp !== latestLogRef.current) {
      latestLogRef.current = logs[0].timestamp;
      const log = logs[0];
      setAnnouncement(
        `New ${log.level || 'info'} log: ${log.message.substring(0, 100)}`
      );
    }
  }, [logs]);

  return (
    <MetricCard {...props}>
      {/* Screen reader announcement for new logs */}
      <div
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions"
        className="visually-hidden"
      >
        {announcement}
      </div>

      {/* Visible log list */}
      <Box
        sx={{ maxHeight: 260, overflow: "auto" }}
        role="region"
        aria-label="Recent log entries"
        tabIndex={0}
      >
        <List dense disablePadding>
          {logs.map((log, index) => (
            <ListItem key={`${log.timestamp}-${index}`}>
              {/* ... */}
            </ListItem>
          ))}
        </List>
      </Box>
    </MetricCard>
  );
};
```

**3.2 Filter Results Announcement** (4h)

**File**: `/src/ui/components/ToolsTable.tsx`

```tsx
const ToolsTable = ({ tools, loading }: ToolsTableProps) => {
  const [filterAnnouncement, setFilterAnnouncement] = useState<string>('');
  const previousCountRef = useRef<number>(0);

  // Announce filter result changes
  useEffect(() => {
    if (filteredTools.length !== previousCountRef.current) {
      previousCountRef.current = filteredTools.length;
      setFilterAnnouncement(
        `${filteredTools.length} ${filteredTools.length === 1 ? 'tool' : 'tools'} found`
      );
    }
  }, [filteredTools]);

  return (
    <Box>
      {/* Screen reader announcement for filter results */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="visually-hidden"
      >
        {filterAnnouncement}
      </div>

      {/* ... rest of component ... */}
    </Box>
  );
};
```

**3.3 Chart Data Updates** (4h)

**File**: `/src/ui/components/CacheLineChart.tsx`

```tsx
const CacheLineChart = ({ history, loading }: CacheLineChartProps) => {
  const [chartAnnouncement, setChartAnnouncement] = useState<string>('');

  useEffect(() => {
    if (history.length > 0) {
      const latest = history[history.length - 1];
      setChartAnnouncement(
        `Cache performance updated: ${latest.cacheHitRate.toFixed(1)}% hit rate`
      );
    }
  }, [history]);

  return (
    <MetricCard {...props}>
      <div
        role="status"
        aria-live="polite"
        className="visually-hidden"
      >
        {chartAnnouncement}
      </div>

      <Box
        role="img"
        aria-label={`Cache performance chart showing ${history.length} data points`}
      >
        <LineChart data={history} />
      </Box>
    </MetricCard>
  );
};
```

**3.4 Optimistic UI Updates** (4h)

**Create Hook**: `/src/ui/hooks/useOptimisticAnnouncement.ts`

```typescript
import { useState, useEffect } from 'react';

export function useOptimisticAnnouncement(
  isPending: boolean,
  isSuccess: boolean,
  isError: boolean,
  actionName: string
) {
  const [announcement, setAnnouncement] = useState<string>('');

  useEffect(() => {
    if (isPending) {
      setAnnouncement(`${actionName} in progress...`);
    } else if (isSuccess) {
      setAnnouncement(`${actionName} completed successfully`);
    } else if (isError) {
      setAnnouncement(`${actionName} failed. Please try again.`);
    }
  }, [isPending, isSuccess, isError, actionName]);

  return announcement;
}
```

**Usage in FilteringCard.tsx**:

```tsx
const FilteringCard = ({ stats, pending, onToggle }: FilteringCardProps) => {
  const announcement = useOptimisticAnnouncement(
    pending,
    !pending && stats?.enabled !== undefined,
    false,
    'Toggle filtering'
  );

  return (
    <MetricCard {...props}>
      <div role="status" aria-live="assertive" className="visually-hidden">
        {announcement}
      </div>
      {/* ... */}
    </MetricCard>
  );
};
```

#### Day 3-4: Keyboard Navigation Enhancement (16h)

**3.5 Implement Roving Tabindex for Tables** (8h)

**Create Hook**: `/src/ui/hooks/useRovingTabindex.ts`

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';

export function useRovingTabindex<T>(
  items: T[],
  onActivate?: (item: T, index: number) => void
) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  // Focus the current item
  useEffect(() => {
    itemRefs.current[focusedIndex]?.focus();
  }, [focusedIndex]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, items.length - 1));
          break;

        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;

        case 'Home':
          event.preventDefault();
          setFocusedIndex(0);
          break;

        case 'End':
          event.preventDefault();
          setFocusedIndex(items.length - 1);
          break;

        case 'Enter':
        case ' ':
          event.preventDefault();
          if (onActivate) {
            onActivate(items[index], index);
          }
          break;
      }
    },
    [items, onActivate]
  );

  const getItemProps = (index: number) => ({
    tabIndex: focusedIndex === index ? 0 : -1,
    onKeyDown: (e: React.KeyboardEvent) => handleKeyDown(e, index),
    ref: (el: HTMLElement | null) => {
      itemRefs.current[index] = el;
    },
  });

  return { focusedIndex, getItemProps, setFocusedIndex };
}
```

**Update ServersTable.tsx**:

```tsx
import { useRovingTabindex } from '@hooks/useRovingTabindex';

const ServersTable = ({ servers, onRestart }: ServersTableProps) => {
  const { focusedIndex, getItemProps } = useRovingTabindex(
    servers,
    (server) => {
      if (server.status === 'connected') {
        onRestart(server);
      }
    }
  );

  return (
    <Table size="small" aria-label="Connected MCP servers">
      <TableHead>{/* ... */}</TableHead>
      <TableBody>
        {servers.map((server, index) => (
          <TableRow
            key={server.name}
            hover
            {...getItemProps(index)}
            aria-label={`${server.displayName || server.name} server row. Press Enter to restart.`}
          >
            {/* ... cells ... */}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

**3.6 Add Keyboard Shortcuts Documentation** (4h)

**Create Component**: `/src/ui/components/KeyboardShortcutsDialog.tsx`

```tsx
import { Dialog, DialogTitle, DialogContent, Typography, Table } from '@mui/material';

const shortcuts = [
  { key: 'Tab', action: 'Navigate forward' },
  { key: 'Shift + Tab', action: 'Navigate backward' },
  { key: 'Enter / Space', action: 'Activate button or link' },
  { key: 'Escape', action: 'Close dialog or cancel' },
  { key: 'Arrow Up / Down', action: 'Navigate table rows' },
  { key: 'Home / End', action: 'First / last table row' },
  { key: '/', action: 'Focus search field' },
];

const KeyboardShortcutsDialog = ({ open, onClose }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>Keyboard Shortcuts</DialogTitle>
    <DialogContent>
      <Table>
        {/* ... render shortcuts ... */}
      </Table>
    </DialogContent>
  </Dialog>
);
```

**Add to Header.tsx**:
```tsx
<IconButton onClick={() => setShortcutsOpen(true)} aria-label="View keyboard shortcuts">
  <KeyboardIcon />
</IconButton>
```

**3.7 Focus Search on '/' Key** (4h)

**Create Hook**: `/src/ui/hooks/useGlobalKeyboardShortcuts.ts`

```typescript
import { useEffect } from 'react';

export function useGlobalKeyboardShortcuts() {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Focus search when '/' is pressed
      if (event.key === '/' && !isFormElement(event.target)) {
        event.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('[aria-label*="Search"]');
        searchInput?.focus();
      }

      // Show keyboard shortcuts dialog on '?'
      if (event.key === '?' && !isFormElement(event.target)) {
        event.preventDefault();
        // Dispatch custom event to show shortcuts dialog
        window.dispatchEvent(new CustomEvent('show-shortcuts'));
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}

function isFormElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
```

#### Day 5: Modal Focus Management (8h)

**3.8 Enhance ConfigPreviewDialog** (8h)

**File**: `/src/ui/components/ConfigPreviewDialog.tsx`

```tsx
import { useRef, useEffect } from 'react';
import { useFocusTrap } from '@hooks/useFocusTrap';

const ConfigPreviewDialog = ({
  open,
  currentConfig,
  proposedConfig,
  onConfirm,
  onCancel,
}: ConfigPreviewDialogProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Store focus on open
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Focus confirm button (primary action)
      setTimeout(() => confirmButtonRef.current?.focus(), 100);
    }
  }, [open]);

  // Restore focus on close
  const handleClose = () => {
    onCancel();
    setTimeout(() => previousFocusRef.current?.focus(), 100);
  };

  // Prevent background scrolling when modal open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      aria-labelledby="config-preview-title"
      aria-describedby="config-preview-description"
      ref={dialogRef}
    >
      <DialogTitle id="config-preview-title">
        Review Configuration Changes
      </DialogTitle>

      <DialogContent dividers>
        <Typography id="config-preview-description" variant="body2">
          Review the changes below before applying them to your configuration.
        </Typography>

        {/* Immediate announcement for destructive changes */}
        {hasDestructiveChanges && (
          <Alert
            severity="warning"
            role="alert"
            aria-live="assertive"
            sx={{ mb: 3 }}
          >
            <Typography variant="body2" fontWeight={600}>
              Destructive Changes Detected
            </Typography>
            <Typography variant="body2">
              This configuration contains removed servers or modified settings.
            </Typography>
          </Alert>
        )}

        {/* Make diff viewer keyboard accessible */}
        <Box
          role="region"
          aria-label="Configuration differences between current and proposed"
          tabIndex={0}
          sx={{
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.light',
            },
          }}
        >
          <ReactDiffViewer
            oldValue={currentJson}
            newValue={proposedJson}
            splitView={true}
            useDarkTheme={true}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button
          ref={confirmButtonRef}
          onClick={() => {
            onConfirm();
            handleClose();
          }}
          variant="contained"
          color="primary"
          aria-describedby={hasDestructiveChanges ? 'destructive-warning' : undefined}
        >
          Apply Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

### Week 3 Deliverables

- ✅ ARIA live regions for all dynamic content
- ✅ Keyboard navigation for tables (roving tabindex)
- ✅ Modal focus management and restoration
- ✅ Global keyboard shortcuts implemented
- ✅ Loading states properly announced
- ✅ Optimistic UI announcements

---

## Week 4: Testing, Documentation & Polish (40 hours)

### Goals
- Comprehensive screen reader testing
- Manual accessibility testing
- CI/CD integration
- Final documentation
- Polish and edge cases

### Tasks

#### Day 1-2: Screen Reader Testing (16h)

**4.1 NVDA Testing (Windows/Firefox)** (6h)

**Testing Checklist**:
- [ ] All pages navigable with screen reader
- [ ] Landmarks announced correctly
- [ ] Tables have descriptive captions
- [ ] Form controls properly labeled
- [ ] Live regions announce updates
- [ ] Modal focus management works
- [ ] Tab navigation logical

**Document Issues**: Create spreadsheet with findings

**4.2 VoiceOver Testing (macOS/Safari)** (6h)

**Testing Checklist**:
- [ ] Rotor navigation works (landmarks, headings, links)
- [ ] Table navigation efficient
- [ ] Charts have text alternatives
- [ ] Dynamic content announced
- [ ] Keyboard shortcuts work

**4.3 Cross-Browser Testing** (4h)

Test in:
- Chrome + NVDA
- Firefox + NVDA
- Safari + VoiceOver
- Edge + NVDA

#### Day 3: Manual Accessibility Testing (8h)

**4.4 Keyboard-Only Navigation Test** (4h)

Disconnect mouse and navigate entire app:
- [ ] All pages reachable
- [ ] All actions performable
- [ ] Focus always visible
- [ ] No keyboard traps
- [ ] Logical tab order

**4.5 Color Blindness Simulation** (2h)

Use browser extensions:
- Protanopia (red-blind)
- Deuteranopia (green-blind)
- Tritanopia (blue-blind)

Verify:
- [ ] Status indicators distinguishable
- [ ] Charts readable
- [ ] Links visible

**4.6 High Contrast Mode** (2h)

Test Windows High Contrast:
- [ ] All text visible
- [ ] Borders visible
- [ ] Focus indicators visible

#### Day 4: CI/CD Integration & Automation (8h)

**4.7 Add Accessibility Tests to CI** (4h)

**File**: `.github/workflows/accessibility.yml`

```yaml
name: Accessibility Tests

on: [push, pull_request]

jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run ESLint accessibility rules
        run: bunx eslint src/ui --ext .tsx,.ts

      - name: Run accessibility tests
        run: bun test -- --grep "a11y"

      - name: Build UI
        run: bun run build:ui

      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: http://localhost:7000
          configPath: ./lighthouserc.json
```

**4.8 Configure Lighthouse CI** (2h)

**File**: `lighthouserc.json`

```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "url": ["http://localhost:7000/dashboard", "http://localhost:7000/servers"]
    },
    "assert": {
      "assertions": {
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "aria-allowed-attr": "error",
        "aria-required-attr": "error",
        "color-contrast": "error",
        "document-title": "error",
        "html-has-lang": "error",
        "image-alt": "error",
        "label": "error",
        "link-name": "error",
        "list": "error",
        "tabindex": "error"
      }
    }
  }
}
```

**4.9 Add Pre-Commit Hook** (2h)

**File**: `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run ESLint accessibility checks
bunx eslint src/ui --ext .tsx,.ts --max-warnings 0

# Run accessibility unit tests
bun test -- --grep "a11y" --run
```

#### Day 5: Documentation & Polish (8h)

**4.10 Create Accessibility Guide** (4h)

**File**: `/claudedocs/ACCESSIBILITY_GUIDE.md`

Sections:
1. Overview of accessibility features
2. Keyboard shortcuts reference
3. Screen reader usage tips
4. Development guidelines
5. Testing procedures
6. Reporting accessibility issues

**4.11 Component Documentation** (2h)

Add accessibility notes to each component's JSDoc:

```tsx
/**
 * ServersTable - Display connected MCP servers
 *
 * Accessibility Features:
 * - WCAG 2.1 AA compliant
 * - Keyboard navigable (Arrow keys, Enter, Space)
 * - Screen reader optimized with ARIA labels
 * - High contrast status indicators
 * - Roving tabindex for efficient navigation
 *
 * Keyboard Shortcuts:
 * - Arrow Up/Down: Navigate rows
 * - Enter/Space: Activate row action (restart server)
 * - Home/End: Jump to first/last row
 */
const ServersTable = ({ ... }) => { ... };
```

**4.12 Create Accessibility Badge** (1h)

Add to README.md:

```markdown
## Accessibility

MCP Hub UI is committed to WCAG 2.1 AA compliance.

![WCAG 2.1 AA Compliant](https://img.shields.io/badge/WCAG-2.1%20AA-blue)
![Keyboard Navigable](https://img.shields.io/badge/Keyboard-Navigable-green)
![Screen Reader Compatible](https://img.shields.io/badge/Screen%20Reader-Compatible-green)

Features:
- ✅ Keyboard-only navigation support
- ✅ Screen reader optimized
- ✅ High contrast mode compatible
- ✅ Focus indicators on all interactive elements
- ✅ ARIA live regions for dynamic content
- ✅ Color-independent status indicators

[Read Full Accessibility Guide →](./claudedocs/ACCESSIBILITY_GUIDE.md)
```

**4.13 Final Accessibility Audit** (1h)

Run final automated tests:
```bash
bun test -- --grep "a11y"
bunx axe src/ui
bunx lighthouse http://localhost:7000 --only-categories=accessibility
```

### Week 4 Deliverables

- ✅ Screen reader testing complete (NVDA, VoiceOver)
- ✅ Manual keyboard testing complete
- ✅ CI/CD accessibility checks integrated
- ✅ Pre-commit hooks enforce standards
- ✅ Comprehensive documentation
- ✅ 95%+ WCAG 2.1 AA compliance achieved

---

## Testing & Validation Strategy

### Automated Testing

**Daily During Development**:
```bash
# Run accessibility tests
bun test -- --grep "a11y"

# ESLint checks
bunx eslint src/ui --ext .tsx,.ts
```

**Before Each Commit**:
```bash
# Pre-commit hook runs automatically
# - ESLint accessibility rules
# - Accessibility unit tests
```

**CI/CD Pipeline**:
```bash
# On every push/PR
# - Full test suite
# - Lighthouse accessibility audit
# - axe-core violations check
```

### Manual Testing Schedule

**Weekly During Remediation**:
- Keyboard-only navigation (1 hour)
- Screen reader spot-check (30 minutes)
- Color contrast verification (30 minutes)

**End of Each Week**:
- Full screen reader test (2 hours)
- Cross-browser verification (1 hour)
- Mobile accessibility check (1 hour)

**Final Testing (Week 4)**:
- Comprehensive screen reader test (8 hours)
- External accessibility audit (optional)

### Validation Checklist

**Before Marking Complete**:
- [ ] All automated tests passing
- [ ] No ESLint accessibility warnings
- [ ] Lighthouse accessibility score >95
- [ ] Manual keyboard navigation successful
- [ ] Screen reader testing complete
- [ ] Color contrast violations resolved
- [ ] Documentation complete
- [ ] CI/CD integration working

---

## Success Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| WCAG 2.1 AA Compliance | 65% | 95%+ | 📈 |
| Lighthouse Accessibility Score | ~70 | 95+ | 📈 |
| ESLint Violations | ~25 | 0 | 📈 |
| Keyboard Navigation Coverage | 60% | 100% | 📈 |
| Screen Reader Compatibility | Partial | Full | 📈 |
| Automated Test Coverage | 0 tests | 50+ tests | 📈 |

---

## Risk Mitigation

**Potential Blockers**:

1. **MUI Component Limitations**
   - **Risk**: Some MUI components may not be fully accessible
   - **Mitigation**: Use MUI's accessibility props, create wrapper components if needed
   - **Escalation**: Consider custom implementation for critical components

2. **Third-Party Library Issues**
   - **Risk**: ReactDiffViewer, Monaco Editor may have accessibility gaps
   - **Mitigation**: Add keyboard controls, ARIA labels to container
   - **Escalation**: Replace with accessible alternatives if critical

3. **Performance Impact**
   - **Risk**: ARIA live regions may impact performance with high-frequency updates
   - **Mitigation**: Debounce announcements, limit update frequency
   - **Escalation**: Make live regions opt-in for users who need them

4. **Timeline Slippage**
   - **Risk**: Scope creep or unexpected issues
   - **Mitigation**: Prioritize critical issues, defer nice-to-haves
   - **Escalation**: Extend to 5-week plan with Week 5 as buffer

---

## Maintenance Plan

**Ongoing Responsibilities**:

1. **Pre-Commit Enforcement**
   - ESLint accessibility rules block commits with violations
   - Accessibility tests must pass before merge

2. **Code Review Checklist**
   - All new components have ARIA labels
   - Keyboard navigation tested
   - Color contrast verified
   - Focus indicators visible

3. **Quarterly Audits**
   - Full screen reader testing
   - Automated accessibility scan
   - User feedback review

4. **Component Library**
   - Create accessible component templates
   - Document accessibility patterns
   - Provide copy-paste examples

---

## Resources & References

**Tools**:
- [axe DevTools Browser Extension](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [Lighthouse CLI](https://developers.google.com/web/tools/lighthouse)
- [NVDA Screen Reader](https://www.nvaccess.org/)

**Documentation**:
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MUI Accessibility Guide](https://mui.com/material-ui/guides/accessibility/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Resources](https://webaim.org/resources/)

**Training**:
- [Web Accessibility by Google (Udacity)](https://www.udacity.com/course/web-accessibility--ud891)
- [Introduction to Web Accessibility (W3C)](https://www.w3.org/WAI/fundamentals/accessibility-intro/)

---

## Next Steps

1. **Review & Approval**: Share this plan with stakeholders
2. **Sprint Planning**: Break down Week 1 tasks into 2-hour chunks
3. **Environment Setup**: Install all testing tools
4. **Kickoff**: Begin Week 1 Day 1 tasks

**Ready to start? See [ACCESSIBILITY_CODE_EXAMPLES.md](./ACCESSIBILITY_CODE_EXAMPLES.md) for copy-paste implementations.**
