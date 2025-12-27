import { Container, Tag, Clock, Database, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface DockerImage {
  tag: string;
  pushedAt: string;
  size?: string;
}

interface DockerSectionProps {
  imageName: string;
  registry: string;
  tags: DockerImage[];
  latestPushTime?: string;
  totalImages?: number;
  className?: string;
  disconnected?: boolean;
}

export function DockerSection({
  imageName,
  registry,
  tags,
  latestPushTime,
  totalImages,
  className,
  disconnected = false,
}: DockerSectionProps) {
  return (
    <div className={cn(
      "bg-card border border-border/30 p-6",
      disconnected && "opacity-60",
      className
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 border border-border/50 bg-secondary/30">
          <Container className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-sm tracking-[0.1em] text-foreground">
            DOCKER IMAGES
          </h3>
          <p className="text-xs text-muted-foreground">{registry}</p>
        </div>
      </div>

      {/* Image Name */}
      <div className="mb-4 p-4 bg-secondary/50 border border-border/30">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          Repository
        </p>
        <div className="flex items-center gap-2">
          <p className="text-sm font-mono text-primary">{imageName}</p>
          <a 
            href={`https://hub.docker.com/r/${imageName.replace('/', '/')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-muted/30 border border-border/20">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Database className="w-3 h-3" />
            <span className="text-xs uppercase tracking-wider">Total</span>
          </div>
          <p className="text-lg font-display text-foreground">{totalImages ?? tags.length}</p>
        </div>
        <div className="p-3 bg-muted/30 border border-border/20">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Clock className="w-3 h-3" />
            <span className="text-xs uppercase tracking-wider">Last Push</span>
          </div>
          <p className="text-sm text-foreground">{latestPushTime || "N/A"}</p>
        </div>
      </div>

      {/* Tags List */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Tag className="w-3 h-3" />
          Recent Tags
        </p>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {tags.length > 0 ? (
            tags.slice(0, 5).map((image, index) => (
              <div 
                key={image.tag} 
                className={cn(
                  "flex items-center justify-between p-2 border border-border/20",
                  index === 0 ? "bg-primary/10 border-primary/30" : "bg-muted/20"
                )}
              >
                <span className={cn(
                  "font-mono text-xs",
                  index === 0 ? "text-primary" : "text-foreground"
                )}>
                  :{image.tag}
                </span>
                <span className="text-xs text-muted-foreground">
                  {image.pushedAt}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground italic">No images found</p>
          )}
        </div>
      </div>
    </div>
  );
}
