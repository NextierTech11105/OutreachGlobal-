"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PersonaMessage } from "../persona-avatar";
import {
  AUDIENCE_PRESET_LIST,
  type AudiencePreset,
} from "@/lib/onboarding/audience-presets";
import type { OnboardingData } from "../onboarding-wizard";

/**
 * STEP 1: Welcome & Industry Selection
 * ═══════════════════════════════════════════════════════════════════════════════
 * GIANNA introduces herself and user selects their industry
 * ═══════════════════════════════════════════════════════════════════════════════
 */

interface WelcomeStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
}

export function WelcomeStep({ data, updateData, onNext }: WelcomeStepProps) {
  const handleSelectIndustry = (preset: AudiencePreset) => {
    updateData({
      industry: preset.industry,
      preset,
      audienceProfile: {
        targetRoles: preset.targetRoles,
        geography: { states: [], cities: [], zips: [] },
        sicCodes: preset.sicCodes,
        companySizeRange: preset.companySizeRange,
        employeeMin: preset.employeeMin,
        employeeMax: preset.employeeMax,
        revenueRange: preset.revenueRange,
        revenueMin: preset.revenueMin,
        revenueMax: preset.revenueMax,
      },
      firstMessageTemplate: preset.suggestedMessage,
    });
  };

  const canContinue = data.industry && data.preset;

  return (
    <div className="space-y-6">
      {/* Persona Introduction */}
      <PersonaMessage
        persona="GIANNA"
        message="Hi there! I'm GIANNA, and I'll help you build your lead generation machine. First, let's figure out who you're trying to reach. What industry are you in?"
      />

      {/* Industry Selection */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {AUDIENCE_PRESET_LIST.map((preset) => (
          <Card
            key={preset.id}
            className={cn(
              "p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
              data.industry === preset.industry &&
                "ring-2 ring-primary border-primary shadow-md",
            )}
            onClick={() => handleSelectIndustry(preset)}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-3xl">{preset.icon}</span>
              {data.industry === preset.industry && (
                <Check className="h-5 w-5 text-primary" />
              )}
            </div>
            <h3 className="font-semibold mb-1">{preset.displayName}</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {preset.description}
            </p>
            <div className="flex flex-wrap gap-1">
              {preset.targetRoles.slice(0, 3).map((role) => (
                <span
                  key={role}
                  className="text-xs bg-muted px-2 py-0.5 rounded"
                >
                  {role}
                </span>
              ))}
              {preset.targetRoles.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{preset.targetRoles.length - 3} more
                </span>
              )}
            </div>
          </Card>
        ))}

        {/* Custom/Other Option */}
        <Card
          className={cn(
            "p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/50 border-dashed",
            data.industry === "custom" &&
              "ring-2 ring-primary border-primary shadow-md",
          )}
          onClick={() =>
            updateData({
              industry: "custom",
              preset: null,
              audienceProfile: {
                targetRoles: [],
                geography: { states: [], cities: [], zips: [] },
                sicCodes: [],
                companySizeRange: "",
              },
            })
          }
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-3xl">+</span>
            {data.industry === "custom" && (
              <Check className="h-5 w-5 text-primary" />
            )}
          </div>
          <h3 className="font-semibold mb-1">Custom / Other</h3>
          <p className="text-sm text-muted-foreground">
            Define your own target audience from scratch
          </p>
        </Card>
      </div>

      {/* Selected Industry Preview */}
      {data.preset && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">
            Great choice! Here&apos;s what I know about{" "}
            {data.preset.displayName}:
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>
              <strong>Target roles:</strong>{" "}
              {data.preset.targetRoles.slice(0, 5).join(", ")}
              {data.preset.targetRoles.length > 5 && "..."}
            </li>
            <li>
              <strong>Company size:</strong> {data.preset.companySizeRange}{" "}
              employees
            </li>
            {data.preset.revenueRange && (
              <li>
                <strong>Revenue:</strong> {data.preset.revenueRange}
              </li>
            )}
            <li>
              <strong>SIC codes:</strong> {data.preset.sicCodes.join(", ")}
            </li>
          </ul>
        </div>
      )}

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!canContinue} size="lg">
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
