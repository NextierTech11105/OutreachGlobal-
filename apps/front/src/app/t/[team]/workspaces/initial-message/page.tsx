"use client";

import * as React from "react";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Send,
  Clock,
  Zap,
  Bot,
  Pause,
  Play,
  Filter,
  CheckCircle2,
  User,
  Loader2,
  Flame,
  Target,
  RefreshCw,
  Search,
  Calendar,
  Phone,
  Mail,
  MoreHorizontal,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Eye,
  Edit3,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useGlobalActions } from "@/lib/providers/global-actions-provider";

// ═══════════════════════════════════════════════════════════════════════════════
// INITIAL MESSAGE WORKSPACE - GIANNA AI OPENER STAGING
// ═══════════════════════════════════════════════════════════════════════════════
//
// Workflow:
// 1. LUCI pulls leads from USBizData (SIC codes) or property lists
// 2. Leads flow here for initial message staging
// 3. GIANNA generates personalized openers
// 4. User reviews/approves/edits messages
// 5. Messages sent via SignalHouse
// 6. Responses flow to Inbox → 2-Bracket SMS Flow
//
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface InitialMessageLead {
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
  // Lead metadata
  source?: string; // "USBizData", "PropertyList", "CSV Import"
  sicCode?: string;
  industry?: string;
  // Tracking
  attempts: number;
  lastAttemptAt?: string;
  nextStepAt?: string;
  nextStepAction?: "initial_sms" | "follow_up" | "call" | "email";
  // Message
  generatedMessage?: string;
  messageStatus: "pending" | "generated" | "approved" | "sent" | "failed";
  // Scoring
  score: number;
  priority: "high" | "medium" | "low";
  createdAt: string;
}

