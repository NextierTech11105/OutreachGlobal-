"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Stepper, Step, StepTitle } from "@/components/ui/stepper";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, SkipForward } from "lucide-react";
import { toast } from "sonner";

import { WelcomeStep } from "./steps/welcome-step";
import { AudienceStep } from "./steps/audience-step";
import { UploadStep } from "./steps/upload-step";
import { MeetTeamStep } from "./steps/meet-team-step";
import { CapacityStep } from "./steps/capacity-step";
import { MessageStep } from "./steps/message-step";
import { LaunchStep } from "./steps/launch-step";

import type { AudiencePreset } from "@/lib/onboarding/audience-presets";

/**
 * ONBOARDING WIZARD - "Build Your Machine"
 * ═══════════════════════════════════════════════════════════════════════════════
 * 7-step wizard with AI persona guidance
 *
 * Steps 1-3: Required (Welcome, Audience, Upload)
 * Steps 4-7: Optional (Team, Capacity, Message, Launch)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface OnboardingData {
  // Step 1: Industry selection
  industry: string;
  preset: AudiencePreset | null;

  // Step 2: Audience definition
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

  // Step 3: Upload
  uploadedFiles: {
    key: string;
    name: string;
    recordCount: number;
    tierBreakdown?: {
      A: number;
      B: number;
      C: number;
      D: number;
    };
  }[];
  leadsImported: number;

  // Step 4: Team acknowledgment
  teamAcknowledged: boolean;

  // Step 5: Capacity
  dailyCapacity: number;

  // Step 6: First message
  firstMessageTemplate: string;
  testSentTo?: string;

  // Step 7: Launch
  launched: boolean;
}

const INITIAL_DATA: OnboardingData = {
  industry: "",
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
  launched: false,
};

const STEPS = [
  { key: "welcome", title: "Welcome", required: true },
  { key: "audience", title: "Audience", required: true },
  { key: "upload", title: "Upload", required: true },
  { key: "team", title: "AI Team", required: false },
  { key: "capacity", title: "Capacity", required: false },
  { key: "message", title: "Message", required: false },
  { key: "launch", title: "Launch", required: false },
];

interface OnboardingWizardProps {
  teamId?: string;
  onComplete?: (data: OnboardingData) => void;
  onSkip?: (currentStep: number, data: OnboardingData) => void;
}

export function OnboardingWizard({
  teamId = "default_team",
  onComplete,
  onSkip,
}: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [isSaving, setIsSaving] = useState(false);

  const step = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const canSkip = currentStep >= 3; // Can skip after step 3 (upload)

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const nextStep = useCallback(async () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Complete onboarding
      await handleComplete();
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

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
        throw new Error("Failed to save onboarding data");
      }

      toast.success("Your machine is ready!");
      onComplete?.({ ...data, launched: true });
    } catch (error) {
      toast.error("Failed to complete onboarding");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          data,
          completed: false,
          currentStep: currentStep + 1,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save progress");
      }

      toast.info("Progress saved. You can continue setup later.");
      onSkip?.(currentStep, data);
    } catch (error) {
      toast.error("Failed to save progress");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

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
            onComplete={handleComplete}
            onBack={prevStep}
            isSaving={isSaving}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Build Your Machine</h1>
          <p className="text-muted-foreground">
            Set up your lead generation system in minutes
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <Stepper index={currentStep}>
            {STEPS.map((s, i) => (
              <Step key={s.key}>
                <StepTitle>{s.title}</StepTitle>
              </Step>
            ))}
          </Stepper>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>
              Step {currentStep + 1} of {STEPS.length}
            </span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">{renderStep()}</CardContent>
        </Card>

        {/* Skip Option */}
        {canSkip && (
          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              onClick={handleSkip}
              disabled={isSaving}
              className="text-muted-foreground"
            >
              <SkipForward className="h-4 w-4 mr-2" />
              Skip for now (continue later from dashboard)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
