import { BatchJobManager } from "@/components/batch-job-manager";

export default function BatchJobsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Batch Jobs</h1>
          <p className="text-muted-foreground mt-2">
            Manage and monitor batch processing jobs
          </p>
        </div>
      </div>

      <BatchJobManager />
    </div>
  );
}
