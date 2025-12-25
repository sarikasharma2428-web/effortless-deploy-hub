import { useState } from "react";
import {
  Rocket,
  Container,
  GitBranch,
  CheckCircle,
  Activity,
} from "lucide-react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { ContactBar } from "@/components/ContactBar";
import { MetricCard } from "@/components/MetricCard";
import { PipelineCard } from "@/components/PipelineCard";
import { InfrastructureTopology } from "@/components/InfrastructureTopology";
import { TerminalOutput } from "@/components/TerminalOutput";
import { QuickActions } from "@/components/QuickActions";
import { ConfigFilesModal } from "@/components/ConfigFilesModal";
import { Button } from "@/components/ui/button";

const mockPipelines = [
  {
    name: "autodeployx-backend",
    branch: "main",
    commit: "a3f2d1c",
    author: "sarika-03",
    stages: [
      { name: "Checkout", status: "success" as const, duration: "2s" },
      { name: "Build", status: "success" as const, duration: "45s" },
      { name: "Test", status: "success" as const, duration: "1m 23s" },
      { name: "Push", status: "success" as const, duration: "32s" },
      { name: "Deploy", status: "running" as const },
    ],
    startedAt: "2 minutes ago",
  },
  {
    name: "autodeployx-frontend",
    branch: "feature/dashboard",
    commit: "b7e4f2a",
    author: "dev-team",
    stages: [
      { name: "Checkout", status: "success" as const, duration: "1s" },
      { name: "Build", status: "success" as const, duration: "1m 12s" },
      { name: "Test", status: "failed" as const, duration: "45s" },
      { name: "Push", status: "pending" as const },
      { name: "Deploy", status: "pending" as const },
    ],
    startedAt: "15 minutes ago",
  },
  {
    name: "database-migrations",
    branch: "main",
    commit: "c9d8e7f",
    author: "dba-team",
    stages: [
      { name: "Checkout", status: "success" as const, duration: "1s" },
      { name: "Validate", status: "success" as const, duration: "5s" },
      { name: "Migrate", status: "success" as const, duration: "12s" },
      { name: "Verify", status: "success" as const, duration: "3s" },
    ],
    startedAt: "1 hour ago",
  },
];

const mockLogs = [
  { timestamp: "14:32:05", level: "info" as const, message: "Starting deployment pipeline..." },
  { timestamp: "14:32:06", level: "info" as const, message: "Pulling latest code from GitHub..." },
  { timestamp: "14:32:08", level: "success" as const, message: "Code checkout complete" },
  { timestamp: "14:32:10", level: "info" as const, message: "Building Docker image: autodeployx:v1.2.3" },
  { timestamp: "14:32:45", level: "success" as const, message: "Docker image built successfully" },
  { timestamp: "14:32:47", level: "info" as const, message: "Running test suite..." },
  { timestamp: "14:34:10", level: "success" as const, message: "All 47 tests passed" },
  { timestamp: "14:34:12", level: "info" as const, message: "Pushing image to DockerHub..." },
  { timestamp: "14:34:44", level: "success" as const, message: "Image pushed: yourusername/autodeployx:v1.2.3" },
  { timestamp: "14:34:46", level: "info" as const, message: "Deploying to Minikube cluster..." },
  { timestamp: "14:35:02", level: "success" as const, message: "Deployment rollout complete - 3/3 pods ready" },
];

export default function Index() {
  const [showConfigFiles, setShowConfigFiles] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <ContactBar />

      {/* Metrics Section */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-6">
          {/* Section Title */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-gold text-xs">◆ ◆ ◆</span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl tracking-[0.15em] text-foreground mb-4">
              DEPLOYMENT METRICS
            </h2>
            <p className="font-serif text-lg text-muted-foreground italic">
              Real-time statistics from your CI/CD pipelines
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Deployments"
              value="247"
              icon={Rocket}
              trend={{ value: 12, isPositive: true }}
            />
            <MetricCard
              title="Docker Images"
              value="18"
              icon={Container}
              trend={{ value: 3, isPositive: true }}
            />
            <MetricCard
              title="Active Pipelines"
              value="5"
              subtitle="Currently running"
              icon={Activity}
            />
            <MetricCard
              title="Success Rate"
              value="94.2%"
              icon={CheckCircle}
              trend={{ value: 2.1, isPositive: true }}
            />
          </div>
        </div>
      </section>

      {/* Infrastructure */}
      <InfrastructureTopology />

      {/* Pipelines & Logs Section */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-6">
          {/* Section Title */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-gold text-xs">◆ ◆ ◆</span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl tracking-[0.15em] text-foreground mb-4">
              PIPELINE ACTIVITY
            </h2>
            <p className="font-serif text-lg text-muted-foreground italic">
              Monitor your builds, tests, and deployments in real-time
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pipelines */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <GitBranch className="w-5 h-5 text-primary" />
                <h3 className="font-display text-sm tracking-[0.15em] text-foreground">
                  RECENT PIPELINES
                </h3>
              </div>
              <div className="space-y-4">
                {mockPipelines.map((pipeline) => (
                  <PipelineCard key={pipeline.name + pipeline.commit} {...pipeline} />
                ))}
              </div>
            </div>

            {/* Logs & Actions */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Activity className="w-5 h-5 text-primary" />
                  <h3 className="font-display text-sm tracking-[0.15em] text-foreground">
                    LIVE LOGS
                  </h3>
                </div>
                <TerminalOutput logs={mockLogs} />
              </div>

              <QuickActions onViewFiles={() => setShowConfigFiles(true)} />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 border-t border-border/30">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="w-12 h-px bg-gold/50" />
            <span className="text-gold text-xs">◆</span>
            <span className="w-12 h-px bg-gold/50" />
          </div>
          <h2 className="font-display text-xl md:text-2xl tracking-[0.15em] text-foreground mb-4">
            READY TO AUTOMATE?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Download all configuration files and start deploying your applications today.
          </p>
          <Button variant="glow" size="lg" onClick={() => setShowConfigFiles(true)} className="tracking-[0.15em]">
            GET STARTED
          </Button>
        </div>
      </section>

      {/* Config Files Modal */}
      <ConfigFilesModal
        isOpen={showConfigFiles}
        onClose={() => setShowConfigFiles(false)}
      />
    </div>
  );
}
