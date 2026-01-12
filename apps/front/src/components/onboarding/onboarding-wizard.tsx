"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Sparkles,
  Users,
  Target,
  MessageSquare,
  Upload,
  Zap,
  Rocket,
  CheckCircle,
} from "lucide-react";

// Import all steps
import {
  WelcomeStep,
  AudienceStep,
  UploadStep,
  MeetTeamStep,
  CapacityStep,
  MessageStep,
  LaunchStep,
} from "./steps";

import type { AudiencePreset } from "@/lib/onboarding/audience-presets";

/**
 * NEXTIER ONBOARDING WIZARD
 * ═══════════════════════════════════════════════════════════════════════════════
 * 7-Step ICP Programming Flow with AI Copilot Logic
 *
 * 1. WELCOME - Industry selection, meet GIANNA
 * 2. AUDIENCE - Program your ICP (roles, geo, SIC, company size)
 * 3. UPLOAD - Drop your leads (CSV)
 * 4. MEET THE TEAM - GIANNA → CATHY → SABRINA flow
 * 5. CAPACITY - Set daily SMS volume (up to 2,000/day per 10DLC)
 * 6. MESSAGE - Review/customize first message template
 * 7. LAUNCH - Final review and launch
 *
 * Completion unlocks: Template Cartridges, Campaigns, Quick Send
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Full data shape matching step components
export interface OnboardingData {
  // Step 1: Welcome
  industry: string | null;
  preset: AudiencePreset | null;

  // Step 2: Audience (ICP)
  audienceProfile: {
    targetRoles: string[];
    geography: {
      states: string[];
      cities: string[];
      zips: string[];
    };
    sicCodes: string[];
    companySizeRange: string;
    employeeMin?: number;
    employeeMax?: number;
    revenueRange?: string;
    revenueMin?: number;
    revenueMax?: number;
  };

  // Step 3: Upload - matching UploadStep expectations
  uploadedFiles: Array<{
    key: string;
    name: string;
    recordCount: number;
    tierBreakdown?: {
      A: number;
      B: number;
      C: number;
      D: number;
    };
    goldProspects?: number;
  }>;
  leadsImported: number;

  // Step 4: Team Acknowledgment
  teamAcknowledged: boolean;

  // Step 5: Capacity
  dailyCapacity: number;

  // Step 6: Message
  firstMessageTemplate: string;
  messageApproved: boolean;
  testSentTo?: string;

  // Step 7: Launch
  launched: boolean;
}

const INITIAL_DATA: OnboardingData = {
  industry: null,
  preset: null,
  audienceProfile: {
    targetRoles: [],
    geography: { states: [], cities: [], zips: [] },
    sicCodes: [],
    companySizeRange: "",
  },
  uploadedFiles: [],
  leadsImported: 0,
  teamAcknowledged: false,
  dailyCapacity: 1000,
  firstMessageTemplate: "",
  messageApproved: false,
  launched: false,
};

// Step configuration with icons
const STEPS = [
  {
    id: "welcome",
    label: "Industry",
    icon: Sparkles,
    description: "Select your industry",
  },
  {
    id: "audience",
    label: "ICP",
    icon: Target,
    description: "Program your ideal customer",
  },
  {
    id: "upload",
    label: "Leads",
    icon: Upload,
    description: "Upload your contacts",
  },
  {
    id: "team",
    label: "Team",
    icon: Users,
    description: "Meet GIANNA, CATHY, SABRINA",
  },
  {
    id: "capacity",
    label: "Capacity",
    icon: Zap,
    description: "Set daily volume",
  },
  {
    id: "message",
    label: "Message",
    icon: MessageSquare,
    description: "Customize opener",
  },
  { id: "launch", label: "Launch", icon: Rocket, description: "Go live" },
];

interface OnboardingWizardProps {
  teamId?: string;
  onComplete?: (data: OnboardingData) => void;
}

export function OnboardingWizard({
  teamId = "default_team",
  onComplete,
}: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [isSaving, setIsSaving] = useState(false);

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  // Update data helper
  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Navigation
  const nextStep = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  // Handle final launch/complete
  const handleComplete = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          data: { ...data, launched: true },
          completed: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Launch failed");
      }

      setData((prev) => ({ ...prev, launched: true }));
      toast.success("🚀 Your machine is LIVE! Welcome to Nextier.");
      onComplete?.({ ...data, launched: true });
    } catch (error) {
      console.error("Launch failed:", error);
      toast.error("Launch failed. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <WelcomeStep data={data} updateData={updateData} onNext={nextStep} />
        );
      case 1:
        return (
          <AudienceStep
            data={data}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 2:
        return (
          <UploadStep
            data={data}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
            teamId={teamId}
          />
        );
      case 3:
        return (
          <MeetTeamStep
            data={data}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 4:
        return (
          <CapacityStep
            data={data}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 5:
        return (
          <MessageStep
            data={data}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 6:
        return (
          <LaunchStep
            data={data}
            updateData={updateData}
            onBack={prevStep}
            onComplete={handleComplete}
            isSaving={isSaving}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8 px-4">
      <div className="container max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Build Your Machine</h1>
          <p className="text-muted-foreground">
            Program your ICP, meet your AI team, and launch in minutes.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">
              Step {currentStep + 1} of {STEPS.length}:{" "}
              {STEPS[currentStep].label}
            </span>
            <span className="text-muted-foreground">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between mb-8 overflow-x-auto pb-2">
          {STEPS.map((step, index) => {
            const isComplete = index < currentStep;
            const isCurrent = index === currentStep;
            const StepIcon = step.icon;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex flex-col items-center gap-1 min-w-[60px]",
                  isCurrent && "text-primary",
                  isComplete && "text-green-500",
                  !isCurrent && !isComplete && "text-muted-foreground",
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                    isCurrent && "border-primary bg-primary/10",
                    isComplete && "border-green-500 bg-green-500/10",
                    !isCurrent && !isComplete && "border-muted",
                  )}
                >
                  {isComplete ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <StepIcon className="h-5 w-5" />
                  )}
                </div>
                <span className="text-xs font-medium hidden sm:block">
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <Card className="shadow-xl">
          <CardContent className="p-6 sm:p-8">{renderStep()}</CardContent>
        </Card>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            Completing onboarding unlocks:{" "}
            <span className="font-medium">Template Cartridges</span>,{" "}
            <span className="font-medium">Campaigns</span>, and{" "}
            <span className="font-medium">Quick Send</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default OnboardingWizard;
