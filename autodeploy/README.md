# 🚀 AutoDeployX

**Complete DevOps Automation Platform - 100% Local, Zero Cloud Cost**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()
[![Docker](https://img.shields.io/badge/docker-ready-blue)]()
[![Kubernetes](https://img.shields.io/badge/kubernetes-minikube-326CE5)]()

## 📋 Overview

AutoDeployX is a complete DevOps automation project that demonstrates the full CI/CD pipeline:

```
Code Push → Jenkins (Build + Test) → Docker Image → Docker Hub → Minikube Deployment
```

**Key Features:**
- 🐳 Dockerized Python microservices
- 🔧 Jenkins CI/CD pipeline (containerized)
- ☸️ Kubernetes deployment with Minikube
- 📦 Docker Hub integration (free tier)
- 🧪 Automated testing before deployment
- 📊 Health checks and monitoring

## 🏗️ Project Structure

```
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
```

## 🚀 Quick Start

```bash
# 1. Start Minikube
./scripts/start-minikube.sh

# 2. Deploy application
./scripts/deploy.sh

# 3. Access the app
minikube service autodeployx-service -n autodeployx
```

## 🛠️ Local Development

```bash
# Run with Docker Compose
cd docker
docker-compose up -d

# Access services:
# - App: http://localhost:8000
# - Jenkins: http://localhost:8080
```

## 🔄 CI/CD Pipeline Flow

1. **Code Push** → Triggers Jenkins pipeline
2. **Build** → Creates Docker image
3. **Test** → Runs pytest test suite
4. **Security Scan** → Trivy vulnerability scan
5. **Push** → Uploads to Docker Hub
6. **Deploy** → Rolls out to Minikube
7. **Smoke Test** → Verifies deployment

## 📊 Monitoring Dashboard

The frontend dashboard monitors this project in real-time:
- Pipeline execution status
- Deployment logs
- Container health
- Resource usage

## 📚 Documentation

- [Setup Guide](docs/setup.md)
- [CI/CD Pipeline](docs/cicd.md)
- [Kubernetes Deployment](docs/kubernetes.md)

## 🔑 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection | postgresql://... |
| REDIS_URL | Redis connection | redis://redis:6379 |
| ENVIRONMENT | Runtime environment | development |

## 📄 License

MIT License - Free for personal and commercial use.
