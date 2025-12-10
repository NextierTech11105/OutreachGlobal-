"use client";

import { useState, useEffect } from "react";
import { sf } from "@/lib/utils/safe-format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Plus,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Target,
  MessageSquare,
  Phone,
  Mail,
  Users,
  Database,
  Zap,
  AlertCircle,
  TrendingUp,
  Calendar,
  FileSpreadsheet,
} from "lucide-react";
import { SignalHeatmapDashboard } from "@/components/signal-heatmap-dashboard";

// Types
interface BatchJob {
  id: string;
  name: string;
  type: "skip_trace" | "sms_campaign" | "email_campaign" | "enrichment" | "gianna_loop";
  status: "pending" | "running" | "completed" | "failed" | "paused";
  total_records: number;
  processed_records: number;
  success_count: number;
  fail_count: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  estimated_completion: string | null;
  error_message?: string;
}

interface BatchStats {
  total_jobs_today: number;
  successful_jobs: number;
  failed_jobs: number;
  records_processed_today: number;
  skip_traces_today: number;
  sms_sent_today: number;
  emails_sent_today: number;
}

// Status badge colors
const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  running: "bg-blue-500 animate-pulse",
  completed: "bg-green-500",
  failed: "bg-red-500",
  paused: "bg-gray-500",
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  running: <Loader2 className="h-4 w-4 animate-spin" />,
  completed: <CheckCircle2 className="h-4 w-4" />,
  failed: <XCircle className="h-4 w-4" />,
  paused: <Pause className="h-4 w-4" />,
};

const typeIcons: Record<string, React.ReactNode> = {
  skip_trace: <Target className="h-4 w-4 text-green-500" />,
  sms_campaign: <MessageSquare className="h-4 w-4 text-purple-500" />,
  email_campaign: <Mail className="h-4 w-4 text-blue-500" />,
  enrichment: <Database className="h-4 w-4 text-orange-500" />,
  gianna_loop: <Zap className="h-4 w-4 text-yellow-500" />,
};

// Default empty stats
const emptyStats: BatchStats = {
  total_jobs_today: 0,
  successful_jobs: 0,
  failed_jobs: 0,
  records_processed_today: 0,
  skip_traces_today: 0,
  sms_sent_today: 0,
  emails_sent_today: 0,
};

