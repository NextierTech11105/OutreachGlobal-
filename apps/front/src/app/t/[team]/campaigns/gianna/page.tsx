"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Phone,
  MessageCircle,
  Mail,
  Users,
  TrendingUp,
  Send,
  Settings,
  RefreshCw,
  ArrowRight,
  Zap,
  ChevronRight,
  Clock,
  Target,
  Inbox,
  BarChart3,
  MoreHorizontal,
  Eye,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { GiannaResponseHandler } from "@/components/gianna-response-handler";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// GIANNA worker configuration
const GIANNA_CONFIG = {
  id: "gianna" as const,
  name: "GIANNA",
  role: "Opener",
  tagline: "Your first call friend who keeps it real",
  description:
    "Initial outreach, email capture, and content permission. Gets the email (gateway to the conversation).",
  gradient: "from-purple-500 to-indigo-600",
  color: "purple",
  goals: [
    "Capture email address",
    "Build rapport for next touch",
    "Position Value X offer",
    "Get them curious about their value",
  ],
};

interface WorkerStats {
  totalSent: number;
  responses: number;
  emailsCaptured: number;
  handedToSabrina: number;
  handedToCathy: number;
  optOuts: number;
  avgResponseRate: number;
}

interface QueueLead {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  status: "pending" | "sent" | "replied" | "failed";
  attempts: number;
  lastContactedAt?: string;
}

