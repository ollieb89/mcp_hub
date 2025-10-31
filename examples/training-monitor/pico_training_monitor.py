#!/usr/bin/env python3
"""
Pico Training Monitor - A simple MCP server for monitoring ML training jobs.

This example demonstrates how to create an MCP server that monitors training job status.
It provides tools to check training status, view metrics, and manage training runs.
"""

import json
import sys
import os
from datetime import datetime
from pathlib import Path


class TrainingMonitor:
    """Simple training monitor that tracks job status."""
    
    def __init__(self, log_dir=None):
        self.log_dir = Path(log_dir or os.getenv('TRAINING_LOG_DIR', './training_logs'))
        self.log_dir.mkdir(parents=True, exist_ok=True)
    
    def get_training_status(self, job_id=None):
        """Get the status of a training job."""
        if job_id is None:
            # Return status of all jobs
            jobs = []
            if self.log_dir.exists():
                for job_file in self.log_dir.glob('job_*.json'):
                    with open(job_file, 'r') as f:
                        jobs.append(json.load(f))
            return {
                "total_jobs": len(jobs),
                "jobs": jobs
            }
        else:
            # Return status of specific job
            job_file = self.log_dir / f'job_{job_id}.json'
            if job_file.exists():
                with open(job_file, 'r') as f:
                    return json.load(f)
            else:
                return {
                    "error": f"Job {job_id} not found",
                    "job_id": job_id
                }
    
    def create_example_job(self, job_id, status="running"):
        """Create an example training job for demonstration."""
        job_data = {
            "job_id": job_id,
            "status": status,
            "created_at": datetime.now().isoformat(),
            "model": "example-model",
            "metrics": {
                "loss": 0.123,
                "accuracy": 0.95,
                "epoch": 10
            },
            "progress": "75%"
        }
        
        job_file = self.log_dir / f'job_{job_id}.json'
        with open(job_file, 'w') as f:
            json.dump(job_data, f, indent=2)
        
        return job_data


def handle_mcp_request(request, monitor):
    """Handle MCP protocol requests."""
    method = request.get('method')
    
    if method == 'initialize':
        return {
            "protocolVersion": "2025-03-26",
            "capabilities": {
                "tools": {}
            },
            "serverInfo": {
                "name": "pico-training-monitor",
                "version": "1.0.0"
            }
        }
    
    elif method == 'tools/list':
        return {
            "tools": [
                {
                    "name": "run_training_monitor",
                    "description": "Check the status of training jobs. Returns current status, metrics, and progress for one or all training jobs.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "job_id": {
                                "type": "string",
                                "description": "Optional job ID to check specific job. If not provided, returns all jobs."
                            }
                        }
                    }
                },
                {
                    "name": "create_example_training_job",
                    "description": "Create an example training job for demonstration purposes.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "job_id": {
                                "type": "string",
                                "description": "Job ID to create"
                            },
                            "status": {
                                "type": "string",
                                "description": "Initial status (running, completed, failed)",
                                "enum": ["running", "completed", "failed"]
                            }
                        },
                        "required": ["job_id"]
                    }
                }
            ]
        }
    
    elif method == 'tools/call':
        tool_name = request['params']['name']
        arguments = request['params'].get('arguments', {})
        
        if tool_name == 'run_training_monitor':
            job_id = arguments.get('job_id')
            status = monitor.get_training_status(job_id)
            return {
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps(status, indent=2)
                    }
                ]
            }
        
        elif tool_name == 'create_example_training_job':
            job_id = arguments['job_id']
            status = arguments.get('status', 'running')
            job_data = monitor.create_example_job(job_id, status)
            return {
                "content": [
                    {
                        "type": "text",
                        "text": f"Created example training job: {json.dumps(job_data, indent=2)}"
                    }
                ]
            }
        
        else:
            return {"error": {"code": -32601, "message": f"Unknown tool: {tool_name}"}}
    
    else:
        return {"error": {"code": -32601, "message": f"Unknown method: {method}"}}


def main():
    """Main MCP server loop using stdio transport."""
    monitor = TrainingMonitor()
    
    # Create an example job for demonstration
    monitor.create_example_job("demo-001", "running")
    
    # Read JSON-RPC requests from stdin
    for line in sys.stdin:
        request_id = None
        try:
            request = json.loads(line)
            request_id = request.get('id')
            response = handle_mcp_request(request, monitor)
            
            # Build JSON-RPC response
            rpc_response = {
                "jsonrpc": "2.0",
                "id": request_id
            }
            
            if "error" in response:
                rpc_response["error"] = response["error"]
            else:
                rpc_response["result"] = response
            
            # Write response to stdout
            print(json.dumps(rpc_response), flush=True)
            
        except Exception as e:
            error_response = {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32603,
                    "message": f"Internal error: {str(e)}"
                }
            }
            print(json.dumps(error_response), flush=True)


if __name__ == '__main__':
    main()
