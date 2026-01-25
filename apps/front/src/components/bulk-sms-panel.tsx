"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Send,
  Users,
  Zap,
  X,
  Eye,
  AlertTriangle,
  LayoutGrid,
  List,
  CalendarDays,
  Tag,
  Save,
  Webhook,
  Flame,
  Phone,
  Bell,
  RotateCcw,
  Bookmark,
  ExternalLink,
  Copy,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface BulkSMSPanelProps {
  teamId?: string;
  onClose?: () => void;
  onSent?: (count: number) => void;
}

interface LeadPreview {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  company?: string;
  email?: string;
  stage?: string;
  lastContact?: string;
}

interface SendProgress {
  total: number;
  sent: number;
  failed: number;
  status: "idle" | "sending" | "complete" | "error";
}

interface SavedTemplate {
  id: string;
  name: string;
  label: string;
  message: string;
  createdAt: string;
}

// Template variables available
const TEMPLATE_VARS = [
  { key: "{firstName}", desc: "Lead first name", example: "John" },
  { key: "{lastName}", desc: "Lead last name", example: "Smith" },
  { key: "{company}", desc: "Company name", example: "Acme Inc" },
  { key: "{phone}", desc: "Phone number", example: "+1234567890" },
  { key: "{industry}", desc: "Industry/Sector", example: "Technology" },
  { key: "{city}", desc: "City", example: "Austin" },
  { key: "{state}", desc: "State", example: "TX" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// NEXTIER MODULES - Template categories for messaging
// ═══════════════════════════════════════════════════════════════════════════════
const NEXTIER_MODULES = [
  { id: "ai-consulting", name: "AI Consulting", icon: "🤖", color: "bg-purple-500", desc: "AI strategy & implementation" },
  { id: "platform-white-label", name: "Platform White Label", icon: "🏷️", color: "bg-blue-500", desc: "Rebrandable platform solutions" },
  { id: "business-exits", name: "Business Exits", icon: "🚪", color: "bg-green-500", desc: "M&A and exit strategies" },
  { id: "capital-connect", name: "Capital Connect", icon: "💰", color: "bg-amber-500", desc: "Funding & investment" },
  { id: "foundational-dataverse", name: "Foundational Dataverse", icon: "📊", color: "bg-cyan-500", desc: "Data infrastructure" },
  { id: "terminals", name: "Terminals", icon: "🖥️", color: "bg-indigo-500", desc: "Trading & operations" },
  { id: "blueprints", name: "Blueprints", icon: "📐", color: "bg-orange-500", desc: "System architecture" },
  { id: "system-mapping", name: "System Mapping", icon: "🗺️", color: "bg-teal-500", desc: "Process documentation" },
];

// SMS stage types for sequences
const SMS_STAGES = [
  { id: "initial", name: "Initial", desc: "First touch", icon: "📤", color: "bg-blue-500" },
  { id: "reminder_1", name: "Reminder #1", desc: "Gentle follow-up", icon: "🔔", color: "bg-yellow-500" },
  { id: "reminder_2", name: "Reminder #2", desc: "Second reminder", icon: "🔔", color: "bg-orange-500" },
  { id: "nudge", name: "Nudge", desc: "Re-engage cold leads", icon: "👋", color: "bg-pink-500" },
  { id: "nurture", name: "Nurture", desc: "Content/value add", icon: "🌱", color: "bg-green-500" },
  { id: "follow_up", name: "Follow Up", desc: "Post-response", icon: "🔄", color: "bg-purple-500" },
  { id: "drip", name: "Drip", desc: "Long-term sequence", icon: "💧", color: "bg-cyan-500" },
  { id: "hot_lead", name: "Hot Lead", desc: "High-intent push", icon: "🔥", color: "bg-red-500" },
];

// Skeleton templates by module (for ideation)
const MODULE_SKELETONS: Record<string, Record<string, string>> = {
  "ai-consulting": {
    initial: "Hi {firstName}, I'm reaching out about AI consulting services for {company}. We help businesses implement AI solutions that drive real ROI. Are you exploring AI for your operations?",
    nudge: "Hey {firstName}, just circling back on AI consulting. Many in {industry} are seeing 40%+ efficiency gains. Worth a quick call?",
    nurture: "Hi {firstName}, thought you'd find this useful: our latest case study on AI implementation in {industry}. Reply 'INFO' if you'd like the full report.",
  },
  "platform-white-label": {
    initial: "Hi {firstName}, I noticed {company} might benefit from a white-label platform solution. We help businesses launch their own branded tech products. Interested?",
    nudge: "Hey {firstName}, following up on white-label platforms. Quick question - are you currently reselling any tech solutions?",
    nurture: "Hi {firstName}, our white-label partners are seeing 3x revenue growth. Reply 'DEMO' if you'd like to see how it works.",
  },
  "business-exits": {
    initial: "Hi {firstName}, I work with business owners planning their exit strategy. Have you thought about your 5-year plan for {company}?",
    nudge: "Hey {firstName}, just checking in on your exit planning. The market is strong right now for {industry} acquisitions.",
    nurture: "Hi {firstName}, we just helped a {industry} owner exit at 8x EBITDA. Reply 'LEARN' if you'd like to hear how.",
  },
  "capital-connect": {
    initial: "Hi {firstName}, I help businesses like {company} connect with the right capital partners. Are you exploring funding options?",
    nudge: "Hey {firstName}, circling back on capital solutions. Many {industry} companies are securing growth capital right now.",
    nurture: "Hi {firstName}, we just closed a $5M round for a {industry} company. Reply 'FUNDING' to learn about your options.",
  },
  "foundational-dataverse": {
    initial: "Hi {firstName}, I noticed {company} might benefit from better data infrastructure. We help businesses build scalable data foundations. Interested?",
    nudge: "Hey {firstName}, following up on data infrastructure. Is {company} dealing with data silos or scaling challenges?",
    nurture: "Hi {firstName}, 67% of {industry} companies struggle with data integration. We can fix that. Reply 'DATA' for a free assessment.",
  },
  "terminals": {
    initial: "Hi {firstName}, I work with {industry} companies on trading terminals and operations platforms. Is {company} looking to upgrade your systems?",
    nudge: "Hey {firstName}, just checking in on your trading/operations infrastructure. Any pain points with current systems?",
    nurture: "Hi {firstName}, our terminals process 10M+ transactions daily. Reply 'TERMINAL' if you'd like a demo.",
  },
  "blueprints": {
    initial: "Hi {firstName}, I help businesses like {company} architect their systems for scale. Is your tech stack ready for growth?",
    nudge: "Hey {firstName}, following up on system architecture. Many {industry} companies hit scaling walls - we can help prevent that.",
    nurture: "Hi {firstName}, we just blueprinted a system that reduced costs 40% for a {industry} company. Reply 'BLUEPRINT' for details.",
  },
  "system-mapping": {
    initial: "Hi {firstName}, I noticed {company} might benefit from process documentation and system mapping. Do you have clear SOPs for your operations?",
    nudge: "Hey {firstName}, circling back on system mapping. Is {company} struggling with process consistency or onboarding?",
    nurture: "Hi {firstName}, companies with mapped systems grow 2x faster. Reply 'MAP' for a free process audit.",
  },
};

// Message labels / types
const MESSAGE_LABELS = [
  { value: "initial", label: "Initial SMS", icon: MessageSquare, color: "bg-blue-500" },
  { value: "reminder_1", label: "Reminder #1", icon: Bell, color: "bg-yellow-500" },
  { value: "reminder_2", label: "Reminder #2", icon: Bell, color: "bg-orange-500" },
  { value: "reminder_3", label: "Reminder #3", icon: Bell, color: "bg-red-500" },
  { value: "follow_up", label: "Follow Up", icon: RotateCcw, color: "bg-purple-500" },
  { value: "hot_lead", label: "Hot Lead Push", icon: Flame, color: "bg-red-600" },
  { value: "meeting_request", label: "Meeting Request", icon: CalendarDays, color: "bg-green-500" },
  { value: "custom", label: "Custom", icon: Tag, color: "bg-gray-500" },
];

// Lead sources
const LEAD_SOURCES = [
  { value: "responded", label: "Responded Leads", badge: "GREEN", badgeColor: "bg-green-500" },
  { value: "gold", label: "Email + Mobile Captured", badge: "GOLD", badgeColor: "bg-yellow-500" },
  { value: "hot", label: "Hot Leads", badge: "HOT", badgeColor: "bg-red-500" },
  { value: "warm", label: "Warm Leads", badge: "WARM", badgeColor: "bg-orange-500" },
  { value: "cold", label: "Cold Leads", badge: "COLD", badgeColor: "bg-blue-500" },
  { value: "all", label: "All Active Leads", badge: "ALL", badgeColor: "bg-gray-500" },
];

export function BulkSMSPanel({ teamId, onClose, onSent }: BulkSMSPanelProps) {
  const [message, setMessage] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("responded");
  const [selectedLabel, setSelectedLabel] = useState<string>("initial");
  const [selectedModule, setSelectedModule] = useState<string>("");
  const [selectedStage, setSelectedStage] = useState<string>("initial");
  const [showModuleSelector, setShowModuleSelector] = useState(false);
  const [leadCount, setLeadCount] = useState(0);
  const [maxLeads, setMaxLeads] = useState(100);
  const [leads, setLeads] = useState<LeadPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [previewLead, setPreviewLead] = useState<LeadPreview | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  const [showCalendar, setShowCalendar] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pushToHotQueue, setPushToHotQueue] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [showWebhookConfig, setShowWebhookConfig] = useState(false);
  const [progress, setProgress] = useState<SendProgress>({
    total: 0,
    sent: 0,
    failed: 0,
    status: "idle",
  });

  // Load saved templates
  useEffect(() => {
    const saved = localStorage.getItem(`sms_templates_${teamId}`);
    if (saved) {
      setSavedTemplates(JSON.parse(saved));
    }
  }, [teamId]);

  // Fetch lead count when source changes
  useEffect(() => {
    fetchLeadCount();
  }, [selectedSource, maxLeads]);

  const fetchLeadCount = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/leads/count?source=${selectedSource}&limit=${maxLeads}&teamId=${teamId || ""}`
      );
      const data = await response.json();
      setLeadCount(data.count || 0);
      setLeads(data.preview || []);
      if (data.preview?.length > 0) {
        setPreviewLead(data.preview[0]);
      }
    } catch (error) {
      console.error("Failed to fetch lead count:", error);
      // Mock data for development
      const mockLeads: LeadPreview[] = [
        { id: "1", firstName: "John", lastName: "Smith", phone: "+15551234567", company: "Acme Inc", stage: "warm" },
        { id: "2", firstName: "Sarah", lastName: "Johnson", phone: "+15559876543", company: "Tech Corp", stage: "hot" },
        { id: "3", firstName: "Mike", lastName: "Williams", phone: "+15551112222", company: "StartUp LLC", stage: "cold" },
      ];
      setLeads(mockLeads);
      setLeadCount(mockLeads.length);
      setPreviewLead(mockLeads[0]);
    } finally {
      setLoading(false);
    }
  };

  // Render message with variable substitution for preview
  const renderPreview = (lead: LeadPreview | null) => {
    if (!lead || !message) return message || "Enter your message above...";

    return message
      .replace(/{firstName}/gi, lead.firstName || "")
      .replace(/{lastName}/gi, lead.lastName || "")
      .replace(/{company}/gi, lead.company || "")
      .replace(/{phone}/gi, lead.phone || "")
      .trim();
  };

  // Insert variable at cursor
  const insertVariable = (varKey: string) => {
    setMessage((prev) => prev + varKey);
  };

  // Character and segment calculation
  const charCount = message.length;
  const segment1Remaining = Math.max(0, 160 - charCount);
  const segmentCount = charCount === 0 ? 0 : Math.ceil(charCount / 160);

  // Save template
  const handleSaveTemplate = () => {
    if (!templateName.trim() || !message.trim()) {
      toast.error("Please enter template name and message");
      return;
    }

    const newTemplate: SavedTemplate = {
      id: `tpl_${Date.now()}`,
      name: templateName,
      label: selectedLabel,
      message: message,
      createdAt: new Date().toISOString(),
    };

    const updated = [...savedTemplates, newTemplate];
    setSavedTemplates(updated);
    localStorage.setItem(`sms_templates_${teamId}`, JSON.stringify(updated));
    setShowSaveDialog(false);
    setTemplateName("");
    toast.success("Template saved!");
  };

  // Load template
  const loadTemplate = (template: SavedTemplate) => {
    setMessage(template.message);
    setSelectedLabel(template.label);
    toast.success(`Loaded: ${template.name}`);
  };

  // Delete template
  const deleteTemplate = (id: string) => {
    const updated = savedTemplates.filter((t) => t.id !== id);
    setSavedTemplates(updated);
    localStorage.setItem(`sms_templates_${teamId}`, JSON.stringify(updated));
    toast.success("Template deleted");
  };

  // Handle send confirmation
  const handleSendClick = () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }
    if (leadCount === 0) {
      toast.error("No leads selected");
      return;
    }
    setShowConfirm(true);
  };

  // Execute bulk send
  const executeBulkSend = async () => {
    setShowConfirm(false);
    setProgress({ total: leadCount, sent: 0, failed: 0, status: "sending" });

    try {
      const payload: Record<string, unknown> = {
        message,
        source: selectedSource,
        label: selectedLabel,
        limit: maxLeads,
        teamId,
        pushToHotQueue,
      };

      // Add scheduling if set
      if (scheduledDate) {
        const [hours, minutes] = scheduledTime.split(":");
        const scheduled = new Date(scheduledDate);
        scheduled.setHours(parseInt(hours), parseInt(minutes));
        payload.scheduledAt = scheduled.toISOString();
      }

      // Add webhook if configured
      if (webhookUrl) {
        payload.webhookUrl = webhookUrl;
      }

      const response = await fetch("/api/sms/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        setProgress({
          total: result.total || leadCount,
          sent: result.sent || result.queued || 0,
          failed: result.failed || 0,
          status: "complete",
        });

        if (scheduledDate) {
          toast.success(`Scheduled ${result.queued || leadCount} messages for ${format(scheduledDate, "PPP")} at ${scheduledTime}`);
        } else {
          toast.success(`Sent ${result.sent} messages successfully!`);
        }

        // Push to hot lead queue if enabled
        if (pushToHotQueue && result.hotLeadsCreated) {
          toast.success(`${result.hotLeadsCreated} leads pushed to Hot Queue!`);
        }

        onSent?.(result.sent || result.queued || 0);
      } else {
        setProgress((prev) => ({ ...prev, status: "error" }));
        toast.error(result.error || "Bulk send failed");
      }
    } catch (error) {
      setProgress((prev) => ({ ...prev, status: "error" }));
      toast.error("Failed to send messages");
    }
  };

  const labelInfo = MESSAGE_LABELS.find((l) => l.value === selectedLabel);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900">
            <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Bulk SMS Blast</h2>
            <p className="text-sm text-muted-foreground">
              Send to up to 2,000 leads at once
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "card" ? "default" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode("card")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Source & Label Selection */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Lead Source</Label>
          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger>
              <SelectValue placeholder="Select lead source" />
            </SelectTrigger>
            <SelectContent>
              {LEAD_SOURCES.map((source) => (
                <SelectItem key={source.value} value={source.value}>
                  <div className="flex items-center gap-2">
                    <Badge className={source.badgeColor}>{source.badge}</Badge>
                    {source.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Message Label</Label>
          <Select value={selectedLabel} onValueChange={setSelectedLabel}>
            <SelectTrigger>
              <SelectValue placeholder="Select label" />
            </SelectTrigger>
            <SelectContent>
              {MESSAGE_LABELS.map((label) => {
                const Icon = label.icon;
                return (
                  <SelectItem key={label.value} value={label.value}>
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded ${label.color}`}>
                        <Icon className="h-3 w-3 text-white" />
                      </div>
                      {label.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Max Recipients</Label>
          <Select
            value={maxLeads.toString()}
            onValueChange={(v) => setMaxLeads(parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 (Test)</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="250">250</SelectItem>
              <SelectItem value="500">500</SelectItem>
              <SelectItem value="1000">1,000</SelectItem>
              <SelectItem value="2000">2,000 (Max)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lead Count & View */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {loading ? "Loading..." : `${leadCount.toLocaleString()} leads`}
              </p>
              <p className="text-sm text-muted-foreground">
                Will receive this message
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {labelInfo && (
              <Badge className={labelInfo.color}>
                {labelInfo.label}
              </Badge>
            )}
            {leadCount > 0 && (
              <Badge variant="outline" className="text-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Ready
              </Badge>
            )}
          </div>
        </div>

        {/* Leads Preview - List or Card View */}
        {leads.length > 0 && (
          <div className={`max-h-48 overflow-y-auto rounded-lg border ${viewMode === "card" ? "p-2" : ""}`}>
            {viewMode === "list" ? (
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">Name</th>
                    <th className="text-left p-2 font-medium">Phone</th>
                    <th className="text-left p-2 font-medium">Company</th>
                    <th className="text-left p-2 font-medium">Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className={`border-t hover:bg-muted/50 cursor-pointer ${previewLead?.id === lead.id ? "bg-blue-50 dark:bg-blue-950" : ""}`}
                      onClick={() => setPreviewLead(lead)}
                    >
                      <td className="p-2">{lead.firstName} {lead.lastName}</td>
                      <td className="p-2 font-mono text-xs">{lead.phone}</td>
                      <td className="p-2">{lead.company || "-"}</td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-xs">
                          {lead.stage || "unknown"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${previewLead?.id === lead.id ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "hover:border-muted-foreground"}`}
                    onClick={() => setPreviewLead(lead)}
                  >
                    <p className="font-medium truncate">{lead.firstName} {lead.lastName}</p>
                    <p className="text-xs text-muted-foreground truncate">{lead.company || "No company"}</p>
                    <p className="text-xs font-mono mt-1">{lead.phone}</p>
                    <Badge variant="outline" className="text-xs mt-2">
                      {lead.stage || "unknown"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* MODULE & STAGE SELECTOR - For skeleton template ideation */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Content Library</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowModuleSelector(!showModuleSelector)}
            className="text-xs"
          >
            {showModuleSelector ? "Hide" : "Show Templates"}
          </Button>
        </div>

        {showModuleSelector && (
          <>
            {/* Module Selection */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Select Module</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {NEXTIER_MODULES.map((mod) => (
                  <Button
                    key={mod.id}
                    variant={selectedModule === mod.id ? "default" : "outline"}
                    size="sm"
                    className={`justify-start gap-2 h-auto py-2 text-left ${selectedModule === mod.id ? mod.color : ""}`}
                    onClick={() => setSelectedModule(mod.id)}
                  >
                    <span className="text-lg">{mod.icon}</span>
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-medium">{mod.name}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* SMS Stage Selection */}
            {selectedModule && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Select SMS Stage</Label>
                <div className="flex flex-wrap gap-2">
                  {SMS_STAGES.map((stage) => (
                    <Button
                      key={stage.id}
                      variant={selectedStage === stage.id ? "default" : "outline"}
                      size="sm"
                      className={`gap-2 ${selectedStage === stage.id ? stage.color : ""}`}
                      onClick={() => setSelectedStage(stage.id)}
                    >
                      <span>{stage.icon}</span>
                      <span className="text-xs">{stage.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Load Skeleton Template */}
            {selectedModule && selectedStage && MODULE_SKELETONS[selectedModule]?.[selectedStage] && (
              <div className="space-y-2 p-3 bg-background rounded-lg border">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Skeleton Template</Label>
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-2 bg-purple-600 hover:bg-purple-700"
                    onClick={() => {
                      setMessage(MODULE_SKELETONS[selectedModule]?.[selectedStage] || "");
                      toast.success("Template loaded - customize it for your campaign!");
                    }}
                  >
                    <Copy className="h-3 w-3" />
                    Load & Customize
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground italic whitespace-pre-wrap">
                  {MODULE_SKELETONS[selectedModule]?.[selectedStage]}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Saved Templates */}
      {savedTemplates.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Bookmark className="h-4 w-4" />
              Saved Templates
            </Label>
          </div>
          <div className="flex gap-2 flex-wrap">
            {savedTemplates.map((tpl) => (
              <Badge
                key={tpl.id}
                variant="outline"
                className="cursor-pointer hover:bg-muted group"
              >
                <span onClick={() => loadTemplate(tpl)}>{tpl.name}</span>
                <X
                  className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTemplate(tpl.id);
                  }}
                />
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Message Composer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Message</Label>
          <div className="flex gap-1">
            {TEMPLATE_VARS.map((v) => (
              <Button
                key={v.key}
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => insertVariable(v.key)}
                title={`${v.desc} (e.g., ${v.example})`}
              >
                {v.key}
              </Button>
            ))}
          </div>
        </div>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Hey {firstName}, just wanted to reach out about..."
          className="min-h-[120px] font-mono text-sm"
          maxLength={480}
        />
        {/* Character Counter with Segment Breakdown */}
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-3">
            <span className={charCount > 160 ? "text-amber-500" : "text-muted-foreground"}>
              {charCount}/480 characters
            </span>
            <span className="text-muted-foreground">•</span>
            <span className={segmentCount > 1 ? "text-amber-500 font-medium" : "text-muted-foreground"}>
              {segmentCount} segment{segmentCount !== 1 ? "s" : ""}
            </span>
            {charCount > 0 && charCount <= 160 && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-green-600">{segment1Remaining} chars left in segment 1</span>
              </>
            )}
          </div>
          {segmentCount > 1 && (
            <span className="text-amber-500 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Multiple segments = higher cost
            </span>
          )}
        </div>

        {/* 160 Character Visual Guide */}
        {charCount > 0 && (
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${charCount <= 160 ? "bg-green-500" : charCount <= 320 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${Math.min(100, (charCount / 480) * 100)}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>0</span>
              <span className={charCount > 160 ? "text-amber-500" : ""}>160</span>
              <span className={charCount > 320 ? "text-amber-500" : ""}>320</span>
              <span>480</span>
            </div>
          </div>
        )}
      </div>

      {/* Live Preview */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <Label>Live Preview</Label>
          {leads.length > 1 && (
            <Select
              value={previewLead?.id || ""}
              onValueChange={(id) =>
                setPreviewLead(leads.find((l) => l.id === id) || null)
              }
            >
              <SelectTrigger className="h-7 w-[180px]">
                <SelectValue placeholder="Select lead" />
              </SelectTrigger>
              <SelectContent>
                {leads.slice(0, 10).map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.firstName} {lead.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border-l-4 border-green-500">
          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                {previewLead
                  ? `To: ${previewLead.firstName} ${previewLead.lastName}`
                  : "To: [Lead Name]"}
              </p>
              <p className="mt-1 text-sm text-green-700 dark:text-green-300 whitespace-pre-wrap">
                {renderPreview(previewLead)}
              </p>
              <p className="mt-2 text-xs text-green-600">
                {renderPreview(previewLead).length} characters
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduling & Actions */}
      <div className="flex flex-wrap gap-2">
        {/* Schedule Button */}
        <Popover open={showCalendar} onOpenChange={setShowCalendar}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              {scheduledDate ? format(scheduledDate, "PPP") : "Schedule"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 border-b">
              <Label>Send Time</Label>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="mt-1"
              />
            </div>
            <Calendar
              mode="single"
              selected={scheduledDate}
              onSelect={(date) => {
                setScheduledDate(date);
                if (date) setShowCalendar(false);
              }}
              disabled={(date) => date < new Date()}
            />
            {scheduledDate && (
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setScheduledDate(undefined);
                    setShowCalendar(false);
                  }}
                >
                  Clear Schedule
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Save Template */}
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowSaveDialog(true)}>
          <Save className="h-4 w-4" />
          Save Template
        </Button>

        {/* Hot Lead Queue Toggle */}
        <Button
          variant={pushToHotQueue ? "default" : "outline"}
          size="sm"
          className={`gap-2 ${pushToHotQueue ? "bg-red-500 hover:bg-red-600" : ""}`}
          onClick={() => setPushToHotQueue(!pushToHotQueue)}
        >
          <Flame className="h-4 w-4" />
          Push to Hot Queue
        </Button>

        {/* Webhook Config */}
        <Button
          variant={webhookUrl ? "default" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => setShowWebhookConfig(true)}
        >
          <Webhook className="h-4 w-4" />
          {webhookUrl ? "Webhook Set" : "Add Webhook"}
        </Button>
      </div>

      {/* Progress Bar (when sending) */}
      {progress.status !== "idle" && (
        <div className="space-y-2 p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {progress.status === "sending" && "Sending..."}
              {progress.status === "complete" && "Complete!"}
              {progress.status === "error" && "Error occurred"}
            </span>
            <span className="text-sm text-muted-foreground">
              {progress.sent}/{progress.total}
            </span>
          </div>
          <Progress
            value={(progress.sent / progress.total) * 100}
            className="h-2"
          />
          <div className="flex gap-4 text-xs">
            <span className="text-green-600">
              <CheckCircle2 className="h-3 w-3 inline mr-1" />
              {progress.sent} sent
            </span>
            {progress.failed > 0 && (
              <span className="text-red-600">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                {progress.failed} failed
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSendClick}
          disabled={!message.trim() || leadCount === 0 || progress.status === "sending"}
          className="gap-2"
        >
          {progress.status === "sending" ? (
            <>
              <Clock className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : scheduledDate ? (
            <>
              <CalendarDays className="h-4 w-4" />
              Schedule for {leadCount.toLocaleString()} Leads
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send to {leadCount.toLocaleString()} Leads
            </>
          )}
        </Button>
      </div>

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Save this message for quick reuse later
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Initial Outreach, Follow-up #1"
              />
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Message Preview:</p>
              <p className="text-sm whitespace-pre-wrap">{message || "No message"}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Webhook Config Dialog */}
      <Dialog open={showWebhookConfig} onOpenChange={setShowWebhookConfig}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Configure Webhook
            </DialogTitle>
            <DialogDescription>
              Push responses to your CRM or Hot Lead Queue
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-crm.com/api/webhook"
              />
              <p className="text-xs text-muted-foreground">
                We'll POST lead data + response to this URL when replies come in
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <p className="text-xs font-medium">Webhook Payload Example:</p>
              <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
{`{
  "leadId": "lead_123",
  "firstName": "John",
  "phone": "+15551234567",
  "response": "Yes, interested!",
  "timestamp": "2024-01-15T10:30:00Z"
}`}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWebhookUrl("")}>
              Clear
            </Button>
            <Button onClick={() => setShowWebhookConfig(false)}>
              Save Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Bulk SMS
            </DialogTitle>
            <DialogDescription>
              {scheduledDate
                ? `You are scheduling SMS for ${format(scheduledDate, "PPP")} at ${scheduledTime}`
                : `You are about to send SMS to ${leadCount.toLocaleString()} leads.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Message Preview:</p>
                {labelInfo && (
                  <Badge className={labelInfo.color}>{labelInfo.label}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {renderPreview(previewLead)}
              </p>
            </div>

            <div className="flex items-center gap-4 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span>{leadCount.toLocaleString()} recipients</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-green-500" />
                <span>{segmentCount} segment(s)</span>
              </div>
              {pushToHotQueue && (
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-red-500" />
                  <span>Hot Queue enabled</span>
                </div>
              )}
              {webhookUrl && (
                <div className="flex items-center gap-2">
                  <Webhook className="h-4 w-4 text-purple-500" />
                  <span>Webhook configured</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>SignalHouse Limit:</strong> 2,000 SMS/day. This action
                cannot be undone.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={executeBulkSend}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Zap className="h-4 w-4" />
              {scheduledDate ? "Confirm & Schedule" : "Confirm & Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
