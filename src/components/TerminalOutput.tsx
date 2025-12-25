import { Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogEntry {
  timestamp: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
}

interface TerminalOutputProps {
  logs: LogEntry[];
  className?: string;
}

export function TerminalOutput({ logs, className }: TerminalOutputProps) {
  return (
    <div className={cn("bg-card border border-border/30 overflow-hidden", className)}>
      {/* Terminal Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-secondary/50 border-b border-border/30">
        <div className="flex gap-2">
          <div className="w-3 h-3 bg-destructive/60" />
          <div className="w-3 h-3 bg-warning/60" />
          <div className="w-3 h-3 bg-success/60" />
        </div>
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
            Live Logs
          </span>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="p-4 font-mono text-xs max-h-80 overflow-y-auto bg-background/50">
        {logs.map((log, index) => (
          <div
            key={index}
            className="flex gap-3 py-1.5 hover:bg-secondary/20 px-2 -mx-2 transition-colors"
          >
            <span className="text-muted-foreground shrink-0">
              [{log.timestamp}]
            </span>
            <span
              className={cn(
                "shrink-0 uppercase font-bold",
                log.level === "info" && "text-primary",
                log.level === "success" && "text-success",
                log.level === "warning" && "text-warning",
                log.level === "error" && "text-destructive"
              )}
            >
              {log.level}
            </span>
            <span className="text-foreground/80">{log.message}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
          <span className="text-primary">$</span>
          <span className="w-2 h-4 bg-primary terminal-cursor" />
        </div>
      </div>
    </div>
  );
}
