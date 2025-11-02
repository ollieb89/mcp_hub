/**
 * Stress Test for MCP Hub
 *
 * Gradually increases load to find the breaking point and system limits
 *
 * Usage:
 *   k6 run tests/load/stress-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTimes = new Trend('response_time');

export const options = {
  stages: [
    { duration: '2m', target: 50 },    // Ramp to 50 users
    { duration: '2m', target: 100 },   // Ramp to 100 users
    { duration: '2m', target: 200 },   // Ramp to 200 users
    { duration: '2m', target: 300 },   // Ramp to 300 users
    { duration: '2m', target: 400 },   // Ramp to 400 users
    { duration: '5m', target: 500 },   // Push to 500 users and hold
    { duration: '2m', target: 0 },     // Ramp down
  ],

  thresholds: {
    // Allow higher error rates during stress testing
    errors: ['rate<0.1'],  // Less than 10% errors

    // Response times will degrade under stress, track but don't fail
    http_req_duration: ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:7000';

export default function () {
  const url = `${BASE_URL}/mcp`;

  const payload = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const start = Date.now();
  const response = http.post(url, payload, params);
  const duration = Date.now() - start;

  responseTimes.add(duration);

  const success = check(response, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    'response received': (r) => r.body.length > 0,
  });

  if (!success || response.status !== 200) {
    errorRate.add(1);
  }

  sleep(0.5);
}

export function setup() {
  console.log('Starting STRESS TEST for MCP Hub');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('WARNING: This test will push the system to its limits');

  const healthCheck = http.get(`${BASE_URL}/api/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`Server not accessible at ${BASE_URL}`);
  }

  return { baseUrl: BASE_URL, startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000 / 60;
  console.log(`Stress test completed in ${duration.toFixed(2)} minutes`);
}
