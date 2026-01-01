"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Library } from "lucide-react";
import {
  Zap,
  Bell,
  Calendar,
  Play,
  Upload,
  Eye,
  Sparkles,
  Loader2,
  Check,
  AlertTriangle,
  Plus,
  Users,
  MessageSquare,
  Target,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ALL_EXAMPLE_TEMPLATES } from "@/lib/templates/nextier-defaults";

/**
 * PRE-QUEUE PAGE
 *
 * Each pre-queue IS the template with full programming ability + leads attached.
 * This is the weapon: Template + Block + SEND NOW
 *
 * Templates load dynamically based on team configuration.
 * NO generic ROI claims - each tenant has their own messaging.
 */

// Worker configurations with dark theme colors
const WORKER_CONFIG = {
  gianna: {
    name: "GIANNA",
    role: "Opener",
    icon: Zap,
    color: "text-purple-300",
    bgColor: "bg-purple-900/50 border border-purple-500/30",
    gradient: "from-purple-600 to-purple-800",
  },
  cathy: {
    name: "CATHY",
    role: "Nudger",
    icon: Bell,
    color: "text-orange-300",
    bgColor: "bg-orange-900/50 border border-orange-500/30",
    gradient: "from-orange-600 to-orange-800",
  },
  sabrina: {
    name: "SABRINA",
    role: "Closer",
    icon: Calendar,
    color: "text-emerald-300",
    bgColor: "bg-emerald-900/50 border border-emerald-500/30",
    gradient: "from-emerald-600 to-emerald-800",
  },
};

type WorkerType = keyof typeof WORKER_CONFIG;

interface PreQueue {
  id: string;
  name: string;
  category: "initial" | "retarget" | "nudge" | "closer";
  worker: WorkerType;
  template: string;
  leadCount: number;
  leadIds: string[]; // Track actual lead IDs for sending
  targetSize: number;
  status: "ready" | "sending" | "paused" | "empty";
  lastSentAt?: Date;
}

// ============================================
// NEXTIER TEMPLATES - Business Broker Exit Strategy
// NO ROI claims - Thomas valuation messaging
// ============================================
const NEXTIER_TEMPLATES = {
  initial: "{firstName}, thinking about your exit strategy for {companyName}? We help trades maximize value. Is this on your radar?",
  retarget: "{firstName}, know what {companyName} is worth? Most owners leave money on the table. Want a quick valuation?",
  nudge: "{firstName}, straight up — is this worth 15 min to explore? If not, just say so. If yes, I'll get you on with Thomas.",
  closer: "{firstName}, let's get you 15 min with Thomas. He'll walk you through the valuation. What day works - Tues or Thurs?",
};

// ============================================
// ATLANTIC COAST TEMPLATES - Carrier Partnerships
// NO ROI claims - partnership language for Frank Sr
// ============================================
const ATLANTIC_COAST_TEMPLATES = {
  initial: "Hi {firstName}, Atlantic Coast Auto Transport here. We help dealerships like {companyName} move vehicles fast - dealer trades, auctions, customer deliveries. 15 min with Frank to discuss?",
  retarget: "{firstName}, when {companyName} needs cars moved fast, do you have reliable backup? We partner with dealerships for overflow transport. Quick call with Frank?",
  nudge: "Hey {firstName}, following up on Atlantic Coast. Still looking for a transport partner for {companyName}? Frank's got a few minutes this week.",
  closer: "Great {firstName}! Let's get you 15 min with Frank to discuss the partnership. What day works this week - Tues or Thurs?",
};

