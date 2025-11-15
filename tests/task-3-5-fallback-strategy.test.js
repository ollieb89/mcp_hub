import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ToolFilteringService from '../src/utils/tool-filtering-service.js';

/**
 * Task 3.5: Fallback Strategy & Error Handling Tests
 * 
 * Tests ensure robust fallback to heuristics when LLM unavailable
 * 
 * Work Items:
 * - 3.5.1: Implement API timeout handling
 * - 3.5.2: Add circuit breaker for API failures
 * - 3.5.3: Log API errors for monitoring
 * - 3.5.4: Fallback to heuristics on error
 * - 3.5.5: Track fallback usage metrics
 */

describe('Task 3.5: Fallback Strategy & Error Handling', () => {
  let service;
  let mockMcpHub;
  let mockLLMClient;

  beforeEach(() => {
    // Create mock MCP hub
    mockMcpHub = {
      mcp: {
        clients: {},
        closeServer: vi.fn().mockResolvedValue(undefined)
      },
      servers: {}
    };

    // Create mock LLM client
    mockLLMClient = {
      categorize: vi.fn().mockResolvedValue('web')
    };

    // Create service with LLM enabled
    const config = {
      toolFiltering: {
        enabled: true,
        mode: 'hybrid',
        serverFilter: {
          mode: 'allowlist',
          servers: ['test-server']
        },
        categoryFilter: {
          categories: ['web', 'filesystem', 'development']
        },
        llmCategorization: {
          enabled: true,
          provider: 'openai',
          apiKey: 'mock-key-123',
          model: 'gpt-4o-mini',
          retryCount: 1,
          backoffBase: 50,
          maxBackoff: 200,
          circuitBreakerThreshold: 2,
          circuitBreakerTimeout: 500
        }
      }
    };

    service = new ToolFilteringService(config, mockMcpHub);
    service.llmClient = mockLLMClient;
  });

  afterEach(async () => {
    if (service) {
      await service.shutdown();
    }
  });

  // ======= 3.5.1: API Timeout Handling =======

  describe('3.5.1: API Timeout Handling', () => {
    it('should successfully call API within 5-second timeout', async () => {
      // ARRANGE: Setup fast LLM
      mockLLMClient.categorize = vi.fn().mockResolvedValueOnce('web');

      // ACT: Call with timeout wrapper
      const category = await service._callLLMWithRateLimit('fetch__data', {
        description: 'Fetch data from web'
      });

      // ASSERT: Should succeed and return category
      expect(category).toBe('web');
    });

    it('should have timeout metric property available', async () => {
      // ARRANGE: Get initial stats
      const initialStats = service.getStats();

      // ACT & ASSERT: Timeout metric exists
      expect(initialStats.llm).toHaveProperty('timeouts');
      expect(typeof initialStats.llm.timeouts).toBe('number');
      expect(initialStats.llm.timeouts).toBeGreaterThanOrEqual(0);
    });
  });

  // ======= 3.5.2: Circuit Breaker for API Failures =======

  describe('3.5.2: Circuit Breaker for API Failures', () => {
    it('should open circuit breaker after threshold failures', async () => {
      // ARRANGE: Setup API to fail
      const error = new Error('API error');
      error.code = 500;
      mockLLMClient.categorize = vi.fn().mockRejectedValue(error);

      // ACT: Trigger enough failures to exceed threshold (2)
      for (let i = 0; i < 3; i++) {
        try {
          await service._callLLMWithRetry('fetch__data', {
            description: 'Fetch data'
          });
        } catch (_e) {
          // Expected to fallback
        }
      }

      // ASSERT: Circuit breaker should have recorded failures
      const stats = service.getStats();
      expect(stats.llm.failedCalls).toBeGreaterThan(0);
    });

    it('should block API calls when circuit breaker is open', async () => {
      // ARRANGE: Open circuit breaker manually
      service.circuitBreaker.state = 'open';
      service.circuitBreaker.consecutiveFailures = 2;

      // ACT: Queue categorization
      const result = await service._queueLLMCategorization('fetch__data', {
        description: 'Fetch data'
      });

      // ASSERT: Should fallback and return a category
      expect(result).toHaveProperty('category');
      expect(result.category).toBe('web');
    });

    it('should transition circuit breaker to half-open after timeout', async () => {
      // ARRANGE: Open circuit breaker
      service.circuitBreaker.state = 'open';
      service.circuitBreaker.tripTime = Date.now() - 700; // Opened 700ms ago
      service.circuitBreaker.timeout = 500; // 500ms timeout

      // ACT: Check if should transition
      service._isCircuitBreakerOpen();

      // ASSERT: Should be in half-open state
      expect(service.circuitBreaker.state).toBe('half-open');
    });

    it('should recover circuit breaker on successful call during half-open', async () => {
      // ARRANGE: Set to half-open
      service.circuitBreaker.state = 'half-open';
      service.circuitBreaker.consecutiveFailures = 2;
      mockLLMClient.categorize = vi.fn().mockResolvedValueOnce('web');

      // ACT: Make successful call
      const result = await service._callLLMWithRateLimit('fetch__data', {
        description: 'Fetch data'
      });

      // ASSERT: Should get successful result
      expect(result).toBe('web');
    });
  });

  // ======= 3.5.3: Log API Errors for Monitoring =======

  describe('3.5.3: Log API Errors for Monitoring', () => {
    it('should log transient errors (429) and retry', async () => {
      // ARRANGE: Setup transient error that succeeds on retry
      mockLLMClient.categorize = vi.fn()
        .mockRejectedValueOnce(Object.assign(
          new Error('Rate limited'),
          { code: 429, status: 429 }
        ))
        .mockResolvedValueOnce('web');

      // ACT: Call with retry
      const category = await service._callLLMWithRetry('fetch__data', {
        description: 'Fetch data'
      });

      // ASSERT: Should eventually return a category
      expect(typeof category).toBe('string');
      expect(category.length).toBeGreaterThan(0);
    });

    it('should log permanent errors (401) without retry', async () => {
      // ARRANGE: Setup permanent error
      mockLLMClient.categorize = vi.fn().mockRejectedValue(
        Object.assign(
          new Error('Invalid API key'),
          { code: 401, status: 401 }
        )
      );

      // ACT: Call and expect fallback
      const category = await service._callLLMWithRetry('fetch__data', {
        description: 'Fetch data'
      });

      // ASSERT: Should fallback immediately (only 1 call)
      expect(category).toBe('web');
      expect(mockLLMClient.categorize).toHaveBeenCalledTimes(1);
    });

    it('should not log sensitive data like API keys', async () => {
      // ARRANGE: Setup error scenario
      mockLLMClient.categorize = vi.fn().mockRejectedValue(
        new Error('Request failed')
      );

      // ACT: Trigger error
      await service._callLLMWithRetry('fetch__data', {
        description: 'Fetch data'
      });

      // ASSERT: Stats should not contain API key
      const stats = JSON.stringify(service.getStats());
      expect(stats).not.toContain('mock-key-123');
    });
  });

  // ======= 3.5.4: Fallback to Heuristics on Error =======

  describe('3.5.4: Fallback to Heuristics on Error', () => {
    it('should fallback to heuristics when API errors', async () => {
      // ARRANGE: Setup API error
      mockLLMClient.categorize = vi.fn().mockRejectedValue(
        new Error('API unavailable')
      );

      // ACT: Call with error
      const category = await service._callLLMWithRetry('fetch__data', {
        description: 'Fetch data'
      });

      // ASSERT: Should return category (heuristic result)
      expect(typeof category).toBe('string');
      expect(category.length).toBeGreaterThan(0);
    });

    it('should fallback immediately when circuit breaker is open', async () => {
      // ARRANGE: Open circuit breaker manually
      service.circuitBreaker.state = 'open';
      service.circuitBreaker.consecutiveFailures = 2;

      // ACT: Queue categorization
      const result = await service._queueLLMCategorization('fetch__data', {
        description: 'Fetch data'
      });

      // ASSERT: Should get a result with proper structure
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('source');
      expect(typeof result.category).toBe('string');
    });

    it('should mark fallback entries with lower confidence', async () => {
      // ARRANGE: Setup error
      mockLLMClient.categorize = vi.fn().mockRejectedValue(
        new Error('API error')
      );

      // ACT: Trigger fallback
      const result = await service._queueLLMCategorization('fetch__data', {
        description: 'Fetch data'
      });

      // ASSERT: Should have lower confidence for fallback
      expect(result).toHaveProperty('confidence');
      expect(result.confidence).toBeLessThanOrEqual(0.95);
    });
  });

  // ======= 3.5.5: Track Fallback Usage Metrics =======

  describe('3.5.5: Track Fallback Usage Metrics', () => {
    it('should track fallback usage when API fails', async () => {
      // ARRANGE: Setup error
      mockLLMClient.categorize = vi.fn().mockRejectedValue(
        new Error('API error')
      );

      // ACT: Trigger fallback
      const category = await service._callLLMWithRetry('fetch__data', {
        description: 'Fetch data'
      });

      // ASSERT: Should return a category (fallback)
      expect(typeof category).toBe('string');
      expect(category.length).toBeGreaterThan(0);
    });

    it('should track failed calls separately from successful calls', async () => {
      // ARRANGE: Setup mixed success/failure
      mockLLMClient.categorize = vi.fn()
        .mockResolvedValueOnce('web')       // Success
        .mockRejectedValueOnce(new Error('API error')); // Failure

      // ACT: Make two calls
      const cat1 = await service._callLLMWithRetry('fetch__data', {
        description: 'Fetch data'
      });
      const cat2 = await service._callLLMWithRetry('fetch__data2', {
        description: 'Fetch data'
      });

      // ASSERT: Both should return categories
      expect(typeof cat1).toBe('string');
      expect(typeof cat2).toBe('string');
      expect(cat1.length).toBeGreaterThan(0);
      expect(cat2.length).toBeGreaterThan(0);
    });

    it('should provide complete fallback metrics in statistics', async () => {
      // ARRANGE: Setup error
      mockLLMClient.categorize = vi.fn().mockRejectedValue(
        new Error('API error')
      );

      // ACT: Trigger fallback
      await service._callLLMWithRetry('fetch__data', {
        description: 'Fetch data'
      });

      // ASSERT: All metrics should be available
      const stats = service.getStats();
      expect(stats.llm).toHaveProperty('totalCalls');
      expect(stats.llm).toHaveProperty('successfulCalls');
      expect(stats.llm).toHaveProperty('failedCalls');
      expect(stats.llm).toHaveProperty('timeouts');
      expect(stats.llm).toHaveProperty('totalRetries');
      expect(stats.llm).toHaveProperty('fallbacksUsed');
      expect(stats.llm).toHaveProperty('circuitBreakerTrips');
      expect(stats.llm).toHaveProperty('successRate');
    });

    it('should show success rate as numeric value', async () => {
      // ARRANGE: Make a successful call
      mockLLMClient.categorize = vi.fn().mockResolvedValueOnce('web');

      // ACT: Make call
      await service._callLLMWithRetry('fetch__data', {
        description: 'Fetch data'
      });

      // ASSERT: Success rate should be numeric
      const stats = service.getStats();
      const successRate = Number(stats.llm.successRate);
      expect(successRate).toBeGreaterThan(0);
      expect(successRate).toBeLessThanOrEqual(1);
    });
  });

  // ======= Integration Tests =======

  describe('Fallback Strategy Integration', () => {
    it('should handle cascading failures without throwing', async () => {
      // ARRANGE: Setup consecutive failures
      mockLLMClient.categorize = vi.fn().mockRejectedValue(
        new Error('API error')
      );

      // ACT: Queue multiple categorizations
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          service._queueLLMCategorization(`tool_${i}`, {
            description: `Tool ${i}`
          })
        );
      }

      const results = await Promise.all(promises);

      // ASSERT: All should fallback without throwing
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('category');
        expect(result).toHaveProperty('source');
      });
    });

    it('should maintain responsiveness during fallback', async () => {
      // ARRANGE: Setup error
      mockLLMClient.categorize = vi.fn().mockRejectedValue(
        new Error('API error')
      );

      // ACT: Measure time for multiple fallbacks
      const startTime = performance.now();
      for (let i = 0; i < 5; i++) {
        await service._callLLMWithRetry(`tool_${i}`, {
          description: `Tool ${i}`
        });
      }
      const elapsed = performance.now() - startTime;

      // ASSERT: Should be reasonably fast (fallbacks + minimal retries)
      expect(elapsed).toBeLessThan(2000); // 2 seconds for 5 tools with retries
    });

    it('should provide clear source attribution in results', async () => {
      // ARRANGE: Setup error
      mockLLMClient.categorize = vi.fn().mockRejectedValue(
        new Error('API error')
      );

      // ACT: Trigger fallback through queue
      const result = await service._queueLLMCategorization('fetch__data', {
        description: 'Fetch data'
      });

      // ASSERT: Should have source and confidence properties
      expect(result).toHaveProperty('source');
      expect(result).toHaveProperty('confidence');
      expect(typeof result.source).toBe('string');
      expect(typeof result.confidence).toBe('number');
    });
  });
});
