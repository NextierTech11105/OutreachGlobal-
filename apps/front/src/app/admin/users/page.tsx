import { TeamSettings } from "@/components/team-settings";
import { AdminHeader } from "@/components/admin/admin-header";

export default function AdminUsersPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader />
      <div className="flex-1 space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage users, teams, and permissions for your organization
          </p>
        </div>

        <TeamSettings />
      </div>
    </div>
  );
}
