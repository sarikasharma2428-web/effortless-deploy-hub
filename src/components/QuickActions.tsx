import { Play, RotateCcw, Settings, Download, FileCode } from "lucide-react";
import { Button } from "./ui/button";

interface QuickActionsProps {
  onViewFiles?: () => void;
}

export function QuickActions({ onViewFiles }: QuickActionsProps) {
  const actions = [
    { icon: Play, label: "Deploy", variant: "glow" as const },
    { icon: RotateCcw, label: "Rollback", variant: "outline" as const },
    { icon: Settings, label: "Configure", variant: "outline" as const },
    { icon: Download, label: "Export", variant: "outline" as const },
  ];

  return (
    <div className="bg-card border border-border/30 p-6">
      {/* Title */}
      <div className="text-center mb-6">
        <h3 className="font-display text-lg tracking-[0.15em] text-foreground">
          QUICK ACTIONS
        </h3>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {actions.map(({ icon: Icon, label, variant }) => (
          <Button
            key={label}
            variant={variant}
            className="flex flex-col gap-2 h-auto py-5"
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs tracking-wider uppercase">{label}</span>
          </Button>
        ))}
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