export default function GiannaCampaignsPage() {
  const { team, teamId, isTeamReady } = useCurrentTeam();
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [stats, setStats] = useState<WorkerStats>({
    totalSent: 0,
    responses: 0,
    emailsCaptured: 0,
    handedToSabrina: 0,
    handedToCathy: 0,
    optOuts: 0,
    avgResponseRate: 0,
  });
  const [activeTab, setActiveTab] = useState("inbox");
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [contentToInsert, setContentToInsert] = useState("");
  const [queueLeads, setQueueLeads] = useState<QueueLead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [queueLoading, setQueueLoading] = useState(false);

  // Fetch phone assignment
  useEffect(() => {
    async function fetchPhone() {
      try {
        const response = await fetch(
          `/api/workers/phone?worker=gianna&teamId=${teamId}`,
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
        const response = await fetch(`/api/gianna/stats?teamId=${teamId}`);
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
          `/api/leads?teamId=${teamId}&worker=gianna&limit=20`,
        );
        const data = await response.json();
        if (data.leads) {
          setQueueLeads(
            data.leads.map((lead: any) => ({
              id: lead.id,
              name: lead.name || lead.fullName || "Unknown",
              company: lead.company || lead.companyName,
              phone: lead.phone || lead.phoneNumber,
              email: lead.email,
              status: lead.workerStatus || "pending",
              attempts: lead.contactAttempts || 0,
              lastContactedAt: lead.lastContactedAt,
            })),
          );
        }
      } catch (error) {
        console.error("Failed to fetch queue:", error);
        // Mock data for demonstration
        setQueueLeads([
          {
            id: "1",
            name: "John's Plumbing",
            company: "Plumbing Co",
            phone: "+1234567890",
            status: "pending",
            attempts: 0,
          },
          {
            id: "2",
            name: "ABC Electric",
            company: "Electric Inc",
            phone: "+1987654321",
            status: "sent",
            attempts: 2,
          },
          {
            id: "3",
            name: "Quick HVAC",
            company: "HVAC Solutions",
            phone: "+1555123456",
            status: "replied",
            attempts: 1,
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

  // Bulk send to pending leads
  const sendAllPending = async () => {
    const pendingLeads = queueLeads.filter((l) => l.status === "pending");
    if (pendingLeads.length === 0) {
      toast.info("No pending leads to send");
      return;
    }

    try {
      const response = await fetch("/api/gianna/send-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: pendingLeads.map((l) => l.id),
          teamId: teamId,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Sent messages to ${pendingLeads.length} leads`);
      }
    } catch (error) {
      toast.error("Failed to send batch");
    }
  };

  // Remove selected leads from queue
  const removeSelectedFromQueue = async () => {
    if (selectedLeads.size === 0) return;

    try {
      const response = await fetch("/api/leads/worker-assign", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: Array.from(selectedLeads),
          worker: "gianna",
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

  // Move selected leads to another worker
  const moveToWorker = async (toWorker: "cathy" | "sabrina") => {
    if (selectedLeads.size === 0) return;

    try {
      const response = await fetch("/api/leads/worker-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: Array.from(selectedLeads),
          fromWorker: "gianna",
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

  // Get status badge color
  const getStatusBadge = (status: QueueLead["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-zinc-800 text-zinc-300">
            Pending
          </Badge>
        );
      case "sent":
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/20 text-blue-300 border-blue-500/50"
          >
            Sent
          </Badge>
        );
      case "replied":
        return (
          <Badge
            variant="outline"
            className="bg-green-500/20 text-green-300 border-green-500/50"
          >
            Replied
          </Badge>
        );
      case "failed":
        return (
          <Badge
            variant="outline"
            className="bg-red-500/20 text-red-300 border-red-500/50"
          >
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Handle content insertion
  const handleContentInsert = (content: { text: string; url?: string }) => {
    setContentToInsert(content.url || content.text);
    toast.success("Content ready to insert");
  };

  // Handle handoff to another worker
  const handleHandoff = async (
    leadId: string,
    toWorker: "cathy" | "sabrina",
  ) => {
    try {
      const endpoint =
        toWorker === "cathy" ? "/api/cathy/schedule" : "/api/sabrina/book";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          fromWorker: "gianna",
          teamId: teamId,
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
      <TeamHeader title="GIANNA - The Opener" />

      <div className="container space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br",
                GIANNA_CONFIG.gradient,
              )}
            >
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <TeamTitle className="flex items-center gap-2">
                {GIANNA_CONFIG.name}
                <Badge
                  variant="outline"
                  className="text-purple-400 border-purple-400/50"
                >
                  {GIANNA_CONFIG.role}
                </Badge>
              </TeamTitle>
              <TeamDescription>{GIANNA_CONFIG.tagline}</TeamDescription>
              <p className="text-sm text-zinc-400 mt-1">
                {GIANNA_CONFIG.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ContentInsertionPicker
              teamId={teamId}
              onInsert={handleContentInsert}
            />
            <Button variant="outline" asChild>
              <TeamLink href="/ai-sdr">
                <Settings className="w-4 h-4 mr-2" />
                Configure AI SDR
              </TeamLink>
            </Button>
          </div>
        </div>

        {/* Phone Assignment Status */}
        <Card className="border-purple-500/30 bg-purple-500/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-sm font-medium text-zinc-100">
                    Assigned Phone Number
                  </p>
                  {phoneNumber ? (
                    <p className="text-lg font-mono text-purple-400">
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
                Messages Sent
              </div>
              <p className="text-2xl font-bold text-zinc-100">
                {(stats.totalSent ?? 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <MessageCircle className="w-3 h-3" />
                Responses
              </div>
              <p className="text-2xl font-bold text-green-400">
                {(stats.responses ?? 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <Mail className="w-3 h-3" />
                Emails Captured
              </div>
              <p className="text-2xl font-bold text-blue-400">
                {(stats.emailsCaptured ?? 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <ArrowRight className="w-3 h-3" />
                To SABRINA
              </div>
              <p className="text-2xl font-bold text-emerald-400">
                {(stats.handedToSabrina ?? 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <Clock className="w-3 h-3" />
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
                <TrendingUp className="w-3 h-3" />
                Response Rate
              </div>
              <p className="text-2xl font-bold text-purple-400">
                {(stats.avgResponseRate ?? 0).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lead Queue Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Lead Queue ({queueLeads.length})
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
                        <DropdownMenuItem onClick={() => moveToWorker("cathy")}>
                          <span className="text-orange-400 font-medium">
                            CATHY
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Nudger)
                          </span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => moveToWorker("sabrina")}
                        >
                          <span className="text-emerald-400 font-medium">
                            SABRINA
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Closer)
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
                  className="gap-1 bg-purple-600 hover:bg-purple-700"
                  onClick={sendAllPending}
                >
                  <Play className="w-4 h-4" />
                  Send All Pending
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
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
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
                      No leads in queue. Assign leads from the Leads page.
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
                        {lead.phone && (
                          <p className="text-xs text-zinc-500">{lead.phone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {lead.company || "—"}
                    </TableCell>
                    <TableCell>{getStatusBadge(lead.status)}</TableCell>
                    <TableCell className="text-zinc-400">
                      {lead.attempts}
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
                              <Send className="w-4 h-4 mr-2" />
                              Send Now
                            </DropdownMenuItem>
                          )}
                          {lead.status === "replied" && (
                            <DropdownMenuItem>
                              <MessageCircle className="w-4 h-4 mr-2" />
                              Reply
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => moveToWorker("cathy")}
                          >
                            <ArrowRight className="w-4 h-4 mr-2 text-orange-400" />
                            Move to CATHY
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => moveToWorker("sabrina")}
                          >
                            <ArrowRight className="w-4 h-4 mr-2 text-emerald-400" />
                            Move to SABRINA
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
          {/* Left: Campaign Actions & Queue */}
          <div className="space-y-6">
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
                  <TeamLink href="/campaigns/create">
                    <span className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Create New Campaign
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </TeamLink>
                </Button>
                <Button
                  className="w-full justify-between"
                  variant="outline"
                  asChild
                >
                  <TeamLink href="/sms/queue">
                    <span className="flex items-center gap-2">
                      <Inbox className="w-4 h-4" />
                      View SMS Queue
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </TeamLink>
                </Button>
                <Button
                  className="w-full justify-between"
                  variant="outline"
                  asChild
                >
                  <TeamLink href="/ai-training">
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Train GIANNA
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </TeamLink>
                </Button>
                <Button
                  className="w-full justify-between"
                  variant="outline"
                  asChild
                >
                  <TeamLink href="/analytics/sms">
                    <span className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      View Analytics
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </TeamLink>
                </Button>
              </CardContent>
            </Card>

            {/* Workflow Visualization */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">GIANNA's Workflow</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {GIANNA_CONFIG.goals.map((goal, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-sm font-medium">
                        {i + 1}
                      </div>
                      <p className="text-sm text-zinc-300">{goal}</p>
                    </div>
                  ))}
                  <div className="border-t border-zinc-800 pt-4 mt-4">
                    <p className="text-xs text-zinc-500 mb-3">
                      Then hands off to:
                    </p>
                    <div className="flex gap-2">
                      <Badge
                        variant="outline"
                        className="border-emerald-500/50 text-emerald-400"
                      >
                        SABRINA (if interested)
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-orange-500/50 text-orange-400"
                      >
                        CATHY (if no response)
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Inbox */}
          <WorkerInbox
            workerId="gianna"
            teamId={teamId}
            phoneNumber={phoneNumber || undefined}
            onHandoff={(leadId, toWorker) => handleHandoff(leadId, toWorker)}
            className="h-[600px]"
          />
        </div>

        {/* Active Campaigns */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Active Campaigns</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <TeamLink href="/campaigns">
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </TeamLink>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">
              Campaigns assigned to GIANNA will appear here. Create a campaign
              and assign GIANNA as the AI SDR to see it listed.
            </p>
          </CardContent>
        </Card>
      </div>
    </TeamSection>
  );
}
