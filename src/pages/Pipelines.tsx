import { useState, useMemo } from "react";
import { 
  GitBranch, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Search,
  Filter,
  ArrowUpDown,
  ChevronDown,
  RefreshCw,
  Play,
  AlertCircle
} from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePipelineHistory, useTriggerDeployment } from "@/hooks/useMetrics";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SortField = 'build_number' | 'timestamp' | 'status' | 'duration';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'success' | 'failed' | 'running' | 'pending';

export default function Pipelines() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortField, setSortField] = useState<SortField>("build_number");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  
  const { pipelines, loading, error, refetch, isConnected } = usePipelineHistory(5000, 50);
  const { triggerDeployment, isDeploying } = useTriggerDeployment();

  // Filter and sort pipelines
  const filteredPipelines = useMemo(() => {
    let result = [...pipelines];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.pipeline_name.toLowerCase().includes(query) ||
        p.build_number.toString().includes(query) ||
        p.branch?.toLowerCase().includes(query) ||
        p.commit?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'build_number':
          comparison = a.build_number - b.build_number;
          break;
        case 'timestamp':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'duration':
          comparison = (a.duration || 0) - (b.duration || 0);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [pipelines, searchQuery, statusFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleTriggerPipeline = async () => {
    try {
      await triggerDeployment('autodeployx-backend');
      toast.success('Pipeline triggered successfully!');
      refetch();
    } catch (err) {
      toast.error('Failed to trigger pipeline');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-warning animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      success: "bg-success/10 text-success border-success/30",
      failed: "bg-destructive/10 text-destructive border-destructive/30",
      running: "bg-warning/10 text-warning border-warning/30",
      pending: "bg-muted/50 text-muted-foreground border-border/50",
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "--";
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Stats
  const stats = useMemo(() => {
    const total = pipelines.length;
    const success = pipelines.filter(p => p.status === 'success').length;
    const failed = pipelines.filter(p => p.status === 'failed').length;
    const running = pipelines.filter(p => p.status === 'running').length;
    return { total, success, failed, running };
  }, [pipelines]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-12">
        {/* Page Title */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-gold text-xs">◆ ◆ ◆</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl tracking-[0.15em] text-foreground mb-4">
            PIPELINE HISTORY
          </h1>
          <p className="font-serif text-lg text-muted-foreground italic">
            Complete build history with filtering and sorting
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border/30 p-4 text-center">
            <p className="text-2xl font-display text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Builds</p>
          </div>
          <div className="bg-card border border-success/30 p-4 text-center">
            <p className="text-2xl font-display text-success">{stats.success}</p>
            <p className="text-xs text-success/70 uppercase tracking-wider">Successful</p>
          </div>
          <div className="bg-card border border-destructive/30 p-4 text-center">
            <p className="text-2xl font-display text-destructive">{stats.failed}</p>
            <p className="text-xs text-destructive/70 uppercase tracking-wider">Failed</p>
          </div>
          <div className="bg-card border border-warning/30 p-4 text-center">
            <p className="text-2xl font-display text-warning">{stats.running}</p>
            <p className="text-xs text-warning/70 uppercase tracking-wider">Running</p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, build #, branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border/50"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[180px] bg-card border-border/50">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => refetch()}
              disabled={loading}
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
            <Button 
              variant="glow" 
              onClick={handleTriggerPipeline}
              disabled={isDeploying || !isConnected}
            >
              {isDeploying ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              New Pipeline
            </Button>
          </div>
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Backend not connected. Showing fallback data.
          </div>
        )}

        {/* Table */}
        <div className="bg-card border border-border/30 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort('build_number')}
                >
                  <div className="flex items-center gap-2">
                    Build #
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead>Pipeline</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead>Stage</TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort('duration')}
                >
                  <div className="flex items-center gap-2">
                    Duration
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort('timestamp')}
                >
                  <div className="flex items-center gap-2">
                    Timestamp
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && pipelines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-muted-foreground">Loading pipelines...</p>
                  </TableCell>
                </TableRow>
              ) : filteredPipelines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <GitBranch className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">No pipelines found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPipelines.map((pipeline) => (
                  <TableRow 
                    key={`${pipeline.pipeline_name}-${pipeline.build_number}`}
                    className="border-border/20 hover:bg-secondary/30"
                  >
                    <TableCell className="font-mono text-primary">
                      #{pipeline.build_number}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Play className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{pipeline.pipeline_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <GitBranch className="w-3 h-3" />
                        <span className="text-sm">{pipeline.branch || 'main'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-1 border text-xs uppercase tracking-wider",
                        getStatusBadge(pipeline.status)
                      )}>
                        {getStatusIcon(pipeline.status)}
                        {pipeline.status}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {pipeline.stage || '--'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatDuration(pipeline.duration)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(pipeline.timestamp)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Info */}
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Showing {filteredPipelines.length} of {pipelines.length} pipelines
        </div>
      </main>
    </div>
  );
}
