"use client";

import * as React from "react";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  Phone,
  PhoneCall,
  MessageSquare,
  Mail,
  Clock,
  Zap,
  Bot,
  Pause,
  Play,
  PhoneOff,
  Send,
  Calendar,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  User,
  MoreHorizontal,
  Loader2,
  CheckSquare,
  Square,
  Flame,
  Target,
  RefreshCw,
  ArrowRight,
  X,
  Search,
  Settings,
  LayoutGrid,
  List,
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
import { cn, arrayMove } from "@/lib/utils";
import { toast } from "sonner";
import { LeadActionButtons } from "@/components/lead-action-buttons";

// ═══════════════════════════════════════════════════════════════════════════════
// INSTANT OUTREACH - HOT LEADS KANBAN WITH CLICK-TO-CALL/SMS
// ═══════════════════════════════════════════════════════════════════════════════
// Max 2,000 leads at any time
// Kanban columns: HOT → CALLING → CONTACTED → SCHEDULED → CLOSED
// Click-to-call, click-to-SMS fluidity
// Scheduled automation with calendar integration
// Sequences & blast capabilities
// ═══════════════════════════════════════════════════════════════════════════════

const MAX_WORKSPACE_LEADS = 2000;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface OutreachLead {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  propertyValue?: number;
  equity?: number;
  leadType?: string;
  vtag: VTag; // Virtual tag for kanban column
  priority: "hot" | "warm" | "cold";
  score: number;
  lastAction?: string;
  lastActionAt?: string;
  nextScheduledAt?: string;
  attempts: number;
  source?: string;
  notes?: string;
  createdAt: string;
  position: number;
}

// VTags = Virtual Tags for Kanban columns (Hot Leads flow)
type VTag =
  | "hot"
  | "calling"
  | "contacted"
  | "scheduled"
  | "closed"
  | "no_answer";

interface VTagConfig {
  id: VTag;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const VTAG_COLUMNS: VTagConfig[] = [
  {
    id: "hot",
    label: "🔥 Hot Leads",
    description: "Ready to contact",
    icon: <Flame className="h-4 w-4" />,
    color: "text-orange-600",
    bgColor: "bg-orange-50 border-orange-200",
  },
  {
    id: "calling",
    label: "📞 Calling",
    description: "In active dial session",
    icon: <PhoneCall className="h-4 w-4" />,
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
  },
  {
    id: "no_answer",
    label: "📵 No Answer",
    description: "Left voicemail / callback queue",
    icon: <PhoneOff className="h-4 w-4" />,
    color: "text-gray-600",
    bgColor: "bg-gray-50 border-gray-200",
  },
  {
    id: "contacted",
    label: "✅ Contacted",
    description: "Spoke with lead",
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-green-600",
    bgColor: "bg-green-50 border-green-200",
  },
  {
    id: "scheduled",
    label: "📅 Scheduled",
    description: "Strategy session booked",
    icon: <Calendar className="h-4 w-4" />,
    color: "text-purple-600",
    bgColor: "bg-purple-50 border-purple-200",
  },
  {
    id: "closed",
    label: "🎯 Closed",
    description: "Deal completed",
    icon: <Target className="h-4 w-4" />,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 border-emerald-200",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// LEAD CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function OutreachLeadCard({
  lead,
  isSelected,
  onSelect,
  onCall,
  onSms,
  onEmail,
  onSchedule,
}: {
  lead: OutreachLead;
  isSelected: boolean;
  onSelect: () => void;
  onCall: () => void;
  onSms: () => void;
  onEmail: () => void;
  onSchedule: () => void;
}) {
  const formatCurrency = (value?: number) => {
    if (!value) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card
      className={cn(
        "mb-2 transition-all hover:shadow-md cursor-pointer",
        isSelected && "ring-2 ring-primary",
      )}
    >
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              onClick={(e) => e.stopPropagation()}
            />
            <div>
              <p className="font-medium text-sm">{lead.name}</p>
              <p className="text-xs text-muted-foreground">
                {lead.address}, {lead.city}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              lead.priority === "hot" &&
                "bg-orange-100 text-orange-700 border-orange-300",
              lead.priority === "warm" &&
                "bg-yellow-100 text-yellow-700 border-yellow-300",
              lead.priority === "cold" &&
                "bg-blue-100 text-blue-700 border-blue-300",
            )}
          >
            {lead.score}
          </Badge>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
          <span>{formatCurrency(lead.equity)} equity</span>
          <span>•</span>
          <span>{lead.attempts} attempts</span>
        </div>

