"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import {
  Smile,
  Clock,
  TrendingUp,
  Zap,
  MessageCircle,
  Send,
  Users,
  Filter,
  RefreshCw,
  Lightbulb,
  Heart,
  Coffee,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Timer,
  Brain,
  Target,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * NUDGER WORKSPACE - CATHY AI
 *
 * MIND MAP:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ CATHY = Casual Humor + Timing Intelligence                         │
 * │                                                                      │
 * │ PURPOSE: Warm follow-ups that feel human, not salesy                │
 * │                                                                      │
 * │ FLOW:                                                                │
 * │ [Stale Lead] → [CATHY Analyzes Context] → [Humor Template Match]   │
 * │     ↓              ↓                           ↓                    │
 * │ [Timing Check] → [Tone Selection] → [Personalization] → [Send]     │
 * │                                                                      │
 * │ BUTTON INTENTIONS:                                                   │
 * │ • "Send Nudge" → Execute selected template with personalization     │
 * │ • "Schedule" → Queue for optimal send time (CATHY timing)           │
 * │ • "Skip" → Mark lead as not ready, move to next                     │
 * │ • "View History" → See all touchpoints for context                  │
 * │                                                                      │
 * │ METRICS THAT MATTER:                                                 │
 * │ • Response Rate (goal: 15%+ for humor nudges)                       │
 * │ • Time to Response (faster = better timing)                         │
 * │ • Tone Effectiveness (which humor styles work)                      │
 * └─────────────────────────────────────────────────────────────────────┘
 */

// ============================================================================
// CATHY NUDGE TEMPLATES - Humor-based, human-feeling follow-ups
// ============================================================================
const NUDGE_TEMPLATES = [
  {
    id: "coffee_check",
    name: "Coffee Check-In",
    tone: "casual" as const,
    icon: Coffee,
    template:
      "Hey {{firstName}}! Hope your coffee's strong today ☕ Quick thought crossed my mind about {{topic}} - worth a 5-min chat?",
    bestFor: "Warm leads who've engaged before",
    responseRate: 18,
  },
  {
    id: "honest_followup",
    name: "Honest Follow-Up",
    tone: "direct" as const,
    icon: Heart,
    template:
      "{{firstName}}, I know you're probably swamped. No pitch here - just checking if {{value_prop}} is still on your radar or if I should circle back in a few months?",
    bestFor: "Leads who went dark after initial interest",
    responseRate: 22,
  },
  {
    id: "pattern_break",
    name: "Pattern Breaker",
    tone: "witty" as const,
    icon: Sparkles,
    template:
      "{{firstName}} - This isn't another 'just checking in' email (okay, it kind of is 😅). But seriously, saw something that reminded me of our chat about {{topic}}. Quick call?",
    bestFor: "Over-contacted leads who need pattern interrupt",
    responseRate: 15,
  },
  {
    id: "light_humor",
    name: "Light Humor",
    tone: "playful" as const,
    icon: Smile,
    template:
      "Hey {{firstName}}! My calendar just gave me a stern look for not following up sooner 📆 Any interest in picking up where we left off on {{topic}}?",
    bestFor: "Leads with 1-2 previous touches",
    responseRate: 16,
  },
  {
    id: "value_reminder",
    name: "Value Reminder",
    tone: "helpful" as const,
    icon: Lightbulb,
    template:
      "{{firstName}} - Quick reminder that {{value_prop}} is still available for your team. No pressure, just didn't want you to miss out. Thoughts?",
    bestFor: "Leads who showed interest in specific feature",
    responseRate: 14,
  },
  {
    id: "timing_hook",
    name: "Timing Hook",
    tone: "strategic" as const,
    icon: Timer,
    template:
      "{{firstName}}, perfect timing - we just {{recent_update}}. Thought of you immediately. Worth exploring?",
    bestFor: "Leads aligned with recent company updates",
    responseRate: 21,
  },
];

// ============================================================================
// CATHY TIMING INTELLIGENCE
// ============================================================================
const TIMING_WINDOWS = {
  optimal: {
    start: 9,
    end: 11,
    label: "Peak Engagement",
    color: "text-green-600",
  },
  good: {
    start: 14,
    end: 16,
    label: "Afternoon Window",
    color: "text-blue-600",
  },
  okay: { start: 11, end: 14, label: "Lunch Hours", color: "text-yellow-600" },
  avoid: { start: 17, end: 9, label: "Off Hours", color: "text-red-600" },
};

function getCurrentTimingWindow(): {
  label: string;
  color: string;
  isOptimal: boolean;
} {
  const hour = new Date().getHours();
  if (hour >= 9 && hour < 11)
    return { ...TIMING_WINDOWS.optimal, isOptimal: true };
  if (hour >= 14 && hour < 16)
    return { ...TIMING_WINDOWS.good, isOptimal: false };
  if (hour >= 11 && hour < 14)
    return { ...TIMING_WINDOWS.okay, isOptimal: false };
  return { ...TIMING_WINDOWS.avoid, isOptimal: false };
}

