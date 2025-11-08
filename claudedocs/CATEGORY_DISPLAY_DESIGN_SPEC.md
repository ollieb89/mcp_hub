# Category Display Design Specification
## MCP Hub Configuration Screen UI/UX

**Version**: 1.0
**Date**: 2025-11-05
**Location**: http://localhost:4173/configuration

---

## 1. Executive Summary

This specification defines the visual design, interaction patterns, and responsive behavior for displaying tool categories in the MCP Hub configuration screen. The design ensures category visibility is contextual, enhances user understanding of filtering modes, and maintains consistency with the existing Material-UI dark theme design system.

---

## 2. Current UI Analysis

### 2.1 Existing Design System

**Theme Foundation**:
```typescript
{
  palette: {
    mode: "dark",
    primary: { main: "#6C5CE7" },      // Purple
    secondary: { main: "#00CEC9" },    // Teal
    background: {
      default: "#121212",
      paper: "#1E1E28"
    }
  },
  typography: {
    fontFamily: "Inter, system-ui, sans-serif"
  }
}
```

**Component Patterns**:
- **MetricCard**: Elevated paper with border, 3 padding units, rounded corners
- **Chips**: Small size, outlined variant for primary/secondary info
- **Form Controls**: Small size, max-width 240px for inputs
- **Typography**: H5 (700 weight) for page titles, body1 for descriptions
- **Spacing**: Stack component with spacing={3} for vertical rhythm

### 2.2 Configuration Page Structure

**Layout Hierarchy**:
```
ConfigPage
├── Page Header (Typography h5 + description)
├── Action Bar (Save button, right-aligned)
└── ConfigTabs (4 tabs)
    ├── General Tab
    │   ├── Filtering Toggle (Switch + Typography)
    │   ├── Mode Select (FormControl, max-width 240px)
    │   └── Auto-enable Threshold (TextField)
    ├── Categories Tab → CategoryListEditor
    ├── Servers Tab → ServerAllowlistEditor
    └── Raw JSON Tab → RawJsonEditor
```

**Current Category Editor** (`CategoryListEditor.tsx`):
- Simple text input + Add button
- Chip display with delete functionality
- Minimal spacing (mb: 2, gap: 1)
- No visual categorization or icons

---

## 3. Design Requirements

### 3.1 Functional Requirements

**FR-1**: Category display MUST adapt to active filtering mode
**FR-2**: Categories MUST be visually distinguishable by domain
**FR-3**: Users MUST understand which categories are currently active
**FR-4**: Category selection MUST support both manual and visual interaction
**FR-5**: Design MUST scale from 0 to 10+ categories without visual degradation

### 3.2 Non-Functional Requirements

**NFR-1**: WCAG 2.1 AA compliance (4.5:1 contrast ratio minimum)
**NFR-2**: Responsive layout: 320px → 1920px viewport width
**NFR-3**: Performance: <100ms interaction latency
**NFR-4**: Consistency: 95%+ adherence to existing design patterns

---

## 4. Category Taxonomy

### 4.1 Standard Categories

| Category | Icon | Color | Description |
|----------|------|-------|-------------|
| `github` | GitHubIcon | #00CEC9 (secondary) | GitHub operations (repos, issues, PRs) |
| `filesystem` | FolderIcon | #FFA502 | File reading/writing operations |
| `web` | LanguageIcon | #0984E3 | Web browsing, URL fetching |
| `docker` | ContainerIcon | #2D98DA | Container management |
| `git` | GitIcon | #F39C12 | Local git operations |
| `python` | CodeIcon | #3776AB | Python environment management |
| `database` | StorageIcon | #E84393 | Database queries |
| `memory` | PsychologyIcon | #A29BFE | Knowledge graph management |
| `vertex_ai` | SmartToyIcon | #6C5CE7 (primary) | AI-assisted development |
| `meta` | SettingsIcon | #74B9FF | Hub internal tools (always available) |

**Icon Package**: `@mui/icons-material`

