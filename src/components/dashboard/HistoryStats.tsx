import { History, CheckCircle, XCircle, Clock, Rocket, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface HistoryStatsProps {
  totalPipelines: number;
  successCount: number;
  failureCount: number;
  lastSuccessTime?: string;
  lastDeployedVersion?: string;
  successRate: number;
  className?: string;
  disconnected?: boolean;
}

export function HistoryStats({
  totalPipelines,
  successCount,
  failureCount,
  lastSuccessTime,
  lastDeployedVersion,
  successRate,
  className,
  disconnected = false,
}: HistoryStatsProps) {
  return (
    <div className={cn(
      "bg-card border border-border/30 p-6",
      disconnected && "opacity-60",
      className
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 border border-border/50 bg-secondary/30">
          <History className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-sm tracking-[0.1em] text-foreground">
            DEPLOYMENT HISTORY
          </h3>
          <p className="text-xs text-muted-foreground">Last 30 days</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Total Pipelines */}
        <div className="p-4 bg-secondary/50 border border-border/30 text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
            <Rocket className="w-4 h-4" />
          </div>
          <p className="text-2xl font-display text-foreground">{totalPipelines}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Runs</p>
        </div>

        {/* Success Rate */}
        <div className="p-4 bg-secondary/50 border border-border/30 text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className={cn(
            "text-2xl font-display",
            successRate >= 80 ? "text-success" : successRate >= 50 ? "text-warning" : "text-destructive"
          )}>
            {successRate}%
          </p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Success Rate</p>
        </div>
      </div>

      {/* Success/Failure counts */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-3 p-3 bg-success/10 border border-success/30">
          <CheckCircle className="w-5 h-5 text-success" />
          <div>
            <p className="text-lg font-display text-success">{successCount}</p>
            <p className="text-xs text-success/70 uppercase tracking-wider">Successful</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/30">
          <XCircle className="w-5 h-5 text-destructive" />
          <div>
            <p className="text-lg font-display text-destructive">{failureCount}</p>
            <p className="text-xs text-destructive/70 uppercase tracking-wider">Failed</p>
          </div>
        </div>
      </div>

      {/* Last Success & Last Version */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-muted/30 border border-border/20">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Last Success</span>
          </div>
          <span className="text-sm text-foreground font-mono">
            {lastSuccessTime || "N/A"}
          </span>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/30">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-primary" />
            <span className="text-xs text-primary uppercase tracking-wider">Last Deployed</span>
          </div>
          <span className="text-sm text-primary font-mono font-medium">
            {lastDeployedVersion || "N/A"}
          </span>
        </div>
      </div>
    </div>
  );
}
