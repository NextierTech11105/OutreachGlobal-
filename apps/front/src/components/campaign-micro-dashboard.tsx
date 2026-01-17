"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  MessageSquare,
  Phone,
  Users,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

// Vertical definitions for campaign isolation
export const CAMPAIGN_VERTICALS = {
  PLUMBING: {
    id: "PLUMBING",
    name: "Plumbing",
    displayName: "Plumbing Companies",
    icon: "🔧",
    color: "#3B82F6", // blue
  },
  TRUCKING: {
    id: "TRUCKING",
    name: "Trucking",
    displayName: "Trucking Companies",
    icon: "🚛",
    color: "#EF4444", // red
  },
  CPA: {
    id: "CPA",
    name: "CPA",
    displayName: "CPAs & Accountants",
    icon: "📊",
    color: "#10B981", // green
  },
  CONSULTANT: {
    id: "CONSULTANT",
    name: "Consultant",
    displayName: "Consultants",
    icon: "💼",
    color: "#8B5CF6", // purple
  },
  AGENT_BROKER: {
    id: "AGENT_BROKER",
    name: "Agent/Broker",
    displayName: "Agents & Brokers",
    icon: "🏠",
    color: "#F59E0B", // amber
  },
  SALES_PRO: {
    id: "SALES_PRO",
    name: "Sales Pro",
    displayName: "Sales Professionals",
    icon: "📈",
    color: "#EC4899", // pink
  },
  SOLOPRENEUR: {
    id: "SOLOPRENEUR",
    name: "Solopreneur",
    displayName: "Solopreneurs",
    icon: "🚀",
    color: "#06B6D4", // cyan
  },
  PE_BOUTIQUE: {
    id: "PE_BOUTIQUE",
    name: "PE Boutique",
    displayName: "Private Equity Boutiques",
    icon: "💎",
    color: "#6366F1", // indigo
  },
} as const;

export type VerticalId = keyof typeof CAMPAIGN_VERTICALS;

// KPI interface for each vertical
export interface VerticalKPIs {
  vertical: VerticalId;
  campaignId: string;
  phoneNumber?: string;

  // Volume metrics
  totalLeads: number;
  contacted: number;
  pending: number;

  // Engagement metrics
  sent: number;
  delivered: number;
  replies: number;
  optOuts: number;

  // Conversion metrics
  interested: number;
  booked: number;
  converted: number;

  // Rates
  deliveryRate: number;
  responseRate: number;
  conversionRate: number;

  // Trends (vs last period)
  responseRateTrend: number; // positive = up, negative = down
  conversionRateTrend: number;
}

interface MicroDashboardProps {
  verticals: VerticalKPIs[];
  dateRange?: { start: Date; end: Date };
}

