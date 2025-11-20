/**
 * Global Test Setup
 *
 * This file is executed before all tests via Vitest setupFiles config.
 * It imports helpers globally (if desired) and performs global test setup.
 * 
 * NOTE: UI tests with DOM requirements run separately via Node.js vitest (see test:ui script).
 * This setup is for backend tests only (Bun vitest, no DOM).
 */

import { afterEach } from 'vitest';
import { vi } from 'vitest';

// Global cleanup after each test
afterEach(() => {
  vi.restoreAllMocks();
});

// Additional global setup can be added here

// Global SDK module mocks for tests: replace network fetch-based stubs with
// module-level Vitest mocks for `openai` and `@anthropic-ai/sdk` so tests
// no longer rely on HTTP interception. Each test can override behaviors with
// `vi.mocked(...).mockImplementationOnce(...)` as needed.

vi.mock('openai', () => {
  // Minimal mock of the OpenAI SDK surface used by providers
  const createChatCompletion = vi.fn(async (opts) => {
    // Default behavior returns a minimal shape; tests override this mock
    // Return JSON format expected by the implementation
    return {
      id: 'mock-openai-1',
      choices: [{ message: { content: JSON.stringify({ category: 'other', confidence: 0.8 }) } }],
    };
  });

  class OpenAI {
    constructor() {}
    // Some codepaths reference client.chat.completions.create or client.chat.create
    get chat() {
      return {
        completions: { create: createChatCompletion },
      };
    }
  }

  // Export as default to match imports like `import OpenAI from 'openai'`
  return { default: OpenAI, __esModule: true };
});

vi.mock('@anthropic-ai/sdk', () => {
  // Minimal mock of the Anthropic SDK surface used by providers
  const createMessage = vi.fn(async (opts) => {
    // Anthropic provider expects plain text, not JSON
    return {
      id: 'mock-anthropic-1',
      content: [{ text: 'other' }]
    };
  });

  class Anthropic {
    constructor() {}
    messages = { create: createMessage };
  }

  // Export as default to match imports like `import Anthropic from '@anthropic-ai/sdk'`
  return { default: Anthropic, __esModule: true };
});
