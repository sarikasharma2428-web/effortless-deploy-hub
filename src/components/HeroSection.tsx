import { Rocket } from "lucide-react";
import { Button } from "./ui/button";

export function HeroSection() {
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

        {/* CTA Button */}
        <Button variant="glow" size="lg" className="tracking-[0.2em] uppercase">
          Start Deployment
        </Button>
      </div>
    </section>
  );
}
