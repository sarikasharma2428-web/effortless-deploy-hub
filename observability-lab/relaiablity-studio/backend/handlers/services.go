package handlers

// GET /api/services
func ListServices(w http.ResponseWriter, r *http.Request) {
    services, err := services.GetAllServices()
    // ... implementation
}

// POST /api/services
func CreateService(w http.ResponseWriter, r *http.Request) {
    // ... implementation
}

// GET /api/services/:id/slos
func GetServiceSLOs(w http.ResponseWriter, r *http.Request) {
    // ... implementation
}

// GET /api/services/:id/incidents
func GetServiceIncidents(w http.ResponseWriter, r *http.Request) {
    // ... implementation
}