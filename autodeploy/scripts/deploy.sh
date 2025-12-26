#!/bin/bash

# ==========================================
# AutoDeployX - Manual Deployment Script
# ==========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║    AutoDeployX - Deployment Script     ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# Configuration
IMAGE_NAME="yourusername/autodeployx"
IMAGE_TAG=${1:-latest}
NAMESPACE="autodeployx"

# Step 1: Verify Minikube is running
echo -e "${YELLOW}📦 Step 1: Checking Minikube...${NC}"
if ! minikube status | grep -q "Running"; then
    echo -e "${RED}❌ Minikube is not running!${NC}"
    echo "Run: ./scripts/start-minikube.sh"
    exit 1
fi
echo -e "${GREEN}✅ Minikube is running${NC}"

# Step 2: Configure Docker to use Minikube
echo ""
echo -e "${YELLOW}🐳 Step 2: Configuring Docker...${NC}"
eval $(minikube docker-env)
echo -e "${GREEN}✅ Docker configured${NC}"

# Step 3: Build Docker image
echo ""
echo -e "${YELLOW}🔨 Step 3: Building Docker image...${NC}"
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} -f docker/Dockerfile .
docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:latest
echo -e "${GREEN}✅ Image built: ${IMAGE_NAME}:${IMAGE_TAG}${NC}"

# Step 4: Run tests
echo ""
echo -e "${YELLOW}🧪 Step 4: Running tests...${NC}"
docker run --rm ${IMAGE_NAME}:${IMAGE_TAG} python -m pytest tests/ -v --tb=short
echo -e "${GREEN}✅ All tests passed!${NC}"

# Step 5: Apply Kubernetes manifests
echo ""
echo -e "${YELLOW}☸️  Step 5: Applying Kubernetes manifests...${NC}"

# Apply all K8s configs
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/deployment.yaml

echo -e "${GREEN}✅ Kubernetes manifests applied${NC}"

# Step 6: Wait for deployment
echo ""
echo -e "${YELLOW}⏳ Step 6: Waiting for deployment...${NC}"
kubectl rollout status deployment/autodeployx -n ${NAMESPACE} --timeout=300s
echo -e "${GREEN}✅ Deployment complete!${NC}"

# Step 7: Verify deployment
echo ""
echo -e "${YELLOW}🔍 Step 7: Verifying deployment...${NC}"
kubectl get pods -n ${NAMESPACE} -l app=autodeployx
kubectl get svc -n ${NAMESPACE}

# Step 8: Get service URL
echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Deployment successful!${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Access the application:${NC}"
minikube service autodeployx-service -n ${NAMESPACE} --url
echo ""
echo "Useful commands:"
echo "  kubectl logs -f deployment/autodeployx -n ${NAMESPACE}"
echo "  kubectl exec -it deployment/autodeployx -n ${NAMESPACE} -- /bin/bash"
echo "  minikube dashboard"
