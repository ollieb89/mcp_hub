# Category Metadata Integration Guide

**Purpose**: Step-by-step guide for integrating category metadata into MCP Hub UI
**Version**: 1.0
**Date**: 2025-11-05

---

## Quick Start

### 1. Import Category Utilities

```typescript
// In any component or utility file
import {
  getCategoryMetadata,
  getAllCategories,
  isStandardCategory,
  getCategoriesByTag,
  STANDARD_CATEGORIES,
} from "@/ui/data/categoryMetadata";
```

### 2. Basic Usage Examples

```typescript
// Get metadata for a category
const github = getCategoryMetadata("github");
console.log(github);
// {
//   id: "github",
//   displayName: "GitHub",
//   description: "GitHub operations (repos, issues, PRs)",
//   icon: <GitHubIcon />,
//   color: "#00CEC9",
//   ...
// }

// Get all standard categories
const all = getAllCategories();
console.log(all.length); // 10

// Check if standard
isStandardCategory("github"); // true
isStandardCategory("my-custom"); // false

// Filter by tag
const devTools = getCategoriesByTag("development");
console.log(devTools.map(c => c.id));
// ["github", "filesystem", "git", "python"]
```

---

## Integration Patterns

### Pattern 1: Enhanced CategoryListEditor

**Location**: `src/ui/components/CategoryListEditor.tsx`

**Enhancement**: Add category suggestions with icons

```typescript
import { getCategoryMetadata, STANDARD_CATEGORIES } from "@/ui/data/categoryMetadata";

const CategoryListEditor = ({ categories, onChange }: Props) => {
  // ... existing code ...

  // Add autocomplete suggestions
  const suggestions = STANDARD_CATEGORIES.filter(
    cat => !categories.includes(cat)
  );

  return (
    <Box>
      {/* Existing TextField */}
      <TextField
        // ... existing props ...
      />

      {/* NEW: Category suggestions */}
      {input && suggestions.length > 0 && (
        <Paper sx={{ mt: 1, p: 1 }}>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Suggestions:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {suggestions
              .filter(cat => cat.includes(input.toLowerCase()))
              .slice(0, 5)
              .map(cat => {
                const meta = getCategoryMetadata(cat);
                return (
                  <Chip
                    key={cat}
                    icon={meta.icon}
                    label={meta.displayName}
                    size="small"
                    onClick={() => {
                      onChange([...categories, cat]);
                      setInput("");
                    }}
                    sx={{ cursor: "pointer" }}
                  />
                );
              })}
          </Stack>
        </Paper>
      )}

      {/* Enhanced chip display with icons */}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {categories.map((category) => {
          const meta = getCategoryMetadata(category);
          return (
            <Chip
              key={category}
              icon={meta.icon}
              label={meta.displayName}
              onDelete={() => handleRemove(category)}
              size="small"
              variant="outlined"
              sx={{
                borderColor: meta.color,
                color: meta.color,
                "& .MuiChip-icon": { color: meta.color },
              }}
            />
          );
        })}
      </Stack>
    </Box>
  );
};
```

### Pattern 2: CategoryCard Component (NEW)

**Location**: `src/ui/components/CategoryCard.tsx`

