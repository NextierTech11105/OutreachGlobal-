"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  RefreshCw,
  Play,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface BatchJob {
  id: number;
  name: string;
  description: string | null;
  type: string;
  status: string;
  targetEntity: string | null;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface BatchJobItem {
  id: number;
  batchJobId: number;
  status: string;
  data: string | null;
  result: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export function BatchJobManager() {
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<BatchJob | null>(null);
  const [jobItems, setJobItems] = useState<BatchJobItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
  }, [activeTab]);

  const fetchJobs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const status = activeTab !== "all" ? activeTab : undefined;
      const response = await fetch(`/api/batch/process?status=${status || ""}`);

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch jobs");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJobDetails = async (jobId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/batch/process?jobId=${jobId}`);

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      if (data.jobs && data.jobs.length > 0) {
        setSelectedJob(data.jobs[0]);
        setJobItems(data.items || []);
      } else {
        throw new Error("Job not found");
      }
    } catch (error) {
      console.error("Error fetching job details:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch job details",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const triggerProcessing = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/batch/process", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      await fetchJobs();
    } catch (error) {
      console.error("Error triggering processing:", error);
      setError(
        error instanceof Error ? error.message : "Failed to trigger processing",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
          >
            <Clock className="mr-1 h-3 w-3" /> Pending
          </Badge>
        );
      case "processing":
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-500 border-blue-500/20"
          >
            <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Processing
          </Badge>
        );
      case "completed":
        return (
          <Badge
            variant="outline"
            className="bg-green-500/10 text-green-500 border-green-500/20"
          >
            <CheckCircle className="mr-1 h-3 w-3" /> Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge
            variant="outline"
            className="bg-red-500/10 text-red-500 border-red-500/20"
          >
            <AlertCircle className="mr-1 h-3 w-3" /> Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProgress = (job: BatchJob) => {
    if (job.totalItems === 0) return 0;
    return Math.round((job.processedItems / job.totalItems) * 100);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return "Invalid date";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Batch Job Manager</CardTitle>
            <CardDescription>
              Manage and monitor batch processing jobs
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchJobs} disabled={isLoading}>
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button onClick={triggerProcessing} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Process Jobs
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All Jobs</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4">
                      {isLoading ? "Loading..." : "No jobs found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs.map((job) => (
                    <TableRow
                      key={job.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => fetchJobDetails(job.id)}
                    >
                      <TableCell>{job.id}</TableCell>
                      <TableCell>{job.name}</TableCell>
                      <TableCell className="capitalize">
                        {job.type.replace("_", " ")}
                      </TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Progress value={getProgress(job)} className="h-2" />
                          <span className="text-xs text-muted-foreground">
                            {job.processedItems} / {job.totalItems} (
                            {job.failedItems > 0
                              ? `${job.failedItems} failed`
                              : ""}
                            )
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(job.createdAt)}</TableCell>
                      <TableCell>{formatDate(job.updatedAt)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchJobDetails(job.id);
                          }}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>

        {selectedJob && (
          <div className="mt-8">
            <h3 className="text-lg font-medium mb-4">
              Job Details: {selectedJob.name}
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Job Information</h4>
                <Card>
                  <CardContent className="p-4">
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      <dt className="font-medium">ID:</dt>
                      <dd>{selectedJob.id}</dd>
                      <dt className="font-medium">Name:</dt>
                      <dd>{selectedJob.name}</dd>
                      <dt className="font-medium">Type:</dt>
                      <dd className="capitalize">
                        {selectedJob.type.replace("_", " ")}
                      </dd>
                      <dt className="font-medium">Status:</dt>
                      <dd>{getStatusBadge(selectedJob.status)}</dd>
                      <dt className="font-medium">Target Entity:</dt>
                      <dd className="capitalize">
                        {selectedJob.targetEntity || "N/A"}
                      </dd>
                      <dt className="font-medium">Created:</dt>
                      <dd>{formatDate(selectedJob.createdAt)}</dd>
                      <dt className="font-medium">Started:</dt>
                      <dd>{formatDate(selectedJob.startedAt)}</dd>
                      <dt className="font-medium">Completed:</dt>
                      <dd>{formatDate(selectedJob.completedAt)}</dd>
                    </dl>
                  </CardContent>
                </Card>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Progress</h4>
                <Card>
                  <CardContent className="p-4">
                    <div className="mb-4">
                      <Progress
                        value={getProgress(selectedJob)}
                        className="h-2 mb-2"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Processed: {selectedJob.processedItems}</span>
                        <span>Total: {selectedJob.totalItems}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-green-500/10 rounded p-2">
                        <div className="text-lg font-medium text-green-500">
                          {selectedJob.processedItems - selectedJob.failedItems}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Successful
                        </div>
                      </div>
                      <div className="bg-red-500/10 rounded p-2">
                        <div className="text-lg font-medium text-red-500">
                          {selectedJob.failedItems}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Failed
                        </div>
                      </div>
                      <div className="bg-yellow-500/10 rounded p-2">
                        <div className="text-lg font-medium text-yellow-500">
                          {selectedJob.totalItems - selectedJob.processedItems}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Pending
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <h4 className="text-sm font-medium mb-1">Job Items</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Result/Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No items found for this job
                    </TableCell>
                  </TableRow>
                ) : (
                  jobItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.id}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
                      <TableCell>{formatDate(item.startedAt)}</TableCell>
                      <TableCell>{formatDate(item.completedAt)}</TableCell>
                      <TableCell>
                        {item.error ? (
                          <span className="text-red-500 text-sm">
                            {item.error}
                          </span>
                        ) : item.result ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              try {
                                alert(
                                  JSON.stringify(
                                    JSON.parse(item.result!),
                                    null,
                                    2,
                                  ),
                                );
                              } catch (e) {
                                alert(item.result);
                              }
                            }}
                          >
                            View Result
                          </Button>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t px-6 py-4">
        <div className="text-sm text-muted-foreground">
          {jobs.length} jobs found
        </div>
        <Button variant="outline" size="sm" onClick={fetchJobs}>
          Refresh Data
        </Button>
      </CardFooter>
    </Card>
  );
}
