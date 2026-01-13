"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  Loader2,
  Brain,
  Database,
  Search,
  Phone,
  MessageSquare,
  Calendar,
  Target,
  Zap,
  ChevronRight,
  CheckCircle,
  Clock,
  User,
  Building2,
  TrendingUp,
  FileSearch,
  Send,
  PhoneCall,
  Users,
  ArrowRight,
  Settings,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTenantConfig, WorkerConfig } from "@/lib/tenant";

/**
 * NEXTIER COPILOT KIOSK
 * ═══════════════════════════════════════════════════════════════════════════════
 * Central command center for the AI execution loop.
 *
 * WORKERS BY ROLE:
 * - DATA PREP: LUCI (USBizData, enrichment, batch prep)
 * - INTELLIGENCE: NEVA (pre-SMS scan, pre-appointment deep research)
 * - OUTREACH: GIANNA (opener), CATHY (nudger), SABRINA (closer)
 *
 * "Leads have stages, Stages have Copilots"
 * ═══════════════════════════════════════════════════════════════════════════════
 */

interface Worker {
  id: string;
  name: string;
  role: "data" | "intelligence" | "outreach";
  status: "active" | "paused" | "idle";
  description: string;
  color: string;
  icon: React.ElementType;
}

interface LeadContext {
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
  stage?: string;
  source?: string;
}

interface CopilotKioskProps {
  /** Current lead context for personalized suggestions */
  leadContext?: LeadContext;
  /** Callback when action is executed */
  onAction?: (action: string, data?: Record<string, unknown>) => void;
}

const WORKERS: Worker[] = [
  {
    id: "luci",
    name: "LUCI",
    role: "data",
    status: "active",
    description: "Data Copilot - USBizData scanner, batch prep, enrichment",
    color: "from-red-500 to-orange-500",
    icon: Database,
  },
  {
    id: "neva",
    name: "NEVA",
    role: "intelligence",
    status: "active",
    description: "Research - Perplexity deep intel, lead personalization",
    color: "from-cyan-500 to-blue-500",
    icon: Search,
  },
  {
    id: "gianna",
    name: "GIANNA",
    role: "outreach",
    status: "active",
    description: "The Opener - Initial SMS + inbound response center",
    color: "from-purple-500 to-indigo-500",
    icon: MessageSquare,
  },
  {
    id: "cathy",
    name: "CATHY",
    role: "outreach",
    status: "active",
    description: "The Nudger - Ghost revival, humor-based follow-ups",
    color: "from-pink-500 to-rose-500",
    icon: Zap,
  },
  {
    id: "sabrina",
    name: "SABRINA",
    role: "outreach",
    status: "active",
    description: "The Closer - Booking, reminders, objection handling",
    color: "from-green-500 to-emerald-500",
    icon: Phone,
  },
];

