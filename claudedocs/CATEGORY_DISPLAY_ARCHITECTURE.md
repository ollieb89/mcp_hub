# Category Display Frontend Architecture

**Purpose**: Implementation guide for MCP Hub category management UI
**Status**: Implementation Ready
**Related**: CATEGORY_DISPLAY_DESIGN_SPEC.md (detailed design)

---

## 1. Component Architecture

### Component Hierarchy

```
ConfigPage (existing)
├── ConfigTabs
    └── Categories Tab
        ├── Alert (mode-specific info)
        ├── CategoryInputRow (category/hybrid modes only)
        │   ├── TextField (add custom category)
        │   └── Button (Add)
        └── CategoryGrid (NEW)
            └── CategoryCard[] (NEW)
                ├── Icon + Title
                ├── Description
                └── Tool Count Badge
```

### File Structure

```
src/ui/
├── components/
│   ├── CategoryCard.tsx          (NEW) - Single category card component
│   ├── CategoryGrid.tsx          (NEW) - Grid container with layout logic
│   └── CategoryListEditor.tsx    (KEEP) - Legacy chip-based editor
├── utils/
│   └── categoryMetadata.ts       (NEW) - Icon/color/description mappings
└── pages/
    └── ConfigPage.tsx            (UPDATE) - Add grid integration
```

---

## 2. Data Flow & State Management

### State Structure

```typescript
// Component-level state (ConfigPage)
interface CategoryState {
  category: string;        // Category identifier
  selected: boolean;       // In config.toolFiltering.categoryFilter.categories[]
  available: boolean;      // Has connected servers providing this category
  toolCount: number;       // Number of tools in category
  lastUsed?: string;       // ISO timestamp (for prompt-based analytics)
}

// Example state
const categoryStates: CategoryState[] = [
  { category: "github", selected: true, available: true, toolCount: 15 },
  { category: "filesystem", selected: false, available: true, toolCount: 8 },
  { category: "web", selected: false, available: false, toolCount: 0 },
];
```

### State Update Flow

```
User clicks CategoryCard
  ↓
CategoryCard.onClick → onToggle(category)
  ↓
ConfigPage.handleCategoryToggle(category)
  ↓
updateConfigState((prev) => ({
  ...prev,
  toolFiltering: {
    ...prev.toolFiltering,
    categoryFilter: {
      categories: toggle(categories, category)
    }
  }
}))
  ↓
setDirty(true) → Enable Save button
  ↓
User clicks Save
  ↓
POST /api/config → Hub reloads config
```

### Mode-Based Conditional Rendering

```typescript
// ConfigPage.tsx
const showCategoryGrid = useMemo(() => {
  const mode = toolFiltering.mode;
  return ["category", "hybrid", "prompt-based"].includes(mode);
}, [toolFiltering.mode]);

const showCategoryManagement = useMemo(() => {
  const mode = toolFiltering.mode;
  return ["category", "hybrid"].includes(mode);
}, [toolFiltering.mode]);

// Rendering logic
{showCategoryGrid && (
  <CategoryGrid
    categories={categoryStates}
    readOnly={toolFiltering.mode === "prompt-based"}
    onToggle={handleCategoryToggle}
  />
)}
```

---

## 3. Component Specifications

### CategoryCard Component

**File**: `src/ui/components/CategoryCard.tsx`

**Props**:
```typescript
interface CategoryCardProps {
  category: string;
  selected: boolean;
  available: boolean;
  toolCount?: number;
  readOnly?: boolean;
  onToggle: (category: string) => void;
}
```

**States**:
1. **Selected + Available**: Elevated, primary border, checkmark, clickable
2. **Unselected + Available**: Flat, divider border, hover effect, clickable
3. **Disabled**: Flat, 40% opacity, no-pointer cursor, not clickable

**Key Features**:
- Icon from `categoryMetadata.ts`
- Semantic color coding
- Tool count badge
- Hover animation: `translateY(-2px)` + border color change
- Keyboard accessible: `tabIndex={0}`, `Enter`/`Space` to toggle

**Example**:
```tsx
<CategoryCard
  category="github"
  selected={true}
  available={true}
  toolCount={15}
  onToggle={(cat) => handleToggle(cat)}
/>
```

