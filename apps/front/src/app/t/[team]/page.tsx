"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Brain,
  Rocket,
  Calendar,
  Users,
  Phone,
  BarChart3,
  ArrowRight,
  Sparkles,
  MessageCircle,
  CheckCircle,
  Clock,
  Send,
  Inbox,
  Target,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { useCurrentTeam } from "@/features/team/team.context";
import { cn } from "@/lib/utils";

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  badge?: string;
}

// Pipeline stages - Action-based, no fluff
// RAW → READY → QUEUED → SENT → REPLIED → BOOKED
const PIPELINE_STAGES = [
  {
    key: "raw",
    label: "RAW",
    description: "In database, not enriched",
    color: "bg-slate-500",
    textColor: "text-slate-300",
  },
  {
    key: "ready",
    label: "READY",
    description: "Skip traced, has phone",
    color: "bg-blue-500",
    textColor: "text-blue-300",
  },
  {
    key: "queued",
    label: "QUEUED",
    description: "In a blast block",
    color: "bg-purple-500",
    textColor: "text-purple-300",
  },
  {
    key: "sent",
    label: "SENT",
    description: "SMS delivered",
    color: "bg-amber-500",
    textColor: "text-amber-300",
  },
  {
    key: "replied",
    label: "REPLIED",
    description: "Got response",
    color: "bg-cyan-500",
    textColor: "text-cyan-300",
  },
  {
    key: "booked",
    label: "BOOKED",
    description: "Meeting scheduled",
    color: "bg-green-600",
    textColor: "text-green-300",
  },
];

