import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSettings } from "@/components/profile-settings";
import { NotificationSettings } from "@/components/notification-settings";
import { BillingSettings } from "@/components/billing-settings";

export default function AccountPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex flex-col space-y-2">
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">
              <Home className="h-4 w-4 mr-2" />
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink>Account</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
        <h2 className="text-3xl font-bold tracking-tight">Account Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="space-y-4">
          <ProfileSettings />
        </TabsContent>
        <TabsContent value="notifications" className="space-y-4">
          <NotificationSettings />
        </TabsContent>
        <TabsContent value="billing" className="space-y-4">
          <BillingSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
