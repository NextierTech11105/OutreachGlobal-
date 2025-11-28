import { CallCenterDashboard } from "@/components/call-center-dashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CallCenterQuickStats } from "@/features/power-dialer/components/call-center-quick-stats";
import { CallHistoryList } from "@/features/power-dialer/components/call-history-list";
import { PowerDialerList } from "@/features/power-dialer/components/power-dialer-list";

export default function CallCenterPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 space-y-6 p-8 pt-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Call Center</h2>
            <p className="text-muted-foreground mt-1">
              Make calls, manage contacts, and track conversations with the
              power dialer
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <CallCenterQuickStats />

        {/* Main Content */}
        <Tabs defaultValue="dialer" className="space-y-4">
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="dialer">Power Dialer</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
              <TabsTrigger value="history">Call History</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dialer">
            <PowerDialerList />
          </TabsContent>

          <TabsContent value="contacts">
            <CallCenterDashboard />
          </TabsContent>

          <TabsContent value="history">
            <CallHistoryList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
