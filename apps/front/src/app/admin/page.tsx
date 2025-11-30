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
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
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
                <div className="text-2xl font-bold">2,853</div>
                <Users className="h-4 w-4 text-zinc-500" />
              </div>
              <p className="text-xs text-zinc-500 mt-2">+12% from last month</p>
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
                <div className="text-2xl font-bold">1.2M</div>
                <Zap className="h-4 w-4 text-zinc-500" />
              </div>
              <p className="text-xs text-zinc-500 mt-2">+18% from last week</p>
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
                <div className="text-2xl font-bold">28</div>
                <Clock className="h-4 w-4 text-zinc-500" />
              </div>
              <p className="text-xs text-zinc-500 mt-2">3 require attention</p>
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
                <div className="text-2xl font-bold">2</div>
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-xs text-zinc-500 mt-2">View system alerts</p>
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
                  <div className="flex items-center text-green-500">
                    <CheckCircle className="mr-1 h-4 w-4" />
                    <span>Operational</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <PhoneCall className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Twilio Integration</span>
                  </div>
                  <div className="flex items-center text-green-500">
                    <CheckCircle className="mr-1 h-4 w-4" />
                    <span>Operational</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Zap className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Zoho CRM Integration</span>
                  </div>
                  <div className="flex items-center text-green-500">
                    <CheckCircle className="mr-1 h-4 w-4" />
                    <span>Operational</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Email Service</span>
                  </div>
                  <div className="flex items-center text-green-500">
                    <CheckCircle className="mr-1 h-4 w-4" />
                    <span>Operational</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MessageSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>SMS Service</span>
                  </div>
                  <div className="flex items-center text-green-500">
                    <CheckCircle className="mr-1 h-4 w-4" />
                    <span>Operational</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Bot className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>AI Services</span>
                  </div>
                  <div className="flex items-center text-green-500">
                    <CheckCircle className="mr-1 h-4 w-4" />
                    <span>Operational</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Batch Job Processor</span>
                  </div>
                  <div className="flex items-center text-green-500">
                    <CheckCircle className="mr-1 h-4 w-4" />
                    <span>Operational</span>
                  </div>
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

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Recent administrative actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">User Created</p>
                    <p className="text-xs text-muted-foreground">
                      john.smith@example.com
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    10 minutes ago
                  </p>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">Campaign Updated</p>
                    <p className="text-xs text-muted-foreground">
                      High Equity Outreach
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    25 minutes ago
                  </p>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">
                      System Settings Changed
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Email configuration updated
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">1 hour ago</p>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">Batch Job Completed</p>
                    <p className="text-xs text-muted-foreground">
                      Lead data import
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">AI SDR Avatar Created</p>
                    <p className="text-xs text-muted-foreground">
                      Foreclosure Specialist
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">3 hours ago</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>Important system notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start">
                  <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">
                      Database Backup Needed
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last backup was 7 days ago
                    </p>
                    <Button variant="outline" size="sm" className="mt-2">
                      Run Backup
                    </Button>
                  </div>
                </div>

                <div className="flex items-start">
                  <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">
                      System Update Available
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Version 2.5.1 is available
                    </p>
                    <Button variant="outline" size="sm" className="mt-2">
                      View Details
                    </Button>
                  </div>
                </div>

                <div className="flex items-start">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">
                      All Services Operational
                    </p>
                    <p className="text-xs text-muted-foreground">
                      No issues detected
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Additional dashboard content would go here */}
      </div>
    </div>
  );
}
