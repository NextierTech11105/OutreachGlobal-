"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Rocket,
  Users,
  MessageSquare,
  Settings,
  Play,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Sparkles,
  MessageCircle,
  Loader2,
  Database,
  Upload,
  Search,
  Calendar,
  Zap,
  Clock,
  Timer,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { useCurrentTeam } from "@/features/team/team.context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Step = 1 | 2 | 3 | 4 | 5;
type LeadSource = "luci_bucket" | "csv_import" | "saved_search";
type WorkerId = "gianna" | "cathy" | "sabrina";
type ExecutionMode = "blast" | "scheduled" | "auto";
type ScheduleType = "specific" | "optimal" | "spread";

const STEPS = [
  { id: 1, name: "Select Leads", icon: Users },
  { id: 2, name: "Choose Worker", icon: Sparkles },
  { id: 3, name: "Execution Mode", icon: Zap },
  { id: 4, name: "Configure", icon: Settings },
  { id: 5, name: "Launch", icon: Rocket },
];

const EXECUTION_MODES = {
  blast: {
    name: "Blast",
    description:
      "Send messages immediately in batches. Best for time-sensitive campaigns.",
    icon: Zap,
    color: "from-amber-500 to-orange-600",
    badge: "Immediate",
  },
  scheduled: {
    name: "Scheduled",
    description:
      "Schedule messages for specific times or optimal sending windows.",
    icon: Calendar,
    color: "from-blue-500 to-cyan-600",
    badge: "Timed",
  },
  auto: {
    name: "Auto-Trigger",
    description: "Automatically send based on lead behavior and events.",
    icon: Target,
    color: "from-purple-500 to-pink-600",
    badge: "Event-driven",
  },
};

const WORKERS = {
  gianna: {
    name: "GIANNA",
    role: "Opener",
    description: "Initial outreach, email capture focus. Best for cold leads.",
    color: "bg-purple-500",
    gradient: "from-purple-500 to-indigo-600",
    icon: Sparkles,
  },
  cathy: {
    name: "CATHY",
    role: "Nudger",
    description: "Humor-based re-engagement. Best for ghosted leads.",
    color: "bg-orange-500",
    gradient: "from-orange-500 to-amber-600",
    icon: MessageCircle,
  },
  sabrina: {
    name: "SABRINA",
    role: "Closer",
    description:
      "Objection handling, booking appointments. Best for warm leads.",
    color: "bg-emerald-500",
    gradient: "from-emerald-500 to-teal-600",
    icon: CheckCircle,
  },
};

const LUCI_BUCKETS = [
  { id: "initial", name: "Initial Outreach", count: 1842 },
  { id: "retarget", name: "Retarget", count: 980 },
  { id: "follow_up", name: "Follow Up", count: 450 },
  { id: "book_appointment", name: "Book Appointment", count: 120 },
  { id: "nurture", name: "Nurture", count: 2000 },
  { id: "nudger", name: "Nudger", count: 1500 },
];

