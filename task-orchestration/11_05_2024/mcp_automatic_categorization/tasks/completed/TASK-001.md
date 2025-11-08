# TASK-001: Create category-definitions.js

**Task ID**: TASK-001
**Phase**: Phase 1 - Backend Foundation
**Owner**: backend-architect
**Status**: Todo
**Priority**: High (Blocker for all other tasks)
**Estimated Time**: 2 hours
**Dependencies**: None

---

## 📋 Description

Create the foundational category definitions file containing metadata for all 10 standard MCP Hub categories. This file serves as the single source of truth for category information including names, descriptions, icons, colors, patterns, and keywords.

---

## 🎯 Acceptance Criteria

- [ ] File created at `src/utils/category-definitions.js`
- [ ] Contains STANDARD_CATEGORIES constant with all 10 categories:
  - github, filesystem, web, docker, git, python, database, memory, vertex_ai, meta
- [ ] Each category includes:
  - `id`: unique identifier (lowercase, alphanumeric)
  - `name`: display name
  - `description`: human-readable description
  - `icon`: icon name (for frontend mapping)
  - `color`: hex color code (WCAG AA compliant)
  - `patterns`: array of regex patterns for server name matching
  - `keywords`: array of keywords for description matching
- [ ] Export includes:
  - `STANDARD_CATEGORIES` object
  - `getCategoryById(id)` helper function
  - `getAllCategories()` helper function
  - `validateCategoryId(id)` helper function
- [ ] JSDoc comments for all exports
- [ ] Color contrast validated against dark background (#1E1E28)

---

## 📁 Files to Create

### Primary Files
- `src/utils/category-definitions.js` (NEW, ~300 lines)

---

## 🔧 Implementation Details

### Category Structure Template
```javascript
export const STANDARD_CATEGORIES = {
  github: {
    id: 'github',
    name: 'GitHub',
    description: 'GitHub operations (repos, issues, PRs)',
    icon: 'GitHubIcon',
    color: '#00CEC9',
    patterns: [
      'github__*',
      '*__github_*',
      '*-github-*'
    ],
    keywords: ['github', 'repository', 'pull request', 'issue', 'repo']
  },
  // ... 9 more categories
};
```

### Helper Functions
```javascript
/**
 * Get category metadata by ID
 * @param {string} id - Category ID
 * @returns {Object|null} Category metadata or null if not found
 */
export function getCategoryById(id) {
  return STANDARD_CATEGORIES[id] || null;
}

/**
 * Get all categories as array
 * @returns {Array<Object>} Array of category metadata objects
 */
export function getAllCategories() {
  return Object.values(STANDARD_CATEGORIES);
}

/**
 * Validate category ID format and existence
 * @param {string} id - Category ID to validate
 * @returns {boolean} True if valid category ID
 */
export function validateCategoryId(id) {
  if (!id || typeof id !== 'string') return false;
  if (!/^[a-z0-9_-]+$/.test(id)) return false;
  if (id.length > 50) return false;
  return STANDARD_CATEGORIES.hasOwnProperty(id);
}
```

### Color Palette (WCAG AA Validated)
```javascript
const CATEGORY_COLORS = {
  github: '#00CEC9',      // Cyan
  filesystem: '#FFA502',  // Orange
  web: '#0984E3',         // Blue
  docker: '#2D98DA',      // Light Blue
  git: '#F39C12',         // Yellow-Orange
  python: '#3776AB',      // Python Blue
  database: '#E84393',    // Pink
  memory: '#A29BFE',      // Purple
  vertex_ai: '#6C5CE7',   // Deep Purple
  meta: '#74B9FF'         // Sky Blue
};
```

---

## ✅ Testing Requirements

### Unit Tests (to be created in TASK-006)
- Test `getCategoryById()` with valid/invalid IDs
- Test `getAllCategories()` returns 10 categories
- Test `validateCategoryId()` with:
  - Valid IDs: 'github', 'filesystem'
  - Invalid IDs: null, '', 'INVALID', 'sql-injection<script>'
  - Edge cases: very long strings, special characters
- Verify all categories have required fields
- Verify all colors are valid hex codes
- Verify all patterns are valid regex

---

## 📚 Reference Materials

- Existing category data: `claudedocs/CATEGORY_DATA_ARCHITECTURE.md`
- Color palette from Python script (original request)
- UI specification: `claudedocs/CATEGORY_DISPLAY_DESIGN_SPEC.md`

---

## 🔗 Related Tasks

**Blocks**:
- TASK-002 (CategoryService needs STANDARD_CATEGORIES)
- TASK-003 (CategoryMapper needs patterns and keywords)
- TASK-006 (Unit tests for this file)

**Related**:
- TASK-013 (Frontend categoryMetadata.ts mirrors this structure)

---

## 📝 Notes

- This file is the backend equivalent of `src/ui/data/categoryMetadata.ts`
- Keep structure simple (plain JavaScript object) for easy import
- Consider future migration to database (Phase 2.0) - design for extensibility
- Patterns use wildcard syntax (*), not full regex (for simplicity)
- Keywords should be lowercase for case-insensitive matching

---

## 🚦 Status Log

| Date | Status | Notes |
|------|--------|-------|
| 2024-11-05 | Todo | Task created |

---

**Created**: 2024-11-05
**Last Updated**: 2024-11-05
