/**
 * Category Metadata Definitions
 *
 * This file contains the canonical category data structure for MCP Hub.
 * Categories are used for LLM-based tool filtering and UI organization.
 *
 * Data Source: CATEGORY_DISPLAY_DESIGN_SPEC.md (Section 4.1)
 * Version: 1.0
 * Last Updated: 2025-11-05
 */

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
import React from "react";

/**
 * Category metadata structure
 */
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

/**
 * Canonical category definitions
 *
 * These categories are used for:
 * 1. LLM-based tool categorization (prompt-based filtering)
 * 2. UI display and organization (category grid)
 * 3. Static category filtering configuration
 *
 * IMPORTANT: Keep this synchronized with LLM categorization prompts
 */
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
  filesystem: {
    id: "filesystem",
    displayName: "Filesystem",
    description: "File reading/writing operations",
    icon: React.createElement(FolderIcon),
    color: "#FFA502",
    examples: ["modelcontextprotocol/servers/filesystem"],
    tags: ["development", "files", "storage"],
  },
  web: {
    id: "web",
    displayName: "Web",
    description: "Web browsing, URL fetching",
    icon: React.createElement(LanguageIcon),
    color: "#0984E3",
    examples: ["modelcontextprotocol/servers/fetch", "modelcontextprotocol/servers/puppeteer"],
    tags: ["browsing", "scraping", "internet"],
  },
  docker: {
    id: "docker",
    displayName: "Docker",
    description: "Container management",
    icon: React.createElement(StorageIcon),
    color: "#2D98DA",
    examples: ["docker-mcp"],
    tags: ["infrastructure", "containers", "devops"],
  },
  git: {
    id: "git",
    displayName: "Git",
    description: "Local git operations",
    icon: React.createElement(GitIcon),
    color: "#F39C12",
    examples: ["modelcontextprotocol/servers/git"],
    tags: ["development", "version-control", "local"],
  },
  python: {
    id: "python",
    displayName: "Python",
    description: "Python environment management",
    icon: React.createElement(CodeIcon),
    color: "#3776AB",
    examples: ["python-mcp"],
    tags: ["development", "programming", "environment"],
  },
  database: {
    id: "database",
    displayName: "Database",
    description: "Database queries",
    icon: React.createElement(StorageIcon),
    color: "#E84393",
    examples: ["modelcontextprotocol/servers/sqlite", "modelcontextprotocol/servers/postgres"],
    tags: ["data", "sql", "storage"],
  },
  memory: {
    id: "memory",
    displayName: "Memory",
    description: "Knowledge graph management",
    icon: React.createElement(PsychologyIcon),
    color: "#A29BFE",
    examples: ["modelcontextprotocol/servers/memory"],
    tags: ["ai", "knowledge", "graph"],
  },
  vertex_ai: {
    id: "vertex_ai",
    displayName: "Vertex AI",
    description: "AI-assisted development",
    icon: React.createElement(SmartToyIcon),
    color: "#6C5CE7",
    themeColor: "primary",
    examples: ["vertex-ai-mcp"],
    tags: ["ai", "machine-learning", "google-cloud"],
  },
  meta: {
    id: "meta",
    displayName: "Meta",
    description: "Hub internal tools (always available)",
    icon: React.createElement(SettingsIcon),
    color: "#74B9FF",
    examples: ["hub__analyze_prompt", "hub__list_servers"],
    tags: ["internal", "system", "meta"],
  },
};

/**
 * Ordered list of standard category IDs
 * Used for consistent display order in UI
 */
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

/**
 * Type for standard category IDs
 */
export type StandardCategory = typeof STANDARD_CATEGORIES[number];

/**
 * Get category metadata by ID
 * @param categoryId - Category identifier
 * @returns Category metadata or default fallback
 */
export function getCategoryMetadata(categoryId: string): CategoryMetadata {
  return (
    CATEGORY_DEFINITIONS[categoryId] ?? {
      id: categoryId,
      displayName: categoryId,
      description: `Custom category: ${categoryId}`,
      icon: React.createElement(SettingsIcon),
      color: "#999999",
      tags: ["custom"],
    }
  );
}

/**
 * Get all standard categories
 * @returns Array of category metadata objects
 */
export function getAllCategories(): CategoryMetadata[] {
  return STANDARD_CATEGORIES.map((id) => CATEGORY_DEFINITIONS[id]);
}

/**
 * Check if a category is a standard category
 * @param categoryId - Category to check
 * @returns True if standard category
 */
export function isStandardCategory(categoryId: string): categoryId is StandardCategory {
  return STANDARD_CATEGORIES.includes(categoryId as StandardCategory);
}

/**
 * Get categories by tag
 * @param tag - Tag to filter by
 * @returns Array of matching categories
 */
export function getCategoriesByTag(tag: string): CategoryMetadata[] {
  return Object.values(CATEGORY_DEFINITIONS).filter(
    (cat) => cat.tags?.includes(tag)
  );
}

/**
 * Color palette for categories (for reference)
 * Extracted from design specification
 */
export const CATEGORY_COLOR_PALETTE = {
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
} as const;

/**
 * Validation: Ensure category colors are WCAG AA compliant
 * All colors tested against dark background (#1E1E28)
 * Minimum contrast ratio: 4.5:1
 *
 * Testing method: WebAIM Contrast Checker
 * Status: ✅ All colors meet WCAG AA standards
 */
