const API_BASE = "http://localhost:9000/api";

// MOCK TOKEN: In a real app, this would come from a login store/localStorage
const MOCK_TOKEN = "Bearer mock-jwt-token-replace-in-production";

interface FetchOptions extends RequestInit {
  body?: any;
}

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { body, ...customConfig } = options;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${(window as any).AUTH_TOKEN || 'mock-token-123'}`,
    ...customConfig.headers,
  };

  const config: RequestInit = {
    ...customConfig,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch ${endpoint}:`, error);
    throw error;
  }
}

export const backendAPI = {
  incidents: {
    list: () => apiFetch<any[]>("/incidents"),
    get: (id: string) => apiFetch<any>(`/incidents/${id}`),
    create: (data: any) => apiFetch<any>("/incidents", { method: 'POST', body: data }),
    update: (id: string, data: any) => apiFetch<any>(`/incidents/${id}`, { method: 'PATCH', body: data }),
    getTimeline: (id: string) => apiFetch<any[]>(`/incidents/${id}/timeline`),
    getCorrelations: (id: string) => apiFetch<any[]>(`/incidents/${id}/correlations`),
  },
  slos: {
    list: () => apiFetch<any[]>("/slos"),
    get: (id: string) => apiFetch<any>(`/slos/${id}`),
    create: (data: any) => apiFetch<any>("/slos", { method: 'POST', body: data }),
    update: (id: string, data: any) => apiFetch<any>(`/slos/${id}`, { method: 'PATCH', body: data }),
    delete: (id: string) => apiFetch<any>(`/slos/${id}`, { method: 'DELETE' }),
    calculate: (id: string) => apiFetch<any>(`/slos/${id}/calculate`, { method: 'POST' }),
    getHistory: (id: string) => apiFetch<any[]>(`/slos/${id}/history`),
  },
  metrics: {
    getAvailability: (service: string) => apiFetch<any>(`/metrics/availability/${service}`),
    getErrorRate: (service: string) => apiFetch<any>(`/metrics/error-rate/${service}`),
    getLatency: (service: string) => apiFetch<any>(`/metrics/latency/${service}`),
  },
  kubernetes: {
    getPods: (ns: string, svc: string) => apiFetch<any[]>(`/kubernetes/pods/${ns}/${svc}`),
    getDeployments: (ns: string, svc: string) => apiFetch<any[]>(`/kubernetes/deployments/${ns}/${svc}`),
    getEvents: (ns: string, svc: string) => apiFetch<any[]>(`/kubernetes/events/${ns}/${svc}`),
  },
  logs: {
    getErrors: (service: string) => apiFetch<any[]>(`/logs/${service}/errors`),
    search: (service: string, query: string) => apiFetch<any[]>(`/logs/${service}/search?q=${encodeURIComponent(query)}`),
  }
};

// Legacy exports for backwards compatibility
export const getIncidents = () => backendAPI.incidents.list();
export const getIncident = (id: string) => backendAPI.incidents.get(id);
export const getSLO = () => backendAPI.slos.list();
export const getSLOByService = (service: string) => backendAPI.slos.get(service);
export const getK8s = () => backendAPI.kubernetes.getPods('default', 'all');
export const getK8sPods = () => backendAPI.kubernetes.getPods('default', 'all');
export const getK8sEvents = () => backendAPI.kubernetes.getEvents('default', 'all');
export const getMetrics = (query: string) => apiFetch(`/metrics?query=${encodeURIComponent(query)}`);
export const getLogs = (service: string) => backendAPI.logs.getErrors(service);