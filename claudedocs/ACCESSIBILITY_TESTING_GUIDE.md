# MCP Hub UI - Accessibility Testing Guide

Comprehensive testing procedures for WCAG 2.1 AA compliance validation.

---

## Table of Contents

1. [Automated Testing](#automated-testing)
2. [Manual Testing](#manual-testing)
3. [Screen Reader Testing](#screen-reader-testing)
4. [Keyboard Navigation Testing](#keyboard-navigation-testing)
5. [Color & Contrast Testing](#color--contrast-testing)
6. [Browser & Device Testing](#browser--device-testing)
7. [CI/CD Integration](#cicd-integration)

---

## Automated Testing

### 1. Setup

**Install Dependencies**:
```bash
bun add -D @axe-core/react vitest-axe eslint-plugin-jsx-a11y
```

**Configure Vitest**:

**File**: `vitest.setup.ts`

```typescript
import '@testing-library/jest-dom';
import { configureAxe, toHaveNoViolations } from 'vitest-axe';

// Extend Vitest matchers
expect.extend(toHaveNoViolations);

// Configure axe for WCAG 2.1 AA
const axe = configureAxe({
  rules: {
    // WCAG 2.1 AA rules
    'color-contrast': { enabled: true },
    'label': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'button-name': { enabled: true },
    'image-alt': { enabled: true },
    'link-name': { enabled: true },
    'document-title': { enabled: true },
    'valid-lang': { enabled: true },
  },
});

global.axe = axe;
```

### 2. Component Tests

**Example Test**: `/src/ui/components/__tests__/Header.a11y.test.tsx`

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ThemeProvider } from '@mui/material/styles';
import theme from '@/theme';
import Header from '../Header';

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
      expect(label.trim().length).toBeGreaterThan(0);
    });
  });

  it('should have proper landmark roles', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <Header />
      </ThemeProvider>
    );

    const banner = container.querySelector('[role="banner"]');
    expect(banner).toBeInTheDocument();
  });
});
```

### 3. Run Tests

```bash
# Run all accessibility tests
bun test -- --grep "a11y"

# Run with coverage
bun test -- --grep "a11y" --coverage

# Watch mode
bun test -- --grep "a11y" --watch
```

### 4. ESLint Integration

**File**: `eslint.config.js`

```javascript
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  {
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      // Enforce ARIA best practices
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/aria-role': 'error',

      // Enforce semantic HTML
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/heading-has-content': 'error',
      'jsx-a11y/html-has-lang': 'error',

      // Enforce keyboard accessibility
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/no-noninteractive-element-interactions': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',

      // Enforce labels
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/img-redundant-alt': 'error',

      // Warnings (not errors)
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/no-redundant-roles': 'warn',
    },
  },
];
```

**Run ESLint**:
```bash
bunx eslint src/ui --ext .tsx,.ts
```

---

## Manual Testing

### 1. Keyboard-Only Navigation Test

**Objective**: Ensure entire application is usable without a mouse.

**Setup**:
1. Disconnect mouse or avoid touching it
2. Open MCP Hub UI in browser
3. Use only keyboard for navigation

**Test Procedure**:

| Action | Keys | Expected Result | Pass/Fail |
|--------|------|-----------------|-----------|
| Navigate to next element | `Tab` | Focus moves forward, visible indicator | ☐ |
| Navigate to previous element | `Shift + Tab` | Focus moves backward | ☐ |
| Skip navigation | `Tab` (from page load) | "Skip to main content" appears | ☐ |
| Use skip link | `Enter` on skip link | Focus jumps to main content | ☐ |
| Activate button | `Enter` or `Space` | Button action triggers | ☐ |
| Navigate sidebar | `Tab` | Each menu item focusable | ☐ |
| Activate nav link | `Enter` | Page navigates | ☐ |
| Navigate table rows | `Arrow Up/Down` | Row focus changes | ☐ |
| Jump to first row | `Home` | Focus moves to first row | ☐ |
| Jump to last row | `End` | Focus moves to last row | ☐ |
| Activate row action | `Enter` or `Space` | Action triggered (restart server) | ☐ |
| Open modal | `Enter` on trigger | Modal opens, focus moves to modal | ☐ |
| Close modal | `Escape` | Modal closes, focus returns to trigger | ☐ |
| Navigate tabs | `Arrow Left/Right` | Tab focus changes | ☐ |
| Activate tab | `Enter` or `Space` | Tab panel displayed | ☐ |
| Focus search | `/` | Search field focused | ☐ |
| Clear search | Focus search, type, `Tab` to clear button, `Enter` | Search cleared | ☐ |
| Filter dropdown | `Arrow Down` | Opens dropdown | ☐ |
| Select filter | `Arrow Down`, `Enter` | Filter applied | ☐ |
| Toggle switch | `Space` | Switch toggles state | ☐ |

**Pass Criteria**: All actions completable without mouse

### 2. Focus Indicator Test

**Objective**: Ensure focus is always visible.

**Test Procedure**:
1. Navigate through entire app with keyboard
2. At each stop, verify visible focus indicator

**Checklist**:
- [ ] Sidebar navigation links have visible focus
- [ ] Header buttons have visible focus
- [ ] Table rows have visible focus
- [ ] Form inputs have visible focus
- [ ] Tabs have visible focus
- [ ] Icon buttons have visible focus
- [ ] Links have visible focus
- [ ] Modal close button has visible focus

**Expected**:
- 2px solid outline (color: `#8B7FF5`)
- 2px offset from element
- Rounded corners (4px border-radius)

