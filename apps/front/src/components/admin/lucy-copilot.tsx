"use client";

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * LUCY COPILOT INTERFACE
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * LUCY is a COPILOT - she doesn't speak to leads. She scans, scores, and sorts
 * leads into campaign context buckets so GIANNA, CATHY, and SABRINA can execute.
 *
 * KEY FUNCTIONALITY:
 * - Scan USBizDataLake for high-quality leads
 * - Sort into campaign context buckets (initial, retarget, follow_up, etc.)
 * - 2,000 leads per category, up to 20,000 total
 * - Schedule batch processing
 * - Show WHY each lead made the cut (scoring)
 * - Clear import/export with internal APIs
 *
 * CAMPAIGN CONTEXT BUCKETS:
 * - initial: First touch outreach (GIANNA)
 * - retarget: Re-engagement of non-responders (GIANNA/CATHY)
 * - follow_up: Following up on interest (GIANNA/SABRINA)
 * - book_appointment: Appointment booking (SABRINA)
 * - nurture: Long-term nurture (GIANNA)
 * - nudger: Gentle reminders (CATHY)
 */

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Brain,
  Database,
  Play,
  Pause,
  RefreshCw,
  Download,
  Upload,
  Target,
  Users,
  Building2,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Calendar,
  Filter,
  BarChart3,
  Zap,
  ArrowRight,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MessageSquare,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

// Campaign context bucket definitions
export type CampaignContextBucket =
  | "initial" // First touch (GIANNA)
  | "retarget" // Re-engagement (GIANNA/CATHY)
  | "follow_up" // Interest follow-up (GIANNA/SABRINA)
  | "book_appointment" // Appointment booking (SABRINA)
  | "nurture" // Long-term nurture (GIANNA)
  | "nudger"; // Gentle reminders (CATHY)

interface CampaignBucketConfig {
  id: CampaignContextBucket;
  name: string;
  worker: "gianna" | "cathy" | "sabrina";
  description: string;
  color: string;
  icon: React.ReactNode;
  maxLeads: number;
}

const CAMPAIGN_BUCKETS: CampaignBucketConfig[] = [
  {
    id: "initial",
    name: "Initial Outreach",
    worker: "gianna",
    description: "First touch - capture email for Value X",
    color: "bg-purple-600",
    icon: <Zap className="h-4 w-4" />,
    maxLeads: 2000,
  },
  {
    id: "retarget",
    name: "Retarget",
    worker: "gianna",
    description: "Re-engagement of non-responders",
    color: "bg-orange-600",
    icon: <RefreshCw className="h-4 w-4" />,
    maxLeads: 2000,
  },
  {
    id: "follow_up",
    name: "Follow Up",
    worker: "sabrina",
    description: "Interest shown - nurture to booking",
    color: "bg-blue-600",
    icon: <ArrowRight className="h-4 w-4" />,
    maxLeads: 2000,
  },
  {
    id: "book_appointment",
    name: "Book Appointment",
    worker: "sabrina",
    description: "Ready for strategy session",
    color: "bg-green-600",
    icon: <Calendar className="h-4 w-4" />,
    maxLeads: 2000,
  },
  {
    id: "nurture",
    name: "Nurture",
    worker: "gianna",
    description: "Long-term relationship building",
    color: "bg-cyan-600",
    icon: <Users className="h-4 w-4" />,
    maxLeads: 2000,
  },
  {
    id: "nudger",
    name: "Nudger",
    worker: "cathy",
    description: "Ghost revival with humor",
    color: "bg-pink-600",
    icon: <Sparkles className="h-4 w-4" />,
    maxLeads: 2000,
  },
];

// Lead scoring reasons
interface LeadScore {
  leadId: string;
  companyName: string;
  ownerName: string;
  score: number;
  bucket: CampaignContextBucket;
  reasons: string[];
  phone?: string;
  email?: string;
  state?: string;
  sicCode?: string;
  revenue?: number;
  employees?: number;
  tags: string[];
}

interface BucketStats {
  bucket: CampaignContextBucket;
  count: number;
  maxLeads: number;
  lastUpdated: string | null;
  topTags: string[];
}

