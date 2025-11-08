# Category Display Quick Reference

Fast reference for common patterns and code snippets.

---

## Component Import Reference

```typescript
// New components
import CategoryCard from "@components/CategoryCard";
import CategoryGrid from "@components/CategoryGrid";
import { getCategoryMetadata, standardCategories } from "@utils/categoryMetadata";

// Icons
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
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";

// MUI
import { Box, Paper, Stack, Typography, Chip, TextField, Button, Alert } from "@mui/material";
import { alpha } from "@mui/material/styles";
```

---

## categoryMetadata.ts Template

```typescript
// src/ui/utils/categoryMetadata.ts
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

export interface CategoryMetadata {
  icon: React.ReactNode;
  color: string;
  description: string;
}

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
  web: {
    icon: <Language />,
    color: "#0984E3",
    description: "Web browsing, URL fetching",
  },
  docker: {
    icon: <Storage />,
    color: "#2D98DA",
    description: "Container management",
  },
  git: {
    icon: <AccountTree />,
    color: "#F39C12",
    description: "Local git operations",
  },
  python: {
    icon: <Code />,
    color: "#3776AB",
    description: "Python environment management",
  },
  database: {
    icon: <Storage />,
    color: "#E84393",
    description: "Database queries",
  },
  memory: {
    icon: <Psychology />,
    color: "#A29BFE",
    description: "Knowledge graph management",
  },
  vertex_ai: {
    icon: <SmartToy />,
    color: "#6C5CE7",
    description: "AI-assisted development",
  },
  meta: {
    icon: <Settings />,
    color: "#74B9FF",
    description: "Hub internal tools (always available)",
  },
};

export const getCategoryMetadata = (category: string): CategoryMetadata => {
  return categoryMetadata[category] ?? {
    icon: <Settings />,
    color: "#999999",
    description: "Custom category",
  };
};

export const standardCategories = Object.keys(categoryMetadata);
```

---

## CategoryCard.tsx Template

```typescript
// src/ui/components/CategoryCard.tsx
import { Paper, Stack, Typography, Chip, Box } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { getCategoryMetadata } from "@utils/categoryMetadata";

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
  const { icon, color, description } = getCategoryMetadata(category);

  const handleClick = () => {
    if (available && !readOnly) {
      onToggle(category);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (available && !readOnly && ["Enter", " "].includes(e.key)) {
      e.preventDefault();
      onToggle(category);
    }
  };

  return (
    <Paper
      component="button"
      tabIndex={available && !readOnly ? 0 : -1}
      role="button"
      aria-label={`${category} category, ${selected ? "selected" : "not selected"}, ${toolCount} tools`}
      aria-pressed={selected}
      aria-disabled={!available || readOnly}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      elevation={selected ? 4 : 0}
      sx={{
        p: { xs: 1.5, sm: 2 },
        border: "1px solid",
        borderColor: selected ? "primary.main" : "divider",
        bgcolor: selected ? alpha("#6C5CE7", 0.12) : "background.paper",
        cursor: available && !readOnly ? "pointer" : "not-allowed",
        opacity: available ? 1 : 0.4,
        transition: "all 0.2s ease",
        textAlign: "left",
        width: "100%",
        "&:hover": available && !readOnly && {
          borderColor: "primary.main",
          bgcolor: alpha("#6C5CE7", selected ? 0.18 : 0.08),
          transform: "translateY(-2px)",
        },
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: 2,
        },
      }}
    >
      <Stack spacing={1.5}>
        {/* Icon + Title Row */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ color, display: "flex", alignItems: "center" }}>
            {icon}
          </Box>
          <Typography
            variant={{ xs: "body1", sm: "subtitle1", md: "h6" } as any}
            fontWeight={600}
            sx={{ flexGrow: 1 }}
          >
            {category}
          </Typography>
          {selected && (
            <CheckCircleIcon fontSize="small" color="primary" />
          )}
        </Stack>

        {/* Description */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: { xs: 11, sm: 12 } }}
        >
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
              fontSize: { xs: 9, sm: 10 },
            }}
          />
        )}
      </Stack>
    </Paper>
  );
};

export default CategoryCard;
```

---

## CategoryGrid.tsx Template

