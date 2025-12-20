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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function GiannaCampaignsPage() {
  const { team } = useCurrentTeam();
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

  // Fetch phone assignment
  useEffect(() => {
    async function fetchPhone() {
      try {
        const response = await fetch(
          `/api/workers/phone?worker=gianna&teamId=${team.id}`
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
        const response = await fetch(
          `/api/gianna/stats?teamId=${team.id}`
        );
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

  // Handle content insertion
  const handleContentInsert = (content: { text: string; url?: string }) => {
    setContentToInsert(content.url || content.text);
    toast.success("Content ready to insert");
  };

  // Handle handoff to another worker
  const handleHandoff = async (leadId: string, toWorker: "cathy" | "sabrina") => {
    try {
      const endpoint = toWorker === "cathy"
        ? "/api/cathy/schedule"
        : "/api/sabrina/book";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          fromWorker: "gianna",
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
      <TeamHeader title="GIANNA - The Opener" />

      <div className="container space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br",
                GIANNA_CONFIG.gradient
              )}
            >
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <TeamTitle className="flex items-center gap-2">
                {GIANNA_CONFIG.name}
                <Badge variant="outline" className="text-purple-400 border-purple-400/50">
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
                {stats.totalSent.toLocaleString()}
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
                {stats.responses.toLocaleString()}
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
                {stats.emailsCaptured.toLocaleString()}
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
                {stats.handedToSabrina.toLocaleString()}
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
                {stats.handedToCathy.toLocaleString()}
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
                {stats.avgResponseRate.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>

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
                <Button className="w-full justify-between" variant="outline" asChild>
                  <TeamLink href="/campaigns/create">
                    <span className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Create New Campaign
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </TeamLink>
                </Button>
                <Button className="w-full justify-between" variant="outline" asChild>
                  <TeamLink href="/sms/queue">
                    <span className="flex items-center gap-2">
                      <Inbox className="w-4 h-4" />
                      View SMS Queue
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </TeamLink>
                </Button>
                <Button className="w-full justify-between" variant="outline" asChild>
                  <TeamLink href="/ai-training">
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Train GIANNA
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </TeamLink>
                </Button>
                <Button className="w-full justify-between" variant="outline" asChild>
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
                    <p className="text-xs text-zinc-500 mb-3">Then hands off to:</p>
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
            teamId={team.id}
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
              Campaigns assigned to GIANNA will appear here. Create a campaign and
              assign GIANNA as the AI SDR to see it listed.
            </p>
          </CardContent>
        </Card>
      </div>
    </TeamSection>
  );
}
