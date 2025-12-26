#!/bin/bash

# ==========================================
# AutoDeployX - Minikube Startup Script
# ==========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║     AutoDeployX - Minikube Setup       ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# Configuration
CPUS=2
MEMORY=4096
DRIVER="docker"

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command -v minikube &> /dev/null; then
    echo -e "${RED}❌ Minikube not found. Please install it first.${NC}"
    echo "   brew install minikube  # macOS"
    echo "   choco install minikube # Windows"
    exit 1
fi

if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl not found. Please install it first.${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install it first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites found!${NC}"

# Check if Minikube is already running
echo ""
echo -e "${YELLOW}🔍 Checking Minikube status...${NC}"

if minikube status | grep -q "Running"; then
    echo -e "${GREEN}✅ Minikube is already running!${NC}"
else
    echo -e "${YELLOW}🚀 Starting Minikube...${NC}"
    minikube start \
        --cpus=${CPUS} \
        --memory=${MEMORY} \
        --driver=${DRIVER} \
        --addons=ingress,metrics-server,dashboard
    
    echo -e "${GREEN}✅ Minikube started successfully!${NC}"
fi

# Configure Docker to use Minikube's daemon
echo ""
echo -e "${YELLOW}🐳 Configuring Docker environment...${NC}"
eval $(minikube docker-env)
echo -e "${GREEN}✅ Docker configured to use Minikube${NC}"

# Create namespace
echo ""
echo -e "${YELLOW}☸️  Creating Kubernetes namespace...${NC}"
kubectl create namespace autodeployx --dry-run=client -o yaml | kubectl apply -f -
echo -e "${GREEN}✅ Namespace 'autodeployx' ready${NC}"

# Display cluster info
echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Minikube is ready!${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""
echo "Useful commands:"
echo "  minikube dashboard    # Open Kubernetes dashboard"
echo "  minikube service list # List all services"
echo "  kubectl get pods -A   # List all pods"
echo ""
echo -e "${YELLOW}To access the app after deployment:${NC}"
echo "  minikube service autodeployx-service -n autodeployx"