### CategoryGrid Component

**File**: `src/ui/components/CategoryGrid.tsx`

**Props**:
```typescript
interface CategoryGridProps {
  categories: CategoryState[];
  readOnly?: boolean;
  onToggle: (category: string) => void;
}
```

**Layout**:
```tsx
<Box sx={{
  display: "grid",
  gridTemplateColumns: {
    xs: "1fr",                  // Mobile: 1 column
    sm: "repeat(2, 1fr)",      // Tablet: 2 columns
    md: "repeat(3, 1fr)",      // Desktop: 3 columns
    lg: "repeat(4, 1fr)",      // Large: 4 columns
  },
  gap: 2,
  mt: 2
}}>
  {categories.map(cat => (
    <CategoryCard
      key={cat.category}
      {...cat}
      readOnly={readOnly}
      onToggle={onToggle}
    />
  ))}
</Box>
```

**Performance**:
- `memo()` wrapper to prevent unnecessary re-renders
- `useCallback()` for `onToggle` handler
- `useMemo()` for category state derivation

### Category Metadata Utility

**File**: `src/ui/utils/categoryMetadata.ts`

**Interface**:
```typescript
export interface CategoryMetadata {
  icon: React.ReactNode;
  color: string;
  description: string;
}

export const getCategoryMetadata = (category: string): CategoryMetadata;
export const standardCategories: string[];
```

**Implementation**:
```typescript
import {
  GitHub,
  Folder,
  Language,
  Storage,
  Code,
  Psychology,
  SmartToy,
  Settings,
  AccountTree,
} from "@mui/icons-material";

const categoryMetadata: Record<string, CategoryMetadata> = {
  github: {
    icon: <GitHub />,
    color: "#00CEC9",
    description: "GitHub operations (repos, issues, PRs)",
  },
  filesystem: {
    icon: <Folder />,
    color: "#FFA502",
    description: "File reading/writing operations",
  },
  // ... (see CATEGORY_DISPLAY_DESIGN_SPEC.md section 4.1)
};

export const getCategoryMetadata = (category: string): CategoryMetadata => {
  return categoryMetadata[category] ?? {
    icon: <Settings />,
    color: "#999",
    description: "Custom category",
  };
};

export const standardCategories = Object.keys(categoryMetadata);
```

---

## 4. Integration Points

### ConfigPage Updates

**File**: `src/ui/pages/ConfigPage.tsx`

**Changes Required**:

1. **Add Category State Management**:
```typescript
const categoryStates = useMemo(() => {
  const selectedCategories = toolFiltering.categoryFilter?.categories ?? [];
  const connectedServers = /* fetch from server data */;

  return standardCategories.map(cat => ({
    category: cat,
    selected: selectedCategories.includes(cat),
    available: /* check if any server provides this category */,
    toolCount: /* count tools in this category */,
  }));
}, [toolFiltering.categoryFilter, /* server data */]);
```

2. **Add Toggle Handler**:
```typescript
const handleCategoryToggle = useCallback((category: string) => {
  updateConfigState((prev) => {
    const currentCategories = prev.toolFiltering?.categoryFilter?.categories ?? [];
    const nextCategories = currentCategories.includes(category)
      ? currentCategories.filter(c => c !== category)
      : [...currentCategories, category];

    return {
      ...prev,
      toolFiltering: {
        ...prev.toolFiltering,
        categoryFilter: {
          ...prev.toolFiltering?.categoryFilter,
          categories: nextCategories,
        },
      },
    };
  });
}, [updateConfigState]);
```

