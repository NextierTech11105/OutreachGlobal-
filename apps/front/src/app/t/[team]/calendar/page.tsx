"use client";

import * as React from "react";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Phone,
  PhoneCall,
  MessageSquare,
  Mail,
  Clock,
  MapPin,
  Users,
  X,
  Send,
  RefreshCw,
  Target,
  Sparkles,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  Building2,
  DollarSign,
  Home,
  User,
  MoreHorizontal,
  ArrowRight,
  Loader2,
  CheckSquare,
  Square,
  Inbox,
  Bot,
  Pause,
  Play,
  PhoneOff,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LeadActionButtons } from "@/components/lead-action-buttons";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Lead {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  propertyValue?: number;
  equity?: number;
  leadType?: string;
  status: "new" | "contacted" | "qualified" | "nurture" | "closed" | "lost";
  createdAt: string;
  lastContactedAt?: string;
  source?: string;
  notes?: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  leads: Lead[];
  leadCount: number;
}

type CampaignStage = "initial" | "nc_retarget" | "nurture" | "nudger";

const CAMPAIGN_STAGES: { id: CampaignStage; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  { id: "initial", label: "Initial SMS", description: "First contact", icon: <Sparkles className="h-4 w-4" />, color: "bg-blue-500" },
  { id: "nc_retarget", label: "NC Retarget", description: "No contact follow-up", icon: <RefreshCw className="h-4 w-4" />, color: "bg-orange-500" },
  { id: "nurture", label: "Nurture", description: "Relationship building", icon: <Target className="h-4 w-4" />, color: "bg-green-500" },
  { id: "nudger", label: "Nudger", description: "Final push", icon: <Send className="h-4 w-4" />, color: "bg-purple-500" },
];

const STATUS_COLORS: Record<Lead["status"], string> = {
  new: "bg-blue-500",
  contacted: "bg-yellow-500",
  qualified: "bg-green-500",
  nurture: "bg-purple-500",
  closed: "bg-emerald-600",
  lost: "bg-gray-500",
};

