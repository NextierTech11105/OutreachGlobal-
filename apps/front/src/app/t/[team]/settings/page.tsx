import type React from "react";
import type { Metadata } from "next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSettings } from "@/features/user/components/profile-settings";
import { TeamSettings } from "@/features/team/components/team-settings";
import { getTitle } from "@/config/title";
import { BusinessListSettings } from "@/features/team/components/business-list-settings";

export const metadata: Metadata = {
  title: getTitle("Settings"),
  description: "Manage your OutreachGlobal settings",
};

export default function SettingsPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general" className="min-w-40">
            General
          </TabsTrigger>
          <TabsTrigger value="teams" className="min-w-40">
            Teams
          </TabsTrigger>
          <TabsTrigger value="business-list" className="min-w-40">
            Business List
          </TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="space-y-4">
          <ProfileSettings />
        </TabsContent>
        <TabsContent value="teams" className="space-y-4">
          <TeamSettings />
        </TabsContent>
        <TabsContent value="business-list" className="space-y-4">
          <BusinessListSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
