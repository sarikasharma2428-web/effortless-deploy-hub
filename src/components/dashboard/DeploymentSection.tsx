import { Server, Layers, Box, RotateCcw, CheckCircle, XCircle, Loader2, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface Pod {
  name: string;
  status: 'running' | 'pending' | 'failed' | 'terminated';
  restarts?: number;
}

interface RolloutEntry {
  revision: number;
  image: string;
  timestamp: string;
  status: 'success' | 'failed' | 'rolling';
}

interface DeploymentSectionProps {
  cluster: string;
  namespace: string;
  deploymentName: string;
  currentVersion: string;
  pods: Pod[];
  rolloutHistory: RolloutEntry[];
  className?: string;
  disconnected?: boolean;
}

export function DeploymentSection({
  cluster,
  namespace,
  deploymentName,
  currentVersion,
  pods,
  rolloutHistory,
  className,
  disconnected = false,
}: DeploymentSectionProps) {
  const healthyPods = pods.filter(p => p.status === 'running').length;
  const totalPods = pods.length;

  const podStatusIcon = {
    running: <CheckCircle className="w-3 h-3 text-success" />,
    pending: <Loader2 className="w-3 h-3 text-warning animate-spin" />,
    failed: <XCircle className="w-3 h-3 text-destructive" />,
    terminated: <XCircle className="w-3 h-3 text-muted-foreground" />,
  };

  return (
    <div className={cn(
      "bg-card border border-border/30 p-6",
      disconnected && "opacity-60",
      className
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 border border-border/50 bg-secondary/30">
          <Server className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-sm tracking-[0.1em] text-foreground">
            KUBERNETES DEPLOYMENT
          </h3>
          <p className="text-xs text-muted-foreground">{cluster}</p>
        </div>
      </div>

      {/* Cluster Info Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-secondary/50 border border-border/30">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Layers className="w-3 h-3" /> Namespace
          </p>
          <p className="text-sm font-mono text-foreground">{namespace}</p>
        </div>
        <div className="p-3 bg-secondary/50 border border-border/30">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Box className="w-3 h-3" /> Deployment
          </p>
          <p className="text-sm font-mono text-foreground">{deploymentName}</p>
        </div>
      </div>

      {/* Current Version */}
      <div className="mb-4 p-4 bg-primary/10 border border-primary/30">
        <p className="text-xs text-primary uppercase tracking-wider mb-1">
          Current Version
        </p>
        <p className="text-sm font-mono text-primary font-medium">{currentVersion}</p>
      </div>

      {/* Pods Status */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-3 h-3" />
            Pods Status
          </p>
          <span className={cn(
            "text-xs font-mono px-2 py-0.5",
            healthyPods === totalPods 
              ? "bg-success/10 text-success border border-success/30" 
              : "bg-warning/10 text-warning border border-warning/30"
          )}>
            {healthyPods}/{totalPods} Running
          </span>
        </div>
        <div className="space-y-2">
          {pods.length > 0 ? pods.slice(0, 3).map((pod) => (
            <div 
              key={pod.name}
              className="flex items-center justify-between p-2 bg-muted/20 border border-border/20"
            >
              <div className="flex items-center gap-2">
                {podStatusIcon[pod.status]}
                <span className="font-mono text-xs text-foreground truncate max-w-[200px]">
                  {pod.name}
                </span>
              </div>
              {pod.restarts !== undefined && pod.restarts > 0 && (
                <span className="text-xs text-warning">
                  {pod.restarts} restart{pod.restarts > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )) : (
            <p className="text-xs text-muted-foreground italic">No pods running</p>
          )}
        </div>
      </div>

      {/* Rollout History */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <RotateCcw className="w-3 h-3" />
          Rollout History
        </p>
        <div className="space-y-2 max-h-24 overflow-y-auto">
          {rolloutHistory.length > 0 ? rolloutHistory.slice(0, 3).map((entry) => (
            <div 
              key={entry.revision}
              className="flex items-center justify-between p-2 bg-muted/20 border border-border/20"
            >
              <div className="flex items-center gap-2">
                {entry.status === 'success' && <CheckCircle className="w-3 h-3 text-success" />}
                {entry.status === 'failed' && <XCircle className="w-3 h-3 text-destructive" />}
                {entry.status === 'rolling' && <Loader2 className="w-3 h-3 text-warning animate-spin" />}
                <span className="text-xs text-muted-foreground">Rev {entry.revision}</span>
                <span className="font-mono text-xs text-foreground">:{entry.image}</span>
              </div>
              <span className="text-xs text-muted-foreground">{entry.timestamp}</span>
            </div>
          )) : (
            <p className="text-xs text-muted-foreground italic">No rollout history</p>
          )}
        </div>
      </div>
    </div>
  );
}
