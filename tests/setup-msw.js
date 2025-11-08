/**
 * MSW Integration for Test Setup
 *
 * Add this import to tests/setup.js after installing MSW:
 * import './setup-msw.js';
 *
 * This file sets up Mock Service Worker for HTTP request mocking in tests.
 */

import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './ui/mocks/server';

// Start MSW server before all tests
beforeAll(() => {
  server.listen({
    // Log unhandled requests (helps catch missing handlers)
    onUnhandledRequest: 'warn',
  });
});

// Reset handlers after each test to prevent test pollution
// This ensures each test starts with clean MSW state
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests complete
afterAll(() => {
  server.close();
});
