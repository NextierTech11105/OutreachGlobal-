import { getTitle } from "@/config/title";
import { PropertyList } from "@/features/property/components/property-list";
import { PropertySearch } from "@/components/property-search/property-search";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Metadata } from "next";
import { Search, Database } from "lucide-react";

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

        <Tabs defaultValue="search" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search New Properties
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Saved Properties
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search">
            <PropertySearch />
          </TabsContent>

          <TabsContent value="saved">
            <PropertyList />
          </TabsContent>
        </Tabs>
      </div>
    </TeamSection>
  );
}