**Fail If**:
- No visible indicator
- Indicator too subtle (low contrast)
- Indicator only shows on mouse click

### 3. Heading Hierarchy Test

**Objective**: Ensure logical heading structure.

**Tool**: Browser DevTools or headingsMap extension

**Test Procedure**:
1. Open DevTools → Accessibility tree
2. Navigate to each page
3. Verify heading structure

**Expected Structure**:

**Dashboard Page**:
```
h1: Overview
  h2: Key Metrics (visually hidden)
  h2: Detailed Information (visually hidden)
```

**Servers Page**:
```
h1: Connected Servers
  h2: [Optional section headings]
```

**Tools Page**:
```
h1: Available Tools
  h2: [Optional section headings]
```

**Configuration Page**:
```
h1: Configuration
  h2: [Tab panel headings]
```

**Pass Criteria**:
- All pages start with h1
- No skipped levels (h1 → h3)
- Logical nesting

### 4. ARIA Attributes Test

**Objective**: Verify correct ARIA usage.

**Tool**: Browser DevTools → Accessibility Inspector

**Checklist**:

**Landmarks**:
- [ ] Main navigation has `aria-label="Main navigation"`
- [ ] Main content has `aria-label="Main content"`
- [ ] All sections have `aria-labelledby` or `aria-label`

**Buttons**:
- [ ] Icon-only buttons have `aria-label`
- [ ] Loading buttons have `aria-busy="true"`
- [ ] Disabled buttons maintain accessible name

**Tables**:
- [ ] Tables have `caption` or `aria-label`
- [ ] Table headers properly associated
- [ ] Sortable columns have `aria-sort`

**Live Regions**:
- [ ] Log panel has `role="log"` and `aria-live="polite"`
- [ ] Filter results have `role="status"` and `aria-live="polite"`
- [ ] Error messages have `role="alert"` and `aria-live="assertive"`

**Modals**:
- [ ] Dialog has `aria-labelledby` pointing to title
- [ ] Dialog has `aria-describedby` pointing to description
- [ ] Modal has `aria-modal="true"`

---

## Screen Reader Testing

### 1. NVDA (Windows/Firefox)

**Setup**:
1. Install NVDA: https://www.nvaccess.org/download/
2. Install Firefox
3. Open MCP Hub UI in Firefox
4. Start NVDA

**Basic Navigation Commands**:
- `Down Arrow`: Read next line
- `Up Arrow`: Read previous line
- `Insert + Down Arrow`: Read from cursor (Say All)
- `Tab`: Next focusable element
- `Shift + Tab`: Previous focusable element
- `Insert + F7`: Elements list (headings, links, etc.)
- `H`: Next heading
- `Shift + H`: Previous heading
- `K`: Next link
- `T`: Next table
- `B`: Next button

**Test Checklist**:

**Page Load**:
- [ ] Page title announced
- [ ] Main heading announced
- [ ] Landmark regions announced

