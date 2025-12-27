import { useState, useEffect, useCallback } from 'react';

// Backend API base URL - configurable
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// Types
export interface DeploymentMetrics {
  total: number;
  this_month: number;
  success: number;
  failed: number;
}

export interface PipelineMetrics {
  total: number;
  active: number;
  jobs: Array<{ name: string; color: string }>;
}

export interface DockerMetrics {
  count: number;
  source: string;
  repository: string;
  tags: string[];
}

export interface SuccessRateMetrics {
  rate: number;
  success: number;
  failed: number;
  total: number;
}

export interface AllMetrics {
  deployments: DeploymentMetrics;
  pipelines: PipelineMetrics;
  docker_images: DockerMetrics;
  success_rate: SuccessRateMetrics;
  timestamp: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

export interface PipelineBuild {
  pipeline_name: string;
  build_number: number;
  status: string;
  stage: string;
  timestamp: string;
  message: string;
}

// Extended types for dashboard sections
export interface CurrentPipeline {
  pipelineName: string;
  buildNumber: number;
  status: 'running' | 'success' | 'failed' | 'pending';
  currentStage: string;
  branch: string;
  startTime: string;
  duration?: string;
  stages: Array<{
    name: string;
    status: 'success' | 'running' | 'pending' | 'failed';
    timestamp?: string;
  }>;
}

export interface DockerImageInfo {
  tag: string;
  pushedAt: string;
  size?: string;
}

export interface PodInfo {
  name: string;
  status: 'running' | 'pending' | 'failed' | 'terminated';
  restarts?: number;
}

export interface RolloutEntry {
  revision: number;
  image: string;
  timestamp: string;
  status: 'success' | 'failed' | 'rolling';
}

export interface DeploymentInfo {
  cluster: string;
  namespace: string;
  deploymentName: string;
  currentVersion: string;
  pods: PodInfo[];
  rolloutHistory: RolloutEntry[];
}

export interface HistoryInfo {
  totalPipelines: number;
  successCount: number;
  failureCount: number;
  lastSuccessTime: string;
  lastDeployedVersion: string;
  successRate: number;
}

// Custom hook for fetching metrics with polling
export function useMetrics(pollInterval: number = 5000) {
  const [metrics, setMetrics] = useState<AllMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/metrics/all`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const data = await response.json();
      setMetrics(data);
      setIsConnected(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, pollInterval);
    return () => clearInterval(interval);
  }, [fetchMetrics, pollInterval]);

  return { metrics, loading, error, isConnected, refetch: fetchMetrics };
}

// Custom hook for fetching logs with polling
export function useLogs(pollInterval: number = 3000, limit: number = 20) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/logs/recent?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch logs');
      const data = await response.json();
      setLogs(data.logs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, pollInterval);
    return () => clearInterval(interval);
  }, [fetchLogs, pollInterval]);

  return { logs, loading, error, refetch: fetchLogs };
}

// Custom hook for fetching recent pipelines
export function usePipelines(pollInterval: number = 5000, limit: number = 10) {
  const [pipelines, setPipelines] = useState<PipelineBuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPipelines = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/pipelines/recent?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch pipelines');
      const data = await response.json();
      setPipelines(data.builds || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchPipelines();
    const interval = setInterval(fetchPipelines, pollInterval);
    return () => clearInterval(interval);
  }, [fetchPipelines, pollInterval]);

  return { pipelines, loading, error, refetch: fetchPipelines };
}

// Extended pipeline build for history page
export interface PipelineBuildExtended extends PipelineBuild {
  branch?: string;
  commit?: string;
  duration?: number;
}

// Hook for pipeline history (full list with stats)
export function usePipelineHistory(pollInterval: number = 5000, limit: number = 50) {
  const [pipelines, setPipelines] = useState<PipelineBuildExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/pipelines/history?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch pipeline history');
      const data = await response.json();
      setPipelines(data.builds || []);
      setIsConnected(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, pollInterval);
    return () => clearInterval(interval);
  }, [fetchHistory, pollInterval]);

  return { pipelines, loading, error, refetch: fetchHistory, isConnected };
}

// Hook for current pipeline status (real-time tracking)
export function useCurrentPipeline(pollInterval: number = 2000) {
  const [pipeline, setPipeline] = useState<CurrentPipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentPipeline = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/pipelines/current`);
      if (!response.ok) throw new Error('Failed to fetch current pipeline');
      const data = await response.json();
      setPipeline(data.pipeline);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPipeline(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentPipeline();
    const interval = setInterval(fetchCurrentPipeline, pollInterval);
    return () => clearInterval(interval);
  }, [fetchCurrentPipeline, pollInterval]);

  return { pipeline, loading, error, refetch: fetchCurrentPipeline };
}

