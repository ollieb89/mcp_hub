# Quick Start Guide: Training Job Monitoring with MCP Hub

This guide shows how to solve the problem: **"Check training status of training job using pico run training monitor"**

## Overview

The Pico Training Monitor is an MCP server that integrates with MCP Hub to provide real-time training job status monitoring through a simple tool interface.

## Quick Setup (5 minutes)

### Step 1: Configure MCP Hub

Add the training monitor to your `mcp-servers.json`:

```json
{
  "mcpServers": {
    "pico-training-monitor": {
      "command": "python",
      "args": ["/absolute/path/to/pico_training_monitor.py"],
      "env": {
        "TRAINING_LOG_DIR": "${workspaceFolder}/training_logs"
      },
      "disabled": false
    }
  }
}
```

Replace `/absolute/path/to/` with the actual path to the script.

### Step 2: Start MCP Hub

```bash
mcp-hub --config /path/to/mcp-servers.json
```

### Step 3: Use the Training Monitor

Through any MCP client (Claude Desktop, Cline, etc.), you can now:

**Check all training jobs:**
```
Use the tool: pico-training-monitor__run_training_monitor
Arguments: {} (empty)
```

**Check a specific job:**
```
Use the tool: pico-training-monitor__run_training_monitor
Arguments: { "job_id": "your-job-id" }
```

## Example Response

```json
{
  "total_jobs": 1,
  "jobs": [{
    "job_id": "experiment-001",
    "status": "running",
    "model": "my-model",
    "metrics": {
      "loss": 0.123,
      "accuracy": 0.95,
      "epoch": 10
    },
    "progress": "75%"
  }]
}
```

## Integration with MCP Clients

### Claude Desktop

1. Configure Claude to connect to MCP Hub:
```json
{
  "mcpServers": {
    "hub": {
      "url": "http://localhost:37373/mcp"
    }
  }
}
```

2. Ask Claude:
> "Can you check my training job status using the pico run training monitor tool?"

### Via REST API

```bash
# Check training status
curl -X POST http://localhost:37373/api/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "serverName": "pico-training-monitor",
    "toolName": "run_training_monitor",
    "arguments": {}
  }'
```

## Common Use Cases

### 1. Monitor Long-Running Training

Check training progress without SSH:
```bash
# Every 5 minutes
watch -n 300 'curl -s http://localhost:37373/api/tools/call ...'
```

### 2. CI/CD Integration

```yaml
# .github/workflows/training.yml
- name: Check Training Status
  run: |
    # Use MCP Hub API to check training completion
    python scripts/check_training.py
```

### 3. Team Dashboard

Build a dashboard that calls the training monitor tool to show all team experiments in real-time.

## Extending for Your Framework

### TensorBoard Integration

Modify `pico_training_monitor.py`:

```python
from tensorboard.backend.event_processing import event_accumulator

def get_training_status(self, job_id):
    # Read from TensorBoard logs
    ea = event_accumulator.EventAccumulator(f'{self.log_dir}/{job_id}')
    ea.Reload()
    
    # Get latest scalar values
    loss = ea.Scalars('loss')[-1].value
    accuracy = ea.Scalars('accuracy')[-1].value
    
    return {
        "job_id": job_id,
        "status": "running",
        "metrics": {
            "loss": loss,
            "accuracy": accuracy
        }
    }
```

### Weights & Biases Integration

```python
import wandb

def get_training_status(self, job_id):
    api = wandb.Api()
    run = api.run(f"entity/project/{job_id}")
    
    return {
        "job_id": job_id,
        "status": run.state,
        "metrics": run.summary
    }
```

## Troubleshooting

**Problem:** "Server not found"
- **Solution:** Check that `disabled: false` in your configuration
- **Solution:** Restart MCP Hub after configuration changes

**Problem:** "No jobs found"
- **Solution:** Use `create_example_training_job` tool to create test data
- **Solution:** Check that `TRAINING_LOG_DIR` points to correct location

**Problem:** "Tool not available"
- **Solution:** Tool name should be `pico-training-monitor__run_training_monitor` (with double underscore)
- **Solution:** Check server is connected: `curl http://localhost:37373/api/servers`

## Next Steps

1. **Customize the monitor** for your training framework
2. **Add more metrics** (GPU usage, memory, etc.)
3. **Create alerts** for training failures
4. **Build dashboards** using the MCP Hub API

## Support

For issues or questions:
- See main [README](../../README.md)
- Check [examples](../../examples/)
- Open an issue on GitHub
