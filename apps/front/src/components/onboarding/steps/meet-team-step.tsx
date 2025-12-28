"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { PersonaTeam, PersonaMessage } from "../persona-avatar";
import type { OnboardingData } from "../onboarding-wizard";

/**
 * STEP 4: Meet Your AI Team
 * ═══════════════════════════════════════════════════════════════════════════════
 * Introduce the AI worker team: GIANNA, CATHY, SABRINA
 * User acknowledges understanding of the response flow
 * ═══════════════════════════════════════════════════════════════════════════════
 */

interface MeetTeamStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function MeetTeamStep({
  data,
  updateData,
  onNext,
  onBack,
}: MeetTeamStepProps) {
  const handleAcknowledge = () => {
    updateData({ teamAcknowledged: true });
    onNext();
  };

  return (
    <div className="space-y-6">
      {/* Persona Introduction */}
      <PersonaMessage
        persona="GIANNA"
        message="Now let me introduce you to the rest of the team. We work together to turn cold leads into booked meetings."
      />

      {/* Team Grid */}
      <PersonaTeam />

      {/* Response Flow */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium mb-4">How We Work Together</h4>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 text-sm font-bold">
              1
            </div>
            <div>
              <p className="font-medium">GIANNA sends the opening message</p>
              <p className="text-sm text-muted-foreground">
                First contact to capture interest and email
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 text-sm font-bold">
              2
            </div>
            <div>
              <p className="font-medium">CATHY follows up if no response</p>
              <p className="text-sm text-muted-foreground">
                Strategic retargeting at Day +2, +5, +9
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 text-sm font-bold">
              3
            </div>
            <div>
              <p className="font-medium">SABRINA closes interested leads</p>
              <p className="text-sm text-muted-foreground">
                Books meetings and sends reminders
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Automatic Handoffs */}
      <div className="p-4 border rounded-lg">
        <h4 className="font-medium mb-2">Automatic Handoffs</h4>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Any response pauses automatic follow-ups
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            GOLD LABEL leads get routed to your call queue
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            GREEN TAG leads are passed to SABRINA for booking
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            No messages sent before 9am or after 8pm local time
          </li>
        </ul>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleAcknowledge} size="lg">
          Got it, let&apos;s continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
