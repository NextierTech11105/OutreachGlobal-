import { getTitle } from "@/config/title";
import { PropertyList } from "@/features/property/components/property-list";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: getTitle("Properties"),
};

export default function PropertiesPage() {
  return (
    <TeamSection>
      <TeamHeader title="Properties" />
      <div className="container">
        <div className="mb-4">
          <TeamTitle>Properties</TeamTitle>
        </div>

        <PropertyList />
      </div>
    </TeamSection>
  );
}
