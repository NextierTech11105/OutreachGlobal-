"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Rocket,
  ArrowRight,
  Calendar,
  Phone,
  MessageSquare,
  LayoutDashboard,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SUCCESS PAGE - Post-Onboarding
 * ═══════════════════════════════════════════════════════════════════════════════
 * Clean celebration page after onboarding completion.
 * Routes based on context:
 * - First time user: Shows guided tour options
 * - Demo mode: Shows "Schedule follow-up" CTA
 * - Returning user: Quick access to dashboard
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Calendly link - centralized config
import { CALENDLY_CONFIG } from "@/config/constants";
const CALENDLY_LINK = CALENDLY_CONFIG.meetingTypes["15min"].url;

export default function SuccessPage({
  params,
}: {
  params: Promise<{ team: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const [teamId, setTeamId] = useState<string>("");

  useEffect(() => {
    params.then((p) => setTeamId(p.team));
  }, [params]);

  const quickActions = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      description: "Monitor your campaigns",
      href: `/t/${teamId}/dashboard`,
      primary: true,
    },
    {
      icon: MessageSquare,
      label: "Command Center",
      description: "View all conversations",
      href: `/t/${teamId}/command`,
      primary: false,
    },
    {
      icon: Users,
      label: "Lead Manager",
      description: "Browse your leads",
      href: `/t/${teamId}/leads`,
      primary: false,
    },
    {
      icon: Zap,
      label: "Quick Send",
      description: "Send SMS instantly",
      href: `/t/${teamId}/quick-send`,
      primary: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Success Icon */}
        <div className="relative inline-block">
          <div className="absolute inset-0 animate-ping bg-green-500/20 rounded-full" />
          <div className="relative h-24 w-24 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <Badge className="mb-2" variant="secondary">
            <Rocket className="h-3 w-3 mr-1" />
            Machine Activated
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight">
            You&apos;re Live!
          </h1>
          <p className="text-xl text-muted-foreground">
            Your AI team is ready to start reaching out.
          </p>
        </div>

        {/* What's Happening */}
        <Card className="text-left">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              What&apos;s Happening Now
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 text-sm font-bold shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium">GIANNA is warming up</p>
                  <p className="text-sm text-muted-foreground">
                    First messages go out within the next hour (respecting 9am-8pm local time)
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 text-sm font-bold shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium">Your dashboard is ready</p>
                  <p className="text-sm text-muted-foreground">
                    Track opens, responses, and conversions in real-time
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 text-sm font-bold shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium">Notifications enabled</p>
                  <p className="text-sm text-muted-foreground">
                    You&apos;ll get alerts when leads respond or need attention
                  </p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Demo Mode CTA */}
        {isDemo && (
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Ready to Go Live?</h3>
              <p className="text-primary-foreground/80 mb-4">
                Let&apos;s set up your real account and get your team rolling.
              </p>
              <a href={CALENDLY_LINK} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Follow-up Call
                </Button>
              </a>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="space-y-4">
          <h3 className="font-medium text-muted-foreground">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.label} href={action.href}>
                  <Card
                    className={cn(
                      "p-4 hover:shadow-md transition-all cursor-pointer h-full",
                      action.primary && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "p-2 rounded-lg",
                          action.primary ? "bg-primary/10" : "bg-muted"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-5 w-5",
                            action.primary ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{action.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Go to Dashboard */}
        <Button
          size="lg"
          className="w-full sm:w-auto"
          onClick={() => router.push(`/t/${teamId}/dashboard`)}
        >
          Go to Dashboard
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        {/* Support */}
        <p className="text-sm text-muted-foreground">
          Questions?{" "}
          <a href={CALENDLY_LINK} className="text-primary hover:underline">
            Book a call
          </a>{" "}
          or email{" "}
          <a href="mailto:support@nextier.ai" className="text-primary hover:underline">
            support@nextier.ai
          </a>
        </p>
      </div>
    </div>
  );
}