**Navigation**:
- [ ] Skip link works
- [ ] Sidebar navigation announced correctly
- [ ] Active page indicated ("current page")

**Tables**:
- [ ] Table caption announced
- [ ] Column headers announced when navigating cells
- [ ] Row count announced
- [ ] Empty state announced

**Forms**:
- [ ] Labels associated with inputs
- [ ] Required fields indicated
- [ ] Error messages announced
- [ ] Success messages announced

**Dynamic Content**:
- [ ] New log entries announced
- [ ] Filter results announced
- [ ] Chart updates announced
- [ ] Loading states announced

**Modals**:
- [ ] Modal title announced
- [ ] Focus moved to modal
- [ ] Background content not accessible
- [ ] Escape closes modal
- [ ] Focus returned to trigger

### 2. VoiceOver (macOS/Safari)

**Setup**:
1. Enable VoiceOver: `Cmd + F5`
2. Open Safari
3. Navigate to MCP Hub UI

**Basic Commands**:
- `VO + A`: Read all
- `VO + Right Arrow`: Next item
- `VO + Left Arrow`: Previous item
- `VO + U`: Rotor (navigation menu)
- `VO + H H`: Next heading
- `VO + J`: Jump to element
- `Tab`: Next focusable element

**Test Checklist**:
- [ ] All NVDA tests (above)
- [ ] Rotor navigation works
- [ ] Table navigation works
- [ ] VoiceOver cursor synchronized with focus

### 3. Screen Reader Test Script

**Scenario 1: View Server Status**:
1. Start from homepage
2. Navigate to Servers page
3. Find server in table
4. Read server status
5. Restart server

**Expected Announcements**:
```
"Connected Servers heading level 1"
"Table with 3 rows and 7 columns"
"Row 1, filesystem server, status connected, tools 12, enabled"
"Restart filesystem server button"
"Server restarted successfully"
```

**Scenario 2: Search Tools**:
1. Navigate to Tools page
2. Focus search field
3. Type search query
4. Hear results count

**Expected Announcements**:
```
"Available Tools heading level 1"
"Search tools edit text"
"5 tools found" (live region)
"Table with 5 rows and 4 columns"
```

**Scenario 3: Change Configuration**:
1. Navigate to Configuration page
2. Navigate to Filtering tab
3. Toggle filtering enabled
4. Hear confirmation

**Expected Announcements**:
```
"Configuration heading level 1"
"Configuration tabs tab list"
"Filtering tab"
"Enable filtering switch, checked"
"Filtering enabled successfully" (live region)
```

---

## Keyboard Navigation Testing

### Roving Tabindex Test

**Objective**: Verify efficient keyboard navigation in tables.

**Test Procedure** (Servers Table):
1. Tab to table
2. Verify first row focused (tabindex=0)
3. Press `Arrow Down`
4. Verify second row focused, first row unfocused (tabindex=-1)
5. Press `Home`
6. Verify first row focused
7. Press `End`
8. Verify last row focused
9. Press `Enter`
10. Verify action triggered (restart server)

**Expected Behavior**:
- Only one row in tab sequence at a time
- Arrow keys navigate between rows
- Home/End jump to first/last
- Enter/Space activate row action
- Tab exits table

### Skip Navigation Test

**Objective**: Verify skip link functionality.

**Test Procedure**:
1. Open page
2. Press `Tab` once
3. Verify skip link appears visually
4. Verify screen reader announces "Skip to main content"
5. Press `Enter`
6. Verify focus moves to main content
7. Verify skip link disappears

**Pass Criteria**:
- Skip link only visible on focus
- Pressing Enter moves focus
- Skip link has proper contrast

### Keyboard Shortcuts Test

**Objective**: Verify global keyboard shortcuts.

**Test Procedure**:

| Shortcut | Action | Expected Result | Pass/Fail |
|----------|--------|-----------------|-----------|
| `/` | Focus search | Search field focused | ☐ |
| `?` | Show shortcuts | Shortcuts dialog opens | ☐ |
| `Escape` | Close dialog | Dialog closes, focus restored | ☐ |

---

## Color & Contrast Testing

### 1. Automated Contrast Checking

**Tool**: axe DevTools Browser Extension

**Installation**:
1. Install axe DevTools for Chrome/Firefox
2. Open MCP Hub UI
3. Open DevTools → axe tab
4. Click "Scan ALL of my page"

