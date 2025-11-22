import { getTitle } from "@/config/title";
import { RealEstateControlPanel } from "@/features/property/components/realestate-control-panel";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: getTitle("RealEstate API Control Panel"),
};

export default function RealEstateControlPanelPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container max-w-7xl py-4">
          <h1 className="text-2xl font-bold">RealEstate API Control Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage API operations, saved searches, and automation
          </p>
        </div>
      </div>
      <div className="container max-w-7xl py-6">
        <RealEstateControlPanel />
      </div>
    </div>
  );
}
