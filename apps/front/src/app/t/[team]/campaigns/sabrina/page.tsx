"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Phone,
  Calendar,
  TrendingUp,
  Send,
  Settings,
  ArrowRight,
  Zap,
  ChevronRight,
  Clock,
  Target,
  BarChart3,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  MoreHorizontal,
  Eye,
  Play,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { TeamDescription } from "@/features/team/layouts/team-description";
import { TeamLink } from "@/features/team/components/team-link";
import { useCurrentTeam } from "@/features/team/team.context";
import { WorkerInbox } from "@/components/worker-inbox";
import { ContentInsertionPicker } from "@/components/content-insertion-picker";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// SABRINA worker configuration
// SABRINA is the SMS SDR - handles relationship building, follow-ups, and closing
// She also confirms appointments and sends reminders to reduce no-shows
const SABRINA_CONFIG = {
  id: "sabrina" as const,
  name: "SABRINA",
  role: "SMS SDR & Closer",
  tagline: "SMS outreach, relationship building & appointment management",
  description:
    "Handles SMS channel for sales leads, managers, and general contacts. Builds relationships, handles objections, books appointments, and sends reminders.",
  gradient: "from-emerald-500 to-teal-600",
  color: "emerald",
  // SDR workflow for closing leads
  sdrWorkflow: [
    {
      step: "ENGAGE",
      description: "Initial SMS outreach via relationship building",
    },
    { step: "QUALIFY", description: "Assess interest and handle objections" },
    { step: "CLOSE", description: "Book appointment or hand off to CATHY" },
  ],
  // Confirmation workflow for booked appointments
  confirmationWorkflow: [
    {
      step: "CONFIRM",
      description: "Send confirmation when appointment is booked",
    },
    { step: "REMIND", description: "Send reminder 24 hours before" },
    { step: "DAY-OF", description: "Send day-of reminder 1 hour before" },
  ],
  goals: [
    "Build relationships via SMS",
    "Handle objections and close",
    "Confirm booked appointments",
    "Reduce no-shows with reminders",
  ],
};

interface WorkerStats {
  totalOutreach: number;
  appointmentsBooked: number;
  objectionsHandled: number;
  conversionRate: number;
  handedToCathy: number;
  avgRebuttalsToBook: number;
  objectionBreakdown: {
    timing: number;
    price: number;
    notInterested: number;
    other: number;
  };
}

interface QueueLead {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  status: "pending" | "engaged" | "objecting" | "booked" | "lost";
  rebuttals: number;
  appointmentTime?: string;
}

