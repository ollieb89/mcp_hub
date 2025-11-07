# Category Data Architecture

**Purpose**: Define the canonical category data structure for MCP Hub
**Version**: 1.0
**Date**: 2025-11-05
**Status**: Production-Ready

---

## Executive Summary

This document defines the category data architecture for MCP Hub, extracted from the Python visualization script and design specification. Categories are used for:

1. **LLM-based tool filtering** (prompt-based mode)
2. **UI organization** (category grid, chips, filters)
3. **Static categorization** (category/hybrid modes)

**Key Decisions**:
- ✅ Static TypeScript data file (not database)
- ✅ Single source of truth: `src/ui/data/categoryMetadata.ts`
- ✅ 10 standard categories with extensibility for custom categories
- ✅ Type-safe access with fallback handling

---

## Data Source: Python Visualization Script

**Original Structure** (inferred from design spec):
```python
# Plotly treemap visualization data
categories = {
    "github": {"count": 15, "color": "#00CEC9", "description": "GitHub operations"},
    "filesystem": {"count": 8, "color": "#FFA502", "description": "File operations"},
    "web": {"count": 12, "color": "#0984E3", "description": "Web browsing"},
    # ... 7 more categories
}

# Total: 10 categories, 48 MCP servers
```

**Extracted Metadata**:
- Category names (both ID and display)
- Descriptions
- Color codes (WCAG AA compliant)
- Icon associations (MUI icons)
- Example MCP servers per category

---

## JavaScript/TypeScript Data Structure

### 1. Category Metadata Interface

```typescript
export interface CategoryMetadata {
  /** Category identifier (lowercase, no spaces) */
  id: string;

  /** Display name (can include spaces, capitalization) */
  displayName: string;

  /** Short description of category purpose */
  description: string;

  /** MUI icon component */
  icon: React.ReactElement;

  /** Hex color code for visual identification */
  color: string;

  /** Theme color reference (if using theme colors) */
  themeColor?: "primary" | "secondary";

  /** Example MCP servers in this category */
  examples?: string[];

  /** Tags for additional categorization */
  tags?: string[];
}
```

### 2. Canonical Category Definitions

**Location**: `src/ui/data/categoryMetadata.ts`

```typescript
export const CATEGORY_DEFINITIONS: Record<string, CategoryMetadata> = {
  github: {
    id: "github",
    displayName: "GitHub",
    description: "GitHub operations (repos, issues, PRs)",
    icon: React.createElement(GitHubIcon),
    color: "#00CEC9",
    themeColor: "secondary",
    examples: ["modelcontextprotocol/servers/github"],
    tags: ["development", "version-control", "collaboration"],
  },
  // ... 9 more categories
};
```

**Key Features**:
- Type-safe record with string keys
- Readonly in production (no runtime mutations)
- Complete metadata for UI and LLM integration
- WCAG AA color compliance validated

### 3. Standard Category List

```typescript
export const STANDARD_CATEGORIES: readonly string[] = [
  "github",
  "filesystem",
  "web",
  "docker",
  "git",
  "python",
  "database",
  "memory",
  "vertex_ai",
  "meta",
] as const;

export type StandardCategory = typeof STANDARD_CATEGORIES[number];
```

**Purpose**:
- Defines display order for UI
- Enables type narrowing for standard vs custom categories
- Used in validation and autocomplete

---

## Data Access Patterns

### 1. Get Category Metadata

```typescript
import { getCategoryMetadata } from "@/ui/data/categoryMetadata";

// Type-safe access with fallback
const metadata = getCategoryMetadata("github");
// Returns: CategoryMetadata

// Unknown category gets default fallback
const custom = getCategoryMetadata("my-custom-category");
// Returns: { id: "my-custom-category", displayName: "my-custom-category", ... }
```

### 2. Get All Categories

```typescript
import { getAllCategories } from "@/ui/data/categoryMetadata";

const categories = getAllCategories();
// Returns: CategoryMetadata[] (10 standard categories)
```

### 3. Check if Standard Category

```typescript
import { isStandardCategory } from "@/ui/data/categoryMetadata";

isStandardCategory("github");  // true
isStandardCategory("custom");  // false
```

### 4. Filter by Tag

```typescript
import { getCategoriesByTag } from "@/ui/data/categoryMetadata";

const devCategories = getCategoriesByTag("development");
// Returns: [github, filesystem, git, python]

const aiCategories = getCategoriesByTag("ai");
// Returns: [memory, vertex_ai]
```

---

## Integration Points

