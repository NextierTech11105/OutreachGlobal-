import type { Metadata } from "next";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { getTitle } from "@/config/title";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { Button } from "@/components/ui/button";
import { TeamLink } from "@/features/team/components/team-link";
import { LeadsPageClient } from "./leads-page-client";

export const metadata: Metadata = {
  title: getTitle("Leads"),
  description: "Manage and track your leads through the sales pipeline",
};

export default function LeadsPage() {
  return (
    <TeamSection>
      <TeamHeader title="Leads" />

      <div className="container">
        <div className="mb-4 flex justify-between items-center">
          <TeamTitle>Leads</TeamTitle>

          <div className="flex items-center gap-2">
            <Button asChild>
              <TeamLink href="/leads/create">Add Manually</TeamLink>
            </Button>

            <Button asChild variant="outline">
              <TeamLink href="/leads/import-business-list">
                Import Contacts
              </TeamLink>
            </Button>

            <Button asChild variant="outline">
              <TeamLink href="/leads/import-companies">
                Search Companies
              </TeamLink>
            </Button>
          </div>
        </div>
        <LeadsPageClient />
      </div>
    </TeamSection>
  );
}
