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
      setPipelines(data.builds);
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
