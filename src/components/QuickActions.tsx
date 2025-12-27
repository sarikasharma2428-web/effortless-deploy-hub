import { Play, RotateCcw, Settings, Download, FileCode, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { useTriggerDeployment, useRollback } from "@/hooks/useMetrics";
import { toast } from "sonner";
import { useState } from "react";

interface QuickActionsProps {
  onViewFiles?: () => void;
  isConnected?: boolean;
}

export function QuickActions({ onViewFiles, isConnected = false }: QuickActionsProps) {
  const { triggerDeployment, isDeploying } = useTriggerDeployment();
  const { rollback, isRollingBack } = useRollback();
  const [lastDeploymentId, setLastDeploymentId] = useState<string | null>(null);

  const handleDeploy = async () => {
    if (!isConnected) {
      toast.error("Backend not connected", {
        description: "Start your backend server first: docker-compose up",
      });
      return;
    }

    try {
      toast.info("Triggering deployment...", {
        description: "Jenkins pipeline will start shortly",
      });
      
      const result = await triggerDeployment("autodeployx-backend");
      setLastDeploymentId(result.deployment_id);
      
      toast.success("Deployment triggered!", {
        description: `Pipeline #${result.build_number || 'new'} started`,
      });
    } catch (error) {
      toast.error("Failed to trigger deployment", {
        description: error instanceof Error ? error.message : "Check backend connection",
      });
    }
  };

  const handleRollback = async () => {
    if (!isConnected) {
      toast.error("Backend not connected");
      return;
    }

    if (!lastDeploymentId) {
      toast.warning("No recent deployment to rollback", {
        description: "Deploy first, then you can rollback",
      });
      return;
    }

    try {
      await rollback(lastDeploymentId);
      toast.success("Rollback initiated", {
        description: "Previous version will be restored",
      });
    } catch (error) {
      toast.error("Rollback failed", {
        description: error instanceof Error ? error.message : "Check backend connection",
      });
    }
  };

  const handleConfigure = () => {
    toast.info("Configuration", {
      description: "Open Jenkins UI at http://localhost:8080",
    });
  };

  const handleExport = () => {
    toast.info("Exporting logs...", {
      description: "Download will start shortly",
    });
    // This would call GET /logs/export endpoint
  };

  return (
    <div className="bg-card border border-border/30 p-6">
      {/* Title */}
      <div className="text-center mb-6">
        <h3 className="font-display text-lg tracking-[0.15em] text-foreground">
          QUICK ACTIONS
        </h3>
        {!isConnected && (
          <p className="text-xs text-destructive mt-2">Backend disconnected</p>
        )}
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {/* Deploy Button */}
        <Button
          variant="glow"
          className="flex flex-col gap-2 h-auto py-5"
          onClick={handleDeploy}
          disabled={isDeploying || !isConnected}
        >
          {isDeploying ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Play className="w-5 h-5" />
          )}
          <span className="text-xs tracking-wider uppercase">
            {isDeploying ? "Deploying..." : "Deploy"}
          </span>
        </Button>

        {/* Rollback Button */}
        <Button
          variant="outline"
          className="flex flex-col gap-2 h-auto py-5"
          onClick={handleRollback}
          disabled={isRollingBack || !isConnected}
        >
          {isRollingBack ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <RotateCcw className="w-5 h-5" />
          )}
          <span className="text-xs tracking-wider uppercase">
            {isRollingBack ? "Rolling..." : "Rollback"}
          </span>
        </Button>

        {/* Configure Button */}
        <Button
          variant="outline"
          className="flex flex-col gap-2 h-auto py-5"
          onClick={handleConfigure}
        >
          <Settings className="w-5 h-5" />
          <span className="text-xs tracking-wider uppercase">Configure</span>
        </Button>

        {/* Export Button */}
        <Button
          variant="outline"
          className="flex flex-col gap-2 h-auto py-5"
          onClick={handleExport}
          disabled={!isConnected}
        >
          <Download className="w-5 h-5" />
          <span className="text-xs tracking-wider uppercase">Export</span>
        </Button>
      </div>

      {/* Config Files Button */}
      <Button
        variant="terminal"
        className="w-full justify-center gap-3 h-12 tracking-wider uppercase"
        onClick={onViewFiles}
      >
        <FileCode className="w-5 h-5" />
        <span>View Configuration Files</span>
      </Button>
    </div>
  );
}