**Review Results**:
- Filter by "Color Contrast"
- Fix all "Serious" violations
- Review "Moderate" violations

**Expected**: 0 color contrast violations

### 2. Manual Contrast Verification

**Tool**: WebAIM Contrast Checker
https://webaim.org/resources/contrastchecker/

**Test Color Combinations**:

| Element | Foreground | Background | Required Ratio | Actual Ratio | Pass/Fail |
|---------|-----------|------------|----------------|--------------|-----------|
| Primary text | `#FFFFFF` | `#121212` | 4.5:1 | 18.6:1 | ☐ |
| Secondary text | `#B0B0B0` | `#121212` | 4.5:1 | 8.2:1 | ☐ |
| Primary button | `#FFFFFF` | `#6C5CE7` | 4.5:1 | 5.8:1 | ☐ |
| Link text | `#8B7FF5` | `#121212` | 4.5:1 | 4.8:1 | ☐ |
| Disabled text | `#888888` | `#1E1E28` | 4.5:1 | 4.6:1 | ☐ |
| Success chip | `#66BB6A` | `#1E1E28` | 3:1 | 5.1:1 | ☐ |
| Warning chip | `#FFA726` | `#1E1E28` | 3:1 | 6.3:1 | ☐ |
| Error chip | `#FF6B6B` | `#1E1E28` | 3:1 | 5.6:1 | ☐ |

### 3. Color Blindness Simulation

**Tool**: Chrome DevTools → Rendering → Emulate vision deficiencies

**Test Each Mode**:
1. No emulation (baseline)
2. Protanopia (red-blind)
3. Deuteranopia (green-blind)
4. Tritanopia (blue-blind)
5. Achromatopsia (total color blindness)

**Verify**:
- [ ] Server status distinguishable (icon + color)
- [ ] Chart data distinguishable
- [ ] Links visible
- [ ] Buttons identifiable
- [ ] All information conveyed without color alone

### 4. High Contrast Mode Test

**Windows High Contrast**:
1. Settings → Ease of Access → High Contrast
2. Enable high contrast theme
3. Test MCP Hub UI

**Verify**:
- [ ] All text visible
- [ ] All borders visible
- [ ] Focus indicators visible
- [ ] Icons visible

**macOS Increase Contrast**:
1. System Preferences → Accessibility → Display
2. Enable "Increase contrast"
3. Test MCP Hub UI

---

## Browser & Device Testing

### Desktop Browsers

| Browser | OS | Keyboard Nav | Screen Reader | Focus Indicators | Pass/Fail |
|---------|-----|--------------|---------------|------------------|-----------|
| Chrome | Windows | ☐ | NVDA | ☐ | ☐ |
| Firefox | Windows | ☐ | NVDA | ☐ | ☐ |
| Edge | Windows | ☐ | NVDA | ☐ | ☐ |
| Safari | macOS | ☐ | VoiceOver | ☐ | ☐ |
| Chrome | macOS | ☐ | VoiceOver | ☐ | ☐ |
| Firefox | macOS | ☐ | VoiceOver | ☐ | ☐ |

### Mobile Testing

**iOS (VoiceOver)**:
1. Settings → Accessibility → VoiceOver → On
2. Open Safari, navigate to MCP Hub UI
3. Swipe gestures to navigate

**Android (TalkBack)**:
1. Settings → Accessibility → TalkBack → On
2. Open Chrome, navigate to MCP Hub UI
3. Swipe gestures to navigate

**Test Checklist**:
- [ ] Touch targets ≥44x44 pixels
- [ ] All interactive elements reachable
- [ ] Swipe navigation works
- [ ] Form inputs accessible
- [ ] Dynamic content announced

---

## CI/CD Integration

### 1. GitHub Actions Workflow

**File**: `.github/workflows/accessibility.yml`

```yaml
name: Accessibility Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  a11y:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run ESLint accessibility checks
        run: bunx eslint src/ui --ext .tsx,.ts --max-warnings 0

      - name: Run accessibility unit tests
        run: bun test -- --grep "a11y" --coverage

      - name: Build UI
        run: bun run build:ui

      - name: Start MCP Hub server
        run: |
          bun start &
          sleep 10

      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            http://localhost:7000/dashboard
            http://localhost:7000/servers
            http://localhost:7000/tools
            http://localhost:7000/configuration
          configPath: ./lighthouserc.json

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: accessibility-results
          path: |
            coverage/
            .lighthouseci/
```

