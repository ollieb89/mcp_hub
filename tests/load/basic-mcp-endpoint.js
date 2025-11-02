/**
 * Basic Load Test for MCP Hub Management API
 *
 * Tests the HTTP REST API endpoints under various load conditions
 *
 * Usage:
 *   k6 run tests/load/basic-mcp-endpoint.js
 *   k6 run --vus 10 --duration 30s tests/load/basic-mcp-endpoint.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const serversListDuration = new Trend('servers_list_duration');
const filteringStatsDuration = new Trend('filtering_stats_duration');
const requestCounter = new Counter('total_requests');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Ramp up to 20 users over 1 minute
    { duration: '3m', target: 20 },   // Stay at 20 users for 3 minutes
    { duration: '1m', target: 50 },   // Spike to 50 users
    { duration: '2m', target: 50 },   // Stay at 50 users for 2 minutes
    { duration: '1m', target: 0 },    // Ramp down to 0 users
  ],

  thresholds: {
    // 95% of requests should complete within 500ms
    http_req_duration: ['p(95)<500'],

    // 99% of requests should complete within 1s
    'http_req_duration{type:servers_list}': ['p(99)<1000'],

    // Error rate should be less than 1%
    errors: ['rate<0.01'],

    // At least 90% of checks should pass
    checks: ['rate>0.9'],
  },

  // Graceful stop settings
  gracefulStop: '10s',
};

// Base URL (can be overridden via K6_BASE_URL env var)
const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:7000';

/**
 * Main test function - executed by each virtual user
 */
export default function () {
  requestCounter.add(1);

  // Test 1: List all MCP servers
  testServersList();

  // Think time between requests (simulates user behavior)
  sleep(1);

  // Test 2: Get filtering statistics (if enabled)
  testFilteringStats();

  sleep(0.5);

  // Test 3: Check server health
  testHealthEndpoint();

  sleep(0.5);
}

/**
 * Test the /api/servers endpoint
 */
function testServersList() {
  const url = `${BASE_URL}/api/servers`;

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { type: 'servers_list' },
  };

  const start = Date.now();
  const response = http.get(url, params);
  const duration = Date.now() - start;

  serversListDuration.add(duration);

  const success = check(response, {
    'servers/list status is 200': (r) => r.status === 200,
    'servers/list returns valid object': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body !== null && typeof body === 'object' && Array.isArray(body.servers);
      } catch (e) {
        return false;
      }
    },
    'servers/list has server objects': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.servers) && (body.servers.length === 0 || body.servers[0].name !== undefined);
      } catch (e) {
        return false;
      }
    },
    'servers/list response time < 500ms': () => duration < 500,
  });

  if (!success) {
    errorRate.add(1);
  }

  return response;
}

/**
 * Test the /api/filtering/stats endpoint
 */
function testFilteringStats() {
  const url = `${BASE_URL}/api/filtering/stats`;

  const params = {
    tags: { type: 'filtering_stats' },
  };

  const start = Date.now();
  const response = http.get(url, params);
  const duration = Date.now() - start;

  filteringStatsDuration.add(duration);

  const success = check(response, {
    'filtering/stats status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'filtering/stats has valid response': (r) => {
      if (r.status === 404) return true; // Not enabled, ok
      try {
        const body = JSON.parse(r.body);
        return body !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  if (!success && response.status !== 404) {
    errorRate.add(1);
  }

  return response;
}

/**
 * Test the health check endpoint
 */
function testHealthEndpoint() {
  const url = `${BASE_URL}/api/health`;

  const params = {
    tags: { type: 'health_check' },
  };

  const response = http.get(url, params);

  const success = check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check has status field': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  if (!success) {
    errorRate.add(1);
  }

  return response;
}

/**
 * Setup function - runs once before test starts
 */
export function setup() {
  console.log('Starting load test for MCP Hub Management API');
  console.log(`Target URL: ${BASE_URL}`);

  // Verify server is accessible
  const healthCheck = http.get(`${BASE_URL}/api/health`);

  if (healthCheck.status !== 200) {
    throw new Error(`Server not accessible at ${BASE_URL}. Status: ${healthCheck.status}`);
  }

  console.log('Server health check passed');

  // Get initial server count
  const serversCheck = http.get(`${BASE_URL}/api/servers`);
  if (serversCheck.status === 200) {
    try {
      const response = JSON.parse(serversCheck.body);
      console.log(`Found ${response.servers?.length || 0} MCP servers configured`);
    } catch (e) {
      console.log('Unable to parse servers response');
    }
  }

  return {
    baseUrl: BASE_URL,
    startTime: new Date().toISOString(),
  };
}

/**
 * Teardown function - runs once after test completes
 */
export function teardown(data) {
  console.log('Load test completed');
  console.log(`Started at: ${data.startTime}`);
  console.log(`Ended at: ${new Date().toISOString()}`);
}
