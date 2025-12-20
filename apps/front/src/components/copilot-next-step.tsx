"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import {
  Brain,
  MessageCircle,
  Phone,
  Mail,
  Calendar,
  Clock,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Send,
  Users,
  Target,
  Zap,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Smile,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * COPILOT NEXT-STEP LOGIC
 *
 * MIND MAP:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ ASSISTANCE MODE - AI handles mechanical, human handles relationship        │
 * │                                                                              │
 * │ AFTER CALL DISPOSITION:                                                      │
 * │                                                                              │
 * │ [interested]      → Schedule follow-up, send value content                  │
 * │ [callback]        → Queue callback, set reminder                            │
 * │ [not_interested]  → Retarget later (SABRINA workspace)                      │
 * │ [meeting_set]     → Confirm meeting, send agenda                            │
 * │ [voicemail]       → Send SMS follow-up (GIANNA opener)                      │
 * │ [no_answer]       → Schedule retry, different time slot                     │
 * │ [wrong_number]    → Skip trace, find alternate contact                      │
 * │ [follow_up]       → Queue for nurture sequence                              │
 * │                                                                              │
 * │ ASSISTANCE MODE OPTIONS:                                                     │
 * │ • "Execute Now" → AI immediately performs suggested action                  │
 * │ • "Queue for Later" → Add to workspace queue                                │
 * │ • "Warm Transfer" → "Hold on for Tommy" - human takes over                  │
 * │ • "Skip" → Move to next lead in queue                                       │
 * │                                                                              │
 * │ COMPOUNDING INTELLIGENCE:                                                    │
 * │ • Learns from successful dispositions                                        │
 * │ • Adjusts timing based on response patterns                                  │
 * │ • Routes to appropriate AI worker (GIANNA/SABRINA/CATHY)                   │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// ============================================================================
// TYPES
// ============================================================================
export type CallDisposition =
  | "interested"
  | "callback"
  | "not_interested"
  | "meeting_scheduled"
  | "voicemail"
  | "no_answer"
  | "wrong_number"
  | "follow_up";

export interface LeadContext {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  previousAttempts?: number;
  lastContactAt?: Date;
  campaignId?: string;
  tags?: string[];
}

export interface NextStepSuggestion {
  id: string;
  action: string;
  description: string;
  icon: React.ElementType;
  priority: "high" | "medium" | "low";
  aiWorker: "GIANNA" | "SABRINA" | "CATHY" | "MANUAL";
  confidence: number;
  timing: string;
  template?: {
    id: string;
    name: string;
    preview: string;
  };
}

interface CopilotNextStepProps {
  disposition: CallDisposition | null;
  lead: LeadContext;
  callDuration?: number;
  notes?: string;
  onExecuteAction: (suggestion: NextStepSuggestion) => void;
  onQueueAction: (suggestion: NextStepSuggestion) => void;
  onWarmTransfer: () => void;
  onSkip: () => void;
  isAssistanceMode?: boolean;
  className?: string;
}