export default function TeamHomePage() {
  const { team, teamId, isTeamReady } = useCurrentTeam();
  const [stats, setStats] = useState({
    pendingMessages: 0,
    sentToday: 0,
    leadsReady: 0,
    activeCampaigns: 0,
  });
  const [pipelineStats, setPipelineStats] = useState<Record<string, number>>({
    raw: 0,
    ready: 0,
    queued: 0,
    sent: 0,
    replied: 0,
    booked: 0,
  });
  const [loading, setLoading] = useState(true);

  // Bail out early if team context has not loaded yet
  if (!team) {
    return (
      <TeamSection className="h-full flex flex-col">
        <TeamHeader>
          <TeamTitle>
            <Target className="w-6 h-6 mr-2" />
            Command Center
          </TeamTitle>
        </TeamHeader>
        <div className="p-4 text-sm text-zinc-400">Loading team…</div>
      </TeamSection>
    );
  }

  // Fetch stats
  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch SMS queue stats
        const queueRes = await fetch(`/api/sms/queue?teamId=${teamId}`);
        const queueData = await queueRes.json();

        // Fetch conversation stats
        const convRes = await fetch(
          `/api/sms/conversations?teamId=${teamId}&limit=1`,
        );
        const convData = await convRes.json();

        // Fetch pipeline stats (lead counts by status)
        const pipelineRes = await fetch(
          `/api/leads?teamId=${teamId}&action=pipeline_stats`,
        );
        const pipelineData = await pipelineRes.json();

        setStats({
          pendingMessages: convData.stats?.pending || 0,
          sentToday: queueData.stats?.sent || 0,
          leadsReady: queueData.stats?.dailyRemaining || 0,
          activeCampaigns: pipelineData.activeCampaigns || 0,
        });

        // Set pipeline stats from API - zeros if not available
        if (pipelineData.pipeline) {
          setPipelineStats(pipelineData.pipeline);
        }
        // Otherwise keep initial zeros from useState
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [teamId]);

  const quickActions: QuickAction[] = [
    {
      title: "SMS Command Center",
      description: "View conversations, reply to leads",
      href: `/t/${team.slug}/sms/command-center`,
      icon: <MessageSquare className="h-6 w-6" />,
      color: "from-purple-500 to-indigo-600",
      badge:
        stats.pendingMessages > 0
          ? `${stats.pendingMessages} pending`
          : undefined,
    },
    {
      title: "LUCI Data Engine",
      description: "Browse databases, scan for leads",
      href: `/t/${team.slug}/data/luci`,
      icon: <Brain className="h-6 w-6" />,
      color: "from-indigo-500 to-purple-600",
    },
    {
      title: "Launch Campaign",
      description: "Create new outreach campaign",
      href: `/t/${team.slug}/campaigns/create`,
      icon: <Rocket className="h-6 w-6" />,
      color: "from-green-500 to-emerald-600",
    },
    {
      title: "Inbox",
      description: "All messages and responses",
      href: `/t/${team.slug}/inbox`,
      icon: <Inbox className="h-6 w-6" />,
      color: "from-blue-500 to-cyan-600",
    },
    {
      title: "Leads",
      description: "Manage your lead pipeline",
      href: `/t/${team.slug}/leads`,
      icon: <Users className="h-6 w-6" />,
      color: "from-orange-500 to-amber-600",
    },
    {
      title: "Analytics",
      description: "Campaign performance metrics",
      href: `/t/${team.slug}/analytics`,
      icon: <BarChart3 className="h-6 w-6" />,
      color: "from-pink-500 to-rose-600",
    },
  ];

  const aiWorkers = [
    {
      name: "GIANNA",
      role: "Opener",
      description: "Initial outreach, email capture",
      icon: <Sparkles className="h-5 w-5" />,
      color: "bg-purple-500",
      href: `/t/${team.slug}/campaigns/gianna`,
    },
    {
      name: "CATHY",
      role: "Nudger",
      description: "Humor-based re-engagement",
      icon: <MessageCircle className="h-5 w-5" />,
      color: "bg-orange-500",
      href: `/t/${team.slug}/campaigns/cathy`,
    },
    {
      name: "SABRINA",
      role: "Closer",
      description: "Booking, objection handling",
      icon: <CheckCircle className="h-5 w-5" />,
      color: "bg-emerald-500",
      href: `/t/${team.slug}/campaigns/sabrina`,
    },
  ];

  return (
    <TeamSection className="h-full flex flex-col">
      <TeamHeader>
        <TeamTitle>
          <Target className="w-6 h-6 mr-2" />
          Command Center
        </TeamTitle>
      </TeamHeader>

      <div className="flex-1 p-4 space-y-6 overflow-auto">
        {/* Pipeline Funnel */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-zinc-400" />
              Lead Pipeline
            </CardTitle>
            <CardDescription>
              Click any stage to view those leads
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-stretch gap-1 overflow-x-auto pb-2">
              {PIPELINE_STAGES.map((stage, index) => {
                const count = pipelineStats[stage.key] || 0;
                const total =
                  Object.values(pipelineStats).reduce((a, b) => a + b, 0) || 1;
                const percentage = Math.round((count / total) * 100);

                return (
                  <Link
                    key={stage.key}
                    href={`/t/${team.slug}/leads?status=${stage.key}`}
                    className="flex-1 min-w-[100px] group"
                  >
                    <div className="relative h-24 flex flex-col items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-600 transition-all cursor-pointer">
                      {/* Color bar at top */}
                      <div
                        className={cn(
                          "absolute top-0 left-0 right-0 h-1 rounded-t-lg",
                          stage.color,
                        )}
                      />

                      {/* Count */}
                      <span
                        className={cn("text-2xl font-bold", stage.textColor)}
                      >
                        {count.toLocaleString()}
                      </span>

                      {/* Label */}
                      <span className="text-xs text-zinc-400 mt-1">
                        {stage.label}
                      </span>

                      {/* Arrow indicator between stages */}
                      {index < PIPELINE_STAGES.length - 1 && (
                        <ArrowRight className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 z-10" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Total leads summary */}
            <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between text-sm">
              <span className="text-zinc-400">
                Total Leads:{" "}
                <span className="text-zinc-100 font-medium">
                  {Object.values(pipelineStats)
                    .reduce((a, b) => a + b, 0)
                    .toLocaleString()}
                </span>
              </span>
              <span className="text-zinc-500">
                Conversion:{" "}
                <span className="text-green-400 font-medium">
                  {Object.values(pipelineStats).reduce((a, b) => a + b, 0) > 0
                    ? Math.round(
                        (pipelineStats.booked /
                          Object.values(pipelineStats).reduce(
                            (a, b) => a + b,
                            0,
                          )) *
                          100,
                      )
                    : 0}
                  %
                </span>{" "}
                to Booked
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <Clock className="w-3 h-3" />
                Pending Replies
              </div>
              <p className="text-2xl font-bold text-yellow-400">
                {(stats.pendingMessages ?? 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <Send className="w-3 h-3" />
                Sent Today
              </div>
              <p className="text-2xl font-bold text-blue-400">
                {(stats.sentToday ?? 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <Users className="w-3 h-3" />
                Leads Ready
              </div>
              <p className="text-2xl font-bold text-green-400">
                {(stats.leadsReady ?? 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <Zap className="w-3 h-3" />
                Active Campaigns
              </div>
              <p className="text-2xl font-bold text-purple-400">
                {(stats.activeCampaigns ?? 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors h-full cursor-pointer">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br text-white",
                          action.color,
                        )}
                      >
                        {action.icon}
                      </div>
                      {action.badge && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                          {action.badge}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-medium text-zinc-100 mt-3">
                      {action.title}
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1">
                      {action.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* AI Workers */}
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">
            AI Workers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {aiWorkers.map((worker) => (
              <Link key={worker.href} href={worker.href}>
                <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-white",
                          worker.color,
                        )}
                      >
                        {worker.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-zinc-100">
                            {worker.name}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {worker.role}
                          </Badge>
                        </div>
                        <p className="text-sm text-zinc-400">
                          {worker.description}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-600 ml-auto" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Daily Capacity */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Daily Capacity</CardTitle>
            <CardDescription>10DLC compliant messaging limits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-400">SMS Sent Today</span>
                  <span className="text-zinc-100">
                    {stats.sentToday} / 2,000
                  </span>
                </div>
                <Progress
                  value={(stats.sentToday / 2000) * 100}
                  className="h-2"
                />
              </div>
              <p className="text-xs text-zinc-500">
                T-Mobile default: 2,000 segments/day per campaign. Messages
                reset at midnight.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </TeamSection>
  );
}
