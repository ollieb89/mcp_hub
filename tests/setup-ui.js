/**
 * UI Test Setup
 *
 * This file is executed before UI tests via Node.js vitest.
 * Provides DOM environment setup for React Testing Library.
 */

import '@testing-library/jest-dom/vitest';
import './setup-msw.js';
import { afterEach } from 'vitest';
import { vi } from 'vitest';

// Global cleanup after each test
afterEach(() => {
  vi.restoreAllMocks();
});
