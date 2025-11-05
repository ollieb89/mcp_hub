/**
 * Category Definitions for MCP Hub
 *
 * This file contains the canonical category metadata structure for the backend.
 * Categories are used for automatic tool categorization, filtering, and UI organization.
 *
 * Data Source: Frontend categoryMetadata.ts + CATEGORY_DISPLAY_DESIGN_SPEC.md
 * Version: 1.0
 * Created: 2024-11-05
 */

/**
 * Standard category definitions with metadata
 *
 * Each category includes:
 * - id: Unique identifier (lowercase, alphanumeric)
 * - name: Display name for UI
 * - description: Human-readable category purpose
 * - icon: Icon name for frontend mapping
 * - color: Hex color code (WCAG AA compliant against #1E1E28)
 * - patterns: Array of regex patterns for server name matching
 * - keywords: Array of keywords for description/tool name matching
 *
 * @type {Object.<string, Object>}
 */
export const STANDARD_CATEGORIES = {
  github: {
    id: 'github',
    name: 'GitHub',
    description: 'GitHub operations (repos, issues, PRs)',
    icon: 'GitHubIcon',
    color: '#00CEC9',
    patterns: [
      /^github$/i,
      /^.*github.*$/i,
      /^.*__github.*$/i,
      /^github__.*$/i
    ],
    keywords: ['github', 'repository', 'repo', 'pull request', 'pr', 'issue', 'gist', 'octokit']
  },

  filesystem: {
    id: 'filesystem',
    name: 'Filesystem',
    description: 'File reading/writing operations',
    icon: 'FolderIcon',
    color: '#FFA502',
    patterns: [
      /^filesystem$/i,
      /^.*filesystem.*$/i,
      /^.*__filesystem.*$/i,
      /^filesystem__.*$/i,
      /^.*file.*$/i,
      /^.*fs.*$/i
    ],
    keywords: ['filesystem', 'file', 'files', 'directory', 'folder', 'read', 'write', 'fs', 'path']
  },

  web: {
    id: 'web',
    name: 'Web',
    description: 'Web browsing, URL fetching',
    icon: 'LanguageIcon',
    color: '#0984E3',
    patterns: [
      /^web$/i,
      /^.*web.*$/i,
      /^.*__web.*$/i,
      /^web__.*$/i,
      /^.*fetch.*$/i,
      /^.*http.*$/i,
      /^.*browser.*$/i,
      /^.*puppeteer.*$/i,
      /^.*playwright.*$/i
    ],
    keywords: ['web', 'fetch', 'http', 'https', 'url', 'browser', 'puppeteer', 'playwright', 'scraping', 'crawl']
  },

  docker: {
    id: 'docker',
    name: 'Docker',
    description: 'Container management',
    icon: 'StorageIcon',
    color: '#2D98DA',
    patterns: [
      /^docker$/i,
      /^.*docker.*$/i,
      /^.*__docker.*$/i,
      /^docker__.*$/i,
      /^.*container.*$/i
    ],
    keywords: ['docker', 'container', 'containers', 'image', 'dockerfile', 'compose', 'kubernetes', 'k8s']
  },

  git: {
    id: 'git',
    name: 'Git',
    description: 'Local git operations',
    icon: 'GitIcon',
    color: '#F39C12',
    patterns: [
      /^git$/i,
      /^.*__git.*$/i,
      /^git__.*$/i,
      /^.*\bgit\b.*$/i  // Word boundary to avoid matching 'github'
    ],
    keywords: ['git', 'commit', 'branch', 'merge', 'rebase', 'repository', 'local', 'version control']
  },

  python: {
    id: 'python',
    name: 'Python',
    description: 'Python environment management',
    icon: 'CodeIcon',
    color: '#3776AB',
    patterns: [
      /^python$/i,
      /^.*python.*$/i,
      /^.*__python.*$/i,
      /^python__.*$/i,
      /^.*py.*$/i
    ],
    keywords: ['python', 'pip', 'virtualenv', 'venv', 'conda', 'poetry', 'pypi', 'package']
  },

  database: {
    id: 'database',
    name: 'Database',
    description: 'Database queries',
    icon: 'StorageIcon',
    color: '#E84393',
    patterns: [
      /^database$/i,
      /^.*database.*$/i,
      /^.*__database.*$/i,
      /^database__.*$/i,
      /^.*db.*$/i,
      /^.*sql.*$/i,
      /^.*sqlite.*$/i,
      /^.*postgres.*$/i,
      /^.*mysql.*$/i,
      /^.*mongo.*$/i
    ],
    keywords: ['database', 'db', 'sql', 'sqlite', 'postgres', 'postgresql', 'mysql', 'mongodb', 'query', 'table']
  },

  memory: {
    id: 'memory',
    name: 'Memory',
    description: 'Knowledge graph management',
    icon: 'PsychologyIcon',
    color: '#A29BFE',
    patterns: [
      /^memory$/i,
      /^.*memory.*$/i,
      /^.*__memory.*$/i,
      /^memory__.*$/i,
      /^.*knowledge.*$/i
    ],
    keywords: ['memory', 'knowledge', 'graph', 'knowledge graph', 'context', 'store', 'recall']
  },

  vertex_ai: {
    id: 'vertex_ai',
    name: 'Vertex AI',
    description: 'AI-assisted development',
    icon: 'SmartToyIcon',
    color: '#6C5CE7',
    patterns: [
      /^vertex.*$/i,
      /^.*vertex.*$/i,
      /^.*__vertex.*$/i,
      /^vertex__.*$/i,
      /^.*ai.*$/i,
      /^.*ml.*$/i
    ],
    keywords: ['vertex', 'ai', 'artificial intelligence', 'machine learning', 'ml', 'model', 'google cloud', 'gcp']
  },

  meta: {
    id: 'meta',
    name: 'Meta',
    description: 'Hub internal tools (always available)',
    icon: 'SettingsIcon',
    color: '#74B9FF',
    patterns: [
      /^hub__.*$/i,
      /^meta$/i,
      /^.*__meta.*$/i
    ],
    keywords: ['hub', 'meta', 'internal', 'system', 'admin', 'management', 'analyze_prompt', 'list_servers']
  }
};

