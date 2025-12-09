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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  Users,
  TrendingUp,
  CreditCard,
  RefreshCw,
  Download,
  Plus,
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

interface Subscription {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  plan: string;
  status: string;
  billingCycle: string;
  currentPeriodEnd: string;
  mrr: number;
}

interface BillingStats {
  totalMrr: number;
  mrrChange: number;
  activeSubscriptions: number;
  subscriptionChange: number;
  churnRate: number;
  averageRevenue: number;
}

interface UsageOverview {
  leadsUsed: number;
  leadsLimit: number;
  smsUsed: number;
  smsLimit: number;
  skipTracesUsed: number;
  skipTracesLimit: number;
  searchesUsed: number;
  searchesLimit: number;
}

export default function BillingDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<BillingStats>({
    totalMrr: 0,
    mrrChange: 0,
    activeSubscriptions: 0,
    subscriptionChange: 0,
    churnRate: 0,
    averageRevenue: 0,
  });
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [usageOverview, setUsageOverview] = useState<UsageOverview>({
    leadsUsed: 0,
    leadsLimit: 1000,
    smsUsed: 0,
    smsLimit: 500,
    skipTracesUsed: 0,
    skipTracesLimit: 50,
    searchesUsed: 0,
    searchesLimit: 500,
  });
  const [recentPayments, setRecentPayments] = useState<Array<{
    id: string;
    customer: string;
    amount: number;
    status: string;
    date: string;
  }>>([]);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    setIsLoading(true);
    try {
      // Fetch billing stats
      const [plansRes, usageRes] = await Promise.all([
        fetch("/api/billing/plans").then(r => r.json()).catch(() => ({ plans: [] })),
        fetch("/api/billing/usage?userId=admin&history=true").then(r => r.json()).catch(() => null),
      ]);

      // For now, show demo stats - in production, aggregate from real data
      setStats({
        totalMrr: 0,
        mrrChange: 0,
        activeSubscriptions: 0,
        subscriptionChange: 0,
        churnRate: 0,
        averageRevenue: 0,
      });

      setSubscriptions([]);
      setRecentPayments([]);

      if (usageRes?.usage) {
        setUsageOverview({
          leadsUsed: usageRes.usage.leads?.used || 0,
          leadsLimit: usageRes.usage.leads?.limit || 1000,
          smsUsed: usageRes.usage.sms?.used || 0,
          smsLimit: usageRes.usage.sms?.limit || 500,
          skipTracesUsed: usageRes.usage.skipTraces?.used || 0,
          skipTracesLimit: usageRes.usage.skipTraces?.limit || 50,
          searchesUsed: usageRes.usage.propertySearches?.used || 0,
          searchesLimit: usageRes.usage.propertySearches?.limit || 500,
        });
      }
    } catch (error) {
      console.error("Error fetching billing data:", error);
    }
    setIsLoading(false);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-500">Active</Badge>;
      case "past_due":
        return <Badge className="bg-yellow-500/20 text-yellow-500">Past Due</Badge>;
      case "canceled":
        return <Badge className="bg-red-500/20 text-red-500">Canceled</Badge>;
      case "trialing":
        return <Badge className="bg-blue-500/20 text-blue-500">Trial</Badge>;
      default:
        return <Badge className="bg-zinc-500/20 text-zinc-500">{status}</Badge>;
    }
  };

  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-screen">
      <div className="border-b border-zinc-800 p-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Billing & Subscriptions</h1>
            <p className="text-zinc-400 mt-2">
              Manage plans, subscriptions, and revenue
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={fetchBillingData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Plan
            </Button>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Revenue Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Monthly Recurring Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                ) : (
                  <div className="text-2xl font-bold">
                    ${stats.totalMrr.toLocaleString()}
                  </div>
                )}
                <DollarSign className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex items-center mt-2">
                {stats.mrrChange >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={`text-xs ${stats.mrrChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {stats.mrrChange >= 0 ? "+" : ""}{stats.mrrChange}%
                </span>
                <span className="text-xs text-zinc-500 ml-1">vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Active Subscriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                ) : (
                  <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
                )}
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                {stats.activeSubscriptions === 0 ? "No subscriptions yet" : `+${stats.subscriptionChange} this month`}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Churn Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                ) : (
                  <div className="text-2xl font-bold">{stats.churnRate}%</div>
                )}
                <TrendingUp className="h-4 w-4 text-yellow-500" />
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Monthly churn rate
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Average Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                ) : (
                  <div className="text-2xl font-bold">
                    ${stats.averageRevenue.toLocaleString()}
                  </div>
                )}
                <CreditCard className="h-4 w-4 text-purple-500" />
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Per customer per month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Usage Overview */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle>Platform Usage Overview</CardTitle>
              <CardDescription>
                Aggregate usage across all subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">Leads Created</span>
                  <span>{usageOverview.leadsUsed.toLocaleString()} / {usageOverview.leadsLimit.toLocaleString()}</span>
                </div>
                <Progress
                  value={(usageOverview.leadsUsed / usageOverview.leadsLimit) * 100}
                  className="h-2"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">SMS Sent</span>
                  <span>{usageOverview.smsUsed.toLocaleString()} / {usageOverview.smsLimit.toLocaleString()}</span>
                </div>
                <Progress
                  value={(usageOverview.smsUsed / usageOverview.smsLimit) * 100}
                  className="h-2"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">Skip Traces</span>
                  <span>{usageOverview.skipTracesUsed.toLocaleString()} / {usageOverview.skipTracesLimit.toLocaleString()}</span>
                </div>
                <Progress
                  value={(usageOverview.skipTracesUsed / usageOverview.skipTracesLimit) * 100}
                  className="h-2"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">Property Searches</span>
                  <span>{usageOverview.searchesUsed.toLocaleString()} / {usageOverview.searchesLimit.toLocaleString()}</span>
                </div>
                <Progress
                  value={(usageOverview.searchesUsed / usageOverview.searchesLimit) * 100}
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>
                Latest payment transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No Payments Yet</p>
                  <p className="text-sm">
                    Payment history will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentPayments.map((payment) => (
                    <div key={payment.id} className="flex justify-between items-center border-b border-zinc-800 pb-3">
                      <div>
                        <p className="text-sm font-medium">{payment.customer}</p>
                        <p className="text-xs text-zinc-500">{payment.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">${payment.amount.toFixed(2)}</p>
                        {payment.status === "succeeded" ? (
                          <CheckCircle className="h-3 w-3 text-green-500 inline" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500 inline" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Subscriptions Table */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Active Subscriptions</CardTitle>
            <CardDescription>
              Manage customer subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscriptions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No Subscriptions Yet</p>
                <p className="text-sm mb-4">
                  Subscriptions will appear here as customers sign up
                </p>
                <Button variant="outline" onClick={() => window.open("/pricing", "_blank")}>
                  View Pricing Page
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead>Customer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Billing</TableHead>
                    <TableHead>MRR</TableHead>
                    <TableHead>Renews</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => (
                    <TableRow key={sub.id} className="border-zinc-800">
                      <TableCell>
                        <div>
                          <p className="font-medium">{sub.userName || sub.userId}</p>
                          <p className="text-xs text-zinc-500">{sub.userEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>{sub.plan}</TableCell>
                      <TableCell>{statusBadge(sub.status)}</TableCell>
                      <TableCell className="capitalize">{sub.billingCycle}</TableCell>
                      <TableCell>${sub.mrr}</TableCell>
                      <TableCell className="text-zinc-500">
                        {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Stripe Integration Note */}
        <Card className="bg-zinc-900 border-zinc-800 mt-8">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium mb-1">Stripe Integration Required</h3>
                <p className="text-sm text-zinc-400 mb-3">
                  To enable payment processing, configure your Stripe API keys in the environment variables:
                </p>
                <code className="text-xs bg-zinc-800 px-3 py-1 rounded block mb-2">
                  STRIPE_SECRET_KEY=sk_live_xxx
                </code>
                <code className="text-xs bg-zinc-800 px-3 py-1 rounded block">
                  STRIPE_WEBHOOK_SECRET=whsec_xxx
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