```typescript
import { Paper, Stack, Typography, Chip, Box } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { alpha } from "@mui/material/styles";
import { getCategoryMetadata } from "@/ui/data/categoryMetadata";

interface CategoryCardProps {
  category: string;
  selected: boolean;
  available: boolean;
  toolCount?: number;
  readOnly?: boolean;
  onToggle: (category: string) => void;
}

const CategoryCard = ({
  category,
  selected,
  available,
  toolCount = 0,
  readOnly = false,
  onToggle,
}: CategoryCardProps) => {
  const { icon, color, description, displayName } = getCategoryMetadata(category);

  const handleClick = () => {
    if (available && !readOnly) {
      onToggle(category);
    }
  };

  return (
    <Paper
      elevation={selected ? 4 : 0}
      onClick={handleClick}
      sx={{
        p: 2,
        border: "1px solid",
        borderColor: selected ? "primary.main" : "divider",
        bgcolor: selected ? alpha("primary.main", 0.12) : "background.paper",
        cursor: available && !readOnly ? "pointer" : "not-allowed",
        opacity: available ? 1 : 0.4,
        transition: "all 0.2s ease",
        "&:hover": available && !readOnly && {
          borderColor: "primary.main",
          bgcolor: alpha("primary.main", 0.08),
          transform: "translateY(-2px)",
        },
      }}
      role="button"
      tabIndex={available && !readOnly ? 0 : -1}
      aria-label={`${displayName} category, ${selected ? "selected" : "not selected"}, ${toolCount} tools`}
      aria-pressed={selected}
      aria-disabled={!available || readOnly}
    >
      <Stack spacing={1.5}>
        {/* Icon + Title Row */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ color }}>{icon}</Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {displayName}
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

export default CategoryCard;
```

### Pattern 3: CategoryGrid Component (NEW)

**Location**: `src/ui/components/CategoryGrid.tsx`

```typescript
import { Box, Typography } from "@mui/material";
import { useMemo, useCallback, memo } from "react";
import CategoryCard from "./CategoryCard";
import { getAllCategories } from "@/ui/data/categoryMetadata";

interface CategoryState {
  category: string;
  selected: boolean;
  available: boolean;
  toolCount: number;
}

interface CategoryGridProps {
  selectedCategories: string[];
  onToggle: (category: string) => void;
  readOnly?: boolean;
  toolCounts?: Record<string, number>;
}

const CategoryGrid = memo(({
  selectedCategories,
  onToggle,
  readOnly = false,
  toolCounts = {},
}: CategoryGridProps) => {
  const allCategories = getAllCategories();

  const categoryStates: CategoryState[] = useMemo(() => {
    return allCategories.map(cat => ({
      category: cat.id,
      selected: selectedCategories.includes(cat.id),
      available: toolCounts[cat.id] > 0 || cat.id === "meta",
      toolCount: toolCounts[cat.id] || 0,
    }));
  }, [allCategories, selectedCategories, toolCounts]);

  const handleToggle = useCallback((category: string) => {
    onToggle(category);
  }, [onToggle]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Available Categories
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: 2,
          mt: 2,
        }}
        role="group"
        aria-labelledby="category-grid-label"
      >
        {categoryStates.map(state => (
          <CategoryCard
            key={state.category}
            category={state.category}
            selected={state.selected}
            available={state.available}
            toolCount={state.toolCount}
            readOnly={readOnly}
            onToggle={handleToggle}
          />
        ))}
      </Box>
    </Box>
  );
});

CategoryGrid.displayName = "CategoryGrid";

export default CategoryGrid;
```

### Pattern 4: ConfigPage Integration

**Location**: `src/ui/pages/ConfigPage.tsx`

**Add mode-based rendering**:

```typescript
import CategoryGrid from "@/components/CategoryGrid";
import CategoryListEditor from "@/components/CategoryListEditor";
import { useMemo } from "react";

const ConfigPage = () => {
  // ... existing state ...

  const showCategoryGrid = useMemo(() => {
    const mode = config.toolFiltering.mode;
    return mode === "category" || mode === "hybrid" || mode === "prompt-based";
  }, [config.toolFiltering.mode]);

  const showCategoryManagement = useMemo(() => {
    const mode = config.toolFiltering.mode;
    return mode === "category" || mode === "hybrid";
  }, [config.toolFiltering.mode]);

  const handleCategoryToggle = useCallback((category: string) => {
    const current = config.toolFiltering.categoryFilter?.categories || [];
    const updated = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];

    updateConfig({
      ...config,
      toolFiltering: {
        ...config.toolFiltering,
        categoryFilter: {
          ...config.toolFiltering.categoryFilter,
          categories: updated,
        },
      },
    });
    setDirty(true);
  }, [config, updateConfig]);

  // Categories tab content
  const categoriesContent = (
    <Stack spacing={3}>
      {/* Mode alert */}
      {config.toolFiltering.mode === "server-allowlist" && (
        <Alert severity="info">
          Category filtering is not active in <strong>server-allowlist</strong> mode.
          Switch to <strong>category</strong>, <strong>hybrid</strong>, or{" "}
          <strong>prompt-based</strong> mode to manage categories.
        </Alert>
      )}

      {/* Category Grid (visual selection) */}
      {showCategoryGrid && (
        <CategoryGrid
          selectedCategories={config.toolFiltering.categoryFilter?.categories || []}
          onToggle={handleCategoryToggle}
          readOnly={config.toolFiltering.mode === "prompt-based"}
          toolCounts={getToolCounts()} // Implement this
        />
      )}

      {/* Legacy text input (for custom categories) */}
      {showCategoryManagement && (
        <CategoryListEditor
          categories={config.toolFiltering.categoryFilter?.categories || []}
          onChange={(categories) => {
            updateConfig({
              ...config,
              toolFiltering: {
                ...config.toolFiltering,
                categoryFilter: {
                  ...config.toolFiltering.categoryFilter,
                  categories,
                },
              },
            });
            setDirty(true);
          }}
          title="Custom Categories"
          helperText="Add custom categories not in the grid above"
        />
      )}
    </Stack>
  );

  // ... rest of component ...
};
```

---

## Backend Integration

### LLM Categorization Sync

**Location**: `src/mcp/llm-categorizer.js`

**IMPORTANT**: Import category data directly to maintain sync

```javascript
// Use ES modules import (not require)
import { STANDARD_CATEGORIES, getAllCategories } from "../ui/data/categoryMetadata.js";

export function buildCategorizationPrompt() {
  const categoryDescriptions = getAllCategories()
    .map(c => `- ${c.id}: ${c.description}`)
    .join("\n");

  return `
You are a tool categorization assistant. Analyze the user prompt and identify relevant tool categories.

Available categories: ${STANDARD_CATEGORIES.join(", ")}

Category descriptions:
${categoryDescriptions}

Instructions:
1. Analyze the user's prompt for keywords and intent
2. Match to relevant categories based on descriptions
3. Return 1-3 most relevant categories
4. Include confidence score (0-1)

Response format:
{
  "categories": ["category1", "category2"],
  "confidence": 0.95,
  "reasoning": "Brief explanation of category selection"
}
  `.trim();
}

// Example usage
const prompt = buildCategorizationPrompt();
const response = await callLLM(prompt, userMessage);
```

### Marketplace Integration

**Location**: `src/marketplace.js`

```javascript
import { isStandardCategory, getCategoryMetadata } from "./ui/data/categoryMetadata.js";

export class Marketplace {
  // Validate server categories
  async initialize() {
    await super.initialize();

    // Validate all server categories
    const servers = this.cache.registry?.servers || [];
    servers.forEach(server => {
      if (!isStandardCategory(server.category)) {
        logger.warn(
          `Server ${server.id} uses non-standard category: ${server.category}`,
          { serverId: server.id, category: server.category }
        );
      }
    });
  }

  // Get servers grouped by category
  getServersByCategory() {
    const servers = this.cache.registry?.servers || [];
    const grouped = {};

    STANDARD_CATEGORIES.forEach(categoryId => {
      const meta = getCategoryMetadata(categoryId);
      grouped[categoryId] = {
        metadata: meta,
        servers: servers.filter(s => s.category === categoryId),
      };
    });

    return grouped;
  }
}
```

---

## TypeScript Configuration

