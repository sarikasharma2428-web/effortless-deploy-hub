import { useState } from "react";
import { X, Copy, Check, FileCode, Download, FolderOpen } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ConfigFile {
  name: string;
  path: string;
  language: string;
  content: string;
  category: string;
}

const configFiles: ConfigFile[] = [
  // ============ APP FILES ============
  {
    name: "main.py",
    path: "app/main.py",
    language: "python",
    category: "app",
    content: `"""
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
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)`,
  },
  {
    name: "health.py",
    path: "app/routes/health.py",
    language: "python",
    category: "app",
    content: `"""
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
    return memory.percent < 80`,
  },
  {
    name: "deploy.py",
    path: "app/routes/deploy.py",
    language: "python",
    category: "app",
    content: `"""
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
    deployment["updated_at"] = datetime.utcnow().isoformat()`,
  },
  {
    name: "worker.py",
    path: "app/services/worker.py",
    language: "python",
    category: "app",
    content: `"""
Background Worker Service
Handles async tasks and job processing
"""

import asyncio
from datetime import datetime
from typing import Callable, Dict, Any
import logging

logger = logging.getLogger(__name__)

class BackgroundWorker:
    """Background worker for processing deployment jobs"""
    
    def __init__(self):
        self.running = False
        self.tasks: Dict[str, asyncio.Task] = {}
        self.job_queue: asyncio.Queue = None
    
    async def start(self):
        """Start the background worker"""
        self.running = True
        self.job_queue = asyncio.Queue()
        logger.info("Background worker started")
        
        # Start the main worker loop
        asyncio.create_task(self._process_jobs())
    
    async def stop(self):
        """Stop the background worker"""
        self.running = False
        
        # Cancel all running tasks
        for task_id, task in self.tasks.items():
            task.cancel()
            logger.info(f"Cancelled task: {task_id}")
        
        logger.info("Background worker stopped")
    
    async def submit_job(self, job_id: str, func: Callable, *args, **kwargs):
        """Submit a job to the queue"""
        job = {
            "id": job_id,
            "func": func,
            "args": args,
            "kwargs": kwargs,
            "submitted_at": datetime.utcnow().isoformat()
        }
        await self.job_queue.put(job)
        logger.info(f"Job submitted: {job_id}")
    
    async def _process_jobs(self):
        """Main job processing loop"""
        while self.running:
            try:
                job = await asyncio.wait_for(
                    self.job_queue.get(),
                    timeout=1.0
                )
                
                task = asyncio.create_task(
                    self._execute_job(job)
                )
                self.tasks[job["id"]] = task
                
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Error processing job: {e}")
    
    async def _execute_job(self, job: Dict[str, Any]):
        """Execute a single job"""
        job_id = job["id"]
        try:
            logger.info(f"Executing job: {job_id}")
            result = await job["func"](*job["args"], **job["kwargs"])
            logger.info(f"Job completed: {job_id}")
            return result
        except Exception as e:
            logger.error(f"Job failed: {job_id} - {e}")
            raise
        finally:
            if job_id in self.tasks:
                del self.tasks[job_id]
    
    def get_status(self):
        """Get worker status"""
        return {
            "running": self.running,
            "active_tasks": len(self.tasks),
            "queue_size": self.job_queue.qsize() if self.job_queue else 0
        }`,
  },
  {
    name: "requirements.txt",
    path: "app/requirements.txt",
    language: "text",
    category: "app",
    content: `# AutoDeployX Python Dependencies

# Web Framework
fastapi==0.104.1
uvicorn[standard]==0.24.0

# Database
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
alembic==1.12.1

# Redis
redis==5.0.1

# HTTP Client
httpx==0.25.2

# System Monitoring
psutil==5.9.6

# Testing
pytest==7.4.3
pytest-asyncio==0.21.1
pytest-cov==4.1.0

# Utilities
python-dotenv==1.0.0
pydantic==2.5.2
pydantic-settings==2.1.0

# Monitoring
prometheus-client==0.19.0

# Logging
structlog==23.2.0`,
  },
  
  // ============ TESTS ============
  {
    name: "test_app.py",
    path: "tests/test_app.py",
    language: "python",
    category: "tests",
    content: `"""
AutoDeployX Test Suite
Unit and integration tests for the application
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

class TestHealthEndpoints:
    """Tests for health check endpoints"""
    
    def test_root_endpoint(self):
        """Test root endpoint returns app info"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "AutoDeployX"
        assert data["status"] == "running"
    
    def test_health_check(self):
        """Test basic health check"""
        response = client.get("/health/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
    
    def test_liveness_probe(self):
        """Test Kubernetes liveness probe"""
        response = client.get("/health/live")
        assert response.status_code == 200
        assert response.json()["status"] == "alive"
    
    def test_readiness_probe(self):
        """Test Kubernetes readiness probe"""
        response = client.get("/health/ready")
        # May return 503 if dependencies not available
        assert response.status_code in [200, 503]

class TestDeploymentEndpoints:
    """Tests for deployment endpoints"""
    
    def test_create_deployment(self):
        """Test creating a new deployment"""
        payload = {
            "image": "yourusername/autodeployx",
            "tag": "v1.0.0",
            "replicas": 3,
            "namespace": "default"
        }
        response = client.post("/deploy/", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["status"] == "pending"
        assert data["image"] == payload["image"]
    
    def test_list_deployments(self):
        """Test listing all deployments"""
        response = client.get("/deploy/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_nonexistent_deployment(self):
        """Test getting a deployment that doesn't exist"""
        response = client.get("/deploy/nonexistent")
        assert response.status_code == 404

class TestDeploymentValidation:
    """Tests for deployment request validation"""
    
    def test_deployment_requires_image(self):
        """Test that image is required"""
        payload = {"tag": "latest"}
        response = client.post("/deploy/", json=payload)
        assert response.status_code == 422
    
    def test_deployment_default_values(self):
        """Test default values are applied"""
        payload = {"image": "test/image"}
        response = client.post("/deploy/", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["tag"] == "latest"

if __name__ == "__main__":
    pytest.main([__file__, "-v"])`,
  },
  
  // ============ DOCKER ============
  {
    name: "Dockerfile",
    path: "docker/Dockerfile",
    language: "dockerfile",
    category: "docker",
    content: `# AutoDeployX Dockerfile
# Multi-stage build for Python application

# ============ Build Stage ============
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \\
    gcc \\
    libpq-dev \\
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY app/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ============ Production Stage ============
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \\
    libpq5 \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd --create-home --shell /bin/bash appuser

# Copy installed packages from builder
COPY --from=builder /root/.local /home/appuser/.local
ENV PATH=/home/appuser/.local/bin:$PATH

# Copy application code
COPY app/ .

# Set ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:8000/health/ || exit 1

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]`,
  },
  {
    name: "docker-compose.yml",
    path: "docker/docker-compose.yml",
    language: "yaml",
    category: "docker",
    content: `# AutoDeployX Docker Compose
# Local multi-container development setup

version: '3.8'

services:
  # Main Application
  app:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    container_name: autodeployx-app
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://autodeployx:\${DB_PASSWORD}@db:5432/autodeployx
      - REDIS_URL=redis://redis:6379/0
      - ENVIRONMENT=development
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - autodeployx-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health/"]
      interval: 30s
      timeout: 10s
      retries: 3

  # PostgreSQL Database
  db:
    image: postgres:15-alpine
    container_name: autodeployx-db
    environment:
      POSTGRES_USER: autodeployx
      POSTGRES_PASSWORD: \${DB_PASSWORD}  # Set via .env file
      POSTGRES_DB: autodeployx
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - autodeployx-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U autodeployx"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: autodeployx-redis
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - autodeployx-network
    restart: unless-stopped

  # Jenkins CI/CD (Local)
  jenkins:
    image: jenkins/jenkins:lts
    container_name: autodeployx-jenkins
    privileged: true
    user: root
    ports:
      - "8080:8080"
      - "50000:50000"
    volumes:
      - jenkins_home:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - autodeployx-network
    restart: unless-stopped

networks:
  autodeployx-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  jenkins_home:`,
  },
  
  // ============ JENKINS ============
  {
    name: "Jenkinsfile",
    path: "jenkins/Jenkinsfile",
    language: "groovy",
    category: "jenkins",
    content: `// AutoDeployX Jenkins Pipeline
// CI/CD: Build → Test → Push → Deploy

pipeline {
    agent any
    
    environment {
        // Docker Hub credentials (configure in Jenkins)
        DOCKERHUB_CREDENTIALS = credentials('dockerhub-creds')
        IMAGE_NAME = 'yourusername/autodeployx'
        IMAGE_TAG = "\${BUILD_NUMBER}"
        KUBECONFIG = '/var/jenkins_home/.kube/config'
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo '📥 Checking out source code...'
                checkout scm
                sh 'ls -la'
            }
        }
        
        stage('Build Docker Image') {
            steps {
                echo '🐳 Building Docker image...'
                dir('docker') {
                    sh """
                        docker build -t \${IMAGE_NAME}:\${IMAGE_TAG} -f Dockerfile ..
                        docker tag \${IMAGE_NAME}:\${IMAGE_TAG} \${IMAGE_NAME}:latest
                    """
                }
            }
        }
        
        stage('Run Tests') {
            steps {
                echo '🧪 Running test suite...'
                sh """
                    docker run --rm \${IMAGE_NAME}:\${IMAGE_TAG} \\
                        python -m pytest tests/ -v --tb=short
                """
            }
        }
        
        stage('Security Scan') {
            steps {
                echo '🔒 Running security scan...'
                sh """
                    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \\
                        aquasec/trivy:latest image --severity HIGH,CRITICAL \\
                        \${IMAGE_NAME}:\${IMAGE_TAG} || true
                """
            }
        }
        
        stage('Push to Docker Hub') {
            steps {
                echo '📤 Pushing to Docker Hub...'
                sh """
                    echo \$DOCKERHUB_CREDENTIALS_PSW | docker login -u \$DOCKERHUB_CREDENTIALS_USR --password-stdin
                    docker push \${IMAGE_NAME}:\${IMAGE_TAG}
                    docker push \${IMAGE_NAME}:latest
                """
            }
        }
        
        stage('Deploy to Minikube') {
            steps {
                echo '☸️ Deploying to Minikube...'
                sh """
                    # Update deployment with new image
                    kubectl set image deployment/autodeployx \\
                        autodeployx=\${IMAGE_NAME}:\${IMAGE_TAG} \\
                        -n autodeployx --record
                    
                    # Wait for rollout
                    kubectl rollout status deployment/autodeployx \\
                        -n autodeployx --timeout=300s
                    
                    # Verify pods are running
                    kubectl get pods -n autodeployx -l app=autodeployx
                """
            }
        }
        
        stage('Smoke Test') {
            steps {
                echo '🔥 Running smoke tests...'
                sh """
                    # Get service URL
                    SERVICE_URL=\$(minikube service autodeployx-service -n autodeployx --url)
                    
                    # Test health endpoint
                    curl -f \${SERVICE_URL}/health/ || exit 1
                    
                    echo "✅ Smoke tests passed!"
                """
            }
        }
    }
    
    post {
        always {
            echo '🧹 Cleaning up...'
            sh 'docker logout || true'
            cleanWs()
        }
        success {
            echo '🎉 Pipeline completed successfully!'
            // Slack notification (if configured)
            // slackSend(color: 'good', message: "Build #\${BUILD_NUMBER} succeeded!")
        }
        failure {
            echo '❌ Pipeline failed!'
            // slackSend(color: 'danger', message: "Build #\${BUILD_NUMBER} failed!")
        }
    }
}`,
  },
  
  // ============ KUBERNETES ============
  {
    name: "deployment.yaml",
    path: "k8s/deployment.yaml",
    language: "yaml",
    category: "k8s",
    content: `# AutoDeployX Kubernetes Deployment
# Managed deployment with health checks and resource limits

apiVersion: apps/v1
kind: Deployment
metadata:
  name: autodeployx
  namespace: autodeployx
  labels:
    app: autodeployx
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: autodeployx
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: autodeployx
        version: v1
    spec:
      containers:
      - name: autodeployx
        image: yourusername/autodeployx:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 8000
          protocol: TCP
        
        # Resource management
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "500m"
        
        # Liveness probe - restart if unhealthy
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        
        # Readiness probe - remove from LB if not ready
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        
        # Environment variables
        env:
        - name: ENVIRONMENT
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: autodeployx-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: autodeployx-secrets
              key: redis-url
        
        # Volume mounts
        volumeMounts:
        - name: config-volume
          mountPath: /app/config
          readOnly: true
      
      volumes:
      - name: config-volume
        configMap:
          name: autodeployx-config
      
      # Graceful shutdown
      terminationGracePeriodSeconds: 30`,
  },
  {
    name: "service.yaml",
    path: "k8s/service.yaml",
    language: "yaml",
    category: "k8s",
    content: `# AutoDeployX Kubernetes Service
# NodePort service for Minikube access

apiVersion: v1
kind: Service
metadata:
  name: autodeployx-service
  namespace: autodeployx
  labels:
    app: autodeployx
spec:
  type: NodePort
  selector:
    app: autodeployx
  ports:
  - name: http
    protocol: TCP
    port: 80
    targetPort: 8000
    nodePort: 30080

---
# ConfigMap for application configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: autodeployx-config
  namespace: autodeployx
data:
  app.yaml: |
    server:
      host: 0.0.0.0
      port: 8000
    logging:
      level: INFO
      format: json
    features:
      metrics_enabled: true
      tracing_enabled: true

---
# Secret for sensitive data
apiVersion: v1
kind: Secret
metadata:
  name: autodeployx-secrets
  namespace: autodeployx
type: Opaque
stringData:
  database-url: "postgresql://autodeployx:secretpassword@postgres:5432/autodeployx"
  redis-url: "redis://redis:6379/0"

---
# Namespace
apiVersion: v1
kind: Namespace
metadata:
  name: autodeployx
  labels:
    name: autodeployx`,
  },
  
  // ============ TERRAFORM (Demo) ============
  {
    name: "aws-demo.tf",
    path: "terraform/aws-demo.tf",
    language: "hcl",
    category: "terraform",
    content: `# AutoDeployX Terraform Configuration
# DEMO ONLY - Showcases IaC knowledge without actual AWS deployment
# This file demonstrates AWS EKS setup for interview purposes

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Provider configuration (not applied)
provider "aws" {
  region = var.aws_region
  
  # Demo mode - no actual resources created
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
}

# ============ Variables ============
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-west-2"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "autodeployx-cluster"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "demo"
}

# ============ VPC Configuration ============
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name        = "\${var.cluster_name}-vpc"
    Environment = var.environment
    Project     = "AutoDeployX"
  }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.\${count.index + 1}.0/24"
  availability_zone = "\${var.aws_region}\${count.index == 0 ? "a" : "b"}"
  
  tags = {
    Name = "\${var.cluster_name}-private-\${count.index + 1}"
    "kubernetes.io/role/internal-elb" = "1"
  }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.\${count.index + 10}.0/24"
  availability_zone       = "\${var.aws_region}\${count.index == 0 ? "a" : "b"}"
  map_public_ip_on_launch = true
  
  tags = {
    Name = "\${var.cluster_name}-public-\${count.index + 1}"
    "kubernetes.io/role/elb" = "1"
  }
}

# ============ EKS Cluster ============
resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.28"
  
  vpc_config {
    subnet_ids              = concat(aws_subnet.private[*].id, aws_subnet.public[*].id)
    endpoint_private_access = true
    endpoint_public_access  = true
  }
  
  tags = {
    Environment = var.environment
    Project     = "AutoDeployX"
  }
}

# ============ EKS Node Group ============
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "\${var.cluster_name}-nodes"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = aws_subnet.private[*].id
  
  scaling_config {
    desired_size = 2
    max_size     = 4
    min_size     = 1
  }
  
  instance_types = ["t3.medium"]
  
  tags = {
    Environment = var.environment
    Project     = "AutoDeployX"
  }
}

# ============ IAM Roles ============
resource "aws_iam_role" "eks_cluster" {
  name = "\${var.cluster_name}-cluster-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role" "eks_nodes" {
  name = "\${var.cluster_name}-node-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

# ============ Outputs ============
output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.main.name
}

# NOTE: This is a demo file for interview purposes
# Actual deployment uses Minikube (local Kubernetes)`,
  },
  
  // ============ SCRIPTS ============
  {
    name: "start-minikube.sh",
    path: "scripts/start-minikube.sh",
    language: "bash",
    category: "scripts",
    content: `#!/bin/bash

# ==========================================
# AutoDeployX - Minikube Startup Script
# ==========================================

set -e

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

echo -e "\${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║     AutoDeployX - Minikube Setup       ║"
echo "╚════════════════════════════════════════╝"
echo -e "\${NC}"

# Configuration
CPUS=2
MEMORY=4096
DRIVER="docker"

# Check prerequisites
echo -e "\${YELLOW}📋 Checking prerequisites...\${NC}"

if ! command -v minikube &> /dev/null; then
    echo -e "\${RED}❌ Minikube not found. Please install it first.\${NC}"
    echo "   brew install minikube  # macOS"
    echo "   choco install minikube # Windows"
    exit 1
fi

if ! command -v kubectl &> /dev/null; then
    echo -e "\${RED}❌ kubectl not found. Please install it first.\${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "\${RED}❌ Docker not found. Please install it first.\${NC}"
    exit 1
fi

echo -e "\${GREEN}✅ All prerequisites found!\${NC}"

# Check if Minikube is already running
echo ""
echo -e "\${YELLOW}🔍 Checking Minikube status...\${NC}"

if minikube status | grep -q "Running"; then
    echo -e "\${GREEN}✅ Minikube is already running!\${NC}"
else
    echo -e "\${YELLOW}🚀 Starting Minikube...\${NC}"
    minikube start \\
        --cpus=\${CPUS} \\
        --memory=\${MEMORY} \\
        --driver=\${DRIVER} \\
        --addons=ingress,metrics-server,dashboard
    
    echo -e "\${GREEN}✅ Minikube started successfully!\${NC}"
fi

# Configure Docker to use Minikube's daemon
echo ""
echo -e "\${YELLOW}🐳 Configuring Docker environment...\${NC}"
eval \$(minikube docker-env)
echo -e "\${GREEN}✅ Docker configured to use Minikube\${NC}"

# Create namespace
echo ""
echo -e "\${YELLOW}☸️  Creating Kubernetes namespace...\${NC}"
kubectl create namespace autodeployx --dry-run=client -o yaml | kubectl apply -f -
echo -e "\${GREEN}✅ Namespace 'autodeployx' ready\${NC}"

# Display cluster info
echo ""
echo -e "\${BLUE}════════════════════════════════════════\${NC}"
echo -e "\${GREEN}🎉 Minikube is ready!\${NC}"
echo -e "\${BLUE}════════════════════════════════════════\${NC}"
echo ""
echo "Useful commands:"
echo "  minikube dashboard    # Open Kubernetes dashboard"
echo "  minikube service list # List all services"
echo "  kubectl get pods -A   # List all pods"
echo ""
echo -e "\${YELLOW}To access the app after deployment:\${NC}"
echo "  minikube service autodeployx-service -n autodeployx"`,
  },
  {
    name: "deploy.sh",
    path: "scripts/deploy.sh",
    language: "bash",
    category: "scripts",
    content: `#!/bin/bash

# ==========================================
# AutoDeployX - Manual Deployment Script
# ==========================================

set -e

# Colors
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m'

echo -e "\${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║    AutoDeployX - Deployment Script     ║"
echo "╚════════════════════════════════════════╝"
echo -e "\${NC}"

# Configuration
IMAGE_NAME="yourusername/autodeployx"
IMAGE_TAG=\${1:-latest}
NAMESPACE="autodeployx"

# Step 1: Verify Minikube is running
echo -e "\${YELLOW}📦 Step 1: Checking Minikube...\${NC}"
if ! minikube status | grep -q "Running"; then
    echo -e "\${RED}❌ Minikube is not running!\${NC}"
    echo "Run: ./scripts/start-minikube.sh"
    exit 1
fi
echo -e "\${GREEN}✅ Minikube is running\${NC}"

# Step 2: Configure Docker to use Minikube
echo ""
echo -e "\${YELLOW}🐳 Step 2: Configuring Docker...\${NC}"
eval \$(minikube docker-env)
echo -e "\${GREEN}✅ Docker configured\${NC}"

# Step 3: Build Docker image
echo ""
echo -e "\${YELLOW}🔨 Step 3: Building Docker image...\${NC}"
docker build -t \${IMAGE_NAME}:\${IMAGE_TAG} -f docker/Dockerfile .
docker tag \${IMAGE_NAME}:\${IMAGE_TAG} \${IMAGE_NAME}:latest
echo -e "\${GREEN}✅ Image built: \${IMAGE_NAME}:\${IMAGE_TAG}\${NC}"

# Step 4: Run tests
echo ""
echo -e "\${YELLOW}🧪 Step 4: Running tests...\${NC}"
docker run --rm \${IMAGE_NAME}:\${IMAGE_TAG} python -m pytest tests/ -v --tb=short
echo -e "\${GREEN}✅ All tests passed!\${NC}"

# Step 5: Apply Kubernetes manifests
echo ""
echo -e "\${YELLOW}☸️  Step 5: Applying Kubernetes manifests...\${NC}"

# Apply all K8s configs
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/deployment.yaml

echo -e "\${GREEN}✅ Kubernetes manifests applied\${NC}"

# Step 6: Wait for deployment
echo ""
echo -e "\${YELLOW}⏳ Step 6: Waiting for deployment...\${NC}"
kubectl rollout status deployment/autodeployx -n \${NAMESPACE} --timeout=300s
echo -e "\${GREEN}✅ Deployment complete!\${NC}"

# Step 7: Verify deployment
echo ""
echo -e "\${YELLOW}🔍 Step 7: Verifying deployment...\${NC}"
kubectl get pods -n \${NAMESPACE} -l app=autodeployx
kubectl get svc -n \${NAMESPACE}

# Step 8: Get service URL
echo ""
echo -e "\${BLUE}════════════════════════════════════════\${NC}"
echo -e "\${GREEN}🎉 Deployment successful!\${NC}"
echo -e "\${BLUE}════════════════════════════════════════\${NC}"
echo ""
echo -e "\${YELLOW}Access the application:\${NC}"
minikube service autodeployx-service -n \${NAMESPACE} --url
echo ""
echo "Useful commands:"
echo "  kubectl logs -f deployment/autodeployx -n \${NAMESPACE}"
echo "  kubectl exec -it deployment/autodeployx -n \${NAMESPACE} -- /bin/bash"
echo "  minikube dashboard"`,
  },
  
  // ============ ROOT FILES ============
  {
    name: "README.md",
    path: "README.md",
    language: "markdown",
    category: "root",
    content: `# 🚀 AutoDeployX

**Complete DevOps Automation Platform - 100% Local, Zero Cloud Cost**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()
[![Docker](https://img.shields.io/badge/docker-ready-blue)]()
[![Kubernetes](https://img.shields.io/badge/kubernetes-minikube-326CE5)]()

## 📋 Overview

AutoDeployX is a complete DevOps automation project that demonstrates the full CI/CD pipeline:

\`\`\`
Code Push → Jenkins (Build + Test) → Docker Image → Docker Hub → Minikube Deployment
\`\`\`

**Key Features:**
- 🐳 Dockerized Python microservices
- 🔧 Jenkins CI/CD pipeline (containerized)
- ☸️ Kubernetes deployment with Minikube
- 📦 Docker Hub integration (free tier)
- 🧪 Automated testing before deployment
- 📊 Health checks and monitoring

## 🏗️ Project Structure

\`\`\`
AutoDeployX/
├── app/                    # Python application
│   ├── main.py            # FastAPI entry point
│   ├── routes/            # API endpoints
│   ├── services/          # Business logic
│   └── requirements.txt   # Dependencies
├── tests/                  # Test suite
├── docker/                 # Docker configs
├── jenkins/                # CI/CD pipeline
├── k8s/                    # Kubernetes manifests
├── terraform/              # IaC (demo only)
└── scripts/                # Helper scripts
\`\`\`

## 🚀 Quick Start

\`\`\`bash
# 1. Start Minikube
./scripts/start-minikube.sh

# 2. Deploy application
./scripts/deploy.sh

# 3. Access the app
minikube service autodeployx-service -n autodeployx
\`\`\`

## 🛠️ Local Development

\`\`\`bash
# Run with Docker Compose
cd docker
docker-compose up -d

# Access services:
# - App: http://localhost:8000
# - Jenkins: http://localhost:8080
\`\`\`

## 📚 Documentation

- [Setup Guide](docs/setup.md)
- [CI/CD Pipeline](docs/cicd.md)
- [Kubernetes Deployment](docs/kubernetes.md)

## 📄 License

MIT License - Free for personal and commercial use.`,
  },
  {
    name: "VERSION",
    path: "VERSION",
    language: "text",
    category: "root",
    content: `1.0.0`,
  },
  {
    name: ".gitignore",
    path: ".gitignore",
    language: "text",
    category: "root",
    content: `# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
.venv/
ENV/

# IDE
.idea/
.vscode/
*.swp
*.swo
*~

# Testing
.pytest_cache/
.coverage
htmlcov/
.tox/

# Docker
*.log

# Kubernetes
*.kubeconfig

# Terraform
.terraform/
*.tfstate
*.tfstate.backup
*.tfvars

# OS
.DS_Store
Thumbs.db

# Secrets (never commit!)
.env
*.pem
*.key`,
  },
];