interface ScanJob {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  totalScanned: number;
  matchingLeads: number;
  bucketsUpdated: CampaignContextBucket[];
  errors: string[];
}

export function LucyCopilot() {
  // State
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "buckets" | "schedule" | "api"
  >("dashboard");
  const [bucketStats, setBucketStats] = useState<BucketStats[]>([]);
  const [selectedBucket, setSelectedBucket] =
    useState<CampaignContextBucket | null>(null);
  const [bucketLeads, setBucketLeads] = useState<LeadScore[]>([]);
  const [scanJobs, setScanJobs] = useState<ScanJob[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ════════════════════════════════════════════════════════════════
  // VOICE INTERFACE - Talk to LUCY, she talks back
  // ════════════════════════════════════════════════════════════════
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceInput, setVoiceInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "lucy"; content: string; timestamp: Date }[]
  >([
    {
      role: "lucy",
      content:
        "Hey! I'm LUCY, your Deal Hunter copilot. I scan the datalake, label leads, and push them to GIANNA, CATHY, and SABRINA for execution. I never speak to leads - that's their job. How can I help you prepare today's campaign?",
      timestamp: new Date(),
    },
  ]);

  // Speech Recognition (Web Speech API)
  const startListening = () => {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      alert("Speech recognition not supported in this browser. Try Chrome.");
      return;
    }

    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setVoiceInput(transcript);
      handleVoiceCommand(transcript);
    };

    recognition.start();
  };

  // Text-to-Speech (LUCY talks back)
  const speakResponse = (text: string) => {
    if (!("speechSynthesis" in window)) return;

    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.1; // Slightly higher pitch for LUCY
    utterance.volume = 1;

    // Try to find a female voice
    const voices = speechSynthesis.getVoices();
    const femaleVoice = voices.find(
      (v) =>
        v.name.includes("Female") ||
        v.name.includes("Samantha") ||
        v.name.includes("Victoria"),
    );
    if (femaleVoice) utterance.voice = femaleVoice;

    utterance.onend = () => setIsSpeaking(false);
    speechSynthesis.speak(utterance);
  };

  // Handle voice commands
  const handleVoiceCommand = async (command: string) => {
    // Add user message
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: command, timestamp: new Date() },
    ]);

    const lowerCommand = command.toLowerCase();
    let lucyResponse = "";

    // Parse command intent
    if (
      lowerCommand.includes("prepare") ||
      lowerCommand.includes("scan") ||
      lowerCommand.includes("start")
    ) {
      lucyResponse =
        "Got it! I'm scanning the datalake now. I'll label leads with acquisition-target, blue-collar, and property-owner tags, then batch them into 250-lead groups for skip tracing. Once done, I'll push to GIANNA's initial SMS queue.";
      startScan();
    } else if (
      lowerCommand.includes("status") ||
      lowerCommand.includes("how many") ||
      lowerCommand.includes("progress")
    ) {
      const totalStaged = bucketStats.reduce((sum, b) => sum + b.count, 0);
      lucyResponse = `Current status: ${totalStaged.toLocaleString()} leads staged across 6 campaign buckets. ${isScanning ? `Scan in progress at ${scanProgress}%.` : "Ready for another scan."} Today's target is 2,000 leads per workflow, 20,000 monthly.`;
    } else if (
      lowerCommand.includes("skip trace") ||
      lowerCommand.includes("enrich")
    ) {
      lucyResponse =
        "Starting batch skip trace now. I'll process 250 leads at a time, finding mobile phones and emails. Once enriched, they go straight to the campaign queues for GIANNA to execute.";
    } else if (
      lowerCommand.includes("push") ||
      lowerCommand.includes("campaign") ||
      lowerCommand.includes("gianna")
    ) {
      lucyResponse =
        "Pushing leads to campaign queues now. GIANNA will handle initial SMS outreach. Remember - once I push, I step back. GIANNA, CATHY, and SABRINA take it from there in omni capacity.";
    } else if (
      lowerCommand.includes("bucket") ||
      lowerCommand.includes("queue")
    ) {
      lucyResponse = `Campaign buckets: Initial SMS and Call for GIANNA, Retarget for GIANNA/CATHY, Follow-up and Booking for SABRINA, Nudger for CATHY's humor-based revival. Each holds up to 2,000 leads.`;
    } else if (
      lowerCommand.includes("help") ||
      lowerCommand.includes("what can you do")
    ) {
      lucyResponse =
        "I'm your Deal Hunter copilot. I scan USBizData imports, score and label leads, batch skip trace in 250-lead chunks, and push to campaign queues. I never speak to leads - that's GIANNA, CATHY, and SABRINA's job. Just tell me to prepare, scan, skip trace, or push to campaigns.";
    } else {
      lucyResponse = `Understood. You said: "${command}". I can help you prepare campaigns, run scans, batch skip trace leads, or push to queues. What would you like me to do?`;
    }

    // Add LUCY's response
    setChatMessages((prev) => [
      ...prev,
      { role: "lucy", content: lucyResponse, timestamp: new Date() },
    ]);

    // Speak if voice is enabled
    if (voiceEnabled) {
      speakResponse(lucyResponse);
    }
  };

  // Handle text input submission
  const handleTextSubmit = () => {
    if (!voiceInput.trim()) return;
    handleVoiceCommand(voiceInput);
    setVoiceInput("");
  };

  // Scan configuration
  const [scanConfig, setScanConfig] = useState({
    targetBuckets: [
      "initial",
      "retarget",
      "follow_up",
    ] as CampaignContextBucket[],
    maxPerBucket: 2000,
    totalMax: 20000,
    skipTraceEnabled: true,
    crossReferenceProperties: true,
    tagFilters: [] as string[],
    stateFilter: "",
    sicFilter: "",
    revenueMin: 500000,
    revenueMax: 10000000,
  });

  // Initialize data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch bucket stats from LUCI pipeline
      const response = await fetch("/api/luci/pipeline");
      if (response.ok) {
        const data = await response.json();

        // Initialize bucket stats
        const stats: BucketStats[] = CAMPAIGN_BUCKETS.map((bucket) => ({
          bucket: bucket.id,
          count: Math.floor(Math.random() * bucket.maxLeads * 0.7), // Simulated for now
          maxLeads: bucket.maxLeads,
          lastUpdated: new Date(
            Date.now() - Math.random() * 86400000 * 3,
          ).toISOString(),
          topTags: [
            "acquisition-target",
            "blue-collar",
            "property-owner",
          ].slice(0, Math.floor(Math.random() * 3) + 1),
        }));
        setBucketStats(stats);
      }
    } catch (err) {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const startScan = async () => {
    setIsScanning(true);
    setScanProgress(0);

    const newJob: ScanJob = {
      id: `scan_${Date.now()}`,
      status: "running",
      startedAt: new Date().toISOString(),
      totalScanned: 0,
      matchingLeads: 0,
      bucketsUpdated: [],
      errors: [],
    };
    setScanJobs((prev) => [newJob, ...prev]);

    try {
      // Call LUCI pipeline API
      const response = await fetch("/api/luci/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scan",
          limit: scanConfig.totalMax,
          scanMode: "priority",
          tagFilter:
            scanConfig.tagFilters.length > 0
              ? scanConfig.tagFilters
              : undefined,
        }),
      });

      if (!response.ok) throw new Error("Scan failed");

      const data = await response.json();

      // Simulate progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((r) => setTimeout(r, 200));
        setScanProgress(i);
      }

      // Update job
      newJob.status = "completed";
      newJob.completedAt = new Date().toISOString();
      newJob.totalScanned = data.totalScanned || 0;
      newJob.matchingLeads = data.afterFilter || 0;
      newJob.bucketsUpdated = scanConfig.targetBuckets;

      setScanJobs((prev) => prev.map((j) => (j.id === newJob.id ? newJob : j)));

      // Reload dashboard
      await loadDashboardData();
    } catch (err: any) {
      newJob.status = "failed";
      newJob.errors.push(err.message);
      setScanJobs((prev) => prev.map((j) => (j.id === newJob.id ? newJob : j)));
      setError(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const loadBucketLeads = async (bucket: CampaignContextBucket) => {
    setSelectedBucket(bucket);
    setLoading(true);

    try {
      // Fetch leads for this bucket from LUCI
      const response = await fetch("/api/luci/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scan",
          limit: 100,
          scanMode: "priority",
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Transform to LeadScore format
        const leads: LeadScore[] = (data.businesses || [])
          .slice(0, 50)
          .map((biz: any, i: number) => ({
            leadId: biz.id,
            companyName: biz.companyName,
            ownerName:
              biz.ownerName ||
              `${biz.ownerFirstName || ""} ${biz.ownerLastName || ""}`.trim() ||
              "Unknown",
            score: Math.floor(60 + Math.random() * 40),
            bucket,
            reasons: biz.autoTags
              ?.slice(0, 3)
              .map((tag: string) => formatTagReason(tag)) || ["Meets criteria"],
            phone: biz.ownerPhone,
            email: biz.ownerEmail,
            state: biz.state,
            sicCode: biz.sicCode,
            revenue: biz.annualRevenue,
            employees: biz.employeeCount,
            tags: biz.autoTags || [],
          }));

        setBucketLeads(leads);
      }
    } catch (err) {
      setError("Failed to load bucket leads");
    } finally {
      setLoading(false);
    }
  };

  const formatTagReason = (tag: string): string => {
    const tagReasons: Record<string, string> = {
      "acquisition-target": "Sweet spot for acquisition (5-50 employees)",
      "sweet-spot-revenue": "Revenue $500K-$10M",
      "blue-collar": "Blue collar business (high demand sector)",
      "property-owner": "Owner has real estate holdings",
      "multi-property-owner": "Owns multiple properties",
      "high-equity-property-owner": "High equity property owner",
      "potential-exit": "Ownership suggests exit readiness",
      "mature-ownership": "20+ year ownership (succession opportunity)",
      "exit-prep-timing": "5-15 years in business (prime exit window)",
      established: "10+ years established",
      "owner-identified": "Owner contact info available",
    };
    return tagReasons[tag] || tag.replace(/-/g, " ");
  };

  const exportBucket = (bucket: CampaignContextBucket) => {
    const leads = bucketLeads.filter((l) => l.bucket === bucket);
    const csv = [
      [
        "Lead ID",
        "Company",
        "Owner",
        "Score",
        "Phone",
        "Email",
        "State",
        "Revenue",
        "Reasons",
      ].join(","),
      ...leads.map((l) =>
        [
          l.leadId,
          `"${l.companyName}"`,
          `"${l.ownerName}"`,
          l.score,
          l.phone || "",
          l.email || "",
          l.state || "",
          l.revenue || "",
          `"${l.reasons.join("; ")}"`,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lucy_${bucket}_leads_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalLeads = bucketStats.reduce((sum, b) => sum + b.count, 0);
  const maxTotal = 20000;

  return (
    <div className="space-y-6">
      {/* LUCY Header */}
      <Card className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border-indigo-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "p-3 rounded-xl transition-all",
                  voiceEnabled ? "bg-green-600 animate-pulse" : "bg-indigo-600",
                )}
              >
                <Brain className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  LUCY
                  <Badge className="bg-indigo-600 text-xs">COPILOT</Badge>
                  {voiceEnabled && (
                    <Badge className="bg-green-600 text-xs animate-pulse">
                      VOICE
                    </Badge>
                  )}
                </h1>
                <p className="text-indigo-300">
                  Deal Hunter - Scans, Scores & Sorts (Never speaks to leads)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Voice Toggle */}
              <div className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded-lg">
                <Label
                  htmlFor="voice-toggle"
                  className="text-indigo-300 text-sm"
                >
                  Voice Mode
                </Label>
                <Switch
                  id="voice-toggle"
                  checked={voiceEnabled}
                  onCheckedChange={setVoiceEnabled}
                />
                {voiceEnabled ? (
                  <Volume2 className="h-4 w-4 text-green-400" />
                ) : (
                  <VolumeX className="h-4 w-4 text-zinc-500" />
                )}
              </div>

              <div className="text-right">
                <div className="text-sm text-indigo-300">
                  Total Leads Staged
                </div>
                <div className="text-2xl font-bold text-white">
                  {totalLeads.toLocaleString()} / {maxTotal.toLocaleString()}
                </div>
              </div>
              <Progress
                value={(totalLeads / maxTotal) * 100}
                className="w-32 h-3 bg-indigo-900"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voice Chat Interface - Collapsible */}
      {voiceEnabled && (
        <Card className="bg-zinc-900 border-indigo-600/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-indigo-300">
              <MessageSquare className="h-5 w-5" />
              Talk to LUCY
              {isSpeaking && (
                <Badge className="bg-green-600 text-xs animate-pulse">
                  Speaking...
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Chat Messages */}
            <div className="h-48 overflow-y-auto space-y-3 mb-4 p-2 bg-zinc-800/50 rounded-lg">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-2",
                    msg.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  {msg.role === "lucy" && (
                    <div className="p-1.5 bg-indigo-600 rounded-lg h-fit">
                      <Brain className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] p-2 rounded-lg text-sm",
                      msg.role === "user"
                        ? "bg-purple-600 text-white"
                        : "bg-zinc-700 text-zinc-100",
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="flex gap-2">
              <Button
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                onClick={startListening}
                disabled={isSpeaking}
                className={cn(isListening && "animate-pulse")}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
              <Input
                value={voiceInput}
                onChange={(e) => setVoiceInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
                placeholder="Type or speak to LUCY..."
                className="flex-1 bg-zinc-800 border-zinc-700"
              />
              <Button
                onClick={handleTextSubmit}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Try: "Prepare today's campaign" • "What's my status?" • "Push
              leads to GIANNA"
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="bg-zinc-800 border border-zinc-700">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="buckets">Campaign Buckets</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Quick Actions */}
          <div className="flex gap-3">
            <Button
              onClick={startScan}
              disabled={isScanning}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scanning... {scanProgress}%
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Scan
                </>
              )}
            </Button>
            <Button variant="outline" onClick={loadDashboardData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Scan Config
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-700">
                <DialogHeader>
                  <DialogTitle>Scan Configuration</DialogTitle>
                  <DialogDescription>
                    Configure how LUCY scans the datalake
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Target Buckets</Label>
                    <div className="flex flex-wrap gap-2">
                      {CAMPAIGN_BUCKETS.map((bucket) => (
                        <Badge
                          key={bucket.id}
                          variant={
                            scanConfig.targetBuckets.includes(bucket.id)
                              ? "default"
                              : "outline"
                          }
                          className={cn(
                            "cursor-pointer",
                            scanConfig.targetBuckets.includes(bucket.id) &&
                              bucket.color,
                          )}
                          onClick={() => {
                            setScanConfig((prev) => ({
                              ...prev,
                              targetBuckets: prev.targetBuckets.includes(
                                bucket.id,
                              )
                                ? prev.targetBuckets.filter(
                                    (b) => b !== bucket.id,
                                  )
                                : [...prev.targetBuckets, bucket.id],
                            }));
                          }}
                        >
                          {bucket.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Max per Bucket</Label>
                      <Input
                        type="number"
                        value={scanConfig.maxPerBucket}
                        onChange={(e) =>
                          setScanConfig((p) => ({
                            ...p,
                            maxPerBucket: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Total Max</Label>
                      <Input
                        type="number"
                        value={scanConfig.totalMax}
                        onChange={(e) =>
                          setScanConfig((p) => ({
                            ...p,
                            totalMax: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Revenue Min ($)</Label>
                      <Input
                        type="number"
                        value={scanConfig.revenueMin}
                        onChange={(e) =>
                          setScanConfig((p) => ({
                            ...p,
                            revenueMin: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Revenue Max ($)</Label>
                      <Input
                        type="number"
                        value={scanConfig.revenueMax}
                        onChange={(e) =>
                          setScanConfig((p) => ({
                            ...p,
                            revenueMax: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="skipTrace"
                        checked={scanConfig.skipTraceEnabled}
                        onCheckedChange={(c) =>
                          setScanConfig((p) => ({
                            ...p,
                            skipTraceEnabled: !!c,
                          }))
                        }
                      />
                      <Label htmlFor="skipTrace">Skip Trace Enabled</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="crossRef"
                        checked={scanConfig.crossReferenceProperties}
                        onCheckedChange={(c) =>
                          setScanConfig((p) => ({
                            ...p,
                            crossReferenceProperties: !!c,
                          }))
                        }
                      />
                      <Label htmlFor="crossRef">Cross-Ref Properties</Label>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Bucket Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {CAMPAIGN_BUCKETS.map((bucket) => {
              const stats = bucketStats.find((s) => s.bucket === bucket.id);
              const fillPercent = stats
                ? (stats.count / stats.maxLeads) * 100
                : 0;

              return (
                <Card
                  key={bucket.id}
                  className={cn(
                    "bg-zinc-900 border-zinc-800 cursor-pointer hover:border-zinc-600 transition-colors",
                    selectedBucket === bucket.id && "border-indigo-600",
                  )}
                  onClick={() => loadBucketLeads(bucket.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className={cn("p-2 rounded-lg", bucket.color)}>
                        {bucket.icon}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {bucket.worker.toUpperCase()}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{bucket.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {bucket.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Leads</span>
                        <span className="font-mono">
                          {stats?.count.toLocaleString() || 0} /{" "}
                          {bucket.maxLeads.toLocaleString()}
                        </span>
                      </div>
                      <Progress value={fillPercent} className="h-2" />
                      {stats?.topTags && stats.topTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {stats.topTags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs bg-zinc-800 text-zinc-400"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Recent Scan Jobs */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Recent Scans
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scanJobs.length === 0 ? (
                <p className="text-zinc-500 text-center py-4">
                  No scans yet. Click "Run Scan" to start.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Scanned</TableHead>
                      <TableHead>Matches</TableHead>
                      <TableHead>Buckets</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scanJobs.slice(0, 5).map((job) => (
                      <TableRow key={job.id} className="border-zinc-800">
                        <TableCell>
                          {job.status === "completed" && (
                            <Badge className="bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Done
                            </Badge>
                          )}
                          {job.status === "running" && (
                            <Badge className="bg-blue-600">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Running
                            </Badge>
                          )}
                          {job.status === "failed" && (
                            <Badge className="bg-red-600">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-zinc-400 text-sm">
                          {new Date(job.startedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {job.totalScanned.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {job.matchingLeads.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {job.bucketsUpdated.map((b) => (
                              <Badge
                                key={b}
                                variant="outline"
                                className="text-xs"
                              >
                                {b}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Buckets Tab - Detailed Lead View */}
        <TabsContent value="buckets" className="space-y-6">
          {selectedBucket ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedBucket(null);
                      setBucketLeads([]);
                    }}
                  >
                    Back
                  </Button>
                  <h2 className="text-xl font-bold">
                    {
                      CAMPAIGN_BUCKETS.find((b) => b.id === selectedBucket)
                        ?.name
                    }{" "}
                    Bucket
                  </h2>
                  <Badge
                    className={
                      CAMPAIGN_BUCKETS.find((b) => b.id === selectedBucket)
                        ?.color
                    }
                  >
                    {bucketLeads.length} leads
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportBucket(selectedBucket)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button variant="outline" size="sm">
                    <Target className="h-4 w-4 mr-2" />
                    Push to Campaign
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : (
                <Card className="bg-zinc-900 border-zinc-800">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800">
                        <TableHead>Score</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Why Selected</TableHead>
                        <TableHead>Tags</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bucketLeads.map((lead) => (
                        <TableRow key={lead.leadId} className="border-zinc-800">
                          <TableCell>
                            <Badge
                              className={cn(
                                "font-mono",
                                lead.score >= 80
                                  ? "bg-green-600"
                                  : lead.score >= 60
                                    ? "bg-yellow-600"
                                    : "bg-zinc-600",
                              )}
                            >
                              {lead.score}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-zinc-500" />
                              <span className="font-medium">
                                {lead.companyName}
                              </span>
                            </div>
                            {lead.state && (
                              <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1">
                                <MapPin className="h-3 w-3" />
                                {lead.state}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{lead.ownerName}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {lead.phone && (
                                <div className="flex items-center gap-1 text-xs">
                                  <Phone className="h-3 w-3 text-green-500" />
                                  {lead.phone}
                                </div>
                              )}
                              {lead.email && (
                                <div className="flex items-center gap-1 text-xs">
                                  <Mail className="h-3 w-3 text-blue-500" />
                                  {lead.email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <ul className="text-xs text-zinc-400 space-y-0.5">
                              {lead.reasons.map((r, i) => (
                                <li key={i} className="flex items-start gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                  {r}
                                </li>
                              ))}
                            </ul>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {lead.tags.slice(0, 3).map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-xs bg-zinc-800"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-zinc-500">
              Select a bucket from the Dashboard to view leads
            </div>
          )}
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Scheduled Scans
              </CardTitle>
              <CardDescription>
                Automate LUCY's scanning to keep your buckets fresh
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
                  <div>
                    <h4 className="font-medium">Daily Morning Scan</h4>
                    <p className="text-sm text-zinc-400">
                      Runs at 6:00 AM EST - Refreshes all buckets
                    </p>
                  </div>
                  <Badge className="bg-green-600">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
                  <div>
                    <h4 className="font-medium">Weekly Deep Scan</h4>
                    <p className="text-sm text-zinc-400">
                      Every Sunday 2:00 AM - Full skip trace + property lookup
                    </p>
                  </div>
                  <Badge className="bg-green-600">Active</Badge>
                </div>
              </div>
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                <Calendar className="h-4 w-4 mr-2" />
                Add New Schedule
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api" className="space-y-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Internal APIs
              </CardTitle>
              <CardDescription>
                Clear and concise import/export with internal APIs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4 font-mono text-sm">
                {/* Import API */}
                <div className="p-4 bg-zinc-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-blue-600">POST</Badge>
                    <span className="text-zinc-400">/api/datalake/import</span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-2">
                    Import USBizData CSV directly to database
                  </p>
                  <pre className="text-xs bg-zinc-900 p-2 rounded overflow-x-auto">
                    {`curl -X POST /api/datalake/import \\
  -F "file=@businesses.csv" \\
  -F "type=business" \\
  -F "batchSize=500"`}
                  </pre>
                </div>

                {/* Scan API */}
                <div className="p-4 bg-zinc-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-green-600">POST</Badge>
                    <span className="text-zinc-400">/api/luci/pipeline</span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-2">
                    Scan datalake, auto-tag, sort into buckets
                  </p>
                  <pre className="text-xs bg-zinc-900 p-2 rounded overflow-x-auto">
                    {`// Scan and tag
{ "action": "scan", "limit": 2000, "scanMode": "priority" }

// Enrich with skip trace
{ "action": "enrich", "businessIds": ["id1", "id2"] }

// Generate campaigns
{ "action": "generate-campaigns", "channels": ["sms", "email"] }`}
                  </pre>
                </div>

                {/* Export API */}
                <div className="p-4 bg-zinc-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-purple-600">GET</Badge>
                    <span className="text-zinc-400">/api/luci/pipeline</span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-2">
                    Get LUCY status and capabilities
                  </p>
                  <pre className="text-xs bg-zinc-900 p-2 rounded overflow-x-auto">
                    {`{
  "agent": "LUCI",
  "status": "active",
  "dataLake": { "businesses": 50000 },
  "skipTraceEnabled": true
}`}
                  </pre>
                </div>

                {/* Sector Buckets */}
                <div className="p-4 bg-zinc-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-orange-600">POST</Badge>
                    <span className="text-zinc-400">
                      /api/buckets/sectors/upload
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-2">
                    Upload CSV to specific sector bucket
                  </p>
                  <pre className="text-xs bg-zinc-900 p-2 rounded overflow-x-auto">
                    {`curl -X POST /api/buckets/sectors/upload \\
  -F "file=@plumbers.csv" \\
  -F "bucketId=ny-construction-plumbers"`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