```typescript
// src/ui/components/CategoryGrid.tsx
import { Box, Typography } from "@mui/material";
import { memo, useCallback, useState } from "react";
import CategoryCard from "./CategoryCard";

export interface CategoryState {
  category: string;
  selected: boolean;
  available: boolean;
  toolCount: number;
  lastUsed?: string;
}

interface CategoryGridProps {
  categories: CategoryState[];
  readOnly?: boolean;
  onToggle: (category: string) => void;
}

const CategoryGrid = memo(({ categories, readOnly = false, onToggle }: CategoryGridProps) => {
  const [announcement, setAnnouncement] = useState("");

  const handleToggle = useCallback(
    (category: string) => {
      onToggle(category);
      const cat = categories.find((c) => c.category === category);
      const action = cat?.selected ? "removed from" : "added to";
      setAnnouncement(`Category ${category} ${action} filter`);
    },
    [onToggle, categories]
  );

  return (
    <>
      <Box
        role="group"
        aria-labelledby="category-grid-label"
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: { xs: 1.5, sm: 2 },
          mt: 2,
        }}
      >
        <Typography
          id="category-grid-label"
          variant="h6"
          sx={{ gridColumn: "1 / -1", mb: 1 }}
        >
          Available Categories
        </Typography>
        {categories.map((cat) => (
          <CategoryCard
            key={cat.category}
            {...cat}
            readOnly={readOnly}
            onToggle={handleToggle}
          />
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
});
CategoryGrid.displayName = "CategoryGrid";

export default CategoryGrid;
```

---

## ConfigPage Integration Snippets

### State Management

```typescript
// ConfigPage.tsx additions

// Import
import CategoryGrid, { type CategoryState } from "@components/CategoryGrid";
import { getCategoryMetadata, standardCategories } from "@utils/categoryMetadata";

// State
const [categoryInput, setCategoryInput] = useState("");

// Category state derivation
const categoryStates = useMemo((): CategoryState[] => {
  const selectedCategories = toolFiltering.categoryFilter?.categories ?? [];

  // Get available categories from connected servers
  const availableCategories = new Set<string>();
  const toolCounts: Record<string, number> = {};

  // TODO: Replace with actual server data
  // For now, mark all as available
  standardCategories.forEach((cat) => {
    availableCategories.add(cat);
    toolCounts[cat] = 0; // Will be populated from server data
  });

  return standardCategories.map((cat) => ({
    category: cat,
    selected: selectedCategories.includes(cat),
    available: availableCategories.has(cat),
    toolCount: toolCounts[cat] ?? 0,
  }));
}, [toolFiltering.categoryFilter]);

// Mode-based visibility
const showCategoryGrid = useMemo(() => {
  const mode = toolFiltering.mode;
  return ["category", "hybrid", "prompt-based"].includes(mode ?? "");
}, [toolFiltering.mode]);

const showCategoryManagement = useMemo(() => {
  const mode = toolFiltering.mode;
  return ["category", "hybrid"].includes(mode ?? "");
}, [toolFiltering.mode]);

// Toggle handler
const handleCategoryToggle = useCallback(
  (category: string) => {
    updateConfigState((prev) => {
      const currentCategories =
        prev.toolFiltering?.categoryFilter?.categories ?? [];
      const nextCategories = currentCategories.includes(category)
        ? currentCategories.filter((c) => c !== category)
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
  },
  [updateConfigState]
);

// Add custom category handler
const handleAddCustomCategory = useCallback(() => {
  const category = categoryInput.trim().toLowerCase();

  if (!category) return;

  if (!/^[a-z0-9_]+$/.test(category)) {
    setError("Category must contain only lowercase letters, numbers, and underscores");
    return;
  }

  const currentCategories = config?.toolFiltering?.categoryFilter?.categories ?? [];
  if (currentCategories.includes(category)) {
    setError("Category already exists");
    return;
  }

  updateConfigState((prev) => ({
    ...prev,
    toolFiltering: {
      ...prev.toolFiltering,
      categoryFilter: {
        ...prev.toolFiltering?.categoryFilter,
        categories: [...currentCategories, category],
      },
    },
  }));

  setCategoryInput("");
  setError(null);
}, [categoryInput, config, updateConfigState]);
```

### Categories Tab Content

