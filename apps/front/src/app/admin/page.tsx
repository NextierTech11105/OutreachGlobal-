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
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string;
    type: string;
    description: string;
    time: string;
  }>>([]);

  useEffect(() => {
    // In a real implementation, this would fetch from the API
    // For now, show realistic defaults indicating services need configuration
    setIsLoading(false);
    setStats({
      totalUsers: 0,
      apiRequests: 0,
      activeJobs: 0,
      systemAlerts: 0,
    });
    setSystemStatus({
      database: "operational",
      twilio: "not_configured",
      zoho: "not_configured",
      email: "not_configured",
      sms: "not_configured",
      ai: "operational",
      batchProcessor: "operational",
    });
    setRecentActivity([]);
  }, []);

  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-screen">
      <div className="border-b border-zinc-800 p-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-zinc-400 mt-2">Overview of system performance and key metrics</p>
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
                <AlertCircle className={`h-4 w-4 ${stats.systemAlerts > 0 ? "text-amber-500" : "text-zinc-500"}`} />
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

                <Link href="/admin/data/schema">
                  <Button variant="outline" className="w-full justify-start">
                    <Database className="mr-2 h-4 w-4" />
                    Data Schema
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

                <Link href="/admin/mcp">
                  <Button variant="outline" className="w-full justify-start bg-purple-900/20 border-purple-700 hover:bg-purple-900/40">
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
                    <div key={activity.id} className="flex justify-between items-center">
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
                    <p className="text-sm font-medium">
                      Configure Twilio
                    </p>
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
      </div>
    </div>
  );
}
