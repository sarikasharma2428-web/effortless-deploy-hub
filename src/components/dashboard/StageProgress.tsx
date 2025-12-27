import { CheckCircle, XCircle, Loader2, Circle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stage {
  name: string;
  status: 'success' | 'running' | 'pending' | 'failed';
  timestamp?: string;
}

interface StageProgressProps {
  stages: Stage[];
  className?: string;
}

export function StageProgress({ stages, className }: StageProgressProps) {
  const stageIcons = {
    success: <CheckCircle className="w-5 h-5 text-success" />,
    running: <Loader2 className="w-5 h-5 text-warning animate-spin" />,
    pending: <Circle className="w-5 h-5 text-muted-foreground" />,
    failed: <XCircle className="w-5 h-5 text-destructive" />,
  };

  const stageColors = {
    success: "border-success bg-success/10",
    running: "border-warning bg-warning/10",
    pending: "border-border bg-muted/20",
    failed: "border-destructive bg-destructive/10",
  };

  return (
    <div className={cn("bg-card border border-border/30 p-5", className)}>
      <h4 className="font-display text-xs tracking-[0.15em] text-muted-foreground uppercase mb-4">
        Pipeline Stages
      </h4>
      
      <div className="flex items-center justify-between overflow-x-auto py-2">
        {stages.map((stage, index) => (
          <div key={stage.name} className="flex items-center">
            {/* Stage Box */}
            <div className={cn(
              "flex flex-col items-center p-3 border min-w-[80px]",
              stageColors[stage.status]
            )}>
              {stageIcons[stage.status]}
              <span className={cn(
                "text-xs mt-2 font-medium tracking-wide text-center",
                stage.status === 'success' && "text-success",
                stage.status === 'running' && "text-warning",
                stage.status === 'pending' && "text-muted-foreground",
                stage.status === 'failed' && "text-destructive",
              )}>
                {stage.name}
              </span>
              {stage.timestamp && (
                <span className="text-[10px] text-muted-foreground mt-1">
                  {stage.timestamp}
                </span>
              )}
            </div>
            
            {/* Arrow */}
            {index < stages.length - 1 && (
              <div className="px-2">
                <ArrowRight className={cn(
                  "w-4 h-4",
                  stage.status === 'success' ? "text-success" : "text-muted-foreground/50"
                )} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
