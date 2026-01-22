"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Rocket,
  Users,
  Calendar,
  MessageSquare,
  CheckCircle,
  Loader2,
  Sparkles,
  Phone,
  AlertCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import { PersonaTeam, PersonaMessage } from "../persona-avatar";
import type { OnboardingData } from "../onboarding-wizard";

/**
 * STEP 7: Launch Preview & Confirmation
 * ═══════════════════════════════════════════════════════════════════════════════
 * Summary dashboard with big "Launch Your Machine" button
 * Confetti animation on launch
 * ═══════════════════════════════════════════════════════════════════════════════
 */

interface LaunchStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onComplete: () => void;
  onBack: () => void;
  isSaving: boolean;
  teamId?: string;
}

export function LaunchStep({
  data,
  updateData,
  onComplete,
  onBack,
  isSaving,
  teamId,
}: LaunchStepProps) {
  const params = useParams();
  const teamSlug = params?.team as string;
  const [setupCallCompleted, setSetupCallCompleted] = useState<boolean | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check if setup call is completed
  useEffect(() => {
    async function checkSetupCallStatus() {
      try {
        const res = await fetch(`/api/team/setup-call-status?teamId=${teamId || "default_team"}`);
        if (res.ok) {
          const data = await res.json();
          setSetupCallCompleted(data.completed);
        } else {
          // If endpoint doesn't exist yet, assume not completed
          setSetupCallCompleted(false);
        }
      } catch {
        setSetupCallCompleted(false);
      } finally {
        setCheckingStatus(false);
      }
    }
    checkSetupCallStatus();
  }, [teamId]);

  const daysToStabilize = Math.ceil(20000 / data.dailyCapacity);

  const totalTierA = data.uploadedFiles.reduce(
    (sum, f) => sum + (f.tierBreakdown?.A || 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* All Personas */}
      <div className="text-center mb-4">
        <PersonaTeam className="justify-center max-w-2xl mx-auto" />
      </div>

      <PersonaMessage
        persona="GIANNA"
        message="We're all ready to go! Here's a summary of your machine configuration. Hit launch when you're ready to start generating leads!"
      />

      {/* Summary Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Audience */}
        <div className="p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
            <Users className="h-5 w-5" />
            <span className="font-medium">Audience</span>
          </div>
          <div className="text-2xl font-bold mb-1">
            {data.leadsImported.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">leads ready</div>
          <Badge variant="secondary" className="mt-2">
            {totalTierA} Gold Prospects
          </Badge>
        </div>

        {/* Capacity */}
        <div className="p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
            <Calendar className="h-5 w-5" />
            <span className="font-medium">Capacity</span>
          </div>
          <div className="text-2xl font-bold mb-1">
            {data.dailyCapacity.toLocaleString()}/day
          </div>
          <div className="text-sm text-muted-foreground">
            {daysToStabilize} days to stabilize
          </div>
        </div>

        {/* Message */}
        <div className="p-4 border rounded-lg bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-background">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
            <MessageSquare className="h-5 w-5" />
            <span className="font-medium">Message</span>
          </div>
          <div className="text-sm line-clamp-3">
            {data.firstMessageTemplate}
          </div>
          {data.testSentTo && (
            <Badge variant="outline" className="mt-2 text-xs">
              Tested
            </Badge>
          )}
        </div>

        {/* AI Team */}
        <div className="p-4 border rounded-lg bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-950/20 dark:to-background">
          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 mb-2">
            <Sparkles className="h-5 w-5" />
            <span className="font-medium">AI Team</span>
          </div>
          <div className="text-2xl font-bold mb-1">3 Workers</div>
          <div className="text-sm text-muted-foreground">
            GIANNA, CATHY, SABRINA
          </div>
          <Badge variant="default" className="mt-2 bg-green-600">
            Ready
          </Badge>
        </div>
      </div>

      {/* Checklist */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium mb-3">Launch Checklist</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>
              Industry selected: {data.preset?.displayName || data.industry}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>
              Audience configured: {data.audienceProfile.targetRoles.length}{" "}
              roles, {data.audienceProfile.sicCodes.length} SIC codes
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>
              {data.uploadedFiles.length} file(s) uploaded (
              {data.leadsImported.toLocaleString()} leads)
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>AI team acknowledged</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>
              Daily capacity: {data.dailyCapacity.toLocaleString()}/day
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>
              Message ready ({data.firstMessageTemplate.length} chars)
            </span>
          </div>
        </div>
      </div>

      {/* What Happens Next */}
      <div className="p-4 border rounded-lg">
        <h4 className="font-medium mb-2">What Happens Next</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>
            1. GIANNA will start sending messages to your highest-scored leads
          </li>
          <li>2. Responses will appear in your inbox for quick follow-up</li>
          <li>3. GOLD LABEL leads get priority routing to your call queue</li>
          <li>4. Track progress on your dashboard as The Machine calibrates</li>
        </ul>
      </div>

      {/* Setup Call Required Notice */}
      {!checkingStatus && !setupCallCompleted && (
        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="ml-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Setup call required before launch
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Book a quick 30-min call with Thomas to configure your machine for success.
                </p>
              </div>
              <Button
                variant="default"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 shrink-0"
                onClick={() => window.location.href = `/t/${teamSlug}/book-setup-call`}
              >
                <Phone className="mr-2 h-4 w-4" />
                Book Setup Call
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onBack} disabled={isSaving}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {setupCallCompleted ? (
          <Button
            onClick={onComplete}
            disabled={isSaving}
            size="lg"
            className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-lg px-8"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Launching...
              </>
            ) : (
              <>
                <Rocket className="mr-2 h-5 w-5" />
                Launch Your Machine
              </>
            )}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="lg"
            onClick={() => window.location.href = `/t/${teamSlug}/book-setup-call`}
            className="text-lg px-8"
          >
            <Phone className="mr-2 h-5 w-5" />
            Book Call to Launch
          </Button>
        )}
      </div>
    </div>
  );
}
