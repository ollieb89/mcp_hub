/**
 * Global Test Setup
 *
 * This file is executed before all tests via Vitest setupFiles config.
 * It imports helpers globally (if desired) and performs global test setup.
 */

import { afterEach } from 'vitest';
import { vi } from 'vitest';

// Global cleanup after each test
afterEach(() => {
  vi.restoreAllMocks();
});

// Additional global setup can be added here

