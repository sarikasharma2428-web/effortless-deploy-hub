import { cn } from "@/lib/utils";

type Status = "success" | "running" | "pending" | "failed";

interface StatusBadgeProps {
  status: Status;
  label?: string;
  className?: string;
}

const statusConfig = {
  success: {
    bg: "bg-success/10 border-success/30",
    text: "text-success",
    dot: "bg-success",
    label: "Success",
  },
  running: {
    bg: "bg-primary/10 border-primary/30",
    text: "text-primary",
    dot: "bg-primary",
    label: "Running",
  },
  pending: {
    bg: "bg-secondary border-border/50",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
    label: "Pending",
  },
  failed: {
    bg: "bg-destructive/10 border-destructive/30",
    text: "text-destructive",
    dot: "bg-destructive",
    label: "Failed",
  },
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1 border text-xs font-medium uppercase tracking-wider",
        config.bg,
        config.text,
        className
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 status-indicator",
          config.dot,
          status === "running" && "active"
        )}
      />
      {label || config.label}
    </span>
  );
}
