"""
AutoDeployX - Main Application Entry Point
FastAPI application with health checks and deployment endpoints
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.health import router as health_router
from routes.deploy import router as deploy_router
from services.worker import BackgroundWorker
import uvicorn

app = FastAPI(
    title="AutoDeployX",
    description="Automated DevOps Deployment Platform",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router, prefix="/health", tags=["Health"])
app.include_router(deploy_router, prefix="/deploy", tags=["Deployment"])

# Initialize background worker
worker = BackgroundWorker()

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    await worker.start()
    print("🚀 AutoDeployX started successfully!")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await worker.stop()
    print("👋 AutoDeployX shutting down...")

@app.get("/")
async def root():
    return {
        "name": "AutoDeployX",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
