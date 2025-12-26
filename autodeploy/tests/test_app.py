"""
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
    pytest.main([__file__, "-v"])
