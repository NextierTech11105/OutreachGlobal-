"use client";

import { useState, useEffect } from "react";
import {
  MessageCircle,
  Phone,
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
  Smile,
  Flame,
  Ghost,
  MoreHorizontal,
  Eye,
  Play,
  Trash2,
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

// CATHY worker configuration
const CATHY_CONFIG = {
  id: "cathy" as const,
  name: "CATHY",
  role: "Nudger",
  tagline:
    "Third time's the charm, right? That's what I told my third husband.",
  description:
    "Humor-based re-engagement, ghost revival, and follow-ups. Uses Leslie Nielsen style comedy to break through.",
  gradient: "from-orange-500 to-amber-600",
  color: "orange",
  humorLevels: [
    { name: "Mild", attempts: "1-2", description: "Light, safe jokes" },
    { name: "Medium", attempts: "3-4", description: "More playful, wittier" },
    { name: "Spicy", attempts: "5+", description: "Absurdist, go for broke" },
  ],
  goals: [
    "Re-engage cold leads",
    "Use humor to break through",
    "Revive ghosted conversations",
    "Hand to SABRINA when interested",
  ],
};

interface WorkerStats {
  totalNudges: number;
  revivedLeads: number;
  handedToSabrina: number;
  handedToGianna: number;
  exhaustedLeads: number;
  avgAttemptsToRevive: number;
  humorLevelBreakdown: {
    mild: number;
    medium: number;
    spicy: number;
  };
}

interface QueueLead {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  status: "pending" | "nudging" | "revived" | "exhausted";
  attempts: number;
  humorLevel: "mild" | "medium" | "spicy";
}

export default function CathyCampaignsPage() {
  const { team } = useCurrentTeam();
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [stats, setStats] = useState<WorkerStats>({
    totalNudges: 0,
    revivedLeads: 0,
    handedToSabrina: 0,
    handedToGianna: 0,
    exhaustedLeads: 0,
    avgAttemptsToRevive: 0,
    humorLevelBreakdown: { mild: 0, medium: 0, spicy: 0 },
  });
  const [queueLeads, setQueueLeads] = useState<QueueLead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [queueLoading, setQueueLoading] = useState(false);

  // Fetch phone assignment
  useEffect(() => {
    async function fetchPhone() {
      try {
        const response = await fetch(
          `/api/workers/phone?worker=cathy&teamId=${team.id}`,
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
  }, [team.id]);

  // Fetch stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch(`/api/cathy/stats?teamId=${team.id}`);
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
  }, [team.id]);

  // Fetch queue leads
  useEffect(() => {
    async function fetchQueue() {
      setQueueLoading(true);
      try {
        const response = await fetch(`/api/leads?teamId=${team.id}&worker=cathy&limit=20`);
        const data = await response.json();
        if (data.leads) {
          setQueueLeads(data.leads.map((lead: any) => ({
            id: lead.id,
            name: lead.name || lead.fullName || "Unknown",
            company: lead.company || lead.companyName,
            phone: lead.phone || lead.phoneNumber,
            status: lead.workerStatus || "pending",
            attempts: lead.contactAttempts || 0,
            humorLevel: lead.contactAttempts <= 2 ? "mild" : lead.contactAttempts <= 4 ? "medium" : "spicy",
          })));
        }
      } catch (error) {
        console.error("Failed to fetch queue:", error);
        // Mock data for demonstration
        setQueueLeads([
          { id: "1", name: "Ghosted Gary", company: "Silent Inc", phone: "+1234567890", status: "pending", attempts: 3, humorLevel: "medium" },
          { id: "2", name: "Cold Carl", company: "Frozen LLC", phone: "+1987654321", status: "nudging", attempts: 5, humorLevel: "spicy" },
          { id: "3", name: "Quiet Quinn", company: "Hush Co", phone: "+1555123456", status: "revived", attempts: 2, humorLevel: "mild" },
        ]);
      } finally {
        setQueueLoading(false);
      }
    }
    fetchQueue();
  }, [team.id]);

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

  // Send nudge to all pending leads
  const sendAllPending = async () => {
    const pendingLeads = queueLeads.filter((l) => l.status === "pending");
    if (pendingLeads.length === 0) {
      toast.info("No pending leads to nudge");
      return;
    }
    try {
      const response = await fetch("/api/cathy/nudge-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: pendingLeads.map((l) => l.id), teamId: team.id }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Sent nudges to ${pendingLeads.length} leads`);
      }
    } catch (error) {
      toast.error("Failed to send batch nudges");
    }
  };

  // Remove selected from queue
  const removeSelectedFromQueue = async () => {
    if (selectedLeads.size === 0) return;
    try {
      const response = await fetch("/api/leads/worker-assign", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: Array.from(selectedLeads), worker: "cathy", teamId: team.id }),
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
  const moveToWorker = async (toWorker: "gianna" | "sabrina") => {
    if (selectedLeads.size === 0) return;
    try {
      const response = await fetch("/api/leads/worker-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: Array.from(selectedLeads), fromWorker: "cathy", toWorker, teamId: team.id }),
      });
      const data = await response.json();
      if (data.success) {
        setQueueLeads((prev) => prev.filter((l) => !selectedLeads.has(l.id)));
        setSelectedLeads(new Set());
        toast.success(`Moved ${selectedLeads.size} leads to ${toWorker.toUpperCase()}`);
      }
    } catch (error) {
      toast.error("Failed to move leads");
    }
  };

  // Get status badge
  const getStatusBadge = (status: QueueLead["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-zinc-800 text-zinc-300">Pending</Badge>;
      case "nudging":
        return <Badge variant="outline" className="bg-orange-500/20 text-orange-300 border-orange-500/50">Nudging</Badge>;
      case "revived":
        return <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/50">Revived!</Badge>;
      case "exhausted":
        return <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-500/50">Exhausted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get humor level badge
  const getHumorBadge = (level: QueueLead["humorLevel"]) => {
    switch (level) {
      case "mild":
        return <Badge className="bg-green-600/20 text-green-400 border-green-600/50">Mild</Badge>;
      case "medium":
        return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/50">Medium</Badge>;
      case "spicy":
        return <Badge className="bg-red-600/20 text-red-400 border-red-600/50">Spicy</Badge>;
    }
  };

  // Handle content insertion
  const handleContentInsert = (content: { text: string; url?: string }) => {
    toast.success("Content ready to insert");
  };

  // Handle handoff
  const handleHandoff = async (
    leadId: string,
    toWorker: "gianna" | "sabrina",
  ) => {
    try {
      const endpoint =
        toWorker === "sabrina" ? "/api/sabrina/book" : "/api/gianna/respond";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          fromWorker: "cathy",
          teamId: team.id,
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
      <TeamHeader title="CATHY - The Nudger" />

      <div className="container space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br",
                CATHY_CONFIG.gradient,
              )}
            >
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <div>
              <TeamTitle className="flex items-center gap-2">
                {CATHY_CONFIG.name}
                <Badge
                  variant="outline"
                  className="text-orange-400 border-orange-400/50"
                >
                  {CATHY_CONFIG.role}
                </Badge>
              </TeamTitle>
              <TeamDescription>{CATHY_CONFIG.tagline}</TeamDescription>
              <p className="text-sm text-zinc-400 mt-1">
                {CATHY_CONFIG.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ContentInsertionPicker
              teamId={team.id}
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
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-sm font-medium text-zinc-100">
                    Assigned Phone Number
                  </p>
                  {phoneNumber ? (
                    <p className="text-lg font-mono text-orange-400">
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
                Total Nudges
              </div>
              <p className="text-2xl font-bold text-zinc-100">
                {(stats.totalNudges ?? 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <Ghost className="w-3 h-3" />
                Leads Revived
              </div>
              <p className="text-2xl font-bold text-green-400">
                {(stats.revivedLeads ?? 0).toLocaleString()}
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
                <ArrowRight className="w-3 h-3" />
                Back to GIANNA
              </div>
              <p className="text-2xl font-bold text-purple-400">
                {(stats.handedToGianna ?? 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <Clock className="w-3 h-3" />
                Avg Attempts
              </div>
              <p className="text-2xl font-bold text-orange-400">
                {(stats.avgAttemptsToRevive ?? 0).toFixed(1)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <TrendingUp className="w-3 h-3" />
                Revival Rate
              </div>
              <p className="text-2xl font-bold text-yellow-400">
                {(stats.totalNudges ?? 0) > 0
                  ? (
                      ((stats.revivedLeads ?? 0) / (stats.totalNudges ?? 1)) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lead Queue Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Ghost className="w-5 h-5 text-orange-400" />
                Nudge Queue ({queueLeads.length})
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
                        <DropdownMenuItem onClick={() => moveToWorker("gianna")}>
                          <span className="text-purple-400 font-medium">GIANNA</span>
                          <span className="ml-2 text-xs text-muted-foreground">(Opener)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => moveToWorker("sabrina")}>
                          <span className="text-emerald-400 font-medium">SABRINA</span>
                          <span className="ml-2 text-xs text-muted-foreground">(Closer)</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button size="sm" variant="destructive" onClick={removeSelectedFromQueue} className="gap-1">
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </Button>
                  </>
                )}
                <Button size="sm" className="gap-1 bg-orange-600 hover:bg-orange-700" onClick={sendAllPending}>
                  <Play className="w-4 h-4" />
                  Nudge All Pending
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
                      checked={selectedLeads.size === queueLeads.length && queueLeads.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Humor Level</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueLeads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-zinc-500 py-8">
                      No leads in nudge queue. Assign leads from the Leads page.
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
                        {lead.company && <p className="text-xs text-zinc-500">{lead.company}</p>}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(lead.status)}</TableCell>
                    <TableCell className="text-zinc-400">{lead.attempts}</TableCell>
                    <TableCell>{getHumorBadge(lead.humorLevel)}</TableCell>
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
                              <Smile className="w-4 h-4 mr-2" />
                              Send Nudge
                            </DropdownMenuItem>
                          )}
                          {lead.status === "revived" && (
                            <DropdownMenuItem onClick={() => handleHandoff(lead.id, "sabrina")}>
                              <ArrowRight className="w-4 h-4 mr-2 text-emerald-400" />
                              Hand to SABRINA
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => moveToWorker("gianna")}>
                            <ArrowRight className="w-4 h-4 mr-2 text-purple-400" />
                            Move to GIANNA
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => moveToWorker("sabrina")}>
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
          {/* Left: Humor Levels & Actions */}
          <div className="space-y-6">
            {/* Humor Temperature */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Smile className="w-5 h-5 text-yellow-400" />
                  Humor Temperature
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {CATHY_CONFIG.humorLevels.map((level, i) => (
                  <div
                    key={level.name}
                    className={cn(
                      "p-3 rounded-lg border",
                      i === 0 && "border-green-500/30 bg-green-500/5",
                      i === 1 && "border-yellow-500/30 bg-yellow-500/5",
                      i === 2 && "border-red-500/30 bg-red-500/5",
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-zinc-100">
                        {level.name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        Attempts {level.attempts}
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-400">{level.description}</p>
                    <div className="mt-2 flex items-center gap-1">
                      {[...Array(i === 0 ? 2 : i === 1 ? 4 : 5)].map((_, j) => (
                        <Flame
                          key={j}
                          className={cn(
                            "w-3 h-3",
                            i === 0 && "text-green-400",
                            i === 1 && "text-yellow-400",
                            i === 2 && "text-red-400",
                          )}
                        />
                      ))}
                    </div>
                  </div>
                ))}
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
                  <TeamLink href="/campaigns">
                    <span className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      View Active Campaigns
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
                      View Nudge Queue
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </TeamLink>
                </Button>
                <Button
                  className="w-full justify-between"
                  variant="outline"
                  asChild
                >
                  <TeamLink href="/analytics/nudges">
                    <span className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Nudge Analytics
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </TeamLink>
                </Button>
              </CardContent>
            </Card>

            {/* Workflow */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">CATHY's Workflow</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {CATHY_CONFIG.goals.map((goal, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-sm font-medium">
                        {i + 1}
                      </div>
                      <p className="text-sm text-zinc-300">{goal}</p>
                    </div>
                  ))}
                  <div className="border-t border-zinc-800 pt-4 mt-4">
                    <p className="text-xs text-zinc-500 mb-3">Lead sources:</p>
                    <div className="flex gap-2">
                      <Badge
                        variant="outline"
                        className="border-purple-500/50 text-purple-400"
                      >
                        From GIANNA (no response)
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-emerald-500/50 text-emerald-400"
                      >
                        From SABRINA (backed off)
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Inbox */}
          <WorkerInbox
            workerId="cathy"
            teamId={team.id}
            phoneNumber={phoneNumber || undefined}
            onHandoff={(leadId, toWorker) =>
              handleHandoff(leadId, toWorker as "gianna" | "sabrina")
            }
            className="h-[600px]"
          />
        </div>
      </div>
    </TeamSection>
  );
}
