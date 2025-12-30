"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Stepper,
  Step,
  StepDescription,
  StepTitle,
} from "@/components/ui/stepper";
import { ContactListSelector } from "@/components/contact-list-selector";
import { CampaignSelector } from "@/components/campaign-selector";
import { CampaignSchedulerAdvanced } from "@/components/campaign-scheduler-advanced";
import { CampaignAnalyticsDashboard } from "@/components/campaign-analytics-dashboard";
import { AiSdrSelector } from "@/components/ai-sdr-selector";
import { PowerDialer } from "@/components/power-dialer";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Phone,
  Calendar,
  BarChart3,
  Bot,
  Pause,
  Play,
  SkipForward,
  PhoneOff,
  Loader2,
  MessageSquare,
  CalendarDays,
  RefreshCw,
  Target,
  Send,
  Voicemail,
  ThumbsDown,
  ThumbsUp,
  User,
} from "lucide-react";
import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
import { ModeToggle } from "@/components/mode-toggle";
import { useCallState } from "@/lib/providers/call-state-provider";
import { toast } from "sonner";
import {
  type CampaignContext,
  CONTEXT_LABELS,
  CONTEXT_AGENTS,
} from "@/lib/campaign/contexts";

// ═══════════════════════════════════════════════════════════════════════════════
// GIANNA ASSISTANT MODE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface AssistantState {
  persona: string;
  mode: string;
  active: boolean;
  currentLead?: QueueLead;
  queuedLeads: number;
  completedToday: number;
  campaignLane: string;
  voiceEnabled: boolean;
}

interface QueueLead {
  id: string;
  leadId: string;
  leadName?: string;
  phone: string;
  email?: string;
  company?: string;
  campaignLane: string;
  persona: string;
  priority: number;
  attempts: number;
  tags: string[];
}

// Disposition options for GIANNA mode
const DISPOSITION_OPTIONS = [
  {
    id: "interested",
    label: "Interested",
    icon: ThumbsUp,
    color: "bg-green-500 hover:bg-green-600",
    context: "book" as CampaignContext,
    description: "Schedule with SABRINA",
  },
  {
    id: "callback",
    label: "Callback",
    icon: Phone,
    color: "bg-blue-500 hover:bg-blue-600",
    context: "retarget" as CampaignContext,
    description: "Queue for later",
  },
  {
    id: "voicemail",
    label: "Voicemail",
    icon: Voicemail,
    color: "bg-purple-500 hover:bg-purple-600",
    context: "nudge" as CampaignContext,
    description: "CATHY follow-up",
  },
  {
    id: "not_interested",
    label: "Not Interested",
    icon: ThumbsDown,
    color: "bg-orange-500 hover:bg-orange-600",
    context: "nurture" as CampaignContext,
    description: "Content drip",
  },
  {
    id: "wrong_number",
    label: "Wrong Number",
    icon: PhoneOff,
    color: "bg-red-500 hover:bg-red-600",
    context: null,
    description: "Remove from queue",
  },
] as const;

