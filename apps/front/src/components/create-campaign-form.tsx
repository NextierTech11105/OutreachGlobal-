"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CampaignTargetingOptions } from "./campaign-targeting-options";
import { CampaignScheduler } from "./campaign-scheduler";
import { AiSdrSelector } from "./ai-sdr-selector";
import { CampaignCadenceBuilder } from "./campaign-cadence-builder";
import { UserSelector } from "./user-selector";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function CreateCampaignForm() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("details");
  const [assigneeType, setAssigneeType] = useState<"ai" | "human">("ai");
  const [campaignData, setCampaignData] = useState({
    name: "",
    description: "",
    targeting: {},
    assigneeType: "ai" as "ai" | "human",
    assigneeId: null as string | null,
    messages: [],
    schedule: {
      startDate: new Date(),
      endDate: null,
      timezone: "America/New_York",
      daysOfWeek: [1, 2, 3, 4, 5],
      timeWindows: [{ start: "09:00", end: "17:00" }],
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setCampaignData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTargetingChange = (targetingData: any) => {
    setCampaignData((prev) => ({
      ...prev,
      targeting: targetingData,
    }));
  };

  const handleAssigneeTypeChange = (type: "ai" | "human") => {
    setAssigneeType(type);
    setCampaignData((prev) => ({
      ...prev,
      assigneeType: type,
      assigneeId: null, // Reset the assignee when changing type
    }));
  };

  const handleAiSdrChange = (aiSdrId: string) => {
    setCampaignData((prev) => ({
      ...prev,
      assigneeId: aiSdrId,
    }));
  };

  const handleUserChange = (userId: string) => {
    setCampaignData((prev) => ({
      ...prev,
      assigneeId: userId,
    }));
  };

  const handleMessagesChange = (messages: any[]) => {
    setCampaignData((prev) => ({
      ...prev,
      messages,
    }));
  };

  const handleScheduleChange = (scheduleData: any) => {
    setCampaignData((prev) => ({
      ...prev,
      schedule: scheduleData,
    }));
  };

  const handleNext = () => {
    const tabs = ["details", "targeting", "assignee", "messages", "schedule"];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    const tabs = ["details", "targeting", "assignee", "messages", "schedule"];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    // Submit campaign data to API
    try {
      // API call would go here
      console.log("Submitting campaign:", campaignData);

      // Redirect to campaigns list
      router.push("/campaigns");
    } catch (error) {
      console.error("Error creating campaign:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-xl font-semibold">
        Create a new campaign to engage with your leads
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="details">Campaign Details</TabsTrigger>
          <TabsTrigger value="targeting">Targeting</TabsTrigger>
          <TabsTrigger value="assignee">Assignee</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input
                    id="campaign-name"
                    value={campaignData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter campaign name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="campaign-description">Description</Label>
                  <Textarea
                    id="campaign-description"
                    value={campaignData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    placeholder="Enter campaign description"
                    rows={4}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="targeting">
          <CampaignTargetingOptions
            initialData={campaignData.targeting}
            onChange={handleTargetingChange}
          />
        </TabsContent>

        <TabsContent value="assignee">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">
                    Select Campaign Assignee
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Choose who will be responsible for executing this campaign.
                    You can assign it to an AI SDR for automated execution or to
                    a human team member for manual handling.
                  </p>

                  <RadioGroup
                    value={assigneeType}
                    onValueChange={(value) =>
                      handleAssigneeTypeChange(value as "ai" | "human")
                    }
                    className="flex flex-col space-y-1 mb-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ai" id="ai" />
                      <Label htmlFor="ai" className="font-medium">
                        AI SDR
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="human" id="human" />
                      <Label htmlFor="human" className="font-medium">
                        Human Team Member
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {assigneeType === "ai" ? (
                  <AiSdrSelector
                    selectedAiSdrId={campaignData.assigneeId}
                    onSelectAiSdr={handleAiSdrChange}
                  />
                ) : (
                  <UserSelector
                    selectedUserId={campaignData.assigneeId}
                    onSelectUser={handleUserChange}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardContent className="pt-6">
              <CampaignCadenceBuilder
                initialMessages={campaignData.messages}
                onChange={handleMessagesChange}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <CampaignScheduler
            initialData={campaignData.schedule}
            onChange={handleScheduleChange}
          />
        </TabsContent>
      </Tabs>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={activeTab === "details"}
        >
          Previous
        </Button>

        {activeTab === "schedule" ? (
          <Button onClick={handleSubmit}>Create Campaign</Button>
        ) : (
          <Button onClick={handleNext}>Next</Button>
        )}
      </div>
    </div>
  );
}