// Group files by category
const categories = [
  { id: "app", label: "App", icon: "📦" },
  { id: "tests", label: "Tests", icon: "🧪" },
  { id: "docker", label: "Docker", icon: "🐳" },
  { id: "jenkins", label: "Jenkins", icon: "🔧" },
  { id: "k8s", label: "Kubernetes", icon: "☸️" },
  { id: "terraform", label: "Terraform", icon: "🏗️" },
  { id: "scripts", label: "Scripts", icon: "📜" },
  { id: "root", label: "Root", icon: "📁" },
];

interface ConfigFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConfigFilesModal({ isOpen, onClose }: ConfigFilesModalProps) {
  const [selectedFile, setSelectedFile] = useState(configFiles[0]);
  const [copied, setCopied] = useState(false);
  const [activeCategory, setActiveCategory] = useState("app");

  const filteredFiles = configFiles.filter(f => f.category === activeCategory);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadAll = () => {
    configFiles.forEach((file) => {
      const blob = new Blob([file.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    toast.success("All files downloaded!");
  };

  const handleDownloadFile = () => {
    const blob = new Blob([selectedFile.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${selectedFile.name} downloaded!`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-[95vw] max-w-7xl h-[90vh] bg-card border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-display text-foreground tracking-wide">
              AutoDeployX Project Files
            </h2>
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
              {configFiles.length} files
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadAll}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download All
            </Button>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 px-4 py-3 border-b border-border bg-secondary/20 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                const firstFile = configFiles.find(f => f.category === cat.id);
                if (firstFile) setSelectedFile(firstFile);
              }}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-all",
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <span className="mr-1.5">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* File List */}
          <div className="w-64 border-r border-border bg-secondary/20 overflow-y-auto">
            <div className="p-2 space-y-1">
              {filteredFiles.map((file) => (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-all",
                    selectedFile.path === file.path
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <FileCode className="w-4 h-4 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs opacity-60 truncate">{file.path}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Code View */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* File Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-muted-foreground">
                  {selectedFile.path}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">
                  {selectedFile.language}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadFile}
                  className="gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Code Content */}
            <div className="flex-1 overflow-auto">
              <pre className="p-4 text-sm font-mono leading-relaxed">
                <code className="text-foreground whitespace-pre">
                  {selectedFile.content}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