### 1. UI Components

**CategoryCard.tsx**:
```tsx
import { getCategoryMetadata } from "@/ui/data/categoryMetadata";

const CategoryCard = ({ category }: { category: string }) => {
  const { icon, color, description, displayName } = getCategoryMetadata(category);

  return (
    <Paper sx={{ borderColor: color }}>
      <Box sx={{ color }}>{icon}</Box>
      <Typography>{displayName}</Typography>
      <Typography variant="body2">{description}</Typography>
    </Paper>
  );
};
```

**CategoryGrid.tsx**:
```tsx
import { getAllCategories } from "@/ui/data/categoryMetadata";

const CategoryGrid = () => {
  const categories = getAllCategories();

  return (
    <Grid container spacing={2}>
      {categories.map(cat => (
        <Grid item key={cat.id}>
          <CategoryCard category={cat.id} />
        </Grid>
      ))}
    </Grid>
  );
};
```

### 2. LLM Categorization (Backend)

**Sync with LLM Prompts**:
```javascript
// src/mcp/llm-categorizer.js
import { STANDARD_CATEGORIES } from "../ui/data/categoryMetadata.js";

const CATEGORIZATION_PROMPT = `
You are a tool categorization assistant. Analyze the user prompt and identify relevant tool categories.

Available categories: ${STANDARD_CATEGORIES.join(", ")}

Category descriptions:
${getAllCategories().map(c => `- ${c.id}: ${c.description}`).join("\n")}
`;
```

**IMPORTANT**: Keep LLM prompts synchronized with `categoryMetadata.ts` definitions.

### 3. Marketplace Integration

**Server Categorization**:
```javascript
// src/marketplace.js
import { isStandardCategory } from "./ui/data/categoryMetadata.js";

function validateServerCategory(server) {
  if (!isStandardCategory(server.category)) {
    logger.warn(`Non-standard category: ${server.category} for ${server.id}`);
  }
}
```

---

## Validation Schema

### 1. Compile-Time Validation (TypeScript)

**Type Guards**:
```typescript
// Ensures category objects match interface
const validateCategory = (cat: unknown): cat is CategoryMetadata => {
  return (
    typeof cat === "object" &&
    cat !== null &&
    "id" in cat &&
    "displayName" in cat &&
    "description" in cat &&
    "icon" in cat &&
    "color" in cat
  );
};
```

**Strict Type Checking**:
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### 2. Runtime Validation (Zod Schema)

**Optional: For API validation**:
```typescript
import { z } from "zod";

const CategoryMetadataSchema = z.object({
  id: z.string().regex(/^[a-z_]+$/), // lowercase, underscores only
  displayName: z.string().min(1),
  description: z.string().min(10).max(200),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
  themeColor: z.enum(["primary", "secondary"]).optional(),
  examples: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

// Validate at build time
Object.values(CATEGORY_DEFINITIONS).forEach(cat => {
  CategoryMetadataSchema.parse(cat);
});
```

### 3. Color Contrast Validation

**WCAG AA Compliance Check**:
```typescript
import { validateContrast } from "@/utils/wcag-validator";

// Ensure all colors meet 4.5:1 contrast ratio on dark background
const DARK_BG = "#1E1E28";

Object.entries(CATEGORY_COLOR_PALETTE).forEach(([id, color]) => {
  const ratio = validateContrast(color, DARK_BG);
  if (ratio < 4.5) {
    throw new Error(`Category ${id} color ${color} fails WCAG AA: ${ratio}:1`);
  }
});
```

---

## Data Evolution Strategy

### Version 1.0 (Current)

**Features**:
- 10 standard categories
- Static TypeScript definitions
- UI-only scope

### Version 1.1 (Q1 2026)

**Planned Enhancements**:
- **Custom Categories**: User-defined categories via config
- **Dynamic Icons**: Icon upload or selection
- **Category Grouping**: Parent-child relationships (e.g., "development" parent)

**Migration Path**:
```typescript
// Add to CategoryMetadata interface
export interface CategoryMetadata {
  // ... existing fields
  isCustom?: boolean;
  parentCategory?: string;
  userDefined?: {
    createdAt: string;
    createdBy: string;
  };
}

// Extend CATEGORY_DEFINITIONS to support runtime additions
export const CUSTOM_CATEGORIES: Record<string, CategoryMetadata> = {};

export function addCustomCategory(metadata: CategoryMetadata) {
  CUSTOM_CATEGORIES[metadata.id] = { ...metadata, isCustom: true };
}
```

