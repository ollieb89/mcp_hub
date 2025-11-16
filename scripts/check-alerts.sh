#!/bin/bash

# MCP Hub Alert Checking Script
# Checks current metrics against alert thresholds

echo "⚠️  MCP Hub Alert Check"
echo "========================================"
echo ""

# Fetch stats
STATS=$(curl -s http://localhost:7000/api/filtering/stats 2>/dev/null)

if [ -z "$STATS" ]; then
  echo "❌ CRITICAL: Unable to connect to MCP Hub"
  exit 2
fi

ALERTS=0
WARNINGS=0

# Alert Thresholds
SUCCESS_RATE_THRESHOLD=95
P95_LATENCY_THRESHOLD=2000
CACHE_HIT_RATE_THRESHOLD=80
QUEUE_DEPTH_THRESHOLD=10

# Extract metrics
SUCCESS_RATE=$(echo "$STATS" | jq -r '.llm.successRate // "0"' | sed 's/%//')
P95_LATENCY=$(echo "$STATS" | jq -r '.llm.p95Latency // "0"')
CACHE_HIT_RATE=$(echo "$STATS" | jq -r '.llmCache.hitRate // "0"' | sed 's/%//')
QUEUE_DEPTH=$(echo "$STATS" | jq -r '.queue.depth // 0')
CB_STATE=$(echo "$STATS" | jq -r '.circuitBreaker.state // "unknown"')
CB_FAILURES=$(echo "$STATS" | jq -r '.circuitBreaker.consecutiveFailures // 0')

echo "Current Metrics:"
echo "----------------------------------------"
echo "Success Rate:     $SUCCESS_RATE%"
echo "P95 Latency:      ${P95_LATENCY}ms"
echo "Cache Hit Rate:   $CACHE_HIT_RATE%"
echo "Queue Depth:      $QUEUE_DEPTH"
echo "Circuit Breaker:  $CB_STATE"
echo ""
echo "Alert Check:"
echo "----------------------------------------"

# Check 1: Success Rate
if (( $(echo "$SUCCESS_RATE < $SUCCESS_RATE_THRESHOLD" | bc -l) )); then
  echo "❌ ALERT: Low success rate ($SUCCESS_RATE% < $SUCCESS_RATE_THRESHOLD%)"
  ((ALERTS++))
else
  echo "✅ Success rate: $SUCCESS_RATE% (target: >$SUCCESS_RATE_THRESHOLD%)"
fi

# Check 2: P95 Latency
if [ "$P95_LATENCY" != "null" ] && (( $(echo "$P95_LATENCY > $P95_LATENCY_THRESHOLD" | bc -l) )); then
  echo "❌ ALERT: High P95 latency (${P95_LATENCY}ms > ${P95_LATENCY_THRESHOLD}ms)"
  ((ALERTS++))
else
  echo "✅ P95 latency: ${P95_LATENCY}ms (target: <${P95_LATENCY_THRESHOLD}ms)"
fi

# Check 3: Cache Hit Rate
if (( $(echo "$CACHE_HIT_RATE < $CACHE_HIT_RATE_THRESHOLD" | bc -l) )); then
  echo "⚠️  WARNING: Low cache hit rate ($CACHE_HIT_RATE% < $CACHE_HIT_RATE_THRESHOLD%)"
  ((WARNINGS++))
else
  echo "✅ Cache hit rate: $CACHE_HIT_RATE% (target: >$CACHE_HIT_RATE_THRESHOLD%)"
fi

# Check 4: Queue Depth
if (( QUEUE_DEPTH > QUEUE_DEPTH_THRESHOLD )); then
  echo "⚠️  WARNING: High queue depth ($QUEUE_DEPTH > $QUEUE_DEPTH_THRESHOLD)"
  ((WARNINGS++))
else
  echo "✅ Queue depth: $QUEUE_DEPTH (target: <$QUEUE_DEPTH_THRESHOLD)"
fi

# Check 5: Circuit Breaker
if [ "$CB_STATE" = "open" ]; then
  echo "🚨 CRITICAL: Circuit breaker is OPEN"
  ((ALERTS++))
elif [ "$CB_STATE" = "half-open" ]; then
  echo "⚠️  WARNING: Circuit breaker is HALF-OPEN"
  ((WARNINGS++))
else
  echo "✅ Circuit breaker: $CB_STATE"
fi

# Check 6: Circuit Breaker Failures
if (( CB_FAILURES >= 3 )); then
  echo "⚠️  WARNING: Circuit breaker failures: $CB_FAILURES"
  ((WARNINGS++))
fi

# Summary
echo ""
echo "========================================"
echo "Summary"
echo "========================================"
echo "Critical Alerts:  $ALERTS"
echo "Warnings:         $WARNINGS"
echo "========================================"

if [ $ALERTS -gt 0 ]; then
  echo "❌ CRITICAL: Action required"
  exit 2
elif [ $WARNINGS -gt 0 ]; then
  echo "⚠️  WARNING: Review recommended"
  exit 1
else
  echo "✅ All checks passed"
  exit 0
fi
