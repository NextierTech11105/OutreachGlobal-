"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PersonaMessage } from "../persona-avatar";
import type { OnboardingData } from "../onboarding-wizard";

/**
 * STEP 5: Set Your Daily Capacity
 * ═══════════════════════════════════════════════════════════════════════════════
 * Configure daily SMS limit (10DLC compliance)
 * Shows 10-day projection to stabilization (20K)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const CAPACITY_OPTIONS = [
  {
    value: 500,
    label: "Conservative",
    description: "500/day - Slow and steady approach",
    daysToStabilize: 40,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  {
    value: 1000,
    label: "Standard",
    description: "1,000/day - Balanced approach",
    daysToStabilize: 20,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    borderColor: "border-green-200 dark:border-green-800",
    recommended: true,
  },
  {
    value: 2000,
    label: "Maximum",
    description: "2,000/day - Fastest stabilization",
    daysToStabilize: 10,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
    borderColor: "border-purple-200 dark:border-purple-800",
  },
];

const STABILIZATION_TARGET = 20000;

interface CapacityStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function CapacityStep({
  data,
  updateData,
  onNext,
  onBack,
}: CapacityStepProps) {
  const selectedOption = CAPACITY_OPTIONS.find(
    (o) => o.value === data.dailyCapacity,
  );
  const daysToStabilize = selectedOption?.daysToStabilize || 20;

  return (
    <div className="space-y-6">
      {/* Persona Introduction */}
      <PersonaMessage
        persona="SABRINA"
        message="Let's set your daily sending capacity. This determines how quickly we calibrate The Machine. More volume = faster learning, but we stay within 10DLC compliance."
      />

      {/* Capacity Options */}
      <div className="grid gap-4 md:grid-cols-3">
        {CAPACITY_OPTIONS.map((option) => (
          <Card
            key={option.value}
            className={cn(
              "p-4 cursor-pointer transition-all hover:shadow-md relative",
              option.bgColor,
              option.borderColor,
              data.dailyCapacity === option.value &&
                "ring-2 ring-primary shadow-md",
            )}
            onClick={() => updateData({ dailyCapacity: option.value })}
          >
            {option.recommended && (
              <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                Recommended
              </div>
            )}
            <div className="flex items-center justify-between mb-2">
              <span className={cn("text-2xl font-bold", option.color)}>
                {option.value.toLocaleString()}
              </span>
              {data.dailyCapacity === option.value && (
                <Check className="h-5 w-5 text-primary" />
              )}
            </div>
            <h3 className="font-semibold">{option.label}</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {option.description}
            </p>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              <span>{option.daysToStabilize} days to stabilize</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Projection Chart */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h4 className="font-medium">Stabilization Projection</h4>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Target: {STABILIZATION_TARGET.toLocaleString()} leads</span>
            <span>{daysToStabilize} days</span>
          </div>

          {/* Progress visualization */}
          <div className="space-y-2">
            {Array.from({ length: Math.min(daysToStabilize, 10) }).map(
              (_, i) => {
                const day = i + 1;
                const progress = (day / daysToStabilize) * 100;
                const leadsProcessed = day * data.dailyCapacity;
                return (
                  <div key={day} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-12">
                      Day {day}
                    </span>
                    <div className="flex-1">
                      <Progress value={progress} className="h-2" />
                    </div>
                    <span className="text-xs font-mono w-16 text-right">
                      {leadsProcessed.toLocaleString()}
                    </span>
                  </div>
                );
              },
            )}
            {daysToStabilize > 10 && (
              <div className="text-sm text-center text-muted-foreground">
                ... and {daysToStabilize - 10} more days
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 10DLC Compliance Note */}
      <div className="p-4 border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
        <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
          10DLC Compliance
        </h4>
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          All messages are sent through registered 10DLC campaigns for maximum
          deliverability. The 2,000/day limit is the maximum allowed for
          LOW_VOLUME use cases.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} size="lg">
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