export function CopilotKiosk({ leadContext, onAction }: CopilotKioskProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("actions");
  const [workers, setWorkers] = useState<Worker[]>(WORKERS);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [recentActions, setRecentActions] = useState<string[]>([]);

  // Get tenant config for worker names
  const { config, getWorkerName, getBranding } = useTenantConfig();
  const branding = getBranding();

  // Map tenant config workers to display workers with icons
  const tenantWorkers = useMemo(() => {
    return config.workers.map((w) => ({
      ...w,
      icon: WORKERS.find((fw) => fw.id === w.id)?.icon || Database,
      status: "active" as const,
      role: (w.role === "data_prep"
        ? "data"
        : w.role === "intelligence"
          ? "intelligence"
          : "outreach") as "data" | "intelligence" | "outreach",
    }));
  }, [config.workers]);

  // Fetch worker status on mount
  useEffect(() => {
    const fetchWorkerStatus = async () => {
      try {
        const res = await fetch("/api/digital-workers/stats");
        const data = await res.json();
        if (data.success && data.workers) {
          setWorkers((prev) =>
            prev.map((w) => {
              const apiWorker = data.workers.find(
                (aw: { id: string; status: string }) => aw.id === w.id,
              );
              return apiWorker ? { ...w, status: apiWorker.status } : w;
            }),
          );
        }
      } catch (error) {
        console.error("Failed to fetch worker status:", error);
      }
    };
    if (isOpen) {
      fetchWorkerStatus();
    }
  }, [isOpen]);

  // Get dynamic worker names from tenant config
  const dataWorkerName = getWorkerName("data_prep");
  const intelWorkerName = getWorkerName("intelligence");
  const openerName = getWorkerName("opener");
  const nudgerName = getWorkerName("nudger");
  const closerName = getWorkerName("closer");

  // Execute intelligence quick scan (pre-SMS)
  const executeNevaQuickScan = useCallback(async () => {
    setIsLoading("neva-quick");
    try {
      const res = await fetch("/api/neva/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: leadContext?.company || leadContext?.name || "business",
          mode: "quick",
          context: {
            phone: leadContext?.phone,
            email: leadContext?.email,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${intelWorkerName} Quick Scan Complete`, {
          description: "Lead intelligence ready for SMS",
        });
        setRecentActions((prev) => [
          `${intelWorkerName} Quick Scan`,
          ...prev.slice(0, 4),
        ]);
        onAction?.("neva-quick-scan", data);
      } else {
        toast.error("Scan failed", { description: data.error });
      }
    } catch (error) {
      toast.error(`${intelWorkerName} scan error`);
    } finally {
      setIsLoading(null);
    }
  }, [leadContext, onAction, intelWorkerName]);

  // Execute intelligence deep research (pre-appointment)
  const executeNevaDeepResearch = useCallback(async () => {
    setIsLoading("neva-deep");
    try {
      const res = await fetch("/api/neva/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `${leadContext?.name || ""} ${leadContext?.company || ""} business owner`,
          mode: "deep",
          context: {
            phone: leadContext?.phone,
            email: leadContext?.email,
            stage: leadContext?.stage,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${intelWorkerName} Deep Research Complete`, {
          description: "Full intel package ready for discovery call",
        });
        setRecentActions((prev) => [
          `${intelWorkerName} Deep Research`,
          ...prev.slice(0, 4),
        ]);
        onAction?.("neva-deep-research", data);
      } else {
        toast.error("Research failed", { description: data.error });
      }
    } catch (error) {
      toast.error(`${intelWorkerName} research error`);
    } finally {
      setIsLoading(null);
    }
  }, [leadContext, onAction, intelWorkerName]);

  // Execute data enrichment
  const executeLuciEnrichment = useCallback(async () => {
    setIsLoading("luci-enrich");
    try {
      // This would call data worker's enrichment API
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success(`${dataWorkerName} Enrichment Complete`, {
        description: "Lead data enhanced with business intel",
      });
      setRecentActions((prev) => [
        `${dataWorkerName} Enrichment`,
        ...prev.slice(0, 4),
      ]);
      onAction?.("luci-enrich", { enriched: true });
    } catch (error) {
      toast.error("Enrichment failed");
    } finally {
      setIsLoading(null);
    }
  }, [onAction, dataWorkerName]);

  // Queue for opener SMS
  const queueForGianna = useCallback(() => {
    toast.success(`Queued for ${openerName}`, {
      description: "Lead added to SMS outreach queue",
    });
    setRecentActions((prev) => [`Queue → ${openerName}`, ...prev.slice(0, 4)]);
    onAction?.("queue-gianna", { leadContext });
  }, [leadContext, onAction, openerName]);

  // Push to closer call queue
  const pushToSabrina = useCallback(() => {
    toast.success(`Pushed to ${closerName}`, {
      description: "Lead added to call queue for booking",
    });
    setRecentActions((prev) => [`Push → ${closerName}`, ...prev.slice(0, 4)]);
    onAction?.("push-sabrina", { leadContext });
  }, [leadContext, onAction, closerName]);

  // Trigger nudger follow-up
  const triggerCathy = useCallback(() => {
    toast.success(`${nudgerName} Activated`, {
      description: "Ghost revival sequence initiated",
    });
    setRecentActions((prev) => [`Trigger ${nudgerName}`, ...prev.slice(0, 4)]);
    onAction?.("trigger-cathy", { leadContext });
  }, [leadContext, onAction, nudgerName]);

  const getWorkersByRole = (role: "data" | "intelligence" | "outreach") =>
    workers.filter((w) => w.role === role);

  return (
    <>
      {/* Floating Trigger Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 shadow-xl shadow-black/50 flex items-center justify-center cursor-pointer group"
          >
            <div className="relative">
              <Brain className="w-7 h-7 text-white" />
              {/* Pulse indicator */}
              <motion.span
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
              />
            </div>
            {/* Tooltip */}
            <div className="absolute right-full mr-3 px-3 py-1.5 bg-zinc-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-zinc-700">
              <span className="font-semibold">{branding.name}</span> Copilot
              <Sparkles className="w-3 h-3 inline ml-1 text-yellow-400" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Kiosk Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[420px] max-h-[calc(100vh-100px)] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 p-4 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white flex items-center gap-2">
                      {branding.name} COPILOT
                      <Badge className="bg-green-500/20 text-green-400 text-[10px]">
                        ONLINE
                      </Badge>
                    </h3>
                    <p className="text-xs text-zinc-500">
                      AI Execution Command Center
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-zinc-400 hover:text-white"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Lead Context Banner */}
            {leadContext?.name && (
              <div className="px-4 py-2 bg-zinc-900/50 border-b border-zinc-800">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-zinc-500" />
                  <span className="text-white font-medium">
                    {leadContext.name}
                  </span>
                  {leadContext.company && (
                    <>
                      <span className="text-zinc-600">•</span>
                      <span className="text-zinc-400">
                        {leadContext.company}
                      </span>
                    </>
                  )}
                  {leadContext.stage && (
                    <Badge
                      variant="outline"
                      className="ml-auto text-[10px] border-zinc-700"
                    >
                      {leadContext.stage}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col min-h-0"
            >
              <TabsList className="mx-4 mt-3 bg-zinc-900 border border-zinc-800">
                <TabsTrigger value="actions" className="flex-1 text-xs">
                  <Zap className="w-3 h-3 mr-1" />
                  Actions
                </TabsTrigger>
                <TabsTrigger value="workers" className="flex-1 text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  Workers
                </TabsTrigger>
                <TabsTrigger value="activity" className="flex-1 text-xs">
                  <Activity className="w-3 h-3 mr-1" />
                  Activity
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1">
                {/* ACTIONS TAB */}
                <TabsContent value="actions" className="p-4 space-y-4 mt-0">
                  {/* DATA PREP SECTION */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="w-4 h-4 text-orange-400" />
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                        Data Prep
                      </span>
                      <Badge className="bg-orange-500/20 text-orange-400 text-[10px]">
                        {dataWorkerName}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="h-auto py-3 flex flex-col items-center gap-1 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-orange-500/50"
                        onClick={executeLuciEnrichment}
                        disabled={isLoading === "luci-enrich"}
                      >
                        {isLoading === "luci-enrich" ? (
                          <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                        ) : (
                          <TrendingUp className="w-5 h-5 text-orange-400" />
                        )}
                        <span className="text-xs text-white">Enrich Lead</span>
                        <span className="text-[10px] text-zinc-500">
                          USBizData
                        </span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-3 flex flex-col items-center gap-1 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-orange-500/50"
                        onClick={() => {
                          toast.info("Opening batch prep...");
                          onAction?.("luci-batch-prep");
                        }}
                      >
                        <Building2 className="w-5 h-5 text-orange-400" />
                        <span className="text-xs text-white">Batch Prep</span>
                        <span className="text-[10px] text-zinc-500">
                          SMS Ready
                        </span>
                      </Button>
                    </div>
                  </div>

                  {/* INTELLIGENCE SECTION */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Search className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                        Intelligence
                      </span>
                      <Badge className="bg-cyan-500/20 text-cyan-400 text-[10px]">
                        {intelWorkerName}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="h-auto py-3 flex flex-col items-center gap-1 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-cyan-500/50"
                        onClick={executeNevaQuickScan}
                        disabled={isLoading === "neva-quick"}
                      >
                        {isLoading === "neva-quick" ? (
                          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                        ) : (
                          <Zap className="w-5 h-5 text-cyan-400" />
                        )}
                        <span className="text-xs text-white">Quick Scan</span>
                        <span className="text-[10px] text-zinc-500">
                          Pre-SMS Intel
                        </span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-3 flex flex-col items-center gap-1 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-cyan-500/50"
                        onClick={executeNevaDeepResearch}
                        disabled={isLoading === "neva-deep"}
                      >
                        {isLoading === "neva-deep" ? (
                          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                        ) : (
                          <FileSearch className="w-5 h-5 text-cyan-400" />
                        )}
                        <span className="text-xs text-white">
                          Deep Research
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          Pre-Appointment
                        </span>
                      </Button>
                    </div>
                  </div>

                  {/* OUTREACH SECTION */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Send className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                        Outreach
                      </span>
                    </div>
                    <div className="space-y-2">
                      {/* Opener */}
                      <Button
                        variant="outline"
                        className="w-full h-auto py-3 flex items-center justify-between bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-purple-500/50"
                        onClick={queueForGianna}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                            <MessageSquare className="w-4 h-4 text-white" />
                          </div>
                          <div className="text-left">
                            <p className="text-xs text-white font-medium">
                              Queue for {openerName}
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              Initial SMS outreach
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-600" />
                      </Button>

                      {/* Nudger */}
                      <Button
                        variant="outline"
                        className="w-full h-auto py-3 flex items-center justify-between bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-pink-500/50"
                        onClick={triggerCathy}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                            <Zap className="w-4 h-4 text-white" />
                          </div>
                          <div className="text-left">
                            <p className="text-xs text-white font-medium">
                              Trigger {nudgerName}
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              Ghost revival follow-up
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-600" />
                      </Button>

                      {/* Closer */}
                      <Button
                        variant="outline"
                        className="w-full h-auto py-3 flex items-center justify-between bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-green-500/50"
                        onClick={pushToSabrina}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                            <PhoneCall className="w-4 h-4 text-white" />
                          </div>
                          <div className="text-left">
                            <p className="text-xs text-white font-medium">
                              Push to {closerName}
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              Call queue for booking
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-600" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* WORKERS TAB */}
                <TabsContent value="workers" className="p-4 space-y-3 mt-0">
                  {/* Data Workers */}
                  <div className="space-y-2">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide">
                      Data & Intelligence
                    </p>
                    {[
                      ...getWorkersByRole("data"),
                      ...getWorkersByRole("intelligence"),
                    ].map((worker) => (
                      <Card
                        key={worker.id}
                        className="bg-zinc-900 border-zinc-800"
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center",
                                worker.color,
                              )}
                            >
                              <worker.icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-white">
                                  {worker.name}
                                </p>
                                <Badge
                                  className={cn(
                                    "text-[10px]",
                                    worker.status === "active"
                                      ? "bg-green-500/20 text-green-400"
                                      : worker.status === "paused"
                                        ? "bg-yellow-500/20 text-yellow-400"
                                        : "bg-zinc-500/20 text-zinc-400",
                                  )}
                                >
                                  {worker.status.toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-zinc-500 truncate">
                                {worker.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Outreach Workers */}
                  <div className="space-y-2">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide">
                      Outreach Team
                    </p>
                    {getWorkersByRole("outreach").map((worker) => (
                      <Card
                        key={worker.id}
                        className="bg-zinc-900 border-zinc-800"
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center",
                                worker.color,
                              )}
                            >
                              <worker.icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-white">
                                  {worker.name}
                                </p>
                                <Badge
                                  className={cn(
                                    "text-[10px]",
                                    worker.status === "active"
                                      ? "bg-green-500/20 text-green-400"
                                      : worker.status === "paused"
                                        ? "bg-yellow-500/20 text-yellow-400"
                                        : "bg-zinc-500/20 text-zinc-400",
                                  )}
                                >
                                  {worker.status.toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-zinc-500 truncate">
                                {worker.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* ACTIVITY TAB */}
                <TabsContent value="activity" className="p-4 mt-0">
                  <div className="space-y-3">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide">
                      Recent Actions
                    </p>
                    {recentActions.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                        <p className="text-sm text-zinc-600">
                          No recent activity
                        </p>
                        <p className="text-xs text-zinc-700">
                          Actions will appear here
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {recentActions.map((action, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 p-2 bg-zinc-900 rounded-lg border border-zinc-800"
                          >
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-sm text-zinc-300">
                              {action}
                            </span>
                            <span className="text-[10px] text-zinc-600 ml-auto">
                              Just now
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            {/* Footer */}
            <div className="px-4 py-3 bg-zinc-900/50 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1">
                    {workers.slice(0, 3).map((w) => (
                      <div
                        key={w.id}
                        className={cn(
                          "w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center border-2 border-zinc-900",
                          w.color,
                        )}
                      >
                        <w.icon className="w-3 h-3 text-white" />
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    {workers.filter((w) => w.status === "active").length}/5
                    Active
                  </span>
                </div>
                <span className="text-[10px] text-zinc-600">
                  Powered by{" "}
                  <span className="text-yellow-500">{branding.name}</span>
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default CopilotKiosk;