**Ensure proper path aliases in `tsconfig.json`**:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/ui/*": ["src/ui/*"],
      "@/ui/data/*": ["src/ui/data/*"]
    }
  }
}
```

---

## Testing Examples

### Unit Tests

**File**: `tests/ui/categoryMetadata.test.tsx`

```typescript
import { describe, it, expect } from "vitest";
import {
  getCategoryMetadata,
  getAllCategories,
  isStandardCategory,
  getCategoriesByTag,
  STANDARD_CATEGORIES,
} from "@/ui/data/categoryMetadata";

describe("Category Metadata", () => {
  it("should return metadata for standard category", () => {
    const github = getCategoryMetadata("github");
    expect(github.id).toBe("github");
    expect(github.displayName).toBe("GitHub");
    expect(github.description).toContain("GitHub operations");
    expect(github.color).toBe("#00CEC9");
    expect(github.tags).toContain("development");
  });

  it("should return fallback for unknown category", () => {
    const custom = getCategoryMetadata("my-custom-category");
    expect(custom.id).toBe("my-custom-category");
    expect(custom.displayName).toBe("my-custom-category");
    expect(custom.description).toContain("Custom category");
    expect(custom.tags).toContain("custom");
  });

  it("should return all 10 standard categories", () => {
    const all = getAllCategories();
    expect(all).toHaveLength(10);
    expect(all[0].id).toBe("github");
  });

  it("should validate standard categories", () => {
    expect(isStandardCategory("github")).toBe(true);
    expect(isStandardCategory("filesystem")).toBe(true);
    expect(isStandardCategory("custom")).toBe(false);
  });

  it("should filter by tag", () => {
    const devCategories = getCategoriesByTag("development");
    expect(devCategories.length).toBeGreaterThan(0);
    expect(devCategories.every(c => c.tags?.includes("development"))).toBe(true);
  });

  it("should have unique category IDs", () => {
    const ids = STANDARD_CATEGORIES;
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should have valid color codes", () => {
    const all = getAllCategories();
    all.forEach(cat => {
      expect(cat.color).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  it("should have non-empty descriptions", () => {
    const all = getAllCategories();
    all.forEach(cat => {
      expect(cat.description.length).toBeGreaterThan(10);
    });
  });
});
```

### Component Tests

**File**: `tests/ui/CategoryCard.test.tsx`

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CategoryCard from "@/ui/components/CategoryCard";

describe("CategoryCard", () => {
  it("should render category metadata", () => {
    const onToggle = vi.fn();
    render(
      <CategoryCard
        category="github"
        selected={false}
        available={true}
        toolCount={15}
        onToggle={onToggle}
      />
    );

    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText(/GitHub operations/)).toBeInTheDocument();
    expect(screen.getByText("15 tools")).toBeInTheDocument();
  });

  it("should call onToggle when clicked", () => {
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

  it("should not call onToggle when read-only", () => {
    const onToggle = vi.fn();
    render(
      <CategoryCard
        category="github"
        selected={false}
        available={true}
        readOnly={true}
        onToggle={onToggle}
      />
    );

    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("should show selected state", () => {
    const onToggle = vi.fn();
    render(
      <CategoryCard
        category="github"
        selected={true}
        available={true}
        onToggle={onToggle}
      />
    );

    expect(screen.getByLabelText(/selected/)).toBeInTheDocument();
  });
});
```

---

## Common Patterns

### Get Category Display Name

```typescript
const displayName = getCategoryMetadata(categoryId).displayName;
```

### Render Category Icon with Color

```tsx
const { icon, color } = getCategoryMetadata(categoryId);
return <Box sx={{ color }}>{icon}</Box>;
```

### Validate Category Input

```typescript
if (!isStandardCategory(input)) {
  console.warn(`Non-standard category: ${input}`);
}
```

### Filter Categories by Tag

```typescript
const aiCategories = getCategoriesByTag("ai");
// Returns: [memory, vertex_ai]
```

### Create Category Dropdown

```tsx
const CategorySelect = ({ value, onChange }: Props) => {
  const categories = getAllCategories();

  return (
    <Select value={value} onChange={onChange}>
      {categories.map(cat => (
        <MenuItem key={cat.id} value={cat.id}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ color: cat.color }}>{cat.icon}</Box>
            <Typography>{cat.displayName}</Typography>
          </Stack>
        </MenuItem>
      ))}
    </Select>
  );
};
```

---

## Migration Checklist

### Phase 1: Foundation ✅
- [x] Create `categoryMetadata.ts` with TypeScript definitions
- [x] Create `categoryDefinitions.json` for reference
- [x] Create architecture documentation
- [ ] Add unit tests for category utilities

### Phase 2: UI Components
- [ ] Create `CategoryCard.tsx` component
- [ ] Create `CategoryGrid.tsx` component
- [ ] Enhance `CategoryListEditor.tsx` with icons/suggestions
- [ ] Add component tests

### Phase 3: Integration
- [ ] Update `ConfigPage.tsx` with mode-based rendering
- [ ] Update `ActiveFiltersCard.tsx` with category icons
- [ ] Add LLM categorization sync
- [ ] Add marketplace category validation

### Phase 4: Testing
- [ ] Add visual regression tests
- [ ] Add accessibility tests (axe)
- [ ] Validate WCAG AA compliance
- [ ] Cross-browser testing

---

## Troubleshooting

### Icon Not Rendering

**Issue**: Category icon not displaying

**Solution**: Ensure MUI icons are installed and imported correctly

```bash
bun add @mui/icons-material
```

```typescript
// Check icon import
import GitHubIcon from "@mui/icons-material/GitHub";
const icon = React.createElement(GitHubIcon); // ✅
```

### Color Not Applying

**Issue**: Category color not showing in UI

**Solution**: Use `sx` prop for dynamic colors

```tsx
<Box sx={{ color: meta.color }}>{meta.icon}</Box>
```

### TypeScript Path Alias Error

**Issue**: Cannot resolve `@/ui/data/categoryMetadata`

**Solution**: Update `tsconfig.json` with path aliases

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/ui/*": ["src/ui/*"]
    }
  }
}
```

### Backend Import Error

**Issue**: Cannot import TypeScript file in JavaScript backend

**Solution**: Use `.js` extension and ensure build step includes TypeScript compilation

```javascript
// Use .js extension (TypeScript will be compiled)
import { STANDARD_CATEGORIES } from "../ui/data/categoryMetadata.js";
```

---

## Best Practices

### 1. Always Use Utilities

❌ **Bad**: Direct access to category definitions
```typescript
const color = CATEGORY_DEFINITIONS["github"].color;
```

✅ **Good**: Use utility functions
```typescript
const { color } = getCategoryMetadata("github");
```

### 2. Handle Unknown Categories

❌ **Bad**: Assume category exists
```typescript
const icon = CATEGORY_DEFINITIONS[categoryId].icon; // May crash
```

✅ **Good**: Use fallback mechanism
```typescript
const { icon } = getCategoryMetadata(categoryId); // Always returns valid object
```

### 3. Keep Synchronization Points Updated

When adding/removing categories:

1. ✅ Update `categoryMetadata.ts`
2. ✅ Update LLM categorization prompts
3. ✅ Update design specification
4. ✅ Add unit tests
5. ✅ Validate WCAG AA compliance

### 4. Use Type Guards

```typescript
if (isStandardCategory(categoryId)) {
  // TypeScript knows categoryId is StandardCategory
  // Safe to use for type narrowing
}
```

### 5. Memoize Category Data

```tsx
const categories = useMemo(() => getAllCategories(), []); // ✅
```

---

## Summary

**Integration Complete**: 3 files created, 4 patterns documented

**Files Created**:
1. ✅ `src/ui/data/categoryMetadata.ts` - TypeScript implementation
2. ✅ `src/ui/data/categoryDefinitions.json` - JSON reference
3. ✅ `claudedocs/CATEGORY_DATA_ARCHITECTURE.md` - Architecture doc
4. ✅ `claudedocs/CATEGORY_DATA_EXTRACTION_SUMMARY.md` - Extraction summary
5. ✅ `claudedocs/CATEGORY_INTEGRATION_GUIDE.md` - This guide

**Next Steps**:
1. Implement `CategoryCard.tsx`
2. Implement `CategoryGrid.tsx`
3. Update `ConfigPage.tsx` with mode-based rendering
4. Sync LLM categorization prompts
5. Add comprehensive tests

---

**Integration Guide Version**: 1.0
**Last Updated**: 2025-11-05
**Author**: Claude Code (System Architect)
**Status**: ✅ Ready for Implementation