### 2. Lighthouse CI Configuration

**File**: `lighthouserc.json`

```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "url": [
        "http://localhost:7000/dashboard",
        "http://localhost:7000/servers",
        "http://localhost:7000/tools",
        "http://localhost:7000/configuration"
      ]
    },
    "assert": {
      "assertions": {
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "aria-allowed-attr": "error",
        "aria-required-attr": "error",
        "aria-required-children": "error",
        "aria-required-parent": "error",
        "aria-roles": "error",
        "aria-valid-attr": "error",
        "aria-valid-attr-value": "error",
        "button-name": "error",
        "bypass": "error",
        "color-contrast": "error",
        "document-title": "error",
        "duplicate-id-aria": "error",
        "html-has-lang": "error",
        "image-alt": "error",
        "label": "error",
        "link-name": "error",
        "list": "error",
        "listitem": "error",
        "tabindex": "error",
        "td-headers-attr": "error",
        "th-has-data-cells": "error",
        "valid-lang": "error"
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

### 3. Pre-Commit Hook

**File**: `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "Running accessibility checks..."

# ESLint accessibility rules
echo "→ ESLint JSX-A11Y checks"
bunx eslint src/ui --ext .tsx,.ts --max-warnings 0 || exit 1

# Accessibility unit tests
echo "→ Accessibility unit tests"
bun test -- --grep "a11y" --run || exit 1

echo "✅ All accessibility checks passed"
```

### 4. Test Coverage Requirements

**File**: `vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
      include: ['src/ui/**/*.{ts,tsx}'],
      exclude: [
        'src/ui/**/*.test.{ts,tsx}',
        'src/ui/**/*.stories.{ts,tsx}',
      ],
    },
  },
});
```

---

## Testing Checklist

### Before Each Release

**Automated Tests**:
- [ ] All accessibility unit tests passing
- [ ] ESLint JSX-A11Y rules passing (0 warnings)
- [ ] Lighthouse accessibility score ≥95 on all pages
- [ ] axe-core violations: 0 critical, 0 serious

**Manual Tests**:
- [ ] Keyboard-only navigation successful
- [ ] Focus indicators visible throughout
- [ ] Skip navigation working
- [ ] Heading hierarchy correct

**Screen Reader Tests**:
- [ ] NVDA test complete (Windows/Firefox)
- [ ] VoiceOver test complete (macOS/Safari)
- [ ] All dynamic content announced
- [ ] All forms accessible

**Color & Contrast**:
- [ ] Color contrast violations: 0
- [ ] Color blindness simulation passed
- [ ] High contrast mode compatible

**Cross-Browser**:
- [ ] Chrome tested
- [ ] Firefox tested
- [ ] Safari tested
- [ ] Edge tested

### Monthly Audit

- [ ] Full accessibility audit with axe DevTools
- [ ] Screen reader testing (2 hours)
- [ ] User feedback review
- [ ] New WCAG guidelines reviewed
- [ ] Documentation updated

---

## Reporting Issues

### Issue Template

```markdown
# Accessibility Issue

**WCAG Criterion**: [e.g., 1.4.3 Contrast (Minimum)]
**Severity**: [Critical / High / Medium / Low]
**Browser**: [Chrome 120, Firefox 121, etc.]
**Screen Reader**: [NVDA 2024.1, VoiceOver, etc.]

## Description
[Clear description of the issue]

## Steps to Reproduce
1. Navigate to [page]
2. [Action]
3. [Observe issue]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Screenshots/Videos
[If applicable]

## Suggested Fix
[Optional: proposed solution]
```

---

## Resources

**Testing Tools**:
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE](https://wave.webaim.org/extension/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [NVDA Screen Reader](https://www.nvaccess.org/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

**Guidelines**:
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Keyboard Testing](https://webaim.org/articles/keyboard/)

**Training**:
- [Web Accessibility by Google](https://www.udacity.com/course/web-accessibility--ud891)
- [Deque University](https://dequeuniversity.com/)
- [WebAIM Training](https://webaim.org/training/)
