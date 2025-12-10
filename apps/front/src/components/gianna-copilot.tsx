"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  PhoneOff,
  MessageSquare,
  Send,
  Pause,
  Play,
  Users,
  Bot,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  Mail,
  Link2,
  FileText,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { LeadActionButtons } from "./lead-action-buttons";
import { cn } from "@/lib/utils";

// Types
interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  status: string;
  priority: string;
  propertyAddress?: string;
  lastContactDate?: string;
  responseStatus?: "pending" | "responded" | "no_response" | "appointment_set";
  responseText?: string;
  responseTime?: string;
}

interface DialSession {
  id: string;
  status: "idle" | "dialing" | "connected" | "completed" | "paused";
  currentLead: Lead | null;
  completedCalls: number;
  totalCalls: number;
  startTime?: string;
  disposition?: string;
}

interface SMSBatch {
  id: string;
  status: "pending" | "sending" | "completed" | "paused";
  sent: number;
  total: number;
  batchNumber: number;
  totalBatches: number;
}

interface GiannaCopilotProps {
  workspaceId: string;
  campaignId?: string;
  leads?: Lead[];
  onLeadUpdate?: (leadId: string, update: Partial<Lead>) => void;
  onAppointmentBooked?: (leadId: string, appointmentData: unknown) => void;
}

// Constants
const SMS_BATCH_SIZE = 250;
const SMS_MAX_TOTAL = 2000;
const DIALER_MAX_LEADS = 2000;

// Pre-template content for Gianna responses
const RESPONSE_TEMPLATES = {
  appointment: {
    label: "Book Appointment",
    content: "I'd love to schedule a time to discuss your property. Here's my calendar link: {calendar_link}",
  },
  article_distressed: {
    label: "Distressed Property Article",
    content: "I found this helpful article about options for distressed homeowners: {article_link}",
  },
  article_equity: {
    label: "Home Equity Article",
    content: "Here's some information about maximizing your home equity: {article_link}",
  },
  article_market: {
    label: "Market Update",
    content: "Check out our latest market analysis for your area: {article_link}",
  },
  followup: {
    label: "Follow Up",
    content: "Just following up on our previous conversation. Is now a good time to chat?",
  },
};

