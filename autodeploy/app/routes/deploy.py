"""
Deployment Routes
Handles deployment triggers and status checks
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

router = APIRouter()

# In-memory storage for demo (use database in production)
deployments = {}

class DeploymentRequest(BaseModel):
    image: str
    tag: str = "latest"
    replicas: int = 3
    namespace: str = "default"
    environment: Optional[dict] = None

class DeploymentResponse(BaseModel):
    id: str
    status: str
    image: str
    tag: str
    created_at: str

@router.post("/", response_model=DeploymentResponse)
async def create_deployment(
    request: DeploymentRequest,
    background_tasks: BackgroundTasks
):
    """Trigger a new deployment"""
    deployment_id = str(uuid.uuid4())[:8]
    
    deployment = {
        "id": deployment_id,
        "status": "pending",
        "image": request.image,
        "tag": request.tag,
        "replicas": request.replicas,
        "namespace": request.namespace,
        "environment": request.environment,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    
    deployments[deployment_id] = deployment
    
    # Run deployment in background
    background_tasks.add_task(run_deployment, deployment_id)
    
    return DeploymentResponse(**deployment)

@router.get("/{deployment_id}")
async def get_deployment(deployment_id: str):
    """Get deployment status"""
    if deployment_id not in deployments:
        raise HTTPException(status_code=404, detail="Deployment not found")
    return deployments[deployment_id]

@router.get("/")
async def list_deployments():
    """List all deployments"""
    return list(deployments.values())

@router.delete("/{deployment_id}")
async def rollback_deployment(deployment_id: str):
    """Rollback a deployment"""
    if deployment_id not in deployments:
        raise HTTPException(status_code=404, detail="Deployment not found")
    
    deployments[deployment_id]["status"] = "rolled_back"
    return {"message": f"Deployment {deployment_id} rolled back"}

async def run_deployment(deployment_id: str):
    """Background task to run deployment"""
    import asyncio
    
    deployment = deployments[deployment_id]
    deployment["status"] = "running"
    
    # Simulate deployment steps
    await asyncio.sleep(2)
    deployment["status"] = "completed"
    deployment["updated_at"] = datetime.utcnow().isoformat()
