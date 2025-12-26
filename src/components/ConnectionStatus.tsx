import { cn } from "@/lib/utils";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";

interface ConnectionStatusProps {
  isConnected: boolean;
  lastUpdated?: string;
  onRefresh?: () => void;
  className?: string;
}

export function ConnectionStatus({
  isConnected,
  lastUpdated,
  onRefresh,
  className,
}: ConnectionStatusProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2 rounded-md border",
        isConnected
          ? "border-green-500/30 bg-green-500/10"
          : "border-destructive/30 bg-destructive/10",
        className
      )}
    >
      {isConnected ? (
        <Wifi className="w-4 h-4 text-green-500" />
      ) : (
        <WifiOff className="w-4 h-4 text-destructive" />
      )}
      
      <div className="flex-1">
        <p className={cn(
          "text-xs font-medium",
          isConnected ? "text-green-500" : "text-destructive"
        )}>
          {isConnected ? "Connected to Backend" : "Backend Disconnected"}
        </p>
        {lastUpdated && isConnected && (
          <p className="text-xs text-muted-foreground">
            Last updated: {lastUpdated}
          </p>
        )}
        {!isConnected && (
          <p className="text-xs text-muted-foreground">
            Start backend with: docker-compose up
          </p>
        )}
      </div>

      {onRefresh && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
