import { Server, Database, Container, Globe, Box, Cpu, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface NodeProps {
  icon: React.ReactNode;
  label: string;
  status: "healthy" | "warning" | "error";
  details?: string;
}

function TopologyNode({ icon, label, status, details }: NodeProps) {
  return (
    <div className="flex flex-col items-center p-5 bg-card border border-border/30 group card-hover cursor-pointer">
      {/* Top accent */}
      <div className={cn(
        "w-8 h-0.5 -mt-5 mb-4",
        status === "healthy" && "bg-success",
        status === "warning" && "bg-warning",
        status === "error" && "bg-destructive"
      )} />
      
      <div className={cn(
        "p-4 border mb-3 transition-all group-hover:scale-110",
        status === "healthy" && "border-success/30 text-success",
        status === "warning" && "border-warning/30 text-warning",
        status === "error" && "border-destructive/30 text-destructive"
      )}>
        {icon}
      </div>
      
      <span className="font-display text-xs tracking-[0.15em] text-foreground">{label.toUpperCase()}</span>
      {details && (
        <span className="text-[10px] text-muted-foreground mt-1">{details}</span>
      )}
      
      <div className={cn(
        "w-2 h-2 mt-3 status-indicator",
        status === "healthy" && "bg-success active",
        status === "warning" && "bg-warning active",
        status === "error" && "bg-destructive active"
      )} />
    </div>
  );
}

export function InfrastructureTopology() {
  const nodes = [
    { icon: <Globe className="w-5 h-5" />, label: "GitHub", status: "healthy" as const, details: "Source" },
    { icon: <Server className="w-5 h-5" />, label: "Jenkins", status: "healthy" as const, details: "CI/CD" },
    { icon: <Container className="w-5 h-5" />, label: "DockerHub", status: "healthy" as const, details: "Registry" },
    { icon: <Box className="w-5 h-5" />, label: "Minikube", status: "healthy" as const, details: "Cluster" },
    { icon: <Database className="w-5 h-5" />, label: "Database", status: "healthy" as const, details: "PostgreSQL" },
  ];

  return (
    <section className="py-16">
      <div className="container mx-auto px-6">
        {/* Section Title */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-gold text-xs">◆ ◆ ◆</span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl tracking-[0.15em] text-foreground mb-4">
            INFRASTRUCTURE
          </h2>
          <p className="font-serif text-lg text-muted-foreground italic max-w-xl mx-auto">
            Your complete DevOps pipeline topology at a glance
          </p>
        </div>

        {/* Nodes Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {nodes.map((node) => (
            <TopologyNode key={node.label} {...node} />
          ))}
        </div>

        {/* Legend */}
        <div className="mt-8 flex items-center justify-center gap-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-3 h-3 bg-success" />
            <span className="uppercase tracking-wider">Healthy</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-3 h-3 bg-warning" />
            <span className="uppercase tracking-wider">Warning</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-3 h-3 bg-destructive" />
            <span className="uppercase tracking-wider">Error</span>
          </div>
        </div>
      </div>
    </section>
  );
}