// Get templates based on tenant/team
const getTenantTemplates = (teamId: string): PreQueue[] => {
  const teamLower = teamId.toLowerCase();
  const isAtlanticCoast = teamLower.includes("atlantic") || teamLower.includes("transport") || teamLower.includes("frank");
  const templates = isAtlanticCoast ? ATLANTIC_COAST_TEMPLATES : NEXTIER_TEMPLATES;

  return [
    {
      id: "pq-initial",
      name: "INITIAL SMS",
      category: "initial",
      worker: "gianna",
      template: templates.initial,
      leadCount: 0,
      leadIds: [],
      targetSize: 2000,
      status: "empty",
    },
    {
      id: "pq-retarget",
      name: "RETARGET SMS",
      category: "retarget",
      worker: "gianna",
      template: templates.retarget,
      leadCount: 0,
      leadIds: [],
      targetSize: 2000,
      status: "empty",
    },
    {
      id: "pq-nudge",
      name: "NUDGE SMS",
      category: "nudge",
      worker: "cathy",
      template: templates.nudge,
      leadCount: 0,
      leadIds: [],
      targetSize: 2000,
      status: "empty",
    },
    {
      id: "pq-closer",
      name: "CLOSER SMS",
      category: "closer",
      worker: "sabrina",
      template: templates.closer,
      leadCount: 0,
      leadIds: [],
      targetSize: 2000,
      status: "empty",
    },
  ];
};

