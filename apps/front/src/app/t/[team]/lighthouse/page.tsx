"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  TrendingUp,
  Users,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Zap,
} from "lucide-react";

// VERTICALS - Core Revenue Streams (OutreachGlobal Ecosystem)
const VERTICALS = [
  {
    id: "real-estate",
    name: "Real Estate Agents",
    icon: "🏠",
    monthlyTarget: 12000,
    dealValue: 1500,
    touchesPerDay: 200,
    partner: "Listing Partners",
  },
  {
    id: "business-brokering",
    name: "Business Brokering",
    icon: "🤝",
    monthlyTarget: 15000,
    dealValue: 3500,
    touchesPerDay: 150,
    partner: "East Coast Business Brokers",
  },
  {
    id: "lending",
    name: "Lending",
    icon: "💰",
    monthlyTarget: 10000,
    dealValue: 2000,
    touchesPerDay: 180,
    partner: "Lending Network",
  },
  {
    id: "nextier-tech",
    name: "Nextier Tech",
    icon: "⚡",
    monthlyTarget: 8000,
    dealValue: 500, // MRR per seat
    touchesPerDay: 300,
    partner: "Direct",
  },
  {
    id: "white-label",
    name: "White Label / OutreachGlobal",
    icon: "🏷️",
    monthlyTarget: 5000,
    dealValue: 2500,
    touchesPerDay: 100,
    partner: "Agency Partners",
  },
];

// The Lighthouse: North Star Metrics ($25K-50K/month across verticals)
const LIGHTHOUSE_TARGETS = {
  monthly: {
    revenue: 50000, // $50K MRR target (high end)
    revenueMin: 25000, // $25K MRR floor
    meetings: 35, // 35 meetings/month
    qualified: 140, // 140 qualified leads
    touches: 16500, // Total across verticals
  },
  conversion: {
    touchToResponse: 0.15, // 15% response rate
    responseToQualified: 0.4, // 40% qualification rate
    qualifiedToMeeting: 0.25, // 25% meeting rate
    meetingToClose: 0.4, // 40% close rate
    dealValue: 1875, // Blended average deal
  },
};

// Reverse Engineer Daily Execution
function calculateDailyExecution() {
  const workingDays = 22; // per month
  const t = LIGHTHOUSE_TARGETS;

  // Work backwards from revenue target
  const dealsNeeded = t.monthly.revenue / t.conversion.dealValue;
  const meetingsNeeded = dealsNeeded / t.conversion.meetingToClose;
  const qualifiedNeeded = meetingsNeeded / t.conversion.qualifiedToMeeting;
  const responsesNeeded = qualifiedNeeded / t.conversion.responseToQualified;
  const touchesNeeded = responsesNeeded / t.conversion.touchToResponse;

  return {
    daily: {
      touches: Math.ceil(touchesNeeded / workingDays),
      responses: Math.ceil(responsesNeeded / workingDays),
      qualified: Math.ceil(qualifiedNeeded / workingDays),
      meetings: Math.ceil(meetingsNeeded / workingDays),
      deals: Math.round((dealsNeeded / workingDays) * 10) / 10,
    },
    monthly: {
      touches: Math.ceil(touchesNeeded),
      responses: Math.ceil(responsesNeeded),
      qualified: Math.ceil(qualifiedNeeded),
      meetings: Math.ceil(meetingsNeeded),
      deals: Math.ceil(dealsNeeded),
    },
  };
}

// Mock current progress (replace with real data)
const CURRENT_PROGRESS = {
  touches: 8500,
  responses: 1275,
  qualified: 510,
  meetings: 23,
  revenue: 42000,
  daysElapsed: 12,
};

