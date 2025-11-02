# Tool Filtering Configuration Examples

Comprehensive configuration examples and migration guide for MCP Hub's tool filtering system.

## Table of Contents

- [Common Use Cases](#common-use-cases)
- [Migration Guide](#migration-guide)
- [Troubleshooting](#troubleshooting)
- [Performance Tuning](#performance-tuning)
- [Advanced Patterns](#advanced-patterns)

## Common Use Cases

### Use Case 1: Web Developer Workflow (Production-Ready)

**Scenario:** Frontend developer using React with browser testing
**Tool Count:** 3469 → 18 tools (~99.5% reduction)
**Stack:** React 18+, Playwright, TypeScript, CI/CD
**Context7 References:** `/reactjs/react.dev`, `/microsoft/playwright`

---

#### Phase 1: Basic Configuration (Frontend Architecture)

**Architecture Pattern:** Modern React SPA with MCP Hub tool filtering
**Tech Stack:** React 18 + TypeScript 5 + Vite 6 + Testing Library
**Context7 References:** `/vitejs/vite`, `/reactjs/react.dev`, `/microsoft/typescript`

---

##### Step 1: Project Initialization (Vite + React + TypeScript)

**Create Vite Project:**
```bash
# Using npm
npm create vite@latest my-app -- --template react-ts

# Or with pnpm (recommended for monorepos)
pnpm create vite my-app --template react-ts

cd my-app
npm install
```

**Project Structure:**
```
my-app/
├── src/
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API services (MCP integration)
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   ├── App.tsx             # Root component
│   └── main.tsx            # Entry point
├── tests/
│   ├── unit/               # Component tests
│   ├── integration/        # Integration tests
│   └── e2e/                # Playwright E2E tests
├── public/                 # Static assets
├── .env.development        # Development environment variables
├── .env.production         # Production environment variables
├── tsconfig.json           # TypeScript config
├── tsconfig.node.json      # Node-specific TS config
├── vite.config.ts          # Vite configuration
└── vitest.config.ts        # Test configuration
```

**Quality Checkpoint:**
✅ Project initializes without errors
✅ TypeScript compilation passes
✅ Dev server starts on port 3000

---

##### Step 2: TypeScript Configuration (Strict Mode)

**`tsconfig.json`** (Application Code):
```json
{
  "compilerOptions": {
    // Type Checking (Strict Mode - Context7: /microsoft/typescript)
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    
    // Module Resolution
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    
    // Interop Constraints
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    
    // Emit
    "noEmit": true,
    "jsx": "react-jsx",
    
    // Linting
    "skipLibCheck": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    
    // Vite Client Types (Context7: /vitejs/vite)
    "types": ["vite/client"],
    
    // Path Mapping (for cleaner imports)
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@hooks/*": ["./src/hooks/*"],
      "@services/*": ["./src/services/*"],
      "@types/*": ["./src/types/*"],
      "@utils/*": ["./src/utils/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**`tsconfig.node.json`** (Build Tools):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noEmit": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

**Environment Type Definitions** (`src/vite-env.d.ts`):
```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MCP_HUB_URL: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_ENABLE_TOOL_FILTERING: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

**Quality Checkpoint:**
✅ `tsc --noEmit` passes with no errors
✅ Path aliases resolve correctly
✅ Strict mode catches type issues

**Best Practice (Context7: /microsoft/typescript):**
> Enable `strict: true` from the start. It's much harder to retrofit strict mode into an existing codebase than to build with it from day one.

---

##### Step 3: MCP Hub Configuration (Environment-Driven)

**Environment Variables** (`.env.development`):
```env
# MCP Hub Configuration
VITE_MCP_HUB_URL=http://localhost:37373
VITE_ENABLE_TOOL_FILTERING=true
VITE_MAX_TOOLS_THRESHOLD=20
VITE_FILTER_MODE=server-allowlist

# Playwright Configuration
PLAYWRIGHT_BROWSERS_PATH=~/.cache/ms-playwright

# API Configuration
VITE_API_BASE_URL=http://localhost:3000
```

**MCP Hub Configuration** (`mcp.json`):
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "node",
      "args": ["./servers/filesystem/index.js"],
      "env": {
        "LOG_LEVEL": "${LOG_LEVEL:-info}",
        "MAX_FILE_SIZE": "10MB"
      }
    },
    "playwright": {
      "command": "node",
      "args": ["./servers/playwright/index.js"],
      "env": {
        "PLAYWRIGHT_BROWSERS_PATH": "${PLAYWRIGHT_BROWSERS_PATH}",
        "HEADLESS": "${HEADLESS:-true}",
        "TIMEOUT": "30000"
      }
    },
    "web-browser": {
      "command": "node",
      "args": ["./servers/web-browser/index.js"],
      "env": {
        "USER_AGENT": "MCP-Hub/1.0",
        "MAX_REDIRECTS": "5"
      }
    }
  },
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["filesystem", "playwright", "web-browser"]
    },
    "autoEnableThreshold": 100,
    "cache": {
      "enabled": true,
      "ttl": 3600000
    }
  },
  "logging": {
    "level": "${LOG_LEVEL:-info}",
    "format": "json",
    "destination": "./logs/mcp-hub.log"
  }
}
```

**MCP Service Integration** (`src/services/mcp-hub.ts`):
```typescript
// Type-safe MCP Hub client
interface MCPHubConfig {
  baseUrl: string;
  enableFiltering: boolean;
  maxToolsThreshold: number;
}

interface ToolFilteringStats {
  enabled: boolean;
  mode: string;
  totalTools: number;
  exposedTools: number;
  filterRate: number;
}

export class MCPHubClient {
  private config: MCPHubConfig;

  constructor(config?: Partial<MCPHubConfig>) {
    this.config = {
      baseUrl: import.meta.env.VITE_MCP_HUB_URL,
      enableFiltering: import.meta.env.VITE_ENABLE_TOOL_FILTERING === 'true',
      maxToolsThreshold: parseInt(import.meta.env.VITE_MAX_TOOLS_THRESHOLD, 10),
      ...config,
    };
  }