// Hook for Docker images
export function useDockerImages(pollInterval: number = 10000) {
  const [images, setImages] = useState<DockerImageInfo[]>([]);
  const [repository, setRepository] = useState<string>('sarika1731/autodeployx');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDockerImages = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/docker/images`);
      if (!response.ok) throw new Error('Failed to fetch Docker images');
      const data = await response.json();
      setImages(data.images || []);
      setRepository(data.repository || 'sarika1731/autodeployx');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDockerImages();
    const interval = setInterval(fetchDockerImages, pollInterval);
    return () => clearInterval(interval);
  }, [fetchDockerImages, pollInterval]);

  return { images, repository, loading, error, refetch: fetchDockerImages };
}

// Hook for Kubernetes deployment info
export function useDeploymentInfo(pollInterval: number = 5000) {
  const [deployment, setDeployment] = useState<DeploymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeployment = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/kubernetes/deployment`);
      if (!response.ok) throw new Error('Failed to fetch deployment info');
      const data = await response.json();
      setDeployment(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeployment();
    const interval = setInterval(fetchDeployment, pollInterval);
    return () => clearInterval(interval);
  }, [fetchDeployment, pollInterval]);

  return { deployment, loading, error, refetch: fetchDeployment };
}

// Hook for history stats
export function useHistoryStats(pollInterval: number = 10000) {
  const [history, setHistory] = useState<HistoryInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stats/history`);
      if (!response.ok) throw new Error('Failed to fetch history');
      const data = await response.json();
      setHistory(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, pollInterval);
    return () => clearInterval(interval);
  }, [fetchHistory, pollInterval]);

  return { history, loading, error, refetch: fetchHistory };
}

// Health check hook
export function useBackendHealth() {
  const [isHealthy, setIsHealthy] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      setIsHealthy(response.ok);
      setLastCheck(new Date());
    } catch {
      setIsHealthy(false);
      setLastCheck(new Date());
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return { isHealthy, lastCheck, checkHealth };
}

// Credentials status hook - check what's missing
export interface CredentialInfo {
  value: string | null;
  configured: boolean | null;
  required: boolean;
  where: string;
  purpose: string;
}

export interface CredentialsStatus {
  status: string;
  all_required_configured: boolean;
  missing_required: string[];
  missing_optional: string[];
  credentials: {
    dockerhub: Record<string, CredentialInfo>;
    jenkins: Record<string, CredentialInfo>;
    kubernetes: Record<string, CredentialInfo>;
  };
  summary: {
    total_required: number;
    configured_required: number;
    message: string;
  };
}

export function useCredentialsStatus() {
  const [status, setStatus] = useState<CredentialsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/credentials/status`);
      if (!response.ok) throw new Error('Failed to fetch credentials status');
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Check less frequently
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return { status, loading, error, refetch: fetchStatus };
}

// Hook to trigger deployment via backend → Jenkins
export function useTriggerDeployment() {
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTrigger, setLastTrigger] = useState<Date | null>(null);

  const triggerDeployment = useCallback(async (pipelineName: string = 'autodeployx-backend') => {
    setIsDeploying(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/pipelines/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pipeline_name: pipelineName,
          branch: 'main',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to trigger deployment');
      }

      setLastTrigger(new Date());
      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to trigger deployment';
      setError(message);
      throw err;
    } finally {
      setIsDeploying(false);
    }
  }, []);

  return { triggerDeployment, isDeploying, error, lastTrigger };
}

// Hook for rollback
export function useRollback() {
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rollback = useCallback(async (deploymentId: string) => {
    setIsRollingBack(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/deployments/${deploymentId}/rollback`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to rollback deployment');
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to rollback';
      setError(message);
      throw err;
    } finally {
      setIsRollingBack(false);
    }
  }, []);

  return { rollback, isRollingBack, error };
}
