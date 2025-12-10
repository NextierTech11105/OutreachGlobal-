"use client";


import { sf, sfd } from "@/lib/utils/safe-format";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Zap,
  Target,
  TrendingUp,
  MessageSquare,
  Phone,
  Users,
  Building2,
  DollarSign,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame,
  Sparkles,
  Brain,
  Send,
  BarChart3,
  Layers,
  Database,
  Mail,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface PipelineStage {
  id: string;
  name: string;
  count: number;
  value: number;
  icon: React.ReactNode;
  color: string;
}

interface SignalMetric {
  name: string;
  value: number;
  change: number;
  trend: "up" | "down" | "neutral";
}

interface DealOpportunity {
  id: string;
  type: "business_sale" | "capital" | "ai_strategy" | "real_estate" | "exit";
  company: string;
  contact: string;
  stage: string;
  value: string;
  lastTouch: string;
  nextAction: string;
}

export function DealFlowDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Pipeline stages - The Deal Flow
  const pipelineStages: PipelineStage[] = [
    {
      id: "data",
      name: "Data Lake",
      count: 15420,
      value: 0,
      icon: <Database className="w-5 h-5" />,
      color: "bg-blue-500",
    },
    {
      id: "enriched",
      name: "Enriched",
      count: 8750,
      value: 0,
      icon: <Sparkles className="w-5 h-5" />,
      color: "bg-purple-500",
    },
    {
      id: "contacted",
      name: "Contacted",
      count: 4200,
      value: 0,
      icon: <Send className="w-5 h-5" />,
      color: "bg-indigo-500",
    },
    {
      id: "engaged",
      name: "Engaged",
      count: 890,
      value: 0,
      icon: <MessageSquare className="w-5 h-5" />,
      color: "bg-green-500",
    },
    {
      id: "qualified",
      name: "Qualified",
      count: 156,
      value: 0,
      icon: <Target className="w-5 h-5" />,
      color: "bg-yellow-500",
    },
    {
      id: "opportunity",
      name: "Opportunity",
      count: 42,
      value: 12500000,
      icon: <DollarSign className="w-5 h-5" />,
      color: "bg-orange-500",
    },
    {
      id: "deal",
      name: "Deal",
      count: 8,
      value: 4200000,
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: "bg-emerald-500",
    },
  ];

  // Signal metrics - The Pulse
  const signalMetrics: SignalMetric[] = [
    { name: "SMS Sent Today", value: 847, change: 12, trend: "up" },
    { name: "Responses", value: 124, change: 8, trend: "up" },
    { name: "Calls Made", value: 56, change: -3, trend: "down" },
    { name: "Appointments Set", value: 12, change: 4, trend: "up" },
    { name: "Gianna Active Loops", value: 234, change: 18, trend: "up" },
    { name: "Hot Leads", value: 45, change: 7, trend: "up" },
  ];

  // Active deal opportunities
  const dealOpportunities: DealOpportunity[] = [
    {
      id: "1",
      type: "business_sale",
      company: "ABC Manufacturing",
      contact: "John Smith",
      stage: "Valuation",
      value: "$2.4M",
      lastTouch: "2 hours ago",
      nextAction: "Send valuation report",
    },
    {
      id: "2",
      type: "ai_strategy",
      company: "TechFlow Solutions",
      contact: "Sarah Chen",
      stage: "Discovery",
      value: "$85K/yr",
      lastTouch: "1 day ago",
      nextAction: "Schedule AI strategy session",
    },
    {
      id: "3",
      type: "capital",
      company: "Growth Industries",
      contact: "Mike Johnson",
      stage: "Due Diligence",
      value: "$1.2M raise",
      lastTouch: "3 hours ago",
      nextAction: "Investor intro call",
    },
    {
      id: "4",
      type: "exit",
      company: "Premier Services",
      contact: "Lisa Wong",
      stage: "LOI Negotiation",
      value: "$5.8M",
      lastTouch: "30 mins ago",
      nextAction: "Review LOI terms",
    },
    {
      id: "5",
      type: "real_estate",
      company: "Downtown Plaza LLC",
      contact: "Robert Davis",
      stage: "Offer Prep",
      value: "$3.2M",
      lastTouch: "4 hours ago",
      nextAction: "Prepare purchase offer",
    },
  ];

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  const getDealTypeIcon = (type: DealOpportunity["type"]) => {
    switch (type) {
      case "business_sale":
        return <Building2 className="w-4 h-4 text-blue-400" />;
      case "capital":
        return <DollarSign className="w-4 h-4 text-green-400" />;
      case "ai_strategy":
        return <Brain className="w-4 h-4 text-purple-400" />;
      case "real_estate":
        return <Building2 className="w-4 h-4 text-orange-400" />;
      case "exit":
        return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    }
  };

  const getDealTypeBadge = (type: DealOpportunity["type"]) => {
    const labels: Record<DealOpportunity["type"], string> = {
      business_sale: "M&A",
      capital: "Capital",
      ai_strategy: "AI Strategy",
      real_estate: "Real Estate",
      exit: "Exit",
    };
    return labels[type];
  };

  return (
    <div className="space-y-6">
      {/* Header - The Mission */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-500" />
            Deal Flow Command Center
          </h1>
          <p className="text-muted-foreground">
            Positioning ourselves to do deals of any kind — like water
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-green-400 border-green-400/50">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
            System Active
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLastRefresh(new Date())}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Pipeline Flow - Visual Deal Journey */}
      <Card className="bg-gradient-to-r from-zinc-900/50 to-zinc-800/50 border-zinc-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" />
            The Pipeline — Data to Deal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {pipelineStages.map((stage, index) => (
              <div key={stage.id} className="flex items-center">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col items-center"
                >
                  <div
                    className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center text-white mb-2",
                      stage.color
                    )}
                  >
                    {stage.icon}
                  </div>
                  <span className="text-sm font-medium">{stage.name}</span>
                  <span className="text-2xl font-bold">
                    {sf(stage.count)}
                  </span>
                  {stage.value > 0 && (
                    <span className="text-xs text-green-400">
                      ${(stage.value / 1000000).toFixed(1)}M
                    </span>
                  )}
                </motion.div>
                {index < pipelineStages.length - 1 && (
                  <ArrowRight className="w-6 h-6 text-zinc-600 mx-2" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Signal Metrics - The Pulse */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {signalMetrics.map((metric, index) => (
          <motion.div
            key={metric.name}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">
                    {metric.name}
                  </span>
                  {metric.trend === "up" && (
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  )}
                  {metric.trend === "down" && (
                    <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{metric.value}</span>
                  <span
                    className={cn(
                      "text-xs",
                      metric.trend === "up"
                        ? "text-green-400"
                        : metric.trend === "down"
                        ? "text-red-400"
                        : "text-zinc-400"
                    )}
                  >
                    {metric.change > 0 ? "+" : ""}
                    {metric.change}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Active Deal Opportunities */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            Hot Opportunities — Ready to Close
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dealOpportunities.map((deal) => (
              <motion.div
                key={deal.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                    {getDealTypeIcon(deal.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{deal.company}</span>
                      <Badge variant="outline" className="text-xs">
                        {getDealTypeBadge(deal.type)}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {deal.contact} • {deal.stage}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-400">
                    {deal.value}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {deal.lastTouch}
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  {deal.nextAction}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gianna Loop Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-purple-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              Gianna Perpetual Loop
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Active Sequences</span>
              <span className="text-2xl font-bold text-purple-400">234</span>
            </div>
            <Progress value={65} className="h-2" />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold">847</div>
                <div className="text-xs text-muted-foreground">Sent Today</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-400">124</div>
                <div className="text-xs text-muted-foreground">Responses</div>
              </div>
              <div>
                <div className="text-lg font-bold text-yellow-400">45</div>
                <div className="text-xs text-muted-foreground">Hot Leads</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border-blue-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-400" />
              API Signals — The Pulse
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm">SignalHouse</span>
                </div>
                <div className="text-lg font-bold">99.8% uptime</div>
              </div>
              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm">Apollo.io</span>
                </div>
                <div className="text-lg font-bold">2,847 enriched</div>
              </div>
              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm">RealEstateAPI</span>
                </div>
                <div className="text-lg font-bold">1,245 traces</div>
              </div>
              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  <span className="text-sm">Twilio</span>
                </div>
                <div className="text-lg font-bold">56 calls</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer - Last Update */}
      <div className="text-center text-sm text-muted-foreground">
        Last updated: {lastRefresh.toLocaleTimeString()} •{" "}
        <span className="text-green-400">All systems operational</span>
      </div>
    </div>
  );
}

export default DealFlowDashboard;
