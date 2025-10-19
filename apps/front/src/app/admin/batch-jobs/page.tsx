import { AdminHeader } from '@/components/admin/AdminHeader';

export default function BatchJobsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader title="Batch Jobs" />
      <div className="flex-1 space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Batch Jobs</h1>
          <p className="text-muted-foreground">
            Manage and monitor your batch processing jobs
          </p>
        </div>
      </div>
    </div>
  );
}
