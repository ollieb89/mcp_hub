#!/usr/bin/env bash
#
# Performance Monitoring Script for Staging Deployment
#
# Usage:
#   ./scripts/monitor-staging-performance.sh [OPTIONS]
#
# Options:
#   --interval SECONDS    Monitoring interval (default: 60)
#   --duration MINUTES    Total monitoring duration (default: continuous)
#   --pid PID            Process ID to monitor (default: auto-detect)
#   --output FILE        Output file for metrics (default: performance-metrics.jsonl)
#   --alert-threshold    Enable alert thresholds from STAGING_DEPLOYMENT_GUIDE.md
#

set -euo pipefail

# Configuration
INTERVAL=${INTERVAL:-60}
DURATION=${DURATION:-0}  # 0 = continuous
PID=${PID:-}
OUTPUT_FILE=${OUTPUT_FILE:-performance-metrics.jsonl}
ALERT_THRESHOLD=${ALERT_THRESHOLD:-true}
PORT=7000

# Alert thresholds (from STAGING_DEPLOYMENT_GUIDE.md)
MEMORY_TARGET=200  # MB
MEMORY_ACCEPTABLE=300  # MB
ERROR_RATE_TARGET=0.1  # %
ERROR_RATE_ACCEPTABLE=1.0  # %

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --interval)
      INTERVAL="$2"
      shift 2
      ;;
    --duration)
      DURATION="$2"
      shift 2
      ;;
    --pid)
      PID="$2"
      shift 2
      ;;
    --output)
      OUTPUT_FILE="$2"
      shift 2
      ;;
    --alert-threshold)
      ALERT_THRESHOLD=true
      shift
      ;;
    --no-alert-threshold)
      ALERT_THRESHOLD=false
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Auto-detect PID if not provided
if [[ -z "$PID" ]]; then
  PID=$(pgrep -f "bun.*server.js" | head -1 || echo "")
  if [[ -z "$PID" ]]; then
    echo -e "${RED}Error: Could not auto-detect staging process PID${NC}"
    echo "Please specify PID with --pid option"
    exit 1
  fi
  echo -e "${GREEN}Auto-detected staging process: PID $PID${NC}"
fi

# Verify process is running
if ! ps -p "$PID" > /dev/null 2>&1; then
  echo -e "${RED}Error: Process $PID is not running${NC}"
  exit 1
fi

# Calculate end time if duration specified
START_TIME=$(date +%s)
END_TIME=0
if [[ $DURATION -gt 0 ]]; then
  END_TIME=$((START_TIME + DURATION * 60))
  echo -e "${GREEN}Monitoring for $DURATION minutes${NC}"
else
  echo -e "${GREEN}Monitoring continuously (Ctrl+C to stop)${NC}"
fi

echo -e "${GREEN}Output file: $OUTPUT_FILE${NC}"
echo -e "${GREEN}Monitoring interval: ${INTERVAL}s${NC}"
echo ""

# Alert status tracking
ALERT_MEMORY_WARNED=false
ALERT_MEMORY_CRITICAL=false

# Function to get process metrics
get_process_metrics() {
  local pid=$1
  local timestamp=$(date -Iseconds)

  # Get process stats
  local ps_output=$(ps -p "$pid" -o pid,ppid,%cpu,%mem,rss,vsz,etime --no-headers)

  if [[ -z "$ps_output" ]]; then
    echo -e "${RED}Process $pid no longer running${NC}"
    return 1
  fi

  read -r pid ppid cpu mem rss vsz etime <<< "$ps_output"

  # Convert RSS to MB
  local rss_mb=$((rss / 1024))

  # Get server metrics via API
  local connected_servers=0
  local total_servers=0
  local api_response=$(curl -s "http://localhost:$PORT/api/servers" 2>/dev/null || echo "{}")

  if [[ "$api_response" != "{}" ]]; then
    connected_servers=$(echo "$api_response" | jq -r '.data | map(select(.state == "connected")) | length' 2>/dev/null || echo "0")
    total_servers=$(echo "$api_response" | jq -r '.data | length' 2>/dev/null || echo "0")
  fi

  # Build JSON metric
  local metric=$(cat <<EOF
{
  "timestamp": "$timestamp",
  "pid": $pid,
  "ppid": $ppid,
  "cpu_percent": $cpu,
  "mem_percent": $mem,
  "rss_kb": $rss,
  "rss_mb": $rss_mb,
  "vsz_kb": $vsz,
  "uptime": "$etime",
  "connected_servers": $connected_servers,
  "total_servers": $total_servers
}
EOF
)

  # Append to output file
  echo "$metric" >> "$OUTPUT_FILE"

  # Display current metrics
  echo "[$timestamp] RSS: ${rss_mb}MB | CPU: ${cpu}% | Uptime: $etime | Servers: $connected_servers/$total_servers"

  # Alert thresholds
  if [[ "$ALERT_THRESHOLD" == "true" ]]; then
    # Memory alerts
    if [[ $rss_mb -gt $MEMORY_ACCEPTABLE ]]; then
      if [[ "$ALERT_MEMORY_CRITICAL" == "false" ]]; then
        echo -e "${RED}CRITICAL: Memory usage ${rss_mb}MB exceeds acceptable threshold (${MEMORY_ACCEPTABLE}MB)${NC}"
        ALERT_MEMORY_CRITICAL=true
      fi
    elif [[ $rss_mb -gt $MEMORY_TARGET ]]; then
      if [[ "$ALERT_MEMORY_WARNED" == "false" ]]; then
        echo -e "${YELLOW}WARNING: Memory usage ${rss_mb}MB exceeds target threshold (${MEMORY_TARGET}MB)${NC}"
        ALERT_MEMORY_WARNED=true
      fi
    else
      # Reset alerts if memory drops back below thresholds
      ALERT_MEMORY_WARNED=false
      ALERT_MEMORY_CRITICAL=false
    fi
  fi

  return 0
}

