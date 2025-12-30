"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { CallCenterDashboard } from "@/components/call-center-dashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CallCenterQuickStats } from "@/features/power-dialer/components/call-center-quick-stats";
import { CallHistoryList } from "@/features/power-dialer/components/call-history-list";
import { PowerDialerList } from "@/features/power-dialer/components/power-dialer-list";
import { useCallState } from "@/lib/providers/call-state-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Phone,
  User,
  X,
  Mail,
  PhoneCall,
  RefreshCw,
  Loader2,
  Trophy,
  ArrowRight,
  SkipForward,
  Inbox,
} from "lucide-react";
import { formatPhoneNumber } from "@/lib/utils";
import { toast } from "sonner";
import {
  type CampaignContext,
  CONTEXT_LABELS,
  CONTEXT_AGENTS,
  CONTEXT_FLOW,
} from "@/lib/campaign/contexts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface CapturedLead {
  id: string;
  leadId: string;
  leadName?: string;
  phone: string;
  email?: string;
  company?: string;
  persona: string;
  campaignLane: string;
  status: string;
  priority: number;
  tags: string[];
  createdAt: string;
}

export default function CallCenterPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const teamId = params?.team as string;
  const { activateCall, isCallActive } = useCallState();
  const [incomingLead, setIncomingLead] = useState<{
    phone: string;
    leadId?: string;
    name?: string;
  } | null>(null);

  // Inbound Captures state
  const [captures, setCaptures] = useState<CapturedLead[]>([]);
  const [capturesLoading, setCapturesLoading] = useState(false);
  const [capturesCount, setCapturesCount] = useState(0);

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

  // Fetch inbound captures (AI-captured leads with gold/responded tags)
  const fetchCaptures = useCallback(async () => {
    setCapturesLoading(true);
    try {
      const response = await fetch(
        "/api/call-center/queue?action=list&status=pending&source=ai_capture&limit=50",
      );
      const data = await response.json();
      if (data.success) {
        setCaptures(data.items || []);
        setCapturesCount(data.total || 0);
      }
    } catch (error) {
      console.error("[CallCenter] Failed to fetch captures:", error);
    } finally {
      setCapturesLoading(false);
    }
  }, []);

  // Auto-refresh captures every 30 seconds
  useEffect(() => {
    fetchCaptures();
    const interval = setInterval(fetchCaptures, 30000);
    return () => clearInterval(interval);
  }, [fetchCaptures]);

  // Handle call from captures
  const handleCallCapture = (capture: CapturedLead) => {
    activateCall(capture.phone, capture.leadName || "Captured Lead", {
      source: "inbound_capture",
      leadId: capture.leadId,
    });
    toast.success(`Calling ${capture.leadName || capture.phone}`);
  };

  // Handle push to context
  const handlePushToContext = async (
    capture: CapturedLead,
    context: CampaignContext,
  ) => {
    try {
      // Update the lead's campaign lane
      const response = await fetch("/api/call-center/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_single",
          leadId: capture.leadId,
          leadName: capture.leadName,
          phone: capture.phone,
          email: capture.email,
          company: capture.company,
          campaignLane: context,
          persona:
            CONTEXT_AGENTS[context]?.toLowerCase() === "gianna"
              ? "gianna"
              : CONTEXT_AGENTS[context]?.toLowerCase() === "cathy"
                ? "cathy"
                : "sabrina",
          priority: 8, // High priority for captured leads
          tags: [...(capture.tags || []), `pushed_to_${context}`],
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(
          `Pushed to ${CONTEXT_LABELS[context]} (${CONTEXT_AGENTS[context]})`,
        );
        fetchCaptures(); // Refresh list
      }
    } catch (error) {
      toast.error("Failed to push to context");
    }
  };

  // Handle skip capture
  const handleSkipCapture = async (capture: CapturedLead) => {
    try {
      const response = await fetch("/api/call-center/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete_call",
          callId: capture.id,
          outcome: "skipped",
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.info("Lead skipped");
        fetchCaptures();
      }
    } catch (error) {
      toast.error("Failed to skip lead");
    }
  };

  // Get tag badge color
  const getTagColor = (tag: string): string => {
    const t = tag.toLowerCase();
    if (t === "gold" || t === "email_captured" || t === "mobile_captured")
      return "bg-yellow-500/20 text-yellow-600 border-yellow-500/30";
    if (t === "responded" || t === "green" || t === "called_back")
      return "bg-green-500/20 text-green-600 border-green-500/30";
    return "bg-gray-500/20 text-gray-600 border-gray-500/30";
  };

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
              <TabsTrigger value="captures" className="relative">
                <Inbox className="h-4 w-4 mr-2" />
                Inbound Captures
                {capturesCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-green-500/20 text-green-600 border-green-500/30"
                  >
                    {capturesCount}
                  </Badge>
                )}
              </TabsTrigger>
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

          {/* Inbound Captures Tab */}
          <TabsContent value="captures">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Inbound Captures
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Leads captured from AI responses - highest priority for
                    callbacks
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchCaptures}
                  disabled={capturesLoading}
                >
                  {capturesLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-2">Refresh</span>
                </Button>
              </CardHeader>
              <CardContent>
                {capturesLoading && captures.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : captures.length === 0 ? (
                  <div className="text-center py-12">
                    <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground">
                      No captured leads yet
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      When leads reply to SMS or provide contact info, they will
                      appear here
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-3">
                      {captures.map((capture) => (
                        <Card
                          key={capture.id}
                          className="border-l-4 border-l-green-500"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              {/* Lead Info */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {/* Tags */}
                                  {capture.tags?.map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="outline"
                                      className={`text-xs ${getTagColor(tag)}`}
                                    >
                                      {tag === "gold" ||
                                      tag === "email_captured" ? (
                                        <Trophy className="h-3 w-3 mr-1" />
                                      ) : null}
                                      {tag.replace(/_/g, " ")}
                                    </Badge>
                                  ))}
                                </div>
                                <h4 className="font-semibold text-lg">
                                  {capture.leadName || "Unknown Lead"}
                                </h4>
                                {capture.company && (
                                  <p className="text-sm text-muted-foreground">
                                    {capture.company}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-sm">
                                  {capture.phone && (
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                      <Phone className="h-3 w-3" />
                                      {formatPhoneNumber(capture.phone)}
                                    </span>
                                  )}
                                  {capture.email && (
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                      <Mail className="h-3 w-3" />
                                      {capture.email}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Lane: {capture.campaignLane} •{" "}
                                  {capture.persona.toUpperCase()}
                                </p>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleCallCapture(capture)}
                                >
                                  <PhoneCall className="h-4 w-4 mr-1" />
                                  Call Now
                                </Button>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <ArrowRight className="h-4 w-4 mr-1" />
                                      Push to...
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {CONTEXT_FLOW.map((context) => (
                                      <DropdownMenuItem
                                        key={context}
                                        onClick={() =>
                                          handlePushToContext(capture, context)
                                        }
                                      >
                                        <span className="font-medium">
                                          {CONTEXT_LABELS[context]}
                                        </span>
                                        <span className="text-xs text-muted-foreground ml-2">
                                          ({CONTEXT_AGENTS[context]})
                                        </span>
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSkipCapture(capture)}
                                >
                                  <SkipForward className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
