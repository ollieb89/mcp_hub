#!/usr/bin/env bun

/**
 * Performance Benchmark: Legacy Logger vs Pino Logger
 *
 * Measures logging throughput and performance improvement of Pino logger
 *
 * Usage:
 *   bun scripts/benchmark-logger.js
 */

import { performance } from 'perf_hooks';
import { PinoLogger } from '../src/utils/pino-logger.js';
import fs from 'fs';
import path from 'path';

// Legacy Logger Class (copied from logger.js for benchmark)
class LegacyLogger {
  constructor(options = {}) {
    this.logFile = options.logFile || '/tmp/legacy-benchmark.log';
    this.logLevel = 'debug';
    this.enableFileLogging = options.enableFileLogging !== false;
    this.sseManager = null;

    this.LOG_LEVELS = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };

    if (this.enableFileLogging) {
      const logDir = path.dirname(this.logFile);
      fs.mkdirSync(logDir, { recursive: true });
      fs.writeFileSync(this.logFile, '');
    }
  }

  log(type, message, data = {}) {
    const entry = {
      type,
      message,
      data,
      timestamp: new Date().toISOString(),
    };

    // console.log(JSON.stringify(entry));

    if (this.enableFileLogging) {
      fs.appendFileSync(this.logFile, JSON.stringify(entry) + '\n');
    }
  }

  info(message, data = {}) {
    this.log('info', message, data);
  }

  warn(message, data = {}) {
    this.log('warn', message, data);
  }

  debug(message, data = {}) {
    this.log('debug', message, data);
  }

  error(code, message, data = {}) {
    this.log('error', message, { code, ...data });
  }
}

/**
 * Benchmark a logger with specified iterations
 */
async function benchmarkLogger(logger, iterations, name) {
  console.log(`\n🔄 Benchmarking ${name}...`);

  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    logger.info(`Test log ${i}`, { iteration: i, data: 'test' });
  }

  // Wait for async logging to finish (Pino)
  await new Promise(resolve => setTimeout(resolve, 100));

  const end = performance.now();
  const duration = end - start;
  const logsPerSecond = Math.round(iterations / (duration / 1000));

  return {
    duration,
    logsPerSecond,
    iterations
  };
}

/**
 * Run comprehensive benchmark suite
 */
async function runBenchmarks() {
  console.log('━'.repeat(60));
  console.log('📊 MCP Hub Logger Performance Benchmark');
  console.log('━'.repeat(60));

  const iterations = 10000;
  console.log(`\nTest Configuration:`);
  console.log(`  • Iterations: ${iterations.toLocaleString()}`);
  console.log(`  • File logging: enabled`);
  console.log(`  • Console output: suppressed`);

  // Benchmark Legacy Logger
  const legacyLogger = new LegacyLogger({
    logFile: '/tmp/legacy-benchmark.log',
    enableFileLogging: true
  });

  const legacyResults = await benchmarkLogger(legacyLogger, iterations, 'Legacy Logger (Synchronous)');

  // Suppress Pino console output by creating without console stream
  const pinoLogger = new PinoLogger({
    logFile: '/tmp/pino-benchmark.log',
    enableFileLogging: true
  });

  // Suppress console by reassigning write method
  const originalWrite = process.stdout.write;
  process.stdout.write = () => true;

  const pinoResults = await benchmarkLogger(pinoLogger, iterations, 'Pino Logger (Async)');

  // Restore console
  process.stdout.write = originalWrite;

  // Calculate improvement
  const performanceRatio = legacyResults.duration / pinoResults.duration;
  const throughputRatio = pinoResults.logsPerSecond / legacyResults.logsPerSecond;

  // Display results
  console.log('\n' + '━'.repeat(60));
  console.log('📈 RESULTS');
  console.log('━'.repeat(60));

  console.log('\n  Legacy Logger (Synchronous):');
  console.log(`    • Duration:     ${legacyResults.duration.toFixed(2)}ms`);
  console.log(`    • Throughput:   ${legacyResults.logsPerSecond.toLocaleString()} logs/sec`);

  console.log('\n  Pino Logger (Async):');
  console.log(`    • Duration:     ${pinoResults.duration.toFixed(2)}ms`);
  console.log(`    • Throughput:   ${pinoResults.logsPerSecond.toLocaleString()} logs/sec`);

  console.log('\n  Performance Improvement:');
  console.log(`    • Speed:        ${performanceRatio.toFixed(2)}x faster ⚡`);
  console.log(`    • Throughput:   ${throughputRatio.toFixed(2)}x higher 📊`);

  if (performanceRatio >= 5) {
    console.log('\n  ✅ SUCCESS: Achieved 5-10x performance target!');
  } else {
    console.log(`\n  ⚠️  WARNING: Performance improvement (${performanceRatio.toFixed(2)}x) below 5x target`);
  }

  console.log('\n' + '━'.repeat(60));

  // Cleanup
  try {
    fs.unlinkSync('/tmp/legacy-benchmark.log');
    fs.unlinkSync('/tmp/pino-benchmark.log');
  } catch (error) {
    // Ignore cleanup errors
  }

  return {
    legacy: legacyResults,
    pino: pinoResults,
    improvement: {
      speed: performanceRatio,
      throughput: throughputRatio
    }
  };
}

// Run benchmarks
runBenchmarks()
  .then(results => {
    if (results.improvement.speed >= 5) {
      process.exit(0); // Success
    } else {
      process.exit(1); // Performance target not met
    }
  })
  .catch(error => {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  });