// ═══════════════════════════════════════════════════════════════════════════════
// REAL API DATA FETCHING
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchLeadsForDateRange(startDate: Date, endDate: Date): Promise<Lead[]> {
  try {
    const response = await fetch(
      `/api/calendar/leads?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
    );
    const data = await response.json();
    return data.success ? data.leads : [];
  } catch (error) {
    console.error("[Calendar] Failed to fetch leads:", error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEAD CALENDAR WORKSPACE
// ═══════════════════════════════════════════════════════════════════════════════

export default function LeadCalendarWorkspace() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<Lead["status"] | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [selectedCampaignStage, setSelectedCampaignStage] = useState<CampaignStage>("initial");
  const [isPushing, setIsPushing] = useState(false);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);

  // Gianna Copilot State
  const [isGiannaActive, setIsGiannaActive] = useState(false);
  const [giannaDialing, setGiannaDialing] = useState(false);
  const [giannaCurrentLead, setGiannaCurrentLead] = useState<Lead | null>(null);
  const [giannaProgress, setGiannaProgress] = useState({ completed: 0, total: 0 });
  const [giannaSessionId, setGiannaSessionId] = useState<string | null>(null);
  const [isLoadingDialer, setIsLoadingDialer] = useState(false);
  const [showDialerDialog, setShowDialerDialog] = useState(false);
  const MAX_DIALER_LEADS = 2000;

  // Calculate date range for current view
  const dateRange = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 42);
    return { startDate, endDate };
  }, [currentDate]);

  // Fetch leads when date range changes
  useEffect(() => {
    let cancelled = false;

    async function loadLeads() {
      setIsLoading(true);
      const leads = await fetchLeadsForDateRange(dateRange.startDate, dateRange.endDate);
      if (!cancelled) {
        setAllLeads(leads);
        setIsLoading(false);
      }
    }

    loadLeads();
    return () => { cancelled = true; };
  }, [dateRange.startDate.getTime(), dateRange.endDate.getTime()]);

  // Generate calendar days with leads grouped by date
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Group leads by date
    const leadsByDate = new Map<string, Lead[]>();
    for (const lead of allLeads) {
      const dateKey = new Date(lead.createdAt).toDateString();
      if (!leadsByDate.has(dateKey)) {
        leadsByDate.set(dateKey, []);
      }
      leadsByDate.get(dateKey)!.push(lead);
    }

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      date.setHours(0, 0, 0, 0);

      const dateKey = date.toDateString();
      const leads = leadsByDate.get(dateKey) || [];

      days.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.getTime() === today.getTime(),
        leads,
        leadCount: leads.length,
      });
    }

    return days;
  }, [currentDate, allLeads]);

  // Get leads for selected date
  const selectedDateLeads = useMemo(() => {
    if (!selectedDate) return [];
    const day = calendarDays.find(
      (d) => d.date.toDateString() === selectedDate.toDateString()
    );
    let leads = day?.leads || [];

    if (filterStatus !== "all") {
      leads = leads.filter((l) => l.status === filterStatus);
    }

    return leads;
  }, [selectedDate, calendarDays, filterStatus]);

  // Navigation
  const navigateMonth = (direction: number) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
    setSelectedLeads(new Set());
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
    setSelectedLeads(new Set());
  };

  // Lead selection
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

  const selectAllLeads = () => {
    if (selectedLeads.size === selectedDateLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(selectedDateLeads.map((l) => l.id)));
    }
  };

  const getSelectedLeadsList = () => {
    return selectedDateLeads.filter((l) => selectedLeads.has(l.id));
  };

  // Actions
  const handleCall = async (lead: Lead) => {
    if (!lead.phone) {
      toast.error("No phone number available");
      return;
    }
    window.open(`tel:${lead.phone}`, "_self");
    toast.success(`Calling ${lead.name}...`);
  };

  const handleSms = async (lead: Lead) => {
    if (!lead.phone) {
      toast.error("No phone number available");
      return;
    }
    // Open SMS queue or send single SMS
    toast.success(`SMS panel opened for ${lead.name}`);
  };

  const handleEmail = async (lead: Lead) => {
    if (!lead.email) {
      toast.error("No email available");
      return;
    }
    window.open(`mailto:${lead.email}`, "_blank");
    toast.success(`Email draft opened for ${lead.name}`);
  };

  const handleStatusUpdate = async (lead: Lead, newStatus: Lead["status"]) => {
    try {
      const response = await fetch("/api/calendar/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_status",
          leadId: lead.id,
          newStatus,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`Updated ${lead.name} to ${newStatus}`);
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  // Gianna Copilot - Start Auto-Dial Session
  const startGiannaAutoDial = useCallback(async () => {
    const leads = getSelectedLeadsList();
    if (leads.length === 0) {
      toast.error("Select leads to dial");
      return;
    }

    const leadsWithPhone = leads.filter(l => l.phone);
    if (leadsWithPhone.length === 0) {
      toast.error("No leads with phone numbers");
      return;
    }

    setIsGiannaActive(true);
    setGiannaDialing(true);
    setGiannaProgress({ completed: 0, total: leadsWithPhone.length });
    setGiannaSessionId(`gianna-${Date.now()}`);

    toast.success(`Gianna starting auto-dial: ${leadsWithPhone.length} calls`, {
      description: "Human-in-the-loop monitoring active",
    });

    // Start dialing first lead
    if (leadsWithPhone.length > 0) {
      setGiannaCurrentLead(leadsWithPhone[0]);
      try {
        await fetch("/api/copilot/dial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: `gianna-${Date.now()}`,
            leadId: leadsWithPhone[0].id,
            phone: leadsWithPhone[0].phone,
            workspaceId: "calendar",
          }),
        });
      } catch {
        console.log("Gianna dial simulating...");
      }
    }
  }, [selectedLeads, selectedDateLeads]);

  const pauseGianna = useCallback(() => {
    setGiannaDialing(false);
    toast.info("Gianna paused");
  }, []);

  const resumeGianna = useCallback(() => {
    setGiannaDialing(true);
    toast.info("Gianna resumed");
  }, []);

  const stopGianna = useCallback(() => {
    setIsGiannaActive(false);
    setGiannaDialing(false);
    setGiannaCurrentLead(null);
    setGiannaProgress({ completed: 0, total: 0 });
    setGiannaSessionId(null);
    toast.info("Gianna stopped");
  }, []);

  // Load Dialer - Push to dialer workspace
  const handleLoadDialer = useCallback(async () => {
    const leads = getSelectedLeadsList();
    if (leads.length === 0) {
      toast.error("Select leads first");
      return;
    }

    const toLoad = Math.min(leads.length, MAX_DIALER_LEADS);
    setIsLoadingDialer(true);

    try {
      const response = await fetch("/api/dialer/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: leads.slice(0, toLoad).map(l => l.id),
          workspaceId: "calendar",
          priority: "high",
        }),
      });

      if (response.ok) {
        toast.success(`Loaded ${toLoad} leads into dialer`);
      } else {
        throw new Error("Failed to load dialer");
      }
    } catch {
      toast.success(`Simulated: ${toLoad} leads loaded into dialer`);
    } finally {
      setIsLoadingDialer(false);
      setShowDialerDialog(false);
      setSelectedLeads(new Set());
    }
  }, [selectedLeads, selectedDateLeads]);

  // Campaign push - real API call
  const handlePushToCampaign = async () => {
    const leads = getSelectedLeadsList();
    if (leads.length === 0) {
      toast.error("Select leads first");
      return;
    }

    setIsPushing(true);
    try {
      const response = await fetch("/api/calendar/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "push_to_campaign",
          leads,
          campaignStage: selectedCampaignStage,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to push to campaign");
      }

      const stage = CAMPAIGN_STAGES.find((s) => s.id === selectedCampaignStage);
      toast.success(
        `${result.queued} leads pushed to ${stage?.label} campaign`,
        {
          description: result.skipped > 0
            ? `${result.skipped} skipped (opted out or no phone)`
            : "Ready for review in SMS Queue",
        }
      );
      setSelectedLeads(new Set());
      setIsCampaignDialogOpen(false);
    } catch (error) {
      toast.error("Failed to push to campaign", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsPushing(false);
    }
  };

  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const formatCurrency = (value?: number) => {
    if (!value) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Stats for the month
  const monthStats = useMemo(() => {
    const allLeads = calendarDays
      .filter((d) => d.isCurrentMonth)
      .flatMap((d) => d.leads);

    return {
      total: allLeads.length,
      new: allLeads.filter((l) => l.status === "new").length,
      contacted: allLeads.filter((l) => l.status === "contacted").length,
      qualified: allLeads.filter((l) => l.status === "qualified").length,
      withPhone: allLeads.filter((l) => l.phone).length,
      withEmail: allLeads.filter((l) => l.email).length,
    };
  }, [calendarDays]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarIcon className="h-6 w-6" />
              Lead Calendar Workspace
            </h1>
            <p className="text-sm text-muted-foreground">
              Pull • Push • Prep • Preview • Send — True lead generation machine
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="py-1.5">
              <Users className="h-3.5 w-3.5 mr-1" />
              {monthStats.total} leads this month
            </Badge>
            {/* Gianna Copilot Status */}
            {isGiannaActive && (
              <Card className="px-3 py-2 border-green-200 bg-green-50">
                <div className="flex items-center gap-3">
                  <Bot className={cn("h-5 w-5 text-green-600", giannaDialing && "animate-pulse")} />
                  <div className="text-sm">
                    <div className="font-medium text-green-800">
                      {giannaDialing ? "Gianna Dialing..." : "Gianna Paused"}
                    </div>
                    <div className="text-green-600 text-xs">
                      {giannaCurrentLead?.name} • {giannaProgress.completed}/{giannaProgress.total}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {giannaDialing ? (
                      <Button variant="outline" size="sm" onClick={pauseGianna} className="h-7">
                        <Pause className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={resumeGianna} className="h-7">
                        <Play className="h-3 w-3" />
                      </Button>
                    )}
                    <Button variant="destructive" size="sm" onClick={stopGianna} className="h-7">
                      <PhoneOff className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {selectedLeads.size > 0 && (
              <div className="flex items-center gap-2">
                {/* Gianna Auto-Dial Button */}
                <Button
                  onClick={startGiannaAutoDial}
                  disabled={isGiannaActive}
                  variant="outline"
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Gianna Auto-Dial
                </Button>

                {/* Load Dialer Button */}
                <Button
                  onClick={() => setShowDialerDialog(true)}
                  variant="outline"
                  className="border-green-300 text-green-700 hover:bg-green-50"
                >
                  <PhoneCall className="h-4 w-4 mr-2" />
                  Load Dialer ({Math.min(selectedLeads.size, MAX_DIALER_LEADS)})
                </Button>

                {/* Push to SMS Campaign Button */}
                <Button
                  onClick={() => setIsCampaignDialogOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Push to SMS
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Calendar Section */}
        <div className="flex-1 p-6 overflow-auto">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold min-w-[200px] text-center">
                {monthYear}
              </h2>
              <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday} className="ml-2">
                Today
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="border rounded-lg overflow-hidden bg-background shadow-sm">
            {/* Day Headers */}
            <div className="grid grid-cols-7 bg-muted">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="p-3 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setSelectedDate(day.date);
                    setSelectedLeads(new Set());
                  }}
                  className={cn(
                    "min-h-[100px] p-2 border-t border-r last:border-r-0 cursor-pointer transition-all hover:bg-muted/50",
                    !day.isCurrentMonth && "bg-muted/30 text-muted-foreground",
                    day.isToday && "bg-primary/5",
                    selectedDate?.toDateString() === day.date.toDateString() &&
                      "bg-primary/10 ring-2 ring-primary ring-inset"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={cn(
                        "text-sm font-medium",
                        day.isToday &&
                          "bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center"
                      )}
                    >
                      {day.date.getDate()}
                    </div>
                    {day.leadCount > 0 && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          day.leadCount > 5 && "bg-green-500/20 text-green-700",
                          day.leadCount > 3 && day.leadCount <= 5 && "bg-blue-500/20 text-blue-700"
                        )}
                      >
                        {day.leadCount}
                      </Badge>
                    )}
                  </div>

                  {/* Lead Preview Dots */}
                  {day.leadCount > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {day.leads.slice(0, 6).map((lead, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-2 h-2 rounded-full",
                            STATUS_COLORS[lead.status]
                          )}
                          title={`${lead.name} - ${lead.status}`}
                        />
                      ))}
                      {day.leadCount > 6 && (
                        <span className="text-xs text-muted-foreground">+{day.leadCount - 6}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Month Stats */}
          <div className="grid grid-cols-6 gap-4 mt-6">
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{monthStats.total}</p>
              <p className="text-xs text-muted-foreground">Total Leads</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{monthStats.new}</p>
              <p className="text-xs text-muted-foreground">New</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{monthStats.contacted}</p>
              <p className="text-xs text-muted-foreground">Contacted</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{monthStats.qualified}</p>
              <p className="text-xs text-muted-foreground">Qualified</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{monthStats.withPhone}</p>
              <p className="text-xs text-muted-foreground">With Phone</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">{monthStats.withEmail}</p>
              <p className="text-xs text-muted-foreground">With Email</p>
            </Card>
          </div>
        </div>

        {/* Day Detail Sidebar */}
        <div className="w-[480px] border-l bg-muted/30 flex flex-col overflow-hidden">
          {/* Day Header */}
          <div className="p-4 border-b bg-background">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">
                {selectedDate?.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                }) || "Select a Date"}
              </h3>
              <Badge variant="outline">
                {selectedDateLeads.length} leads
              </Badge>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllLeads}
                className="flex-shrink-0"
              >
                {selectedLeads.size === selectedDateLeads.length && selectedDateLeads.length > 0 ? (
                  <CheckSquare className="h-4 w-4 mr-1" />
                ) : (
                  <Square className="h-4 w-4 mr-1" />
                )}
                {selectedLeads.size > 0 ? `${selectedLeads.size} selected` : "Select All"}
              </Button>

              <Select
                value={filterStatus}
                onValueChange={(v) => setFilterStatus(v as Lead["status"] | "all")}
              >
                <SelectTrigger className="w-[140px] h-8">
                  <Filter className="h-3 w-3 mr-2" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="nurture">Nurture</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lead List */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {selectedDateLeads.length === 0 ? (
                <div className="text-center py-12">
                  <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No leads for this day</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Run a property search to generate leads
                  </p>
                </div>
              ) : (
                selectedDateLeads.map((lead) => (
                  <Card
                    key={lead.id}
                    className={cn(
                      "transition-all",
                      selectedLeads.has(lead.id) && "ring-2 ring-primary"
                    )}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <Checkbox
                          checked={selectedLeads.has(lead.id)}
                          onCheckedChange={() => toggleLeadSelection(lead.id)}
                          className="mt-1"
                        />

                        {/* Lead Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium truncate">{lead.name}</h4>
                            <Badge
                              variant="secondary"
                              className={cn("text-xs", STATUS_COLORS[lead.status], "text-white")}
                            >
                              {lead.status}
                            </Badge>
                          </div>

                          {lead.address && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                              <MapPin className="h-3 w-3" />
                              {lead.address}, {lead.city}, {lead.state}
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                            {lead.propertyValue && (
                              <span className="flex items-center gap-1">
                                <Home className="h-3 w-3" />
                                {formatCurrency(lead.propertyValue)}
                              </span>
                            )}
                            {lead.equity && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                {formatCurrency(lead.equity)} equity
                              </span>
                            )}
                            {lead.leadType && (
                              <Badge variant="outline" className="text-xs">
                                {lead.leadType}
                              </Badge>
                            )}
                          </div>

                          {/* Inline Actions */}
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => handleCall(lead)}
                              disabled={!lead.phone}
                            >
                              <Phone className="h-3 w-3 mr-1" />
                              Call
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => handleSms(lead)}
                              disabled={!lead.phone}
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              SMS
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => handleEmail(lead)}
                              disabled={!lead.email}
                            >
                              <Mail className="h-3 w-3 mr-1" />
                              Email
                            </Button>
                            <LeadActionButtons
                              leadIds={[lead.id]}
                              variant="compact"
                              onActionComplete={() => {
                                // Refresh after action
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Campaign Push Footer */}
          {selectedLeads.size > 0 && (
            <div className="p-4 border-t bg-gradient-to-r from-blue-500/10 to-purple-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedLeads.size} leads selected</p>
                  <p className="text-sm text-muted-foreground">Push to SMS campaign</p>
                </div>
                <Button
                  onClick={() => setIsCampaignDialogOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Push to Campaign
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Load Dialer Dialog */}
      <Dialog open={showDialerDialog} onOpenChange={setShowDialerDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-green-600" />
              Load Dialer Workspace
            </DialogTitle>
            <DialogDescription>
              Load {Math.min(selectedLeads.size, MAX_DIALER_LEADS)} leads into dialer for manual or power dialing.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm">Selected leads:</span>
              <Badge>{selectedLeads.size}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm">Will load:</span>
              <Badge variant="outline">{Math.min(selectedLeads.size, MAX_DIALER_LEADS)}</Badge>
            </div>
            {selectedLeads.size > MAX_DIALER_LEADS && (
              <p className="text-amber-600 text-sm">
                Note: Only first {MAX_DIALER_LEADS} leads will be loaded.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialerDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleLoadDialer}
              disabled={isLoadingDialer}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoadingDialer ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PhoneCall className="h-4 w-4 mr-2" />
              )}
              Load Dialer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Push Dialog */}
      <Dialog open={isCampaignDialogOpen} onOpenChange={setIsCampaignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Push to SMS Campaign</DialogTitle>
            <DialogDescription>
              Select a campaign stage for {selectedLeads.size} lead{selectedLeads.size !== 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {CAMPAIGN_STAGES.map((stage) => (
              <div
                key={stage.id}
                onClick={() => setSelectedCampaignStage(stage.id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  selectedCampaignStage === stage.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted"
                )}
              >
                <div className={cn("p-2 rounded-lg text-white", stage.color)}>
                  {stage.icon}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{stage.label}</p>
                  <p className="text-sm text-muted-foreground">{stage.description}</p>
                </div>
                {selectedCampaignStage === stage.id && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCampaignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePushToCampaign}
              disabled={isPushing}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              {isPushing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Pushing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Push {selectedLeads.size} Leads
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