export default function LighthousePage() {
  const execution = calculateDailyExecution();
  const targets = LIGHTHOUSE_TARGETS;
  const progress = CURRENT_PROGRESS;

  // Calculate progress percentages
  const progressPct = {
    touches: (progress.touches / execution.monthly.touches) * 100,
    responses: (progress.responses / execution.monthly.responses) * 100,
    qualified: (progress.qualified / execution.monthly.qualified) * 100,
    meetings: (progress.meetings / execution.monthly.meetings) * 100,
    revenue: (progress.revenue / targets.monthly.revenue) * 100,
  };

  // Pace check (are we on track?)
  const expectedProgress = (progress.daysElapsed / 22) * 100;

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Target className="w-8 h-8 text-yellow-400" />
            Numerical Lighthouse
          </h1>
          <p className="text-zinc-400 mt-1">
            North Star Metrics & Daily Execution Requirements
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-zinc-500">
            Day {progress.daysElapsed} of 22
          </p>
          <p className="text-2xl font-bold text-emerald-400">
            ${progress.revenue.toLocaleString()}
          </p>
          <p className="text-xs text-zinc-500">
            of ${targets.monthly.revenue.toLocaleString()} target
          </p>
        </div>
      </div>

      {/* The Lighthouse - Monthly Targets */}
      <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
        <CardHeader>
          <CardTitle className="text-yellow-400 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            THE LIGHTHOUSE - Monthly Targets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-white">
                {execution.monthly.touches.toLocaleString()}
              </p>
              <p className="text-sm text-zinc-400">Touches</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-white">
                {execution.monthly.qualified}
              </p>
              <p className="text-sm text-zinc-400">Qualified</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-white">
                {execution.monthly.meetings}
              </p>
              <p className="text-sm text-zinc-400">Meetings</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-emerald-400">
                ${targets.monthly.revenue.toLocaleString()}
              </p>
              <p className="text-sm text-zinc-400">Revenue</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Execution - Reverse Engineered */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            DAILY EXECUTION - Reverse Engineered
          </CardTitle>
          <p className="text-sm text-zinc-500">
            What must happen EVERY DAY to hit the lighthouse
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            <DailyMetric
              icon={<Mail className="w-5 h-5" />}
              label="Touches"
              value={execution.daily.touches}
              color="blue"
            />
            <DailyMetric
              icon={<TrendingUp className="w-5 h-5" />}
              label="Responses"
              value={execution.daily.responses}
              color="purple"
            />
            <DailyMetric
              icon={<Users className="w-5 h-5" />}
              label="Qualified"
              value={execution.daily.qualified}
              color="cyan"
            />
            <DailyMetric
              icon={<Phone className="w-5 h-5" />}
              label="Meetings"
              value={execution.daily.meetings}
              color="green"
            />
            <DailyMetric
              icon={<DollarSign className="w-5 h-5" />}
              label="Deals"
              value={execution.daily.deals}
              color="yellow"
            />
          </div>
        </CardContent>
      </Card>

      {/* Progress Tracking */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Month-to-Date Progress</CardTitle>
          <p className="text-sm text-zinc-500">
            Expected: {expectedProgress.toFixed(0)}% complete (Day{" "}
            {progress.daysElapsed}/22)
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <ProgressRow
            label="Outreach Touches"
            current={progress.touches}
            target={execution.monthly.touches}
            percentage={progressPct.touches}
            expected={expectedProgress}
          />
          <ProgressRow
            label="Responses"
            current={progress.responses}
            target={execution.monthly.responses}
            percentage={progressPct.responses}
            expected={expectedProgress}
          />
          <ProgressRow
            label="Qualified Leads"
            current={progress.qualified}
            target={execution.monthly.qualified}
            percentage={progressPct.qualified}
            expected={expectedProgress}
          />
          <ProgressRow
            label="Meetings Booked"
            current={progress.meetings}
            target={execution.monthly.meetings}
            percentage={progressPct.meetings}
            expected={expectedProgress}
          />
          <ProgressRow
            label="Revenue"
            current={progress.revenue}
            target={targets.monthly.revenue}
            percentage={progressPct.revenue}
            expected={expectedProgress}
            isCurrency
          />
        </CardContent>
      </Card>

      {/* Verticals Grid - Partner Ecosystem */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            VERTICALS - Partner Ecosystem
          </CardTitle>
          <p className="text-sm text-zinc-500">
            USBizData foundation | Proprietary lead gen | Appointment setting
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {VERTICALS.map((v) => (
              <div
                key={v.id}
                className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition-colors"
              >
                <div className="text-2xl mb-2">{v.icon}</div>
                <p className="font-medium text-white text-sm">{v.name}</p>
                <p className="text-xs text-zinc-500 mb-3">{v.partner}</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Target</span>
                    <span className="text-emerald-400">
                      ${v.monthlyTarget.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Deal</span>
                    <span className="text-white">
                      ${v.dealValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Touches/day</span>
                    <span className="text-blue-400">{v.touchesPerDay}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center">
            <span className="text-zinc-400">Combined Monthly Target</span>
            <span className="text-2xl font-bold text-emerald-400">
              $
              {VERTICALS.reduce(
                (sum, v) => sum + v.monthlyTarget,
                0,
              ).toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Conversion Assumptions</CardTitle>
          <p className="text-sm text-zinc-500">
            The math behind the lighthouse
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2">
            <FunnelStep label="Touch" rate="100%" />
            <Arrow />
            <FunnelStep
              label="Response"
              rate={`${targets.conversion.touchToResponse * 100}%`}
            />
            <Arrow />
            <FunnelStep
              label="Qualified"
              rate={`${targets.conversion.responseToQualified * 100}%`}
            />
            <Arrow />
            <FunnelStep
              label="Meeting"
              rate={`${targets.conversion.qualifiedToMeeting * 100}%`}
            />
            <Arrow />
            <FunnelStep
              label="Close"
              rate={`${targets.conversion.meetingToClose * 100}%`}
            />
            <Arrow />
            <FunnelStep
              label="Deal"
              rate={`$${targets.conversion.dealValue.toLocaleString()}`}
              highlight
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DailyMetric({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    cyan: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    green: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  };

  return (
    <div className={`rounded-lg border p-4 text-center ${colorClasses[color]}`}>
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs opacity-70">{label}/day</p>
    </div>
  );
}

function ProgressRow({
  label,
  current,
  target,
  percentage,
  expected,
  isCurrency = false,
}: {
  label: string;
  current: number;
  target: number;
  percentage: number;
  expected: number;
  isCurrency?: boolean;
}) {
  const isAhead = percentage >= expected;
  const format = (n: number) =>
    isCurrency ? `$${n.toLocaleString()}` : n.toLocaleString();

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-zinc-300">{label}</span>
        <span className="text-zinc-400">
          {format(current)} / {format(target)}
          <span
            className={`ml-2 ${isAhead ? "text-emerald-400" : "text-red-400"}`}
          >
            ({percentage.toFixed(0)}%)
          </span>
        </span>
      </div>
      <div className="relative">
        <Progress value={Math.min(percentage, 100)} className="h-2" />
        {/* Expected marker */}
        <div
          className="absolute top-0 w-0.5 h-2 bg-yellow-400"
          style={{ left: `${expected}%` }}
        />
      </div>
    </div>
  );
}

function FunnelStep({
  label,
  rate,
  highlight = false,
}: {
  label: string;
  rate: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`text-center px-3 py-2 rounded ${
        highlight ? "bg-emerald-500/20 border border-emerald-500/30" : ""
      }`}
    >
      <p className="text-xs text-zinc-500">{label}</p>
      <p
        className={`font-bold ${highlight ? "text-emerald-400" : "text-white"}`}
      >
        {rate}
      </p>
    </div>
  );
}

function Arrow() {
  return <span className="text-zinc-600">→</span>;
}