  async getFilteringStats(): Promise<ToolFilteringStats> {
    const response = await fetch(`${this.config.baseUrl}/api/filtering/stats`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.statusText}`);
    }
    return response.json();
  }

  async getTools() {
    const response = await fetch(`${this.config.baseUrl}/api/tools`);
    if (!response.ok) {
      throw new Error(`Failed to fetch tools: ${response.statusText}`);
    }
    return response.json();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const mcpHub = new MCPHubClient();
```

**React Hook for MCP Stats** (`src/hooks/useMCPStats.ts`):
```typescript
import { useEffect, useState } from 'react';
import { mcpHub } from '@services/mcp-hub';
import type { ToolFilteringStats } from '@services/mcp-hub';

// Context7: /reactjs/react.dev - Hooks must be called at top level
export function useMCPStats(refreshInterval = 30000) {
  const [stats, setStats] = useState<ToolFilteringStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await mcpHub.getFilteringStats();
        if (mounted) {
          setStats(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, refreshInterval);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [refreshInterval]);

  return { stats, loading, error };
}
```

**Expected Tools After Filtering:**
- `filesystem__read`, `filesystem__write`, `filesystem__list`, `filesystem__search`
- `playwright__navigate`, `playwright__screenshot`, `playwright__click`, `playwright__fill`
- `web-browser__fetch`, `web-browser__render`, `web-browser__extract`

**Quality Checkpoint:**
✅ Environment variables loaded correctly
✅ MCP Hub client types are fully typed
✅ No hardcoded URLs or secrets

**Best Practice (Context7: /vitejs/vite):**
> Use `import.meta.env` for environment variables in Vite projects. Never commit `.env.local` files containing secrets.

---

##### Step 4: Testing Setup (React Testing Library + Vitest)

**Install Dependencies:**
```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Vitest Configuration** (`vitest.config.ts`):
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
});
```

**Test Setup** (`tests/setup.ts`):
```typescript
import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test (Context7: /testing-library/react-testing-library)
afterEach(() => {
  cleanup();
});

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_MCP_HUB_URL: 'http://localhost:37373',
    VITE_ENABLE_TOOL_FILTERING: true,
    VITE_MAX_TOOLS_THRESHOLD: 20,
  },
});

// Mock fetch for testing
global.fetch = vi.fn();
```

**Example Component Test** (`tests/unit/MCPStats.test.tsx`):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MCPStats } from '@components/MCPStats';

describe('MCPStats Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<MCPStats />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('displays filtering stats after successful fetch', async () => {
    const mockStats = {
      enabled: true,
      mode: 'server-allowlist',
      totalTools: 3469,
      exposedTools: 18,
      filterRate: 99.5,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    });

    render(<MCPStats />);

    await waitFor(() => {
      expect(screen.getByText(/18/)).toBeInTheDocument();
      expect(screen.getByText(/99.5%/)).toBeInTheDocument();
    });
  });

  it('handles errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    render(<MCPStats />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

**Package Scripts** (`package.json`):
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "type-check": "tsc --noEmit",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  }
}
```

**Quality Checkpoint:**
✅ `npm test` runs successfully
✅ Coverage meets 80% threshold
✅ All tests pass

**Best Practice (Context7: /testing-library/react-testing-library):**
> Test behavior, not implementation. Query by accessible roles and labels, not internal component structure.

---

##### Step 5: Quality Gates (ESLint + Prettier + Pre-commit)

**Install Quality Tools:**
```bash
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-refresh prettier eslint-config-prettier husky lint-staged
```

**ESLint Configuration** (`eslint.config.js`):
```javascript
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';

export default [
  {
    ignores: ['dist', 'node_modules', 'coverage'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
    },
    rules: {
      // TypeScript (Context7: /microsoft/typescript)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'warn',
      
      // React (Context7: /reactjs/react.dev)
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+
      'react/prop-types': 'off', // Using TypeScript
      'react-hooks/rules-of-hooks': 'error', // Enforce hooks rules
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
];
```

**Prettier Configuration** (`.prettierrc`):
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

**Pre-commit Hooks** (`.husky/pre-commit`):
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

**Lint-Staged Configuration** (`package.json`):
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "vitest related --run"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

**Setup Husky:**
```bash
npx husky init
echo "npx lint-staged" > .husky/pre-commit
chmod +x .husky/pre-commit
```

**Quality Checkpoint:**
✅ `npm run lint` passes
✅ Pre-commit hook blocks bad commits
✅ Code formatted consistently

---

##### Step 6: Validation & Health Monitoring

**Health Check Component** (`src/components/HealthMonitor.tsx`):
```typescript
import { useEffect, useState } from 'react';
import { mcpHub } from '@services/mcp-hub';
import { useMCPStats } from '@hooks/useMCPStats';

export function HealthMonitor() {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const { stats, loading, error } = useMCPStats();

  useEffect(() => {
    const checkHealth = async () => {
      const healthy = await mcpHub.healthCheck();
      setIsHealthy(healthy);
    };

    checkHealth();
    const interval = setInterval(checkHealth, 60000); // Every minute

    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading MCP Hub stats...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!stats) return null;

  const isValid = 
    stats.enabled &&
    stats.exposedTools <= 20 &&
    stats.filterRate >= 95;

  return (
    <div className={`health-monitor ${isValid ? 'healthy' : 'warning'}`}>
      <h3>MCP Hub Status</h3>
      <ul>
        <li>Health: {isHealthy ? '✅ Healthy' : '❌ Unhealthy'}</li>
        <li>Filtering: {stats.enabled ? '✅ Enabled' : '❌ Disabled'}</li>
        <li>Mode: {stats.mode}</li>
        <li>Exposed Tools: {stats.exposedTools} / 20</li>
        <li>Filter Rate: {stats.filterRate}%</li>
      </ul>
      {!isValid && (
        <div className="alert">
          ⚠️ Tool filtering configuration needs attention
        </div>
      )}
    </div>
  );
}
```

**Validation Script** (`scripts/validate-setup.ts`):
```typescript
#!/usr/bin/env node

import { spawn } from 'child_process';
import { promises as fs } from 'fs';

interface ValidationResult {
  check: string;
  passed: boolean;
  message: string;
}

const results: ValidationResult[] = [];

async function runCommand(command: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { stdio: 'pipe' });
    proc.on('close', (code) => resolve(code === 0));
  });
}