```typescript
const categoriesContent = (
  <Stack spacing={3}>
    {/* Mode-specific alert */}
    {toolFiltering.mode === "server-allowlist" && (
      <Alert severity="info">
        <Typography variant="body2">
          Category filtering is not active in <strong>server-allowlist</strong> mode.
          Switch to <strong>category</strong>, <strong>hybrid</strong>, or{" "}
          <strong>prompt-based</strong> mode to manage categories.
        </Typography>
      </Alert>
    )}

    {toolFiltering.mode === "prompt-based" && (
      <Alert severity="info">
        <Typography variant="body2">
          In <strong>prompt-based</strong> mode, categories are automatically managed
          by the LLM based on user prompts. The grid below shows currently active categories.
        </Typography>
      </Alert>
    )}

    {/* Add category input (category/hybrid only) */}
    {showCategoryManagement && (
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <TextField
          size="small"
          label="Add custom category"
          placeholder="e.g., cloud, monitoring"
          value={categoryInput}
          onChange={(e) => {
            setCategoryInput(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddCustomCategory();
            }
          }}
          error={Boolean(error)}
          helperText={error || "Press Enter to add"}
          sx={{ maxWidth: 300, flexGrow: 1 }}
        />
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAddCustomCategory}
          disabled={!categoryInput.trim()}
          sx={{ mt: 0.5 }}
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

---

## ActiveFiltersCard Enhancement

```typescript
// ActiveFiltersCard.tsx update
import { getCategoryMetadata } from "@utils/categoryMetadata";

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
            variant="outlined"
            sx={{
              borderColor: color,
              color: color,
              "& .MuiChip-icon": { color },
            }}
          />
        );
      })}
    </Stack>
  );
};
```

---

## Server Data Integration

```typescript
// Helper functions for category state derivation

const getAvailableCategories = (servers: ServerInfo[]): Set<string> => {
  const categories = new Set<string>();
  servers.forEach((server) => {
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
  servers.forEach((server) => {
    server.capabilities?.tools?.forEach((tool: any) => {
      if (tool.category) {
        counts[tool.category] = (counts[tool.category] ?? 0) + 1;
      }
    });
  });
  return counts;
};

// Usage in categoryStates derivation
const categoryStates = useMemo((): CategoryState[] => {
  const selectedCategories = toolFiltering.categoryFilter?.categories ?? [];
  const availableCategories = getAvailableCategories(servers); // servers from usePolling
  const toolCounts = getToolCountByCategory(servers);

  return standardCategories.map((cat) => ({
    category: cat,
    selected: selectedCategories.includes(cat),
    available: availableCategories.has(cat),
    toolCount: toolCounts[cat] ?? 0,
  }));
}, [toolFiltering.categoryFilter, servers]);
```

---

## Testing Snippets

### Unit Test

```typescript
// tests/ui/CategoryCard.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import CategoryCard from "@components/CategoryCard";

describe("CategoryCard", () => {
  it("toggles selection on click", () => {
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

    const button = screen.getByRole("button");
    fireEvent.click(button);

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
});
```

---

## Common Patterns

### Check if category is standard

```typescript
import { standardCategories } from "@utils/categoryMetadata";

const isStandardCategory = (category: string): boolean => {
  return standardCategories.includes(category);
};
```

### Get all selected categories

```typescript
const selectedCategories = config.toolFiltering?.categoryFilter?.categories ?? [];
```

### Toggle category in array

```typescript
const toggleCategory = (categories: string[], category: string): string[] => {
  return categories.includes(category)
    ? categories.filter((c) => c !== category)
    : [...categories, category];
};
```

### Validate category name

```typescript
const isValidCategoryName = (name: string): boolean => {
  return /^[a-z0-9_]+$/.test(name);
};
```

---

## Accessibility Checklist

- [ ] All CategoryCards have `role="button"`
- [ ] All CategoryCards have `aria-label` describing state
- [ ] All CategoryCards have `aria-pressed` for selected state
- [ ] Disabled cards have `aria-disabled="true"` and `tabIndex={-1}`
- [ ] CategoryGrid has `role="group"` with `aria-labelledby`
- [ ] Live region announces category toggle actions
- [ ] Focus indicators visible (outline on `:focus-visible`)
- [ ] Keyboard navigation works (Tab, Enter, Space)
- [ ] Color contrast meets WCAG AA (4.5:1 minimum)

---

## Performance Checklist

- [ ] CategoryGrid wrapped with `memo()`
- [ ] `onToggle` handler wrapped with `useCallback()`
- [ ] `categoryStates` derived with `useMemo()`
- [ ] Animations use GPU-accelerated transforms
- [ ] No layout shifts (consistent card height)
- [ ] Icons imported from `@mui/icons-material` (tree-shaken)

---

This quick reference provides copy-paste ready code for implementation.
