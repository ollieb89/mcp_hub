#!/bin/bash

# MCP Hub Performance Baseline Measurement Script
# Measures and reports performance baselines

echo "📊 MCP Hub Performance Baseline Measurement"
echo "========================================"
echo "Collecting 60 seconds of metrics..."
echo ""

# Initial metrics
STATS_BEFORE=$(curl -s http://localhost:7000/api/filtering/stats 2>/dev/null)

if [ -z "$STATS_BEFORE" ]; then
  echo "❌ Unable to connect to MCP Hub"
  exit 1
fi

# Capture baseline
echo "Baseline captured at: $(date '+%Y-%m-%d %H:%M:%S')"
REQUESTS_BEFORE=$(echo "$STATS_BEFORE" | jq -r '.llm.totalRequests // 0')

# Wait 60 seconds
sleep 60

# Final metrics
STATS_AFTER=$(curl -s http://localhost:7000/api/filtering/stats 2>/dev/null)

if [ -z "$STATS_AFTER" ]; then
  echo "❌ Unable to connect to MCP Hub"
  exit 1
fi

echo "Final captured at: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Calculate deltas
REQUESTS_AFTER=$(echo "$STATS_AFTER" | jq -r '.llm.totalRequests // 0')
REQUESTS_PER_MIN=$(( (REQUESTS_AFTER - REQUESTS_BEFORE) ))

# Extract final metrics
SUCCESS_RATE=$(echo "$STATS_AFTER" | jq -r '.llm.successRate // "N/A"')
AVG_LATENCY=$(echo "$STATS_AFTER" | jq -r '.llm.averageLatency // "N/A"')
P50_LATENCY=$(echo "$STATS_AFTER" | jq -r '.llm.p50Latency // "N/A"')
P95_LATENCY=$(echo "$STATS_AFTER" | jq -r '.llm.p95Latency // "N/A"')
P99_LATENCY=$(echo "$STATS_AFTER" | jq -r '.llm.p99Latency // "N/A"')
CACHE_HIT_RATE=$(echo "$STATS_AFTER" | jq -r '.llmCache.hitRate // "N/A"')
CACHE_SIZE=$(echo "$STATS_AFTER" | jq -r '.llmCache.size // 0')
QUEUE_DEPTH=$(echo "$STATS_AFTER" | jq -r '.queue.depth // 0')

# Display results
echo "========================================"
echo "Performance Baseline Results"
echo "========================================"
echo ""
echo "📈 Throughput"
echo "----------------------------------------"
echo "Requests/min:     $REQUESTS_PER_MIN"
echo ""
echo "🤖 LLM Performance"
echo "----------------------------------------"
echo "Success Rate:     $SUCCESS_RATE"
echo "Avg Latency:      ${AVG_LATENCY}ms"
echo "P50 Latency:      ${P50_LATENCY}ms"
echo "P95 Latency:      ${P95_LATENCY}ms"
echo "P99 Latency:      ${P99_LATENCY}ms"
echo ""
echo "💾 Cache Performance"
echo "----------------------------------------"
echo "Hit Rate:         $CACHE_HIT_RATE"
echo "Cache Size:       $CACHE_SIZE entries"
echo ""
echo "📬 Queue Status"
echo "----------------------------------------"
echo "Current Depth:    $QUEUE_DEPTH"
echo ""
echo "========================================"
echo "Target Baselines (Production)"
echo "========================================"
echo "Success Rate:     >95%"
echo "P95 Latency:      <2000ms"
echo "P99 Latency:      <5000ms"
echo "Cache Hit Rate:   >80%"
echo "Queue Depth:      <10"
echo "========================================"
echo ""

# Health assessment
HEALTHY=true

if [ "$SUCCESS_RATE" != "N/A" ]; then
  SUCCESS_NUM=$(echo "$SUCCESS_RATE" | sed 's/%//')
  if (( $(echo "$SUCCESS_NUM < 95" | bc -l) )); then
    echo "⚠️  Success rate below target"
    HEALTHY=false
  fi
fi

if [ "$P95_LATENCY" != "N/A" ] && [ "$P95_LATENCY" != "null" ]; then
  if (( $(echo "$P95_LATENCY > 2000" | bc -l) )); then
    echo "⚠️  P95 latency above target"
    HEALTHY=false
  fi
fi

if [ "$CACHE_HIT_RATE" != "N/A" ]; then
  HIT_NUM=$(echo "$CACHE_HIT_RATE" | sed 's/%//')
  if (( $(echo "$HIT_NUM < 80" | bc -l) )); then
    echo "⚠️  Cache hit rate below target"
    HEALTHY=false
  fi
fi

if $HEALTHY; then
  echo "✅ All baselines meet production targets"
else
  echo "⚠️  Some baselines below production targets"
  echo "   Consider optimization or configuration tuning"
fi

echo ""
echo "Save this baseline for comparison:"
echo "  Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo "  Command: bash scripts/measure-performance.sh > baselines/$(date +%Y%m%d-%H%M%S).txt"