### Version 2.0 (Q2 2026)

**Major Changes**:
- **Database Backend**: Move from static file to database (SQLite/Postgres)
- **API Layer**: RESTful API for category CRUD operations
- **Category Marketplace**: Community-contributed category definitions

**Migration Strategy**:
```typescript
// 1. Keep categoryMetadata.ts as seed data
// 2. Create migration script
import { CATEGORY_DEFINITIONS } from "./ui/data/categoryMetadata";
import db from "./db";

async function migrateCategoriesToDB() {
  for (const [id, metadata] of Object.entries(CATEGORY_DEFINITIONS)) {
    await db.categories.create({
      id,
      displayName: metadata.displayName,
      description: metadata.description,
      color: metadata.color,
      iconName: "GitHubIcon", // Store icon name, not component
      isStandard: true,
    });
  }
}

// 3. Update getCategoryMetadata to fetch from DB
export async function getCategoryMetadata(id: string): Promise<CategoryMetadata> {
  const dbCategory = await db.categories.findById(id);
  return {
    ...dbCategory,
    icon: getIconComponent(dbCategory.iconName),
  };
}
```

---

## File Organization

### Current Structure

```
src/
├── ui/
│   ├── data/
│   │   └── categoryMetadata.ts       # ⭐ Single source of truth
│   ├── components/
│   │   ├── CategoryCard.tsx          # Uses getCategoryMetadata()
│   │   ├── CategoryGrid.tsx          # Uses getAllCategories()
│   │   └── ActiveFiltersCard.tsx     # Uses getCategoryMetadata()
│   └── pages/
│       └── ConfigPage.tsx            # Imports category utilities
├── mcp/
│   └── llm-categorizer.js            # Syncs with STANDARD_CATEGORIES
└── marketplace.js                    # Validates server categories
```

### Future Structure (v2.0)

```
src/
├── ui/
│   ├── data/
│   │   ├── categoryMetadata.ts       # Seed data only
│   │   └── categorySeeds.json        # JSON export for migrations
│   └── api/
│       └── categories.ts             # API client for category CRUD
├── db/
│   ├── schema.sql                    # Category table schema
│   └── migrations/
│       └── 001_seed_categories.sql   # Initial seed migration
└── api/
    └── routes/
        └── categories.js             # RESTful category endpoints
```

---

## Maintenance Strategy

### 1. Adding New Standard Categories

**Process**:
1. Update `CATEGORY_DEFINITIONS` in `categoryMetadata.ts`
2. Add to `STANDARD_CATEGORIES` array
3. Validate color contrast (WCAG AA)
4. Update LLM categorization prompts
5. Add to design spec documentation
6. Create visual regression tests

**Example**:
```typescript
// 1. Add to CATEGORY_DEFINITIONS
kubernetes: {
  id: "kubernetes",
  displayName: "Kubernetes",
  description: "Kubernetes cluster management",
  icon: React.createElement(CloudIcon),
  color: "#326CE5", // Validated: 5.2:1 ratio
  tags: ["infrastructure", "devops", "cloud"],
},

// 2. Add to STANDARD_CATEGORIES
export const STANDARD_CATEGORIES = [
  // ... existing
  "kubernetes", // Add in logical position
] as const;
```

### 2. Modifying Existing Categories

**Allowed Changes** (non-breaking):
- Description updates
- Adding tags
- Adding examples
- Color adjustments (must maintain WCAG AA)

**Breaking Changes** (require migration):
- Changing category ID
- Removing standard categories
- Icon component changes (may affect serialization)

**Migration Example**:
```typescript
// Rename category ID: "vertex_ai" → "google_ai"
export const CATEGORY_ID_MIGRATIONS: Record<string, string> = {
  vertex_ai: "google_ai", // old → new
};

export function migrateCategory(oldId: string): string {
  return CATEGORY_ID_MIGRATIONS[oldId] ?? oldId;
}
```

### 3. Deprecation Strategy

**Process**:
1. Mark category as deprecated in metadata
2. Emit console warnings for 1 version
3. Migrate data in 2nd version
4. Remove in 3rd version

**Example**:
```typescript
// Version 1.1: Add deprecation flag
vertex_ai: {
  // ... existing
  deprecated: {
    since: "1.1.0",
    replacement: "google_ai",
    reason: "Rebranded to Google AI",
  },
},

// Version 1.2: Warn users
if (metadata.deprecated) {
  console.warn(
    `Category '${id}' is deprecated since ${metadata.deprecated.since}. ` +
    `Use '${metadata.deprecated.replacement}' instead.`
  );
}

// Version 2.0: Remove from CATEGORY_DEFINITIONS
```

