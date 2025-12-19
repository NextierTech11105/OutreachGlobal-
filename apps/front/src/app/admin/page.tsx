"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Megaphone,
  Database,
  Zap,
  Workflow,
  Clock,
  Bot,
  Settings,
  AlertTriangle,
  CheckCircle,
  PhoneCall,
  Mail,
  MessageSquare,
  AlertCircle,
  Cable,
  XCircle,
  Loader2,
  Building2,
  Sparkles,
  Target,
  ArrowRight,
  Search,
  UserCheck,
  Briefcase,
  Home,
  Send,
  Handshake,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

interface SystemStatus {
  database: "operational" | "degraded" | "down" | "unknown";
  twilio: "operational" | "not_configured" | "error" | "unknown";
  zoho: "operational" | "not_configured" | "error" | "unknown";
  email: "operational" | "not_configured" | "error" | "unknown";
  sms: "operational" | "not_configured" | "error" | "unknown";
  ai: "operational" | "not_configured" | "error" | "unknown";
  batchProcessor: "operational" | "degraded" | "down" | "unknown";
}

function StatusBadge({ status }: { status: string }) {
  if (status === "operational") {
    return (
      <div className="flex items-center text-green-500">
        <CheckCircle className="mr-1 h-4 w-4" />
        <span>Operational</span>
      </div>
    );
  }
  if (status === "not_configured") {
    return (
      <div className="flex items-center text-yellow-500">
        <AlertTriangle className="mr-1 h-4 w-4" />
        <span>Not Configured</span>
      </div>
    );
  }
  if (status === "degraded") {
    return (
      <div className="flex items-center text-yellow-500">
        <AlertTriangle className="mr-1 h-4 w-4" />
        <span>Degraded</span>
      </div>
    );
  }
  if (status === "error" || status === "down") {
    return (
      <div className="flex items-center text-red-500">
        <XCircle className="mr-1 h-4 w-4" />
        <span>Error</span>
      </div>
    );
  }
  return (
    <div className="flex items-center text-zinc-500">
      <AlertCircle className="mr-1 h-4 w-4" />
      <span>Unknown</span>
    </div>
  );
}

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    apiRequests: 0,
    activeJobs: 0,
    systemAlerts: 0,
  });
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: "unknown",
    twilio: "unknown",
    zoho: "unknown",
    email: "unknown",
    sms: "unknown",
    ai: "unknown",
    batchProcessor: "unknown",
  });
  const [recentActivity, setRecentActivity] = useState<
    Array<{
      id: string;
      type: string;
      description: string;
      time: string;
    }>
  >([]);

  useEffect(() => {
    const checkIntegrations = async () => {
      setIsLoading(true);

      // Check all integrations in parallel
      const [twilioRes, signalhouseRes, apolloRes] = await Promise.all([
        fetch("/api/twilio/test")
          .then((r) => r.json())
          .catch(() => ({ configured: false })),
        fetch("/api/signalhouse")
          .then((r) => r.json())
          .catch(() => ({ configured: false })),
        fetch("/api/apollo/test")
          .then((r) => r.json())
          .catch(() => ({ configured: false })),
      ]);

      setSystemStatus({
        database: "operational",
        twilio: twilioRes.configured ? "operational" : "not_configured",
        zoho: "not_configured", // TODO: Add Zoho API check
        email: "not_configured", // TODO: Add SendGrid API check
        sms: signalhouseRes.configured ? "operational" : "not_configured",
        ai: apolloRes.configured ? "operational" : "not_configured",
        batchProcessor: "operational",
      });

      setStats({
        totalUsers: 0,
        apiRequests: 0,
        activeJobs: 0,
        systemAlerts: 0,
      });
      setRecentActivity([]);
      setIsLoading(false);
    };

    checkIntegrations();
  }, []);

  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-screen">
      <div className="border-b border-zinc-800 p-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-zinc-400 mt-2">
          Overview of system performance and key metrics
        </p>
      </div>

      <div className="p-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                ) : (
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                )}
                <Users className="h-4 w-4 text-zinc-500" />
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                {stats.totalUsers === 0 ? "No users yet" : "Active accounts"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                API Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                ) : (
                  <div className="text-2xl font-bold">{stats.apiRequests}</div>
                )}
                <Zap className="h-4 w-4 text-zinc-500" />
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                {stats.apiRequests === 0 ? "No requests yet" : "This month"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Active Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                ) : (
                  <div className="text-2xl font-bold">{stats.activeJobs}</div>
                )}
                <Clock className="h-4 w-4 text-zinc-500" />
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                {stats.activeJobs === 0 ? "No active jobs" : "Running now"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                System Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                ) : (
                  <div className="text-2xl font-bold">{stats.systemAlerts}</div>
                )}
                <AlertCircle
                  className={`h-4 w-4 ${stats.systemAlerts > 0 ? "text-amber-500" : "text-zinc-500"}`}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                {stats.systemAlerts === 0 ? "No alerts" : "View alerts"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-6">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>
                Overview of system components and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Database className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Database</span>
                  </div>
                  <StatusBadge status={systemStatus.database} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <PhoneCall className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Twilio Integration</span>
                  </div>
                  <StatusBadge status={systemStatus.twilio} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Zap className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Zoho CRM Integration</span>
                  </div>
                  <StatusBadge status={systemStatus.zoho} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Email Service</span>
                  </div>
                  <StatusBadge status={systemStatus.email} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MessageSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>SMS Service</span>
                  </div>
                  <StatusBadge status={systemStatus.sms} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Bot className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>AI Services</span>
                  </div>
                  <StatusBadge status={systemStatus.ai} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Batch Job Processor</span>
                  </div>
                  <StatusBadge status={systemStatus.batchProcessor} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Link href="/admin/users">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    Manage Users
                  </Button>
                </Link>

                <Link href="/admin/integrations/twilio">
                  <Button variant="outline" className="w-full justify-start">
                    <PhoneCall className="mr-2 h-4 w-4" />
                    Twilio Settings
                  </Button>
                </Link>

                <Link href="/admin/campaigns/automation">
                  <Button variant="outline" className="w-full justify-start">
                    <Megaphone className="mr-2 h-4 w-4" />
                    Campaign Rules
                  </Button>
                </Link>

                <Link href="/admin/workflows">
                  <Button variant="outline" className="w-full justify-start">
                    <Workflow className="mr-2 h-4 w-4" />
                    Workflows
                  </Button>
                </Link>

                <Link href="/admin/batch-jobs">
                  <Button variant="outline" className="w-full justify-start">
                    <Clock className="mr-2 h-4 w-4" />
                    Batch Jobs
                  </Button>
                </Link>

                <Link href="/admin/ai-sdr">
                  <Button variant="outline" className="w-full justify-start">
                    <Bot className="mr-2 h-4 w-4" />
                    AI SDR Avatars
                  </Button>
                </Link>

                <Link href="/admin/b2b">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-blue-900/20 border-blue-700 hover:bg-blue-900/40"
                  >
                    <Building2 className="mr-2 h-4 w-4 text-blue-400" />
                    B2B Lead Search
                  </Button>
                </Link>

                <Link href="/admin/integrations/apollo">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-amber-900/20 border-amber-700 hover:bg-amber-900/40"
                  >
                    <Sparkles className="mr-2 h-4 w-4 text-amber-400" />
                    Apollo Enrichment
                  </Button>
                </Link>

                <Link href="/admin/mcp">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-purple-900/20 border-purple-700 hover:bg-purple-900/40"
                  >
                    <Cable className="mr-2 h-4 w-4 text-purple-400" />
                    MCP Connections
                  </Button>
                </Link>

                <Link href="/admin/system">
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="mr-2 h-4 w-4" />
                    System Settings
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Recent administrative actions</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No Recent Activity</p>
                  <p className="text-sm">
                    Activity will appear here as you use the system.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex justify-between items-center"
                    >
                      <div>
                        <p className="text-sm font-medium">{activity.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.description}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {activity.time}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>Set up your integrations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start">
                  {systemStatus.twilio === "not_configured" ? (
                    <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="mr-2 h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium">Configure Twilio</p>
                    <p className="text-xs text-muted-foreground">
                      Set up voice and SMS capabilities
                    </p>
                    <Link href="/admin/integrations/twilio">
                      <Button variant="outline" size="sm" className="mt-2">
                        Configure
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="flex items-start">
                  {systemStatus.sms === "not_configured" ? (
                    <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="mr-2 h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      Configure SignalHouse SMS
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Set up SMS messaging and phone verification
                    </p>
                    <Link href="/admin/integrations/signalhouse">
                      <Button variant="outline" size="sm" className="mt-2">
                        Configure
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="flex items-start">
                  {systemStatus.email === "not_configured" ? (
                    <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="mr-2 h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      Configure SendGrid Email
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Set up email sending capabilities
                    </p>
                    <Link href="/admin/integrations/sendgrid">
                      <Button variant="outline" size="sm" className="mt-2">
                        Configure
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enrichment to Execution Pipeline */}
        <Card className="mt-6 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Enrichment to Execution Pipeline
            </CardTitle>
            <CardDescription>
              End-to-end workflow: Pull targets → Enrich → Contact → Deal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
              {/* Step 1: Pull Data */}
              <div className="flex flex-col items-center p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                <div className="p-3 rounded-full bg-blue-500/20 mb-2">
                  <Search className="h-6 w-6 text-blue-400" />
                </div>
                <span className="text-sm font-medium text-center">
                  Pull Data
                </span>
                <span className="text-xs text-zinc-500 text-center mt-1">
                  5.5M NY + All US
                </span>
              </div>

              <ArrowRight className="h-5 w-5 text-zinc-600 hidden md:block mx-auto" />

              {/* Step 2: Enrich Business */}
              <div className="flex flex-col items-center p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                <div className="p-3 rounded-full bg-amber-500/20 mb-2">
                  <Briefcase className="h-6 w-6 text-amber-400" />
                </div>
                <span className="text-sm font-medium text-center">
                  Enrich Business
                </span>
                <span className="text-xs text-zinc-500 text-center mt-1">
                  Apollo + Property
                </span>
              </div>

              <ArrowRight className="h-5 w-5 text-zinc-600 hidden md:block mx-auto" />

              {/* Step 3: Find Decision Makers */}
              <div className="flex flex-col items-center p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                <div className="p-3 rounded-full bg-purple-500/20 mb-2">
                  <UserCheck className="h-6 w-6 text-purple-400" />
                </div>
                <span className="text-sm font-medium text-center">
                  Decision Makers
                </span>
                <span className="text-xs text-zinc-500 text-center mt-1">
                  CEO, Owner, VP
                </span>
              </div>

              <ArrowRight className="h-5 w-5 text-zinc-600 hidden md:block mx-auto" />

              {/* Step 4: Outreach */}
              <div className="flex flex-col items-center p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                <div className="p-3 rounded-full bg-cyan-500/20 mb-2">
                  <Send className="h-6 w-6 text-cyan-400" />
                </div>
                <span className="text-sm font-medium text-center">
                  AI Outreach
                </span>
                <span className="text-xs text-zinc-500 text-center mt-1">
                  SMS, Call, Email
                </span>
              </div>

              <ArrowRight className="h-5 w-5 text-zinc-600 hidden md:block mx-auto" />

              {/* Step 5: Response + Deal */}
              <div className="flex flex-col items-center p-4 rounded-lg bg-emerald-900/30 border border-emerald-700">
                <div className="p-3 rounded-full bg-emerald-500/20 mb-2">
                  <Handshake className="h-6 w-6 text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-center">
                  Win-Win Deal
                </span>
                <span className="text-xs text-zinc-500 text-center mt-1">
                  Context-Aware
                </span>
              </div>
            </div>

            {/* Quick Pipeline Actions */}
            <div className="mt-6 pt-4 border-t border-zinc-800 flex flex-wrap gap-3">
              <Link href="/admin/b2b">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Building2 className="mr-2 h-4 w-4" />
                  Search B2B Targets
                </Button>
              </Link>
              <Link href="/admin/integrations/apollo">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-600 text-amber-400 hover:bg-amber-900/20"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Enrich with Apollo
                </Button>
              </Link>
              <Link href="/admin/integrations/realestate">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-purple-600 text-purple-400 hover:bg-purple-900/20"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Property Lookup
                </Button>
              </Link>
              <Link href="/admin/campaigns/automation">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-cyan-600 text-cyan-400 hover:bg-cyan-900/20"
                >
                  <Bot className="mr-2 h-4 w-4" />
                  AI Campaign Setup
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Data Sources Overview */}
        <div className="grid gap-4 md:grid-cols-3 mt-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-400" />
                NY Business Index
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">5.5M</div>
              <p className="text-xs text-zinc-500">USBizData NY Records</p>
              <p className="text-xs text-zinc-400 mt-2">DO Spaces Indexed</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Apollo Coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-400">All US</div>
              <p className="text-xs text-zinc-500">50 States + Territories</p>
              <p className="text-xs text-zinc-400 mt-2">Real-time API</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Home className="h-4 w-4 text-purple-400" />
                Property Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">150M+</div>
              <p className="text-xs text-zinc-500">US Properties</p>
              <p className="text-xs text-zinc-400 mt-2">Owner + Value Data</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