export default function CampaignLaunchWizardPage() {
  const { team } = useCurrentTeam();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [launching, setLaunching] = useState(false);

  // Form state
  const [leadSource, setLeadSource] = useState<LeadSource>("luci_bucket");
  const [selectedBucket, setSelectedBucket] = useState("");
  const [selectedWorker, setSelectedWorker] = useState<WorkerId | "">("");
  const [executionMode, setExecutionMode] = useState<ExecutionMode | "">("");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("optimal");
  const [scheduledTime, setScheduledTime] = useState("");
  const [spreadStartTime, setSpreadStartTime] = useState("09:00");
  const [spreadEndTime, setSpreadEndTime] = useState("17:00");
  const [campaignName, setCampaignName] = useState("");
  const [dailyLimit, setDailyLimit] = useState("250");
  const [messageTemplate, setMessageTemplate] = useState(
    "Hey {firstName}! Quick question - are you still the owner at {companyName}? I help business owners like you get a free valuation. Reply YES for yours!",
  );

  // Validation
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return leadSource === "luci_bucket" ? !!selectedBucket : true;
      case 2:
        return !!selectedWorker;
      case 3:
        if (!executionMode) return false;
        if (
          executionMode === "scheduled" &&
          scheduleType === "specific" &&
          !scheduledTime
        )
          return false;
        return true;
      case 4:
        return !!campaignName && !!dailyLimit && !!messageTemplate;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    // Auto mode redirects to triggers page
    if (currentStep === 3 && executionMode === "auto") {
      toast.info("Redirecting to Auto-Trigger configuration...");
      router.push(`/t/${team.slug}/campaigns/triggers`);
      return;
    }

    if (currentStep < 5 && canProceed()) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleLaunch = async () => {
    setLaunching(true);
    try {
      // Map worker to campaign type
      const campaignTypeMap: Record<WorkerId, string> = {
        gianna: "initial",
        cathy: "nudger",
        sabrina: "nurture",
      };

      // Calculate scheduled time if scheduled mode
      let startsAt: string | undefined;
      if (executionMode === "scheduled") {
        if (scheduleType === "specific" && scheduledTime) {
          startsAt = new Date(scheduledTime).toISOString();
        } else if (scheduleType === "optimal") {
          // Optimal: Start at 9 AM tomorrow
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(9, 0, 0, 0);
          startsAt = tomorrow.toISOString();
        }
      }

      // Get recipient count from selected bucket
      const recipientCount = selectedBucketData?.count || 0;

      // Create campaign via REST API
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: team.id,
          name: campaignName,
          description: `${WORKERS[selectedWorker as WorkerId]?.name} ${executionMode} campaign`,
          campaignType: campaignTypeMap[selectedWorker as WorkerId] || "initial",
          persona: selectedWorker,
          message: messageTemplate,
          recipientCount,
          status: executionMode === "blast" ? "ACTIVE" : "SCHEDULED",
          startsAt,
          category: selectedBucket,
          template: messageTemplate,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create campaign");
      }

      const campaign = await response.json();
      toast.success(`Campaign "${campaignName}" launched!`);
      router.push(`/t/${team.slug}/campaigns`);
    } catch (error) {
      console.error("Launch error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to launch campaign");
    } finally {
      setLaunching(false);
    }
  };

  const selectedBucketData = LUCI_BUCKETS.find((b) => b.id === selectedBucket);
  const selectedWorkerData = selectedWorker ? WORKERS[selectedWorker] : null;
  const selectedModeData = executionMode
    ? EXECUTION_MODES[executionMode]
    : null;

  return (
    <TeamSection className="h-full flex flex-col">
      <TeamHeader>
        <TeamTitle>
          <Rocket className="w-6 h-6 mr-2" />
          Launch Campaign
        </TeamTitle>
      </TeamHeader>

      <div className="flex-1 p-4 overflow-auto">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                    isActive &&
                      "border-purple-500 bg-purple-500/20 text-purple-400",
                    isCompleted &&
                      "border-green-500 bg-green-500/20 text-green-400",
                    !isActive &&
                      !isCompleted &&
                      "border-zinc-700 bg-zinc-800 text-zinc-500",
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <StepIcon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "ml-2 text-sm font-medium",
                    isActive && "text-zinc-100",
                    !isActive && "text-zinc-500",
                  )}
                >
                  {step.name}
                </span>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "w-12 h-0.5 mx-3",
                      isCompleted ? "bg-green-500" : "bg-zinc-700",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="max-w-2xl mx-auto">
          {/* Step 1: Select Leads */}
          {currentStep === 1 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Select Lead Source</CardTitle>
                <CardDescription>
                  Choose where your leads come from
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "luci_bucket", name: "LUCI Bucket", icon: Database },
                    { id: "csv_import", name: "CSV Import", icon: Upload },
                    { id: "saved_search", name: "Saved Search", icon: Search },
                  ].map((source) => {
                    const Icon = source.icon;
                    return (
                      <button
                        key={source.id}
                        onClick={() => setLeadSource(source.id as LeadSource)}
                        className={cn(
                          "p-4 rounded-lg border text-center transition-colors",
                          leadSource === source.id
                            ? "border-purple-500 bg-purple-500/10"
                            : "border-zinc-700 hover:border-zinc-600",
                        )}
                      >
                        <Icon className="w-6 h-6 mx-auto mb-2 text-zinc-400" />
                        <p className="text-sm font-medium">{source.name}</p>
                      </button>
                    );
                  })}
                </div>

                {leadSource === "luci_bucket" && (
                  <div className="space-y-3 mt-4">
                    <Label>Select Bucket</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {LUCI_BUCKETS.map((bucket) => (
                        <button
                          key={bucket.id}
                          onClick={() => setSelectedBucket(bucket.id)}
                          className={cn(
                            "p-3 rounded-lg border text-left transition-colors",
                            selectedBucket === bucket.id
                              ? "border-purple-500 bg-purple-500/10"
                              : "border-zinc-700 hover:border-zinc-600",
                          )}
                        >
                          <p className="font-medium">{bucket.name}</p>
                          <p className="text-sm text-zinc-400">
                            {bucket.count.toLocaleString()} leads
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Choose Worker */}
          {currentStep === 2 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Choose AI Worker</CardTitle>
                <CardDescription>
                  Select which AI SDR will run this campaign
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(Object.keys(WORKERS) as WorkerId[]).map((workerId) => {
                  const worker = WORKERS[workerId];
                  const Icon = worker.icon;
                  return (
                    <button
                      key={workerId}
                      onClick={() => setSelectedWorker(workerId)}
                      className={cn(
                        "w-full p-4 rounded-lg border text-left transition-colors flex items-center gap-4",
                        selectedWorker === workerId
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-zinc-700 hover:border-zinc-600",
                      )}
                    >
                      <div
                        className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center text-white bg-gradient-to-br",
                          worker.gradient,
                        )}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{worker.name}</p>
                          <Badge variant="outline">{worker.role}</Badge>
                        </div>
                        <p className="text-sm text-zinc-400 mt-1">
                          {worker.description}
                        </p>
                      </div>
                      {selectedWorker === workerId && (
                        <CheckCircle className="w-5 h-5 text-purple-400" />
                      )}
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Execution Mode */}
          {currentStep === 3 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Choose Execution Mode</CardTitle>
                <CardDescription>How should messages be sent?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(Object.keys(EXECUTION_MODES) as ExecutionMode[]).map(
                  (modeId) => {
                    const mode = EXECUTION_MODES[modeId];
                    const Icon = mode.icon;
                    return (
                      <button
                        key={modeId}
                        onClick={() => setExecutionMode(modeId)}
                        className={cn(
                          "w-full p-4 rounded-lg border text-left transition-colors flex items-center gap-4",
                          executionMode === modeId
                            ? "border-purple-500 bg-purple-500/10"
                            : "border-zinc-700 hover:border-zinc-600",
                        )}
                      >
                        <div
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center text-white bg-gradient-to-br",
                            mode.color,
                          )}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{mode.name}</p>
                            <Badge variant="secondary" className="text-xs">
                              {mode.badge}
                            </Badge>
                          </div>
                          <p className="text-sm text-zinc-400 mt-1">
                            {mode.description}
                          </p>
                        </div>
                        {executionMode === modeId && (
                          <CheckCircle className="w-5 h-5 text-purple-400" />
                        )}
                      </button>
                    );
                  },
                )}

                {/* Scheduled Mode Options */}
                {executionMode === "scheduled" && (
                  <div className="mt-6 p-4 bg-zinc-800 rounded-lg space-y-4">
                    <Label className="text-sm font-medium">Schedule Type</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setScheduleType("specific")}
                        className={cn(
                          "p-3 rounded-lg border text-center transition-colors",
                          scheduleType === "specific"
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-zinc-700 hover:border-zinc-600",
                        )}
                      >
                        <Clock className="w-5 h-5 mx-auto mb-1 text-zinc-400" />
                        <p className="text-xs font-medium">Specific Time</p>
                      </button>
                      <button
                        onClick={() => setScheduleType("optimal")}
                        className={cn(
                          "p-3 rounded-lg border text-center transition-colors",
                          scheduleType === "optimal"
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-zinc-700 hover:border-zinc-600",
                        )}
                      >
                        <Sparkles className="w-5 h-5 mx-auto mb-1 text-zinc-400" />
                        <p className="text-xs font-medium">Optimal (AI)</p>
                      </button>
                      <button
                        onClick={() => setScheduleType("spread")}
                        className={cn(
                          "p-3 rounded-lg border text-center transition-colors",
                          scheduleType === "spread"
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-zinc-700 hover:border-zinc-600",
                        )}
                      >
                        <Timer className="w-5 h-5 mx-auto mb-1 text-zinc-400" />
                        <p className="text-xs font-medium">Spread Across</p>
                      </button>
                    </div>

                    {scheduleType === "specific" && (
                      <div className="space-y-2">
                        <Label>Send At</Label>
                        <Input
                          type="datetime-local"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="bg-zinc-900 border-zinc-700"
                        />
                      </div>
                    )}

                    {scheduleType === "optimal" && (
                      <div className="p-3 bg-zinc-900 rounded-lg">
                        <p className="text-sm text-zinc-400">
                          AI will analyze recipient time zones and engagement
                          patterns to send at optimal times for each lead.
                        </p>
                      </div>
                    )}

                    {scheduleType === "spread" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Start Time</Label>
                          <Input
                            type="time"
                            value={spreadStartTime}
                            onChange={(e) => setSpreadStartTime(e.target.value)}
                            className="bg-zinc-900 border-zinc-700"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>End Time</Label>
                          <Input
                            type="time"
                            value={spreadEndTime}
                            onChange={(e) => setSpreadEndTime(e.target.value)}
                            className="bg-zinc-900 border-zinc-700"
                          />
                        </div>
                        <p className="col-span-2 text-xs text-zinc-500">
                          Messages will be evenly distributed between these
                          hours
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Auto Mode Notice */}
                {executionMode === "auto" && (
                  <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <p className="text-sm text-purple-300">
                      Auto-trigger mode requires event configuration. Click
                      "Next" to set up your triggers.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Configure */}
          {currentStep === 4 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Configure Campaign</CardTitle>
                <CardDescription>Set up your campaign details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Campaign Name</Label>
                  <Input
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g., Queens Plumbers Q4"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Daily Limit</Label>
                    <Select value={dailyLimit} onValueChange={setDailyLimit}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100">100 messages</SelectItem>
                        <SelectItem value="250">250 messages</SelectItem>
                        <SelectItem value="500">500 messages</SelectItem>
                        <SelectItem value="1000">1,000 messages</SelectItem>
                        <SelectItem value="2000">
                          2,000 messages (max)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Send Window</Label>
                    <Input
                      value="9 AM - 5 PM EST"
                      disabled
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Message Template</Label>
                  <Textarea
                    value={messageTemplate}
                    onChange={(e) => setMessageTemplate(e.target.value)}
                    rows={4}
                    className="bg-zinc-800 border-zinc-700"
                  />
                  <p className="text-xs text-zinc-500">
                    Variables: {"{firstName}"}, {"{lastName}"},{" "}
                    {"{companyName}"}, {"{city}"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Preview & Launch */}
          {currentStep === 5 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Review & Launch</CardTitle>
                <CardDescription>
                  Confirm your campaign settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-zinc-800">
                    <span className="text-zinc-400">Campaign Name</span>
                    <span className="font-medium">
                      {campaignName || "Unnamed"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-zinc-800">
                    <span className="text-zinc-400">Lead Source</span>
                    <span className="font-medium">
                      {selectedBucketData?.name || "LUCI Bucket"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-zinc-800">
                    <span className="text-zinc-400">Leads</span>
                    <span className="font-medium">
                      {selectedBucketData?.count.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-zinc-800">
                    <span className="text-zinc-400">AI Worker</span>
                    <span className="font-medium">
                      {selectedWorkerData?.name} ({selectedWorkerData?.role})
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-zinc-800">
                    <span className="text-zinc-400">Execution Mode</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {selectedModeData?.name}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {selectedModeData?.badge}
                      </Badge>
                    </div>
                  </div>
                  {executionMode === "scheduled" && (
                    <div className="flex justify-between py-2 border-b border-zinc-800">
                      <span className="text-zinc-400">Schedule</span>
                      <span className="font-medium">
                        {scheduleType === "specific" && scheduledTime}
                        {scheduleType === "optimal" && "AI Optimal Timing"}
                        {scheduleType === "spread" &&
                          `${spreadStartTime} - ${spreadEndTime}`}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b border-zinc-800">
                    <span className="text-zinc-400">Daily Limit</span>
                    <span className="font-medium">{dailyLimit} messages</span>
                  </div>
                </div>

                <div className="p-4 bg-zinc-800 rounded-lg">
                  <p className="text-xs text-zinc-500 mb-2">
                    Sample Message Preview:
                  </p>
                  <p className="text-sm">
                    {messageTemplate
                      .replace("{firstName}", "John")
                      .replace("{lastName}", "Smith")
                      .replace("{companyName}", "Smith Plumbing")
                      .replace("{city}", "Queens")}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {currentStep < 5 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {currentStep === 3 && executionMode === "auto" ? (
                  <>
                    Configure Triggers
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleLaunch}
                disabled={launching}
                className="bg-green-600 hover:bg-green-700"
              >
                {launching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Launching...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 mr-2" />
                    Launch Campaign
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </TeamSection>
  );
}
