"""
AutoDeployX Backend Tracking Service
Real-time metrics from Jenkins, Docker Hub, and deployments
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
import httpx
import os
import json

app = FastAPI(
    title="AutoDeployX Tracking API",
    description="Backend service for tracking CI/CD metrics",
    version="1.0.0"
)

# CORS for dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for real-time tracking
pipeline_status = {
    "total": 0,
    "active": 0,
    "success": 0,
    "failed": 0,
    "builds": []
}

deployment_logs = []

# Configuration
JENKINS_URL = os.getenv("JENKINS_URL", "http://jenkins:8080")
JENKINS_USER = os.getenv("JENKINS_USER", "admin")
JENKINS_TOKEN = os.getenv("JENKINS_TOKEN", "")
DOCKERHUB_USER = os.getenv("DOCKERHUB_USER", "sarika")
DOCKERHUB_REPO = os.getenv("DOCKERHUB_REPO", "autodeployx")


# Models
class PipelineStatus(BaseModel):
    status: str  # success, failure, running, pending
    pipeline_name: Optional[str] = "AutoDeployX"
    build_number: Optional[int] = None
    stage: Optional[str] = None
    message: Optional[str] = None


class LogEntry(BaseModel):
    timestamp: str
    level: str  # info, success, error, warning
    message: str


class DeploymentEvent(BaseModel):
    event_type: str  # build_start, build_end, test_start, test_end, push, deploy
    status: str
    details: Optional[dict] = None


# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "AutoDeployX Tracking API",
        "timestamp": datetime.now().isoformat()
    }


# Jenkins status webhook (called from Jenkinsfile)
@app.post("/jenkins/status")
async def update_jenkins_status(status_update: PipelineStatus):
    """Receive pipeline status updates from Jenkins"""
    pipeline_status["total"] += 1
    
    if status_update.status == "success":
        pipeline_status["success"] += 1
        if pipeline_status["active"] > 0:
            pipeline_status["active"] -= 1
    elif status_update.status == "failure":
        pipeline_status["failed"] += 1
        if pipeline_status["active"] > 0:
            pipeline_status["active"] -= 1
    elif status_update.status == "running":
        pipeline_status["active"] += 1
    
    # Add to build history
    build_entry = {
        "pipeline_name": status_update.pipeline_name,
        "build_number": status_update.build_number or pipeline_status["total"],
        "status": status_update.status,
        "stage": status_update.stage,
        "timestamp": datetime.now().isoformat(),
        "message": status_update.message
    }
    pipeline_status["builds"].insert(0, build_entry)
    pipeline_status["builds"] = pipeline_status["builds"][:50]  # Keep last 50
    
    # Add log entry
    log_entry = {
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "level": "success" if status_update.status == "success" else "error" if status_update.status == "failure" else "info",
        "message": status_update.message or f"Pipeline {status_update.pipeline_name} - {status_update.status}"
    }
    deployment_logs.insert(0, log_entry)
    deployment_logs[:100]  # Keep last 100
    
    return {"status": "received", "build": build_entry}


# Deployment events
@app.post("/deployments/event")
async def record_deployment_event(event: DeploymentEvent):
    """Record deployment lifecycle events"""
    log_entry = {
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "level": "success" if event.status == "success" else "error" if event.status == "failure" else "info",
        "message": f"{event.event_type}: {event.status}" + (f" - {event.details}" if event.details else "")
    }
    deployment_logs.insert(0, log_entry)
    return {"status": "recorded", "log": log_entry}


# Metrics endpoints
@app.get("/metrics/deployments")
async def get_deployments():
    """Get deployment metrics"""
    return {
        "total": pipeline_status["total"],
        "this_month": pipeline_status["total"],
        "success": pipeline_status["success"],
        "failed": pipeline_status["failed"]
    }


@app.get("/metrics/pipelines")
async def get_pipelines():
    """Get pipeline metrics"""
    # Try to fetch from Jenkins API
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{JENKINS_URL}/api/json",
                auth=(JENKINS_USER, JENKINS_TOKEN) if JENKINS_TOKEN else None,
                timeout=5.0
            )
            if response.status_code == 200:
                jenkins_data = response.json()
                jobs = jenkins_data.get("jobs", [])
                return {
                    "total": len(jobs),
                    "active": pipeline_status["active"],
                    "jobs": [{"name": j.get("name"), "color": j.get("color")} for j in jobs]
                }
    except Exception as e:
        print(f"Jenkins API error: {e}")
    
    # Fallback to tracked data
    return {
        "total": pipeline_status["total"],
        "active": pipeline_status["active"],
        "jobs": []
    }


@app.get("/metrics/docker-images")
async def get_docker_images():
    """Get Docker Hub image count"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://hub.docker.com/v2/repositories/{DOCKERHUB_USER}/{DOCKERHUB_REPO}/tags/",
                timeout=10.0
            )
            if response.status_code == 200:
                data = response.json()
                return {
                    "count": data.get("count", 0),
                    "source": "DockerHub",
                    "repository": f"{DOCKERHUB_USER}/{DOCKERHUB_REPO}",
                    "tags": [t.get("name") for t in data.get("results", [])[:10]]
                }
    except Exception as e:
        print(f"Docker Hub API error: {e}")
    
    # Fallback
    return {
        "count": 0,
        "source": "DockerHub",
        "repository": f"{DOCKERHUB_USER}/{DOCKERHUB_REPO}",
        "tags": []
    }


@app.get("/metrics/success-rate")
async def get_success_rate():
    """Calculate deployment success rate"""
    total = pipeline_status["success"] + pipeline_status["failed"]
    if total == 0:
        rate = 100.0
    else:
        rate = round((pipeline_status["success"] / total) * 100, 1)
    
    return {
        "rate": rate,
        "success": pipeline_status["success"],
        "failed": pipeline_status["failed"],
        "total": total
    }


@app.get("/metrics/all")
async def get_all_metrics():
    """Get all metrics in one call"""
    deployments = await get_deployments()
    pipelines = await get_pipelines()
    docker_images = await get_docker_images()
    success_rate = await get_success_rate()
    
    return {
        "deployments": deployments,
        "pipelines": pipelines,
        "docker_images": docker_images,
        "success_rate": success_rate,
        "timestamp": datetime.now().isoformat()
    }


@app.get("/logs/recent")
async def get_recent_logs(limit: int = 20):
    """Get recent deployment logs"""
    return {
        "logs": deployment_logs[:limit],
        "total": len(deployment_logs)
    }


@app.get("/pipelines/recent")
async def get_recent_pipelines(limit: int = 10):
    """Get recent pipeline builds"""
    return {
        "builds": pipeline_status["builds"][:limit],
        "total": len(pipeline_status["builds"])
    }


# Jenkins job details
@app.get("/jenkins/job/{job_name}")
async def get_jenkins_job(job_name: str):
    """Get details for a specific Jenkins job"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{JENKINS_URL}/job/{job_name}/api/json",
                auth=(JENKINS_USER, JENKINS_TOKEN) if JENKINS_TOKEN else None,
                timeout=5.0
            )
            if response.status_code == 200:
                return response.json()
    except Exception as e:
        print(f"Jenkins job API error: {e}")
    
    raise HTTPException(status_code=404, detail="Job not found or Jenkins unavailable")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