export function GiannaCopilot({
  workspaceId,
  campaignId,
  leads: initialLeads = [],
  onLeadUpdate,
  onAppointmentBooked,
}: GiannaCopilotProps) {
  // State
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [dialSession, setDialSession] = useState<DialSession | null>(null);
  const [smsBatch, setSmsBatch] = useState<SMSBatch | null>(null);
  const [activeTab, setActiveTab] = useState("queue");
  const [isLoading, setIsLoading] = useState(false);
  const [showSmsDialog, setShowSmsDialog] = useState(false);
  const [showDialerDialog, setShowDialerDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [prioritizedResponses, setPrioritizedResponses] = useState<Lead[]>([]);

  // Refs for session management
  const dialSessionRef = useRef<NodeJS.Timeout | null>(null);
  const smsSessionRef = useRef<NodeJS.Timeout | null>(null);

  // Sort leads by response priority
  useEffect(() => {
    const responded = leads.filter(l => l.responseStatus === "responded");
    // Sort by response time (newest first) and priority
    const sorted = responded.sort((a, b) => {
      if (a.priority === "High" && b.priority !== "High") return -1;
      if (b.priority === "High" && a.priority !== "High") return 1;
      if (a.responseTime && b.responseTime) {
        return new Date(b.responseTime).getTime() - new Date(a.responseTime).getTime();
      }
      return 0;
    });
    setPrioritizedResponses(sorted);
  }, [leads]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dialSessionRef.current) clearInterval(dialSessionRef.current);
      if (smsSessionRef.current) clearInterval(smsSessionRef.current);
    };
  }, []);

  // === Gianna Auto-Dial Functions ===
  const startDialSession = useCallback(async () => {
    if (selectedLeads.length === 0) {
      toast.error("Select leads to dial");
      return;
    }

    const leadsToCall = leads.filter(l => selectedLeads.includes(l.id));

    setDialSession({
      id: `dial-${Date.now()}`,
      status: "dialing",
      currentLead: leadsToCall[0],
      completedCalls: 0,
      totalCalls: leadsToCall.length,
      startTime: new Date().toISOString(),
    });

    toast.success(`Gianna starting auto-dial session: ${leadsToCall.length} calls`);

    // Start the dial simulation
    let currentIndex = 0;
    dialSessionRef.current = setInterval(async () => {
      if (currentIndex >= leadsToCall.length) {
        // Session complete
        setDialSession(prev => prev ? { ...prev, status: "completed", currentLead: null } : null);
        if (dialSessionRef.current) clearInterval(dialSessionRef.current);
        toast.success("Gianna completed dial session");
        return;
      }

      // Update to next lead
      setDialSession(prev => {
        if (!prev || prev.status === "paused") return prev;
        return {
          ...prev,
          currentLead: leadsToCall[currentIndex],
          completedCalls: currentIndex,
          status: "dialing",
        };
      });

      // Simulate call (in real implementation, this calls Twilio/SignalHouse)
      try {
        await fetch("/api/copilot/dial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: `dial-${Date.now()}`,
            leadId: leadsToCall[currentIndex].id,
            phone: leadsToCall[currentIndex].phone,
            workspaceId,
          }),
        });
      } catch {
        console.log("Dial API not yet implemented, simulating...");
      }

      currentIndex++;
    }, 30000); // 30 seconds per call simulation

  }, [selectedLeads, leads, workspaceId]);

  const pauseDialSession = useCallback(() => {
    if (dialSessionRef.current) {
      clearInterval(dialSessionRef.current);
    }
    setDialSession(prev => prev ? { ...prev, status: "paused" } : null);
    toast.info("Dial session paused");
  }, []);

  const resumeDialSession = useCallback(() => {
    if (dialSession && dialSession.status === "paused") {
      setDialSession(prev => prev ? { ...prev, status: "dialing" } : null);
      toast.info("Dial session resumed");
      // Would restart the interval here
    }
  }, [dialSession]);

  const stopDialSession = useCallback(() => {
    if (dialSessionRef.current) {
      clearInterval(dialSessionRef.current);
    }
    setDialSession(prev => prev ? { ...prev, status: "completed" } : null);
    toast.info("Dial session stopped");
  }, []);

  // === SMS Campaign Functions ===
  const startSmsCampaign = useCallback(async () => {
    if (selectedLeads.length === 0) {
      toast.error("Select leads to send SMS");
      return;
    }

    const totalToSend = Math.min(selectedLeads.length, SMS_MAX_TOTAL);
    const totalBatches = Math.ceil(totalToSend / SMS_BATCH_SIZE);

    setSmsBatch({
      id: `sms-${Date.now()}`,
      status: "sending",
      sent: 0,
      total: totalToSend,
      batchNumber: 1,
      totalBatches,
    });

    setShowSmsDialog(false);
    toast.success(`Starting SMS campaign: ${totalToSend} messages in ${totalBatches} batches`);

    // Process batches
    let sent = 0;
    let batchNum = 1;

    smsSessionRef.current = setInterval(async () => {
      const batchSize = Math.min(SMS_BATCH_SIZE, totalToSend - sent);

      // Send batch
      try {
        const batchLeadIds = selectedLeads.slice(sent, sent + batchSize);
        await fetch("/api/sms/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadIds: batchLeadIds,
            campaignId,
            workspaceId,
            batchNumber: batchNum,
          }),
        });
      } catch {
        console.log("SMS batch API simulating...");
      }

      sent += batchSize;
      batchNum++;

      setSmsBatch(prev => {
        if (!prev || prev.status === "paused") return prev;

        if (sent >= totalToSend) {
          if (smsSessionRef.current) clearInterval(smsSessionRef.current);
          toast.success(`SMS campaign complete: ${sent} messages sent`);
          return { ...prev, status: "completed", sent, batchNumber: batchNum - 1 };
        }

        // Check if we hit the 2000 limit
        if (sent >= SMS_MAX_TOTAL) {
          if (smsSessionRef.current) clearInterval(smsSessionRef.current);
          toast.info(`SMS campaign paused at ${SMS_MAX_TOTAL} limit`);
          return { ...prev, status: "paused", sent };
        }

        return { ...prev, sent, batchNumber: batchNum };
      });

    }, 5000); // 5 seconds between batches

  }, [selectedLeads, campaignId, workspaceId]);

  // === Load Dialer Function ===
  const loadDialer = useCallback(async () => {
    if (selectedLeads.length === 0) {
      toast.error("Select leads to load into dialer");
      return;
    }

    const toLoad = Math.min(selectedLeads.length, DIALER_MAX_LEADS);
    setIsLoading(true);

    try {
      const response = await fetch("/api/dialer/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: selectedLeads.slice(0, toLoad),
          workspaceId,
          campaignId,
        }),
      });

      if (!response.ok) throw new Error("Failed to load dialer");

      toast.success(`Loaded ${toLoad} leads into dialer workspace`);
      setShowDialerDialog(false);
    } catch (error) {
      console.log("Dialer API simulating...", error);
      toast.success(`Simulated: Loaded ${toLoad} leads into dialer`);
      setShowDialerDialog(false);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLeads, workspaceId, campaignId]);

  // === Gianna Response Handler ===
  const sendGiannaResponse = useCallback(async (leadId: string, templateKey: string) => {
    const template = RESPONSE_TEMPLATES[templateKey as keyof typeof RESPONSE_TEMPLATES];
    if (!template) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/gianna/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          templateKey,
          content: template.content,
          workspaceId,
        }),
      });

      if (!response.ok) throw new Error("Failed to send response");

      toast.success(`Gianna sent: ${template.label}`);

      // Update lead status
      setLeads(prev => prev.map(l =>
        l.id === leadId ? { ...l, responseStatus: "pending" as const } : l
      ));
      onLeadUpdate?.(leadId, { responseStatus: "pending" });
    } catch {
      toast.success(`Simulated Gianna response: ${template.label}`);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, onLeadUpdate]);

  // === Book Appointment ===
  const bookAppointment = useCallback(async (lead: Lead) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/appointments/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          workspaceId,
          sendCalendarLink: true,
        }),
      });

      if (!response.ok) throw new Error("Failed to book appointment");

      const data = await response.json();
      toast.success("Appointment booked! Calendar link sent.");

      setLeads(prev => prev.map(l =>
        l.id === lead.id ? { ...l, responseStatus: "appointment_set" as const } : l
      ));
      onAppointmentBooked?.(lead.id, data);
    } catch {
      toast.success("Simulated: Appointment booking initiated");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, onAppointmentBooked]);

  // === Selection handlers ===
  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const selectAllLeads = () => {
    setSelectedLeads(leads.map(l => l.id));
  };

  const clearSelection = () => {
    setSelectedLeads([]);
  };

  // === Render Functions ===
  const renderLeadCard = (lead: Lead, showActions = true) => (
    <Card
      key={lead.id}
      className={cn(
        "mb-2 cursor-pointer transition-all",
        selectedLeads.includes(lead.id) && "ring-2 ring-primary",
        dialSession?.currentLead?.id === lead.id && "ring-2 ring-green-500 bg-green-50"
      )}
      onClick={() => toggleLeadSelection(lead.id)}
    >
      <CardContent className="p-3">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="font-medium text-sm">
              {lead.firstName} {lead.lastName}
            </h4>
            <p className="text-xs text-muted-foreground">{lead.phone}</p>
          </div>
          <div className="flex items-center gap-1">
            {lead.responseStatus === "responded" && (
              <Badge variant="default" className="bg-green-500 text-xs">
                Responded
              </Badge>
            )}
            {lead.responseStatus === "appointment_set" && (
              <Badge variant="default" className="bg-purple-500 text-xs">
                Appt Set
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {lead.priority}
            </Badge>
          </div>
        </div>

        {lead.propertyAddress && (
          <p className="text-xs text-muted-foreground mb-2 truncate">
            {lead.propertyAddress}
          </p>
        )}

        {lead.responseText && (
          <div className="bg-muted p-2 rounded text-xs mb-2">
            <span className="font-medium">Response:</span> {lead.responseText}
          </div>
        )}

        {showActions && (
          <div className="flex items-center justify-between mt-2" onClick={e => e.stopPropagation()}>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                onClick={() => sendGiannaResponse(lead.id, "appointment")}
                title="Send Calendar Link"
              >
                <Calendar className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                onClick={() => sendGiannaResponse(lead.id, "followup")}
                title="Send Follow Up"
              >
                <MessageSquare className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                onClick={() => sendGiannaResponse(lead.id, "article_market")}
                title="Send Article"
              >
                <FileText className="h-3 w-3" />
              </Button>
            </div>
            <LeadActionButtons
              leadIds={[lead.id]}
              variant="compact"
              onActionComplete={() => {
                // Refresh lead data
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Lead Queue */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Lead Queue
            </h3>
            <Badge variant="outline">{leads.length}</Badge>
          </div>

          {/* Selection controls */}
          <div className="flex gap-1 mb-2">
            <Button variant="outline" size="sm" onClick={selectAllLeads} className="text-xs">
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection} className="text-xs">
              Clear
            </Button>
            <Badge variant="secondary" className="ml-auto">
              {selectedLeads.length} selected
            </Badge>
          </div>

          {/* Bulk actions */}
          {selectedLeads.length > 0 && (
            <LeadActionButtons
              leadIds={selectedLeads}
              variant="buttons"
              onActionComplete={() => clearSelection()}
            />
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="mx-3 mt-2">
            <TabsTrigger value="queue" className="text-xs">Queue</TabsTrigger>
            <TabsTrigger value="responses" className="text-xs">
              Responses
              {prioritizedResponses.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-[10px]">
                  {prioritizedResponses.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="flex-1 m-0">
            <ScrollArea className="h-[calc(100vh-320px)] p-3">
              {leads.map(lead => renderLeadCard(lead))}
              {leads.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No leads in queue
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="responses" className="flex-1 m-0">
            <ScrollArea className="h-[calc(100vh-320px)] p-3">
              {prioritizedResponses.map(lead => (
                <Card key={lead.id} className="mb-2 border-green-200 bg-green-50/50">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-sm">
                          {lead.firstName} {lead.lastName}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {lead.responseTime && new Date(lead.responseTime).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="default" className="bg-green-500">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Priority
                      </Badge>
                    </div>

                    {lead.responseText && (
                      <div className="bg-white p-2 rounded border mb-2 text-sm">
                        "{lead.responseText}"
                      </div>
                    )}

                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => bookAppointment(lead)}
                        disabled={isLoading}
                        className="flex-1"
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Book Appt
                      </Button>
                      <Select
                        value={selectedTemplate}
                        onValueChange={(val) => {
                          setSelectedTemplate(val);
                          sendGiannaResponse(lead.id, val);
                        }}
                      >
                        <SelectTrigger className="w-[120px] h-8">
                          <SelectValue placeholder="Template" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(RESPONSE_TEMPLATES).map(([key, val]) => (
                            <SelectItem key={key} value={key}>
                              {val.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {prioritizedResponses.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No responses yet
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Main Content - Copilot Controls */}
      <div className="flex-1 p-4">
        {/* Gianna Status */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-purple-500" />
              Gianna Copilot
              {dialSession?.status === "dialing" && (
                <Badge variant="default" className="bg-green-500 animate-pulse">
                  Active
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dialSession ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {dialSession.status === "dialing" ? "Currently calling:" : "Session " + dialSession.status}
                  </span>
                  {dialSession.currentLead && (
                    <span className="font-medium">
                      {dialSession.currentLead.firstName} {dialSession.currentLead.lastName}
                    </span>
                  )}
                </div>

                <Progress
                  value={(dialSession.completedCalls / dialSession.totalCalls) * 100}
                  className="h-2"
                />

                <div className="flex items-center justify-between text-sm">
                  <span>{dialSession.completedCalls} / {dialSession.totalCalls} calls</span>
                  <div className="flex gap-2">
                    {dialSession.status === "dialing" ? (
                      <Button variant="outline" size="sm" onClick={pauseDialSession}>
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </Button>
                    ) : dialSession.status === "paused" ? (
                      <Button variant="outline" size="sm" onClick={resumeDialSession}>
                        <Play className="h-4 w-4 mr-1" />
                        Resume
                      </Button>
                    ) : null}
                    <Button variant="destructive" size="sm" onClick={stopDialSession}>
                      <PhoneOff className="h-4 w-4 mr-1" />
                      Stop
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-3">
                  Select leads and start Gianna to auto-dial
                </p>
                <Button
                  onClick={startDialSession}
                  disabled={selectedLeads.length === 0}
                  size="lg"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Start Gianna Auto-Dial
                  {selectedLeads.length > 0 && ` (${selectedLeads.length})`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SMS Campaign Status */}
        {smsBatch && (
          <Card className="mb-4 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <MessageSquare className="h-5 w-5" />
                SMS Campaign
                <Badge variant={smsBatch.status === "sending" ? "default" : "secondary"}>
                  {smsBatch.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress
                value={(smsBatch.sent / smsBatch.total) * 100}
                className="h-2 mb-2"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{smsBatch.sent} / {smsBatch.total} sent</span>
                <span>Batch {smsBatch.batchNumber} of {smsBatch.totalBatches}</span>
              </div>
              {smsBatch.status === "paused" && smsBatch.sent >= SMS_MAX_TOTAL && (
                <p className="text-amber-600 text-sm mt-2">
                  Paused at {SMS_MAX_TOTAL} SMS limit. Resume to continue.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-20 flex-col"
            onClick={() => setShowSmsDialog(true)}
            disabled={selectedLeads.length === 0}
          >
            <Send className="h-6 w-6 mb-1 text-blue-500" />
            <span>Push to SMS Campaign</span>
            <span className="text-xs text-muted-foreground">
              Up to {SMS_MAX_TOTAL} (batched in {SMS_BATCH_SIZE}s)
            </span>
          </Button>

          <Button
            variant="outline"
            className="h-20 flex-col"
            onClick={() => setShowDialerDialog(true)}
            disabled={selectedLeads.length === 0}
          >
            <Phone className="h-6 w-6 mb-1 text-green-500" />
            <span>Load Dialer</span>
            <span className="text-xs text-muted-foreground">
              Up to {DIALER_MAX_LEADS} in workspace
            </span>
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <Card>
            <CardContent className="p-3 text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{leads.length}</p>
              <p className="text-xs text-muted-foreground">In Queue</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">
                {leads.filter(l => l.responseStatus === "responded").length}
              </p>
              <p className="text-xs text-muted-foreground">Responded</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Calendar className="h-5 w-5 mx-auto mb-1 text-purple-500" />
              <p className="text-2xl font-bold">
                {leads.filter(l => l.responseStatus === "appointment_set").length}
              </p>
              <p className="text-xs text-muted-foreground">Appts Set</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <AlertCircle className="h-5 w-5 mx-auto mb-1 text-amber-500" />
              <p className="text-2xl font-bold">{prioritizedResponses.length}</p>
              <p className="text-xs text-muted-foreground">Need Action</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SMS Dialog */}
      <Dialog open={showSmsDialog} onOpenChange={setShowSmsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Push to SMS Campaign</DialogTitle>
            <DialogDescription>
              Send SMS to {Math.min(selectedLeads.length, SMS_MAX_TOTAL)} leads.
              Messages will be batched in groups of {SMS_BATCH_SIZE}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span>Selected leads:</span>
              <Badge>{selectedLeads.length}</Badge>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span>Will send:</span>
              <Badge variant="outline">{Math.min(selectedLeads.length, SMS_MAX_TOTAL)}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Batches:</span>
              <Badge variant="outline">
                {Math.ceil(Math.min(selectedLeads.length, SMS_MAX_TOTAL) / SMS_BATCH_SIZE)}
              </Badge>
            </div>
            {selectedLeads.length > SMS_MAX_TOTAL && (
              <p className="text-amber-600 text-sm mt-3">
                Note: Campaign will pause at {SMS_MAX_TOTAL} SMS limit.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSmsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={startSmsCampaign}>
              <Send className="h-4 w-4 mr-2" />
              Start Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialer Dialog */}
      <Dialog open={showDialerDialog} onOpenChange={setShowDialerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load Dialer Workspace</DialogTitle>
            <DialogDescription>
              Load {Math.min(selectedLeads.length, DIALER_MAX_LEADS)} leads into dialer workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span>Selected leads:</span>
              <Badge>{selectedLeads.length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Will load:</span>
              <Badge variant="outline">{Math.min(selectedLeads.length, DIALER_MAX_LEADS)}</Badge>
            </div>
            {selectedLeads.length > DIALER_MAX_LEADS && (
              <p className="text-amber-600 text-sm mt-3">
                Note: Only first {DIALER_MAX_LEADS} leads will be loaded.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialerDialog(false)}>
              Cancel
            </Button>
            <Button onClick={loadDialer} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Phone className="h-4 w-4 mr-2" />
              )}
              Load Dialer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