interface OpenerTemplate {
  id: string;
  name: string;
  category: "valuation" | "blueprint" | "article" | "newsletter" | "custom";
  template: string;
  valueX: string; // What they'll receive
  expectedResponse: "email" | "permission" | "interest";
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPENER TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const OPENER_TEMPLATES: OpenerTemplate[] = [
  {
    id: "opener_valuation",
    name: "Property Valuation Report",
    category: "valuation",
    template:
      "Hi {firstName}, this is {worker} - I put together a quick valuation report for {address}. What's the best email to send it?",
    valueX: "Property Valuation Report",
    expectedResponse: "email",
  },
  {
    id: "opener_ai_blueprint",
    name: "AI Efficiency Blueprint",
    category: "blueprint",
    template:
      "Hey {firstName}! I've been working with {industry} companies on AI automation - put together a blueprint that's helped folks save 10+ hrs/week. Best email to send it?",
    valueX: "AI Efficiency Blueprint",
    expectedResponse: "email",
  },
  {
    id: "opener_medium_article",
    name: "Medium Article",
    category: "article",
    template:
      "Hi {firstName} - I wrote an article on how AI is changing {industry}. Would you like me to send the link?",
    valueX: "Medium Article Link",
    expectedResponse: "permission",
  },
  {
    id: "opener_newsletter",
    name: "Weekly Newsletter",
    category: "newsletter",
    template:
      "Hey {firstName}! We put out a weekly newsletter with {industry} trends and AI tips. Want me to send you this week's edition?",
    valueX: "Newsletter Edition",
    expectedResponse: "permission",
  },
  {
    id: "opener_historical_fact",
    name: "Did You Know + Value",
    category: "custom",
    template:
      "Hey {firstName}, did you know {didYouKnowFact}? 🏠 Speaking of - I've got some interesting data on {address}. Best email?",
    valueX: "Property Data + Fun Fact",
    expectedResponse: "email",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COPILOT NEXT-STEP SUGGESTIONS
// ═══════════════════════════════════════════════════════════════════════════════

interface NextStepSuggestion {
  action: string;
  reason: string;
  priority: "high" | "medium" | "low";
  template?: string;
}

function getCopilotNextStep(lead: InitialMessageLead): NextStepSuggestion {
  const now = new Date();
  const lastAttempt = lead.lastAttemptAt ? new Date(lead.lastAttemptAt) : null;
  const hoursSinceLastAttempt = lastAttempt
    ? (now.getTime() - lastAttempt.getTime()) / (1000 * 60 * 60)
    : null;

  // No attempts yet - send initial message
  if (lead.attempts === 0) {
    return {
      action: "Send Initial Message",
      reason: "Lead has not been contacted yet. High priority for first touch.",
      priority: "high",
      template: OPENER_TEMPLATES[0].id,
    };
  }

  // 1 attempt, no response after 24h - follow up
  if (
    lead.attempts === 1 &&
    hoursSinceLastAttempt &&
    hoursSinceLastAttempt > 24
  ) {
    return {
      action: "Send Follow-Up",
      reason: "24+ hours since first message. Time for a gentle nudge.",
      priority: "high",
      template: "followup_24h",
    };
  }

  // 2-3 attempts, no response - try different channel
  if (lead.attempts >= 2 && lead.attempts <= 3) {
    if (lead.phone) {
      return {
        action: "Try Phone Call",
        reason:
          "Multiple SMS attempts without response. Voice contact may break through.",
        priority: "medium",
      };
    }
    return {
      action: "Send Pattern Interrupt",
      reason: "Standard messages not working. Try a creative approach.",
      priority: "medium",
      template: "opener_historical_fact",
    };
  }

  // 4+ attempts - escalate to CATHY or pause
  if (lead.attempts >= 4) {
    return {
      action: "Escalate to CATHY",
      reason: "Lead is cold. CATHY's humor-based approach may re-engage.",
      priority: "low",
    };
  }

  // Default
  return {
    action: "Review Lead",
    reason: "Analyze lead data and determine best approach.",
    priority: "medium",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════════

function generateMockLeads(count: number): InitialMessageLead[] {
  const industries = [
    "Real Estate",
    "Insurance",
    "Legal",
    "Healthcare",
    "Retail",
    "Manufacturing",
  ];
  const sources = ["USBizData", "PropertyList", "CSV Import", "Apollo"];
  const firstNames = [
    "John",
    "Sarah",
    "Mike",
    "Lisa",
    "David",
    "Jennifer",
    "Robert",
    "Maria",
  ];
  const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
  ];
  const cities = [
    "Brooklyn",
    "Queens",
    "Bronx",
    "Manhattan",
    "Newark",
    "Jersey City",
  ];

  return Array.from({ length: count }, (_, i) => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const attempts = Math.floor(Math.random() * 5);

    return {
      id: `lead-init-${i + 1}`,
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      phone: `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
      email:
        attempts > 2
          ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`
          : undefined,
      company: `${lastName} ${industries[Math.floor(Math.random() * industries.length)]}`,
      address: `${Math.floor(Math.random() * 9999) + 1} Main Street`,
      city: cities[Math.floor(Math.random() * cities.length)],
      state: "NY",
      source: sources[Math.floor(Math.random() * sources.length)],
      sicCode: `${6500 + Math.floor(Math.random() * 500)}`,
      industry: industries[Math.floor(Math.random() * industries.length)],
      attempts,
      lastAttemptAt:
        attempts > 0
          ? new Date(
              Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
            ).toISOString()
          : undefined,
      nextStepAt: new Date(
        Date.now() + Math.random() * 24 * 60 * 60 * 1000,
      ).toISOString(),
      nextStepAction: attempts === 0 ? "initial_sms" : "follow_up",
      messageStatus:
        attempts === 0 ? "pending" : Math.random() > 0.5 ? "sent" : "generated",
      score: Math.floor(Math.random() * 100),
      priority:
        Math.random() > 0.7 ? "high" : Math.random() > 0.4 ? "medium" : "low",
      createdAt: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEAD CARD WITH COPILOT ASSISTANCE
// ═══════════════════════════════════════════════════════════════════════════════

function InitialMessageLeadCard({
  lead,
  isSelected,
  onSelect,
  onGenerateMessage,
  onSendMessage,
  onViewDetails,
}: {
  lead: InitialMessageLead;
  isSelected: boolean;
  onSelect: () => void;
  onGenerateMessage: () => void;
  onSendMessage: () => void;
  onViewDetails: () => void;
}) {
  const nextStep = getCopilotNextStep(lead);

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
                lead.messageStatus === "pending" && "bg-gray-100",
                lead.messageStatus === "generated" &&
                  "bg-blue-100 text-blue-700",
                lead.messageStatus === "approved" &&
                  "bg-green-100 text-green-700",
                lead.messageStatus === "sent" &&
                  "bg-emerald-100 text-emerald-700",
              )}
            >
              {lead.messageStatus}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onViewDetails}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Lead
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">
                  Remove from Queue
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span className="truncate">{lead.phone || "No phone"}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span className="truncate">{lead.email || "Not captured"}</span>
          </div>
        </div>

        {/* Tracking Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3 py-2 px-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            <span>
              <strong>{lead.attempts}</strong> attempts
            </span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              Last:{" "}
              {lead.lastAttemptAt
                ? new Date(lead.lastAttemptAt).toLocaleDateString()
                : "Never"}
            </span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div>
            <Badge variant="secondary" className="text-xs">
              {lead.source}
            </Badge>
          </div>
        </div>

        {/* Copilot Next Step Suggestion */}
        <div
          className={cn(
            "p-3 rounded-lg border mb-3",
            nextStep.priority === "high" && "bg-orange-50 border-orange-200",
            nextStep.priority === "medium" && "bg-yellow-50 border-yellow-200",
            nextStep.priority === "low" && "bg-gray-50 border-gray-200",
          )}
        >
          <div className="flex items-start gap-2">
            <Sparkles
              className={cn(
                "h-4 w-4 mt-0.5",
                nextStep.priority === "high" && "text-orange-600",
                nextStep.priority === "medium" && "text-yellow-600",
                nextStep.priority === "low" && "text-gray-600",
              )}
            />
            <div className="flex-1">
              <p className="text-sm font-medium flex items-center gap-2">
                Next: {nextStep.action}
                <ChevronRight className="h-3 w-3" />
              </p>
              <p className="text-xs text-muted-foreground">{nextStep.reason}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {lead.messageStatus === "pending" ? (
            <Button size="sm" className="flex-1" onClick={onGenerateMessage}>
              <Wand2 className="h-4 w-4 mr-1" />
              Generate Message
            </Button>
          ) : lead.messageStatus === "generated" ||
            lead.messageStatus === "approved" ? (
            <Button
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={onSendMessage}
            >
              <Send className="h-4 w-4 mr-1" />
              Send SMS
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="flex-1" disabled>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Sent
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onViewDetails}>
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function InitialMessageWorkspace() {
  const { pushToSMSCampaign, pushToPhoneCenter } = useGlobalActions();

  // State
  const [leads, setLeads] = useState<InitialMessageLead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  // Dialogs
  const [selectedLead, setSelectedLead] = useState<InitialMessageLead | null>(
    null,
  );
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(
    OPENER_TEMPLATES[0].id,
  );
  const [customMessage, setCustomMessage] = useState("");

  // Load leads
  useEffect(() => {
    const loadLeads = async () => {
      setIsLoading(true);
      try {
        // TODO: Replace with real API
        const mockLeads = generateMockLeads(50);
        setLeads(mockLeads);
      } catch (error) {
        console.error("Failed to load leads:", error);
        toast.error("Failed to load leads");
      } finally {
        setIsLoading(false);
      }
    };
    loadLeads();
  }, []);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !lead.name.toLowerCase().includes(query) &&
          !lead.company?.toLowerCase().includes(query) &&
          !lead.phone?.includes(query)
        ) {
          return false;
        }
      }
      // Status filter
      if (filterStatus !== "all" && lead.messageStatus !== filterStatus) {
        return false;
      }
      // Priority filter
      if (filterPriority !== "all" && lead.priority !== filterPriority) {
        return false;
      }
      return true;
    });
  }, [leads, searchQuery, filterStatus, filterPriority]);

