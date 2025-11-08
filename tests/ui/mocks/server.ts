/**
 * MSW server setup for Node.js test environment
 * This file creates the mock server that intercepts HTTP requests during tests
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * Create MSW server with default handlers
 * This will be imported and used in tests/setup.js
 */
export const server = setupServer(...handlers);
