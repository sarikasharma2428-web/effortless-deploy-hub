import { Server, Layers, Box, RotateCcw, CheckCircle, XCircle, Loader2, Activity, Rocket, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";

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
  availableTags?: string[];
  className?: string;
  disconnected?: boolean;
  onManualDeploy?: (imageTag: string) => Promise<void>;
}

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export function DeploymentSection({
  cluster,
  namespace,
  deploymentName,
  currentVersion,
  pods,
  rolloutHistory,
  availableTags = [],
  className,
  disconnected = false,
  onManualDeploy,
}: DeploymentSectionProps) {
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [isDeploying, setIsDeploying] = useState(false);

  const healthyPods = pods.filter(p => p.status === 'running').length;
  const totalPods = pods.length;

  const podStatusIcon = {
    running: <CheckCircle className="w-3 h-3 text-success" />,
    pending: <Loader2 className="w-3 h-3 text-warning animate-spin" />,
    failed: <XCircle className="w-3 h-3 text-destructive" />,
    terminated: <XCircle className="w-3 h-3 text-muted-foreground" />,
  };

  const handleManualDeploy = async () => {
    if (!selectedTag) {
      toast.error("Select an image tag first");
      return;
    }

    setIsDeploying(true);
    try {
      if (onManualDeploy) {
        await onManualDeploy(selectedTag);
      } else {
        // Default API call
        const response = await fetch(`${API_BASE_URL}/deployments/manual`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_tag: selectedTag, namespace }),
        });
        
        if (!response.ok) throw new Error('Deployment failed');
        
        const data = await response.json();
        toast.success("Deployment initiated!", {
          description: `Deploying ${selectedTag} via kubectl set image`,
        });
      }
    } catch (error) {
      toast.error("Deployment failed", {
        description: error instanceof Error ? error.message : "Check backend connection",
      });
    } finally {
      setIsDeploying(false);
    }
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

      {/* Manual Deploy Section */}
      <div className="mb-4 p-4 bg-secondary/30 border border-border/30">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Rocket className="w-3 h-3" />
          Manual Deploy (Existing Image)
        </p>
        
        <div className="flex gap-2 mb-2">
          <Select value={selectedTag} onValueChange={setSelectedTag} disabled={disconnected}>
            <SelectTrigger className="flex-1 h-8 text-xs">
              <SelectValue placeholder="Select image tag..." />
            </SelectTrigger>
            <SelectContent>
              {availableTags.length > 0 ? (
                availableTags.map((tag) => (
                  <SelectItem key={tag} value={tag} className="text-xs">
                    {tag}
                  </SelectItem>
                ))
              ) : (
                <>
                  <SelectItem value="latest">latest</SelectItem>
                  <SelectItem value="v1">v1</SelectItem>
                  <SelectItem value="v2">v2</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
          
          <Button
            size="sm"
            variant="glow"
            onClick={handleManualDeploy}
            disabled={!selectedTag || isDeploying || disconnected}
            className="gap-1"
          >
            {isDeploying ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Rocket className="w-3 h-3" />
            )}
            Deploy
          </Button>
        </div>

        {/* Important Note */}
        <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded mt-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-[10px] text-muted-foreground">
              <span className="text-amber-500 font-medium">Note:</span> This deploys an 
              <span className="text-foreground"> existing image</span> from DockerHub. 
              Does NOT build new images. Requires <code className="text-primary">ENABLE_REAL_K8S=true</code> in backend .env
            </div>
          </div>
        </div>
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
