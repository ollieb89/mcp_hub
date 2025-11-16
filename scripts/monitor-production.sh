#!/bin/bash

# MCP Hub Production Monitoring Script
# Real-time monitoring dashboard with 5-second refresh

echo "📊 MCP Hub Production Monitor"
echo "Press Ctrl+C to exit"
echo ""

while true; do
  # Clear screen
  clear

  # Header
  echo "========================================"
  echo "MCP Hub Production Monitor"
  echo "Updated: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "========================================"
  echo ""

  # Fetch stats
  STATS=$(curl -s http://localhost:7000/api/filtering/stats 2>/dev/null)

  if [ -z "$STATS" ]; then
    echo "❌ Unable to connect to MCP Hub"
    echo "   Check if service is running: ps aux | grep mcp-hub"
    sleep 5
    continue
  fi

  # LLM Performance
  echo "🤖 LLM Performance"
  echo "----------------------------------------"
  SUCCESS_RATE=$(echo "$STATS" | jq -r '.llm.successRate // "N/A"')
  AVG_LATENCY=$(echo "$STATS" | jq -r '.llm.averageLatency // "N/A"')
  P95_LATENCY=$(echo "$STATS" | jq -r '.llm.p95Latency // "N/A"')
  P99_LATENCY=$(echo "$STATS" | jq -r '.llm.p99Latency // "N/A"')
  TOTAL_REQUESTS=$(echo "$STATS" | jq -r '.llm.totalRequests // 0')

  echo "  Success Rate:    $SUCCESS_RATE"
  echo "  Avg Latency:     ${AVG_LATENCY}ms"
  echo "  P95 Latency:     ${P95_LATENCY}ms"
  echo "  P99 Latency:     ${P99_LATENCY}ms"
  echo "  Total Requests:  $TOTAL_REQUESTS"
  echo ""

  # Cache Performance
  echo "💾 Cache Performance"
  echo "----------------------------------------"
  HIT_RATE=$(echo "$STATS" | jq -r '.llmCache.hitRate // "N/A"')
  CACHE_SIZE=$(echo "$STATS" | jq -r '.llmCache.size // 0')
  TOTAL_HITS=$(echo "$STATS" | jq -r '.llmCache.hits // 0')
  TOTAL_MISSES=$(echo "$STATS" | jq -r '.llmCache.misses // 0')

  echo "  Hit Rate:        $HIT_RATE"
  echo "  Cache Size:      $CACHE_SIZE entries"
  echo "  Total Hits:      $TOTAL_HITS"
  echo "  Total Misses:    $TOTAL_MISSES"
  echo ""

  # Queue Status
  echo "📬 Queue Status"
  echo "----------------------------------------"
  QUEUE_DEPTH=$(echo "$STATS" | jq -r '.queue.depth // 0')
  QUEUE_PROCESSED=$(echo "$STATS" | jq -r '.queue.processed // 0')

  echo "  Current Depth:   $QUEUE_DEPTH"
  echo "  Processed:       $QUEUE_PROCESSED"
  echo ""

  # Circuit Breaker
  echo "🔌 Circuit Breaker"
  echo "----------------------------------------"
  CB_STATE=$(echo "$STATS" | jq -r '.circuitBreaker.state // "unknown"')
  CB_FAILURES=$(echo "$STATS" | jq -r '.circuitBreaker.consecutiveFailures // 0')

  echo "  State:           $CB_STATE"
  echo "  Failures:        $CB_FAILURES"
  echo ""

  # Alerts
  echo "⚠️  Active Alerts"
  echo "----------------------------------------"

  # Check thresholds
  ALERTS=0

  # Success rate alert
  if [ "$SUCCESS_RATE" != "N/A" ]; then
    SUCCESS_NUM=$(echo "$SUCCESS_RATE" | sed 's/%//')
    if (( $(echo "$SUCCESS_NUM < 95" | bc -l) )); then
      echo "  ⚠️  Low success rate: $SUCCESS_RATE (target: >95%)"
      ((ALERTS++))
    fi
  fi

  # P95 latency alert
  if [ "$P95_LATENCY" != "N/A" ] && [ "$P95_LATENCY" != "null" ]; then
    if (( $(echo "$P95_LATENCY > 2000" | bc -l) )); then
      echo "  ⚠️  High P95 latency: ${P95_LATENCY}ms (target: <2000ms)"
      ((ALERTS++))
    fi
  fi

  # Cache hit rate alert
  if [ "$HIT_RATE" != "N/A" ]; then
    HIT_NUM=$(echo "$HIT_RATE" | sed 's/%//')
    if (( $(echo "$HIT_NUM < 80" | bc -l) )); then
      echo "  ⚠️  Low cache hit rate: $HIT_RATE (target: >80%)"
      ((ALERTS++))
    fi
  fi

  # Queue depth alert
  if (( QUEUE_DEPTH > 10 )); then
    echo "  ⚠️  High queue depth: $QUEUE_DEPTH (target: <10)"
    ((ALERTS++))
  fi

  # Circuit breaker alert
  if [ "$CB_STATE" != "closed" ] && [ "$CB_STATE" != "unknown" ]; then
    echo "  🚨 Circuit breaker not closed: $CB_STATE"
    ((ALERTS++))
  fi

  if [ $ALERTS -eq 0 ]; then
    echo "  ✅ No alerts - all metrics healthy"
  fi

  echo ""
  echo "========================================"
  echo "Refreshing in 5 seconds..."

  sleep 5
done
