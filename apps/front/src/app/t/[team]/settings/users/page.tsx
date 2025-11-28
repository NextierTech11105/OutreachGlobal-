import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamSettings } from "@/components/team-settings";
import { ProfileSettings } from "@/components/profile-settings";

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Users & Teams</h2>
        <p className="text-muted-foreground mt-2">
          Manage users, teams, and permissions for your organization
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="team" className="space-y-4">
            <TabsList>
              <TabsTrigger value="team">Team Management</TabsTrigger>
              <TabsTrigger value="profile">My Profile</TabsTrigger>
            </TabsList>
            <TabsContent value="team" className="space-y-4">
              <TeamSettings />
            </TabsContent>
            <TabsContent value="profile" className="space-y-4">
              <ProfileSettings />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