export default function PreQueuePage() {
  const params = useParams();
  const teamId = (params?.team as string) || "default";

  // Load tenant-specific templates based on team ID
  const [preQueues, setPreQueues] = useState<PreQueue[]>(() =>
    getTenantTemplates(teamId),
  );
  const [editingQueue, setEditingQueue] = useState<PreQueue | null>(null);
  const [editedTemplate, setEditedTemplate] = useState("");
  const [previewQueue, setPreviewQueue] = useState<PreQueue | null>(null);
  const [remixingId, setRemixingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [enrichProgress, setEnrichProgress] = useState<{current: number; total: number; success: number; failed: number} | null>(null);
  const [skipTracingId, setSkipTracingId] = useState<string | null>(null);
  const [skipTraceProgress, setSkipTraceProgress] = useState<{current: number; total: number; withPhone: number; failed: number} | null>(null);
  const [selectingTemplateFor, setSelectingTemplateFor] = useState<string | null>(null);

  // Template library - NEXTIER templates (business-broker and universal only)
  // NO percentage claims, NO ROI claims - Thomas compliance
  const templateLibrary = ALL_EXAMPLE_TEMPLATES
    .filter((t: { vertical: string }) => t.vertical === "business-broker" || t.vertical === "universal")
    .map((t: { id: string; name: string; content: string; category: string; worker: string; vertical: string; variables: string[]; characterCount: number; complianceApproved: boolean }) => ({ ...t, source: "nextier" as const }));

  // Monthly pool tracking - starts at 0 until real data
  const [monthlyPool] = useState({
    used: 0,
    total: 20000,
  });

  // Calculate totals
  const totalLeadsQueued = preQueues.reduce((acc, pq) => acc + pq.leadCount, 0);
  const totalReady = preQueues.filter((pq) => pq.leadCount > 0).length;

  // Remix template to 160 chars
  const remixTo160 = async (queue: PreQueue) => {
    if (queue.template.length <= 160) {
      toast.info("Template is already under 160 characters");
      return;
    }

    setRemixingId(queue.id);
    try {
      const response = await fetch("/api/ai/remix-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: queue.template,
          targetLength: 160,
          preserveVariables: true,
          worker: queue.worker,
          category: queue.category,
        }),
      });

      const data = await response.json();
      if (data.success && data.remixedContent) {
        setPreQueues((prev) =>
          prev.map((pq) =>
            pq.id === queue.id ? { ...pq, template: data.remixedContent } : pq,
          ),
        );
        toast.success(
          `Remixed: ${queue.template.length} → ${data.remixedContent.length} chars`,
        );
      } else {
        toast.error(data.error || "Failed to remix");
      }
    } catch (error) {
      console.error("Remix error:", error);
      toast.error("Failed to remix template");
    } finally {
      setRemixingId(null);
    }
  };

  // Load leads into pre-queue
  const loadLeads = async (
    queueId: string,
    source: "new" | "no-response" | "engaged",
  ) => {
    setLoadingId(queueId);
    try {
      // Fetch leads from API based on source/status
      const response = await fetch(
        `/api/leads?teamId=${teamId}&status=${source}&limit=2000`,
      );
      const data = await response.json();

      // Get actual lead IDs and count
      const leadIds: string[] = data.leads?.map((l: { id: string }) => l.id) || [];
      const leadCount = leadIds.length;

      setPreQueues((prev) =>
        prev.map((pq) =>
          pq.id === queueId
            ? { ...pq, leadCount, leadIds, status: leadCount > 0 ? "ready" : "empty" }
            : pq,
        ),
      );

      if (leadCount > 0) {
        toast.success(`Loaded ${leadCount} leads`);
      } else {
        toast.info("No leads found for this status");
      }
    } catch (error) {
      console.error("Load error:", error);
      toast.error("Failed to load leads - check API connection");
    } finally {
      setLoadingId(null);
    }
  };

  // SKIP TRACE leads using RealEstateAPI - BULK
  const skipTraceLeads = async (queue: PreQueue) => {
    if (queue.leadIds.length === 0) {
      toast.error("No leads to skip trace - click LOAD first");
      return;
    }

    setSkipTracingId(queue.id);
    setSkipTraceProgress({ current: 0, total: queue.leadIds.length, withPhone: 0, failed: 0 });

    try {
      // Call bulk skip trace API
      const response = await fetch("/api/skip-trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: queue.leadIds.slice(0, 1000), // Max 1000 per bulk call
          bulk: true, // Use SkipTraceBatchAwait API
        }),
      });

      const data = await response.json();

      if (data.success && data.results) {
        setSkipTraceProgress({
          current: data.stats?.total || 0,
          total: queue.leadIds.length,
          withPhone: data.stats?.withPhones || 0,
          failed: data.stats?.errors || 0,
        });

        // Update leads in database with phone numbers
        let updated = 0;
        for (const result of data.results) {
          if (result.success && result.phones?.length > 0) {
            const mobilePhone = result.phones.find(
              (p: { type?: string }) => p.type?.toLowerCase() === "mobile" || p.type?.toLowerCase() === "cell"
            ) || result.phones[0];

            if (mobilePhone?.number && result.id) {
              try {
                await fetch(`/api/leads/${result.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    phone: mobilePhone.number,
                    skipTracedAt: new Date().toISOString(),
                    skipTraceSource: "realestate-api",
                    ownerName: result.ownerName,
                  }),
                });
                updated++;
              } catch {
                // Skip failed update
              }
            }
          }
        }

        toast.success(
          `Skip traced ${data.stats?.total || 0} leads: ${data.stats?.withPhones || 0} with phones (${data.stats?.withMobiles || 0} mobile)`
        );

        // Show usage stats
        if (data.usage) {
          toast.info(`Daily usage: ${data.usage.today}/${data.usage.limit} (${data.usage.remaining} remaining)`);
        }
      } else {
        throw new Error(data.error || "Skip trace failed");
      }
    } catch (error) {
      console.error("Skip trace error:", error);
      toast.error(error instanceof Error ? error.message : "Skip trace failed");
    } finally {
      setSkipTracingId(null);
      setSkipTraceProgress(null);
    }
  };

  // Enrich leads with Apollo - BULK
  const enrichLeads = async (queue: PreQueue) => {
    if (queue.leadIds.length === 0) {
      toast.error("No leads to enrich - click LOAD first");
      return;
    }

    setEnrichingId(queue.id);
    setEnrichProgress({ current: 0, total: queue.leadIds.length, success: 0, failed: 0 });

    let success = 0;
    let failed = 0;

    try {
      // Fetch lead details first
      const leadsRes = await fetch(`/api/leads?teamId=${teamId}&ids=${queue.leadIds.slice(0, 100).join(",")}`);
      const leadsData = await leadsRes.json();
      const leads = leadsData.leads || [];

      for (let i = 0; i < leads.length; i++) {
        const lead = leads[i];
        try {
          const res = await fetch("/api/apollo/enrich", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: lead.email,
              domain: lead.company ? `${lead.company.toLowerCase().replace(/\s+/g, "")}.com` : undefined,
              firstName: lead.firstName || lead.first_name,
              lastName: lead.lastName || lead.last_name,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.result) {
              success++;
              const person = data.result;
              const org = person.organization || {};

              // Update lead with FULL skip trace data:
              // - Owner name (first + last)
              // - Business address
              // - Phone numbers
              // - Email
              await fetch(`/api/leads/${lead.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  // Owner name
                  firstName: person.first_name || lead.firstName,
                  lastName: person.last_name || lead.lastName,
                  ownerName: `${person.first_name || ""} ${person.last_name || ""}`.trim() || lead.ownerName,

                  // Business address
                  address: org.street_address || lead.address,
                  city: org.city || lead.city,
                  state: org.state || lead.state,
                  zip: org.postal_code || lead.zip,

                  // Contact info
                  phone: person.phone_numbers?.[0]?.sanitized_number || person.phone || lead.phone,
                  email: person.email || lead.email,
                  title: person.title || lead.title,

                  // Company info
                  company: org.name || lead.company,

                  // Metadata
                  enrichedAt: new Date().toISOString(),
                  enrichSource: "apollo",
                }),
              });
            } else {
              failed++;
            }
          } else {
            failed++;
          }
        } catch {
          failed++;
        }

        setEnrichProgress({ current: i + 1, total: leads.length, success, failed });

        // Rate limit - 200ms between requests
        await new Promise(r => setTimeout(r, 200));
      }

      toast.success(`Enriched ${success} leads (${failed} failed)`);
    } catch (error) {
      console.error("Enrich error:", error);
      toast.error("Enrichment failed");
    } finally {
      setEnrichingId(null);
      setEnrichProgress(null);
    }
  };

  // Send pre-queue - REAL SMS via SignalHouse
  const sendQueue = async (queue: PreQueue) => {
    if (queue.leadCount === 0 || queue.leadIds.length === 0) {
      toast.error("No leads in queue - click LOAD first");
      return;
    }

    setSendingId(queue.id);
    setPreQueues((prev) =>
      prev.map((pq) =>
        pq.id === queue.id ? { ...pq, status: "sending" } : pq,
      ),
    );

    try {
      // Call SMS batch API to send messages via SignalHouse
      const response = await fetch("/api/sms/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: queue.leadIds,
          workspaceId: teamId,
          batchNumber: 1,
          message: queue.template,
          assignedAdvisor: queue.worker === "sabrina" ? "sabrina" : "gianna",
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(
          `Sent ${result.batch?.sent || queue.leadCount} messages via ${WORKER_CONFIG[queue.worker].name}`,
        );

        // Update pool and clear queue
        setPreQueues((prev) =>
          prev.map((pq) =>
            pq.id === queue.id
              ? { ...pq, leadCount: 0, leadIds: [], status: "empty", lastSentAt: new Date() }
              : pq,
          ),
        );
      } else {
        throw new Error(result.error || "Send failed");
      }
    } catch (error) {
      console.error("Send error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send");
      setPreQueues((prev) =>
        prev.map((pq) =>
          pq.id === queue.id ? { ...pq, status: "ready" } : pq,
        ),
      );
    } finally {
      setSendingId(null);
    }
  };

  // Save template edit
  const saveTemplate = () => {
    if (!editingQueue) return;

    setPreQueues((prev) =>
      prev.map((pq) =>
        pq.id === editingQueue.id ? { ...pq, template: editedTemplate } : pq,
      ),
    );
    setEditingQueue(null);
    toast.success("Template saved");
  };

  // Start editing
  const startEditing = (queue: PreQueue) => {
    setEditingQueue(queue);
    setEditedTemplate(queue.template);
  };

  // Select template from library
  const selectTemplate = (queueId: string, content: string) => {
    setPreQueues((prev) =>
      prev.map((pq) =>
        pq.id === queueId ? { ...pq, template: content } : pq,
      ),
    );
    setSelectingTemplateFor(null);
    toast.success("Template selected");
  };

  // Extract variables from template
  const extractVariables = (template: string) => {
    const matches = template.match(/\{[^}]+\}/g) || [];
    return [...new Set(matches)];
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Pool Tracker */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-purple-400" />
            Pre-Queues
          </h1>
          <p className="text-muted-foreground mt-1">
            Template + Leads = Ready to Fire
          </p>
        </div>

        <div className="flex items-center gap-6">
          {/* Stats */}
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Queued</div>
            <div className="text-xl font-bold">
              {totalLeadsQueued.toLocaleString()}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Ready</div>
            <div className="text-xl font-bold text-green-400">
              {totalReady}/4
            </div>
          </div>

          {/* Monthly Pool */}
          <Card className="bg-zinc-900 border-zinc-800 w-64">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  Monthly Pool
                </span>
                <span className="text-sm font-medium">
                  {monthlyPool.used.toLocaleString()} /{" "}
                  {monthlyPool.total.toLocaleString()}
                </span>
              </div>
              <Progress
                value={(monthlyPool.used / monthlyPool.total) * 100}
                className="h-2"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pre-Queue Cards */}
      <div className="space-y-4">
        {preQueues.map((queue) => {
          const worker = WORKER_CONFIG[queue.worker];
          const charCount = queue.template.length;
          const isCompliant = charCount <= 160;
          const variables = extractVariables(queue.template);
          const isLoading = loadingId === queue.id;
          const isSending = sendingId === queue.id;
          const isRemixing = remixingId === queue.id;
          const isEnriching = enrichingId === queue.id;
          const isSkipTracing = skipTracingId === queue.id;

          return (
            <Card
              key={queue.id}
              className="bg-zinc-900 border-zinc-800 overflow-hidden"
            >
              <CardContent className="p-0">
                <div className="flex">
                  {/* Left: Worker Badge */}
                  <div
                    className={cn(
                      "w-32 p-4 flex flex-col items-center justify-center gap-2",
                      `bg-gradient-to-br ${worker.gradient}`,
                    )}
                  >
                    <worker.icon className="h-8 w-8 text-white" />
                    <div className="text-center">
                      <div className="font-bold text-white text-sm">
                        {worker.name}
                      </div>
                      <div className="text-xs text-white/70">{worker.role}</div>
                    </div>
                  </div>

                  {/* Center: Template + Meta */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg">{queue.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              worker.bgColor,
                              worker.color,
                            )}
                          >
                            {queue.category.toUpperCase()}
                          </Badge>
                          {queue.lastSentAt && (
                            <span className="text-xs text-muted-foreground">
                              Last sent: {queue.lastSentAt.toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Char Counter + Compliance */}
                      <div className="flex items-center gap-2">
                        <Badge
                          className={cn(
                            "text-xs",
                            isCompliant
                              ? "bg-green-900/50 text-green-300 border-green-500/30"
                              : "bg-red-900/50 text-red-300 border-red-500/30",
                          )}
                        >
                          {charCount}/160
                          {isCompliant ? (
                            <Check className="h-3 w-3 ml-1" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 ml-1" />
                          )}
                        </Badge>
                        {!isCompliant && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                            onClick={() => remixTo160(queue)}
                            disabled={isRemixing}
                          >
                            {isRemixing ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3 mr-1" />
                                Remix
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Template Display */}
                    <div
                      className="p-3 bg-zinc-800 rounded-lg border border-zinc-700 cursor-pointer hover:border-zinc-600 transition-colors"
                      onClick={() => startEditing(queue)}
                    >
                      <p className="text-sm leading-relaxed">
                        {queue.template.split(/(\{[^}]+\})/).map((part, i) =>
                          part.startsWith("{") ? (
                            <span
                              key={i}
                              className="text-purple-400 font-medium"
                            >
                              {part}
                            </span>
                          ) : (
                            <span key={i}>{part}</span>
                          ),
                        )}
                      </p>
                    </div>

                    {/* Variables */}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-muted-foreground">
                        Variables:
                      </span>
                      {variables.map((v, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-[10px] bg-zinc-800 border-zinc-700"
                        >
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Right: Lead Count + Actions */}
                  <div className="w-64 p-4 border-l border-zinc-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Leads
                        </span>
                      </div>
                      <div className="text-3xl font-bold mb-1">
                        {queue.leadCount.toLocaleString()}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{queue.targetSize.toLocaleString()}
                        </span>
                      </div>
                      <Progress
                        value={(queue.leadCount / queue.targetSize) * 100}
                        className="h-1.5 mb-3"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-zinc-700 hover:bg-zinc-800"
                          onClick={() =>
                            loadLeads(
                              queue.id,
                              queue.category === "initial"
                                ? "new"
                                : queue.category === "retarget"
                                  ? "no-response"
                                  : "engaged",
                            )
                          }
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Upload className="h-3 w-3 mr-1" />
                              LOAD
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-cyan-700 text-cyan-300 hover:bg-cyan-900/50"
                          onClick={() => skipTraceLeads(queue)}
                          disabled={isSkipTracing || queue.leadCount === 0}
                          title="Skip Trace - Find phone numbers via RealEstateAPI"
                        >
                          {isSkipTracing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Phone className="h-3 w-3 mr-1" />
                              SKIP
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-purple-700 text-purple-300 hover:bg-purple-900/50"
                          onClick={() => enrichLeads(queue)}
                          disabled={isEnriching || queue.leadCount === 0}
                          title="Apollo Enrich - B2B contact data"
                        >
                          {isEnriching ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3 mr-1" />
                              ENRICH
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-zinc-700 hover:bg-zinc-800"
                          onClick={() => setPreviewQueue(queue)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-blue-700 text-blue-300 hover:bg-blue-900/50"
                          onClick={() => setSelectingTemplateFor(queue.id)}
                        >
                          <Library className="h-3 w-3" />
                        </Button>
                      </div>
                      {/* Skip Trace Progress */}
                      {isSkipTracing && skipTraceProgress && (
                        <div className="space-y-1">
                          <Progress value={(skipTraceProgress.current / skipTraceProgress.total) * 100} className="h-1.5" />
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{skipTraceProgress.current}/{skipTraceProgress.total}</span>
                            <span className="text-cyan-400">{skipTraceProgress.withPhone} with phone</span>
                          </div>
                        </div>
                      )}
                      {/* Enrichment Progress */}
                      {isEnriching && enrichProgress && (
                        <div className="space-y-1">
                          <Progress value={(enrichProgress.current / enrichProgress.total) * 100} className="h-1.5" />
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{enrichProgress.current}/{enrichProgress.total}</span>
                            <span className="text-green-400">{enrichProgress.success} enriched</span>
                          </div>
                        </div>
                      )}
                      <Button
                        className={cn(
                          "w-full",
                          queue.leadCount > 0
                            ? `bg-gradient-to-r ${worker.gradient} hover:opacity-90`
                            : "bg-zinc-800 text-zinc-500",
                        )}
                        disabled={queue.leadCount === 0 || isSending}
                        onClick={() => sendQueue(queue)}
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        SEND NOW
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Custom Pre-Queue */}
      <Card className="bg-zinc-900/50 border-zinc-800 border-dashed">
        <CardContent className="p-6">
          <Button
            variant="ghost"
            className="w-full h-16 text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Custom Pre-Queue
          </Button>
        </CardContent>
      </Card>

      {/* Template Editor Dialog */}
      <Dialog open={!!editingQueue} onOpenChange={() => setEditingQueue(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Edit: {editingQueue?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <Textarea
              value={editedTemplate}
              onChange={(e) => setEditedTemplate(e.target.value)}
              className="min-h-32 bg-zinc-800 border-zinc-700 font-mono"
              placeholder="Write your template..."
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge
                  className={cn(
                    editedTemplate.length <= 160
                      ? "bg-green-900/50 text-green-300"
                      : "bg-red-900/50 text-red-300",
                  )}
                >
                  {editedTemplate.length}/160 chars
                </Badge>
                {editedTemplate.length > 160 && (
                  <span className="text-xs text-red-400">
                    {editedTemplate.length - 160} over limit
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Variables:
                {["{firstName}", "{companyName}", "{industry}"].map((v) => (
                  <Button
                    key={v}
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setEditedTemplate((prev) => prev + " " + v)}
                  >
                    {v}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setEditingQueue(null)}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={saveTemplate}
                className="bg-gradient-to-r from-purple-600 to-blue-600"
              >
                Save Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewQueue} onOpenChange={() => setPreviewQueue(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview: {previewQueue?.name}
            </DialogTitle>
          </DialogHeader>

          {previewQueue && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-zinc-800 rounded-lg">
                <p className="text-sm">
                  {previewQueue.template
                    .replace("{firstName}", "John")
                    .replace("{companyName}", "Acme Corp")
                    .replace("{industry}", "consulting")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Worker:</span>
                  <span className="ml-2 font-medium">
                    {WORKER_CONFIG[previewQueue.worker].name}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Leads:</span>
                  <span className="ml-2 font-medium">
                    {previewQueue.leadCount.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <span className="ml-2 font-medium capitalize">
                    {previewQueue.category}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Characters:</span>
                  <span
                    className={cn(
                      "ml-2 font-medium",
                      previewQueue.template.length <= 160
                        ? "text-green-400"
                        : "text-red-400",
                    )}
                  >
                    {previewQueue.template.length}/160
                  </span>
                </div>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600"
                onClick={() => setPreviewQueue(null)}
              >
                Close Preview
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Template Library Dialog */}
      <Dialog open={!!selectingTemplateFor} onOpenChange={() => setSelectingTemplateFor(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Library className="h-5 w-5" />
              Select Template from Library
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6">
              {/* GIANNA Templates */}
              <div>
                <h3 className="text-sm font-bold text-purple-400 mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  GIANNA - Opener Templates
                </h3>
                <div className="grid gap-2">
                  {templateLibrary.filter(t => t.worker === "gianna").map(t => (
                    <div
                      key={t.id}
                      className="p-3 bg-zinc-800 rounded-lg border border-zinc-700 hover:border-purple-500 cursor-pointer transition-colors"
                      onClick={() => selectingTemplateFor && selectTemplate(selectingTemplateFor, t.content)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-medium">{t.name}</span>
                        <Badge variant="outline" className="text-xs">{t.characterCount} chars</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{t.content}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CATHY Templates */}
              <div>
                <h3 className="text-sm font-bold text-orange-400 mb-3 flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  CATHY - Nudger Templates
                </h3>
                <div className="grid gap-2">
                  {templateLibrary.filter(t => t.worker === "cathy").map(t => (
                    <div
                      key={t.id}
                      className="p-3 bg-zinc-800 rounded-lg border border-zinc-700 hover:border-orange-500 cursor-pointer transition-colors"
                      onClick={() => selectingTemplateFor && selectTemplate(selectingTemplateFor, t.content)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-medium">{t.name}</span>
                        <Badge variant="outline" className="text-xs">{t.characterCount} chars</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{t.content}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* SABRINA Templates */}
              <div>
                <h3 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  SABRINA - Closer Templates
                </h3>
                <div className="grid gap-2">
                  {templateLibrary.filter(t => t.worker === "sabrina").map(t => (
                    <div
                      key={t.id}
                      className="p-3 bg-zinc-800 rounded-lg border border-zinc-700 hover:border-emerald-500 cursor-pointer transition-colors"
                      onClick={() => selectingTemplateFor && selectTemplate(selectingTemplateFor, t.content)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-medium">{t.name}</span>
                        <Badge variant="outline" className="text-xs">{t.characterCount} chars</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{t.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
