"use client";

import * as React from "react";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  RefreshCw,
  MessageSquare,
  Send,
  Clock,
  Zap,
  Bot,
  Filter,
  CheckCircle2,
  User,
  Loader2,
  Target,
  Search,
  Calendar,
  Phone,
  Mail,
  MoreHorizontal,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Eye,
  AlertCircle,
  TrendingUp,
  History,
  Flame,
  Pause,
  UserX,
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useGlobalActions } from "@/lib/providers/global-actions-provider";

// ═══════════════════════════════════════════════════════════════════════════════
// RETARGET WORKSPACE - SABRINA AI RE-ENGAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════
//
// SABRINA specializes in re-engaging cold leads who:
// - Haven't responded to initial outreach
// - Showed interest but went dark
// - Need a different approach
//
// Workflow:
// 1. Leads that haven't responded after X days flow here
// 2. SABRINA analyzes previous attempts and crafts retarget strategy
// 3. Uses different angles, value props, or channels
// 4. Tracks re-engagement success rate
//
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface RetargetLead {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  // Previous engagement
  previousAttempts: number;
  lastContactAt: string;
  daysSinceContact: number;
  previousChannel: "sms" | "email" | "call";
  previousValueProp?: string;
  // Retarget specific
  retargetReason: "no_response" | "went_cold" | "bounced" | "paused";
  retargetStrategy?:
    | "new_angle"
    | "different_value"
    | "channel_switch"
    | "pattern_interrupt";
  suggestedApproach?: string;
  // Status
  status: "queued" | "retargeting" | "re-engaged" | "removed";
  priority: "high" | "medium" | "low";
  reEngagementScore: number; // 0-100 likelihood to re-engage
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SABRINA RETARGET TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const RETARGET_TEMPLATES = [
  {
    id: "rt_check_in",
    name: "Casual Check-In",
    strategy: "new_angle" as const,
    template:
      "Hey {firstName}! Just checking in - still interested in that {previousValueProp}? No worries if timing isn't right - Sabrina",
    timing: "3-5 days after last contact",
  },
  {
    id: "rt_new_value",
    name: "New Value Prop",
    strategy: "different_value" as const,
    template:
      "Hey {firstName}! Got something new you might like - different from what I sent before. Quick question: what's your biggest challenge with {industry} right now? - Sabrina",
    timing: "7+ days after last contact",
  },
  {
    id: "rt_channel_switch_call",
    name: "Switch to Call",
    strategy: "channel_switch" as const,
    template:
      "Quick call instead of text? Just 2 mins - promise! What time works? - Sabrina",
    timing: "After 2+ SMS with no response",
  },
  {
    id: "rt_pattern_interrupt",
    name: "Pattern Interrupt",
    strategy: "pattern_interrupt" as const,
    template:
      "Random thought - are you the {firstName} who {randomDetail}? Either way, still got that {previousValueProp} for you! - Sabrina",
    timing: "10+ days, creative approach",
  },
  {
    id: "rt_honest",
    name: "Honest Approach",
    strategy: "new_angle" as const,
    template:
      "Hey {firstName} - I'll be honest, I'm not sure if my messages are going through or if you're just busy. Either way, door's always open! - Sabrina",
    timing: "After 3+ attempts",
  },
  {
    id: "rt_fomo",
    name: "Subtle FOMO",
    strategy: "different_value" as const,
    template:
      "Hey {firstName}! Just helped someone in {city} with something similar - thought of you. Still available if interested! - Sabrina",
    timing: "5-7 days",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COPILOT RETARGET ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

function getSabrinaRetargetSuggestion(lead: RetargetLead): {
  strategy: string;
  template: (typeof RETARGET_TEMPLATES)[0];
  reasoning: string;
  confidence: number;
} {
  // Analyze based on previous engagement
  if (lead.daysSinceContact <= 3) {
    return {
      strategy: "Wait",
      template: RETARGET_TEMPLATES[0],
      reasoning: "Too soon to retarget. Give them a few more days.",
      confidence: 30,
    };
  }

  if (
    lead.daysSinceContact >= 3 &&
    lead.daysSinceContact <= 5 &&
    lead.previousAttempts === 1
  ) {
    return {
      strategy: "Casual Check-In",
      template: RETARGET_TEMPLATES.find((t) => t.id === "rt_check_in")!,
      reasoning: "First retarget attempt. A friendly check-in works best.",
      confidence: 75,
    };
  }

  if (lead.previousAttempts >= 2 && lead.previousChannel === "sms") {
    return {
      strategy: "Channel Switch",
      template: RETARGET_TEMPLATES.find(
        (t) => t.id === "rt_channel_switch_call",
      )!,
      reasoning: "SMS isn't working. Try switching to voice.",
      confidence: 60,
    };
  }

  if (lead.daysSinceContact >= 7 && lead.daysSinceContact <= 14) {
    return {
      strategy: "New Value Prop",
      template: RETARGET_TEMPLATES.find((t) => t.id === "rt_new_value")!,
      reasoning: "Enough time has passed. Offer something fresh.",
      confidence: 70,
    };
  }

  if (lead.daysSinceContact >= 14 || lead.previousAttempts >= 4) {
    return {
      strategy: "Pattern Interrupt",
      template: RETARGET_TEMPLATES.find(
        (t) => t.id === "rt_pattern_interrupt",
      )!,
      reasoning: "Standard approaches exhausted. Time for creativity.",
      confidence: 50,
    };
  }

  return {
    strategy: "Honest Approach",
    template: RETARGET_TEMPLATES.find((t) => t.id === "rt_honest")!,
    reasoning: "Be direct about the situation.",
    confidence: 55,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════════

function generateMockRetargetLeads(count: number): RetargetLead[] {
  const industries = [
    "Real Estate",
    "Insurance",
    "Legal",
    "Healthcare",
    "Retail",
  ];
  const reasons: RetargetLead["retargetReason"][] = [
    "no_response",
    "went_cold",
    "bounced",
    "paused",
  ];
  const channels: RetargetLead["previousChannel"][] = ["sms", "email", "call"];
  const firstNames = ["John", "Sarah", "Mike", "Lisa", "David", "Jennifer"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones"];
  const cities = ["Brooklyn", "Queens", "Manhattan", "Newark", "Jersey City"];
  const valueProp = [
    "AI Blueprint",
    "Valuation Report",
    "Industry Newsletter",
    "Case Study",
  ];

  return Array.from({ length: count }, (_, i) => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const daysSince = Math.floor(Math.random() * 21) + 1;

    return {
      id: `retarget-${i + 1}`,
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      phone: `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
      company: `${lastName} ${industries[Math.floor(Math.random() * industries.length)]}`,
      address: `${Math.floor(Math.random() * 9999) + 1} Main Street`,
      city: cities[Math.floor(Math.random() * cities.length)],
      state: "NY",
      previousAttempts: Math.floor(Math.random() * 5) + 1,
      lastContactAt: new Date(
        Date.now() - daysSince * 24 * 60 * 60 * 1000,
      ).toISOString(),
      daysSinceContact: daysSince,
      previousChannel: channels[Math.floor(Math.random() * channels.length)],
      previousValueProp:
        valueProp[Math.floor(Math.random() * valueProp.length)],
      retargetReason: reasons[Math.floor(Math.random() * reasons.length)],
      status: "queued",
      priority: daysSince > 14 ? "low" : daysSince > 7 ? "medium" : "high",
      reEngagementScore: Math.floor(Math.random() * 60) + 20,
      createdAt: new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEAD CARD
// ═══════════════════════════════════════════════════════════════════════════════

function RetargetLeadCard({
  lead,
  isSelected,
  onSelect,
  onRetarget,
  onRemove,
}: {
  lead: RetargetLead;
  isSelected: boolean;
  onSelect: () => void;
  onRetarget: () => void;
  onRemove: () => void;
}) {
  const suggestion = getSabrinaRetargetSuggestion(lead);

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary",
        lead.priority === "high" && "border-l-4 border-l-orange-500",
        lead.priority === "medium" && "border-l-4 border-l-yellow-500",
        lead.priority === "low" && "border-l-4 border-l-gray-300",
      )}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Checkbox checked={isSelected} onCheckedChange={onSelect} />
            <div>
              <p className="font-medium">{lead.name}</p>
              <p className="text-sm text-muted-foreground">{lead.company}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                lead.retargetReason === "no_response" && "bg-gray-100",
                lead.retargetReason === "went_cold" &&
                  "bg-blue-100 text-blue-700",
                lead.retargetReason === "bounced" && "bg-red-100 text-red-700",
                lead.retargetReason === "paused" &&
                  "bg-yellow-100 text-yellow-700",
              )}
            >
              {lead.retargetReason.replace("_", " ")}
            </Badge>
          </div>
        </div>

        {/* Previous Engagement */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3 py-2 px-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-1">
            <History className="h-3 w-3" />
            <span>
              <strong>{lead.previousAttempts}</strong> prev attempts
            </span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              <strong>{lead.daysSinceContact}</strong> days ago
            </span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <Badge variant="secondary" className="text-xs">
            {lead.previousChannel}
          </Badge>
        </div>

        {/* Re-engagement Score */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">
              Re-engagement likelihood
            </span>
            <span className="font-medium">{lead.reEngagementScore}%</span>
          </div>
          <Progress value={lead.reEngagementScore} className="h-1.5" />
        </div>

        {/* SABRINA Suggestion */}
        <div
          className={cn(
            "p-3 rounded-lg border mb-3",
            suggestion.confidence >= 70 && "bg-green-50 border-green-200",
            suggestion.confidence >= 50 &&
              suggestion.confidence < 70 &&
              "bg-yellow-50 border-yellow-200",
            suggestion.confidence < 50 && "bg-gray-50 border-gray-200",
          )}
        >
          <div className="flex items-start gap-2">
            <Sparkles
              className={cn(
                "h-4 w-4 mt-0.5",
                suggestion.confidence >= 70 && "text-green-600",
                suggestion.confidence >= 50 &&
                  suggestion.confidence < 70 &&
                  "text-yellow-600",
                suggestion.confidence < 50 && "text-gray-600",
              )}
            />
            <div className="flex-1">
              <p className="text-sm font-medium flex items-center gap-2">
                SABRINA: {suggestion.strategy}
                <Badge variant="outline" className="text-xs">
                  {suggestion.confidence}% conf
                </Badge>
              </p>
              <p className="text-xs text-muted-foreground">
                {suggestion.reasoning}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button size="sm" className="flex-1" onClick={onRetarget}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Retarget
          </Button>
          <Button size="sm" variant="outline" onClick={onRemove}>
            <UserX className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function RetargetWorkspace() {
  const [leads, setLeads] = useState<RetargetLead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterReason, setFilterReason] = useState<string>("all");

  // Dialog state
  const [selectedLead, setSelectedLead] = useState<RetargetLead | null>(null);
  const [showRetargetDialog, setShowRetargetDialog] = useState(false);
  const [retargetMessage, setRetargetMessage] = useState("");

  // Load leads
  useEffect(() => {
    const loadLeads = async () => {
      setIsLoading(true);
      try {
        const mockLeads = generateMockRetargetLeads(40);
        setLeads(mockLeads);
      } catch (error) {
        console.error("Failed to load leads:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadLeads();
  }, []);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !lead.name.toLowerCase().includes(query) &&
          !lead.company?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      if (filterReason !== "all" && lead.retargetReason !== filterReason) {
        return false;
      }
      return true;
    });
  }, [leads, searchQuery, filterReason]);

  // Stats
  const stats = useMemo(
    () => ({
      total: leads.length,
      noResponse: leads.filter((l) => l.retargetReason === "no_response")
        .length,
      wentCold: leads.filter((l) => l.retargetReason === "went_cold").length,
      highConfidence: leads.filter(
        (l) => getSabrinaRetargetSuggestion(l).confidence >= 70,
      ).length,
    }),
    [leads],
  );

  const handleRetarget = (lead: RetargetLead) => {
    const suggestion = getSabrinaRetargetSuggestion(lead);
    const message = suggestion.template.template
      .replace(/{firstName}/g, lead.firstName || lead.name.split(" ")[0])
      .replace(/{previousValueProp}/g, lead.previousValueProp || "info")
      .replace(/{city}/g, lead.city || "your area")
      .replace(/{industry}/g, "your industry")
      .replace(/{randomDetail}/g, "works in real estate");

    setSelectedLead(lead);
    setRetargetMessage(message);
    setShowRetargetDialog(true);
  };

  const executeRetarget = () => {
    if (selectedLead) {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === selectedLead.id
            ? {
                ...l,
                status: "retargeting" as const,
                previousAttempts: l.previousAttempts + 1,
              }
            : l,
        ),
      );
      toast.success(`Retarget message sent to ${selectedLead.name}`, {
        description: "Via SignalHouse",
      });
      setShowRetargetDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading Retarget Queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <RefreshCw className="h-6 w-6 text-purple-500" />
              Retarget Workspace
              <Badge
                variant="outline"
                className="ml-2 bg-purple-50 text-purple-700"
              >
                SABRINA
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Re-engage cold leads with AI-powered strategies
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4">
          <Badge variant="outline" className="bg-gray-50">
            📋 Total: {stats.total}
          </Badge>
          <Badge variant="outline" className="bg-gray-100">
            😴 No Response: {stats.noResponse}
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            ❄️ Went Cold: {stats.wentCold}
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700">
            🎯 High Confidence: {stats.highConfidence}
          </Badge>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={filterReason} onValueChange={setFilterReason}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by reason" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reasons</SelectItem>
              <SelectItem value="no_response">No Response</SelectItem>
              <SelectItem value="went_cold">Went Cold</SelectItem>
              <SelectItem value="bounced">Bounced</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1" />

          {selectedLeads.size > 0 && (
            <div className="flex items-center gap-2">
              <Badge>{selectedLeads.size} selected</Badge>
              <Button size="sm">
                <RefreshCw className="h-4 w-4 mr-1" />
                Bulk Retarget
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => (
            <RetargetLeadCard
              key={lead.id}
              lead={lead}
              isSelected={selectedLeads.has(lead.id)}
              onSelect={() => {
                setSelectedLeads((prev) => {
                  const next = new Set(prev);
                  if (next.has(lead.id)) next.delete(lead.id);
                  else next.add(lead.id);
                  return next;
                });
              }}
              onRetarget={() => handleRetarget(lead)}
              onRemove={() => {
                setLeads((prev) => prev.filter((l) => l.id !== lead.id));
                toast.success("Lead removed from retarget queue");
              }}
            />
          ))}
        </div>
      </div>

      {/* Retarget Dialog */}
      <Dialog open={showRetargetDialog} onOpenChange={setShowRetargetDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-purple-500" />
              Retarget: {selectedLead?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedLead?.previousAttempts} previous attempts • Last contact{" "}
              {selectedLead?.daysSinceContact} days ago
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Retarget Message</Label>
              <Textarea
                value={retargetMessage}
                onChange={(e) => setRetargetMessage(e.target.value)}
                rows={4}
              />
            </div>

            {selectedLead && (
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm font-medium text-purple-700">
                  SABRINA's Strategy:
                </p>
                <p className="text-sm text-purple-600">
                  {getSabrinaRetargetSuggestion(selectedLead).reasoning}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRetargetDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={executeRetarget}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Send className="h-4 w-4 mr-1" />
              Send Retarget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
