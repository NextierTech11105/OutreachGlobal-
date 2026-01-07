"use client";

import { useState } from "react";
import {
  ServerCog,
  Play,
  Pause,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface BatchJob {
  id: string;
  name: string;
  type: "import" | "export" | "sync" | "enrichment" | "cleanup";
  status: "running" | "completed" | "failed" | "pending" | "paused";
  progress: number;
  startedAt: string;
  duration?: string;
  recordsProcessed: number;
  totalRecords: number;
  error?: string;
}

export default function BatchJobsPage() {
  const [jobs] = useState<BatchJob[]>([
    {
      id: "1",
      name: "Lead Import - Q1 Data",
      type: "import",
      status: "running",
      progress: 67,
      startedAt: "10 minutes ago",
      recordsProcessed: 6700,
      totalRecords: 10000,
    },
    {
      id: "2",
      name: "Contact Enrichment",
      type: "enrichment",
      status: "running",
      progress: 23,
      startedAt: "25 minutes ago",
      recordsProcessed: 2300,
      totalRecords: 10000,
    },
    {
      id: "3",
      name: "CRM Sync",
      type: "sync",
      status: "completed",
      progress: 100,
      startedAt: "1 hour ago",
      duration: "15 min",
      recordsProcessed: 5000,
      totalRecords: 5000,
    },
    {
      id: "4",
      name: "Export Analytics Report",
      type: "export",
      status: "completed",
      progress: 100,
      startedAt: "2 hours ago",
      duration: "5 min",
      recordsProcessed: 150000,
      totalRecords: 150000,
    },
    {
      id: "5",
      name: "Duplicate Cleanup",
      type: "cleanup",
      status: "failed",
      progress: 45,
      startedAt: "3 hours ago",
      recordsProcessed: 4500,
      totalRecords: 10000,
      error: "Database connection timeout",
    },
    {
      id: "6",
      name: "Scheduled Lead Import",
      type: "import",
      status: "pending",
      progress: 0,
      startedAt: "Scheduled for 6:00 PM",
      recordsProcessed: 0,
      totalRecords: 8000,
    },
  ]);

  const getStatusIcon = (status: BatchJob["status"]) => {
    switch (status) {
      case "running":
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "paused":
        return <Pause className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: BatchJob["status"]) => {
    switch (status) {
      case "running":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      case "failed":
        return "bg-red-500";
      case "pending":
        return "bg-yellow-500";
      case "paused":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const runningJobs = jobs.filter((j) => j.status === "running");
  const completedJobs = jobs.filter((j) => j.status === "completed");
  const failedJobs = jobs.filter((j) => j.status === "failed");

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Batch Jobs</h1>
          <p className="text-muted-foreground">
            Monitor and manage background tasks
          </p>
        </div>
        <Button>
          <Play className="mr-2 h-4 w-4" />
          New Job
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running</CardTitle>
            <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{runningJobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Today
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedJobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedJobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Records Processed
            </CardTitle>
            <ServerCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {jobs
                .reduce((sum, j) => sum + j.recordsProcessed, 0)
                .toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs List */}
      <div className="grid gap-4">
        {jobs.map((job) => (
          <Card
            key={job.id}
            className={job.status === "failed" ? "border-red-200" : ""}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(job.status)}
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {job.name}
                      <Badge
                        className={getStatusColor(job.status) + " text-white"}
                      >
                        {job.status}
                      </Badge>
                      <Badge variant="outline">{job.type}</Badge>
                    </CardTitle>
                    <CardDescription>
                      Started {job.startedAt}
                      {job.duration && ` • Completed in ${job.duration}`}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  {job.status === "running" && (
                    <Button variant="outline" size="sm">
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </Button>
                  )}
                  {job.status === "failed" && (
                    <Button variant="outline" size="sm">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retry
                    </Button>
                  )}
                  {job.status === "paused" && (
                    <Button size="sm">
                      <Play className="mr-2 h-4 w-4" />
                      Resume
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {job.error && (
                <div className="flex items-center gap-2 text-red-600 mb-4 p-3 bg-red-50 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{job.error}</span>
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span>
                    {job.recordsProcessed.toLocaleString()} /{" "}
                    {job.totalRecords.toLocaleString()} records
                  </span>
                </div>
                <Progress
                  value={job.progress}
                  className={job.status === "failed" ? "bg-red-100" : ""}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
