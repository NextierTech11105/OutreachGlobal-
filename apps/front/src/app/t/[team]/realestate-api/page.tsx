import { getTitle } from "@/config/title";
import { RealEstateAPIExplorer } from "@/features/property/components/realestate-api-explorer";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamSection } from "@/features/team/layouts/team-section";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: getTitle("RealEstate API Explorer"),
};

export default function RealEstateAPIPage() {
  return (
    <TeamSection>
      <TeamHeader title="RealEstate API Explorer" />
      <div className="container max-w-7xl">
        <RealEstateAPIExplorer />
      </div>
    </TeamSection>
  );
}
