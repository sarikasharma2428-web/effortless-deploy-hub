import { Terminal, Loader2, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogEntry {
  timestamp: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
}

interface TerminalOutputProps {
  logs: LogEntry[];
  className?: string;
  loading?: boolean;
  disconnected?: boolean;
}

export function TerminalOutput({ logs, className, loading = false, disconnected = false }: TerminalOutputProps) {
  return (
    <div className={cn("bg-card border border-border/30 overflow-hidden", className)}>
      {/* Terminal Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-secondary/50 border-b border-border/30">
        <div className="flex gap-2">
          <div className={cn("w-3 h-3", disconnected ? "bg-destructive/60" : "bg-destructive/60")} />
          <div className={cn("w-3 h-3", disconnected ? "bg-muted/60" : "bg-warning/60")} />
          <div className={cn("w-3 h-3", disconnected ? "bg-muted/60" : "bg-success/60")} />
        </div>
        <div className="flex items-center gap-2">
          {disconnected ? (
            <WifiOff className="w-4 h-4 text-destructive" />
          ) : (
            <Terminal className="w-4 h-4 text-primary" />
          )}
          <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
            {disconnected ? "Disconnected" : "Live Logs"}
          </span>
          {loading && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
        </div>
      </div>

      {/* Terminal Content */}
      <div className="p-4 font-mono text-xs max-h-80 overflow-y-auto bg-background/50">
        {disconnected ? (
          <div className="text-center py-8 text-muted-foreground">
            <WifiOff className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>Backend not connected</p>
            <p className="text-xs mt-2">Run: <code className="bg-secondary px-1">docker-compose up</code></p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Terminal className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>Waiting for deployment activity...</p>
            <p className="text-xs mt-2">Logs will appear here when pipelines run</p>
          </div>
        ) : (
          <>
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
          </>
        )}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
          <span className="text-primary">$</span>
          <span className="w-2 h-4 bg-primary terminal-cursor" />
        </div>
      </div>
    </div>
  );
}
