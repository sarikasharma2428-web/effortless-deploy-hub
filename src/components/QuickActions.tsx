import { Settings, Download, FileCode, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";

interface QuickActionsProps {
  onViewFiles?: () => void;
  isConnected?: boolean;
}

export function QuickActions({ onViewFiles, isConnected = false }: QuickActionsProps) {

  const handleOpenJenkins = () => {
    toast.info("Opening Jenkins", {
      description: "Jenkins handles all deployments",
    });
    window.open("http://localhost:8080", "_blank");
  };

  const handleExport = () => {
    toast.info("Exporting logs...", {
      description: "Download will start shortly",
    });
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

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-primary/10 border border-primary/30">
        <p className="text-xs text-primary text-center">
          🚀 All deployments are triggered via <strong>Jenkins Pipeline</strong>
        </p>
        <p className="text-xs text-muted-foreground text-center mt-1">
          Dashboard → Jenkins → Docker Hub → Kubernetes
        </p>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {/* Open Jenkins Button */}
        <Button
          variant="glow"
          className="flex flex-col gap-2 h-auto py-5"
          onClick={handleOpenJenkins}
        >
          <ExternalLink className="w-5 h-5" />
          <span className="text-xs tracking-wider uppercase">Jenkins</span>
        </Button>

        {/* Configure Button */}
        <Button
          variant="outline"
          className="flex flex-col gap-2 h-auto py-5"
          onClick={handleOpenJenkins}
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
