import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "relative bg-card border border-border/30 p-6 text-center group card-hover",
        className
      )}
    >
      {/* Top border accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-0.5 bg-primary" />

      {/* Icon */}
      <div className="flex justify-center mb-4">
        <div className="p-4 border border-border/50 group-hover:border-primary/50 transition-colors">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>

      {/* Value */}
      <p className="font-display text-3xl text-foreground tracking-wider mb-2">{value}</p>
      
      {/* Title */}
      <p className="text-sm text-muted-foreground uppercase tracking-[0.15em]">{title}</p>
      
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
      )}
    </div>
  );
}