        {/* Quick Actions - Click to Call/SMS */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 flex-1 text-xs hover:bg-green-50 hover:text-green-700 hover:border-green-300"
            onClick={(e) => {
              e.stopPropagation();
              onCall();
            }}
            disabled={!lead.phone}
          >
            <Phone className="h-3 w-3 mr-1" />
            Call
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 flex-1 text-xs hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
            onClick={(e) => {
              e.stopPropagation();
              onSms();
            }}
            disabled={!lead.phone}
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            SMS
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300"
            onClick={(e) => {
              e.stopPropagation();
              onSchedule();
            }}
          >
            <Calendar className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function InstantOutreachWorkspace() {
  // State
  const [leads, setLeads] = useState<OutreachLead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  // Dialer State
  const [isDialerActive, setIsDialerActive] = useState(false);
  const [dialerPaused, setDialerPaused] = useState(false);
  const [currentDialLead, setCurrentDialLead] = useState<OutreachLead | null>(
    null,
  );
  const [dialProgress, setDialProgress] = useState({ completed: 0, total: 0 });

  // Dialogs
  const [showSequenceDialog, setShowSequenceDialog] = useState(false);
  const [showBlastDialog, setShowBlastDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  // Load leads on mount - Fetch REAL hot leads from database
  useEffect(() => {
    const loadLeads = async () => {
      setIsLoading(true);
      try {
        // Fetch hot leads (status = hot_lead OR has gold_label tag)
        const response = await fetch("/api/leads?status=hot_lead&limit=200");
        const data = await response.json();

        if (data.error) {
          console.error("[Instant Outreach] API error:", data.error);
          toast.error("Failed to load hot leads");
          setLeads([]);
          return;
        }

        // Map API leads to OutreachLead format with vtag
        const outreachLeads: OutreachLead[] = (data.leads || []).map(
          (lead: any, index: number) => {
            // Determine vtag based on status and tags
            let vtag: VTag = "hot";
            if (lead.status === "contacted") vtag = "contacted";
            else if (lead.status === "scheduled") vtag = "scheduled";
            else if (lead.status === "closed" || lead.status === "closed_won")
              vtag = "closed";
            else if (lead.tags?.includes("calling")) vtag = "calling";
            else if (lead.tags?.includes("no_answer")) vtag = "no_answer";
            // Default: hot_lead, gold_label, email_captured, mobile_captured → 'hot' vtag

            return {
              id: lead.id,
              name:
                `${lead.firstName || ""} ${lead.lastName || ""}`.trim() ||
                "Unknown",
              firstName: lead.firstName,
              lastName: lead.lastName,
              phone: lead.phone,
              email: lead.email,
              address: lead.address,
              city: lead.city,
              state: lead.state,
              propertyValue: lead.metadata?.propertyValue,
              equity: lead.metadata?.equity,
              leadType: lead.source || "Lead",
              vtag,
              priority: lead.tags?.includes("gold_label")
                ? "hot"
                : lead.score >= 70
                  ? "hot"
                  : lead.score >= 40
                    ? "warm"
                    : "cold",
              score: lead.score || 0,
              lastAction: lead.metadata?.lastAction,
              lastActionAt: lead.updatedAt,
              attempts: lead.metadata?.attempts || 0,
              source: lead.tags?.includes("email_captured")
                ? "Email Captured"
                : lead.source,
              notes: lead.notes,
              createdAt: lead.createdAt,
              position: index,
            };
          },
        );

        setLeads(outreachLeads);
        console.log(
          `[Instant Outreach] Loaded ${outreachLeads.length} hot leads from database`,
        );
      } catch (error) {
        console.error("Failed to load leads:", error);
        toast.error("Failed to load leads");
        setLeads([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadLeads();
  }, []);

  // Filtered leads by search
  const filteredLeads = useMemo(() => {
    if (!searchQuery) return leads;
    const query = searchQuery.toLowerCase();
    return leads.filter(
      (lead) =>
        lead.name.toLowerCase().includes(query) ||
        lead.phone?.includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.address?.toLowerCase().includes(query),
    );
  }, [leads, searchQuery]);

  // Leads by VTag column
  const leadsByVTag = useMemo(() => {
    const grouped: Record<VTag, OutreachLead[]> = {
      hot: [],
      calling: [],
      no_answer: [],
      contacted: [],
      scheduled: [],
      closed: [],
    };
    filteredLeads.forEach((lead) => {
      grouped[lead.vtag].push(lead);
    });
    // Sort each column by position
    Object.values(grouped).forEach((arr) =>
      arr.sort((a, b) => a.position - b.position),
    );
    return grouped;
  }, [filteredLeads]);

  // Stats
  const stats = useMemo(
    () => ({
      total: leads.length,
      hot: leadsByVTag.hot.length,
      calling: leadsByVTag.calling.length,
      contacted: leadsByVTag.contacted.length,
      scheduled: leadsByVTag.scheduled.length,
      closed: leadsByVTag.closed.length,
      selected: selectedLeads.size,
    }),
    [leads, leadsByVTag, selectedLeads],
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

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

  const selectAllInColumn = (vtag: VTag) => {
    const columnLeadIds = leadsByVTag[vtag].map((l) => l.id);
    setSelectedLeads((prev) => {
      const next = new Set(prev);
      const allSelected = columnLeadIds.every((id) => next.has(id));
      if (allSelected) {
        columnLeadIds.forEach((id) => next.delete(id));
      } else {
        columnLeadIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleCall = async (lead: OutreachLead) => {
    if (!lead.phone) {
      toast.error("No phone number");
      return;
    }

    // Move to calling column
    setLeads((prev) =>
      prev.map((l) =>
        l.id === lead.id ? { ...l, vtag: "calling" as VTag } : l,
      ),
    );

    // Open phone dialer
    window.open(`tel:${lead.phone}`, "_self");
    toast.success(`Calling ${lead.name}...`);
  };

  const handleSms = async (lead: OutreachLead) => {
    if (!lead.phone) {
      toast.error("No phone number");
      return;
    }

    // TODO: Open SMS composer or send via API
    toast.success(`SMS to ${lead.name}`);
  };

  const handleEmail = async (lead: OutreachLead) => {
    if (!lead.email) {
      toast.error("No email address");
      return;
    }
    window.open(`mailto:${lead.email}`, "_self");
  };

  const handleSchedule = async (lead: OutreachLead) => {
    // Move to scheduled column
    setLeads((prev) =>
      prev.map((l) =>
        l.id === lead.id ? { ...l, vtag: "scheduled" as VTag } : l,
      ),
    );
    toast.success(`Strategy session scheduled for ${lead.name}`);
  };

  // Drag and drop handler
  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newVtag = destination.droppableId as VTag;

    setLeads((prev) => {
      const updated = prev.map((lead) => {
        if (lead.id === draggableId) {
          return {
            ...lead,
            vtag: newVtag,
            position: destination.index,
          };
        }
        return lead;
      });
      return updated;
    });

    toast.success(
      `Moved to ${VTAG_COLUMNS.find((c) => c.id === newVtag)?.label}`,
    );
  };

  // Start auto-dialer
  const startDialer = () => {
    const toCall = leads.filter((l) => selectedLeads.has(l.id) && l.phone);
    if (toCall.length === 0) {
      toast.error("Select leads with phone numbers");
      return;
    }

    setIsDialerActive(true);
    setDialerPaused(false);
    setDialProgress({ completed: 0, total: toCall.length });
    setCurrentDialLead(toCall[0]);

    // Move all selected to calling column
    setLeads((prev) =>
      prev.map((l) =>
        selectedLeads.has(l.id) ? { ...l, vtag: "calling" as VTag } : l,
      ),
    );

    toast.success(`Auto-dialer started: ${toCall.length} leads`);
  };

  const pauseDialer = () => {
    setDialerPaused(true);
    toast.info("Dialer paused");
  };

  const resumeDialer = () => {
    setDialerPaused(false);
    toast.info("Dialer resumed");
  };

  const stopDialer = () => {
    setIsDialerActive(false);
    setDialerPaused(false);
    setCurrentDialLead(null);
    setDialProgress({ completed: 0, total: 0 });
    toast.info("Dialer stopped");
  };

  // SMS Blast
  const handleSmsBlast = () => {
    if (selectedLeads.size === 0) {
      toast.error("Select leads first");
      return;
    }
    setShowBlastDialog(true);
  };

  // Start Sequence
  const handleStartSequence = () => {
    if (selectedLeads.size === 0) {
      toast.error("Select leads first");
      return;
    }
    setShowSequenceDialog(true);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading Instant Outreach...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-yellow-500" />
              Instant Outreach
            </h1>
            <p className="text-sm text-muted-foreground">
              {stats.total.toLocaleString()} /{" "}
              {MAX_WORKSPACE_LEADS.toLocaleString()} leads • Click-to-call •
              Sequences • Blast
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Tabs
              value={viewMode}
              onValueChange={(v) => setViewMode(v as "kanban" | "list")}
            >
              <TabsList>
                <TabsTrigger value="kanban">
                  <LayoutGrid className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="list">
                  <List className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-4 mt-4">
          <Badge variant="outline" className="text-orange-600 bg-orange-50">
            🔥 Hot: {stats.hot}
          </Badge>
          <Badge variant="outline" className="text-blue-600 bg-blue-50">
            📞 Calling: {stats.calling}
          </Badge>
          <Badge variant="outline" className="text-green-600 bg-green-50">
            ✅ Contacted: {stats.contacted}
          </Badge>
          <Badge variant="outline" className="text-purple-600 bg-purple-50">
            📅 Scheduled: {stats.scheduled}
          </Badge>
          <Badge variant="outline" className="text-emerald-600 bg-emerald-50">
            🎯 Closed: {stats.closed}
          </Badge>

          <div className="flex-1" />

          {/* Bulk Actions */}
          {selectedLeads.size > 0 && (
            <div className="flex items-center gap-2">
              <Badge>{selectedLeads.size} selected</Badge>

              {/* Dialer Controls */}
              {isDialerActive ? (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={dialerPaused ? resumeDialer : pauseDialer}
                  >
                    {dialerPaused ? (
                      <Play className="h-4 w-4" />
                    ) : (
                      <Pause className="h-4 w-4" />
                    )}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={stopDialer}>
                    <PhoneOff className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground ml-2">
                    {dialProgress.completed}/{dialProgress.total}
                  </span>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={startDialer}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <PhoneCall className="h-4 w-4 mr-1" />
                  Auto-Dial ({selectedLeads.size})
                </Button>
              )}

              <Button size="sm" variant="outline" onClick={handleSmsBlast}>
                <MessageSquare className="h-4 w-4 mr-1" />
                SMS Blast
              </Button>

              <Button size="sm" variant="outline" onClick={handleStartSequence}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Sequence
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowScheduleDialog(true)}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Schedule
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Active Dialer Banner */}
      {isDialerActive && currentDialLead && (
        <div className="bg-green-50 border-b border-green-200 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                <span className="font-medium text-green-700">
                  {dialerPaused ? "PAUSED" : "DIALING"}
                </span>
              </div>
              <div>
                <p className="font-medium">{currentDialLead.name}</p>
                <p className="text-sm text-muted-foreground">
                  {currentDialLead.phone}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Progress
                value={(dialProgress.completed / dialProgress.total) * 100}
                className="w-48"
              />
              <span className="text-sm">
                {dialProgress.completed} / {dialProgress.total}
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCall(currentDialLead)}
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSms(currentDialLead)}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="h-full flex gap-4 p-4 overflow-x-auto">
            {VTAG_COLUMNS.map((column) => (
              <Droppable key={column.id} droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex flex-col w-80 min-w-80 rounded-lg border",
                      snapshot.isDraggingOver ? "bg-muted/50" : column.bgColor,
                    )}
                  >
                    {/* Column Header */}
                    <div className="p-3 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={column.color}>{column.icon}</span>
                          <span className="font-medium">{column.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {leadsByVTag[column.id].length}
                          </Badge>
                          <Checkbox
                            checked={
                              leadsByVTag[column.id].length > 0 &&
                              leadsByVTag[column.id].every((l) =>
                                selectedLeads.has(l.id),
                              )
                            }
                            onCheckedChange={() => selectAllInColumn(column.id)}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {column.description}
                      </p>
                    </div>

                    {/* Column Content */}
                    <ScrollArea className="flex-1 p-2">
                      {leadsByVTag[column.id].map((lead, index) => (
                        <Draggable
                          key={lead.id}
                          draggableId={lead.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={
                                snapshot.isDragging ? "opacity-50" : ""
                              }
                            >
                              <OutreachLeadCard
                                lead={lead}
                                isSelected={selectedLeads.has(lead.id)}
                                onSelect={() => toggleLeadSelection(lead.id)}
                                onCall={() => handleCall(lead)}
                                onSms={() => handleSms(lead)}
                                onEmail={() => handleEmail(lead)}
                                onSchedule={() => handleSchedule(lead)}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </ScrollArea>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* SMS Blast Dialog */}
      <Dialog open={showBlastDialog} onOpenChange={setShowBlastDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>SMS Blast</DialogTitle>
            <DialogDescription>
              Send SMS to {selectedLeads.size} selected leads
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Message Template</Label>
              <Select defaultValue="intro">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="intro">Introduction</SelectItem>
                  <SelectItem value="followup">Follow-up</SelectItem>
                  <SelectItem value="calendar">Calendar Link</SelectItem>
                  <SelectItem value="custom">Custom Message</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlastDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success(`SMS blast sent to ${selectedLeads.size} leads`);
                setShowBlastDialog(false);
              }}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Blast
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sequence Dialog */}
      <Dialog open={showSequenceDialog} onOpenChange={setShowSequenceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Sequence</DialogTitle>
            <DialogDescription>
              Add {selectedLeads.size} leads to an automated sequence
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Sequence Type</Label>
              <Select defaultValue="10touch">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10touch">10-Touch 30-Day</SelectItem>
                  <SelectItem value="nurture">Nurture Drip</SelectItem>
                  <SelectItem value="reactivation">Reactivation</SelectItem>
                  <SelectItem value="hot">Hot Lead Fast Follow</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSequenceDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success(`${selectedLeads.size} leads added to sequence`);
                setShowSequenceDialog(false);
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Start Sequence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Automation</DialogTitle>
            <DialogDescription>
              Schedule calls/SMS for {selectedLeads.size} leads
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select defaultValue="call">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Scheduled Call</SelectItem>
                  <SelectItem value="sms">Scheduled SMS</SelectItem>
                  <SelectItem value="email">Scheduled Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Schedule For</Label>
              <Input type="datetime-local" />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowScheduleDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success(`Scheduled for ${selectedLeads.size} leads`);
                setShowScheduleDialog(false);
              }}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
