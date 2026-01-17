"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Search,
  MessageSquare,
  UserSearch,
  CreditCard,
  TrendingUp,
  Calendar,
  Zap,
} from "lucide-react";

interface UsageData {
  subscription: {
    plan: string;
    planSlug: string;
    status: string;
    billingCycle: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
  };
  usage: {
    leads: { used: number; limit: number };
    searches: { used: number; limit: number };
    sms: { used: number; limit: number };
    skipTraces: { used: number; limit: number };
  };
  features: {
    powerDialer: boolean;
    apiAccess: boolean;
    whiteLabel: boolean;
  };
}

function UsageCard({
  title,
  icon: Icon,
  used,
  limit,
  color,
}: {
  title: string;
  icon: React.ElementType;
  used: number;
  limit: number;
  color: string;
}) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isOverage = used > limit;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {used.toLocaleString()}
          <span className="text-sm font-normal text-muted-foreground">
            {" "}
            / {limit.toLocaleString()}
          </span>
        </div>
        <Progress
          value={percentage}
          className={`mt-2 ${isOverage ? "[&>div]:bg-red-500" : ""}`}
        />
        {isOverage && (
          <p className="text-xs text-red-500 mt-1">
            Over limit - overage charges apply
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function UsageDashboard() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetch("/api/billing/usage");
        if (!res.ok) {
          if (res.status === 404) {
            setError("No active subscription");
          } else {
            throw new Error("Failed to fetch usage");
          }
          return;
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load usage");
      } finally {
        setLoading(false);
      }
    }
    fetchUsage();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Active Subscription</CardTitle>
          <CardDescription>
            {error || "Subscribe to a plan to see your usage"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="/pricing">View Plans</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const periodStart = new Date(data.subscription.currentPeriodStart);
  const periodEnd = new Date(data.subscription.currentPeriodEnd);
  const daysLeft = Math.ceil(
    (periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-6">
      {/* Subscription Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {data.subscription.plan}
              </CardTitle>
              <CardDescription>
                {data.subscription.billingCycle === "yearly"
                  ? "Annual"
                  : "Monthly"}{" "}
                billing
              </CardDescription>
            </div>
            <Badge
              variant={
                data.subscription.status === "active" ? "default" : "secondary"
              }
            >
              {data.subscription.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                {periodStart.toLocaleDateString()} -{" "}
                {periodEnd.toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span>{daysLeft} days remaining</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <UsageCard
          title="Leads Created"
          icon={Users}
          used={data.usage.leads.used}
          limit={data.usage.leads.limit}
          color="text-blue-500"
        />
        <UsageCard
          title="Property Searches"
          icon={Search}
          used={data.usage.searches.used}
          limit={data.usage.searches.limit}
          color="text-green-500"
        />
        <UsageCard
          title="SMS Sent"
          icon={MessageSquare}
          used={data.usage.sms.used}
          limit={data.usage.sms.limit}
          color="text-purple-500"
        />
        <UsageCard
          title="Skip Traces"
          icon={UserSearch}
          used={data.usage.skipTraces.used}
          limit={data.usage.skipTraces.limit}
          color="text-orange-500"
        />
      </div>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Plan Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.features.powerDialer && (
              <Badge variant="outline">Power Dialer</Badge>
            )}
            {data.features.apiAccess && (
              <Badge variant="outline">API Access</Badge>
            )}
            {data.features.whiteLabel && (
              <Badge variant="outline">White Label</Badge>
            )}
            {!data.features.powerDialer &&
              !data.features.apiAccess &&
              !data.features.whiteLabel && (
                <span className="text-sm text-muted-foreground">
                  Basic features included
                </span>
              )}
          </div>
        </CardContent>
      </Card>

      {/* Upgrade CTA */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <h3 className="font-semibold">Need more capacity?</h3>
            <p className="text-sm text-muted-foreground">
              Upgrade your plan for higher limits and more features
            </p>
          </div>
          <Button asChild>
            <a href="/pricing">Upgrade Plan</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