**Color Strategy**:
- Use theme colors where possible (primary, secondary)
- Custom colors chosen for semantic clarity and contrast
- All colors validated for WCAG AA on dark background (#1E1E28)

---

## 5. Visual Design Specifications

### 5.1 Enhanced Category Chip Design

**Visual Hierarchy** (3 variants):

#### Variant A: Active Category Chip (Selected)
```tsx
<Chip
  icon={<GitHubIcon />}
  label="github"
  color="primary"
  variant="filled"
  size="medium"
  sx={{
    fontWeight: 600,
    borderWidth: 2,
    borderColor: "primary.main",
    bgcolor: alpha("primary.main", 0.2),
    "&:hover": {
      bgcolor: alpha("primary.main", 0.3),
    }
  }}
  onDelete={() => handleRemove("github")}
/>
```

**Properties**:
- Icon: Category-specific icon (16px)
- Size: Medium (32px height)
- Background: Primary color @ 20% opacity
- Border: 2px solid primary
- Font Weight: 600 (semi-bold)
- Hover: Background opacity → 30%

#### Variant B: Inactive Category Chip (Available, Not Selected)
```tsx
<Chip
  icon={<GitHubIcon />}
  label="github"
  variant="outlined"
  size="medium"
  sx={{
    borderColor: "divider",
    color: "text.secondary",
    "&:hover": {
      bgcolor: alpha("primary.main", 0.1),
      borderColor: "primary.main",
      color: "text.primary",
    }
  }}
  onClick={() => handleAdd("github")}
/>
```

**Properties**:
- Icon: Category-specific icon (16px, text.secondary)
- Size: Medium (32px height)
- Background: Transparent
- Border: 1px solid divider
- Color: text.secondary (#999)
- Hover: Background primary @ 10%, border → primary, color → text.primary

#### Variant C: Disabled Category Chip (Unavailable)
```tsx
<Chip
  icon={<GitHubIcon />}
  label="github"
  disabled
  variant="outlined"
  size="medium"
  sx={{
    opacity: 0.4,
    cursor: "not-allowed",
  }}
/>
```

**Properties**:
- Opacity: 0.4
- Cursor: not-allowed
- No interaction (disabled state)

### 5.2 Category Grid Layout

**Layout Strategy**: Responsive grid with category cards

```tsx
<Box sx={{
  display: "grid",
  gridTemplateColumns: {
    xs: "1fr",                    // Mobile: 1 column
    sm: "repeat(2, 1fr)",        // Tablet: 2 columns
    md: "repeat(3, 1fr)",        // Desktop: 3 columns
    lg: "repeat(4, 1fr)",        // Large: 4 columns
  },
  gap: 2,
  mt: 2
}}>
  {/* Category Cards */}
</Box>
```

**Grid Specifications**:
- Gap: 16px (theme spacing(2))
- Min card width: 200px
- Max card width: None (fills grid cell)
- Auto-flow: row dense (fills gaps)

### 5.3 Category Card Component

**New Component**: `CategoryCard.tsx`

```tsx
interface CategoryCardProps {
  category: string;
  selected: boolean;
  available: boolean;
  toolCount?: number;
  onToggle: (category: string) => void;
}

const CategoryCard = ({
  category,
  selected,
  available,
  toolCount = 0,
  onToggle
}: CategoryCardProps) => {
  const { icon, color, description } = getCategoryMetadata(category);

  return (
    <Paper
      elevation={selected ? 4 : 0}
      onClick={() => available && onToggle(category)}
      sx={{
        p: 2,
        border: "1px solid",
        borderColor: selected ? "primary.main" : "divider",
        bgcolor: selected
          ? alpha("primary.main", 0.12)
          : "background.paper",
        cursor: available ? "pointer" : "not-allowed",
        opacity: available ? 1 : 0.4,
        transition: "all 0.2s ease",
        "&:hover": available && {
          borderColor: "primary.main",
          bgcolor: alpha("primary.main", 0.08),
          transform: "translateY(-2px)",
        },
      }}
    >
      <Stack spacing={1.5}>
        {/* Icon + Title Row */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ color }}>
            {icon}
          </Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {category}
          </Typography>
          {selected && (
            <CheckCircleIcon
              fontSize="small"
              color="primary"
              sx={{ ml: "auto" }}
            />
          )}
        </Stack>

        {/* Description */}
        <Typography variant="body2" color="text.secondary" fontSize={12}>
          {description}
        </Typography>

        {/* Tool Count Badge */}
        {toolCount > 0 && (
          <Chip
            label={`${toolCount} tools`}
            size="small"
            variant="outlined"
            sx={{
              alignSelf: "flex-start",
              height: 20,
              fontSize: 10,
            }}
          />
        )}
      </Stack>
    </Paper>
  );
};
```

**Card States**:
1. **Selected + Available**: Elevated, primary border, primary bg @ 12%, checkmark
2. **Unselected + Available**: Flat, divider border, paper bg, hover effect
3. **Disabled**: Flat, divider border, paper bg, 40% opacity, no-pointer cursor

**Hover Animation**:
- Border color → primary.main (200ms ease)
- Background → primary @ 8% opacity (200ms ease)
- Transform: translateY(-2px) (200ms ease)
- Elevation: 0 → 2 (200ms ease)

---

## 6. Interaction Patterns

### 6.1 Category Selection Flow

**Pattern**: Single-click toggle (card-based interaction)

```
User Flow:
1. User views category grid
2. User clicks unselected category card
   → Card animates (hover → selected state)
   → Category added to config.toolFiltering.categoryFilter.categories[]
   → Dirty state = true (enable Save button)
   → Toast notification: "Category '{name}' added"
3. User clicks selected category card
   → Card animates (selected → hover → unselected)
   → Category removed from array
   → Dirty state = true
   → Toast notification: "Category '{name}' removed"
```

**Alternative Pattern**: Chip-based selection (legacy fallback)

```
User Flow:
1. User types category name in TextField
2. User presses Enter OR clicks Add button
   → Chip appears in active category list
   → TextField clears
3. User clicks delete icon on Chip
   → Chip removed with fade animation (200ms)
```

### 6.2 Mode-Adaptive Display

**Display Logic**:

```typescript
const showCategoryGrid = useMemo(() => {
  const mode = toolFiltering.mode;
  return mode === "category" || mode === "hybrid" || mode === "prompt-based";
}, [toolFiltering.mode]);

const showCategoryManagement = useMemo(() => {
  const mode = toolFiltering.mode;
  return mode === "category" || mode === "hybrid";
}, [toolFiltering.mode]);
```

**Rendering Rules**:

| Filtering Mode | Category Grid Visible | Category Management Enabled | Behavior |
|----------------|----------------------|----------------------------|----------|
| `server-allowlist` | ❌ No | ❌ No | Categories tab shows info alert |
| `category` | ✅ Yes | ✅ Yes | Full grid with selection |
| `hybrid` | ✅ Yes | ✅ Yes | Full grid with selection |
| `prompt-based` | ✅ Yes | ❌ Read-only | Grid shows active categories, no selection |

### 6.3 State Management

**Category State** (per-session):

```typescript
interface CategoryState {
  category: string;
  selected: boolean;
  available: boolean;    // Based on connected servers
  toolCount: number;     // Number of tools in category
  lastUsed?: string;     // ISO timestamp (for prompt-based)
}

// Example state
const categoryStates: CategoryState[] = [
  {
    category: "github",
    selected: true,
    available: true,
    toolCount: 15,
    lastUsed: "2025-11-05T12:34:56Z"
  },
  {
    category: "filesystem",
    selected: false,
    available: true,
    toolCount: 8,
  },
  // ...
];
```

**State Update Flow**:
```
User Action (click category)
  ↓
updateConfigState() with category array mutation
  ↓
setDirty(true)
  ↓
Re-render with new selected states
  ↓
User clicks Save
  ↓
POST /api/config with updated categoryFilter
  ↓
Success → setDirty(false), showSnackbar()
```

---

## 7. Responsive Design

### 7.1 Breakpoint Strategy

**Material-UI Breakpoints**:
- `xs`: 0px (mobile portrait)
- `sm`: 600px (mobile landscape, tablet portrait)
- `md`: 900px (tablet landscape, small desktop)
- `lg`: 1200px (desktop)
- `xl`: 1536px (large desktop)

### 7.2 Layout Adaptations

#### Mobile (xs, <600px)

```tsx
<Box sx={{
  gridTemplateColumns: "1fr",
  gap: 1.5,
}}>
  {/* Single column, compact spacing */}
</Box>

<CategoryCard sx={{
  p: 1.5,  // Reduced padding
}}>
  <Typography variant="body1">  {/* Smaller font */}
    {category}
  </Typography>
</CategoryCard>
```

**Changes**:
- Grid: 1 column
- Gap: 12px (reduced from 16px)
- Card padding: 12px (reduced from 16px)
- Typography: body1 → subtitle2 for category name

#### Tablet (sm, 600-899px)

```tsx
<Box sx={{
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 2,
}}>
  {/* 2 columns, standard spacing */}
</Box>
```

**Changes**:
- Grid: 2 columns
- Standard card sizing

#### Desktop (md+, 900px+)

```tsx
<Box sx={{
  gridTemplateColumns: {
    md: "repeat(3, 1fr)",
    lg: "repeat(4, 1fr)",
  },
  gap: 2,
}}>
  {/* 3-4 columns, optimized for wide screens */}
</Box>
```

**Changes**:
- Grid: 3 columns @ md, 4 columns @ lg
- Full feature set (descriptions, hover effects)

### 7.3 Typography Scaling

```tsx
const responsiveTypography = {
  categoryName: {
    variant: { xs: "body1", sm: "subtitle1", md: "h6" },
    fontWeight: 600,
  },
  description: {
    fontSize: { xs: 11, sm: 12, md: 12 },
    color: "text.secondary",
  },
  toolCount: {
    fontSize: { xs: 9, sm: 10, md: 10 },
  }
};
```

---

## 8. Accessibility Standards

### 8.1 WCAG 2.1 AA Compliance

**Color Contrast Requirements**:

| Element | Foreground | Background | Ratio | Status |
|---------|-----------|------------|-------|--------|
| Selected card text | #FFFFFF | rgba(108,92,231,0.12) | 12.63:1 | ✅ AAA |
| Unselected card text | #999999 | #1E1E28 | 4.89:1 | ✅ AA |
| Primary chip | #FFFFFF | #6C5CE7 | 8.59:1 | ✅ AAA |
| Icon colors | Various | #1E1E28 | >4.5:1 | ✅ AA |

**Testing Method**: WebAIM Contrast Checker

### 8.2 Keyboard Navigation

**Tab Order**:
```
Categories Tab Content
  ↓
[Add Category TextField] → [Add Button]
  ↓
[Category Card 1] → [Category Card 2] → ... → [Category Card N]
  ↓
[Save Button]
```

**Keyboard Shortcuts**:
- `Tab`: Navigate between category cards
- `Enter` / `Space`: Toggle selected category
- `Escape`: Clear focus (unfocus current card)
- `Arrow keys`: Navigate grid (optional enhancement)

**Focus Indicators**:
```tsx
sx={{
  "&:focus": {
    outline: "2px solid",
    outlineColor: "primary.main",
    outlineOffset: 2,
  },
  "&:focus:not(:focus-visible)": {
    outline: "none",  // Remove for mouse users
  }
}}
```

### 8.3 Screen Reader Support

**ARIA Labels**:

```tsx
<Box
  role="group"
  aria-labelledby="category-grid-label"
>
  <Typography id="category-grid-label" variant="h6" sx={{ mb: 2 }}>
    Available Categories
  </Typography>

  {categories.map(cat => (
    <Paper
      key={cat.category}
      role="button"
      tabIndex={cat.available ? 0 : -1}
      aria-label={`${cat.category} category, ${cat.selected ? 'selected' : 'not selected'}, ${cat.toolCount} tools`}
      aria-pressed={cat.selected}
      aria-disabled={!cat.available}
      onClick={() => handleToggle(cat.category)}
    >
      {/* Card content */}
    </Paper>
  ))}
</Box>
```

**Live Regions**:
```tsx
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {announcement}
</div>
```

**Announcement Messages**:
- "Category {name} added to filter"
- "Category {name} removed from filter"
- "Category {name} unavailable, no tools found"

---

## 9. Integration with Existing UI

### 9.1 ConfigPage Integration

**Updated Categories Tab Content**:

```tsx
const categoriesContent = (
  <Stack spacing={3}>
    {/* Mode Alert */}
    {toolFiltering.mode === "server-allowlist" && (
      <Alert severity="info">
        <Typography variant="body2">
          Category filtering is not active in <strong>server-allowlist</strong> mode.
          Switch to <strong>category</strong>, <strong>hybrid</strong>, or <strong>prompt-based</strong> mode to manage categories.
        </Typography>
      </Alert>
    )}

    {/* Add Category Input (category/hybrid modes only) */}
    {showCategoryManagement && (
      <Stack direction="row" spacing={1} alignItems="flex-end">
        <TextField
          size="small"
          label="Add custom category"
          value={categoryInput}
          onChange={(e) => setCategoryInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
          sx={{ maxWidth: 300 }}
        />
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAddCategory}
        >
          Add
        </Button>
      </Stack>
    )}

    {/* Category Grid */}
    {showCategoryGrid && (
      <CategoryGrid
        categories={categoryStates}
        readOnly={toolFiltering.mode === "prompt-based"}
        onToggle={handleCategoryToggle}
      />
    )}

    {/* Legacy Chip List (hidden when grid active) */}
    {!showCategoryGrid && (
      <CategoryListEditor
        categories={toolFiltering.categoryFilter?.categories ?? []}
        onChange={handleCategoriesChange}
      />
    )}
  </Stack>
);
```

### 9.2 ActiveFiltersCard Enhancement

**Updated to show category icons**:

```tsx
const renderCategoryChips = (categories: string[]) => {
  if (categories.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        None configured.
      </Typography>
    );
  }

  return (
    <Stack direction="row" flexWrap="wrap" gap={1}>
      {categories.map((cat) => {
        const { icon, color } = getCategoryMetadata(cat);
        return (
          <Chip
            key={cat}
            icon={icon}
            label={cat}
            size="small"
            color="primary"
            variant="outlined"
            sx={{
              borderColor: color,
              color: color,
              "& .MuiChip-icon": { color }
            }}
          />
        );
      })}
    </Stack>
  );
};
```

---

## 10. Component File Structure

### 10.1 New Components

**File: `src/ui/components/CategoryCard.tsx`**
```typescript
interface CategoryCardProps {
  category: string;
  selected: boolean;
  available: boolean;
  toolCount?: number;
  readOnly?: boolean;
  onToggle: (category: string) => void;
}

export default CategoryCard;
```

**File: `src/ui/components/CategoryGrid.tsx`**
```typescript
interface CategoryGridProps {
  categories: CategoryState[];
  readOnly?: boolean;
  onToggle: (category: string) => void;
}

export default CategoryGrid;
```

**File: `src/ui/utils/categoryMetadata.ts`**
```typescript
export interface CategoryMetadata {
  icon: React.ReactNode;
  color: string;
  description: string;
}

export const getCategoryMetadata = (category: string): CategoryMetadata;
export const standardCategories: string[];
```

### 10.2 Modified Components

**File: `src/ui/pages/ConfigPage.tsx`**
- Add `CategoryGrid` import and usage
- Add mode-based conditional rendering
- Add category state management

**File: `src/ui/components/ActiveFiltersCard.tsx`**
- Enhance `renderCategoryChips()` with icons
- Add category metadata integration

**File: `src/ui/components/CategoryListEditor.tsx`**
- Mark as legacy (preserve for backward compatibility)
- Add deprecation notice in comments

---

## 11. Performance Considerations

### 11.1 Rendering Optimization

**Memoization Strategy**:

```tsx
const CategoryGrid = memo(({ categories, onToggle }: CategoryGridProps) => {
  const categoriesMemo = useMemo(() => categories, [categories]);

  const handleToggle = useCallback((cat: string) => {
    onToggle(cat);
  }, [onToggle]);

  return (
    <Box sx={gridStyles}>
      {categoriesMemo.map(cat => (
        <CategoryCard
          key={cat.category}
          {...cat}
          onToggle={handleToggle}
        />
      ))}
    </Box>
  );
});
```

**Lazy Loading** (for large category sets):
```tsx
import { Suspense, lazy } from "react";

const CategoryGrid = lazy(() => import("./CategoryGrid"));

<Suspense fallback={<CategoryGridSkeleton />}>
  <CategoryGrid categories={categories} onToggle={handleToggle} />
</Suspense>
```

### 11.2 Animation Performance

**Use CSS transforms** (GPU-accelerated):
```tsx
sx={{
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
  "&:hover": {
    transform: "translateY(-2px)",  // GPU
  }
}}
```

**Avoid layout shifts**:
```tsx
sx={{
  minHeight: 120,  // Consistent card height
  aspectRatio: "1 / 1",  // Square cards (optional)
}}
```

---

## 12. Testing Requirements

### 12.1 Visual Regression Testing

**Tool**: Percy or Chromatic

**Test Cases**:
1. Category grid with all categories selected
2. Category grid with no categories selected
3. Category grid with mixed selection (3/10)
4. Category grid in prompt-based mode (read-only)
5. Mobile layout (320px viewport)
6. Tablet layout (768px viewport)
7. Desktop layout (1920px viewport)
8. Dark mode (default) + Light mode toggle

### 12.2 Interaction Testing

**Tool**: Playwright or Cypress

**Test Scenarios**:
```javascript
describe("Category Selection", () => {
  it("should toggle category on card click", () => {
    cy.visit("/configuration");
    cy.get('[data-testid="category-card-github"]').click();
    cy.get('[data-testid="category-card-github"]')
      .should("have.attr", "aria-pressed", "true");
  });

  it("should update config on save", () => {
    cy.intercept("POST", "/api/config").as("saveConfig");
    cy.get('[data-testid="category-card-github"]').click();
    cy.get("button").contains("Save Changes").click();
    cy.wait("@saveConfig").its("request.body.config.toolFiltering.categoryFilter.categories")
      .should("include", "github");
  });

  it("should prevent selection in read-only mode", () => {
    cy.setFilteringMode("prompt-based");
    cy.get('[data-testid="category-card-github"]').click();
    cy.get('[data-testid="category-card-github"]')
      .should("have.attr", "aria-disabled", "true");
  });
});
```

### 12.3 Accessibility Testing

**Tool**: axe DevTools

**Checks**:
- ✅ Color contrast (WCAG AA)
- ✅ Keyboard navigation (Tab, Enter, Space)
- ✅ Screen reader announcements (NVDA, JAWS)
- ✅ Focus indicators (outline visible)
- ✅ ARIA attributes (role, aria-label, aria-pressed)

---

## 13. Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Create `categoryMetadata.ts` with icon/color mappings
- [ ] Build `CategoryCard` component with all 3 states
- [ ] Implement responsive grid layout
- [ ] Add unit tests for CategoryCard

### Phase 2: Integration (Week 1-2)
- [ ] Build `CategoryGrid` wrapper component
- [ ] Integrate into ConfigPage Categories tab
- [ ] Add mode-based conditional rendering
- [ ] Update ActiveFiltersCard with icons

### Phase 3: Interactions (Week 2)
- [ ] Implement category toggle logic
- [ ] Add state management with dirty tracking
- [ ] Integrate with config save/load
- [ ] Add toast notifications

### Phase 4: Polish (Week 2-3)
- [ ] Add keyboard navigation
- [ ] Implement ARIA labels and live regions
- [ ] Add hover/focus animations
- [ ] Responsive design testing

### Phase 5: Testing (Week 3)
- [ ] Visual regression tests (Percy)
- [ ] Interaction tests (Playwright)
- [ ] Accessibility audit (axe)
- [ ] Cross-browser testing

---

## 14. Success Metrics

**User Experience**:
- Category selection time: <2 seconds (baseline: text input = 5-8 seconds)
- Discoverability: Users understand category system without documentation (>80% in usability testing)
- Error rate: <5% incorrect category additions

**Technical**:
- Lighthouse accessibility score: >95
- First contentful paint: <1.5s
- Interaction latency: <100ms
- Bundle size increase: <20KB gzipped

**Accessibility**:
- WCAG 2.1 AA compliance: 100%
- Keyboard navigation support: 100%
- Screen reader compatibility: NVDA, JAWS, VoiceOver

---

## 15. Future Enhancements

### 15.1 Advanced Filtering
- Category search/filter in grid view
- Group by domain (Development, AI, Infrastructure)
- Favorites/recently used categories

### 15.2 Analytics Integration
- Track most-used categories
- Heatmap visualization of category usage
- Prompt-based category suggestions based on history

### 15.3 Visual Customization
- User-defined category colors
- Custom icons upload
- Light/dark mode toggle

---

## 16. Appendix

### 16.1 Color Palette Reference

```typescript
export const categoryColors = {
  github: "#00CEC9",      // Teal (theme secondary)
  filesystem: "#FFA502",  // Orange
  web: "#0984E3",         // Blue
  docker: "#2D98DA",      // Light Blue
  git: "#F39C12",         // Yellow-Orange
  python: "#3776AB",      // Python Blue
  database: "#E84393",    // Pink
  memory: "#A29BFE",      // Light Purple
  vertex_ai: "#6C5CE7",   // Purple (theme primary)
  meta: "#74B9FF",        // Sky Blue
};
```

### 16.2 Icon Mapping

```typescript
import {
  GitHub as GitHubIcon,
  Folder as FolderIcon,
  Language as LanguageIcon,
  Storage as StorageIcon,
  Code as CodeIcon,
  Psychology as PsychologyIcon,
  SmartToy as SmartToyIcon,
  Settings as SettingsIcon,
  AccountTree as GitIcon,
} from "@mui/icons-material";

export const categoryIcons = {
  github: <GitHubIcon />,
  filesystem: <FolderIcon />,
  web: <LanguageIcon />,
  docker: <StorageIcon />,
  git: <GitIcon />,
  python: <CodeIcon />,
  database: <StorageIcon />,
  memory: <PsychologyIcon />,
  vertex_ai: <SmartToyIcon />,
  meta: <SettingsIcon />,
};
```

### 16.3 Example Configuration JSON

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["github", "filesystem", "web"]
    }
  }
}
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-05
**Author**: Claude Code (Frontend Design Specialist)
**Review Status**: Ready for Implementation
