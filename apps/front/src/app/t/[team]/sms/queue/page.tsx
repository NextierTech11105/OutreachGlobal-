"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { useCurrentTeam } from "@/features/team/team.context";

interface QueueStats {
  pending: number;
  sent: number;
  delivered: number;
  failed: number;
  dailyRemaining: number;
}

export default function SmsQueuePage() {
  const { team } = useCurrentTeam();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<QueueStats>({
    pending: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    dailyRemaining: 2000,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch(`/api/sms/queue?teamId=${team.id}`);
        const data = await response.json();
        if (data.success) {
          setStats(data.stats || stats);
        }
      } catch (error) {
        console.error("Failed to fetch queue stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [team.id]);

  return (
    <TeamSection>
      <TeamHeader>
        <TeamTitle>
          <MessageSquare className="w-6 h-6 mr-2" />
          SMS Queue
        </TeamTitle>
      </TeamHeader>

      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-zinc-400">
            Monitor and manage your SMS sending queue
          </p>
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                    <Clock className="w-3 h-3" />
                    Pending
                  </div>
                  <p className="text-2xl font-bold text-yellow-400">
                    {(stats.pending ?? 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                    <Send className="w-3 h-3" />
                    Sent
                  </div>
                  <p className="text-2xl font-bold text-blue-400">
                    {(stats.sent ?? 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                    <CheckCircle className="w-3 h-3" />
                    Delivered
                  </div>
                  <p className="text-2xl font-bold text-green-400">
                    {(stats.delivered ?? 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                    <XCircle className="w-3 h-3" />
                    Failed
                  </div>
                  <p className="text-2xl font-bold text-red-400">
                    {(stats.failed ?? 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                    <MessageSquare className="w-3 h-3" />
                    Daily Remaining
                  </div>
                  <p className="text-2xl font-bold text-zinc-100">
                    {(stats.dailyRemaining ?? 2000).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Queue Info */}
            <Card>
              <CardHeader>
                <CardTitle>Queue Status</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-400">
                  SMS queue is operational. Messages are processed at up to
                  100/minute with a daily limit of 2,000 messages via
                  10DLC compliant infrastructure.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </TeamSection>
  );
}
