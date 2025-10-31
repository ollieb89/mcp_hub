#!/usr/bin/env python3
"""
Pico Training Monitor - A simple MCP server for monitoring ML training jobs.

This example demonstrates how to create an MCP server that monitors training job status.
It provides tools to check training status, view metrics, and manage training runs.

Supports integration with:
- AWS SageMaker (via AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION)
- Google Vertex AI (via GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_PROJECT)
- Local file-based job tracking
"""

import json
import sys
import os
from datetime import datetime
from pathlib import Path


class TrainingMonitor:
    """Training monitor with support for SageMaker, Vertex AI, and local tracking."""
    
    def __init__(self, log_dir=None):
        self.log_dir = Path(log_dir or os.getenv('TRAINING_LOG_DIR', './training_logs'))
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # Check for cloud platform credentials
        self.sagemaker_enabled = self._check_sagemaker_credentials()
        self.vertex_enabled = self._check_vertex_credentials()
    
    def _check_sagemaker_credentials(self):
        """Check if AWS SageMaker credentials are available."""
        return all([
            os.getenv('AWS_ACCESS_KEY_ID'),
            os.getenv('AWS_SECRET_ACCESS_KEY'),
            os.getenv('AWS_REGION')
        ])
    
    def _check_vertex_credentials(self):
        """Check if Google Vertex AI credentials are available."""
        return bool(
            os.getenv('GOOGLE_APPLICATION_CREDENTIALS') or 
            os.getenv('GOOGLE_CLOUD_PROJECT')
        )
    
    def _get_sagemaker_jobs(self, job_id=None):
        """Fetch training jobs from AWS SageMaker."""
        try:
            import boto3
            
            sagemaker = boto3.client(
                'sagemaker',
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                region_name=os.getenv('AWS_REGION', 'us-east-1')
            )
            
            if job_id:
                # Get specific job
                response = sagemaker.describe_training_job(TrainingJobName=job_id)
                return {
                    "job_id": response['TrainingJobName'],
                    "status": response['TrainingJobStatus'].lower(),
                    "created_at": response['CreationTime'].isoformat(),
                    "model": response.get('AlgorithmSpecification', {}).get('TrainingImage', 'unknown'),
                    "metrics": response.get('FinalMetricDataList', []),
                    "platform": "sagemaker"
                }
            else:
                # List all jobs
                response = sagemaker.list_training_jobs(MaxResults=10, SortBy='CreationTime', SortOrder='Descending')
                jobs = []
                for job_summary in response['TrainingJobSummaries']:
                    jobs.append({
                        "job_id": job_summary['TrainingJobName'],
                        "status": job_summary['TrainingJobStatus'].lower(),
                        "created_at": job_summary['CreationTime'].isoformat(),
                        "platform": "sagemaker"
                    })
                return jobs
        except ImportError:
            return {"error": "boto3 not installed. Install with: pip install boto3"}
        except Exception as e:
            return {"error": f"SageMaker error: {str(e)}"}
    
    def _get_vertex_jobs(self, job_id=None):
        """Fetch training jobs from Google Vertex AI."""
        try:
            from google.cloud import aiplatform
            
            project = os.getenv('GOOGLE_CLOUD_PROJECT')
            location = os.getenv('GOOGLE_CLOUD_LOCATION', 'us-central1')
            
            if not project:
                return {"error": "GOOGLE_CLOUD_PROJECT not set"}
            
            aiplatform.init(project=project, location=location)
            
            if job_id:
                # Get specific job
                job = aiplatform.CustomTrainingJob.get(job_id)
                return {
                    "job_id": job.resource_name,
                    "status": job.state.name.lower(),
                    "created_at": job.create_time.isoformat() if job.create_time else None,
                    "platform": "vertex-ai"
                }
            else:
                # List all jobs
                jobs = []
                for job in aiplatform.CustomTrainingJob.list():
                    jobs.append({
                        "job_id": job.resource_name,
                        "status": job.state.name.lower() if job.state else "unknown",
                        "created_at": job.create_time.isoformat() if job.create_time else None,
                        "platform": "vertex-ai"
                    })
                return jobs[:10]  # Limit to 10 most recent
        except ImportError:
            return {"error": "google-cloud-aiplatform not installed. Install with: pip install google-cloud-aiplatform"}
        except Exception as e:
            return {"error": f"Vertex AI error: {str(e)}"}
    
    def _get_local_jobs(self, job_id=None):
        """Get training jobs from local file storage."""
        if job_id is None:
            # Return status of all jobs
            jobs = []
            if self.log_dir.exists():
                for job_file in self.log_dir.glob('job_*.json'):
                    with open(job_file, 'r') as f:
                        job_data = json.load(f)
                        job_data['platform'] = 'local'
                        jobs.append(job_data)
            return jobs
        else:
            # Return status of specific job
            job_file = self.log_dir / f'job_{job_id}.json'
            if job_file.exists():
                with open(job_file, 'r') as f:
                    job_data = json.load(f)
                    job_data['platform'] = 'local'
                    return job_data
            else:
                return {
                    "error": f"Job {job_id} not found",
                    "job_id": job_id
                }
    
    def get_training_status(self, job_id=None, platform=None):
        """
        Get the status of training jobs from multiple platforms.
        
        Args:
            job_id: Optional job ID to check specific job
            platform: Optional platform filter ('local', 'sagemaker', 'vertex-ai')
        """
        all_jobs = []
        errors = []
        
        # Determine which platforms to query
        platforms_to_check = []
        if platform:
            platforms_to_check = [platform]
        else:
            # Check all available platforms
            if self.sagemaker_enabled:
                platforms_to_check.append('sagemaker')
            if self.vertex_enabled:
                platforms_to_check.append('vertex-ai')
            platforms_to_check.append('local')  # Always check local
        
        # Fetch jobs from each platform
        for plt in platforms_to_check:
            if plt == 'sagemaker' and self.sagemaker_enabled:
                result = self._get_sagemaker_jobs(job_id)
                if isinstance(result, dict) and 'error' in result:
                    errors.append(result['error'])
                elif isinstance(result, list):
                    all_jobs.extend(result)
                elif isinstance(result, dict):
                    if job_id:
                        return result  # Return specific job immediately
                    all_jobs.append(result)
            
            elif plt == 'vertex-ai' and self.vertex_enabled:
                result = self._get_vertex_jobs(job_id)
                if isinstance(result, dict) and 'error' in result:
                    errors.append(result['error'])
                elif isinstance(result, list):
                    all_jobs.extend(result)
                elif isinstance(result, dict):
                    if job_id:
                        return result  # Return specific job immediately
                    all_jobs.append(result)
            
            elif plt == 'local':
                result = self._get_local_jobs(job_id)
                if isinstance(result, dict) and 'error' in result:
                    if not job_id or plt == platform:  # Only add error if specifically requested
                        errors.append(result['error'])
                elif isinstance(result, list):
                    all_jobs.extend(result)
                elif isinstance(result, dict):
                    if job_id:
                        return result  # Return specific job immediately
                    all_jobs.append(result)
        
        # If looking for specific job and not found
        if job_id and not all_jobs:
            return {
                "error": f"Job {job_id} not found on any platform",
                "job_id": job_id,
                "errors": errors if errors else None
            }
        
        # Return all jobs
        response = {
            "total_jobs": len(all_jobs),
            "jobs": all_jobs,
            "platforms": {
                "sagemaker": self.sagemaker_enabled,
                "vertex_ai": self.vertex_enabled,
                "local": True
            }
        }
        
        if errors:
            response["warnings"] = errors
        
        return response
    
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
                    "description": "Check the status of training jobs across multiple platforms (SageMaker, Vertex AI, local). Automatically queries all configured platforms or specify a platform filter.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "job_id": {
                                "type": "string",
                                "description": "Optional job ID to check specific job. If not provided, returns all jobs."
                            },
                            "platform": {
                                "type": "string",
                                "description": "Optional platform filter: 'local', 'sagemaker', or 'vertex-ai'. If not provided, queries all available platforms.",
                                "enum": ["local", "sagemaker", "vertex-ai"]
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
            platform = arguments.get('platform')
            status = monitor.get_training_status(job_id, platform)
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
