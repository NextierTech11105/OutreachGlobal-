"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Phone,
  Calendar,
  BarChart3,
} from "lucide-react";
import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
import { ModeToggle } from "@/components/mode-toggle";
import { useCallState } from "@/lib/providers/call-state-provider";

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
        {/* Page Title */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Advanced Power Dialer</h1>
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
            {isDialerActive && selectedContact && !isCallActive ? (
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
                        : "Set up your campaign in the Setup tab before starting calls."}
                    </p>
                    <Button
                      size="lg"
                      className="mx-auto"
                      disabled={!campaignData.contactListId}
                      onClick={() => setIsDialerActive(true)}
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      Start Dialing
                    </Button>
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
