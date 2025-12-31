import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { AddressVerificationModule } from "@/components/address-verification-module";

export default function VerifyEnrichPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Upload & Verify</h2>
        </div>
        <DashboardShell>
          <AddressVerificationModule />
        </DashboardShell>
      </div>
    </div>
  );
}
