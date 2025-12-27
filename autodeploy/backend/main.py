"""
AutoDeployX Backend Tracking Service
Real-time metrics from Jenkins, Docker Hub, and deployments
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional, List
import httpx
import os
import json
import random

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

# Current pipeline state
current_pipeline = {
    "pipelineName": None,
    "buildNumber": 0,
    "status": "pending",
    "currentStage": "Waiting...",
    "branch": "main",
    "startTime": None,
    "duration": None,
    "stages": []
}

# Kubernetes deployment state
kubernetes_state = {
    "cluster": "minikube",
    "namespace": "default",
    "deploymentName": "autodeployx-app",
    "currentVersion": "latest",
    "pods": [],
    "rolloutHistory": []
}

# Configuration
JENKINS_URL = os.getenv("JENKINS_URL", "http://jenkins:8080")
JENKINS_USER = os.getenv("JENKINS_USER", "admin")
JENKINS_TOKEN = os.getenv("JENKINS_TOKEN", "")
DOCKERHUB_USER = os.getenv("DOCKERHUB_USER", "sarika1731")
DOCKERHUB_REPO = os.getenv("DOCKERHUB_REPO", "autodeployx")


# Models
class PipelineStatus(BaseModel):
    status: str  # success, failure, running, pending
    pipeline_name: Optional[str] = "AutoDeployX"
    build_number: Optional[int] = None
    stage: Optional[str] = None
    message: Optional[str] = None
    branch: Optional[str] = "main"


class LogEntry(BaseModel):
    timestamp: str
    level: str  # info, success, error, warning
    message: str


class DeploymentEvent(BaseModel):
    event_type: str  # build_start, build_end, test_start, test_end, push, deploy
    status: str
    details: Optional[dict] = None


class TriggerRequest(BaseModel):
    pipeline_name: str = "autodeployx-backend"
    branch: str = "main"


class StageUpdate(BaseModel):
    stage_name: str
    status: str  # success, running, failed, pending
    timestamp: Optional[str] = None


# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "AutoDeployX Tracking API",
        "timestamp": datetime.now().isoformat()
    }


# =============================================
# JENKINS STATUS ENDPOINTS
# =============================================

@app.post("/jenkins/status")
async def update_jenkins_status(status_update: PipelineStatus):
    """Receive pipeline status updates from Jenkins"""
    global current_pipeline
    
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
    
    # Update current pipeline
    current_pipeline["pipelineName"] = status_update.pipeline_name
    current_pipeline["buildNumber"] = status_update.build_number or pipeline_status["total"]
    current_pipeline["status"] = status_update.status
    current_pipeline["currentStage"] = status_update.stage or "Processing..."
    current_pipeline["branch"] = status_update.branch or "main"
    
    if status_update.status == "running" and not current_pipeline["startTime"]:
        current_pipeline["startTime"] = datetime.now().strftime("%H:%M:%S")
    
    # Add to build history
    build_entry = {
        "pipeline_name": status_update.pipeline_name,
        "build_number": status_update.build_number or pipeline_status["total"],
        "status": status_update.status,
        "stage": status_update.stage,
        "branch": status_update.branch or "main",
        "timestamp": datetime.now().isoformat(),
        "message": status_update.message,
        "duration": random.randint(30, 300)  # Simulated duration
    }
    pipeline_status["builds"].insert(0, build_entry)
    pipeline_status["builds"] = pipeline_status["builds"][:100]  # Keep last 100
    
    # Add log entry
    log_entry = {
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "level": "success" if status_update.status == "success" else "error" if status_update.status == "failure" else "info",
        "message": status_update.message or f"Pipeline {status_update.pipeline_name} - {status_update.status}"
    }
    deployment_logs.insert(0, log_entry)
    deployment_logs[:100]  # Keep last 100
    
    return {"status": "received", "build": build_entry}


@app.post("/jenkins/stage")
async def update_stage(stage_update: StageUpdate):
    """Update current pipeline stage status"""
    global current_pipeline
    
    # Update or add stage
    stage_found = False
    for stage in current_pipeline["stages"]:
        if stage["name"] == stage_update.stage_name:
            stage["status"] = stage_update.status
            stage["timestamp"] = stage_update.timestamp or datetime.now().strftime("%H:%M:%S")
            stage_found = True
            break
    
    if not stage_found:
        current_pipeline["stages"].append({
            "name": stage_update.stage_name,
            "status": stage_update.status,
            "timestamp": stage_update.timestamp or datetime.now().strftime("%H:%M:%S")
        })
    
    current_pipeline["currentStage"] = stage_update.stage_name
    
    # Add log entry
    log_entry = {
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "level": "success" if stage_update.status == "success" else "error" if stage_update.status == "failed" else "info",
        "message": f"Stage '{stage_update.stage_name}' - {stage_update.status}"
    }
    deployment_logs.insert(0, log_entry)
    
    return {"status": "updated", "stage": stage_update.stage_name}


# =============================================
# DEPLOYMENT EVENTS
# =============================================

@app.post("/deployments/event")
async def record_deployment_event(event: DeploymentEvent):
    """Record deployment lifecycle events"""
    log_entry = {
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "level": "success" if event.status == "success" else "error" if event.status == "failure" else "info",
        "message": f"{event.event_type}: {event.status}" + (f" - {json.dumps(event.details)}" if event.details else "")
    }
    deployment_logs.insert(0, log_entry)
    
    # Update kubernetes state if deploy event
    if event.event_type == "deploy" and event.status == "success":
        if event.details and "version" in event.details:
            kubernetes_state["currentVersion"] = event.details["version"]
            kubernetes_state["rolloutHistory"].insert(0, {
                "revision": len(kubernetes_state["rolloutHistory"]) + 1,
                "image": event.details.get("version", "latest"),
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "status": "success"
            })
            kubernetes_state["rolloutHistory"] = kubernetes_state["rolloutHistory"][:10]
    
    return {"status": "recorded", "log": log_entry}


# =============================================
# METRICS ENDPOINTS
# =============================================

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
    """Get all metrics in one call (Dashboard main endpoint)"""
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


# =============================================
# LOGS ENDPOINT
# =============================================

@app.get("/logs/recent")
async def get_recent_logs(limit: int = 20):
    """Get recent deployment logs"""
    return {
        "logs": deployment_logs[:limit],
        "total": len(deployment_logs)
    }


# =============================================
# PIPELINES ENDPOINTS
# =============================================

@app.get("/pipelines/recent")
async def get_recent_pipelines(limit: int = 10):
    """Get recent pipeline builds"""
    return {
        "builds": pipeline_status["builds"][:limit],
        "total": len(pipeline_status["builds"])
    }


@app.get("/pipelines/history")
async def get_pipeline_history(limit: int = 50):
    """Get full pipeline build history for the Pipelines page"""
    return {
        "builds": pipeline_status["builds"][:limit],
        "total": len(pipeline_status["builds"]),
        "stats": {
            "total": pipeline_status["total"],
            "success": pipeline_status["success"],
            "failed": pipeline_status["failed"],
            "active": pipeline_status["active"]
        }
    }


@app.get("/pipelines/current")
async def get_current_pipeline():
    """Get current running pipeline status (real-time tracking)"""
    # Build stages if empty
    if not current_pipeline["stages"]:
        current_pipeline["stages"] = [
            {"name": "Checkout", "status": "pending"},
            {"name": "Test", "status": "pending"},
            {"name": "Build", "status": "pending"},
            {"name": "Push", "status": "pending"},
            {"name": "Deploy", "status": "pending"},
        ]
    
    return {
        "pipeline": current_pipeline,
        "timestamp": datetime.now().isoformat()
    }


@app.post("/pipelines/trigger")
async def trigger_pipeline(request: TriggerRequest):
    """Trigger a new pipeline build via Jenkins webhook"""
    global current_pipeline
    
    # Reset current pipeline
    current_pipeline = {
        "pipelineName": request.pipeline_name,
        "buildNumber": pipeline_status["total"] + 1,
        "status": "running",
        "currentStage": "Starting...",
        "branch": request.branch,
        "startTime": datetime.now().strftime("%H:%M:%S"),
        "duration": None,
        "stages": [
            {"name": "Checkout", "status": "pending"},
            {"name": "Test", "status": "pending"},
            {"name": "Build", "status": "pending"},
            {"name": "Push", "status": "pending"},
            {"name": "Deploy", "status": "pending"},
        ]
    }
    
    pipeline_status["active"] += 1
    
    # Try to trigger Jenkins
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{JENKINS_URL}/job/{request.pipeline_name}/build",
                auth=(JENKINS_USER, JENKINS_TOKEN) if JENKINS_TOKEN else None,
                timeout=10.0
            )
            
            if response.status_code in [200, 201, 202]:
                log_entry = {
                    "timestamp": datetime.now().strftime("%H:%M:%S"),
                    "level": "info",
                    "message": f"Pipeline '{request.pipeline_name}' triggered successfully on branch '{request.branch}'"
                }
                deployment_logs.insert(0, log_entry)
                
                return {
                    "status": "triggered",
                    "pipeline_name": request.pipeline_name,
                    "branch": request.branch,
                    "build_number": current_pipeline["buildNumber"]
                }
    except Exception as e:
        print(f"Jenkins trigger error: {e}")
    
    # Fallback: Log the trigger attempt
    log_entry = {
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "level": "warning",
        "message": f"Pipeline trigger queued (Jenkins offline): {request.pipeline_name}"
    }
    deployment_logs.insert(0, log_entry)
    
    return {
        "status": "queued",
        "message": "Jenkins may be offline, pipeline queued",
        "pipeline_name": request.pipeline_name,
        "build_number": current_pipeline["buildNumber"]
    }


# =============================================
# DOCKER IMAGES ENDPOINT
# =============================================

@app.get("/docker/images")
async def get_docker_images_list():
    """Get Docker Hub images with details for dashboard"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://hub.docker.com/v2/repositories/{DOCKERHUB_USER}/{DOCKERHUB_REPO}/tags/",
                timeout=10.0
            )
            if response.status_code == 200:
                data = response.json()
                images = []
                for tag in data.get("results", [])[:10]:
                    images.append({
                        "tag": tag.get("name", "unknown"),
                        "pushedAt": tag.get("last_updated", "")[:10] if tag.get("last_updated") else "N/A",
                        "size": f"{round(tag.get('full_size', 0) / 1024 / 1024, 1)} MB" if tag.get('full_size') else "N/A"
                    })
                
                return {
                    "images": images,
                    "repository": f"{DOCKERHUB_USER}/{DOCKERHUB_REPO}",
                    "total": data.get("count", 0)
                }
    except Exception as e:
        print(f"Docker Hub API error: {e}")
    
    return {
        "images": [],
        "repository": f"{DOCKERHUB_USER}/{DOCKERHUB_REPO}",
        "total": 0
    }