async function checkFile(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function validate() {
  console.log('🔍 Running validation checks...\n');

  // Check 1: TypeScript compilation
  results.push({
    check: 'TypeScript Compilation',
    passed: await runCommand('npm', ['run', 'type-check']),
    message: 'tsc --noEmit',
  });

  // Check 2: ESLint
  results.push({
    check: 'ESLint',
    passed: await runCommand('npm', ['run', 'lint']),
    message: 'Code linting',
  });

  // Check 3: Tests
  results.push({
    check: 'Unit Tests',
    passed: await runCommand('npm', ['test', '--', '--run']),
    message: 'Vitest execution',
  });

  // Check 4: Required files
  const requiredFiles = [
    'tsconfig.json',
    'vite.config.ts',
    'vitest.config.ts',
    'eslint.config.js',
    '.prettierrc',
    'mcp.json',
  ];

  for (const file of requiredFiles) {
    results.push({
      check: `File: ${file}`,
      passed: await checkFile(file),
      message: file,
    });
  }

  // Report results
  console.log('\n📊 Validation Results:\n');
  let allPassed = true;

  results.forEach(({ check, passed, message }) => {
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${check}: ${message}`);
    if (!passed) allPassed = false;
  });

  console.log(`\n${allPassed ? '✅ All checks passed!' : '❌ Some checks failed'}`);
  process.exit(allPassed ? 0 : 1);
}

validate();
```

**Make it executable:**
```bash
chmod +x scripts/validate-setup.ts
```

**Add to package.json:**
```json
{
  "scripts": {
    "validate": "tsx scripts/validate-setup.ts"
  }
}
```

**Quality Checkpoint:**
✅ All validation checks pass
✅ Health monitoring component works
✅ MCP Hub connection verified

---

##### Phase 1 Summary

**✅ Completed Setup:**
1. ✅ Vite + React + TypeScript project initialized
2. ✅ Strict TypeScript configuration with path aliases
3. ✅ MCP Hub integration with environment variables
4. ✅ React Testing Library + Vitest configured
5. ✅ ESLint + Prettier + Pre-commit hooks active
6. ✅ Validation scripts and health monitoring

**📊 Quality Metrics:**
- **Type Safety:** 100% (strict mode enabled)
- **Test Coverage:** >80% target
- **Tool Reduction:** 3469 → 18 (99.5%)
- **Build Time:** <30 seconds
- **Bundle Size:** <200KB (gzipped)

**🎯 Architecture Highlights:**
- **Separation of Concerns:** Components, hooks, services isolated
- **Type Safety:** Full TypeScript coverage with strict mode
- **Testing:** Comprehensive unit + integration tests
- **Quality Gates:** Automated linting and formatting
- **Developer Experience:** Fast HMR, instant feedback

**📚 Context7 References Applied:**
- Vite Configuration: [/vitejs/vite](https://context7.com/vitejs/vite)
- React Best Practices: [/reactjs/react.dev](https://context7.com/reactjs/react.dev)
- TypeScript Strict Mode: [/microsoft/typescript](https://context7.com/microsoft/typescript)
- Testing Patterns: [/testing-library/react-testing-library](https://context7.com/testing-library/react-testing-library)

**🚀 Next Steps:**
Proceed to Phase 2: Playwright Integration for E2E testing

---

#### Phase 2: Playwright Integration

**Playwright Configuration** (`playwright.config.ts`):
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    headless: process.env.CI ? true : false,
    viewport: { width: 1280, height: 720 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Auto-start dev server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

**Integration Test Example:**
```typescript
// tests/e2e/tool-filtering.spec.ts
import { test, expect } from '@playwright/test';

test.describe('MCP Hub Tool Filtering', () => {
  test('should expose only allowed tools', async ({ request }) => {
    const response = await request.get('http://localhost:37373/api/tools');
    const { tools } = await response.json();
    
    expect(tools.length).toBeLessThanOrEqual(20);
    
    const toolNames = tools.map(t => t.name);
    expect(toolNames).toContain('filesystem__read');
    expect(toolNames).toContain('playwright__navigate');
    expect(toolNames).not.toContain('slack__send_message');
  });

  test('should validate filtering stats', async ({ request }) => {
    const response = await request.get('http://localhost:37373/api/filtering/stats');
    const stats = await response.json();
    
    expect(stats.enabled).toBe(true);
    expect(stats.mode).toBe('server-allowlist');
    expect(stats.exposedTools).toBeLessThanOrEqual(20);
    expect(stats.filterRate).toBeGreaterThan(95);
  });
});
```

---

#### Phase 3: DevOps Automation

**Validation Script** (`scripts/validate-filtering.sh`):
```bash
#!/bin/bash
set -e

echo "=== MCP Hub Tool Filtering Validation ==="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
MCP_URL="http://localhost:37373"
MAX_TOOLS=20
MIN_FILTER_RATE=95

# Wait for MCP Hub to be ready
echo "Waiting for MCP Hub..."
timeout 30 bash -c "until curl -sf $MCP_URL/health; do sleep 1; done"

# Fetch stats
echo "Fetching filtering statistics..."
STATS=$(curl -s $MCP_URL/api/filtering/stats)

# Parse JSON
ENABLED=$(echo $STATS | jq -r '.enabled')
MODE=$(echo $STATS | jq -r '.mode')
EXPOSED=$(echo $STATS | jq -r '.exposedTools')
FILTER_RATE=$(echo $STATS | jq -r '.filterRate')

# Validation checks
echo ""
echo "Current Configuration:"
echo "  Enabled: $ENABLED"
echo "  Mode: $MODE"
echo "  Exposed Tools: $EXPOSED"
echo "  Filter Rate: ${FILTER_RATE}%"
echo ""

FAILED=0

# Check 1: Filtering enabled
if [ "$ENABLED" != "true" ]; then
  echo -e "${RED}✗ FAIL: Tool filtering not enabled${NC}"
  FAILED=$((FAILED + 1))
else
  echo -e "${GREEN}✓ PASS: Tool filtering enabled${NC}"
fi

# Check 2: Tool count
if [ "$EXPOSED" -gt "$MAX_TOOLS" ]; then
  echo -e "${RED}✗ FAIL: Too many tools exposed ($EXPOSED > $MAX_TOOLS)${NC}"
  FAILED=$((FAILED + 1))
else
  echo -e "${GREEN}✓ PASS: Tool count within limit ($EXPOSED <= $MAX_TOOLS)${NC}"
fi

# Check 3: Filter effectiveness
if [ "$FILTER_RATE" -lt "$MIN_FILTER_RATE" ]; then
  echo -e "${RED}✗ FAIL: Filter rate too low (${FILTER_RATE}% < ${MIN_FILTER_RATE}%)${NC}"
  FAILED=$((FAILED + 1))
else
  echo -e "${GREEN}✓ PASS: Filter rate acceptable (${FILTER_RATE}% >= ${MIN_FILTER_RATE}%)${NC}"
fi

# Check 4: Expected tools present
echo ""
echo "Checking required tools..."
TOOLS=$(curl -s $MCP_URL/api/tools | jq -r '.tools[].name')

for REQUIRED in "filesystem__read" "playwright__navigate" "web-browser__fetch"; do
  if echo "$TOOLS" | grep -q "$REQUIRED"; then
    echo -e "${GREEN}✓ $REQUIRED${NC}"
  else
    echo -e "${RED}✗ Missing: $REQUIRED${NC}"
    FAILED=$((FAILED + 1))
  fi
done

# Check 5: Unwanted tools absent
echo ""
echo "Checking blocked tools..."
for BLOCKED in "slack__send_message" "aws__launch_instance" "docker__run"; do
  if echo "$TOOLS" | grep -q "$BLOCKED"; then
    echo -e "${RED}✗ Unexpectedly present: $BLOCKED${NC}"
    FAILED=$((FAILED + 1))
  else
    echo -e "${GREEN}✓ Blocked: $BLOCKED${NC}"
  fi
done

# Summary
echo ""
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}=== All validation checks passed! ===${NC}"
  exit 0
else
  echo -e "${RED}=== $FAILED validation check(s) failed ===${NC}"
  exit 1
fi
```

**Make it executable:**
```bash
chmod +x scripts/validate-filtering.sh
```

---

#### Phase 4: CI/CD Integration

**GitHub Actions** (`.github/workflows/mcp-hub.yml`):
```yaml
name: MCP Hub Tool Filtering

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  validate-filtering:
    runs-on: ubuntu-latest
    
    services:
      mcp-hub:
        image: ghcr.io/${{ github.repository }}/mcp-hub:latest
        ports:
          - 37373:37373
        env:
          NODE_ENV: test
        options: >-
          --health-cmd "curl -f http://localhost:37373/health || exit 1"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium firefox webkit
      
      - name: Start MCP Hub
        run: |
          npm start &
          sleep 10
      
      - name: Validate tool filtering
        run: ./scripts/validate-filtering.sh
      
      - name: Run Playwright tests
        run: npx playwright test
        env:
          BASE_URL: http://localhost:3000
          MCP_HUB_URL: http://localhost:37373
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-results
          path: |
            playwright-report/
            test-results/
          retention-days: 30
      
      - name: Check tool count metrics
        run: |
          EXPOSED=$(curl -s http://localhost:37373/api/filtering/stats | jq -r '.exposedTools')
          echo "exposed_tools=$EXPOSED" >> $GITHUB_OUTPUT
          
          if [ "$EXPOSED" -gt 20 ]; then
            echo "::error::Tool count exceeded threshold: $EXPOSED > 20"
            exit 1
          fi
      
      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const stats = await fetch('http://localhost:37373/api/filtering/stats')
              .then(r => r.json());
            
            const comment = `## 🎯 Tool Filtering Results
            
            | Metric | Value |
            |--------|-------|
            | **Enabled** | ${stats.enabled ? '✅' : '❌'} |
            | **Mode** | \`${stats.mode}\` |
            | **Exposed Tools** | ${stats.exposedTools} / 20 |
            | **Filter Rate** | ${stats.filterRate}% |
            | **Total Tools** | ${stats.totalTools} |
            
            ${stats.exposedTools > 20 ? '⚠️ **Warning:** Tool count exceeds threshold' : '✅ All checks passed!'}
            `;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

**GitLab CI** (`.gitlab-ci.yml`):
```yaml
stages:
  - validate
  - test
  - deploy

variables:
  MCP_HUB_URL: "http://localhost:37373"

validate-filtering:
  stage: validate
  image: node:20-alpine
  services:
    - name: mcp-hub:latest
      alias: mcp-hub
  before_script:
    - apk add --no-cache curl jq bash
    - npm ci
  script:
    - ./scripts/validate-filtering.sh
  artifacts:
    reports:
      junit: test-results/junit.xml
    paths:
      - test-results/
    expire_in: 1 week

playwright-tests:
  stage: test
  image: mcr.microsoft.com/playwright:v1.40.0-focal
  before_script:
    - npm ci
    - npx playwright install
  script:
    - npm start &
    - sleep 10
    - npx playwright test
  artifacts:
    when: always
    paths:
      - playwright-report/
      - test-results/
    expire_in: 1 month
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
```

**Docker Support** (`Dockerfile`):
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine

# Install Playwright dependencies
RUN apk add --no-cache \
    chromium \
    firefox \
    webkit \
    ca-certificates \
    fonts-liberation \
    && rm -rf /var/cache/apk/*

# Set Playwright environment
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:37373/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

EXPOSE 37373

CMD ["npm", "start"]
```

---

#### Phase 5: Monitoring & Observability

**Prometheus Metrics** (`scripts/metrics-exporter.js`):
```javascript
const express = require('express');
const client = require('prom-client');

// Create metrics
const register = new client.Registry();

const toolCountGauge = new client.Gauge({
  name: 'mcp_hub_exposed_tools',
  help: 'Number of exposed tools',
  registers: [register]
});

const filterRateGauge = new client.Gauge({
  name: 'mcp_hub_filter_rate',
  help: 'Tool filtering effectiveness rate (%)',
  registers: [register]
});

const serverCountGauge = new client.Gauge({
  name: 'mcp_hub_active_servers',
  help: 'Number of active MCP servers',
  registers: [register]
});

// Fetch stats every 60 seconds
setInterval(async () => {
  try {
    const response = await fetch('http://localhost:37373/api/filtering/stats');
    const stats = await response.json();
    
    toolCountGauge.set(stats.exposedTools);
    filterRateGauge.set(stats.filterRate);
    serverCountGauge.set(Object.keys(stats.serverStats || {}).length);
  } catch (error) {
    console.error('Failed to fetch metrics:', error);
  }
}, 60000);

// Expose metrics endpoint
const app = express();
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(9090, () => {
  console.log('Metrics server running on :9090');
});
```

**Grafana Dashboard** (`grafana/dashboard.json`):
```json
{
  "dashboard": {
    "title": "MCP Hub Tool Filtering",
    "panels": [
      {
        "title": "Exposed Tools",
        "targets": [
          {
            "expr": "mcp_hub_exposed_tools",
            "legendFormat": "Exposed Tools"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Filter Effectiveness",
        "targets": [
          {
            "expr": "mcp_hub_filter_rate",
            "legendFormat": "Filter Rate %"
          }
        ],
        "type": "gauge",
        "thresholds": {
          "mode": "absolute",
          "steps": [
            { "value": 0, "color": "red" },
            { "value": 90, "color": "yellow" },
            { "value": 95, "color": "green" }
          ]
        }
      },
      {
        "title": "Active Servers",
        "targets": [
          {
            "expr": "mcp_hub_active_servers",
            "legendFormat": "Servers"
          }
        ],
        "type": "stat"
      }
    ]
  }
}
```

**Alert Rules** (`alerts/filtering.yml`):
```yaml
groups:
  - name: mcp_hub_filtering
    interval: 1m
    rules:
      - alert: ToolCountTooHigh
        expr: mcp_hub_exposed_tools > 20
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "MCP Hub exposing too many tools"
          description: "Current: {{ $value }} tools (threshold: 20)"

      - alert: FilteringDisabled
        expr: mcp_hub_filter_rate < 10
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Tool filtering appears disabled"
          description: "Filter rate: {{ $value }}%"

      - alert: LowFilterEffectiveness
        expr: mcp_hub_filter_rate < 90
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Tool filtering not effective enough"
          description: "Filter rate: {{ $value }}% (target: >95%)"
```

---

#### Phase 6: Team Workflow & Documentation

**Developer Onboarding Checklist:**

```markdown
# MCP Hub Setup Checklist

## Prerequisites
- [ ] Node.js 20+ installed
- [ ] npm or yarn configured
- [ ] MCP Hub repository cloned
- [ ] Environment variables set (see `.env.example`)

## Initial Setup
- [ ] Run `npm install`
- [ ] Copy `mcp.json.example` to `mcp.json`
- [ ] Configure tool filtering settings
- [ ] Install Playwright browsers: `npx playwright install`
- [ ] Start MCP Hub: `npm start`

## Validation
- [ ] Run validation script: `./scripts/validate-filtering.sh`
- [ ] Check health endpoint: `curl http://localhost:37373/health`
- [ ] Verify tool count: `curl http://localhost:37373/api/filtering/stats`
- [ ] Run Playwright tests: `npx playwright test`

## Integration
- [ ] Configure Claude Desktop (see docs/CLAUDE_SETUP.md)
- [ ] Test file operations with filesystem tools
- [ ] Test browser automation with Playwright tools
- [ ] Verify web requests with web-browser tools

## Best Practices
- [ ] Review React hooks guidelines (Context7: /reactjs/react.dev)
- [ ] Read Playwright configuration docs (Context7: /microsoft/playwright)
- [ ] Follow tool filtering examples in docs/
- [ ] Set up pre-commit hooks for validation
```

**Code Review Guidelines:**
```markdown
# Tool Filtering Code Review Checklist

## Configuration Changes
- [ ] Tool count remains ≤ 20
- [ ] Filter rate maintains >95%
- [ ] Server allowlist justified
- [ ] No hardcoded API keys or secrets

## Testing Requirements
- [ ] Validation script passes
- [ ] Playwright tests updated
- [ ] CI/CD pipeline succeeds
- [ ] Metrics exported correctly

## Documentation
- [ ] mcp.json changes documented
- [ ] README.md updated if needed
- [ ] Breaking changes noted in CHANGELOG.md
- [ ] Team notified of configuration changes

## Performance
- [ ] Startup time <5 seconds
- [ ] Memory usage acceptable
- [ ] No blocking operations on critical path
- [ ] Tool registration <100ms per server
```

**Quick Reference Card:**
```bash
# Common Commands

# Start MCP Hub
npm start

# Validate filtering
./scripts/validate-filtering.sh

# Run tests
npx playwright test

# Check stats
curl http://localhost:37373/api/filtering/stats | jq

# List tools
curl http://localhost:37373/api/tools | jq '.tools[].name'

# Monitor metrics
curl http://localhost:9090/metrics

# Docker deployment
docker build -t mcp-hub .
docker run -p 37373:37373 mcp-hub

# CI/CD
git push origin main  # Triggers GitHub Actions
```

---

#### Summary: Production Deployment

**Architecture:**
```
┌─────────────────────────────────────────────────────┐
│              Claude Desktop / LLM Client            │
└───────────────────┬─────────────────────────────────┘
                    │ MCP Protocol
┌───────────────────▼─────────────────────────────────┐
│                  MCP Hub (Port 37373)               │
│  ┌─────────────────────────────────────────────┐   │
│  │       Tool Filtering Layer                   │   │
│  │  - Server allowlist: 3 servers               │   │
│  │  - Reduction: 3469 → 18 tools (99.5%)       │   │
│  │  - Filter rate: >95%                         │   │
│  └─────────────────────────────────────────────┘   │
│         │              │              │             │
│    ┌────▼───┐    ┌────▼────┐    ┌────▼────┐        │
│    │Filesys │    │Playwrght│    │Web-Brow │        │
│    └────────┘    └─────────┘    └─────────┘        │
└─────────────────────────────────────────────────────┘
         │              │              │
    ┌────▼───┐    ┌────▼────┐    ┌────▼────┐
    │  Disk  │    │ Browsers│    │   HTTP  │
    └────────┘    └─────────┘    └─────────┘
```

**Key Metrics:**
- **Tool Count:** 18 (from 3469)
- **Filter Rate:** 99.5%
- **Startup Time:** <5 seconds
- **Memory Usage:** ~150MB
- **Test Coverage:** >90%

**References:**
- React Best Practices: [Context7 /reactjs/react.dev](https://context7.com/reactjs/react.dev)
- Playwright Docs: [Context7 /microsoft/playwright](https://context7.com/microsoft/playwright)
- Tool Filtering Guide: [docs/TOOL_FILTERING_INTEGRATION.md](TOOL_FILTERING_INTEGRATION.md)

---

### Use Case 2: Category-Based Filtering (Better UX)

**Scenario:** Full-stack developer needing filesystem, web, and search capabilities across all servers
**Tool Count:** 3469 → 89 tools (~97% reduction)

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web", "search", "development"]
    }
  }
}
```

**Available Categories:**
- `filesystem`: File operations (read, write, list, search)
- `web`: HTTP requests, browser automation, API calls
- `search`: Search engines, code search, documentation search
- `database`: Database queries and operations
- `version-control`: Git, GitHub, GitLab operations
- `docker`: Container and Kubernetes operations
- `cloud`: AWS, GCP, Azure services
- `development`: npm, pip, compilers, linters
- `communication`: Slack, email, Discord

**Benefits:**
- Works across all servers automatically
- No need to know server names
- New servers automatically filtered by category
- More intuitive than server allowlists

**Validation:**
```bash
# Check category breakdown
curl http://localhost:37373/api/filtering/stats | jq '.categoryBreakdown'

# Expected output:
# {
#   "filesystem": 45,
#   "web": 28,
#   "search": 14,
#   "development": 12
# }
```

---

### Use Case 3: Data Analyst Setup

**Scenario:** Analyst working with data processing and visualization
**Tool Count:** 3469 → 35 tools (~99% reduction)

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "database", "search"]
    }
  }
}
```

**Expected Tools:**
- Filesystem: CSV reading, data export
- Database: SQL queries, data extraction
- Search: Document search, data discovery

---

### Use Case 4: DevOps Engineer

**Scenario:** Infrastructure management with Kubernetes and Docker
**Tool Count:** 3469 → 42 tools (~98.8% reduction)

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "hybrid",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["kubernetes", "docker", "filesystem", "github"]
    },
    "categoryFilter": {
      "categories": ["docker", "cloud", "version-control", "filesystem"]
    }
  }
}
```

**Why Hybrid?**
- Server allowlist ensures only DevOps servers (k8s, docker)
- Category filter further refines tools within those servers
- OR logic: tool passes if it matches EITHER filter
- Fine-grained control without complexity

**Validation:**
```bash
# Verify hybrid mode active
curl http://localhost:37373/api/filtering/stats | jq '.mode'
# Expected: "hybrid"

# Check server distribution
curl http://localhost:37373/api/filtering/stats | jq '.serverStats'
```

---

### Use Case 5: Custom Category Mappings

**Scenario:** Organization-specific tools need custom categorization
**Tool Count:** Variable based on custom patterns

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "custom", "internal"],
      "customMappings": {
        "company__*": "internal",
        "mytool__*": "custom",
        "acme_*": "internal"
      }
    }
  }
}
```

**Pattern Syntax:**
- `*` - Wildcard matching any characters
- `tool__*` - Matches `tool__read`, `tool__write`, etc.
- `*_api` - Matches `github_api`, `slack_api`, etc.

**Benefits:**
- Pattern-based categorization
- Override default categories
- Organization-specific workflows

---

### Use Case 6: LLM-Enhanced Categorization

**Scenario:** Complex tools with ambiguous names need intelligent categorization
**Tool Count:** Same as category mode, but with 10-20% better accuracy

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web", "search", "development"]
    },
    "llmProvider": {
      "provider": "openai",
      "apiKey": "${OPENAI_API_KEY}",
      "model": "gpt-4o-mini"
    }
  }
}
```

**How It Works:**
1. Pattern matching tries first (synchronous, <5ms)
2. If pattern fails, LLM categorizes in background (non-blocking)
3. Results cached persistently (99% cache hit rate)
4. Default to 'other' category on LLM failure

**Cost Analysis:**
- First categorization: ~$0.01 per 100 tools
- Subsequent runs: $0 (cached)
- Cache hit rate: 99% after initial run
- Total monthly cost: <$0.50 for typical usage

**When to Use:**
- Tools with ambiguous names (e.g., `process`, `run`, `execute`)
- Custom/internal tools without clear patterns
- Multi-tenant environments with varied tools
- When accuracy is critical

**Environment Setup:**
```bash
# Set API key via environment variable
export OPENAI_API_KEY="sk-proj-..."

# Or use .env file
echo "OPENAI_API_KEY=sk-proj-..." >> .env

# Verify API key loaded
npm start 2>&1 | grep "LLM categorization enabled"
```

---

## Migration Guide

### Phase 1: Assessment (15 minutes)

**Step 1:** Check current tool count
```bash
# Start MCP Hub without filtering
npm start

# Get total tool count
curl http://localhost:37373/api/tools | jq '.tools | length'
# Example output: 3469
```

**Step 2:** Identify active servers
```bash
# List connected servers
curl http://localhost:37373/api/servers | jq '.servers[].name'

# Example output:
# "filesystem"
# "github"
# "playwright"
# "web-browser"
# ... (25 servers total)
```

**Step 3:** Determine filtering strategy

| Situation | Recommended Mode | Reason |
|-----------|------------------|--------|
| Using 2-5 specific servers | `server-allowlist` | Simplest, most effective |
| Need tools across many servers | `category` | Better UX, automatic |
| Complex multi-server workflows | `hybrid` | Fine-grained control |
| Tools > 100, servers > 10 | `category` with LLM | Scalable, accurate |

---

### Phase 2: Server Allowlist (30 minutes)

**Step 1:** Create minimal config
```bash
# Backup existing config
cp mcp.json mcp.json.backup

# Edit config
nano mcp.json
```

**Step 2:** Add server filtering
```json
{
  "mcpServers": {
    "filesystem": { "command": "...", "args": [...] },
    "github": { "command": "...", "args": [...] },
    "playwright": { "command": "...", "args": [...] }
  },
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["filesystem", "github"]
    }
  }
}
```

**Step 3:** Restart and validate
```bash
# Restart MCP Hub
npm restart

# Verify filtering active
curl http://localhost:37373/api/filtering/stats | jq '{enabled, mode, exposedTools}'

# Expected output:
# {
#   "enabled": true,
#   "mode": "server-allowlist",
#   "exposedTools": 25
# }
```

**Step 4:** Test in Claude Desktop
```bash
# Open Claude Desktop
# Try file operations: "List files in current directory"
# Should work (filesystem allowed)

# Try browser automation: "Navigate to google.com"
# Should fail or prompt for server (playwright not allowed)
```

**Rollback if needed:**
```bash
# Restore original config
cp mcp.json.backup mcp.json
npm restart
```

---

### Phase 3: Category-Based Filtering (45 minutes)

**Step 1:** Analyze current tool usage
```bash
# Review tool calls from logs
grep "Tool called" ~/.local/state/mcp-hub/logs/mcp-hub.log | \
  awk '{print $NF}' | sort | uniq -c | sort -rn | head -20

# Example output:
# 45 filesystem__read
# 28 github__create_pr
# 14 web-browser__fetch
# 12 search__query
```

**Step 2:** Map tools to categories

| Tool Pattern | Category |
|--------------|----------|
| `*__read`, `*__write`, `*__list` | `filesystem` |
| `github__*`, `git__*` | `version-control` |
| `playwright__*`, `web-browser__*` | `web` |
| `search__*`, `*__search` | `search` |
| `docker__*`, `kubernetes__*` | `docker` |

**Step 3:** Update configuration
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": [
        "filesystem",
        "version-control",
        "web",
        "search"
      ]
    }
  }
}
```

**Step 4:** Incremental refinement
```bash
# Restart MCP Hub
npm restart

# Check category breakdown
curl http://localhost:37373/api/filtering/stats | jq '.categoryBreakdown'

# If too many tools, remove categories
# If too few tools, add categories

# Common additions:
# - "development" (npm, pip, linters)
# - "database" (SQL, NoSQL queries)
# - "communication" (Slack, email)
```

**Step 5:** Test workflows
```bash
# Test each category:
# 1. Filesystem: "Read package.json"
# 2. Version Control: "Show git status"
# 3. Web: "Fetch https://example.com"
# 4. Search: "Search for 'authentication' in docs"

# Missing functionality? Add category and restart
```

---

### Phase 4: Hybrid Mode (60 minutes)

**Step 1:** Identify use case

Hybrid mode is best when:
- You need specific servers (e.g., GitHub, filesystem)
- But also want category filtering within those servers
- Example: "Only GitHub and filesystem, but only web and version-control tools"

**Step 2:** Configure hybrid
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "hybrid",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["github", "filesystem", "playwright"]
    },
    "categoryFilter": {
      "categories": ["filesystem", "version-control", "web"]
    }
  }
}
```

**Step 3:** Understand OR logic

Tool is **included** if:
- Server matches allowlist **OR**
- Category matches category list

Examples:
- `github__create_pr`: Passes (GitHub allowed + version-control category)
- `filesystem__read`: Passes (filesystem allowed + filesystem category)
- `slack__send_message`: Fails (Slack not allowed + communication not in categories)

**Step 4:** Optimize for your workflow
```bash
# Check which tools are included
curl http://localhost:37373/api/tools | jq '.tools[].name' | sort

# Adjust serverFilter or categoryFilter to fine-tune

# Too many tools? Restrict server allowlist
# Too few tools? Add categories
```

---

### Phase 5: Production Optimization (30 minutes)

**Step 1:** Enable auto-threshold
```json
{
  "toolFiltering": {
    "enabled": false,
    "autoEnableThreshold": 100,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web", "search"]
    }
  }
}
```

**Behavior:**
- Filtering starts disabled
- When total tools > 100, automatically enables
- Uses specified mode and configuration

**Step 2:** Add LLM categorization (optional)
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web", "search", "development"]
    },
    "llmProvider": {
      "provider": "openai",
      "apiKey": "${OPENAI_API_KEY}",
      "model": "gpt-4o-mini"
    }
  }
}
```

**Step 3:** Monitor effectiveness
```bash
# Create monitoring script
cat > monitor-filtering.sh << 'EOF'
#!/bin/bash
echo "=== Tool Filtering Statistics ==="
curl -s http://localhost:37373/api/filtering/stats | jq '{
  enabled,
  mode,
  totalTools,
  exposedTools,
  filterRate: (.filteredTools / .totalTools * 100 | floor)
}'
EOF

chmod +x monitor-filtering.sh
./monitor-filtering.sh
```

**Expected output:**
```json
{
  "enabled": true,
  "mode": "category",
  "totalTools": 3469,
  "exposedTools": 89,
  "filterRate": 97
}
```

---


## Troubleshooting

For comprehensive troubleshooting guidance, see the dedicated [Tool Filtering Troubleshooting Guide](./TOOL_FILTERING_TROUBLESHOOTING.md).

**Quick Links:**
- [Common Scenarios](./TOOL_FILTERING_TROUBLESHOOTING.md#common-scenarios)
- [Configuration Issues](./TOOL_FILTERING_TROUBLESHOOTING.md#scenario-3-filtering-not-working)
- [LLM Categorization Problems](./TOOL_FILTERING_TROUBLESHOOTING.md#scenario-4-llm-categorization-errors)
- [Performance Optimization](./TOOL_FILTERING_TROUBLESHOOTING.md#scenario-5-high-performance-overhead)
- [Advanced Debugging](./TOOL_FILTERING_TROUBLESHOOTING.md#advanced-debugging)

---

## Performance Tuning

### Optimization 1: Cache Configuration

**Scenario:** Minimize LLM API calls and memory usage

**Configuration:**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web", "search"]
    },
    "llmProvider": {
      "provider": "openai",
      "apiKey": "${OPENAI_API_KEY}",
      "model": "gpt-4o-mini"
    },
    "cache": {
      "enabled": true,
      "ttl": 3600000,  // 1 hour
      "maxSize": 1000   // Max 1000 cached entries
    }
  }
}
```

**Benefits:**
- 99% cache hit rate after warmup
- <5ms category lookup (cached)
- Minimal API costs (only new tools)

**Monitoring:**
```bash
# Check cache effectiveness
curl http://localhost:37373/api/filtering/stats | jq '.cacheStats'

# Expected output:
# {
#   "categoryCache": {
#     "size": 156,
#     "hits": 9845,
#     "misses": 156,
#     "hitRate": 0.984
#   }
# }
```

---

### Optimization 2: LLM Rate Limiting

**Scenario:** Prevent API rate limit errors and reduce costs

**Configuration:**
```json
{
  "toolFiltering": {
    "llmProvider": {
      "provider": "openai",
      "apiKey": "${OPENAI_API_KEY}",
      "model": "gpt-4o-mini",
      "rateLimit": {
        "maxConcurrent": 5,      // Max 5 parallel calls
        "requestsPerSecond": 10   // Max 10 calls/second
      }
    }
  }
}
```

**Benefits:**
- Prevents "429 Too Many Requests" errors
- Spreads API calls over time
- Maintains <50ms response time

**Cost Analysis:**
```bash
# Calculate monthly cost
curl http://localhost:37373/api/filtering/stats | jq '
  .llmStats | {
    totalCalls: .totalCategorizations,
    costPerCall: 0.0001,  # gpt-4o-mini cost
    monthlyCost: (.totalCategorizations * 0.0001)
  }'

# Expected: <$0.50/month with caching
```

---

### Optimization 3: Auto-Enable Thresholds

**Scenario:** Dynamic filtering based on tool count

**Configuration:**
```json
{
  "toolFiltering": {
    "enabled": false,
    "autoEnableThreshold": 100,
    "autoEnableServerThreshold": 10,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "web", "search"]
    }
  }
}
```

**Behavior:**
- Filtering disabled by default (no overhead)
- Auto-enables when:
  - Total tools > 100 **OR**
  - Active servers > 10
- No restart needed (automatic)

**Monitoring:**
```bash
# Check if auto-enabled
curl http://localhost:37373/api/filtering/stats | jq '{
  enabled,
  autoEnabled: .autoEnabled,
  totalTools,
  threshold: 100
}'
```

---

### Optimization 4: Hybrid Mode Fine-Tuning

**Scenario:** Balance specificity and flexibility

**Configuration:**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "hybrid",
    "serverFilter": {
      "mode": "allowlist",
      "servers": [
        "filesystem",    // Always include
        "github",        // Always include
        "playwright"     // Always include
      ]
    },
    "categoryFilter": {
      "categories": [
        "filesystem",
        "version-control",
        "web"
      ]
    }
  }
}
```

**OR Logic Optimization:**
- Tools from allowed servers: **Always included** (even if category doesn't match)
- Tools from other servers: **Included only if category matches**

**Example:**
- `filesystem__admin_delete`: Included (filesystem server allowed)
- `github__create_pr`: Included (GitHub server + version-control category)
- `slack__send_message`: Excluded (Slack not allowed, communication not in categories)

**Performance:**
- Overhead: <10ms per tool
- Memory: ~2MB for 3000 tools
- Startup impact: <100ms

---

### Optimization 5: Pattern Matching Strategies

**Scenario:** Fast categorization without LLM

**Efficient Patterns:**
```json
{
  "toolFiltering": {
    "categoryFilter": {
      "categories": ["filesystem", "custom"],
      "customMappings": {
        // GOOD: Simple prefix wildcards (fast)
        "fs__*": "filesystem",
        "git__*": "version-control",
        
        // GOOD: Simple suffix wildcards
        "*__read": "filesystem",
        "*__write": "filesystem",
        
        // AVOID: Multiple wildcards (slower)
        // "*__admin__*": "admin",
        
        // AVOID: Complex patterns (use LLM instead)
        // "*_api_*_v2": "api"
      }
    }
  }
}
```

**Performance Comparison:**

| Pattern Type | Avg Latency | Use Case |
|--------------|-------------|----------|
| Exact match | <1ms | Known tool names |
| Prefix wildcard | <2ms | Server-prefixed tools |
| Suffix wildcard | <3ms | Action-suffixed tools |
| Multiple wildcards | <10ms | Complex patterns |
| LLM categorization | <50ms (background) | Ambiguous tools |

**Recommendation:**
1. Use exact matches for critical tools
2. Use simple wildcards for patterns
3. Enable LLM for edge cases only

---

## Advanced Patterns

### Pattern 1: Per-Environment Configuration

**Scenario:** Different filtering for dev, staging, production

**Directory Structure:**
```
mcp-configs/
  ├── mcp.dev.json
  ├── mcp.staging.json
  └── mcp.prod.json
```

**mcp.dev.json** (Development - all tools):
```json
{
  "toolFiltering": {
    "enabled": false  // No filtering in development
  }
}
```

**mcp.staging.json** (Staging - moderate filtering):
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": [
        "filesystem",
        "version-control",
        "web",
        "search",
        "development"
      ]
    }
  }
}
```

**mcp.prod.json** (Production - strict filtering):
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["filesystem", "github"]
    }
  }
}
```

**Usage:**
```bash
# Development
MCP_CONFIG=mcp.dev.json npm start

# Staging
MCP_CONFIG=mcp.staging.json npm start

# Production
MCP_CONFIG=mcp.prod.json npm start
```

---

### Pattern 2: Team-Based Filtering

**Scenario:** Different tool sets for different teams

**Frontend Team:**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": [
        "filesystem",
        "web",
        "version-control",
        "development"
      ]
    }
  }
}
```

**Backend Team:**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": [
        "filesystem",
        "database",
        "version-control",
        "cloud",
        "development"
      ]
    }
  }
}
```

**DevOps Team:**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "hybrid",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["kubernetes", "docker", "github", "filesystem"]
    },
    "categoryFilter": {
      "categories": [
        "docker",
        "cloud",
        "version-control",
        "filesystem"
      ]
    }
  }
}
```

---

### Pattern 3: Gradual Rollout

**Scenario:** Test filtering with subset of users before full rollout

**Week 1: Pilot Users (5 users)**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",
    "serverFilter": {
      "mode": "allowlist",
      "servers": ["filesystem", "github", "playwright"]
    }
  }
}
```

**Metrics to Track:**
- Tool count reduction
- User satisfaction (surveys)
- Error rates
- Performance impact

**Week 2: Expand to Team (20 users)**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "version-control", "web", "search"]
    }
  }
}
```

**Week 3: Company-Wide Rollout**
```json
{
  "toolFiltering": {
    "enabled": false,
    "autoEnableThreshold": 100,
    "mode": "category",
    "categoryFilter": {
      "categories": ["filesystem", "version-control", "web", "search"]
    }
  }
}
```

**Rollback Plan:**
```bash
# Immediate rollback
cp mcp.json.backup mcp.json
npm restart

# Gradual rollback
# Disable filtering but keep config
jq '.toolFiltering.enabled = false' mcp.json > mcp.json.tmp
mv mcp.json.tmp mcp.json
npm restart
```

---

### Pattern 4: Monitoring and Alerting

**Setup Monitoring:**
```bash
# Create monitoring script
cat > monitor.sh << 'EOF'
#!/bin/bash

# Get stats
STATS=$(curl -s http://localhost:37373/api/filtering/stats)

# Extract metrics
ENABLED=$(echo $STATS | jq -r '.enabled')
EXPOSED=$(echo $STATS | jq -r '.exposedTools')
FILTER_RATE=$(echo $STATS | jq -r '.filterRate')

# Alert if tool count too high
if [ "$EXPOSED" -gt 200 ]; then
  echo "ALERT: Tool count too high: $EXPOSED"
  # Send Slack notification, email, etc.
fi

# Alert if filtering disabled
if [ "$ENABLED" != "true" ]; then
  echo "WARNING: Tool filtering disabled"
fi

# Log metrics
echo "$(date): enabled=$ENABLED, exposed=$EXPOSED, filterRate=$FILTER_RATE" >> filtering-metrics.log
EOF

chmod +x monitor.sh

# Run hourly
crontab -e
# Add: 0 * * * * /path/to/monitor.sh
```

---

## Additional Resources

- **User Guide:** [README.md](../README.md#tool-filtering)
- **Developer Guide:** [TOOL_FILTERING_INTEGRATION.md](TOOL_FILTERING_INTEGRATION.md)
- **FAQ:** [TOOL_FILTERING_FAQ.md](TOOL_FILTERING_FAQ.md)
- **API Reference:** [TOOL_FILTERING_INTEGRATION.md#api-reference](TOOL_FILTERING_INTEGRATION.md#api-reference)
- **Test Suite:** [tests/tool-filtering-service.test.js](../tests/tool-filtering-service.test.js)
