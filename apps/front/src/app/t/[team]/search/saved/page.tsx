import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { SavedSearches } from "@/components/saved-searches";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

export default function SavedSearchesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">
                <Home className="h-4 w-4" />
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/search">Search</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink>Saved Searches</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Saved Searches</h2>
        </div>
        <DashboardShell>
          <SavedSearches />
        </DashboardShell>
      </div>
    </div>
  );
}