3. **Update Categories Tab Content**:
```typescript
const categoriesContent = (
  <Stack spacing={3}>
    {/* Mode-specific alert */}
    {toolFiltering.mode === "server-allowlist" && (
      <Alert severity="info">
        Category filtering not active in server-allowlist mode.
        Switch to category/hybrid/prompt-based mode.
      </Alert>
    )}

    {/* Add category input (category/hybrid only) */}
    {showCategoryManagement && (
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          label="Add custom category"
          value={categoryInput}
          onChange={(e) => setCategoryInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddCustomCategory()}
          sx={{ maxWidth: 300 }}
        />
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAddCustomCategory}
        >
          Add
        </Button>
      </Stack>
    )}

    {/* Category grid */}
    {showCategoryGrid && (
      <CategoryGrid
        categories={categoryStates}
        readOnly={toolFiltering.mode === "prompt-based"}
        onToggle={handleCategoryToggle}
      />
    )}

    {/* Legacy chip list fallback */}
    {!showCategoryGrid && (
      <CategoryListEditor
        categories={toolFiltering.categoryFilter?.categories ?? []}
        onChange={(categories) => {
          updateConfigState((prev) => ({
            ...prev,
            toolFiltering: {
              ...prev.toolFiltering,
              categoryFilter: { categories },
            },
          }));
        }}
      />
    )}
  </Stack>
);
```

### ActiveFiltersCard Enhancement

**File**: `src/ui/components/ActiveFiltersCard.tsx`

**Update**:
```typescript
const renderCategoryChips = (categories: string[]) => {
  if (categories.length === 0) {
    return <Typography variant="body2" color="text.secondary">None</Typography>;
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

## 5. Accessibility Implementation

### Keyboard Navigation

**CategoryCard.tsx**:
```tsx
<Paper
  component="button"
  tabIndex={available ? 0 : -1}
  role="button"
  aria-label={`${category} category, ${selected ? 'selected' : 'not selected'}, ${toolCount} tools`}
  aria-pressed={selected}
  aria-disabled={!available}
  onClick={() => available && !readOnly && onToggle(category)}
  onKeyDown={(e) => {
    if (available && !readOnly && ["Enter", " "].includes(e.key)) {
      e.preventDefault();
      onToggle(category);
    }
  }}
  sx={{
    cursor: available && !readOnly ? "pointer" : "not-allowed",
    "&:focus-visible": {
      outline: "2px solid",
      outlineColor: "primary.main",
      outlineOffset: 2,
    }
  }}
>
  {/* Card content */}
</Paper>
```

### Screen Reader Announcements

**CategoryGrid.tsx**:
```tsx
const CategoryGrid = ({ categories, readOnly, onToggle }: CategoryGridProps) => {
  const [announcement, setAnnouncement] = useState("");

  const handleToggle = useCallback((category: string) => {
    onToggle(category);
    const cat = categories.find(c => c.category === category);
    const action = cat?.selected ? "removed from" : "added to";
    setAnnouncement(`Category ${category} ${action} filter`);
  }, [onToggle, categories]);

  return (
    <>
      <Box
        role="group"
        aria-labelledby="category-grid-label"
        sx={{ /* grid styles */ }}
      >
        <Typography id="category-grid-label" variant="h6" sx={{ mb: 2 }}>
          Available Categories
        </Typography>
        {categories.map(cat => (
          <CategoryCard key={cat.category} {...cat} onToggle={handleToggle} />
        ))}
      </Box>

      {/* Screen reader live region */}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "absolute",
          left: "-10000px",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        {announcement}
      </div>
    </>
  );
};
```

---

## 6. Responsive Design

### Breakpoint Strategy

```typescript
// Grid columns by breakpoint
const gridColumns = {
  xs: "1fr",                  // <600px: Single column
  sm: "repeat(2, 1fr)",      // 600-899px: 2 columns
  md: "repeat(3, 1fr)",      // 900-1199px: 3 columns
  lg: "repeat(4, 1fr)",      // 1200px+: 4 columns
};

// Card padding by breakpoint
const cardPadding = {
  xs: 1.5,  // 12px on mobile
  sm: 2,    // 16px on tablet+
};

// Typography scaling
const titleVariant = {
  xs: "body1",
  sm: "subtitle1",
  md: "h6",
};
```

### Mobile Optimization

```tsx
<CategoryCard
  sx={{
    p: { xs: 1.5, sm: 2 },
    "& .MuiTypography-root": {
      fontSize: { xs: 14, sm: 16 },
    },
  }}
