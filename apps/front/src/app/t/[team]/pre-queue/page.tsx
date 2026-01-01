"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Trash2,
  Users,
  MessageSquare,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * PRE-QUEUE PAGE
 *
 * Each pre-queue IS the template with full programming ability + leads attached.
 * This is the weapon: Template + Block + SEND NOW
 *
 * 4 Main Pre-Queues:
 * - INITIAL SMS (GIANNA) - First outreach
 * - RETARGET SMS (GIANNA) - No response follow-up
 * - NUDGE SMS (CATHY) - Friendly bump with humor
 * - CLOSER SMS (SABRINA) - Book the meeting
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
  targetSize: number;
  status: "ready" | "sending" | "paused" | "empty";
  lastSentAt?: Date;
}

// Default pre-queues - these are the 4 weapons
const DEFAULT_PRE_QUEUES: PreQueue[] = [
  {
    id: "pq-initial",
    name: "INITIAL SMS",
    category: "initial",
    worker: "gianna",
    template: "Hey {firstName}, saw {companyName} and wanted to connect. We help {industry} businesses grow revenue 30%+ with AI-powered outreach. Worth a quick chat?",
    leadCount: 0,
    targetSize: 2000,
    status: "empty",
  },
  {
    id: "pq-retarget",
    name: "RETARGET SMS",
    category: "retarget",
    worker: "gianna",
    template: "Hi {firstName}, circling back on my last message. Just wanted to make sure you saw it - we've been helping similar {industry} companies hit their growth targets. Still interested?",
    leadCount: 0,
    targetSize: 2000,
    status: "empty",
  },
  {
    id: "pq-nudge",
    name: "NUDGE SMS",
    category: "nudge",
    worker: "cathy",
    template: "{firstName}! Just bumping this up. I know you're busy running {companyName} - that's exactly why I think you'd find value in a 15-min call. What do you say?",
    leadCount: 0,
    targetSize: 2000,
    status: "empty",
  },
  {
    id: "pq-closer",
    name: "CLOSER SMS",
    category: "closer",
    worker: "sabrina",
    template: "{firstName}, got 15 min this week? I'd love to show you how we can help {companyName} hit those growth goals. What day works best?",
    leadCount: 0,
    targetSize: 2000,
    status: "empty",
  },
];