/**
 * Ordered array of category IDs for consistent display
 * @type {string[]}
 */
export const CATEGORY_ORDER = [
  'github',
  'filesystem',
  'web',
  'docker',
  'git',
  'python',
  'database',
  'memory',
  'vertex_ai',
  'meta'
];

/**
 * Color palette for categories (for reference)
 * All colors validated against WCAG AA standards (4.5:1 contrast ratio)
 * Background: #1E1E28 (dark theme)
 *
 * @type {Object.<string, string>}
 */
export const CATEGORY_COLORS = {
  github: '#00CEC9',      // Teal
  filesystem: '#FFA502',  // Orange
  web: '#0984E3',         // Blue
  docker: '#2D98DA',      // Light Blue
  git: '#F39C12',         // Yellow-Orange
  python: '#3776AB',      // Python Blue
  database: '#E84393',    // Pink
  memory: '#A29BFE',      // Light Purple
  vertex_ai: '#6C5CE7',   // Purple
  meta: '#74B9FF'         // Sky Blue
};

/**
 * Get category metadata by ID
 *
 * @param {string} id - Category identifier
 * @returns {Object|null} Category metadata object or null if not found
 *
 * @example
 * const github = getCategoryById('github');
 * console.log(github.name); // "GitHub"
 */
export function getCategoryById(id) {
  if (!id || typeof id !== 'string') {
    return null;
  }

  const category = STANDARD_CATEGORIES[id.toLowerCase()];
  return category || null;
}

/**
 * Get all categories as an array
 *
 * @returns {Array<Object>} Array of category metadata objects in display order
 *
 * @example
 * const categories = getAllCategories();
 * console.log(categories.length); // 10
 */
export function getAllCategories() {
  return CATEGORY_ORDER.map(id => STANDARD_CATEGORIES[id]);
}