export default function PowerDialerPage() {
  const [activeTab, setActiveTab] = useState("setup");
  const [currentStep, setCurrentStep] = useState(0);
  const [campaignData, setCampaignData] = useState<any>({
    contactListId: "",
    contactCount: 0,
    campaignId: "",
    campaignType: "",
    aiSdrId: "",
    scheduleSettings: {
      type: "immediate",
      callsPerDay: 100,
      callWindow: {
        start: "09:00",
        end: "17:00",
      },
      timezone: "America/New_York",
      maxAttempts: 3,
      retryInterval: 1,
      retryUnit: "days",
      daysOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    },
  });
  const [isDialerActive, setIsDialerActive] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const { activateCall, isCallActive } = useCallState();

  // ═══════════════════════════════════════════════════════════════════════════════
  // GIANNA ASSISTANT MODE STATE
  // ═══════════════════════════════════════════════════════════════════════════════

  const [giannaMode, setGiannaMode] = useState(false);
  const [assistantState, setAssistantState] = useState<AssistantState | null>(
    null,
  );
  const [giannaLoading, setGiannaLoading] = useState(false);
  const [giannaPaused, setGiannaPaused] = useState(false);
  const [scriptHint, setScriptHint] = useState<string | null>(null);

  // Start GIANNA assistant mode
  const startGiannaMode = useCallback(async () => {
    setGiannaLoading(true);
    try {
      const response = await fetch("/api/call-center/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_assistant",
          persona: "gianna",
          campaignLane: "initial",
          voiceEnabled: true,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setAssistantState(data.state);
        setScriptHint(data.scriptHint);
        setGiannaMode(true);
        setActiveTab("dialer");
        toast.success("GIANNA Assistant Mode activated");
      } else {
        toast.error(data.error || "Failed to start GIANNA mode");
      }
    } catch (error) {
      toast.error("Failed to start GIANNA mode");
    } finally {
      setGiannaLoading(false);
    }
  }, []);

  // Stop GIANNA assistant mode
  const stopGiannaMode = useCallback(async () => {
    try {
      const response = await fetch("/api/call-center/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "stop_assistant",
          persona: "gianna",
        }),
      });
      const data = await response.json();
      if (data.success) {
        setGiannaMode(false);
        setAssistantState(null);
        setScriptHint(null);
        toast.info(
          `Session ended. ${data.stats?.completedToday || 0} calls completed today.`,
        );
      }
    } catch (error) {
      toast.error("Failed to stop GIANNA mode");
    }
  }, []);

  // Get next lead in GIANNA mode
  const getNextLead = useCallback(
    async (outcome?: string) => {
      if (!giannaMode) return;
      setGiannaLoading(true);
      try {
        const response = await fetch("/api/call-center/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "next_lead",
            persona: "gianna",
            outcome: outcome || "connected",
          }),
        });
        const data = await response.json();
        if (data.success) {
          setAssistantState(data.state);
          setScriptHint(data.scriptHint);
          if (!data.state?.currentLead) {
            toast.info("Queue empty! Add more leads.");
          }
        }
      } catch (error) {
        toast.error("Failed to get next lead");
      } finally {
        setGiannaLoading(false);
      }
    },
    [giannaMode],
  );

  // Handle disposition and route to context
  const handleDisposition = useCallback(
    async (dispositionId: string, nextContext: CampaignContext | null) => {
      if (!assistantState?.currentLead) return;

      // If there's a context, push the lead to that workflow stage
      if (nextContext) {
        try {
          await fetch("/api/call-center/queue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "add_single",
              leadId: assistantState.currentLead.leadId,
              leadName: assistantState.currentLead.leadName,
              phone: assistantState.currentLead.phone,
              email: assistantState.currentLead.email,
              company: assistantState.currentLead.company,
              campaignLane: nextContext,
              persona:
                CONTEXT_AGENTS[nextContext]?.toLowerCase() === "gianna"
                  ? "gianna"
                  : CONTEXT_AGENTS[nextContext]?.toLowerCase() === "cathy"
                    ? "cathy"
                    : "sabrina",
              priority: 7,
              tags: [
                ...(assistantState.currentLead.tags || []),
                `disposition_${dispositionId}`,
              ],
            }),
          });
          toast.success(
            `Pushed to ${CONTEXT_LABELS[nextContext]} (${CONTEXT_AGENTS[nextContext]})`,
          );
        } catch (error) {
          toast.error("Failed to push to context");
        }
      } else {
        // Wrong number - just skip
        toast.info("Lead removed from queue");
      }

      // Move to next lead
      await getNextLead(dispositionId);
    },
    [assistantState, getNextLead],
  );

  // Call current lead in GIANNA mode
  const callCurrentLead = useCallback(async () => {
    if (!assistantState?.currentLead) return;

    const lead = assistantState.currentLead;
    activateCall(lead.phone, lead.leadName || "Lead", {
      company: lead.company,
      source: "gianna_mode",
      campaignLane: lead.campaignLane,
    });
  }, [assistantState, activateCall]);

  const handleContactListSelect = (listId: string, count: number) => {
    setCampaignData({
      ...campaignData,
      contactListId: listId,
      contactCount: count,
    });
  };

  const handleCampaignSelect = (campaign: any) => {
    setCampaignData({
      ...campaignData,
      campaignId: campaign.id,
      campaignType: campaign.type,
      // If campaign type is not AI, clear the AI SDR selection
      aiSdrId: campaign.type !== "ai" ? "" : campaignData.aiSdrId,
    });
  };

  const handleAiSdrSelect = (sdrId: string) => {
    setCampaignData({
      ...campaignData,
      aiSdrId: sdrId,
    });
  };

  const handleScheduleChange = (settings: any) => {
    setCampaignData({
      ...campaignData,
      scheduleSettings: settings,
    });
  };

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      // Launch campaign
      setActiveTab("dialer");
      setIsDialerActive(true);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepComplete = (step: number) => {
    switch (step) {
      case 0:
        return !!campaignData.contactListId;
      case 1:
        return !!campaignData.campaignId;
      case 2:
        return campaignData.campaignType !== "ai" || !!campaignData.aiSdrId;
      case 3:
        return true; // Schedule is always valid with defaults
      default:
        return false;
    }
  };

  const canProceed = isStepComplete(currentStep);

  const handleStartCall = (contact: any) => {
    setSelectedContact(contact);
    activateCall(contact.phone, contact.name, {
      company: contact.company,
      position: contact.position,
      location: contact.location,
      source: contact.source,
      status: contact.status,
      campaignId: campaignData.campaignId,
    });
  };

  const handleCloseDialer = () => {
    setSelectedContact(null);
    setIsDialerActive(false);
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <MainNav />
          <div className="flex items-center gap-4">
            <ModeToggle />
            <UserNav />
          </div>
        </div>
      </header>

      <div className="container mx-auto py-6 space-y-6">
        {/* Page Title with GIANNA Mode Toggle */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Advanced Power Dialer</h1>
          <div className="flex items-center gap-4">
            {/* GIANNA Assistant Mode Toggle */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg border bg-card">
              <Bot
                className={`h-5 w-5 ${giannaMode ? "text-green-500" : "text-muted-foreground"}`}
              />
              <Label htmlFor="gianna-mode" className="font-medium">
                GIANNA Mode
              </Label>
              <Switch
                id="gianna-mode"
                checked={giannaMode}
                onCheckedChange={(checked) => {
                  if (checked) {
                    startGiannaMode();
                  } else {
                    stopGiannaMode();
                  }
                }}
                disabled={giannaLoading}
              />
              {giannaMode && assistantState && (
                <Badge
                  variant="secondary"
                  className="bg-green-500/20 text-green-600"
                >
                  {assistantState.queuedLeads} in queue
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-[400px] grid-cols-3">
            <TabsTrigger value="setup">
              <Calendar className="h-4 w-4 mr-2" />
              Setup
            </TabsTrigger>
            <TabsTrigger value="dialer">
              <Phone className="h-4 w-4 mr-2" />
              Dialer
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Setup</CardTitle>
                <CardDescription>
                  Configure your outbound calling campaign
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Stepper index={currentStep}>
                  <Step>
                    <StepTitle>Select Contact List</StepTitle>
                    <StepDescription>
                      Choose which contacts to call
                    </StepDescription>
                  </Step>
                  <Step>
                    <StepTitle>Select Campaign</StepTitle>
                    <StepDescription>
                      Choose campaign type and script
                    </StepDescription>
                  </Step>
                  <Step>
                    <StepTitle>Select AI SDR</StepTitle>
                    <StepDescription>
                      Choose AI avatar (if applicable)
                    </StepDescription>
                  </Step>
                  <Step>
                    <StepTitle>Schedule Campaign</StepTitle>
                    <StepDescription>
                      Set timing and call parameters
                    </StepDescription>
                  </Step>
                </Stepper>

                <div className="mt-8">
                  {currentStep === 0 && (
                    <ContactListSelector
                      onSelectList={handleContactListSelect}
                      selectedListId={campaignData.contactListId}
                    />
                  )}

                  {currentStep === 1 && (
                    <CampaignSelector
                      onSelectCampaign={handleCampaignSelect}
                      selectedCampaignId={campaignData.campaignId}
                    />
                  )}

                  {currentStep === 2 && (
                    <>
                      {campaignData.campaignType === "ai" ? (
                        <AiSdrSelector
                          selectedAiSdrId={campaignData.aiSdrId}
                          onSelectAiSdr={handleAiSdrSelect}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[400px] text-center">
                          <div className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 p-4 rounded-full">
                            <Check className="h-8 w-8" />
                          </div>
                          <h3 className="mt-4 text-lg font-medium">
                            Human SDR Campaign Selected
                          </h3>
                          <p className="mt-2 text-muted-foreground max-w-md">
                            You've selected a Human SDR campaign. No AI avatar
                            is needed for this campaign type. Your human agents
                            will handle the calls.
                          </p>
                          <Button className="mt-6" onClick={handleNextStep}>
                            Continue to Scheduling
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  {currentStep === 3 && (
                    <CampaignSchedulerAdvanced
                      onScheduleChange={handleScheduleChange}
                      initialSettings={campaignData.scheduleSettings}
                      contactCount={campaignData.contactCount}
                    />
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-6">
                <Button
                  variant="outline"
                  onClick={handlePrevStep}
                  disabled={currentStep === 0}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={handleNextStep} disabled={!canProceed}>
                  {currentStep === 3 ? (
                    <>
                      Launch Campaign
                      <Phone className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="dialer" className="mt-6">
            {/* GIANNA ASSISTANT MODE UI */}
            {giannaMode ? (
              <Card className="border-green-500/30 bg-green-500/5">
                <CardHeader className="border-b border-green-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          GIANNA Assistant Mode
                          {giannaLoading && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                        </CardTitle>
                        <CardDescription>
                          {assistantState?.completedToday || 0} calls today •{" "}
                          {assistantState?.queuedLeads || 0} remaining
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setGiannaPaused(!giannaPaused)}
                      >
                        {giannaPaused ? (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Resume
                          </>
                        ) : (
                          <>
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </>
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={stopGiannaMode}
                      >
                        <PhoneOff className="h-4 w-4 mr-1" />
                        Stop
                      </Button>
                    </div>
                  </div>
                  {/* Progress bar */}
                  {assistantState && (
                    <div className="mt-4">
                      <Progress
                        value={
                          (assistantState.completedToday /
                            (assistantState.completedToday +
                              assistantState.queuedLeads || 1)) *
                          100
                        }
                        className="h-2"
                      />
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-6">
                  {/* Current Lead */}
                  {assistantState?.currentLead ? (
                    <div className="grid grid-cols-2 gap-6">
                      {/* Left: Lead Info & Script */}
                      <div className="space-y-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                              <User className="h-5 w-5 text-muted-foreground" />
                              <CardTitle className="text-lg">
                                {assistantState.currentLead.leadName ||
                                  "Unknown Lead"}
                              </CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {assistantState.currentLead.company && (
                              <p className="text-muted-foreground mb-2">
                                {assistantState.currentLead.company}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-sm">
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {assistantState.currentLead.phone}
                              </span>
                              {assistantState.currentLead.attempts > 1 && (
                                <Badge variant="outline">
                                  Attempt {assistantState.currentLead.attempts}
                                </Badge>
                              )}
                            </div>
                            {/* Tags */}
                            {assistantState.currentLead.tags?.length > 0 && (
                              <div className="flex gap-1 mt-3 flex-wrap">
                                {assistantState.currentLead.tags.map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Script Hint */}
                        {scriptHint && (
                          <Card className="bg-blue-500/5 border-blue-500/20">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" />
                                Script ({assistantState.campaignLane})
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm italic text-muted-foreground">
                                {scriptHint}
                              </p>
                            </CardContent>
                          </Card>
                        )}

                        {/* Call Button */}
                        <Button
                          size="lg"
                          className="w-full bg-green-600 hover:bg-green-700"
                          onClick={callCurrentLead}
                          disabled={isCallActive || giannaPaused}
                        >
                          <Phone className="h-5 w-5 mr-2" />
                          Call{" "}
                          {assistantState.currentLead.leadName?.split(" ")[0] ||
                            "Lead"}
                        </Button>
                      </div>

                      {/* Right: Disposition Buttons */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg mb-3">
                          Disposition → Workflow
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          {DISPOSITION_OPTIONS.map((option) => (
                            <Button
                              key={option.id}
                              variant="outline"
                              className={`h-auto py-4 justify-start ${
                                isCallActive ? "" : "hover:opacity-80"
                              }`}
                              disabled={
                                !isCallActive && option.id !== "wrong_number"
                              }
                              onClick={() =>
                                handleDisposition(option.id, option.context)
                              }
                            >
                              <div
                                className={`h-10 w-10 rounded-full flex items-center justify-center mr-3 ${option.color} text-white`}
                              >
                                <option.icon className="h-5 w-5" />
                              </div>
                              <div className="text-left">
                                <p className="font-medium">{option.label}</p>
                                <p className="text-xs text-muted-foreground">
                                  {option.description}
                                  {option.context &&
                                    ` → ${CONTEXT_LABELS[option.context]}`}
                                </p>
                              </div>
                            </Button>
                          ))}
                        </div>

                        {/* Skip Button */}
                        <Button
                          variant="ghost"
                          className="w-full mt-4"
                          onClick={() => getNextLead("skipped")}
                          disabled={giannaLoading}
                        >
                          <SkipForward className="h-4 w-4 mr-2" />
                          Skip to Next Lead
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* No current lead */
                    <div className="text-center py-12">
                      <Bot className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground">
                        {giannaLoading
                          ? "Loading next lead..."
                          : "No leads in queue"}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Add leads to the queue from the Calendar or Inbound
                        Captures tab
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : isDialerActive && selectedContact && !isCallActive ? (
              <PowerDialer
                leadName={selectedContact.name}
                leadPhone={selectedContact.phone}
                leadCompany={selectedContact.company}
                leadPosition={selectedContact.position}
                leadLocation={selectedContact.location}
                leadSource={selectedContact.source}
                leadStatus={selectedContact.status}
                campaignId={campaignData.campaignId}
                onCallComplete={(duration, notes) => {
                  console.log("Call completed:", { duration, notes });
                }}
                onClose={handleCloseDialer}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Power Dialer</CardTitle>
                  <CardDescription>
                    Make calls to your contact list
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="text-center max-w-md">
                    <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      Ready to Start Calling
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {campaignData.contactListId
                        ? `Your campaign is set up and ready to go. You can start making calls to your contact list of ${campaignData.contactCount} contacts.`
                        : "Set up your campaign in the Setup tab or enable GIANNA Mode for hands-free calling."}
                    </p>
                    <div className="flex gap-4 justify-center">
                      <Button
                        size="lg"
                        disabled={!campaignData.contactListId}
                        onClick={() => setIsDialerActive(true)}
                      >
                        <Phone className="mr-2 h-4 w-4" />
                        Start Dialing
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={startGiannaMode}
                        disabled={giannaLoading}
                        className="border-green-500/50 text-green-600 hover:bg-green-500/10"
                      >
                        <Bot className="mr-2 h-4 w-4" />
                        Start GIANNA Mode
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <CampaignAnalyticsDashboard campaignId={campaignData.campaignId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
