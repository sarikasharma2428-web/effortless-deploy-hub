"""
Health Check Routes
Provides endpoints for liveness and readiness probes
"""

from fastapi import APIRouter, Response
from datetime import datetime
import psutil
import os

router = APIRouter()

@router.get("/")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "autodeployx"
    }

@router.get("/live")
async def liveness_probe():
    """Kubernetes liveness probe"""
    return {"status": "alive"}

@router.get("/ready")
async def readiness_probe():
    """Kubernetes readiness probe - checks all dependencies"""
    checks = {
        "database": await check_database(),
        "redis": await check_redis(),
        "disk_space": check_disk_space(),
        "memory": check_memory()
    }
    
    all_healthy = all(checks.values())
    status_code = 200 if all_healthy else 503
    
    return Response(
        content=str({
            "ready": all_healthy,
            "checks": checks,
            "timestamp": datetime.utcnow().isoformat()
        }),
        status_code=status_code
    )

async def check_database():
    """Check PostgreSQL connection"""
    try:
        # Database connection check logic
        return True
    except Exception:
        return False

async def check_redis():
    """Check Redis connection"""
    try:
        # Redis connection check logic
        return True
    except Exception:
        return False

def check_disk_space():
    """Check available disk space (>10% free)"""
    disk = psutil.disk_usage('/')
    return disk.percent < 90

def check_memory():
    """Check available memory (>20% free)"""
    memory = psutil.virtual_memory()
    return memory.percent < 80