// ============================================================================
// NEXT STEP SUGGESTION ENGINE
// ============================================================================
function getNextStepSuggestions(
  disposition: CallDisposition | null,
  lead: LeadContext,
  callDuration?: number,
): NextStepSuggestion[] {
  if (!disposition) return [];

  const suggestions: NextStepSuggestion[] = [];
  const attempts = lead.previousAttempts || 0;

  switch (disposition) {
    case "interested":
      suggestions.push(
        {
          id: "send-value-content",
          action: "Send Value Content",
          description:
            "Deliver relevant content from library to reinforce interest",
          icon: Send,
          priority: "high",
          aiWorker: "GIANNA",
          confidence: 92,
          timing: "Within 1 hour",
          template: {
            id: "value_followup",
            name: "Interest Follow-Up",
            preview:
              "Great speaking with you! As promised, here's the {{resource}} we discussed...",
          },
        },
        {
          id: "schedule-demo",
          action: "Schedule Demo/Meeting",
          description: "Lock in next step while interest is high",
          icon: Calendar,
          priority: "high",
          aiWorker: "MANUAL",
          confidence: 88,
          timing: "Immediately",
        },
      );
      break;

    case "callback":
      suggestions.push(
        {
          id: "set-callback",
          action: "Set Callback Reminder",
          description:
            "Queue callback at specified time with context preserved",
          icon: Clock,
          priority: "high",
          aiWorker: "MANUAL",
          confidence: 95,
          timing: "At scheduled time",
        },
        {
          id: "pre-call-sms",
          action: "Send Pre-Call SMS",
          description: "Gentle reminder before callback",
          icon: MessageCircle,
          priority: "medium",
          aiWorker: "GIANNA",
          confidence: 80,
          timing: "1 hour before callback",
          template: {
            id: "callback_reminder",
            name: "Callback Reminder",
            preview:
              "Hey {{firstName}}, quick reminder about our call in 1 hour. Looking forward to it!",
          },
        },
      );
      break;

    case "not_interested":
      suggestions.push(
        {
          id: "retarget-later",
          action: "Queue for Retarget",
          description:
            "Add to SABRINA's re-engagement queue for a different angle later",
          icon: RefreshCw,
          priority: "medium",
          aiWorker: "SABRINA",
          confidence: 65,
          timing: "In 14-30 days",
        },
        {
          id: "different-value",
          action: "Try Different Value Prop",
          description:
            "Approach with alternative benefit they might care about",
          icon: Target,
          priority: "low",
          aiWorker: "SABRINA",
          confidence: 45,
          timing: "In 30+ days",
          template: {
            id: "new_angle",
            name: "New Angle Approach",
            preview:
              "{{firstName}}, I know you weren't interested in {{previous_offer}}. But I thought you might find {{new_value}} relevant...",
          },
        },
      );
      break;

    case "meeting_scheduled":
      suggestions.push(
        {
          id: "send-confirmation",
          action: "Send Meeting Confirmation",
          description: "Confirm details and set expectations",
          icon: CheckCircle2,
          priority: "high",
          aiWorker: "GIANNA",
          confidence: 98,
          timing: "Immediately",
          template: {
            id: "meeting_confirm",
            name: "Meeting Confirmation",
            preview:
              "{{firstName}}, confirming our meeting for {{date}} at {{time}}. Here's what we'll cover...",
          },
        },
        {
          id: "send-agenda",
          action: "Send Pre-Meeting Agenda",
          description: "Provide value before the meeting",
          icon: Mail,
          priority: "medium",
          aiWorker: "GIANNA",
          confidence: 85,
          timing: "24 hours before meeting",
        },
      );
      break;

    case "voicemail":
      suggestions.push(
        {
          id: "sms-after-vm",
          action: "Send SMS Follow-Up",
          description: "Quick text to complement voicemail",
          icon: MessageCircle,
          priority: "high",
          aiWorker: "GIANNA",
          confidence: 88,
          timing: "Within 5 minutes",
          template: {
            id: "vm_followup_sms",
            name: "Voicemail Follow-Up",
            preview:
              "Hey {{firstName}}, just left you a voicemail. Would love to connect about {{topic}}. Text back if easier!",
          },
        },
        {
          id: "retry-call",
          action: "Schedule Retry Call",
          description: `Attempt ${attempts + 2} at a different time`,
          icon: Phone,
          priority: "medium",
          aiWorker: "MANUAL",
          confidence: 75,
          timing: attempts < 2 ? "Tomorrow, different time" : "In 2-3 days",
        },
      );
      break;

    case "no_answer":
      suggestions.push(
        {
          id: "retry-different-time",
          action: "Retry at Different Time",
          description: `Schedule attempt ${attempts + 2} at optimal time window`,
          icon: Clock,
          priority: "high",
          aiWorker: "MANUAL",
          confidence: 82,
          timing: "Within 24 hours",
        },
        {
          id: "sms-intro",
          action: "Send Intro SMS",
          description: "Soft introduction via text",
          icon: MessageCircle,
          priority: "medium",
          aiWorker: "GIANNA",
          confidence: 78,
          timing: "Within 1 hour",
          template: {
            id: "cold_intro_sms",
            name: "Intro Text",
            preview:
              "Hey {{firstName}}, tried calling earlier. Quick question about {{topic}} - would love 2 min of your time. Best way to reach you?",
          },
        },
      );
      break;

    case "wrong_number":
      suggestions.push(
        {
          id: "skip-trace",
          action: "Run Skip Trace",
          description: "Find alternate phone number for this contact",
          icon: Users,
          priority: "high",
          aiWorker: "MANUAL",
          confidence: 70,
          timing: "Immediately",
        },
        {
          id: "try-email",
          action: "Try Email Instead",
          description: "Switch to email channel if available",
          icon: Mail,
          priority: "medium",
          aiWorker: "GIANNA",
          confidence: lead.email ? 85 : 20,
          timing: "Within 1 hour",
        },
      );
      break;

    case "follow_up":
      suggestions.push(
        {
          id: "nurture-sequence",
          action: "Add to Nurture Sequence",
          description: "Automated multi-touch follow-up over time",
          icon: Zap,
          priority: "high",
          aiWorker: "GIANNA",
          confidence: 90,
          timing: "Starting tomorrow",
        },
        {
          id: "gentle-nudge",
          action: "Send Gentle Nudge",
          description: "Light, human-feeling check-in",
          icon: Smile,
          priority: "medium",
          aiWorker: "CATHY",
          confidence: 75,
          timing: "In 3-5 days",
          template: {
            id: "gentle_nudge",
            name: "Friendly Nudge",
            preview:
              "Hey {{firstName}}! Just circling back on our chat. Any thoughts on {{topic}}? No rush, just curious.",
          },
        },
      );
      break;
  }

  // Sort by confidence
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

// ============================================================================
// AI WORKER BADGE COMPONENT
// ============================================================================
function AiWorkerBadge({ worker }: { worker: NextStepSuggestion["aiWorker"] }) {
  const config = {
    GIANNA: {
      color: "bg-blue-100 text-blue-700 border-blue-200",
      label: "GIANNA",
    },
    SABRINA: {
      color: "bg-purple-100 text-purple-700 border-purple-200",
      label: "SABRINA",
    },
    CATHY: {
      color: "bg-pink-100 text-pink-700 border-pink-200",
      label: "CATHY",
    },
    MANUAL: {
      color: "bg-gray-100 text-gray-700 border-gray-200",
      label: "Manual",
    },
  };

  const { color, label } = config[worker];

  return (
    <Badge variant="outline" className={cn("text-[10px] px-1.5", color)}>
      {worker !== "MANUAL" && <Sparkles className="h-2.5 w-2.5 mr-1" />}
      {label}
    </Badge>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function CopilotNextStep({
  disposition,
  lead,
  callDuration,
  notes,
  onExecuteAction,
  onQueueAction,
  onWarmTransfer,
  onSkip,
  isAssistanceMode = false,
  className,
}: CopilotNextStepProps) {
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<NextStepSuggestion | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const suggestions = useMemo(
    () => getNextStepSuggestions(disposition, lead, callDuration),
    [disposition, lead, callDuration],
  );

  const primarySuggestion = suggestions[0] || null;

  // Handle execute action
  const handleExecute = async (suggestion: NextStepSuggestion) => {
    setIsProcessing(true);
    try {
      await onExecuteAction(suggestion);
      toast.success(`Executed: ${suggestion.action}`, {
        description: `Handled by ${suggestion.aiWorker}`,
      });
    } catch {
      toast.error("Failed to execute action");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle queue action
  const handleQueue = async (suggestion: NextStepSuggestion) => {
    setIsProcessing(true);
    try {
      await onQueueAction(suggestion);
      toast.success(`Queued: ${suggestion.action}`, {
        description: `Scheduled for ${suggestion.timing}`,
      });
    } catch {
      toast.error("Failed to queue action");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!disposition || suggestions.length === 0) {
    return null;
  }

  return (
    <Card
      className={cn(
        "border-2 border-purple-200 bg-gradient-to-br from-purple-50/50 to-blue-50/50",
        className,
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-100">
              <Brain className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-base">Copilot Next Steps</CardTitle>
              <CardDescription className="text-xs">
                {isAssistanceMode
                  ? "Assistance Mode Active"
                  : "AI-powered recommendations"}
              </CardDescription>
            </div>
          </div>
          {isAssistanceMode && (
            <Badge className="bg-green-100 text-green-700 border-green-200">
              <Zap className="h-3 w-3 mr-1" />
              Active
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Primary Recommendation */}
        {primarySuggestion && (
          <div className="p-3 rounded-lg border-2 border-purple-300 bg-white">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "p-1.5 rounded",
                    primarySuggestion.priority === "high" && "bg-green-100",
                    primarySuggestion.priority === "medium" && "bg-yellow-100",
                    primarySuggestion.priority === "low" && "bg-gray-100",
                  )}
                >
                  <primarySuggestion.icon
                    className={cn(
                      "h-4 w-4",
                      primarySuggestion.priority === "high" && "text-green-600",
                      primarySuggestion.priority === "medium" &&
                        "text-yellow-600",
                      primarySuggestion.priority === "low" && "text-gray-600",
                    )}
                  />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {primarySuggestion.action}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {primarySuggestion.description}
                  </p>
                </div>
              </div>
              <AiWorkerBadge worker={primarySuggestion.aiWorker} />
            </div>

            {/* Confidence & Timing */}
            <div className="flex items-center justify-between text-xs mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-muted-foreground" />
                <span>{primarySuggestion.confidence}% confidence</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{primarySuggestion.timing}</span>
              </div>
            </div>

            {/* Template Preview */}
            {primarySuggestion.template && (
              <div className="p-2 rounded bg-gray-50 text-xs text-muted-foreground mb-3 italic">
                "{primarySuggestion.template.preview}"
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                disabled={isProcessing}
                onClick={() => handleExecute(primarySuggestion)}
              >
                <Zap className="h-3 w-3 mr-1" />
                Execute Now
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={isProcessing}
                onClick={() => handleQueue(primarySuggestion)}
              >
                <Clock className="h-3 w-3 mr-1" />
                Queue
              </Button>
            </div>
          </div>
        )}

        {/* Alternative Suggestions */}
        {suggestions.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Other Options
            </p>
            {suggestions.slice(1, 3).map((suggestion) => (
              <div
                key={suggestion.id}
                className={cn(
                  "p-2 rounded-lg border cursor-pointer transition-all",
                  selectedSuggestion?.id === suggestion.id
                    ? "border-purple-400 bg-purple-50"
                    : "hover:border-purple-200",
                )}
                onClick={() => setSelectedSuggestion(suggestion)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <suggestion.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{suggestion.action}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {suggestion.confidence}%
                    </span>
                    <AiWorkerBadge worker={suggestion.aiWorker} />
                  </div>
                </div>
                {selectedSuggestion?.id === suggestion.id && (
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExecute(suggestion);
                      }}
                    >
                      Execute
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQueue(suggestion);
                      }}
                    >
                      Queue
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions Footer */}
        <div className="pt-3 border-t flex justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onWarmTransfer}
            className="text-xs text-muted-foreground"
          >
            <Users className="h-3 w-3 mr-1" />
            Warm Transfer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="text-xs text-muted-foreground"
          >
            Skip to Next
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default CopilotNextStep;
