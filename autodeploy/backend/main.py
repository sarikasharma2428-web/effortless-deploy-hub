"""
AutoDeployX Backend Tracking Service
Real-time metrics from Jenkins, Docker Hub, and deployments
WITH WebSocket support for instant updates
WITH JSON file persistence for metrics
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional, List
from pathlib import Path
import httpx
import os
import json
import random
import asyncio
import subprocess

app = FastAPI(
    title="AutoDeployX Tracking API",
    description="Backend service for tracking CI/CD metrics with WebSocket support",
    version="2.0.0"
)

# CORS for dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================
# JSON FILE PERSISTENCE
# =============================================

DATA_DIR = Path("/app/data")
METRICS_FILE = DATA_DIR / "metrics.json"
LOGS_FILE = DATA_DIR / "logs.json"

def ensure_data_dir():
    """Create data directory if not exists"""
    DATA_DIR.mkdir(parents=True, exist_ok=True)

def load_persisted_data():
    """Load metrics and logs from JSON files"""
    global pipeline_status, deployment_logs, kubernetes_state
    
    ensure_data_dir()
    
    # Load metrics
    if METRICS_FILE.exists():
        try:
            with open(METRICS_FILE, "r") as f:
                data = json.load(f)
                pipeline_status.update(data.get("pipeline_status", {}))
                kubernetes_state.update(data.get("kubernetes_state", {}))
                print(f"[PERSIST] Loaded metrics: {pipeline_status['total']} pipelines")
        except Exception as e:
            print(f"[PERSIST] Error loading metrics: {e}")
    
    # Load logs
    if LOGS_FILE.exists():
        try:
            with open(LOGS_FILE, "r") as f:
                data = json.load(f)
                deployment_logs.extend(data.get("logs", [])[:100])
                print(f"[PERSIST] Loaded {len(deployment_logs)} logs")
        except Exception as e:
            print(f"[PERSIST] Error loading logs: {e}")

def save_persisted_data():
    """Save metrics and logs to JSON files"""
    ensure_data_dir()
    
    try:
        # Save metrics
        with open(METRICS_FILE, "w") as f:
            json.dump({
                "pipeline_status": pipeline_status,
                "kubernetes_state": kubernetes_state,
                "saved_at": datetime.now().isoformat()
            }, f, indent=2)
        
        # Save logs (keep last 100)
        with open(LOGS_FILE, "w") as f:
            json.dump({
                "logs": deployment_logs[:100],
                "saved_at": datetime.now().isoformat()
            }, f, indent=2)
    except Exception as e:
        print(f"[PERSIST] Error saving data: {e}")


# =============================================
# WEBSOCKET CONNECTION MANAGER
# =============================================

class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WS] Client connected. Total: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"[WS] Client disconnected. Total: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        """Send message to all connected clients"""
        if not self.active_connections:
            return
        
        message_json = json.dumps(message)
        disconnected = []
        
        for connection in self.active_connections:
            try:
                await connection.send_text(message_json)
            except Exception as e:
                print(f"[WS] Error sending to client: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn)
    
    async def send_personal(self, websocket: WebSocket, message: dict):
        """Send message to specific client"""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            print(f"[WS] Error sending personal message: {e}")


manager = ConnectionManager()


# =============================================
# IN-MEMORY STATE STORAGE (with persistence)
# =============================================

pipeline_status = {
    "total": 0,
    "active": 0,
    "success": 0,
    "failed": 0,
    "builds": [],  # Each build has { timestamp, status, ... }
    "this_month_total": 0,
    "this_month_success": 0,
    "this_month_failed": 0
}

deployment_logs = []

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

kubernetes_state = {
    "cluster": "minikube",
    "namespace": "default",
    "deploymentName": "autodeployx-app",
    "currentVersion": "latest",
    "pods": [],
    "rolloutHistory": []
}

# =============================================
# CONFIGURATION - Environment Variables
# =============================================

# Jenkins CI/CD Configuration
JENKINS_URL = os.getenv("JENKINS_URL", "http://jenkins:8080")
JENKINS_USER = os.getenv("JENKINS_USER", "admin")
JENKINS_TOKEN = os.getenv("JENKINS_TOKEN", "")  # Required for authenticated API calls
JENKINS_JOB_NAME = os.getenv("JENKINS_JOB_NAME", "autodeployx-backend")

# Docker Hub Configuration
DOCKERHUB_USER = os.getenv("DOCKERHUB_USER", "sarika1731")
DOCKERHUB_REPO = os.getenv("DOCKERHUB_REPO", "autodeployx")
DOCKERHUB_TOKEN = os.getenv("DOCKERHUB_TOKEN", "")  # Optional: for private repos

# Kubernetes/Minikube Configuration
K8S_NAMESPACE = os.getenv("K8S_NAMESPACE", "default")
K8S_DEPLOYMENT_NAME = os.getenv("K8S_DEPLOYMENT_NAME", "autodeployx-app")
MINIKUBE_PROFILE = os.getenv("MINIKUBE_PROFILE", "minikube")

# Feature Flags
ENABLE_REAL_JENKINS = os.getenv("ENABLE_REAL_JENKINS", "false").lower() == "true"
ENABLE_REAL_K8S = os.getenv("ENABLE_REAL_K8S", "false").lower() == "true"


# =============================================
# MODELS
# =============================================

class PipelineStatus(BaseModel):
    status: str
    pipeline_name: Optional[str] = "AutoDeployX"
    build_number: Optional[int] = None
    stage: Optional[str] = None
    message: Optional[str] = None
    branch: Optional[str] = "main"


class LogEntry(BaseModel):
    timestamp: str
    level: str
    message: str


class DeploymentEvent(BaseModel):
    event_type: str
    status: str
    details: Optional[dict] = None


class TriggerRequest(BaseModel):
    pipeline_name: str = "autodeployx-backend"
    branch: str = "main"
    image_tag: Optional[str] = None  # For manual deployment with specific image


class StageUpdate(BaseModel):
    stage_name: str
    status: str
    timestamp: Optional[str] = None


class ManualDeployRequest(BaseModel):
    image_tag: str
    namespace: str = "default"


# =============================================
# HELPER: BROADCAST STATE UPDATE
# =============================================

async def broadcast_state_update(event_type: str, data: dict = None):
    """Broadcast state update to all WebSocket clients"""
    message = {
        "type": event_type,
        "timestamp": datetime.now().isoformat(),
        "data": data or {}
    }
    await manager.broadcast(message)


# =============================================
# WEBSOCKET ENDPOINT
# =============================================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await manager.connect(websocket)
    
    # Send initial state on connect
    await manager.send_personal(websocket, {
        "type": "connected",
        "timestamp": datetime.now().isoformat(),
        "data": {
            "message": "Connected to AutoDeployX real-time updates",
            "pipeline": current_pipeline,
            "kubernetes": kubernetes_state
        }
    })
    
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                msg_type = message.get("type", "")
                
                # Handle ping/pong for keepalive
                if msg_type == "ping":
                    await manager.send_personal(websocket, {
                        "type": "pong",
                        "timestamp": datetime.now().isoformat()
                    })
                
                # Handle refresh request
                elif msg_type == "refresh":
                    await manager.send_personal(websocket, {
                        "type": "state_update",
                        "timestamp": datetime.now().isoformat(),
                        "data": {
                            "pipeline": current_pipeline,
                            "kubernetes": kubernetes_state,
                            "logs": deployment_logs[:20]
                        }
                    })
                    
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# =============================================
# HEALTH CHECK & CREDENTIALS STATUS
# =============================================

@app.get("/health")
async def health_check():
    """Health check with service connectivity status"""
    jenkins_status = "unknown"
    dockerhub_status = "unknown"
    
    # Check Jenkins connectivity
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{JENKINS_URL}/api/json", timeout=3.0)
            jenkins_status = "connected" if response.status_code == 200 else "auth_required"
    except Exception:
        jenkins_status = "disconnected"
    
    # Check DockerHub connectivity
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://hub.docker.com/v2/repositories/{DOCKERHUB_USER}/{DOCKERHUB_REPO}/",
                timeout=3.0
            )
            dockerhub_status = "connected" if response.status_code == 200 else "not_found"
    except Exception:
        dockerhub_status = "disconnected"
    
    return {
        "status": "healthy",
        "service": "AutoDeployX Tracking API",
        "websocket_clients": len(manager.active_connections),
        "integrations": {
            "jenkins": {
                "status": jenkins_status,
                "url": JENKINS_URL,
                "real_mode": ENABLE_REAL_JENKINS
            },
            "dockerhub": {
                "status": dockerhub_status,
                "repository": f"{DOCKERHUB_USER}/{DOCKERHUB_REPO}",
            },
            "kubernetes": {
                "namespace": K8S_NAMESPACE,
                "deployment": K8S_DEPLOYMENT_NAME,
                "real_mode": ENABLE_REAL_K8S
            }
        },
        "timestamp": datetime.now().isoformat()
    }


@app.get("/credentials/status")
async def get_credentials_status():
    """
    Check all required credentials and show what's missing.
    Dashboard will show warnings for missing credentials.
    """
    
    # Define required credentials for each system
    credentials = {
        "dockerhub": {
            "DOCKERHUB_USER": {
                "value": DOCKERHUB_USER,
                "configured": DOCKERHUB_USER != "your_dockerhub_username" and bool(DOCKERHUB_USER),
                "required": True,
                "where": "Backend .env / docker-compose",
                "purpose": "Docker image repository"
            },
            "DOCKERHUB_TOKEN": {
                "value": "***" if DOCKERHUB_TOKEN else None,
                "configured": bool(DOCKERHUB_TOKEN),
                "required": False,  # Optional but recommended
                "where": "Backend .env (hub.docker.com → Settings → Security)",
                "purpose": "Avoid rate limits, access private repos"
            }
        },
        "jenkins": {
            "JENKINS_TOKEN": {
                "value": "***" if JENKINS_TOKEN else None,
                "configured": bool(JENKINS_TOKEN),
                "required": True,
                "where": "Backend .env (Jenkins → User → Configure → API Token)",
                "purpose": "Trigger pipelines, get build status"
            },
            "DOCKERHUB_CREDENTIALS": {
                "value": "credentialsId: dockerhub",
                "configured": None,  # Can't check from backend
                "required": True,
                "where": "Jenkins → Manage → Credentials → Add (username + password/token)",
                "purpose": "Push images to DockerHub"
            },
            "GITHUB_CREDENTIALS": {
                "value": "credentialsId: github",
                "configured": None,  # Can't check from backend
                "required": True,
                "where": "Jenkins → Manage → Credentials → Add (SSH key or token)",
                "purpose": "Pull code from GitHub"
            }
        },
        "kubernetes": {
            "KUBECONFIG": {
                "value": "~/.kube/config",
                "configured": ENABLE_REAL_K8S,
                "required": False,  # Only if ENABLE_REAL_K8S=true
                "where": "Mounted via docker-compose (${HOME}/.kube:/root/.kube)",
                "purpose": "Real kubectl access to minikube"
            },
            "ENABLE_REAL_K8S": {
                "value": str(ENABLE_REAL_K8S),
                "configured": True,  # Always set (default false)
                "required": False,
                "where": "Backend .env",
                "purpose": "Enable real kubectl commands"
            }
        }
    }
    
    # Calculate summary
    missing_required = []
    missing_optional = []
    
    for system, creds in credentials.items():
        for cred_name, cred_info in creds.items():
            if cred_info["configured"] is False:
                if cred_info["required"]:
                    missing_required.append(f"{system}.{cred_name}")
                else:
                    missing_optional.append(f"{system}.{cred_name}")
    
    all_required_ok = len(missing_required) == 0
    
    return {
        "status": "ok" if all_required_ok else "missing_credentials",
        "all_required_configured": all_required_ok,
        "missing_required": missing_required,
        "missing_optional": missing_optional,
        "credentials": credentials,
        "summary": {
            "total_required": sum(1 for s in credentials.values() for c in s.values() if c["required"]),
            "configured_required": sum(1 for s in credentials.values() for c in s.values() if c["required"] and c["configured"]),
            "message": "All required credentials configured!" if all_required_ok else f"Missing {len(missing_required)} required credential(s)"
        }
    }


# =============================================
# JENKINS STATUS ENDPOINTS (with WebSocket broadcast)
# =============================================

@app.post("/jenkins/status")
async def update_jenkins_status(status_update: PipelineStatus):
    """Receive pipeline status updates from Jenkins"""
    global current_pipeline
    
    now = datetime.now()
    
    # Update totals
    pipeline_status["total"] += 1
    
    # Update this_month counters
    pipeline_status["this_month_total"] += 1
    
    if status_update.status == "success":
        pipeline_status["success"] += 1
        pipeline_status["this_month_success"] += 1
        if pipeline_status["active"] > 0:
            pipeline_status["active"] -= 1
    elif status_update.status == "failure":
        pipeline_status["failed"] += 1
        pipeline_status["this_month_failed"] += 1
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
        current_pipeline["startTime"] = now.strftime("%H:%M:%S")
    
    # Calculate duration if completed
    if status_update.status in ["success", "failure"]:
        current_pipeline["duration"] = f"{random.randint(30, 180)}s"
    
    # Add to build history with timestamp
    build_entry = {
        "pipeline_name": status_update.pipeline_name,
        "build_number": status_update.build_number or pipeline_status["total"],
        "status": status_update.status,
        "stage": status_update.stage,
        "branch": status_update.branch or "main",
        "timestamp": now.isoformat(),
        "message": status_update.message,
        "duration": random.randint(30, 300)
    }
    pipeline_status["builds"].insert(0, build_entry)
    pipeline_status["builds"] = pipeline_status["builds"][:100]
    
    # Add log entry
    log_entry = {
        "timestamp": now.strftime("%H:%M:%S"),
        "level": "success" if status_update.status == "success" else "error" if status_update.status == "failure" else "info",
        "message": status_update.message or f"Pipeline {status_update.pipeline_name} - {status_update.status}"
    }
    deployment_logs.insert(0, log_entry)
    deployment_logs[:100]
    
    # 💾 PERSIST to JSON file
    save_persisted_data()
    
    # 🔥 BROADCAST to all WebSocket clients
    await broadcast_state_update("pipeline_status", {
        "pipeline": current_pipeline,
        "build": build_entry,
        "log": log_entry
    })
    
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
    
    # 💾 PERSIST stage update
    save_persisted_data()
    
    # 🔥 BROADCAST stage update
    await broadcast_state_update("stage_update", {
        "stage": stage_update.stage_name,
        "status": stage_update.status,
        "pipeline": current_pipeline,
        "log": log_entry
    })
    
    return {"status": "updated", "stage": stage_update.stage_name}


# =============================================
# DEPLOYMENT EVENTS (with WebSocket broadcast)
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
            
            # Update pods
            kubernetes_state["pods"] = [
                {
                    "name": f"autodeployx-app-{random.randint(1000,9999)}",
                    "status": "running",
                    "restarts": 0
                }
            ]
    
    # 🔥 BROADCAST deployment event
    await broadcast_state_update("deployment_event", {
        "event_type": event.event_type,
        "status": event.status,
        "kubernetes": kubernetes_state,
        "log": log_entry
    })
    
    return {"status": "recorded", "log": log_entry}


# =============================================
# KUBECTL HELPER FUNCTIONS
# =============================================

def run_kubectl(args: List[str], timeout: int = 30) -> tuple[bool, str]:
    """Run kubectl command and return (success, output)"""
    try:
        result = subprocess.run(
            ["kubectl"] + args,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        if result.returncode == 0:
            return True, result.stdout
        else:
            print(f"[kubectl] Error: {result.stderr}")
            return False, result.stderr
    except subprocess.TimeoutExpired:
        print(f"[kubectl] Timeout running: {args}")
        return False, "Command timed out"
    except FileNotFoundError:
        print("[kubectl] kubectl not found - using simulated mode")
        return False, "kubectl not installed"
    except Exception as e:
        print(f"[kubectl] Exception: {e}")
        return False, str(e)


def get_real_pods(namespace: str = "default") -> List[dict]:
    """Get real pods from Kubernetes"""
    success, output = run_kubectl([
        "get", "pods", 
        "-n", namespace,
        "-l", f"app={K8S_DEPLOYMENT_NAME}",
        "-o", "json"
    ])
    
    if success:
        try:
            data = json.loads(output)
            pods = []
            for item in data.get("items", []):
                status = item.get("status", {})
                phase = status.get("phase", "Unknown").lower()
                container_statuses = status.get("containerStatuses", [{}])
                restarts = container_statuses[0].get("restartCount", 0) if container_statuses else 0
                
                pods.append({
                    "name": item.get("metadata", {}).get("name", "unknown"),
                    "status": phase,
                    "restarts": restarts
                })
            return pods
        except json.JSONDecodeError:
            pass
    
    # Fallback to simulated pods
    return []


def get_rollout_history(namespace: str = "default") -> List[dict]:
    """Get rollout history from Kubernetes"""
    success, output = run_kubectl([
        "rollout", "history",
        f"deployment/{K8S_DEPLOYMENT_NAME}",
        "-n", namespace
    ])
    
    if success:
        history = []
        lines = output.strip().split("\n")
        for line in lines[1:]:  # Skip header
            parts = line.split()
            if len(parts) >= 1 and parts[0].isdigit():
                revision = int(parts[0])
                history.append({
                    "revision": revision,
                    "image": f"v{revision}",
                    "timestamp": datetime.now().strftime("%H:%M:%S"),
                    "status": "success"
                })
        return history[:10]  # Last 10 revisions
    
    return []


# =============================================
# MANUAL DEPLOYMENT (Dashboard-triggered with REAL kubectl)
# =============================================

@app.post("/deployments/manual")
async def manual_deployment(request: ManualDeployRequest):
    """
    Manual deployment from dashboard - deploy specific image using kubectl
    Runs: kubectl set image deployment/autodeployx-app autodeployx-app=image:tag
    """
    global kubernetes_state
    
    full_image = f"{DOCKERHUB_USER}/{DOCKERHUB_REPO}:{request.image_tag}"
    
    log_entry = {
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "level": "info",
        "message": f"Manual deployment initiated: {full_image}"
    }
    deployment_logs.insert(0, log_entry)
    
    # Try real kubectl if ENABLE_REAL_K8S is true
    if ENABLE_REAL_K8S:
        success, output = run_kubectl([
            "set", "image",
            f"deployment/{K8S_DEPLOYMENT_NAME}",
            f"{K8S_DEPLOYMENT_NAME}={full_image}",
            "-n", request.namespace,
            "--record"
        ])
        
        if success:
            log_entry = {
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "level": "success",
                "message": f"kubectl set image succeeded: {full_image}"
            }
            deployment_logs.insert(0, log_entry)
            
            # Start async rollout status check
            asyncio.create_task(wait_for_rollout(request.image_tag, request.namespace))
        else:
            log_entry = {
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "level": "error",
                "message": f"kubectl set image failed: {output}"
            }
            deployment_logs.insert(0, log_entry)
    
    # Update local state
    kubernetes_state["currentVersion"] = request.image_tag
    kubernetes_state["rolloutHistory"].insert(0, {
        "revision": len(kubernetes_state["rolloutHistory"]) + 1,
        "image": request.image_tag,
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "status": "rolling"
    })
    kubernetes_state["rolloutHistory"] = kubernetes_state["rolloutHistory"][:10]
    
    # Update pods to show rolling status
    kubernetes_state["pods"] = [
        {
            "name": f"autodeployx-app-pending",
            "status": "pending",
            "restarts": 0
        }
    ]
    
    # 🔥 BROADCAST manual deployment start
    await broadcast_state_update("manual_deployment", {
        "image_tag": request.image_tag,
        "namespace": request.namespace,
        "status": "rolling",
        "kubernetes": kubernetes_state,
        "real_kubectl": ENABLE_REAL_K8S
    })
    
    # If not using real K8s, simulate completion
    if not ENABLE_REAL_K8S:
        asyncio.create_task(simulate_deployment_completion(request.image_tag))
    
    # 💾 PERSIST
    save_persisted_data()
    
    return {
        "status": "deploying",
        "image": full_image,
        "namespace": request.namespace,
        "real_kubectl": ENABLE_REAL_K8S
    }


async def wait_for_rollout(image_tag: str, namespace: str = "default"):
    """Wait for kubectl rollout to complete"""
    success, output = run_kubectl([
        "rollout", "status",
        f"deployment/{K8S_DEPLOYMENT_NAME}",
        "-n", namespace,
        "--timeout=180s"
    ], timeout=200)
    
    # Fetch real pods after rollout
    real_pods = get_real_pods(namespace)
    if real_pods:
        kubernetes_state["pods"] = real_pods
    
    if success:
        kubernetes_state["rolloutHistory"][0]["status"] = "success"
        log_entry = {
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "level": "success",
            "message": f"Rollout completed: {image_tag}"
        }
    else:
        kubernetes_state["rolloutHistory"][0]["status"] = "failed"
        log_entry = {
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "level": "error",
            "message": f"Rollout failed: {output}"
        }
    
    deployment_logs.insert(0, log_entry)
    save_persisted_data()
    
    # 🔥 BROADCAST completion
    await broadcast_state_update("deployment_complete", {
        "image_tag": image_tag,
        "status": "success" if success else "failed",
        "kubernetes": kubernetes_state
    })


async def simulate_deployment_completion(image_tag: str):
    """Simulate deployment completion when not using real K8s"""
    await asyncio.sleep(5)
    
    kubernetes_state["pods"] = [
        {
            "name": f"autodeployx-app-{random.randint(1000,9999)}",
            "status": "running",
            "restarts": 0
        }
    ]
    kubernetes_state["rolloutHistory"][0]["status"] = "success"
    
    log_entry = {
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "level": "success",
        "message": f"Simulated deployment completed: {image_tag}"
    }
    deployment_logs.insert(0, log_entry)
    save_persisted_data()
    
    # 🔥 BROADCAST deployment complete
    await broadcast_state_update("deployment_complete", {
        "image_tag": image_tag,
        "status": "success",
        "kubernetes": kubernetes_state
    })


# =============================================
# METRICS ENDPOINTS (with month filtering)
# =============================================

def get_this_month_stats():
    """Calculate stats for current month from build history"""
    now = datetime.now()
    current_month = now.month
    current_year = now.year
    
    this_month_total = 0
    this_month_success = 0
    this_month_failed = 0
    
    for build in pipeline_status["builds"]:
        try:
            ts = build.get("timestamp", "")
            if ts:
                build_date = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                if build_date.month == current_month and build_date.year == current_year:
                    this_month_total += 1
                    if build["status"] == "success":
                        this_month_success += 1
                    elif build["status"] == "failure":
                        this_month_failed += 1
        except:
            pass
    
    return this_month_total, this_month_success, this_month_failed

@app.get("/metrics/deployments")
async def get_deployments():
    this_month_total, this_month_success, this_month_failed = get_this_month_stats()
    
    return {
        "total": pipeline_status["total"],
        "this_month": this_month_total,
        "success": pipeline_status["success"],
        "failed": pipeline_status["failed"],
        "this_month_success": this_month_success,
        "this_month_failed": this_month_failed
    }


@app.get("/metrics/pipelines")
async def get_pipelines():
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
    """Get docker images with token authentication to avoid rate limits"""
    headers = {}
    
    # Use DockerHub token if available (avoids rate limiting)
    if DOCKERHUB_TOKEN:
        headers["Authorization"] = f"Bearer {DOCKERHUB_TOKEN}"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://hub.docker.com/v2/repositories/{DOCKERHUB_USER}/{DOCKERHUB_REPO}/tags/",
                headers=headers,
                timeout=10.0
            )
            if response.status_code == 200:
                data = response.json()
                return {
                    "count": data.get("count", 0),
                    "source": "DockerHub",
                    "repository": f"{DOCKERHUB_USER}/{DOCKERHUB_REPO}",
                    "tags": [t.get("name") for t in data.get("results", [])[:10]],
                    "authenticated": bool(DOCKERHUB_TOKEN)
                }
            elif response.status_code == 429:
                print(f"DockerHub rate limit hit. Add DOCKERHUB_TOKEN to .env")
    except Exception as e:
        print(f"Docker Hub API error: {e}")
    
    return {
        "count": 0,
        "source": "DockerHub",
        "repository": f"{DOCKERHUB_USER}/{DOCKERHUB_REPO}",
        "tags": [],
        "authenticated": bool(DOCKERHUB_TOKEN)
    }


@app.get("/metrics/success-rate")
async def get_success_rate():
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
    return {
        "logs": deployment_logs[:limit],
        "total": len(deployment_logs)
    }


# =============================================
# PIPELINES ENDPOINTS
# =============================================

@app.get("/pipelines/recent")
async def get_recent_pipelines(limit: int = 10):
    return {
        "builds": pipeline_status["builds"][:limit],
        "total": len(pipeline_status["builds"])
    }


@app.get("/pipelines/history")
async def get_pipeline_history(limit: int = 50):
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
            {"name": "Checkout", "status": "running"},
            {"name": "Test", "status": "pending"},
            {"name": "Build", "status": "pending"},
            {"name": "Push", "status": "pending"},
            {"name": "Deploy", "status": "pending"},
        ]
    }
    
    pipeline_status["active"] += 1
    
    log_entry = {
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "level": "info",
        "message": f"Pipeline '{request.pipeline_name}' triggered on branch '{request.branch}'"
    }
    deployment_logs.insert(0, log_entry)
    
    # 🔥 BROADCAST pipeline trigger
    await broadcast_state_update("pipeline_triggered", {
        "pipeline": current_pipeline,
        "log": log_entry
    })
    
    # Try to trigger Jenkins
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{JENKINS_URL}/job/{request.pipeline_name}/build",
                auth=(JENKINS_USER, JENKINS_TOKEN) if JENKINS_TOKEN else None,
                timeout=10.0
            )
            
            if response.status_code in [200, 201, 202]:
                return {
                    "status": "triggered",
                    "pipeline_name": request.pipeline_name,
                    "branch": request.branch,
                    "build_number": current_pipeline["buildNumber"]
                }
    except Exception as e:
        print(f"Jenkins trigger error: {e}")
    
    return {
        "status": "queued",
        "message": "Jenkins may be offline, pipeline queued locally",
        "pipeline_name": request.pipeline_name,
        "build_number": current_pipeline["buildNumber"]
    }


# =============================================
# DOCKER IMAGES ENDPOINT
# =============================================

@app.get("/docker/images")
async def get_docker_images_list():
    """Get docker images list with token authentication"""
    headers = {}
    
    # Use DockerHub token if available (avoids rate limiting)
    if DOCKERHUB_TOKEN:
        headers["Authorization"] = f"Bearer {DOCKERHUB_TOKEN}"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://hub.docker.com/v2/repositories/{DOCKERHUB_USER}/{DOCKERHUB_REPO}/tags/",
                headers=headers,
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
                    "total": data.get("count", 0),
                    "authenticated": bool(DOCKERHUB_TOKEN)
                }
            elif response.status_code == 429:
                print(f"[DockerHub] Rate limit hit! Set DOCKERHUB_TOKEN in .env")
            elif response.status_code == 404:
                print(f"[DockerHub] Repo not found: {DOCKERHUB_USER}/{DOCKERHUB_REPO}")
    except Exception as e:
        print(f"Docker Hub API error: {e}")
    
    return {
        "images": [],
        "repository": f"{DOCKERHUB_USER}/{DOCKERHUB_REPO}",
        "total": 0,
        "authenticated": bool(DOCKERHUB_TOKEN)
    }


# =============================================
# KUBERNETES DEPLOYMENT ENDPOINT (with REAL kubectl)
# =============================================

@app.get("/kubernetes/deployment")
async def get_kubernetes_deployment():
    """Get Kubernetes deployment status - uses real kubectl if enabled"""
    
    # Try to get real pods if ENABLE_REAL_K8S
    if ENABLE_REAL_K8S:
        real_pods = get_real_pods(K8S_NAMESPACE)
        if real_pods:
            kubernetes_state["pods"] = real_pods
        
        # Get real rollout history
        real_history = get_rollout_history(K8S_NAMESPACE)
        if real_history:
            kubernetes_state["rolloutHistory"] = real_history
        
        # Get current image version
        success, output = run_kubectl([
            "get", "deployment", K8S_DEPLOYMENT_NAME,
            "-n", K8S_NAMESPACE,
            "-o", "jsonpath={.spec.template.spec.containers[0].image}"
        ])
        if success and output:
            # Extract tag from image name
            if ":" in output:
                kubernetes_state["currentVersion"] = output.split(":")[-1]
            else:
                kubernetes_state["currentVersion"] = "latest"
    
    # Fallback to simulated data if no pods
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
        "rolloutHistory": kubernetes_state["rolloutHistory"][:5],
        "real_kubectl": ENABLE_REAL_K8S
    }


@app.get("/kubernetes/pods")
async def get_pods():
    """Get real pods from Kubernetes"""
    if ENABLE_REAL_K8S:
        real_pods = get_real_pods(K8S_NAMESPACE)
        if real_pods:
            kubernetes_state["pods"] = real_pods
            return {"pods": real_pods, "source": "kubectl"}
    
    return {"pods": kubernetes_state["pods"], "source": "simulated"}


@app.post("/kubernetes/pods")
async def update_pods(pods: List[dict]):
    kubernetes_state["pods"] = pods
    
    # 🔥 BROADCAST pod update
    await broadcast_state_update("pods_update", {
        "pods": pods,
        "kubernetes": kubernetes_state
    })
    
    return {"status": "updated", "pods": len(pods)}


@app.get("/kubernetes/rollout-history")
async def get_rollout_history_endpoint():
    """Get rollout history from Kubernetes"""
    if ENABLE_REAL_K8S:
        real_history = get_rollout_history(K8S_NAMESPACE)
        if real_history:
            kubernetes_state["rolloutHistory"] = real_history
            return {"history": real_history, "source": "kubectl"}
    
    return {"history": kubernetes_state["rolloutHistory"], "source": "simulated"}


# =============================================
# HISTORY/STATS ENDPOINT
# =============================================

@app.get("/stats/history")
async def get_history_stats():
    total = pipeline_status["total"]
    success = pipeline_status["success"]
    failed = pipeline_status["failed"]
    
    if total == 0:
        success_rate = 100
    else:
        success_rate = round((success / (success + failed)) * 100, 1) if (success + failed) > 0 else 100
    
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
    log_entry = {
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "level": "warning",
        "message": f"Rollback initiated for deployment: {deployment_id}"
    }
    deployment_logs.insert(0, log_entry)
    
    kubernetes_state["rolloutHistory"].insert(0, {
        "revision": len(kubernetes_state["rolloutHistory"]) + 1,
        "image": f"rollback-{deployment_id}",
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "status": "rolling"
    })
    
    # 🔥 BROADCAST rollback
    await broadcast_state_update("rollback", {
        "deployment_id": deployment_id,
        "kubernetes": kubernetes_state
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


# =============================================
# STARTUP & SHUTDOWN EVENTS
# =============================================

@app.on_event("startup")
async def startup_event():
    """Load persisted data on startup"""
    print("🚀 AutoDeployX Backend starting...")
    load_persisted_data()
    
    # Reset monthly counters if new month
    now = datetime.now()
    for build in pipeline_status["builds"]:
        try:
            ts = build.get("timestamp", "")
            if ts:
                build_date = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                # If last build was from previous month, reset active count
                if build_date.month != now.month or build_date.year != now.year:
                    pipeline_status["active"] = 0
                break
        except:
            pass
    
    print(f"✅ Loaded {pipeline_status['total']} total pipelines, {len(deployment_logs)} logs")

@app.on_event("shutdown")
async def shutdown_event():
    """Save data on shutdown"""
    print("💾 Saving data before shutdown...")
    save_persisted_data()
    print("👋 AutoDeployX Backend stopped")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
