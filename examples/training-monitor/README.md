# Pico Training Monitor - MCP Server Example

This example demonstrates how to create an MCP server for monitoring ML training job status.

## Overview

The Pico Training Monitor is a simple MCP server that provides tools to:
- Check training job status
- View training metrics (loss, accuracy, progress)
- Monitor multiple training runs
- Create example training jobs for demonstration

## Features

### Tools

1. **run_training_monitor**: Check the status of training jobs
   - Optional `job_id` parameter to check specific job
   - Without `job_id`, returns status of all jobs
   - Returns metrics like loss, accuracy, epoch, and progress

2. **create_example_training_job**: Create example training jobs
   - Create demo jobs with different statuses (running, completed, failed)
   - Useful for testing and demonstration

## Installation

### Prerequisites
- Python 3.7 or higher
- MCP Hub installed and configured

### Setup

1. Copy this example to your preferred location:
```bash
cp -r examples/training-monitor ~/my-training-monitor
cd ~/my-training-monitor
```

2. Make the script executable:
```bash
chmod +x pico_training_monitor.py
```

3. Install optional dependencies for cloud platforms:

**For AWS SageMaker:**
```bash
pip install boto3
```

**For Google Vertex AI:**
```bash
pip install google-cloud-aiplatform
```

**For both platforms:**
```bash
pip install boto3 google-cloud-aiplatform
```

**Note:** The monitor works with local file-based tracking without any additional dependencies. Cloud platform SDKs are only needed if you want to monitor SageMaker or Vertex AI jobs.

## Configuration

Add the training monitor to your MCP Hub configuration (`mcp-servers.json` or `.vscode/mcp.json`):

**Option 1: Local file-based tracking only**
```json
{
  "mcpServers": {
    "pico-training-monitor": {
      "command": "python",
      "args": ["/absolute/path/to/examples/training-monitor/pico_training_monitor.py"],
      "cwd": ".",
      "env": {
        "TRAINING_LOG_DIR": "${workspaceFolder}/training_logs"
      },
      "disabled": false
    }
  }
}
```

**Option 2: With AWS SageMaker integration**
```json
{
  "mcpServers": {
    "pico-training-monitor": {
      "command": "python",
      "args": ["/absolute/path/to/examples/training-monitor/pico_training_monitor.py"],
      "cwd": ".",
      "env": {
        "AWS_ACCESS_KEY_ID": "${env:AWS_ACCESS_KEY_ID}",
        "AWS_SECRET_ACCESS_KEY": "${env:AWS_SECRET_ACCESS_KEY}",
        "AWS_REGION": "us-east-1",
        "TRAINING_LOG_DIR": "${workspaceFolder}/training_logs"
      },
      "disabled": false
    }
  }
}
```

**Option 3: With Google Vertex AI integration**
```json
{
  "mcpServers": {
    "pico-training-monitor": {
      "command": "python",
      "args": ["/absolute/path/to/examples/training-monitor/pico_training_monitor.py"],
      "cwd": ".",
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "${env:GOOGLE_APPLICATION_CREDENTIALS}",
        "GOOGLE_CLOUD_PROJECT": "${env:GOOGLE_CLOUD_PROJECT}",
        "GOOGLE_CLOUD_LOCATION": "us-central1",
        "TRAINING_LOG_DIR": "${workspaceFolder}/training_logs"
      },
      "disabled": false
    }
  }
}
```

**Option 4: Multi-platform (SageMaker + Vertex AI + Local)**
```json
{
  "mcpServers": {
    "pico-training-monitor": {
      "command": "python",
      "args": ["/absolute/path/to/examples/training-monitor/pico_training_monitor.py"],
      "cwd": ".",
      "env": {
        "AWS_ACCESS_KEY_ID": "${env:AWS_ACCESS_KEY_ID}",
        "AWS_SECRET_ACCESS_KEY": "${env:AWS_SECRET_ACCESS_KEY}",
        "AWS_REGION": "us-east-1",
        "GOOGLE_APPLICATION_CREDENTIALS": "${env:GOOGLE_APPLICATION_CREDENTIALS}",
        "GOOGLE_CLOUD_PROJECT": "${env:GOOGLE_CLOUD_PROJECT}",
        "GOOGLE_CLOUD_LOCATION": "us-central1",
        "TRAINING_LOG_DIR": "${workspaceFolder}/training_logs"
      },
      "disabled": false
    }
  }
}
```

### Environment Variables

