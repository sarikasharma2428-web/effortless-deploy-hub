import { useState, useMemo } from "react";
import {
  Rocket,
  Container,
  GitBranch,
  CheckCircle,
  Activity,
} from "lucide-react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { MetricCard } from "@/components/MetricCard";
import { PipelineCard } from "@/components/PipelineCard";
import { InfrastructureTopology } from "@/components/InfrastructureTopology";
import { TerminalOutput } from "@/components/TerminalOutput";
import { QuickActions } from "@/components/QuickActions";
import { ConfigFilesModal } from "@/components/ConfigFilesModal";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { Button } from "@/components/ui/button";
import { useMetrics, useLogs, usePipelines } from "@/hooks/useMetrics";

// Fallback data when backend is not connected
const fallbackPipelines = [
  {
    name: "autodeployx-backend",
    branch: "main",
    commit: "a3f2d1c",
    author: "sarika-03",
    stages: [
      { name: "Checkout", status: "pending" as const },
      { name: "Build", status: "pending" as const },
      { name: "Test", status: "pending" as const },
      { name: "Push", status: "pending" as const },
      { name: "Deploy", status: "pending" as const },
    ],
    startedAt: "Waiting...",
  },
];

export default function Index() {
  const [showConfigFiles, setShowConfigFiles] = useState(false);
  
  // Real-time data hooks with polling
  const { metrics, loading: metricsLoading, isConnected, refetch: refetchMetrics } = useMetrics(5000);
  const { logs, loading: logsLoading } = useLogs(3000, 20);
  const { pipelines: pipelineBuilds } = usePipelines(5000, 10);

  // Transform pipeline builds to display format
  const displayPipelines = useMemo(() => {
    if (!isConnected || pipelineBuilds.length === 0) {
      return fallbackPipelines;
    }

    return pipelineBuilds.slice(0, 3).map((build) => ({
      name: build.pipeline_name,
      branch: "main",
      commit: `#${build.build_number}`,
      author: "jenkins",
      stages: [
        { name: "Checkout", status: build.stage === "checkout" ? "running" as const : build.status === "success" ? "success" as const : "pending" as const },
        { name: "Build", status: build.stage === "build" ? "running" as const : build.status === "success" ? "success" as const : "pending" as const },
        { name: "Test", status: build.stage === "test" ? "running" as const : build.status === "success" ? "success" as const : "pending" as const },
        { name: "Push", status: build.stage === "push" ? "running" as const : build.status === "success" ? "success" as const : "pending" as const },
        { name: "Deploy", status: build.stage === "complete" ? "success" as const : build.stage === "failed" ? "failed" as const : build.status === "running" ? "running" as const : "pending" as const },
      ],
      startedAt: new Date(build.timestamp).toLocaleTimeString(),
    }));
  }, [isConnected, pipelineBuilds]);

  // Get last updated time
  const lastUpdated = metrics?.timestamp 
    ? new Date(metrics.timestamp).toLocaleTimeString()
    : undefined;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />

      {/* Metrics Section */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-6">
          {/* Section Title */}
          <div className="text-center mb-8">
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

          {/* Connection Status */}
          <div className="flex justify-center mb-8">
            <ConnectionStatus
              isConnected={isConnected}
              lastUpdated={lastUpdated}
              onRefresh={refetchMetrics}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Deployments"
              value={metrics?.deployments.total ?? 0}
              subtitle="This month"
              icon={Rocket}
              loading={metricsLoading}
              disconnected={!isConnected}
            />
            <MetricCard
              title="Docker Images"
              value={metrics?.docker_images.count ?? 0}
              subtitle="In DockerHub"
              icon={Container}
              loading={metricsLoading}
              disconnected={!isConnected}
            />
            <MetricCard
              title="Active Pipelines"
              value={metrics?.pipelines.active ?? 0}
              subtitle="Currently running"
              icon={Activity}
              loading={metricsLoading}
              disconnected={!isConnected}
            />
            <MetricCard
              title="Success Rate"
              value={`${metrics?.success_rate.rate ?? 0}%`}
              subtitle="Last 30 days"
              icon={CheckCircle}
              loading={metricsLoading}
              disconnected={!isConnected}
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
                {displayPipelines.map((pipeline, index) => (
                  <PipelineCard key={`${pipeline.name}-${pipeline.commit}-${index}`} {...pipeline} />
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
                <TerminalOutput 
                  logs={logs} 
                  loading={logsLoading}
                  disconnected={!isConnected}
                />
              </div>

              <QuickActions onViewFiles={() => setShowConfigFiles(true)} isConnected={isConnected} />
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
