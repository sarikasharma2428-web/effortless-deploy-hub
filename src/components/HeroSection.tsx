import { useState } from "react";
import { Rocket, Play } from "lucide-react";
import { Button } from "./ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "./ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "./ui/select";
import { useDockerImages } from "@/hooks/useMetrics";
import { useManualDeploy } from "@/hooks/useWebSocket";
import { toast } from "@/hooks/use-toast";

export function HeroSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>("");
  
  const { images, repository, loading: imagesLoading } = useDockerImages(30000);
  const { deployImage, isDeploying } = useManualDeploy();

  const handleDeploy = async () => {
    if (!selectedTag) {
      toast({
        title: "Select an image",
        description: "Please select a Docker image tag to deploy",
        variant: "destructive",
      });
      return;
    }

    try {
      await deployImage(selectedTag);
      toast({
        title: "Deployment Started",
        description: `Deploying ${repository}:${selectedTag} to Minikube`,
      });
      setIsOpen(false);
      setSelectedTag("");
    } catch (error) {
      toast({
        title: "Deployment Failed",
        description: error instanceof Error ? error.message : "Failed to start deployment",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="relative py-20 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, hsl(var(--foreground)) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

      <div className="relative container mx-auto px-6 text-center">
        {/* Decorative element */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <span className="w-12 h-px bg-gradient-to-r from-transparent to-gold/50" />
          <Rocket className="w-8 h-8 text-primary" />
          <span className="w-12 h-px bg-gradient-to-l from-transparent to-gold/50" />
        </div>

        {/* Title */}
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl tracking-[0.15em] text-foreground mb-4">
          AUTO<span className="text-primary">DEPLOY</span>X
        </h1>

        {/* Decorative divider */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="w-16 h-px bg-gold/30" />
          <span className="text-gold text-xs">◆ ◆ ◆</span>
          <span className="w-16 h-px bg-gold/30" />
        </div>

        {/* Subtitle */}
        <p className="font-serif text-xl md:text-2xl text-muted-foreground italic mb-8 max-w-2xl mx-auto">
          End-to-end DevOps automation platform for seamless CI/CD pipelines
        </p>

        {/* Description */}
        <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
          Build, test, and deploy your applications with Minikube, DockerHub, Jenkins, and Kubernetes.
          Experience the power of fully automated infrastructure.
        </p>

        {/* Deployment Button */}
        <Button 
          variant="glow" 
          size="lg" 
          className="tracking-[0.2em] uppercase"
          onClick={() => setIsOpen(true)}
        >
          <Play className="w-4 h-4 mr-2" />
          Deployment
        </Button>
      </div>

      {/* Manual Deployment Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display tracking-[0.1em]">
              Manual Deployment
            </DialogTitle>
            <DialogDescription>
              Select a Docker image to deploy directly to Minikube without triggering the full pipeline.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Docker Image</label>
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger>
                  <SelectValue placeholder="Select image tag..." />
                </SelectTrigger>
                <SelectContent>
                  {imagesLoading ? (
                    <SelectItem value="loading" disabled>Loading images...</SelectItem>
                  ) : images.length === 0 ? (
                    <SelectItem value="none" disabled>No images available</SelectItem>
                  ) : (
                    images.map((img) => (
                      <SelectItem key={img.tag} value={img.tag}>
                        {repository}:{img.tag}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">What this does:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Pulls the selected image from DockerHub</li>
                <li>Updates Kubernetes deployment on Minikube</li>
                <li>Performs rolling update with zero downtime</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="glow" 
              onClick={handleDeploy}
              disabled={isDeploying || !selectedTag}
            >
              {isDeploying ? "Deploying..." : "Deploy Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
