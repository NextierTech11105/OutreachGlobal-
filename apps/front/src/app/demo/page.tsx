"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Eye,
  Lock,
  Users,
  MessageSquare,
  TrendingUp,
  Calendar,
  BarChart3,
  Phone,
  Mail,
  Sparkles,
} from "lucide-react";
import { enableDemoMode, DEMO_USER } from "@/lib/demo/demo-data";

/**
 * DEMO LOGIN PAGE
 * ═══════════════════════════════════════════════════════════════════════════════
 * Public demo access with read-only data
 *
 * Shows:
 * - Simulated 20K leads "in play"
 * - 10-20% response rates
 * - All SMS stages
 * - SignalHouse dashboard mapping
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export default function DemoPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleEnterDemo = () => {
    setIsLoading(true);
    enableDemoMode();
    // Short delay for effect
    setTimeout(() => {
      router.push("/demo/dashboard");
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Hero Section */}
      <div className="container max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">
            <Eye className="h-3 w-3 mr-1" />
            Live Demo - Read Only
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            See The Machine in Action
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Explore a fully simulated Nextier instance with 20,000 leads in
            play, real-time response tracking, and AI-powered outreach.
          </p>
        </div>

        {/* What You'll See */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
          <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
            <CardHeader className="pb-2">
              <Users className="h-8 w-8 text-purple-600 mb-2" />
              <CardTitle className="text-lg">20,000 Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                See the stabilized database with leads across all tiers
                (A/B/C/D) and response stages.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
            <CardHeader className="pb-2">
              <MessageSquare className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle className="text-lg">SMS Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                2,000/day blocks with 10-20% response rates. Initial, retarget,
                and follow-up stages.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-background">
            <CardHeader className="pb-2">
              <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
              <CardTitle className="text-lg">Live Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Delivery rates, response heatmaps, tier performance, and worker
                attribution.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-950/20 dark:to-background">
            <CardHeader className="pb-2">
              <Sparkles className="h-8 w-8 text-yellow-600 mb-2" />
              <CardTitle className="text-lg">AI Workers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Meet GIANNA, CATHY, and SABRINA. See how they handle the full
                response lifecycle.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Demo Stats Preview */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Live Demo Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-3xl font-bold text-primary">20,000</div>
                <div className="text-sm text-muted-foreground">
                  Leads in Play
                </div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">15%</div>
                <div className="text-sm text-muted-foreground">
                  Avg Response Rate
                </div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">60,000+</div>
                <div className="text-sm text-muted-foreground">
                  SMS Sent/Month
                </div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">97%</div>
                <div className="text-sm text-muted-foreground">
                  Delivery Rate
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Access */}
        <div className="text-center">
          <Card className="inline-block p-8 max-w-md mx-auto">
            <div className="mb-6">
              <div className="h-16 w-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Play className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Enter Demo Mode</h2>
              <p className="text-muted-foreground">
                Explore the full platform with simulated data. No login
                required.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6 p-3 bg-muted/50 rounded-lg">
              <Lock className="h-4 w-4" />
              <span>Read-only access - No changes will be saved</span>
            </div>

            <Button
              size="lg"
              className="w-full text-lg"
              onClick={handleEnterDemo}
              disabled={isLoading}
            >
              {isLoading ? (
                "Loading Demo..."
              ) : (
                <>
                  <Eye className="mr-2 h-5 w-5" />
                  View Live Demo
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground mt-4">
              Demo user: {DEMO_USER.email}
            </p>
          </Card>
        </div>

        {/* Features List */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            What You Can Explore
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
            {[
              { icon: Users, text: "Lead Database with Tier Scoring" },
              { icon: MessageSquare, text: "SMS Campaign Blocks" },
              { icon: Phone, text: "Call Queue with Gold Labels" },
              { icon: Mail, text: "Response Inbox" },
              { icon: Calendar, text: "Appointment Calendar" },
              { icon: TrendingUp, text: "Analytics Dashboard" },
              { icon: BarChart3, text: "SignalHouse Integration" },
              { icon: Sparkles, text: "AI Worker Performance" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg border"
              >
                <item.icon className="h-5 w-5 text-primary" />
                <span className="text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
