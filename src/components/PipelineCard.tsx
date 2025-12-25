import { GitBranch, Clock, User, ArrowRight } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";

interface PipelineStage {
  name: string;
  status: "success" | "running" | "pending" | "failed";
  duration?: string;
}

interface PipelineCardProps {
  name: string;
  branch: string;
  commit: string;
  author: string;
  stages: PipelineStage[];
  startedAt: string;
  className?: string;
}

export function PipelineCard({
  name,
  branch,
  commit,
  author,
  stages,
  startedAt,
  className,
}: PipelineCardProps) {
  const overallStatus = stages.some((s) => s.status === "failed")
    ? "failed"
    : stages.some((s) => s.status === "running")
    ? "running"
    : stages.every((s) => s.status === "success")
    ? "success"
    : "pending";

  return (
    <div
      className={cn(
        "group bg-card border border-border/30 p-5 card-hover cursor-pointer",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display text-sm tracking-[0.1em] text-foreground mb-2 group-hover:text-primary transition-colors">
            {name.toUpperCase()}
          </h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <GitBranch className="w-3 h-3" />
              {branch}
            </span>
            <span className="font-mono bg-secondary px-2 py-0.5">
              {commit}
            </span>
          </div>
        </div>
        <StatusBadge status={overallStatus} />
      </div>

      {/* Pipeline Stages */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto py-2">
        {stages.map((stage, index) => (
          <div key={stage.name} className="flex items-center">
            <div
              className={cn(
                "px-3 py-1.5 text-xs transition-all border",
                stage.status === "success" && "bg-success/10 border-success/30 text-success",
                stage.status === "running" && "bg-primary/10 border-primary/30 text-primary",
                stage.status === "pending" && "bg-secondary border-border/50 text-muted-foreground",
                stage.status === "failed" && "bg-destructive/10 border-destructive/30 text-destructive"
              )}
            >
              <span className="font-medium whitespace-nowrap">{stage.name}</span>
            </div>
            {index < stages.length - 1 && (
              <ArrowRight className="w-3 h-3 text-muted-foreground mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/30">
        <span className="flex items-center gap-1.5">
          <User className="w-3 h-3" />
          {author}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          {startedAt}
        </span>
      </div>
    </div>
  );
}