**Local Storage:**
- `TRAINING_LOG_DIR`: Directory where training job logs are stored (default: `./training_logs`)

**AWS SageMaker Integration:**
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_REGION`: AWS region (e.g., `us-east-1`)

**Google Vertex AI Integration:**
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to service account JSON file
- `GOOGLE_CLOUD_PROJECT`: GCP project ID
- `GOOGLE_CLOUD_LOCATION`: GCP location (default: `us-central1`)

**Note:** The monitor automatically detects which platforms are configured and queries all available platforms. You only need to set the environment variables for the platforms you want to use.

## Usage

Once configured in MCP Hub, you can use the training monitor through any MCP client:

### Check All Training Jobs (All Platforms)

```javascript
// Query all configured platforms automatically
await client.callTool('pico-training-monitor', 'run_training_monitor', {});
```

Response:
```json
{
  "total_jobs": 3,
  "platforms": {
    "sagemaker": true,
    "vertex_ai": true,
    "local": true
  },
  "jobs": [
    {
      "job_id": "sagemaker-training-job-123",
      "status": "inprogress",
      "created_at": "2025-10-30T10:00:00",
      "platform": "sagemaker"
    },
    {
      "job_id": "vertex-custom-job-456",
      "status": "running",
      "created_at": "2025-10-30T11:00:00",
      "platform": "vertex-ai"
    },
    {
      "job_id": "demo-001",
      "status": "running",
      "model": "example-model",
      "metrics": {
        "loss": 0.123,
        "accuracy": 0.95,
        "epoch": 10
      },
      "progress": "75%"
    }
  ]
}
```

### Check Specific Job

```javascript
await client.callTool('pico-training-monitor', 'run_training_monitor', {
  job_id: "sagemaker-training-job-123"
});
```

### Query Specific Platform Only

```javascript
// Only check SageMaker jobs
await client.callTool('pico-training-monitor', 'run_training_monitor', {
  platform: "sagemaker"
});

// Only check Vertex AI jobs
await client.callTool('pico-training-monitor', 'run_training_monitor', {
  platform: "vertex-ai"
});

// Only check local jobs
await client.callTool('pico-training-monitor', 'run_training_monitor', {
  platform: "local"
});
```

### Create Example Job

```javascript
await client.callTool('pico-training-monitor', 'create_example_training_job', {
  job_id: "my-experiment-123",
  status: "running"
});
```

## Integration with Real Training Frameworks

This example can be extended to integrate with real ML training frameworks:

### TensorBoard Integration
```python
from tensorboard.backend.event_processing import event_accumulator

# Read TensorBoard logs
ea = event_accumulator.EventAccumulator(log_dir)
ea.Reload()
```

### PyTorch Integration
```python
# Monitor PyTorch training
with open(f'{log_dir}/training.log', 'r') as f:
    # Parse training logs
    pass
```

### Weights & Biases Integration
```python
import wandb

# Get run status from W&B
api = wandb.Api()
run = api.run(f"entity/project/run_id")
```

## Example Use Cases

1. **Monitor Long-Running Training**: Check training progress without SSH into training servers
2. **Multi-Experiment Tracking**: Monitor multiple training runs simultaneously
3. **CI/CD Integration**: Automated training status checks in pipelines
4. **Team Collaboration**: Share training status through MCP Hub's web interface

## Testing

Test the server directly:

```bash
# Start the server
python pico_training_monitor.py

# Send test request (in separate terminal)
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | python pico_training_monitor.py
```

## Extending the Example

To adapt this for your training framework:

1. Modify `get_training_status()` to read from your training logs
2. Add custom metrics relevant to your models
3. Implement real-time log streaming
4. Add tools for starting/stopping training jobs
5. Integrate with your experiment tracking system

## Troubleshooting

### Server Not Starting
- Check Python is in your PATH
- Verify script has execute permissions
- Check TRAINING_LOG_DIR is writable

### No Jobs Found
- Run `create_example_training_job` first to create demo data
- Check TRAINING_LOG_DIR path is correct
- Verify training job files exist in the log directory

### Connection Issues
- Ensure MCP Hub is running
- Check server configuration in mcp-servers.json
- Verify no conflicting ports

## Related Documentation

- [MCP Hub Configuration Guide](../../README.md#configuration)
- [MCP Protocol Specification](https://modelcontextprotocol.io/specification)
- [Example Clients](../README.md)

## License

This example is provided as-is for demonstration purposes. Adapt it to your needs!