export default function BatchJobsPage() {
  // Jobs state - starts empty, populated by user creation
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [stats, setStats] = useState<BatchStats>(emptyStats);
  const [activeTab, setActiveTab] = useState("jobs");
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [newJobType, setNewJobType] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setJobs((prev) =>
        prev.map((job) => {
          if (job.status === "running" && job.processed_records < job.total_records) {
            const increment = Math.min(
              Math.floor(Math.random() * 50) + 10,
              job.total_records - job.processed_records
            );
            const newProcessed = job.processed_records + increment;
            const successRate = 0.88;
            const newSuccess = Math.floor(increment * successRate);
            return {
              ...job,
              processed_records: newProcessed,
              success_count: job.success_count + newSuccess,
              fail_count: job.fail_count + (increment - newSuccess),
              status: newProcessed >= job.total_records ? "completed" : "running",
              completed_at: newProcessed >= job.total_records ? new Date().toISOString() : null,
            };
          }
          return job;
        })
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleStartJob = (jobId: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? { ...job, status: "running", started_at: new Date().toISOString() }
          : job
      )
    );
  };

  const handlePauseJob = (jobId: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId ? { ...job, status: "paused" } : job
      )
    );
  };

  const handleRetryJob = (jobId: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              status: "running",
              started_at: new Date().toISOString(),
              error_message: undefined,
            }
          : job
      )
    );
  };

  const handleDeleteJob = (jobId: string) => {
    setJobs((prev) => prev.filter((job) => job.id !== jobId));
  };

  const handleCreateJob = () => {
    if (!newJobType) return;
    const newJob: BatchJob = {
      id: `batch-${Date.now()}`,
      name: `New ${newJobType} Job`,
      type: newJobType as BatchJob["type"],
      status: "pending",
      total_records: Math.floor(Math.random() * 1000) + 100,
      processed_records: 0,
      success_count: 0,
      fail_count: 0,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      estimated_completion: null,
    };
    setJobs((prev) => [newJob, ...prev]);
    setIsCreatingJob(false);
    setNewJobType("");
  };

  return (
    <div className="flex flex-col min-h-screen p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Batch Jobs</h1>
            <p className="text-muted-foreground">
              Manage and monitor your batch processing jobs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Dialog open={isCreatingJob} onOpenChange={setIsCreatingJob}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Batch Job
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Batch Job</DialogTitle>
                  <DialogDescription>
                    Select the type of batch job you want to create
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Job Type</Label>
                    <Select value={newJobType} onValueChange={setNewJobType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select job type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip_trace">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-green-500" />
                            Skip Trace Batch
                          </div>
                        </SelectItem>
                        <SelectItem value="sms_campaign">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-purple-500" />
                            SMS Campaign
                          </div>
                        </SelectItem>
                        <SelectItem value="email_campaign">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-blue-500" />
                            Email Campaign
                          </div>
                        </SelectItem>
                        <SelectItem value="enrichment">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-orange-500" />
                            Data Enrichment
                          </div>
                        </SelectItem>
                        <SelectItem value="gianna_loop">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-yellow-500" />
                            Gianna Loop
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Upload Data (CSV)</Label>
                    <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Drag & drop CSV file or click to browse
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreatingJob(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateJob} disabled={!newJobType}>
                      Create Job
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Jobs Today</span>
              </div>
              <div className="text-2xl font-bold mt-1">{stats.total_jobs_today}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Successful</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-green-600">{stats.successful_jobs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-xs text-muted-foreground">Failed</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-red-600">{stats.failed_jobs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">Processed</span>
              </div>
              <div className="text-2xl font-bold mt-1">{sf(stats.records_processed_today)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Skip Traces</span>
              </div>
              <div className="text-2xl font-bold mt-1">{sf(stats.skip_traces_today)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">SMS Sent</span>
              </div>
              <div className="text-2xl font-bold mt-1">{sf(stats.sms_sent_today)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Emails</span>
              </div>
              <div className="text-2xl font-bold mt-1">{sf(stats.emails_sent_today)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="jobs">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Batch Jobs
            </TabsTrigger>
            <TabsTrigger value="signals">
              <Zap className="h-4 w-4 mr-2" />
              Signal Dashboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="space-y-4 mt-4">
            {/* Jobs Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Job Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead className="text-right">Success Rate</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="font-medium">No Batch Jobs</p>
                          <p className="text-sm">Create a new batch job to get started</p>
                        </TableCell>
                      </TableRow>
                    ) : null}
                    {jobs.map((job) => {
                      const progress = job.total_records > 0
                        ? (job.processed_records / job.total_records) * 100
                        : 0;
                      const successRate = job.processed_records > 0
                        ? (job.success_count / job.processed_records) * 100
                        : 0;

                      return (
                        <TableRow key={job.id}>
                          <TableCell>
                            <div className="font-medium">{job.name}</div>
                            <div className="text-xs text-muted-foreground">{job.id}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {typeIcons[job.type]}
                              <span className="capitalize">{job.type.replace("_", " ")}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`${statusColors[job.status]} bg-opacity-20`}
                            >
                              <span className="flex items-center gap-1">
                                {statusIcons[job.status]}
                                <span className="capitalize">{job.status}</span>
                              </span>
                            </Badge>
                            {job.error_message && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertCircle className="h-4 w-4 text-red-500 ml-2" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">{job.error_message}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </TableCell>
                          <TableCell className="w-[200px]">
                            <div className="space-y-1">
                              <Progress value={progress} className="h-2" />
                              <div className="text-xs text-muted-foreground">
                                {sf(job.processed_records)} / {sf(job.total_records)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                successRate >= 90
                                  ? "text-green-600"
                                  : successRate >= 70
                                  ? "text-yellow-600"
                                  : "text-red-600"
                              }
                            >
                              {successRate.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(job.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {job.status === "pending" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleStartJob(job.id)}
                                >
                                  <Play className="h-4 w-4 text-green-500" />
                                </Button>
                              )}
                              {job.status === "running" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePauseJob(job.id)}
                                >
                                  <Pause className="h-4 w-4 text-yellow-500" />
                                </Button>
                              )}
                              {(job.status === "paused" || job.status === "failed") && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRetryJob(job.id)}
                                >
                                  <RotateCcw className="h-4 w-4 text-blue-500" />
                                </Button>
                              )}
                              {job.status === "completed" && (
                                <Button variant="ghost" size="icon">
                                  <Download className="h-4 w-4 text-green-500" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteJob(job.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signals" className="mt-4">
            <SignalHeatmapDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