  // Stats
  const stats = useMemo(
    () => ({
      total: leads.length,
      pending: leads.filter((l) => l.messageStatus === "pending").length,
      generated: leads.filter((l) => l.messageStatus === "generated").length,
      sent: leads.filter((l) => l.messageStatus === "sent").length,
      highPriority: leads.filter((l) => l.priority === "high").length,
    }),
    [leads],
  );

  // Handlers
  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  };

  const handleGenerateMessage = (lead: InitialMessageLead) => {
    setSelectedLead(lead);
    const template = OPENER_TEMPLATES.find((t) => t.id === selectedTemplate);
    if (template) {
      const message = template.template
        .replace(/{firstName}/g, lead.firstName || lead.name.split(" ")[0])
        .replace(/{worker}/g, "Gianna")
        .replace(/{address}/g, lead.address || "your property")
        .replace(/{industry}/g, lead.industry || "your industry")
        .replace(/{didYouKnowFact}/g, "Brooklyn had 14 breweries in the 1800s");
      setCustomMessage(message);
    }
    setShowMessageDialog(true);
  };

  const handleSendMessage = async (lead: InitialMessageLead) => {
    if (!lead.phone) {
      toast.error("No phone number available");
      return;
    }

    // Update lead status
    setLeads((prev) =>
      prev.map((l) =>
        l.id === lead.id
          ? {
              ...l,
              messageStatus: "sent" as const,
              attempts: l.attempts + 1,
              lastAttemptAt: new Date().toISOString(),
            }
          : l,
      ),
    );

    toast.success(`Message sent to ${lead.name}`, {
      description: "Via SignalHouse",
    });
  };

  const handleBulkGenerate = () => {
    const pendingLeads = leads.filter(
      (l) => selectedLeads.has(l.id) && l.messageStatus === "pending",
    );

    setLeads((prev) =>
      prev.map((l) =>
        selectedLeads.has(l.id) && l.messageStatus === "pending"
          ? { ...l, messageStatus: "generated" as const }
          : l,
      ),
    );

    toast.success(`Generated ${pendingLeads.length} messages`, {
      description: "Ready for review and sending",
    });
  };

  const handleBulkSend = async () => {
    const readyLeads = leads.filter(
      (l) =>
        selectedLeads.has(l.id) &&
        (l.messageStatus === "generated" || l.messageStatus === "approved") &&
        l.phone,
    );

    setLeads((prev) =>
      prev.map((l) =>
        selectedLeads.has(l.id) &&
        (l.messageStatus === "generated" || l.messageStatus === "approved")
          ? {
              ...l,
              messageStatus: "sent" as const,
              attempts: l.attempts + 1,
              lastAttemptAt: new Date().toISOString(),
            }
          : l,
      ),
    );

    toast.success(`Sent ${readyLeads.length} messages`, {
      description: "Via SignalHouse bulk send",
    });
    setSelectedLeads(new Set());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">
            Loading Initial Message Queue...
          </p>
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
              <MessageSquare className="h-6 w-6 text-blue-500" />
              Initial Message Workspace
              <Badge variant="outline" className="ml-2">
                GIANNA
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Stage and send initial outreach messages • Copilot-assisted next
              steps
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4">
          <Badge variant="outline" className="bg-gray-50">
            📋 Total: {stats.total}
          </Badge>
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
            ⏳ Pending: {stats.pending}
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            ✨ Generated: {stats.generated}
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700">
            ✅ Sent: {stats.sent}
          </Badge>
          <Badge variant="outline" className="bg-orange-50 text-orange-700">
            🔥 High Priority: {stats.highPriority}
          </Badge>
        </div>

        {/* Filters & Actions */}
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

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="generated">Generated</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1" />

          {/* Bulk Actions */}
          {selectedLeads.size > 0 && (
            <div className="flex items-center gap-2">
              <Badge>{selectedLeads.size} selected</Badge>
              <Button size="sm" variant="outline" onClick={handleBulkGenerate}>
                <Wand2 className="h-4 w-4 mr-1" />
                Generate All
              </Button>
              <Button size="sm" onClick={handleBulkSend}>
                <Send className="h-4 w-4 mr-1" />
                Send All
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => (
            <InitialMessageLeadCard
              key={lead.id}
              lead={lead}
              isSelected={selectedLeads.has(lead.id)}
              onSelect={() => toggleLeadSelection(lead.id)}
              onGenerateMessage={() => handleGenerateMessage(lead)}
              onSendMessage={() => handleSendMessage(lead)}
              onViewDetails={() => {
                setSelectedLead(lead);
                setShowDetailsDialog(true);
              }}
            />
          ))}
        </div>
      </div>

      {/* Message Generation Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Generate Initial Message
            </DialogTitle>
            <DialogDescription>
              {selectedLead?.name} • {selectedLead?.company}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Message Template</Label>
              <Select
                value={selectedTemplate}
                onValueChange={setSelectedTemplate}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPENER_TEMPLATES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} → {t.valueX}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Generated Message</Label>
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={4}
              />
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-1">
                Expected Response Type:
              </p>
              <Badge>
                {OPENER_TEMPLATES.find((t) => t.id === selectedTemplate)
                  ?.expectedResponse === "email"
                  ? "📧 Email Capture"
                  : "✅ Permission to Send"}
              </Badge>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMessageDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedLead) {
                  setLeads((prev) =>
                    prev.map((l) =>
                      l.id === selectedLead.id
                        ? {
                            ...l,
                            messageStatus: "generated" as const,
                            generatedMessage: customMessage,
                          }
                        : l,
                    ),
                  );
                  toast.success("Message generated and saved");
                  setShowMessageDialog(false);
                }
              }}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Save Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lead Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedLead?.name}</DialogTitle>
            <DialogDescription>{selectedLead?.company}</DialogDescription>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-4 py-4">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">
                    {selectedLead.phone || "Not available"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">
                    {selectedLead.email || "Not captured"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Address</Label>
                  <p className="font-medium">
                    {selectedLead.address}, {selectedLead.city}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Source</Label>
                  <p className="font-medium">{selectedLead.source}</p>
                </div>
              </div>

              <Separator />

              {/* Tracking */}
              <div>
                <h4 className="font-medium mb-2">Activity Tracking</h4>
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">
                        {selectedLead.attempts}
                      </p>
                      <p className="text-sm text-muted-foreground">Attempts</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm font-medium">
                        {selectedLead.lastAttemptAt
                          ? new Date(
                              selectedLead.lastAttemptAt,
                            ).toLocaleDateString()
                          : "Never"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Last Attempt
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Badge
                        className={cn(
                          selectedLead.priority === "high" && "bg-orange-500",
                          selectedLead.priority === "medium" && "bg-yellow-500",
                          selectedLead.priority === "low" && "bg-gray-500",
                        )}
                      >
                        {selectedLead.priority}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        Priority
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Separator />

              {/* Copilot Suggestion */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  Copilot Recommendation
                </h4>
                {(() => {
                  const nextStep = getCopilotNextStep(selectedLead);
                  return (
                    <Card
                      className={cn(
                        "border-2",
                        nextStep.priority === "high" &&
                          "border-orange-300 bg-orange-50",
                        nextStep.priority === "medium" &&
                          "border-yellow-300 bg-yellow-50",
                        nextStep.priority === "low" &&
                          "border-gray-300 bg-gray-50",
                      )}
                    >
                      <CardContent className="p-4">
                        <p className="font-medium">{nextStep.action}</p>
                        <p className="text-sm text-muted-foreground">
                          {nextStep.reason}
                        </p>
                        <Button size="sm" className="mt-3">
                          Execute <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDetailsDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
