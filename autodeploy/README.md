# 🚀 AutoDeployX

**Complete DevOps Automation Platform - 100% Local, Zero Cloud Cost**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()
[![Docker](https://img.shields.io/badge/docker-ready-blue)]()
[![Kubernetes](https://img.shields.io/badge/kubernetes-minikube-326CE5)]()

---

## 🎯 Architecture Overview (Interview Ready)

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Dashboard  │─────▶│   Backend   │─────▶│   Jenkins   │─────▶│  DockerHub  │─────▶│  Minikube   │
│   (React)   │      │  (FastAPI)  │      │  (CI/CD)    │      │  (Registry) │      │    (K8s)    │
└─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘
   Triggers &           API +              OWNS the            Stores               Runs
   Visualizes          WebSocket           Pipeline            Images               Pods
```

### 🔑 KEY ARCHITECTURE POINTS

| Point | Explanation |
|-------|-------------|
| **1. Jenkins OWNS the Pipeline** | Backend only TRIGGERS Jenkins via API. Jenkins builds, tests, pushes, and deploys. Dashboard is read-only. |
| **2. Jenkins → DockerHub (Explicit)** | Jenkins runs `docker build` + `docker push`. Dashboard does NOT push images. |
| **3. Kubeconfig Mount Required** | Backend container needs `~/.kube` mounted for real `kubectl` commands to Minikube. |

---

## 🏗️ Project Structure

```
autodeploy/
├── app/                    # Original Python app (demo)
│   ├── main.py            # FastAPI entry point
│   ├── routes/            # API endpoints
│   └── services/          # Business logic
├── backend/               # 🔥 MAIN: Tracking API
│   ├── main.py            # WebSocket + REST API
│   ├── Dockerfile         # With kubectl installed
│   └── requirements.txt   # FastAPI, websockets, httpx
├── docker/
│   ├── docker-compose.yml # Backend + Jenkins
│   └── Dockerfile         # Multi-stage build
├── jenkins/
│   └── Jenkinsfile        # CI/CD pipeline with webhooks
├── k8s/
│   ├── deployment.yaml    # Kubernetes deployment
│   └── service.yaml       # LoadBalancer service
├── scripts/
│   ├── deploy.sh          # Manual deployment script
│   └── start-minikube.sh  # Minikube setup
└── .env.example           # All required credentials
```

---

## 🚀 Quick Start

### 1. Prerequisites
```bash
# Required tools
- Docker Desktop
- Minikube
- kubectl
- Jenkins (containerized or local)
```

### 2. Setup Credentials
```bash
cd autodeploy
cp .env.example docker/.env

# Edit docker/.env with your credentials:
# - DOCKERHUB_USER, DOCKERHUB_TOKEN
# - JENKINS_URL, JENKINS_USER, JENKINS_TOKEN
# - ENABLE_REAL_K8S=true (for real kubectl)
```

### 3. Start Services
```bash
# Start Minikube first
minikube start

# Start backend + services
cd docker
docker-compose up -d --build

# Verify
curl http://localhost:8000/health
```

### 4. Access Dashboard
```
Frontend: http://localhost:5173 (or Lovable preview)
Backend API: http://localhost:8000
Jenkins: http://localhost:8080
```

---

## 🔄 CI/CD Pipeline Flow

```
1. Dashboard Click        → POST /pipelines/trigger
2. Backend               → Calls Jenkins API
3. Jenkins (Owns It)     → Checkout → Test → Build → Push → Deploy
4. Jenkins               → POST /jenkins/status (webhook)
5. Jenkins               → POST /jenkins/stage (per stage)
6. Backend               → WebSocket broadcast to Dashboard
7. Dashboard             → Real-time UI update
```

### Jenkinsfile Webhooks
```groovy
// Each stage notifies backend
stage('Build') {
  steps {
    sh 'curl -X POST $BACKEND_URL/jenkins/stage -d \'{"stage_name":"Build","status":"running"}\''
    sh 'docker build -t $IMAGE .'
    sh 'curl -X POST $BACKEND_URL/jenkins/stage -d \'{"stage_name":"Build","status":"success"}\''
  }
}

// Final status
post {
  success { sh 'curl -X POST $BACKEND_URL/jenkins/status -d \'{"status":"success"}\'' }
  failure { sh 'curl -X POST $BACKEND_URL/jenkins/status -d \'{"status":"failure"}\'' }
}
```

---

## 🔑 Required Credentials

| System | Credential | Where to Configure | Purpose |
|--------|------------|-------------------|---------|
| **DockerHub** | DOCKERHUB_USER | Backend .env | Image repository |
| **DockerHub** | DOCKERHUB_TOKEN | Backend .env | Avoid rate limits |
| **Jenkins** | JENKINS_TOKEN | Backend .env | Trigger pipelines |
| **Jenkins** | dockerhub (credential ID) | Jenkins Credentials | Push images |
| **Jenkins** | github (credential ID) | Jenkins Credentials | Pull code |
| **Kubernetes** | ~/.kube/config | Docker mount | kubectl access |

---

## 🐳 Kubeconfig Mount (Important!)

For real `kubectl` commands, backend needs kubeconfig mounted:

```yaml
# docker-compose.yml
backend:
  volumes:
    - ${HOME}/.kube:/root/.kube:ro
    - ${HOME}/.minikube:${HOME}/.minikube:ro
  environment:
    - ENABLE_REAL_K8S=true
```

Without this mount, backend uses **simulated** Kubernetes data.

---

## 📊 Dashboard Features

| Feature | Data Source | Update Method |
|---------|-------------|---------------|
| Deployment Metrics | JSON persistence | REST polling |
| Docker Images | DockerHub API | REST polling |
| Active Pipelines | Jenkins webhooks | WebSocket |
| Pipeline Stages | Jenkins webhooks | WebSocket |
| Kubernetes Pods | kubectl (if mounted) | REST polling |
| Logs | In-memory + JSON | WebSocket |

---

## 🧪 Testing the Flow

```bash
# 1. Trigger pipeline from dashboard or API
curl -X POST http://localhost:8000/pipelines/trigger \
  -H "Content-Type: application/json" \
  -d '{"pipeline_name":"autodeployx-backend","branch":"main"}'

# 2. Check pipeline status
curl http://localhost:8000/pipelines/current

# 3. Check credentials status
curl http://localhost:8000/credentials/status

# 4. Check Kubernetes deployment
curl http://localhost:8000/kubernetes/deployment
```

---

## 🎓 Interview Talking Points

1. **"How does the dashboard trigger deployments?"**
   > Dashboard calls Backend API → Backend triggers Jenkins → Jenkins owns the pipeline

2. **"Who pushes to DockerHub?"**
   > Jenkins. The Jenkinsfile runs `docker build` and `docker push`. Dashboard is read-only.

3. **"How do you get real Kubernetes data?"**
   > Backend container has `kubectl` installed and `~/.kube` mounted from host.

4. **"Why WebSocket instead of polling?"**
   > Real-time updates without hammering the API. Jenkins pushes status → Backend broadcasts instantly.

5. **"What if credentials are missing?"**
   > `/credentials/status` endpoint validates all ENVs. Dashboard shows warnings for missing credentials.

---

## 📄 License

MIT License - Free for personal and commercial use.