/>
```

---

## 7. Performance Optimization

### Memoization

```typescript
// CategoryGrid.tsx
export const CategoryGrid = memo(({ categories, readOnly, onToggle }: CategoryGridProps) => {
  const handleToggle = useCallback((cat: string) => {
    onToggle(cat);
  }, [onToggle]);

  return (
    <Box sx={gridStyles}>
      {categories.map(cat => (
        <CategoryCard key={cat.category} {...cat} onToggle={handleToggle} />
      ))}
    </Box>
  );
});
CategoryGrid.displayName = "CategoryGrid";
```

### Animation Performance

```tsx
// Use GPU-accelerated transforms
sx={{
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
  "&:hover": {
    transform: "translateY(-2px)",  // GPU-accelerated
  }
}}

// Avoid transitions on: margin, padding, width, height (causes layout shift)
```

---

## 8. Testing Strategy

### Unit Tests

**File**: `tests/ui/CategoryCard.test.tsx`

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import CategoryCard from "@components/CategoryCard";

describe("CategoryCard", () => {
  it("renders category with icon and description", () => {
    render(
      <CategoryCard
        category="github"
        selected={false}
        available={true}
        toolCount={15}
        onToggle={() => {}}
      />
    );
    expect(screen.getByText("github")).toBeInTheDocument();
    expect(screen.getByText(/GitHub operations/i)).toBeInTheDocument();
  });

  it("toggles selection on click", () => {
    const onToggle = vi.fn();
    render(
      <CategoryCard
        category="github"
        selected={false}
        available={true}
        onToggle={onToggle}
      />
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledWith("github");
  });

  it("prevents interaction when disabled", () => {
    const onToggle = vi.fn();
    render(
      <CategoryCard
        category="github"
        selected={false}
        available={false}
        onToggle={onToggle}
      />
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("prevents interaction in read-only mode", () => {
    const onToggle = vi.fn();
    render(
      <CategoryCard
        category="github"
        selected={true}
        available={true}
        readOnly={true}
        onToggle={onToggle}
      />
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).not.toHaveBeenCalled();
  });
});
```

### Integration Tests

**File**: `tests/ui/CategoryGrid.test.tsx`

```typescript
describe("CategoryGrid", () => {
  it("renders all categories", () => {
    const categories: CategoryState[] = [
      { category: "github", selected: true, available: true, toolCount: 15 },
      { category: "filesystem", selected: false, available: true, toolCount: 8 },
    ];
    render(<CategoryGrid categories={categories} onToggle={() => {}} />);
    expect(screen.getByText("github")).toBeInTheDocument();
    expect(screen.getByText("filesystem")).toBeInTheDocument();
  });

  it("applies read-only mode to all cards", () => {
    const categories: CategoryState[] = [
      { category: "github", selected: false, available: true, toolCount: 15 },
    ];
    const onToggle = vi.fn();
    render(<CategoryGrid categories={categories} readOnly={true} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).not.toHaveBeenCalled();
  });
});
```

---

## 9. Implementation Checklist

### Phase 1: Foundation Components
- [ ] Create `src/ui/utils/categoryMetadata.ts`
  - [ ] Define `CategoryMetadata` interface
  - [ ] Import MUI icons
  - [ ] Create `categoryMetadata` object with all 10 categories
  - [ ] Implement `getCategoryMetadata()` function
  - [ ] Export `standardCategories` array

- [ ] Create `src/ui/components/CategoryCard.tsx`
  - [ ] Define `CategoryCardProps` interface
  - [ ] Implement component with 3 states (selected, unselected, disabled)
  - [ ] Add icon + title + description + tool count badge
  - [ ] Implement hover animations
  - [ ] Add keyboard navigation support
  - [ ] Add ARIA attributes

- [ ] Create `src/ui/components/CategoryGrid.tsx`
  - [ ] Define `CategoryGridProps` interface
  - [ ] Implement responsive grid layout
  - [ ] Add screen reader live region
  - [ ] Wrap with `memo()` for performance

### Phase 2: Integration
- [ ] Update `src/ui/pages/ConfigPage.tsx`
  - [ ] Import `CategoryGrid` and `categoryMetadata`
  - [ ] Add `categoryStates` computation with `useMemo()`
  - [ ] Add `handleCategoryToggle()` callback
  - [ ] Add `showCategoryGrid` and `showCategoryManagement` logic
  - [ ] Update `categoriesContent` to include grid
  - [ ] Add custom category input row