// ============================================================================
// LEAD TYPE FOR NUDGER
// ============================================================================
interface NudgerLead {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  email: string;
  lastContactAt: Date;
  daysSinceContact: number;
  totalTouches: number;
  lastTouchType: "sms" | "email" | "call";
  sentiment: "positive" | "neutral" | "negative" | "unknown";
  engagementScore: number; // 0-100
  bestTimeToContact?: string;
  previousTopics: string[];
  cathySuggestion?: {
    template: (typeof NUDGE_TEMPLATES)[0];
    reasoning: string;
    confidence: number;
    suggestedTime?: Date;
  };
}

// ============================================================================
// CATHY AI SUGGESTION ENGINE
// ============================================================================
function getCathyNudgeSuggestion(
  lead: NudgerLead,
): NudgerLead["cathySuggestion"] {
  const {
    daysSinceContact,
    totalTouches,
    sentiment,
    engagementScore,
    lastTouchType,
  } = lead;

  // Too soon to nudge
  if (daysSinceContact < 2) {
    return {
      template: NUDGE_TEMPLATES[0],
      reasoning: "Too soon for a nudge. Wait at least 2 days.",
      confidence: 10,
    };
  }

  // Positive sentiment + engaged = coffee check-in
  if (sentiment === "positive" && engagementScore > 60) {
    return {
      template: NUDGE_TEMPLATES[0], // Coffee Check-In
      reasoning:
        "Lead has positive sentiment and high engagement. Casual approach works best.",
      confidence: 85,
    };
  }

  // Went dark after interest = honest follow-up
  if (sentiment === "neutral" && totalTouches >= 2 && daysSinceContact > 5) {
    return {
      template: NUDGE_TEMPLATES[1], // Honest Follow-Up
      reasoning:
        "Lead engaged initially but went quiet. Direct, honest approach shows respect for their time.",
      confidence: 80,
    };
  }

  // Over-contacted = pattern break
  if (totalTouches >= 4) {
    return {
      template: NUDGE_TEMPLATES[2], // Pattern Breaker
      reasoning:
        "Multiple touches already. Need to break the pattern with something unexpected.",
      confidence: 70,
    };
  }

  // Light engagement = light humor
  if (totalTouches <= 2 && sentiment !== "negative") {
    return {
      template: NUDGE_TEMPLATES[3], // Light Humor
      reasoning:
        "Few touches and neutral/unknown sentiment. Light humor can warm up the conversation.",
      confidence: 75,
    };
  }

  // Showed interest in feature = value reminder
  if (lead.previousTopics.length > 0) {
    return {
      template: NUDGE_TEMPLATES[4], // Value Reminder
      reasoning: `Lead showed interest in ${lead.previousTopics[0]}. Remind them of the value.`,
      confidence: 72,
    };
  }

  // Default: timing hook
  return {
    template: NUDGE_TEMPLATES[5], // Timing Hook
    reasoning: "No strong signals. Use a timing-based hook to create urgency.",
    confidence: 60,
  };
}

