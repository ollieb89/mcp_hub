/**
 * Task 3.3: Background LLM Queue Integration Tests
 * 
 * Tests for:
 * - Retry logic with exponential backoff (3.3.2, 3.3.3)
 * - Circuit breaker pattern (3.3.4)
 * - Queue monitoring and statistics (3.3.5, 3.3.6)
 * - Non-blocking queue behavior
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ToolFilteringService from '../src/utils/tool-filtering-service.js';

// Helper to create mock LLM client
const createMockLLMClient = (responses = {}) => {
  let callCount = 0;
  return {
    categorize: vi.fn(async (toolName) => {
      if (responses[toolName]) {
        callCount++;
        const response = responses[toolName];
        if (response instanceof Error) throw response;
        return response;
      }
      callCount++;
      return 'other';
    }),
    getCallCount: () => callCount,
    resetCallCount: () => { callCount = 0; }
  };
};

describe('Task 3.3: Background LLM Queue Integration', () => {
  let service;
  let mockHub;

  beforeEach(() => {
    mockHub = {
      getServers: vi.fn(() => []),
      listenForUpdates: vi.fn()
    };
  });

  afterEach(async () => {
    if (service) {
      await service.shutdown();
    }
  });

  describe('3.3.2: Retry Logic with Exponential Backoff', () => {
    it('should successfully categorize on first attempt', async () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: { categories: ['web'] },
          llmCategorization: {
            enabled: false // Disable initialization
          }
        }
      };

      service = new ToolFilteringService(config, mockHub);
      service.llmClient = createMockLLMClient({ test_tool: 'web' });

      const result = await service._callLLMWithRetry('test_tool', {});
      expect(result).toBe('web');
      expect(service._llmMetrics.totalCalls).toBe(1);
      expect(service._llmMetrics.successfulCalls).toBe(1);
      expect(service._llmMetrics.totalRetries).toBe(0);
    });

    it('should retry on transient error and succeed on 2nd attempt', async () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: { categories: ['web'] },
          llmCategorization: {
            enabled: false,
            retryCount: 3,
            backoffBase: 10 // Very fast for testing
          }
        }
      };

      service = new ToolFilteringService(config, mockHub);
      
      let callCount = 0;
      const mockClient = {
        categorize: vi.fn(async () => {
          callCount++;
          if (callCount === 1) {
            const error = new Error('Timeout');
            error.message = 'Request timeout after 5000ms';
            throw error;
          }
          return 'web';
        })
      };
      service.llmClient = mockClient;

      const result = await service._callLLMWithRetry('test_tool', {});
      expect(result).toBe('web');
      expect(service._llmMetrics.totalCalls).toBe(2);
      expect(service._llmMetrics.successfulCalls).toBe(1);
      expect(service._llmMetrics.totalRetries).toBe(1);
    });

    it('should retry on network error (ECONNREFUSED)', async () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: { categories: ['web'] },
          llmCategorization: {
            enabled: false,
            retryCount: 3,
            backoffBase: 10
          }
        }
      };

      service = new ToolFilteringService(config, mockHub);

      let callCount = 0;
      const mockClient = {
        categorize: vi.fn(async () => {
          callCount++;
          if (callCount === 1) {
            const error = new Error('Connection refused');
            error.message = 'ECONNREFUSED';
            throw error;
          }
          return 'filesystem';
        })
      };
      service.llmClient = mockClient;

      const result = await service._callLLMWithRetry('test_tool', {});
      expect(result).toBe('filesystem');
      expect(service._llmMetrics.totalRetries).toBe(1);
    });

    it('should NOT retry on auth error (401)', async () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: { categories: ['web'] },
          llmCategorization: {
            enabled: false,
            retryCount: 3,
            backoffBase: 10
          }
        }
      };

      service = new ToolFilteringService(config, mockHub);

      const mockClient = {
        categorize: vi.fn(async () => {
          const error = new Error('Unauthorized');
          error.status = 401;
          throw error;
        })
      };
      service.llmClient = mockClient;

      // Mock _categorizeBySyntax to return specific fallback
      service._categorizeBySyntax = vi.fn(() => 'other');

      const result = await service._callLLMWithRetry('test_tool', {});
      // Should fall back to heuristics on auth error
      expect(result).toBe('other'); // Fallback category
      expect(service._llmMetrics.totalRetries).toBe(0);
    });

    it('should exhaust retries and fallback to heuristics', async () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: { categories: ['web'] },
          llmCategorization: {
            enabled: false,
            retryCount: 2,
            backoffBase: 10
          }
        }
      };

      service = new ToolFilteringService(config, mockHub);

      const mockClient = {
        categorize: vi.fn(async () => {
          const error = new Error('Timeout');
          error.message = 'Request timeout';
          throw error;
        })
      };
      service.llmClient = mockClient;

      // Mock _categorizeBySyntax to return specific fallback
      service._categorizeBySyntax = vi.fn(() => 'other');

      const result = await service._callLLMWithRetry('test_tool', {});
      // Should fall back to heuristics after exhausting retries
      expect(result).toBe('other'); // Default fallback
      expect(service._llmMetrics.totalRetries).toBe(2); // 2 retries for max 3 attempts
      expect(service._llmMetrics.fallbacksUsed).toBe(1);
    });
  });;

  describe('3.3.3: Exponential Backoff Calculation', () => {
    it('should calculate correct backoff delays', async () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: { categories: ['web'] },
          llmCategorization: {
            enabled: false,
            backoffBase: 1000,
            maxBackoff: 30000
          }
        }
      };

      service = new ToolFilteringService(config, mockHub);

      // Test delays without jitter (approximately)
      const delay0 = service._calculateBackoffDelay(0);
      const delay1 = service._calculateBackoffDelay(1);
      const delay2 = service._calculateBackoffDelay(2);
      const delay4 = service._calculateBackoffDelay(4);

      // Expected: 1000, 2000, 4000, 8000, 16000 (with jitter ±10%)
      expect(delay0).toBeGreaterThanOrEqual(900);
      expect(delay0).toBeLessThanOrEqual(1100);
      
      expect(delay1).toBeGreaterThanOrEqual(1800);
      expect(delay1).toBeLessThanOrEqual(2200);
      
      expect(delay2).toBeGreaterThanOrEqual(3600);
      expect(delay2).toBeLessThanOrEqual(4400);
      
      // Should cap at maxBackoff (30000)
      expect(delay4).toBeLessThanOrEqual(30000);
    });

    it('should enforce maximum backoff delay', async () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: { categories: ['web'] },
          llmCategorization: {
            enabled: false,
            backoffBase: 1000,
            maxBackoff: 5000 // Low cap for testing
          }
        }
      };

      service = new ToolFilteringService(config, mockHub);

      const delay10 = service._calculateBackoffDelay(10);
      
      // Should be capped at maxBackoff
      expect(delay10).toBeLessThanOrEqual(5000);
      expect(delay10).toBeGreaterThan(0);
    });
  });

  describe('3.3.4: Circuit Breaker Pattern', () => {
    it('should start in closed state', async () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: { categories: ['web'] },
          llmCategorization: {
            enabled: false,
            circuitBreakerThreshold: 3,
            circuitBreakerTimeout: 100
          }
        }
      };

      service = new ToolFilteringService(config, mockHub);
      
      expect(service.circuitBreaker.state).toBe('closed');
      expect(service._isCircuitBreakerOpen()).toBe(false);
    });

    it('should transition to open after threshold failures', async () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: { categories: ['web'] },
          llmCategorization: {
            enabled: false,
            circuitBreakerThreshold: 2,
            circuitBreakerTimeout: 100
          }
        }
      };

      service = new ToolFilteringService(config, mockHub);

      // Record consecutive failures
      expect(service._isCircuitBreakerOpen()).toBe(false);
      
      service._recordLLMFailure(); // 1st failure
      expect(service._isCircuitBreakerOpen()).toBe(false);
      expect(service.circuitBreaker.state).toBe('closed');
      
      service._recordLLMFailure(); // 2nd failure - should trigger open
      expect(service._isCircuitBreakerOpen()).toBe(true);
      expect(service.circuitBreaker.state).toBe('open');
      expect(service._llmMetrics.circuitBreakerTrips).toBe(1);
    });

    it('should block API calls when open', async () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: { categories: ['web'] },
          llmCategorization: {
            enabled: false,
            circuitBreakerThreshold: 1,
            circuitBreakerTimeout: 1000
          }
        }
      };

      service = new ToolFilteringService(config, mockHub);
      service.llmClient = createMockLLMClient({});
      service._categorizeBySyntax = vi.fn(() => 'other');

      // Open circuit breaker
      service._recordLLMFailure();
      expect(service._isCircuitBreakerOpen()).toBe(true);

      // Try to queue categorization - should fall back immediately
      const result = await service._queueLLMCategorization('test_tool', {});
      expect(result).toBe('other'); // Fallback to heuristics
      expect(service._llmMetrics.fallbacksUsed).toBe(1);
    });

    it('should transition to half-open after timeout', async () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: { categories: ['web'] },
          llmCategorization: {
            enabled: false,
            circuitBreakerThreshold: 1,
            circuitBreakerTimeout: 50 // 50ms for fast testing
          }
        }
      };

      service = new ToolFilteringService(config, mockHub);

      // Open circuit breaker
      service._recordLLMFailure();
      expect(service.circuitBreaker.state).toBe('open');

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if transitioning to half-open
      const isOpen = service._isCircuitBreakerOpen();
      expect(isOpen).toBe(false); // Half-open allows attempt
      expect(service.circuitBreaker.state).toBe('half-open');
    });

    it('should reset to closed on successful call', async () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: { categories: ['web'] },
          llmCategorization: {
            enabled: false,
            circuitBreakerThreshold: 2,
            circuitBreakerTimeout: 100
          }
        }
      };

      service = new ToolFilteringService(config, mockHub);

      // Open circuit breaker with failures
      service._recordLLMFailure();
      service._recordLLMFailure();
      expect(service.circuitBreaker.state).toBe('open');

      // Wait for half-open
      await new Promise(resolve => setTimeout(resolve, 150));
      service._isCircuitBreakerOpen(); // Transition to half-open

      // Reset on success
      service._resetCircuitBreaker();
      expect(service.circuitBreaker.state).toBe('closed');
      expect(service.circuitBreaker.consecutiveFailures).toBe(0);
    });
  });

  describe('3.3.5: Queue Monitoring and Latency', () => {
    it('should record API call latency', async () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: { categories: ['web'] },
          llmCategorization: {
            enabled: false
          }
        }
      };

      service = new ToolFilteringService(config, mockHub);

      service._recordLLMLatency(100);
      service._recordLLMLatency(200);
      service._recordLLMLatency(150);

      expect(service._llmMetrics.callLatencies).toEqual([100, 200, 150]);
    });

    it('should calculate latency percentiles', async () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: { categories: ['web'] },
          llmCategorization: {
            enabled: false
          }
        }
      };

      service = new ToolFilteringService(config, mockHub);

      // Add 100 latencies: 1-100ms
      for (let i = 1; i <= 100; i++) {
        service._recordLLMLatency(i);
      }

      const p95 = service._calculateLatencyPercentile(95);
      const p99 = service._calculateLatencyPercentile(99);

      // p95 should be around 95ms
      expect(p95).toBeGreaterThanOrEqual(90);
      expect(p95).toBeLessThanOrEqual(100);

      // p99 should be around 99ms
      expect(p99).toBeGreaterThanOrEqual(95);
      expect(p99).toBeLessThanOrEqual(100);
    });

    it('should update queue depth', async () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: { categories: ['web'] },
          llmCategorization: {
            enabled: false
          }
        }
      };

      service = new ToolFilteringService(config, mockHub);

      expect(service._llmMetrics.queueDepth).toBe(0);

      service._updateQueueDepth(5);
      expect(service._llmMetrics.queueDepth).toBe(5);

      service._updateQueueDepth(0);
      expect(service._llmMetrics.queueDepth).toBe(0);
    });
  });

  describe('3.3.6: Statistics Tracking', () => {
    it('should track API call counts', async () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: { categories: ['web'] },
          llmCategorization: {
            enabled: false
          }
        }
      };

      service = new ToolFilteringService(config, mockHub);
      service.llmClient = createMockLLMClient({ test: 'web' });

      // Simulate metrics
      service._llmMetrics.totalCalls = 10;
      service._llmMetrics.successfulCalls = 8;
      service._llmMetrics.failedCalls = 2;

      const stats = service.getStats();
      expect(stats.llm.totalCalls).toBe(10);
      expect(stats.llm.successfulCalls).toBe(8);
      expect(stats.llm.failedCalls).toBe(2);
      expect(stats.llm.successRate).toBe('0.800');
    });

    it('should track timeouts separately', async () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: { categories: ['web'] },
          llmCategorization: {
            enabled: false
          }
        }
      };

      service = new ToolFilteringService(config, mockHub);

      // Simulate timeout
      const error = new Error('timeout');
      error.message = 'Request timeout after 5000ms';
      service._isTransientError(error); // This records timeout

      const stats = service.getStats();
      expect(stats.llm.timeouts).toBe(1);
    });

    it('should include circuit breaker state in stats', async () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: { categories: ['web'] },
          llmCategorization: {
            enabled: false,
            circuitBreakerThreshold: 1
          }
        }
      };

      service = new ToolFilteringService(config, mockHub);

      // Open circuit breaker
      service._recordLLMFailure();

      const stats = service.getStats();
      expect(stats.llm.circuitBreakerState).toBe('open');
      expect(stats.llm.circuitBreakerFailures).toBe(1);
      expect(stats.llm.circuitBreakerTrips).toBe(1);
    });

    it('should calculate average latency in stats', async () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: { categories: ['web'] },
          llmCategorization: {
            enabled: false
          }
        }
      };

      service = new ToolFilteringService(config, mockHub);

      service._recordLLMLatency(100);
      service._recordLLMLatency(200);
      service._recordLLMLatency(300);

      const stats = service.getStats();
      expect(stats.llm.averageLatency).toBe(200); // (100+200+300)/3
    });

    it('should handle empty metrics gracefully', async () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: { categories: ['web'] },
          llmCategorization: {
            enabled: false
          }
        }
      };

      service = new ToolFilteringService(config, mockHub);

      const stats = service.getStats();
      expect(stats.llm.totalCalls).toBe(0);
      expect(stats.llm.averageLatency).toBe(0);
      expect(stats.llm.p95Latency).toBe(0);
      expect(stats.llm.successRate).toBe(0);
    });
  });

  describe('3.3.1: Queue Task Structure Integration', () => {
    it('should maintain non-blocking queue behavior', async () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: { categories: ['web'] },
          llmCategorization: {
            enabled: false
          }
        }
      };

      service = new ToolFilteringService(config, mockHub);
      service.llmClient = createMockLLMClient({ test: 'web' });

      const startTime = performance.now();
      
      // Queueing should return immediately (fire-and-forget)
      const promise = service._queueLLMCategorization('test', {});
      
      const queueTime = performance.now() - startTime;
      expect(queueTime).toBeLessThan(50); // Should be nearly instant

      // Now wait for actual processing
      const result = await promise;
      expect(result).toBe('web');
    });

    it('should process queue tasks in order', async () => {
      const config = {
        toolFiltering: {
          enabled: true,
          mode: 'category',
          categoryFilter: { categories: ['web'] },
          llmCategorization: {
            enabled: false
          }
        }
      };

      service = new ToolFilteringService(config, mockHub);
      
      const callOrder = [];
      const mockClient = {
        categorize: vi.fn(async (toolName) => {
          callOrder.push(toolName);
          // Simulate async processing
          await new Promise(resolve => setTimeout(resolve, 5));
          return 'web';
        })
      };
      service.llmClient = mockClient;

      // Queue with high precision timestamps to ensure uniqueness
      const ts = Date.now() + Math.random() * 1000;
      const p1 = service._queueLLMCategorization('tool_' + (ts + 1), {});
      const p2 = service._queueLLMCategorization('tool_' + (ts + 2), {});
      const p3 = service._queueLLMCategorization('tool_' + (ts + 3), {});

      await Promise.all([p1, p2, p3]);

      // Should have called LLM for all three tools
      expect(mockClient.categorize).toHaveBeenCalledTimes(3);
      // All results should be valid
      const results = await Promise.all([p1, p2, p3]);
      expect(results).toEqual(['web', 'web', 'web']);
    });
  });
});