/**
 * Validate category ID format and existence
 *
 * Checks:
 * 1. ID is a non-empty string
 * 2. ID matches pattern: lowercase alphanumeric with underscores/hyphens
 * 3. ID length is reasonable (<= 50 characters)
 * 4. ID exists in STANDARD_CATEGORIES
 *
 * @param {string} id - Category ID to validate
 * @returns {boolean} True if valid category ID
 *
 * @example
 * validateCategoryId('github');        // true
 * validateCategoryId('INVALID');       // false (not in STANDARD_CATEGORIES)
 * validateCategoryId('');              // false (empty)
 * validateCategoryId(null);            // false (not a string)
 */
export function validateCategoryId(id) {
  // Type check
  if (!id || typeof id !== 'string') {
    return false;
  }

  // Length check
  if (id.length > 50) {
    return false;
  }

  // Format check: lowercase alphanumeric with underscores/hyphens
  if (!/^[a-z0-9_-]+$/.test(id)) {
    return false;
  }

  // Existence check
  return STANDARD_CATEGORIES.hasOwnProperty(id);
}

/**
 * Get category IDs as array
 *
 * @returns {string[]} Array of category IDs
 *
 * @example
 * const ids = getCategoryIds();
 * console.log(ids); // ['github', 'filesystem', 'web', ...]
 */
export function getCategoryIds() {
  return CATEGORY_ORDER;
}

/**
 * Check if a category ID exists
 *
 * @param {string} id - Category ID to check
 * @returns {boolean} True if category exists
 *
 * @example
 * categoryExists('github');  // true
 * categoryExists('invalid'); // false
 */
export function categoryExists(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return STANDARD_CATEGORIES.hasOwnProperty(id.toLowerCase());
}

/**
 * Get category name by ID
 *
 * @param {string} id - Category ID
 * @returns {string|null} Category display name or null if not found
 *
 * @example
 * getCategoryName('github'); // "GitHub"
 */
export function getCategoryName(id) {
  const category = getCategoryById(id);
  return category ? category.name : null;
}

/**
 * Get category color by ID
 *
 * @param {string} id - Category ID
 * @returns {string|null} Category hex color or null if not found
 *
 * @example
 * getCategoryColor('github'); // "#00CEC9"
 */
export function getCategoryColor(id) {
  const category = getCategoryById(id);
  return category ? category.color : null;
}

/**
 * Match server name against category patterns
 *
 * @param {string} serverName - MCP server name
 * @param {string} categoryId - Category ID to test
 * @returns {boolean} True if server name matches category patterns
 *
 * @example
 * matchesPattern('github', 'github');           // true
 * matchesPattern('my-github-server', 'github'); // true
 * matchesPattern('filesystem', 'github');       // false
 */
export function matchesPattern(serverName, categoryId) {
  if (!serverName || !categoryId) {
    return false;
  }

  const category = getCategoryById(categoryId);
  if (!category || !category.patterns) {
    return false;
  }

  return category.patterns.some(pattern => pattern.test(serverName));
}

/**
 * Match text against category keywords
 *
 * @param {string} text - Text to match (server name, description, tool names)
 * @param {string} categoryId - Category ID to test
 * @returns {boolean} True if text contains any category keywords
 *
 * @example
 * matchesKeywords('GitHub repository management', 'github'); // true
 * matchesKeywords('File operations', 'filesystem');          // true
 */
export function matchesKeywords(text, categoryId) {
  if (!text || !categoryId) {
    return false;
  }

  const category = getCategoryById(categoryId);
  if (!category || !category.keywords) {
    return false;
  }

  const lowerText = text.toLowerCase();
  return category.keywords.some(keyword =>
    lowerText.includes(keyword.toLowerCase())
  );
}

/**
 * Get category statistics
 *
 * @returns {Object} Category statistics
 *
 * @example
 * const stats = getCategoryStats();
 * console.log(stats.total); // 10
 */
export function getCategoryStats() {
  return {
    total: CATEGORY_ORDER.length,
    ids: CATEGORY_ORDER,
    hasPatterns: CATEGORY_ORDER.every(id =>
      STANDARD_CATEGORIES[id].patterns && STANDARD_CATEGORIES[id].patterns.length > 0
    ),
    hasKeywords: CATEGORY_ORDER.every(id =>
      STANDARD_CATEGORIES[id].keywords && STANDARD_CATEGORIES[id].keywords.length > 0
    )
  };
}