// ============================================================================
// MOCK DATA
// ============================================================================
const MOCK_NUDGER_LEADS: NudgerLead[] = [
  {
    id: "nudge-1",
    firstName: "Rachel",
    lastName: "Kim",
    company: "TechForward Inc",
    phone: "+1 (555) 234-5678",
    email: "rachel.kim@techforward.com",
    lastContactAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    daysSinceContact: 4,
    totalTouches: 2,
    lastTouchType: "email",
    sentiment: "positive",
    engagementScore: 72,
    previousTopics: ["automation", "lead scoring"],
  },
  {
    id: "nudge-2",
    firstName: "David",
    lastName: "Chen",
    company: "Growth Labs",
    phone: "+1 (555) 345-6789",
    email: "david@growthlabs.io",
    lastContactAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    daysSinceContact: 7,
    totalTouches: 3,
    lastTouchType: "sms",
    sentiment: "neutral",
    engagementScore: 45,
    previousTopics: ["CRM integration"],
  },
  {
    id: "nudge-3",
    firstName: "Amanda",
    lastName: "Foster",
    company: "Digital Dynamics",
    phone: "+1 (555) 456-7890",
    email: "amanda.foster@digitaldynamics.com",
    lastContactAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    daysSinceContact: 10,
    totalTouches: 5,
    lastTouchType: "call",
    sentiment: "neutral",
    engagementScore: 35,
    previousTopics: [],
  },
  {
    id: "nudge-4",
    firstName: "Marcus",
    lastName: "Williams",
    company: "Innovate Corp",
    phone: "+1 (555) 567-8901",
    email: "marcus@innovatecorp.com",
    lastContactAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    daysSinceContact: 3,
    totalTouches: 1,
    lastTouchType: "email",
    sentiment: "unknown",
    engagementScore: 50,
    previousTopics: ["pricing"],
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function NudgerWorkspacePage() {
  const [leads, setLeads] = useState<NudgerLead[]>(
    MOCK_NUDGER_LEADS.map((lead) => ({
      ...lead,
      cathySuggestion: getCathyNudgeSuggestion(lead),
    })),
  );
  const [selectedLead, setSelectedLead] = useState<NudgerLead | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [toneFilter, setToneFilter] = useState<string>("all");
  const [isProcessing, setIsProcessing] = useState(false);

  const timing = getCurrentTimingWindow();

  // Filter leads by engagement readiness
  const readyToNudge = useMemo(
    () =>
      leads.filter(
        (l) =>
          l.daysSinceContact >= 2 && (l.cathySuggestion?.confidence ?? 0) > 50,
      ),
    [leads],
  );

  // Stats
  const stats = useMemo(
    () => ({
      total: leads.length,
      readyNow: readyToNudge.length,
      highConfidence: leads.filter(
        (l) => (l.cathySuggestion?.confidence ?? 0) >= 75,
      ).length,
      avgEngagement: Math.round(
        leads.reduce((sum, l) => sum + l.engagementScore, 0) / leads.length,
      ),
    }),
    [leads, readyToNudge],
  );

  // Send nudge
  const handleSendNudge = async (
    lead: NudgerLead,
    template: (typeof NUDGE_TEMPLATES)[0],
  ) => {
    setIsProcessing(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast.success(`Nudge sent to ${lead.firstName}!`, {
      description: `Template: ${template.name}`,
    });

    // Update lead
    setLeads((prev) =>
      prev.map((l) =>
        l.id === lead.id
          ? {
              ...l,
              totalTouches: l.totalTouches + 1,
              lastContactAt: new Date(),
              daysSinceContact: 0,
            }
          : l,
      ),
    );
    setSelectedLead(null);
    setIsProcessing(false);
  };

  // Schedule nudge
  const handleScheduleNudge = async (lead: NudgerLead) => {
    toast.success(`Nudge scheduled for ${lead.firstName}`, {
      description: "Will send during next optimal window (9-11 AM)",
    });
    setSelectedLead(null);
  };

  // Skip lead
  const handleSkipLead = (lead: NudgerLead) => {
    setLeads((prev) => prev.filter((l) => l.id !== lead.id));
    toast.info(`Skipped ${lead.firstName}`, {
      description: "Lead moved to next review cycle",
    });
  };

  return (
    <div className="flex flex-1 flex-col p-6 gap-6">
      {/* ================================================================== */}
      {/* HEADER: Clear intent - "This is CATHY's workspace for warm nudges" */}
      {/* ================================================================== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Smile className="h-7 w-7 text-pink-500" />
            Nudger Workspace
            <Badge
              variant="outline"
              className="ml-2 text-pink-600 border-pink-300"
            >
              CATHY AI
            </Badge>
          </h1>
          <p className="text-muted-foreground mt-1">
            Warm, human-feeling follow-ups with humor intelligence
          </p>
        </div>

        {/* Timing Indicator - Shows if NOW is a good time to send */}
        <Card
          className={cn(
            "p-3",
            timing.isOptimal && "border-green-300 bg-green-50",
          )}
        >
          <div className="flex items-center gap-2">
            <Clock className={cn("h-5 w-5", timing.color)} />
            <div>
              <p className={cn("text-sm font-medium", timing.color)}>
                {timing.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {timing.isOptimal
                  ? "Great time to send!"
                  : "Consider scheduling"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* ================================================================== */}
      {/* STATS ROW: Quick visibility on queue health */}
      {/* ================================================================== */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Queue</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ready to Nudge</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.readyNow}
                </p>
              </div>
              <Zap className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Confidence</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.highConfidence}
                </p>
              </div>
              <Brain className="h-8 w-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Engagement</p>
                <p className="text-2xl font-bold">{stats.avgEngagement}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================== */}
      {/* MAIN CONTENT: Two-column layout                                    */}
      {/* Left: Lead queue with CATHY suggestions                           */}
      {/* Right: Template selection and preview                              */}
      {/* ================================================================== */}
      <div className="grid grid-cols-5 gap-6 flex-1">
        {/* LEFT COLUMN: Lead Queue */}
        <div className="col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Nudge Queue</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={toneFilter} onValueChange={setToneFilter}>
                    <SelectTrigger className="w-[140px] h-8">
                      <Filter className="h-3 w-3 mr-2" />
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tones</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="witty">Witty</SelectItem>
                      <SelectItem value="direct">Direct</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
              {leads.map((lead) => {
                const suggestion = lead.cathySuggestion;
                const TemplateIcon = suggestion?.template.icon || Smile;

                return (
                  <div
                    key={lead.id}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer transition-all",
                      selectedLead?.id === lead.id
                        ? "border-pink-500 bg-pink-50 dark:bg-pink-950/20"
                        : "hover:border-pink-300 hover:bg-muted/50",
                    )}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {lead.firstName} {lead.lastName}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {lead.company}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span>{lead.daysSinceContact}d ago</span>
                          <span>•</span>
                          <span>{lead.totalTouches} touches</span>
                          <span>•</span>
                          <span className="capitalize">{lead.sentiment}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={cn(
                            "text-xs",
                            (suggestion?.confidence ?? 0) >= 75 &&
                              "bg-green-100 text-green-700",
                            (suggestion?.confidence ?? 0) >= 50 &&
                              (suggestion?.confidence ?? 0) < 75 &&
                              "bg-yellow-100 text-yellow-700",
                            (suggestion?.confidence ?? 0) < 50 &&
                              "bg-red-100 text-red-700",
                          )}
                        >
                          {suggestion?.confidence ?? 0}% conf
                        </Badge>
                      </div>
                    </div>

                    {/* CATHY Suggestion Preview */}
                    {suggestion && (
                      <div className="mt-3 p-2 rounded bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 border border-pink-100">
                        <div className="flex items-center gap-2 text-xs text-pink-700 dark:text-pink-300">
                          <TemplateIcon className="h-3 w-3" />
                          <span className="font-medium">
                            {suggestion.template.name}
                          </span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="text-muted-foreground">
                            {suggestion.reasoning}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Template Selection & Actions */}
        <div className="col-span-2 space-y-4">
          {/* Selected Lead Actions */}
          {selectedLead ? (
            <Card className="border-pink-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {selectedLead.firstName} {selectedLead.lastName}
                    </CardTitle>
                    <CardDescription>{selectedLead.company}</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedLead(null)}
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* CATHY's Recommendation */}
                {selectedLead.cathySuggestion && (
                  <div className="p-3 rounded-lg bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-pink-600" />
                      <span className="font-medium text-sm">
                        CATHY Recommends
                      </span>
                    </div>
                    <p className="text-sm">
                      {selectedLead.cathySuggestion.reasoning}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress
                        value={selectedLead.cathySuggestion.confidence}
                        className="flex-1 h-2"
                      />
                      <span className="text-xs font-medium">
                        {selectedLead.cathySuggestion.confidence}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Template Selection */}
                <div>
                  <p className="text-sm font-medium mb-2">Select Template</p>
                  <div className="grid grid-cols-2 gap-2">
                    {NUDGE_TEMPLATES.map((template) => {
                      const Icon = template.icon;
                      const isRecommended =
                        selectedLead.cathySuggestion?.template.id ===
                        template.id;

                      return (
                        <div
                          key={template.id}
                          className={cn(
                            "p-2 rounded border cursor-pointer transition-all text-center",
                            selectedTemplate === template.id
                              ? "border-pink-500 bg-pink-50"
                              : "hover:border-pink-300",
                            isRecommended && "ring-2 ring-pink-300",
                          )}
                          onClick={() => setSelectedTemplate(template.id)}
                        >
                          <Icon className="h-5 w-5 mx-auto mb-1 text-pink-600" />
                          <p className="text-xs font-medium">{template.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {template.responseRate}% response
                          </p>
                          {isRecommended && (
                            <Badge className="mt-1 text-[10px] bg-pink-600">
                              Recommended
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                    disabled={!selectedTemplate || isProcessing}
                    onClick={() => {
                      const template = NUDGE_TEMPLATES.find(
                        (t) => t.id === selectedTemplate,
                      );
                      if (template) handleSendNudge(selectedLead, template);
                    }}
                  >
                    {isProcessing ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Nudge Now
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleScheduleNudge(selectedLead)}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Schedule
                    </Button>
                    <Button
                      variant="outline"
                      className="text-muted-foreground"
                      onClick={() => handleSkipLead(selectedLead)}
                    >
                      Skip for Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Select a lead from the queue</p>
                <p className="text-sm">
                  CATHY will suggest the best nudge approach
                </p>
              </CardContent>
            </Card>
          )}

          {/* Template Reference */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Template Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {NUDGE_TEMPLATES.slice(0, 4).map((template) => {
                  const Icon = template.icon;
                  return (
                    <div
                      key={template.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span>{template.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={template.responseRate}
                          className="w-16 h-2"
                        />
                        <span className="text-xs font-medium w-8">
                          {template.responseRate}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