- [ ] Update `src/ui/components/ActiveFiltersCard.tsx`
  - [ ] Import `getCategoryMetadata`
  - [ ] Update `renderCategoryChips()` to include icons

### Phase 3: Testing
- [ ] Create `tests/ui/CategoryCard.test.tsx`
  - [ ] Test rendering with different states
  - [ ] Test click interaction
  - [ ] Test disabled state
  - [ ] Test read-only mode
  - [ ] Test keyboard navigation

- [ ] Create `tests/ui/CategoryGrid.test.tsx`
  - [ ] Test rendering all categories
  - [ ] Test toggle propagation
  - [ ] Test read-only mode
  - [ ] Test responsive layout

### Phase 4: Accessibility Validation
- [ ] Run axe DevTools accessibility audit
- [ ] Test keyboard navigation (Tab, Enter, Space)
- [ ] Test screen reader announcements (NVDA/JAWS/VoiceOver)
- [ ] Verify color contrast (WCAG AA)
- [ ] Test focus indicators visibility

### Phase 5: Visual QA
- [ ] Test responsive layout at breakpoints (320px, 600px, 900px, 1200px)
- [ ] Verify hover animations work smoothly
- [ ] Check selected/unselected visual states
- [ ] Validate dark theme consistency
- [ ] Test in Chrome, Firefox, Safari

---

## 10. API Requirements

### Backend Support Needed

**GET /api/servers** - Already exists, enhance response:
```json
{
  "servers": [
    {
      "name": "github",
      "capabilities": {
        "tools": [
          { "name": "search_repos", "category": "github" },
          { "name": "create_issue", "category": "github" }
        ]
      }
    }
  ]
}
```

**Category Derivation** (client-side):
```typescript
// In ConfigPage.tsx
const getAvailableCategories = (servers: ServerInfo[]): Set<string> => {
  const categories = new Set<string>();
  servers.forEach(server => {
    server.capabilities?.tools?.forEach((tool: any) => {
      if (tool.category) {
        categories.add(tool.category);
      }
    });
  });
  return categories;
};

const getToolCountByCategory = (servers: ServerInfo[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  servers.forEach(server => {
    server.capabilities?.tools?.forEach((tool: any) => {
      if (tool.category) {
        counts[tool.category] = (counts[tool.category] ?? 0) + 1;
      }
    });
  });
  return counts;
};
```

---

## 11. Migration Strategy

### Backward Compatibility

**Keep existing CategoryListEditor**:
```typescript
// ConfigPage.tsx
{!showCategoryGrid && (
  <CategoryListEditor
    categories={toolFiltering.categoryFilter?.categories ?? []}
    onChange={handleCategoriesChange}
  />
)}
```

**Gradual rollout**:
1. Deploy new components alongside old
2. Use feature flag to toggle (if needed)
3. Monitor analytics for adoption
4. Deprecate CategoryListEditor in future release

---

## 12. Success Metrics

**User Experience**:
- Category selection time: <2 seconds (vs 5-8s with text input)
- Error rate: <5% incorrect category additions
- User satisfaction: >80% prefer grid over text input

**Technical**:
- Lighthouse accessibility score: >95
- First contentful paint: <1.5s
- Interaction latency: <100ms
- Bundle size increase: <20KB gzipped

**Accessibility**:
- WCAG 2.1 AA compliance: 100%
- Keyboard navigation: 100% functional
- Screen reader compatibility: NVDA, JAWS, VoiceOver

---

## Summary

This architecture provides:
1. **Modular components** - CategoryCard, CategoryGrid, categoryMetadata
2. **Responsive design** - Mobile-first with 4 breakpoints
3. **Accessibility first** - WCAG AA, keyboard nav, screen readers
4. **Performance optimized** - Memoization, GPU animations, lazy loading
5. **Backward compatible** - Keep existing CategoryListEditor
6. **Mode-adaptive** - Behavior changes based on filtering mode

Implementation time: ~3 days for experienced React developer
Testing time: ~1 day for comprehensive coverage
Total: ~1 week for production-ready implementation