# =============================================
# KUBERNETES DEPLOYMENT ENDPOINT
# =============================================

@app.get("/kubernetes/deployment")
async def get_kubernetes_deployment():
    """Get Kubernetes/Minikube deployment status"""
    # In a real scenario, this would call kubectl or Kubernetes API
    # For now, return tracked state
    
    # Simulate pods if empty
    if not kubernetes_state["pods"]:
        kubernetes_state["pods"] = [
            {
                "name": f"autodeployx-app-{random.randint(1000,9999)}",
                "status": "running",
                "restarts": 0
            }
        ]
    
    return {
        "cluster": kubernetes_state["cluster"],
        "namespace": kubernetes_state["namespace"],
        "deploymentName": kubernetes_state["deploymentName"],
        "currentVersion": kubernetes_state["currentVersion"],
        "pods": kubernetes_state["pods"],
        "rolloutHistory": kubernetes_state["rolloutHistory"][:5]
    }


@app.post("/kubernetes/pods")
async def update_pods(pods: List[dict]):
    """Update pod status from kubectl"""
    kubernetes_state["pods"] = pods
    return {"status": "updated", "pods": len(pods)}


# =============================================
# HISTORY/STATS ENDPOINT
# =============================================

@app.get("/stats/history")
async def get_history_stats():
    """Get deployment history statistics"""
    total = pipeline_status["total"]
    success = pipeline_status["success"]
    failed = pipeline_status["failed"]
    
    # Calculate success rate
    if total == 0:
        success_rate = 100
    else:
        success_rate = round((success / (success + failed)) * 100, 1) if (success + failed) > 0 else 100
    
    # Get last success time
    last_success_time = "N/A"
    last_deployed_version = "N/A"
    
    for build in pipeline_status["builds"]:
        if build.get("status") == "success":
            last_success_time = build.get("timestamp", "N/A")
            if "build_number" in build:
                last_deployed_version = f"v{build['build_number']}"
            break
    
    return {
        "totalPipelines": total,
        "successCount": success,
        "failureCount": failed,
        "lastSuccessTime": last_success_time[:19] if len(last_success_time) > 19 else last_success_time,
        "lastDeployedVersion": last_deployed_version,
        "successRate": success_rate
    }


# =============================================
# ROLLBACK ENDPOINT
# =============================================

@app.post("/deployments/{deployment_id}/rollback")
async def rollback_deployment(deployment_id: str):
    """Rollback to a previous deployment version"""
    log_entry = {
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "level": "warning",
        "message": f"Rollback initiated for deployment: {deployment_id}"
    }
    deployment_logs.insert(0, log_entry)
    
    # Add rollback to history
    kubernetes_state["rolloutHistory"].insert(0, {
        "revision": len(kubernetes_state["rolloutHistory"]) + 1,
        "image": f"rollback-{deployment_id}",
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "status": "rolling"
    })
    
    return {
        "status": "rolling_back",
        "deployment_id": deployment_id,
        "message": "Rollback initiated"
    }


# =============================================
# JENKINS JOB DETAILS
# =============================================

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
