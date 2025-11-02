/**
 * Spike Test for LLM-Based Tool Filtering
 *
 * Tests the hub__analyze_prompt meta-tool under sudden traffic spikes
 *
 * Usage:
 *   k6 run tests/load/spike-test-llm.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const llmResponseTime = new Trend('llm_response_time');
const categorizationAccuracy = new Rate('categorization_accuracy');

export const options = {
  stages: [
    { duration: '30s', target: 10 },    // Warm-up
    { duration: '10s', target: 100 },   // Sudden spike to 100 users
    { duration: '1m', target: 100 },    // Hold spike
    { duration: '30s', target: 10 },    // Rapid drop
    { duration: '30s', target: 0 },     // Ramp down
  ],

  thresholds: {
    // LLM calls are slower, allow up to 3 seconds p95
    'http_req_duration{type:llm_categorization}': ['p(95)<3000'],

    // Error rate should still be low
    errors: ['rate<0.05'],

    // At least 80% categorization accuracy
    categorization_accuracy: ['rate>0.8'],
  },
};

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:7000';

// Sample prompts for testing categorization
const TEST_PROMPTS = [
  'Check my GitHub notifications',
  'List all files in the current directory',
  'Search the web for React documentation',
  'Run Docker container status check',
  'Execute git status command',
  'Query the database for user records',
  'Store this information in memory',
  'Generate Python code for sorting',
  'What tools are available?',
  'Analyze the filesystem structure',
];

export default function () {
  // Random prompt selection
  const prompt = TEST_PROMPTS[Math.floor(Math.random() * TEST_PROMPTS.length)];

  testLLMCategorization(prompt);

  sleep(1);
}

function testLLMCategorization(prompt) {
  const url = `${BASE_URL}/mcp`;

  const payload = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'hub__analyze_prompt',
      arguments: {
        prompt: prompt,
        context: 'Load testing scenario',
      },
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { type: 'llm_categorization' },
  };

  const start = Date.now();
  const response = http.post(url, payload, params);
  const duration = Date.now() - start;

  llmResponseTime.add(duration);

  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'has jsonrpc response': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.jsonrpc === '2.0';
      } catch (e) {
        return false;
      }
    },
    'has categorization result': (r) => {
      try {
        const body = JSON.parse(r.body);
        return (
          body.result &&
          body.result.content &&
          Array.isArray(body.result.content) &&
          body.result.content.length > 0
        );
      } catch (e) {
        return false;
      }
    },
    'response time acceptable': () => duration < 5000, // 5 second max
  });

  if (!success) {
    errorRate.add(1);
  }

  // Check if categorization seems reasonable
  try {
    const body = JSON.parse(response.body);
    if (body.result && body.result.content) {
      const content = body.result.content[0];
      if (content && content.text) {
        const hasCategories = content.text.includes('categories');
        categorizationAccuracy.add(hasCategories ? 1 : 0);
      }
    }
  } catch (e) {
    categorizationAccuracy.add(0);
  }

  return response;
}

export function setup() {
  console.log('Starting SPIKE TEST for LLM-based tool filtering');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('NOTE: This test requires GEMINI_API_KEY to be configured');

  const healthCheck = http.get(`${BASE_URL}/api/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`Server not accessible at ${BASE_URL}`);
  }

  return { baseUrl: BASE_URL, startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000 / 60;
  console.log(`Spike test completed in ${duration.toFixed(2)} minutes`);
}
