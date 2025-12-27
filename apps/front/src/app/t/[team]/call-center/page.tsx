"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CallCenterDashboard } from "@/components/call-center-dashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CallCenterQuickStats } from "@/features/power-dialer/components/call-center-quick-stats";
import { CallHistoryList } from "@/features/power-dialer/components/call-history-list";
import { PowerDialerList } from "@/features/power-dialer/components/power-dialer-list";
import { useCallState } from "@/lib/providers/call-state-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, User, X } from "lucide-react";
import { formatPhoneNumber } from "@/lib/utils";

export default function CallCenterPage() {
  const searchParams = useSearchParams();
  const { activateCall, isCallActive } = useCallState();
  const [incomingLead, setIncomingLead] = useState<{
    phone: string;
    leadId?: string;
    name?: string;
  } | null>(null);

  // Handle incoming call request from Inbox
  useEffect(() => {
    const phone = searchParams.get("phone");
    const leadId = searchParams.get("leadId");
    const name = searchParams.get("name");

    if (phone && !isCallActive) {
      setIncomingLead({
        phone,
        leadId: leadId || undefined,
        name: name || undefined,
      });
    }
  }, [searchParams, isCallActive]);

  const handleStartCall = () => {
    if (incomingLead) {
      activateCall(incomingLead.phone, incomingLead.name || "Lead", {
        source: "inbox",
      });
      setIncomingLead(null);
      // Clear the URL params after starting the call
      window.history.replaceState({}, "", window.location.pathname);
    }
  };

  const handleDismiss = () => {
    setIncomingLead(null);
    // Clear the URL params
    window.history.replaceState({}, "", window.location.pathname);
  };

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

        {/* Incoming Call Request Banner */}
        {incomingLead && (
          <Card className="border-green-500/50 bg-green-500/10 animate-in slide-in-from-top-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <User className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">
                      {incomingLead.name || "Lead from Inbox"}
                    </p>
                    <p className="text-muted-foreground">
                      {formatPhoneNumber(incomingLead.phone)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleStartCall}
                    className="bg-green-600 hover:bg-green-700 gap-2"
                  >
                    <Phone className="h-4 w-4" />
                    Start Call
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleDismiss}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
