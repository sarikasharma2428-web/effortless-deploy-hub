import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
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
      <p className="text-sm text-muted-foreground uppercase tracking-[0.15em] mb-1">{title}</p>
      
      {/* Subtitle/Trend */}
      {trend && (
        <p className={cn(
          "text-xs mt-2",
          trend.isPositive ? "text-success" : "text-destructive"
        )}>
          {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}% this month
        </p>
      )}
      {subtitle && !trend && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}

      {/* Read more link */}
      <a href="#" className="inline-block mt-4 text-xs text-primary hover:text-primary/80 uppercase tracking-wider">
        View Details →
      </a>
    </div>
  );
}
