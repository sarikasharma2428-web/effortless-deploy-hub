// Backend API client for Reliability Studio
// This connects to the Go backend running on port 9000

const API_BASE = "http://localhost:9000/api";

// Generic fetch wrapper with error handling
async function apiFetch<T>(endpoint: string): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch ${endpoint}:`, error);
    throw error;
  }
}

// Incidents API
export const getIncidents = () => apiFetch("/incidents");
export const getIncident = (id: string) => apiFetch(`/incidents/${id}`);

// SLO API
export const getSLO = () => apiFetch("/slo");
export const getSLOByService = (service: string) => apiFetch(`/slo/${service}`);

// Kubernetes API
export const getK8s = () => apiFetch("/k8s");
export const getK8sPods = () => apiFetch("/k8s/pods");
export const getK8sEvents = () => apiFetch("/k8s/events");

// Metrics API (Prometheus)
export const getMetrics = (query: string) => 
  apiFetch(`/metrics?query=${encodeURIComponent(query)}`);

// Logs API (Loki)
export const getLogs = (service: string, timeRange: string = "5m") =>
  apiFetch(`/logs?service=${service}&range=${timeRange}`);

// Traces API (Tempo)
export const getTraces = (traceId?: string) => 
  traceId ? apiFetch(`/traces/${traceId}`) : apiFetch("/traces");

// Export all APIs
export const backendAPI = {
  incidents: {
    list: getIncidents,
    get: getIncident,
  },
  slo: {
    get: getSLO,
    getByService: getSLOByService,
  },
  kubernetes: {
    get: getK8s,
    pods: getK8sPods,
    events: getK8sEvents,
  },
  metrics: {
    query: getMetrics,
  },
  logs: {
    get: getLogs,
  },
  traces: {
    get: getTraces,
  },
};