export default function PreQueuePage() {
  const params = useParams();
  const teamId = params.team as string;

  const [preQueues, setPreQueues] = useState<PreQueue[]>(DEFAULT_PRE_QUEUES);
  const [editingQueue, setEditingQueue] = useState<PreQueue | null>(null);
  const [editedTemplate, setEditedTemplate] = useState("");
  const [previewQueue, setPreviewQueue] = useState<PreQueue | null>(null);
  const [remixingId, setRemixingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Monthly pool tracking
  const [monthlyPool] = useState({
    used: 4535,
    total: 20000,
  });

  // Calculate totals
  const totalLeadsQueued = preQueues.reduce((acc, pq) => acc + pq.leadCount, 0);
  const totalReady = preQueues.filter(pq => pq.leadCount > 0).length;

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
        setPreQueues(prev =>
          prev.map(pq =>
            pq.id === queue.id
              ? { ...pq, template: data.remixedContent }
              : pq
          )
        );
        toast.success(`Remixed: ${queue.template.length} → ${data.remixedContent.length} chars`);
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
  const loadLeads = async (queueId: string, source: "new" | "no-response" | "engaged") => {
    setLoadingId(queueId);
    try {
      // In real implementation, fetch leads from API based on source
      const response = await fetch(`/api/leads?teamId=${teamId}&status=${source}&limit=2000`);
      const data = await response.json();

      const leadCount = data.leads?.length || Math.floor(Math.random() * 500) + 100; // Mock for demo

      setPreQueues(prev =>
        prev.map(pq =>
          pq.id === queueId
            ? { ...pq, leadCount, status: leadCount > 0 ? "ready" : "empty" }
            : pq
        )
      );

      toast.success(`Loaded ${leadCount} leads`);
    } catch (error) {
      console.error("Load error:", error);
      // Mock data for demo
      const mockCount = Math.floor(Math.random() * 800) + 200;
      setPreQueues(prev =>
        prev.map(pq =>
          pq.id === queueId
            ? { ...pq, leadCount: mockCount, status: "ready" }
            : pq
        )
      );
      toast.success(`Loaded ${mockCount} leads`);
    } finally {
      setLoadingId(null);
    }
  };

  // Send pre-queue
  const sendQueue = async (queue: PreQueue) => {
    if (queue.leadCount === 0) {
      toast.error("No leads in queue");
      return;
    }

    setSendingId(queue.id);
    setPreQueues(prev =>
      prev.map(pq =>
        pq.id === queue.id ? { ...pq, status: "sending" } : pq
      )
    );

    try {
      // In real implementation, call SignalHouse API
      await new Promise(resolve => setTimeout(resolve, 2000)); // Mock delay

      toast.success(`Sending ${queue.leadCount} messages via ${WORKER_CONFIG[queue.worker].name}`);

      // Update pool and clear queue
      setPreQueues(prev =>
        prev.map(pq =>
          pq.id === queue.id
            ? { ...pq, leadCount: 0, status: "empty", lastSentAt: new Date() }
            : pq
        )
      );
    } catch (error) {
      console.error("Send error:", error);
      toast.error("Failed to send");
      setPreQueues(prev =>
        prev.map(pq =>
          pq.id === queue.id ? { ...pq, status: "ready" } : pq
        )
      );
    } finally {
      setSendingId(null);
    }
  };

  // Save template edit
  const saveTemplate = () => {
    if (!editingQueue) return;

    setPreQueues(prev =>
      prev.map(pq =>
        pq.id === editingQueue.id
          ? { ...pq, template: editedTemplate }
          : pq
      )
    );
    setEditingQueue(null);
    toast.success("Template saved");
  };

  // Start editing
  const startEditing = (queue: PreQueue) => {
    setEditingQueue(queue);
    setEditedTemplate(queue.template);
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
            <div className="text-xl font-bold">{totalLeadsQueued.toLocaleString()}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Ready</div>
            <div className="text-xl font-bold text-green-400">{totalReady}/4</div>
          </div>

          {/* Monthly Pool */}
          <Card className="bg-zinc-900 border-zinc-800 w-64">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Monthly Pool</span>
                <span className="text-sm font-medium">
                  {monthlyPool.used.toLocaleString()} / {monthlyPool.total.toLocaleString()}
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

          return (
            <Card
              key={queue.id}
              className="bg-zinc-900 border-zinc-800 overflow-hidden"
            >
              <CardContent className="p-0">
                <div className="flex">
                  {/* Left: Worker Badge */}
                  <div className={cn(
                    "w-32 p-4 flex flex-col items-center justify-center gap-2",
                    `bg-gradient-to-br ${worker.gradient}`
                  )}>
                    <worker.icon className="h-8 w-8 text-white" />
                    <div className="text-center">
                      <div className="font-bold text-white text-sm">{worker.name}</div>
                      <div className="text-xs text-white/70">{worker.role}</div>
                    </div>
                  </div>

                  {/* Center: Template + Meta */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg">{queue.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={cn("text-xs", worker.bgColor, worker.color)}>
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
                              : "bg-red-900/50 text-red-300 border-red-500/30"
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
                            <span key={i} className="text-purple-400 font-medium">
                              {part}
                            </span>
                          ) : (
                            <span key={i}>{part}</span>
                          )
                        )}
                      </p>
                    </div>

                    {/* Variables */}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-muted-foreground">Variables:</span>
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
                        <span className="text-sm text-muted-foreground">Leads</span>
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
                          onClick={() => loadLeads(
                            queue.id,
                            queue.category === "initial" ? "new" :
                            queue.category === "retarget" ? "no-response" : "engaged"
                          )}
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
                          className="border-zinc-700 hover:bg-zinc-800"
                          onClick={() => setPreviewQueue(queue)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        className={cn(
                          "w-full",
                          queue.leadCount > 0
                            ? `bg-gradient-to-r ${worker.gradient} hover:opacity-90`
                            : "bg-zinc-800 text-zinc-500"
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
                      : "bg-red-900/50 text-red-300"
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
                    onClick={() =>
                      setEditedTemplate((prev) => prev + " " + v)
                    }
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
                  <span className={cn(
                    "ml-2 font-medium",
                    previewQueue.template.length <= 160 ? "text-green-400" : "text-red-400"
                  )}>
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
    </div>
  );
}
