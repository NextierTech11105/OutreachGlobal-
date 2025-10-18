import { AdminHeader } from "@/components/admin/admin-header";
import { BatchJobManager } from "@/components/batch-job-manager";

export default function BatchJobsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader />
      <div className="flex-1 space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Batch Jobs</h1>
          <p className="text-muted-foreground mt-2">
            Manage and monitor batch processing jobs
          </p>
        </div>

        <BatchJobManager />
      </div>
    </div>
  );
}
