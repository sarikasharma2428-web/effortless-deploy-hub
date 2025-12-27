import { useState, useMemo } from "react";
import {
  Rocket,
  Container,
  GitBranch,
  CheckCircle,
  Activity,
  Server,
  History,
} from "lucide-react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { MetricCard } from "@/components/MetricCard";
import { InfrastructureTopology } from "@/components/InfrastructureTopology";
import { TerminalOutput } from "@/components/TerminalOutput";
import { QuickActions } from "@/components/QuickActions";
import { ConfigFilesModal } from "@/components/ConfigFilesModal";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { Button } from "@/components/ui/button";
import { PipelineStatusCard } from "@/components/dashboard/PipelineStatusCard";
import { DockerSection } from "@/components/dashboard/DockerSection";
import { DeploymentSection } from "@/components/dashboard/DeploymentSection";
import { HistoryStats } from "@/components/dashboard/HistoryStats";
import { StageProgress } from "@/components/dashboard/StageProgress";
import { 
  useMetrics, 
  useLogs, 
  usePipelines,
  useCurrentPipeline,
  useDockerImages,
  useDeploymentInfo,
  useHistoryStats,
} from "@/hooks/useMetrics";

// Fallback data when backend is not connected
const fallbackPipeline = {
  pipelineName: "AutoDeployX",
  buildNumber: 0,
  status: "pending" as const,
  currentStage: "Waiting for connection...",
  branch: "main",
  startTime: "--:--",
  duration: undefined as string | undefined,
  stages: [
    { name: "Checkout", status: "pending" as const },
    { name: "Test", status: "pending" as const },
    { name: "Build", status: "pending" as const },
    { name: "Push", status: "pending" as const },
    { name: "Deploy", status: "pending" as const },
  ],
};

const fallbackDocker = {
  imageName: "sarika1731/autodeployx",
  registry: "DockerHub",
  tags: [] as Array<{ tag: string; pushedAt: string }>,
  latestPushTime: "--",
  totalImages: 0,
};

const fallbackDeployment: {
  cluster: string;
  namespace: string;
  deploymentName: string;
  currentVersion: string;
  pods: Array<{ name: string; status: 'running' | 'pending' | 'failed' | 'terminated'; restarts?: number }>;
  rolloutHistory: Array<{ revision: number; image: string; timestamp: string; status: 'success' | 'failed' | 'rolling' }>;
} = {
  cluster: "minikube",
  namespace: "default",
  deploymentName: "autodeployx-app",
  currentVersion: "--",
  pods: [],
  rolloutHistory: [],
};

const fallbackHistory = {
  totalPipelines: 0,
  successCount: 0,
  failureCount: 0,
  lastSuccessTime: "--",
  lastDeployedVersion: "--",
  successRate: 0,
};

export default function Index() {
  const [showConfigFiles, setShowConfigFiles] = useState(false);
  
  // Real-time data hooks with polling
  const { metrics, loading: metricsLoading, isConnected, refetch: refetchMetrics } = useMetrics(5000);
  const { logs, loading: logsLoading } = useLogs(3000, 20);
  const { pipeline: currentPipeline } = useCurrentPipeline(2000);
  const { images: dockerImages, repository: dockerRepo } = useDockerImages(10000);
  const { deployment } = useDeploymentInfo(5000);
  const { history } = useHistoryStats(10000);

  // Get display data with fallbacks
  const displayPipeline = useMemo(() => {
    if (!isConnected || !currentPipeline) return fallbackPipeline;
    return currentPipeline;
  }, [isConnected, currentPipeline]);

  const displayDocker = useMemo(() => {
    if (!isConnected) return fallbackDocker;
    return {
      imageName: dockerRepo,
      registry: "DockerHub",
      tags: dockerImages.map(img => ({ tag: img.tag, pushedAt: img.pushedAt })),
      latestPushTime: dockerImages[0]?.pushedAt || "--",
      totalImages: metrics?.docker_images.count ?? dockerImages.length,
    };
  }, [isConnected, dockerImages, dockerRepo, metrics]);

  const displayDeployment = useMemo(() => {
    if (!isConnected || !deployment) return fallbackDeployment;
    return deployment;
  }, [isConnected, deployment]);

  const displayHistory = useMemo(() => {
    if (!isConnected || !history) return fallbackHistory;
    return history;
  }, [isConnected, history]);

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

      {/* Current Pipeline Status Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-gold text-xs">◆ ◆ ◆</span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl tracking-[0.15em] text-foreground mb-4">
              CURRENT PIPELINE
            </h2>
            <p className="font-serif text-lg text-muted-foreground italic">
              Real-time tracking of your active deployment pipeline
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            {/* Pipeline Status Card */}
            <PipelineStatusCard
              pipelineName={displayPipeline.pipelineName}
              buildNumber={displayPipeline.buildNumber}
              status={displayPipeline.status}
              currentStage={displayPipeline.currentStage}
              branch={displayPipeline.branch}
              startTime={displayPipeline.startTime}
              duration={displayPipeline.duration}
            />

            {/* Stage Progress */}
            <StageProgress stages={displayPipeline.stages} />
          </div>
        </div>
      </section>

      {/* Docker & Deployment Section */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-gold text-xs">◆ ◆ ◆</span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl tracking-[0.15em] text-foreground mb-4">
              DOCKER & KUBERNETES
            </h2>
            <p className="font-serif text-lg text-muted-foreground italic">
              Track your images and Minikube deployments
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Docker Section */}
            <DockerSection
              imageName={displayDocker.imageName}
              registry={displayDocker.registry}
              tags={displayDocker.tags}
              latestPushTime={displayDocker.latestPushTime}
              totalImages={displayDocker.totalImages}
              disconnected={!isConnected}
            />

            {/* Deployment Section */}
            <DeploymentSection
              cluster={displayDeployment.cluster}
              namespace={displayDeployment.namespace}
              deploymentName={displayDeployment.deploymentName}
              currentVersion={displayDeployment.currentVersion}
              pods={displayDeployment.pods}
              rolloutHistory={displayDeployment.rolloutHistory}
              disconnected={!isConnected}
            />
          </div>
        </div>
      </section>

      {/* History & Logs Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-gold text-xs">◆ ◆ ◆</span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl tracking-[0.15em] text-foreground mb-4">
              HISTORY & LOGS
            </h2>
            <p className="font-serif text-lg text-muted-foreground italic">
              Pipeline history and real-time deployment logs
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* History Stats */}
            <HistoryStats
              totalPipelines={displayHistory.totalPipelines}
              successCount={displayHistory.successCount}
              failureCount={displayHistory.failureCount}
              lastSuccessTime={displayHistory.lastSuccessTime}
              lastDeployedVersion={displayHistory.lastDeployedVersion}
              successRate={displayHistory.successRate}
              disconnected={!isConnected}
            />

            {/* Live Logs & Quick Actions */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
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

      {/* Infrastructure */}
      <InfrastructureTopology />

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