export default function SabrinaCampaignsPage() {
  const { team, teamId, isTeamReady } = useCurrentTeam();
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [stats, setStats] = useState<WorkerStats>({
    totalOutreach: 0,
    appointmentsBooked: 0,
    objectionsHandled: 0,
    conversionRate: 0,
    handedToCathy: 0,
    avgRebuttalsToBook: 0,
    objectionBreakdown: { timing: 0, price: 0, notInterested: 0, other: 0 },
  });
  const [queueLeads, setQueueLeads] = useState<QueueLead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [queueLoading, setQueueLoading] = useState(false);

  // Fetch phone assignment
  useEffect(() => {
    async function fetchPhone() {
      try {
        const response = await fetch(
          `/api/workers/phone?worker=sabrina&teamId=${teamId}`,
        );
        const data = await response.json();
        if (data.success && data.assignment?.phoneNumber) {
          setPhoneNumber(data.assignment.phoneNumber);
        }
      } catch (error) {
        console.error("Failed to fetch phone:", error);
      }
    }
    fetchPhone();
  }, [teamId]);

  // Fetch stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch(`/api/sabrina/stats?teamId=${teamId}`);
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [teamId]);

  // Fetch queue leads
  useEffect(() => {
    async function fetchQueue() {
      setQueueLoading(true);
      try {
        const response = await fetch(
          `/api/leads?teamId=${teamId}&worker=sabrina&limit=20`,
        );
        const data = await response.json();
        if (data.leads) {
          setQueueLeads(
            data.leads.map((lead: any) => ({
              id: lead.id,
              name: lead.name || lead.fullName || "Unknown",
              company: lead.company || lead.companyName,
              phone: lead.phone || lead.phoneNumber,
              status: lead.workerStatus || "pending",
              rebuttals: lead.rebuttals || 0,
              appointmentTime: lead.appointmentTime,
            })),
          );
        }
      } catch (error) {
        console.error("Failed to fetch queue:", error);
        // Mock data for demonstration
        setQueueLeads([
          {
            id: "1",
            name: "Hot Harry",
            company: "Ready LLC",
            phone: "+1234567890",
            status: "pending",
            rebuttals: 0,
          },
          {
            id: "2",
            name: "Objecting Olivia",
            company: "Maybe Inc",
            phone: "+1987654321",
            status: "objecting",
            rebuttals: 2,
          },
          {
            id: "3",
            name: "Booked Bob",
            company: "Done Co",
            phone: "+1555123456",
            status: "booked",
            rebuttals: 1,
            appointmentTime: "2024-01-15 10:00 AM",
          },
        ]);
      } finally {
        setQueueLoading(false);
      }
    }
    fetchQueue();
  }, [teamId]);

  // Toggle lead selection
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

  // Select all leads
  const toggleSelectAll = () => {
    if (selectedLeads.size === queueLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(queueLeads.map((l) => l.id)));
    }
  };

  // Start closing all pending leads
  const startClosingAll = async () => {
    const pendingLeads = queueLeads.filter((l) => l.status === "pending");
    if (pendingLeads.length === 0) {
      toast.info("No pending leads to close");
      return;
    }
    try {
      const response = await fetch("/api/sabrina/close-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: pendingLeads.map((l) => l.id),
          teamId: teamId,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Started closing ${pendingLeads.length} leads`);
      }
    } catch (error) {
      toast.error("Failed to start closing leads");
    }
  };

  // Remove selected from queue
  const removeSelectedFromQueue = async () => {
    if (selectedLeads.size === 0) return;
    try {
      const response = await fetch("/api/leads/worker-assign", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: Array.from(selectedLeads),
          worker: "sabrina",
          teamId: teamId,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setQueueLeads((prev) => prev.filter((l) => !selectedLeads.has(l.id)));
        setSelectedLeads(new Set());
        toast.success("Removed from queue");
      }
    } catch (error) {
      toast.error("Failed to remove leads");
    }
  };

  // Move to another worker
  const moveToWorker = async (toWorker: "gianna" | "cathy") => {
    if (selectedLeads.size === 0) return;
    try {
      const response = await fetch("/api/leads/worker-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: Array.from(selectedLeads),
          fromWorker: "sabrina",
          toWorker,
          teamId: teamId,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setQueueLeads((prev) => prev.filter((l) => !selectedLeads.has(l.id)));
        setSelectedLeads(new Set());
        toast.success(
          `Moved ${selectedLeads.size} leads to ${toWorker.toUpperCase()}`,
        );
      }
    } catch (error) {
      toast.error("Failed to move leads");
    }
  };

  // Get status badge
  const getStatusBadge = (status: QueueLead["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-zinc-800 text-zinc-300">
            Pending
          </Badge>
        );
      case "engaged":
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/20 text-blue-300 border-blue-500/50"
          >
            Engaged
          </Badge>
        );
      case "objecting":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50"
          >
            Objecting
          </Badge>
        );
      case "booked":
        return (
          <Badge
            variant="outline"
            className="bg-green-500/20 text-green-300 border-green-500/50"
          >
            Booked!
          </Badge>
        );
      case "lost":
        return (
          <Badge
            variant="outline"
            className="bg-red-500/20 text-red-300 border-red-500/50"
          >
            Lost
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Handle content insertion
  const handleContentInsert = (content: { text: string; url?: string }) => {
    toast.success("Content ready to insert");
  };

  // Handle handoff
  const handleHandoff = async (
    leadId: string,
    toWorker: "gianna" | "cathy",
  ) => {
    try {
      const endpoint =
        toWorker === "cathy" ? "/api/cathy/schedule" : "/api/gianna/respond";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          fromWorker: "sabrina",
          teamId: teamId,
          reason:
            toWorker === "cathy" ? "backed_off_3_rebuttals" : "needs_warming",
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Handed off to ${toWorker.toUpperCase()}`);
      }
    } catch (error) {
      toast.error("Handoff failed");
    }
  };

  return (
    <TeamSection>
      <TeamHeader title="SABRINA - SMS SDR & Closer" />

      <div className="container space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br",
                SABRINA_CONFIG.gradient,
              )}
            >
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <TeamTitle className="flex items-center gap-2">
                {SABRINA_CONFIG.name}
                <Badge
                  variant="outline"
                  className="text-emerald-400 border-emerald-400/50"
                >
                  {SABRINA_CONFIG.role}
                </Badge>
              </TeamTitle>
              <TeamDescription>{SABRINA_CONFIG.tagline}</TeamDescription>
              <p className="text-sm text-zinc-400 mt-1">
                {SABRINA_CONFIG.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ContentInsertionPicker
              teamId={teamId}
              onInsert={handleContentInsert}
            />
            <Button variant="outline" asChild>
              <TeamLink href="/calendar">
                <Calendar className="w-4 h-4 mr-2" />
                View Calendar
              </TeamLink>
            </Button>
          </div>
        </div>

        {/* Phone Assignment Status */}
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-zinc-100">
                    Assigned Phone Number
                  </p>
                  {phoneNumber ? (
                    <p className="text-lg font-mono text-emerald-400">
                      {phoneNumber}
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-500">
                      No phone assigned - Configure in SignalHouse
                    </p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <TeamLink href="/signalhouse/numbers">
                  Manage Numbers
                  <ChevronRight className="w-4 h-4 ml-1" />
                </TeamLink>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <Send className="w-3 h-3" />
                Total Outreach
              </div>
              <p className="text-2xl font-bold text-zinc-100">
                {(stats.totalOutreach ?? 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <Calendar className="w-3 h-3" />
                Booked
              </div>
              <p className="text-2xl font-bold text-green-400">
                {(stats.appointmentsBooked ?? 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <MessageCircle className="w-3 h-3" />
                Objections Handled
              </div>
              <p className="text-2xl font-bold text-blue-400">
                {(stats.objectionsHandled ?? 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <TrendingUp className="w-3 h-3" />
                Conversion Rate
              </div>
              <p className="text-2xl font-bold text-emerald-400">
                {(stats.conversionRate ?? 0).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <ArrowRight className="w-3 h-3" />
                To CATHY
              </div>
              <p className="text-2xl font-bold text-orange-400">
                {(stats.handedToCathy ?? 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <Clock className="w-3 h-3" />
                Avg Rebuttals
              </div>
              <p className="text-2xl font-bold text-yellow-400">
                {(stats.avgRebuttalsToBook ?? 0).toFixed(1)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lead Queue Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Closing Queue ({queueLeads.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                {selectedLeads.size > 0 && (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-1">
                          <ArrowRight className="w-4 h-4" />
                          Move to
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => moveToWorker("gianna")}
                        >
                          <span className="text-purple-400 font-medium">
                            GIANNA
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Opener)
                          </span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => moveToWorker("cathy")}>
                          <span className="text-orange-400 font-medium">
                            CATHY
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Nudger)
                          </span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={removeSelectedFromQueue}
                      className="gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={startClosingAll}
                >
                  <Play className="w-4 h-4" />
                  Start Closing All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={
                        selectedLeads.size === queueLeads.length &&
                        queueLeads.length > 0
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rebuttals</TableHead>
                  <TableHead>Appointment</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueLeads.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-zinc-500 py-8"
                    >
                      No leads in closing queue. Assign leads from the Leads
                      page.
                    </TableCell>
                  </TableRow>
                )}
                {queueLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedLeads.has(lead.id)}
                        onCheckedChange={() => toggleLeadSelection(lead.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-zinc-100">{lead.name}</p>
                        {lead.company && (
                          <p className="text-xs text-zinc-500">
                            {lead.company}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(lead.status)}</TableCell>
                    <TableCell className="text-zinc-400">
                      {lead.rebuttals}
                    </TableCell>
                    <TableCell>
                      {lead.appointmentTime ? (
                        <span className="text-emerald-400 text-sm">
                          {lead.appointmentTime}
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <TeamLink href={`/leads/${lead.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </TeamLink>
                          </DropdownMenuItem>
                          {lead.status === "pending" && (
                            <DropdownMenuItem>
                              <MessageCircle className="w-4 h-4 mr-2" />
                              Start Closing
                            </DropdownMenuItem>
                          )}
                          {lead.status === "objecting" && (
                            <DropdownMenuItem>
                              <ThumbsUp className="w-4 h-4 mr-2" />
                              Handle Objection
                            </DropdownMenuItem>
                          )}
                          {lead.status === "booked" && (
                            <DropdownMenuItem>
                              <Calendar className="w-4 h-4 mr-2" />
                              Send Confirmation
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleHandoff(lead.id, "cathy")}
                          >
                            <ArrowRight className="w-4 h-4 mr-2 text-orange-400" />
                            Move to CATHY
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleHandoff(lead.id, "gianna")}
                          >
                            <ArrowRight className="w-4 h-4 mr-2 text-purple-400" />
                            Move to GIANNA
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Strategy & Actions */}
          <div className="space-y-6">
            {/* SDR Workflow - Closing Leads */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-400" />
                  SMS SDR Workflow
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {SABRINA_CONFIG.sdrWorkflow.map((workflow, i) => (
                  <div
                    key={workflow.step}
                    className="flex items-center gap-4 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50"
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                        i === 0 && "bg-purple-500/20 text-purple-400",
                        i === 1 && "bg-blue-500/20 text-blue-400",
                        i === 2 && "bg-green-500/20 text-green-400",
                      )}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-medium text-zinc-100">
                        {workflow.step}
                      </p>
                      <p className="text-sm text-zinc-400">
                        {workflow.description}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                    <span>
                      After 3 rebuttals, hand off to CATHY for nurturing
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Confirmation Workflow */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  Appointment Confirmation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {SABRINA_CONFIG.confirmationWorkflow.map((workflow, i) => (
                  <div
                    key={workflow.step}
                    className="flex items-center gap-4 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50"
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                        i === 0 && "bg-blue-500/20 text-blue-400",
                        i === 1 && "bg-yellow-500/20 text-yellow-400",
                        i === 2 && "bg-green-500/20 text-green-400",
                      )}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-medium text-zinc-100">
                        {workflow.step}
                      </p>
                      <p className="text-sm text-zinc-400">
                        {workflow.description}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>
                      Reduce no-shows with timely confirmation & reminders
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Objection Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Objection Types</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-300">Timing</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400"
                        style={{
                          width: `${
                            stats.objectionsHandled > 0
                              ? (stats.objectionBreakdown.timing /
                                  stats.objectionsHandled) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-zinc-500">
                      {stats.objectionBreakdown.timing}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-300">Price</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400"
                        style={{
                          width: `${
                            stats.objectionsHandled > 0
                              ? (stats.objectionBreakdown.price /
                                  stats.objectionsHandled) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-zinc-500">
                      {stats.objectionBreakdown.price}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-300">Not Interested</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-400"
                        style={{
                          width: `${
                            stats.objectionsHandled > 0
                              ? (stats.objectionBreakdown.notInterested /
                                  stats.objectionsHandled) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-zinc-500">
                      {stats.objectionBreakdown.notInterested}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-300">Other</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-400"
                        style={{
                          width: `${
                            stats.objectionsHandled > 0
                              ? (stats.objectionBreakdown.other /
                                  stats.objectionsHandled) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-zinc-500">
                      {stats.objectionBreakdown.other}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full justify-between"
                  variant="outline"
                  asChild
                >
                  <TeamLink href="/calendar">
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      View Calendar
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </TeamLink>
                </Button>
                <Button
                  className="w-full justify-between"
                  variant="outline"
                  asChild
                >
                  <TeamLink href="/analytics/bookings">
                    <span className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Booking Analytics
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </TeamLink>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right: Inbox */}
          <WorkerInbox
            workerId="sabrina"
            teamId={teamId}
            phoneNumber={phoneNumber || undefined}
            onHandoff={(leadId, toWorker) =>
              handleHandoff(leadId, toWorker as "gianna" | "cathy")
            }
            className="h-[600px]"
          />
        </div>
      </div>
    </TeamSection>
  );
}
