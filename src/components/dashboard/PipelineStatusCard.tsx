import { GitBranch, Clock, Play, CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineStatusCardProps {
  pipelineName: string;
  buildNumber: number;
  status: 'running' | 'success' | 'failed' | 'pending';
  currentStage: string;
  branch?: string;
  startTime?: string;
  duration?: string;
  className?: string;
}

export function PipelineStatusCard({
  pipelineName,
  buildNumber,
  status,
  currentStage,
  branch = "main",
  startTime,
  duration,
  className,
}: PipelineStatusCardProps) {
  const statusConfig = {
    running: {
      icon: Loader2,
      color: "text-warning",
      bg: "bg-warning/10",
      border: "border-warning/30",
      label: "RUNNING",
      animate: true,
    },
    success: {
      icon: CheckCircle,
      color: "text-success",
      bg: "bg-success/10",
      border: "border-success/30",
      label: "SUCCESS",
      animate: false,
    },
    failed: {
      icon: XCircle,
      color: "text-destructive",
      bg: "bg-destructive/10",
      border: "border-destructive/30",
      label: "FAILED",
      animate: false,
    },
    pending: {
      icon: AlertCircle,
      color: "text-muted-foreground",
      bg: "bg-muted/10",
      border: "border-border/30",
      label: "PENDING",
      animate: false,
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div
      className={cn(
        "bg-card border border-border/30 p-5 card-hover",
        className
      )}
    >
      {/* Header with Status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Play className="w-4 h-4 text-primary" />
            <h4 className="font-display text-sm tracking-[0.1em] text-foreground">
              {pipelineName.toUpperCase()}
            </h4>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Build #{buildNumber}
          </p>
        </div>
        
        {/* Status Badge */}
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 border",
          config.bg,
          config.border
        )}>
          <StatusIcon className={cn(
            "w-4 h-4",
            config.color,
            config.animate && "animate-spin"
          )} />
          <span className={cn("text-xs font-medium tracking-wider", config.color)}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Current Stage */}
      <div className="mb-4 p-3 bg-secondary/50 border border-border/30">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          Current Stage
        </p>
        <p className={cn("text-sm font-medium", config.color)}>
          {currentStage}
        </p>
      </div>

      {/* Meta Info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <GitBranch className="w-3 h-3" />
          <span>{branch}</span>
        </div>
        {startTime && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span>{startTime}</span>
          </div>
        )}
        {duration && (
          <span className="font-mono bg-muted px-2 py-0.5">
            {duration}
          </span>
        )}
      </div>
    </div>
  );
}