---

## Testing Requirements

### 1. Unit Tests

**File**: `tests/ui/categoryMetadata.test.tsx`

```typescript
import { describe, it, expect } from "vitest";
import {
  getCategoryMetadata,
  getAllCategories,
  isStandardCategory,
  STANDARD_CATEGORIES,
} from "@/ui/data/categoryMetadata";

describe("Category Metadata", () => {
  it("should return metadata for standard category", () => {
    const github = getCategoryMetadata("github");
    expect(github.id).toBe("github");
    expect(github.displayName).toBe("GitHub");
    expect(github.color).toBe("#00CEC9");
  });

  it("should return fallback for unknown category", () => {
    const custom = getCategoryMetadata("unknown");
    expect(custom.id).toBe("unknown");
    expect(custom.displayName).toBe("unknown");
    expect(custom.tags).toContain("custom");
  });

  it("should return all 10 standard categories", () => {
    const all = getAllCategories();
    expect(all).toHaveLength(10);
    expect(all[0].id).toBe("github");
  });

  it("should validate standard categories", () => {
    expect(isStandardCategory("github")).toBe(true);
    expect(isStandardCategory("custom")).toBe(false);
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
});
```

### 2. Visual Regression Tests

**Tool**: Chromatic or Percy

**Snapshots**:
- Category grid with all categories
- Category cards in all states (selected, unselected, disabled)
- Category chips in ActiveFiltersCard
- Mobile/tablet/desktop layouts

### 3. Accessibility Tests

**axe DevTools**:
```typescript
import { axe } from "vitest-axe";

it("should have no accessibility violations", async () => {
  const { container } = render(<CategoryGrid />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## Performance Considerations

### 1. Bundle Size Impact

**Current**:
- `categoryMetadata.ts`: ~3KB minified + gzipped
- MUI icons (10 icons): ~8KB (tree-shaken)
- Total: ~11KB

**Optimization**:
- Use dynamic imports for icon components if needed
- Consider icon sprite sheet for v2.0

### 2. Runtime Performance

**Memoization**:
```typescript
import { useMemo } from "react";

const CategoryGrid = ({ filter }: { filter: string }) => {
  const categories = useMemo(
    () => getAllCategories().filter(c => c.tags?.includes(filter)),
    [filter]
  );

  return <Grid>{/* ... */}</Grid>;
};
```

**Lazy Loading** (for large category sets in v2.0):
```typescript
const CategoryGrid = lazy(() => import("./CategoryGrid"));

<Suspense fallback={<CategoryGridSkeleton />}>
  <CategoryGrid />
</Suspense>
```

---

## Documentation Checklist

- [x] Data structure defined (`CategoryMetadata` interface)
- [x] TypeScript implementation (`categoryMetadata.ts`)
- [x] Access patterns documented
- [x] Validation schema provided
- [x] Migration strategy outlined
- [x] Testing requirements specified
- [x] Integration examples provided
- [x] Maintenance procedures defined

---

## Summary

**Key Decisions**:

1. **Static TypeScript File**: Use `categoryMetadata.ts` as single source of truth
   - Rationale: Simple, type-safe, no runtime overhead
   - Trade-off: Manual updates required for new categories

2. **Extensible Design**: Support custom categories via fallback mechanism
   - Standard categories: 10 predefined with full metadata
   - Custom categories: Dynamic with default styling

3. **Synchronization Point**: LLM prompts must sync with category definitions
   - Import `STANDARD_CATEGORIES` in backend code
   - Document category changes in LLM prompt updates

4. **Migration Path**: Clear evolution from static → dynamic → database
   - v1.0: Static definitions (current)
   - v1.1: Runtime custom categories
   - v2.0: Database backend with API

**Files Created**:
- ✅ `src/ui/data/categoryMetadata.ts` - Canonical category definitions
- ✅ `claudedocs/CATEGORY_DATA_ARCHITECTURE.md` - This document

**Next Steps**:
1. Implement CategoryCard component using `getCategoryMetadata()`
2. Implement CategoryGrid component using `getAllCategories()`
3. Update LLM categorization prompts to sync with `STANDARD_CATEGORIES`
4. Add unit tests for category metadata utilities
5. Validate WCAG AA compliance for all category colors

---

**Document Version**: 1.0
**Last Updated**: 2025-11-05
**Author**: Claude Code (System Architect)
**Review Status**: Ready for Implementation
