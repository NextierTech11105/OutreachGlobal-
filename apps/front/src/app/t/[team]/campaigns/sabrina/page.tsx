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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
// SABRINA ONLY confirms and reminds about EXISTING appointments
// She does NOT book appointments, handle objections, or close leads
const SABRINA_CONFIG = {
  id: "sabrina" as const,
  name: "SABRINA",
  role: "Appointment Confirmer",
  tagline: "Your appointment reminder assistant",
  description:
    "Confirms booked appointments and sends reminders to recipients. Ensures people show up on time.",
  gradient: "from-emerald-500 to-teal-600",
  color: "emerald",
  confirmationWorkflow: [
    {
      step: "CONFIRM",
      description: "Send confirmation when appointment is booked",
    },
    { step: "REMIND", description: "Send reminder 24 hours before" },
    { step: "DAY-OF", description: "Send day-of reminder 1 hour before" },
  ],
  goals: [
    "Confirm all booked appointments",
    "Send 24-hour reminders",
    "Send day-of reminders",
    "Reduce no-shows",
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

export default function SabrinaCampaignsPage() {
  const { team } = useCurrentTeam();
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

  // Fetch phone assignment
  useEffect(() => {
    async function fetchPhone() {
      try {
        const response = await fetch(
          `/api/workers/phone?worker=sabrina&teamId=${team.id}`,
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
        const response = await fetch(`/api/sabrina/stats?teamId=${team.id}`);
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
          teamId: team.id,
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
      <TeamHeader title="SABRINA - The Closer" />

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
              teamId={team.id}
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
                {stats.totalOutreach.toLocaleString()}
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
                {stats.appointmentsBooked.toLocaleString()}
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
                {stats.objectionsHandled.toLocaleString()}
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
                {stats.conversionRate.toFixed(1)}%
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
                {stats.handedToCathy.toLocaleString()}
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
                {stats.avgRebuttalsToBook.toFixed(1)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Strategy & Actions */}
          <div className="space-y-6">
            {/* Agree-Overcome-Close Strategy */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-400" />
                  Agree-Overcome-Close Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {SABRINA_CONFIG.objectionStrategy.map((strategy, i) => (
                  <div
                    key={strategy.step}
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
                        {strategy.step}
                      </p>
                      <p className="text-sm text-zinc-400">
                        {strategy.description}
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
            teamId={team.id}
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