# Function to get log metrics
get_log_metrics() {
  local log_file="$HOME/.local/state/mcp-hub/logs/mcp-hub.log"
  local timestamp=$(date -Iseconds)

  if [[ ! -f "$log_file" ]]; then
    return 0
  fi

  # Count error entries in last minute
  local error_count=$(grep -c '"type":"error"' "$log_file" 2>/dev/null || echo "0")
  local total_count=$(wc -l < "$log_file" 2>/dev/null || echo "1")

  # Calculate error rate
  local error_rate=0
  if [[ $total_count -gt 0 ]]; then
    error_rate=$(awk "BEGIN {printf \"%.2f\", $error_count / $total_count * 100}")
  fi

  # Build JSON metric
  local metric=$(cat <<EOF
{
  "timestamp": "$timestamp",
  "log_file": "$log_file",
  "error_count": $error_count,
  "total_log_entries": $total_count,
  "error_rate_percent": $error_rate
}
EOF
)

  # Append to output file
  echo "$metric" >> "$OUTPUT_FILE.logs"

  # Alert on error rate
  if [[ "$ALERT_THRESHOLD" == "true" ]]; then
    local error_rate_float=$(echo "$error_rate" | bc -l 2>/dev/null || echo "0")
    local exceeds_acceptable=$(echo "$error_rate_float > $ERROR_RATE_ACCEPTABLE" | bc -l)
    local exceeds_target=$(echo "$error_rate_float > $ERROR_RATE_TARGET" | bc -l)

    if [[ $exceeds_acceptable -eq 1 ]]; then
      echo -e "${RED}CRITICAL: Error rate ${error_rate}% exceeds acceptable threshold (${ERROR_RATE_ACCEPTABLE}%)${NC}"
    elif [[ $exceeds_target -eq 1 ]]; then
      echo -e "${YELLOW}WARNING: Error rate ${error_rate}% exceeds target threshold (${ERROR_RATE_TARGET}%)${NC}"
    fi
  fi
}

# Function to generate summary report
generate_summary() {
  local output_file=$1

  if [[ ! -f "$output_file" ]]; then
    echo "No metrics collected yet"
    return
  fi

  echo ""
  echo "========================================"
  echo "Performance Monitoring Summary"
  echo "========================================"
  echo ""

  # Calculate statistics
  local avg_rss=$(jq -s 'map(.rss_mb) | add / length' "$output_file" 2>/dev/null || echo "N/A")
  local max_rss=$(jq -s 'map(.rss_mb) | max' "$output_file" 2>/dev/null || echo "N/A")
  local min_rss=$(jq -s 'map(.rss_mb) | min' "$output_file" 2>/dev/null || echo "N/A")

  local avg_cpu=$(jq -s 'map(.cpu_percent) | add / length' "$output_file" 2>/dev/null || echo "N/A")
  local max_cpu=$(jq -s 'map(.cpu_percent) | max' "$output_file" 2>/dev/null || echo "N/A")

  local sample_count=$(jq -s 'length' "$output_file" 2>/dev/null || echo "0")
  local duration_mins=$((sample_count * INTERVAL / 60))

  echo "Duration: ${duration_mins} minutes (${sample_count} samples)"
  echo ""
  echo "Memory (RSS):"
  echo "  Average: ${avg_rss}MB"
  echo "  Maximum: ${max_rss}MB"
  echo "  Minimum: ${min_rss}MB"
  echo ""
  echo "CPU:"
  echo "  Average: ${avg_cpu}%"
  echo "  Maximum: ${max_cpu}%"
  echo ""
  echo "Metrics file: $output_file"
  echo ""
}

# Trap Ctrl+C to generate summary
trap 'echo ""; echo "Monitoring stopped"; generate_summary "$OUTPUT_FILE"; exit 0' INT TERM

# Main monitoring loop
echo "Starting performance monitoring..."
echo ""

ITERATION=0
while true; do
  ITERATION=$((ITERATION + 1))

  # Check if process is still running
  if ! get_process_metrics "$PID"; then
    echo -e "${RED}Process terminated${NC}"
    break
  fi

  # Get log metrics
  get_log_metrics

  # Check if duration exceeded
  if [[ $DURATION -gt 0 ]]; then
    CURRENT_TIME=$(date +%s)
    if [[ $CURRENT_TIME -ge $END_TIME ]]; then
      echo -e "${GREEN}Monitoring duration completed${NC}"
      break
    fi
  fi

  # Sleep until next interval
  sleep "$INTERVAL"
done

# Generate final summary
generate_summary "$OUTPUT_FILE"
