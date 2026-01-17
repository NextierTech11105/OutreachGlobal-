"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  TrendingUp,
  MessageSquare,
  Users,
  Search,
  Zap,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface UsageData {
  subscription: {
    id: string;
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
  } | null;
  features: {
    powerDialer: boolean;
    apiAccess: boolean;
    whiteLabel: boolean;
  };
}

function UsageBar({
  used,
  limit,
  label,
  icon: Icon,
}: {
  used: number;
  limit: number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isOverage = used > limit;
  const isWarning = percentage >= 80;

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {isOverage ? (
            <AlertTriangle className="w-4 h-4 text-destructive" />
          ) : isWarning ? (
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
          ) : (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
          <span
            className={`text-sm font-mono ${isOverage ? "text-destructive" : ""}`}
          >
            {used.toLocaleString()} / {limit.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            isOverage
              ? "bg-destructive"
              : isWarning
                ? "bg-yellow-500"
                : "bg-green-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isOverage && (
        <p className="text-xs text-destructive mt-2">
          Over limit by {(used - limit).toLocaleString()} - overage charges
          apply
        </p>
      )}
    </div>
  );
}

export default function BillingPage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing/my-subscription")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setData(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-32 bg-muted rounded-lg" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-muted rounded-lg" />
            <div className="h-24 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Active Subscription</h2>
          <p className="text-muted-foreground mb-6">
            {error || "You don't have an active subscription yet."}
          </p>
          <Link href="/pricing">
            <Button>View Plans</Button>
          </Link>
        </div>
      </div>
    );
  }

  const periodStart = new Date(
    data.subscription.currentPeriodStart
  ).toLocaleDateString();
  const periodEnd = new Date(
    data.subscription.currentPeriodEnd
  ).toLocaleDateString();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Billing & Usage</h1>
          <p className="text-muted-foreground">
            Manage your subscription and monitor usage
          </p>
        </div>
        <Link href="/pricing">
          <Button variant="outline">
            <TrendingUp className="w-4 h-4 mr-2" />
            Upgrade Plan
          </Button>
        </Link>
      </div>

      {/* Current Plan Card */}
      <div className="bg-gradient-to-br from-card to-muted/50 border border-border rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
            <h2 className="text-3xl font-bold mb-2">
              {data.subscription.plan || "Free"}
            </h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                {data.subscription.status === "active" ? "Active" : "Inactive"}
              </span>
              <span>
                {data.subscription.billingCycle === "yearly"
                  ? "Annual"
                  : "Monthly"}{" "}
                billing
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Billing Period</p>
            <p className="text-sm font-medium">
              {periodStart} - {periodEnd}
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground mb-3">Plan Features</p>
          <div className="flex flex-wrap gap-2">
            {data.features.powerDialer && (
              <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-xs font-medium">
                Power Dialer
              </span>
            )}
            {data.features.apiAccess && (
              <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-xs font-medium">
                API Access
              </span>
            )}
            {data.features.whiteLabel && (
              <span className="px-3 py-1 bg-purple-500/10 text-purple-500 rounded-full text-xs font-medium">
                White Label
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Usage Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Usage This Period</h3>
        {data.usage ? (
          <div className="grid md:grid-cols-2 gap-4">
            <UsageBar
              used={data.usage.leads.used}
              limit={data.usage.leads.limit}
              label="Leads Created"
              icon={Users}
            />
            <UsageBar
              used={data.usage.sms.used}
              limit={data.usage.sms.limit}
              label="SMS Sent"
              icon={MessageSquare}
            />
            <UsageBar
              used={data.usage.searches.used}
              limit={data.usage.searches.limit}
              label="Property Searches"
              icon={Search}
            />
            <UsageBar
              used={data.usage.skipTraces.used}
              limit={data.usage.skipTraces.limit}
              label="Skip Traces"
              icon={Zap}
            />
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <p className="text-muted-foreground">
              No usage data yet this period
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/api/billing/portal" className="block">
          <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition cursor-pointer">
            <CreditCard className="w-5 h-5 text-muted-foreground mb-2" />
            <h4 className="font-medium">Payment Method</h4>
            <p className="text-sm text-muted-foreground">
              Update your card details
            </p>
          </div>
        </Link>

        <Link href="/api/billing/invoices" className="block">
          <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition cursor-pointer">
            <ExternalLink className="w-5 h-5 text-muted-foreground mb-2" />
            <h4 className="font-medium">Invoices</h4>
            <p className="text-sm text-muted-foreground">
              View billing history
            </p>
          </div>
        </Link>

        <Link href="/pricing" className="block">
          <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition cursor-pointer">
            <TrendingUp className="w-5 h-5 text-muted-foreground mb-2" />
            <h4 className="font-medium">Change Plan</h4>
            <p className="text-sm text-muted-foreground">
              Upgrade or downgrade
            </p>
          </div>
        </Link>
      </div>

      {/* Overage Pricing */}
      <div className="bg-muted/50 border border-border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Overage Pricing</h3>
        <p className="text-sm text-muted-foreground mb-4">
          If you exceed your plan limits, the following rates apply:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">SMS</span>
            <p className="font-mono font-medium">$0.02/msg</p>
          </div>
          <div>
            <span className="text-muted-foreground">Skip Trace</span>
            <p className="font-mono font-medium">$0.50/lead</p>
          </div>
          <div>
            <span className="text-muted-foreground">Property Search</span>
            <p className="font-mono font-medium">$0.05/search</p>
          </div>
          <div>
            <span className="text-muted-foreground">API Calls</span>
            <p className="font-mono font-medium">$0.01/call</p>
          </div>
        </div>
      </div>
    </div>
  );
}