function KPICard({
  vertical,
  kpis,
}: {
  vertical: (typeof CAMPAIGN_VERTICALS)[VerticalId];
  kpis: VerticalKPIs;
}) {
  const deliveryPct = kpis.sent > 0 ? (kpis.delivered / kpis.sent) * 100 : 0;
  const responsePct = kpis.delivered > 0 ? (kpis.replies / kpis.delivered) * 100 : 0;
  const conversionPct = kpis.replies > 0 ? (kpis.booked / kpis.replies) * 100 : 0;

  return (
    <Card className="relative overflow-hidden">
      <div
        className="absolute top-0 left-0 w-1 h-full"
        style={{ backgroundColor: vertical.color }}
      />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{vertical.icon}</span>
            <CardTitle className="text-sm font-medium">
              {vertical.displayName}
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {kpis.campaignId}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Volume Row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-2xl font-bold">{kpis.totalLeads.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Leads</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{kpis.sent.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Sent</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{kpis.replies.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Replies</div>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Delivery</span>
            <span className="font-medium">{deliveryPct.toFixed(1)}%</span>
          </div>
          <Progress value={deliveryPct} className="h-1.5" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Response</span>
            <div className="flex items-center gap-1">
              <span className="font-medium">{responsePct.toFixed(1)}%</span>
              {kpis.responseRateTrend !== 0 && (
                <span
                  className={`flex items-center text-xs ${
                    kpis.responseRateTrend > 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {kpis.responseRateTrend > 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(kpis.responseRateTrend).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
          <Progress value={responsePct} className="h-1.5" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Conversion</span>
            <div className="flex items-center gap-1">
              <span className="font-medium">{conversionPct.toFixed(1)}%</span>
              {kpis.conversionRateTrend !== 0 && (
                <span
                  className={`flex items-center text-xs ${
                    kpis.conversionRateTrend > 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {kpis.conversionRateTrend > 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(kpis.conversionRateTrend).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
          <Progress value={conversionPct} className="h-1.5" />
        </div>

        {/* Bottom Stats */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <div className="flex items-center gap-1.5 text-xs">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span>{kpis.booked} booked</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span>{kpis.interested} interested</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CampaignMicroDashboard({ verticals, dateRange }: MicroDashboardProps) {
  // Aggregate totals
  const totals = verticals.reduce(
    (acc, v) => ({
      leads: acc.leads + v.totalLeads,
      sent: acc.sent + v.sent,
      delivered: acc.delivered + v.delivered,
      replies: acc.replies + v.replies,
      booked: acc.booked + v.booked,
      optOuts: acc.optOuts + v.optOuts,
    }),
    { leads: 0, sent: 0, delivered: 0, replies: 0, booked: 0, optOuts: 0 }
  );

  const overallResponseRate =
    totals.delivered > 0 ? (totals.replies / totals.delivered) * 100 : 0;
  const overallConversionRate =
    totals.replies > 0 ? (totals.booked / totals.replies) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total Leads</span>
            </div>
            <div className="text-2xl font-bold">{totals.leads.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Sent</span>
            </div>
            <div className="text-2xl font-bold">{totals.sent.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Replies</span>
            </div>
            <div className="text-2xl font-bold">{totals.replies.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Response Rate</span>
            </div>
            <div className="text-2xl font-bold">{overallResponseRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Booked</span>
            </div>
            <div className="text-2xl font-bold">{totals.booked.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Conversion</span>
            </div>
            <div className="text-2xl font-bold">{overallConversionRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Vertical Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {verticals.map((v) => {
          const vertical = CAMPAIGN_VERTICALS[v.vertical];
          if (!vertical) return null;
          return <KPICard key={v.vertical} vertical={vertical} kpis={v} />;
        })}
      </div>
    </div>
  );
}

// Demo data for testing
export function getMockVerticalKPIs(): VerticalKPIs[] {
  return [
    {
      vertical: "PLUMBING",
      campaignId: "CJRCU60",
      totalLeads: 500,
      contacted: 450,
      pending: 50,
      sent: 450,
      delivered: 430,
      replies: 45,
      optOuts: 5,
      interested: 28,
      booked: 12,
      converted: 8,
      deliveryRate: 95.5,
      responseRate: 10.5,
      conversionRate: 26.7,
      responseRateTrend: 2.3,
      conversionRateTrend: -1.2,
    },
    {
      vertical: "TRUCKING",
      campaignId: "CW7I6X5",
      totalLeads: 300,
      contacted: 280,
      pending: 20,
      sent: 280,
      delivered: 265,
      replies: 32,
      optOuts: 3,
      interested: 18,
      booked: 8,
      converted: 5,
      deliveryRate: 94.6,
      responseRate: 12.1,
      conversionRate: 25.0,
      responseRateTrend: 3.5,
      conversionRateTrend: 1.8,
    },
    {
      vertical: "CPA",
      campaignId: "PENDING",
      totalLeads: 200,
      contacted: 0,
      pending: 200,
      sent: 0,
      delivered: 0,
      replies: 0,
      optOuts: 0,
      interested: 0,
      booked: 0,
      converted: 0,
      deliveryRate: 0,
      responseRate: 0,
      conversionRate: 0,
      responseRateTrend: 0,
      conversionRateTrend: 0,
    },
    {
      vertical: "CONSULTANT",
      campaignId: "PENDING",
      totalLeads: 150,
      contacted: 0,
      pending: 150,
      sent: 0,
      delivered: 0,
      replies: 0,
      optOuts: 0,
      interested: 0,
      booked: 0,
      converted: 0,
      deliveryRate: 0,
      responseRate: 0,
      conversionRate: 0,
      responseRateTrend: 0,
      conversionRateTrend: 0,
    },
  ];
}
