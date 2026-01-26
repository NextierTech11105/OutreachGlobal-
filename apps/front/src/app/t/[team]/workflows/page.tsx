"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  MessageSquare,
  Phone,
  Calendar,
  Zap,
  Play,
  Clock,
  Users,
  Send,
  PhoneCall,
  ListChecks,
  Repeat,
  Target,
  ArrowRight,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Slider } from "@/components/ui/slider";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  company?: string;
}

interface SequenceStep {
  id: string;
  type: "sms" | "call" | "email" | "wait";
  message?: string;
  waitDays?: number;
  order: number;
}

interface CadenceTemplate {
  id: string;
  name: string;
  description: string;
  steps: SequenceStep[];
  category: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRE-BUILT CADENCES
// ═══════════════════════════════════════════════════════════════════════════════

const CADENCE_TEMPLATES: CadenceTemplate[] = [
  {
    id: "cold-b2b",
    name: "Cold B2B Outreach",
    description: "5-touch sequence over 14 days",
    category: "cold",
    steps: [
      { id: "1", type: "sms", order: 1, message: "Hi {firstName}, quick question about {company}..." },
      { id: "2", type: "wait", order: 2, waitDays: 2 },
      { id: "3", type: "sms", order: 3, message: "Following up - did you get my message?" },
      { id: "4", type: "wait", order: 4, waitDays: 3 },
      { id: "5", type: "call", order: 5 },
      { id: "6", type: "wait", order: 6, waitDays: 4 },
      { id: "7", type: "sms", order: 7, message: "Last attempt - worth a quick chat?" },
    ],
  },
  {
    id: "warm-lead",
    name: "Warm Lead Nurture",
    description: "3-touch gentle follow-up",
    category: "warm",
    steps: [
      { id: "1", type: "sms", order: 1, message: "Hey {firstName}! Following up on your interest..." },
      { id: "2", type: "wait", order: 2, waitDays: 3 },
      { id: "3", type: "call", order: 3 },
      { id: "4", type: "wait", order: 4, waitDays: 5 },
      { id: "5", type: "sms", order: 5, message: "Still interested? Let me know!" },
    ],
  },
  {
    id: "re-engage",
    name: "Re-Engagement",
    description: "Wake up cold leads",
    category: "reactivation",
    steps: [
      { id: "1", type: "sms", order: 1, message: "Hi {firstName}, it's been a while..." },
      { id: "2", type: "wait", order: 2, waitDays: 7 },
      { id: "3", type: "sms", order: 3, message: "Just checking in - anything changed?" },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function WorkflowsPage() {
  const params = useParams();
  const { toast } = useToast();
  const teamSlug = params.team as string;

  // Quick Action States
  const [quickPhone, setQuickPhone] = useState("");
  const [quickMessage, setQuickMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [calling, setCalling] = useState(false);

  // Schedule States
  const [schedulePhone, setSchedulePhone] = useState("");
  const [scheduleMessage, setScheduleMessage] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleType, setScheduleType] = useState<"sms" | "call">("sms");

  // Bulk Blast States
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkLeadCount, setBulkLeadCount] = useState(100);
  const [bulkSending, setBulkSending] = useState(false);

  // Sequence States
  const [selectedCadence, setSelectedCadence] = useState<CadenceTemplate | null>(null);
  const [sequenceLeadIds, setSequenceLeadIds] = useState<string[]>([]);

  // Stats
  const [stats, setStats] = useState({
    sentToday: 0,
    scheduledToday: 0,
    activeSequences: 0,
    queueSize: 0,
  });

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch("/api/sms/queue/stats");
      if (res.ok) {
        const data = await res.json();
        setStats({
          sentToday: data.sentToday || 0,
          scheduledToday: data.scheduledToday || 0,
          activeSequences: data.activeSequences || 0,
          queueSize: data.queueSize || 0,
        });
      }
    } catch (e) {
      console.error("Failed to fetch stats:", e);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUICK ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async function handleQuickSMS() {
    if (!quickPhone || !quickMessage) {
      toast({ title: "Error", description: "Enter phone and message", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: quickPhone,
          message: quickMessage,
        }),
      });

      if (res.ok) {
        toast({ title: "Sent!", description: `SMS sent to ${quickPhone}` });
        setQuickPhone("");
        setQuickMessage("");
        fetchStats();
      } else {
        const error = await res.json();
        toast({ title: "Failed", description: error.message || "SMS failed", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  async function handleQuickCall() {
    if (!quickPhone) {
      toast({ title: "Error", description: "Enter phone number", variant: "destructive" });
      return;
    }

    setCalling(true);
    try {
      const res = await fetch("/api/voice/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: quickPhone,
        }),
      });

      if (res.ok) {
        toast({ title: "Calling!", description: `Initiating call to ${quickPhone}` });
      } else {
        const error = await res.json();
        toast({ title: "Failed", description: error.message || "Call failed", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setCalling(false);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHEDULE ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async function handleSchedule() {
    if (!schedulePhone || !scheduleDate || !scheduleTime) {
      toast({ title: "Error", description: "Fill all schedule fields", variant: "destructive" });
      return;
    }

    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);

    try {
      const endpoint = scheduleType === "sms" ? "/api/sms/schedule" : "/api/voice/schedule";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: schedulePhone,
          message: scheduleMessage,
          scheduledAt: scheduledAt.toISOString(),
        }),
      });

      if (res.ok) {
        toast({
          title: "Scheduled!",
          description: `${scheduleType.toUpperCase()} scheduled for ${scheduledAt.toLocaleString()}`
        });
        setSchedulePhone("");
        setScheduleMessage("");
        setScheduleDate("");
        setScheduleTime("");
        fetchStats();
      } else {
        const error = await res.json();
        toast({ title: "Failed", description: error.message || "Schedule failed", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BULK BLAST
  // ═══════════════════════════════════════════════════════════════════════════

  async function handleBulkBlast() {
    if (!bulkMessage) {
      toast({ title: "Error", description: "Enter a message", variant: "destructive" });
      return;
    }

    setBulkSending(true);
    try {
      // Use the instant-execute endpoint with correct parameters
      const res = await fetch("/api/campaigns/instant-execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          macro: "B2B", // Default to B2B campaign
          teamId: teamSlug, // Team ID from URL params
          batchSize: bulkLeadCount,
          templateOverride: bulkMessage, // Use user's custom message
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: "Blast Sent!",
          description: `${data.stats?.sent || 0} messages sent, ${data.stats?.failed || 0} failed`
        });
        setBulkMessage("");
        fetchStats();
      } else {
        const error = await res.json();
        toast({ title: "Failed", description: error.error || error.message || "Blast failed", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setBulkSending(false);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEQUENCE START
  // ═══════════════════════════════════════════════════════════════════════════

  async function handleStartSequence() {
    if (!selectedCadence) {
      toast({ title: "Error", description: "Select a cadence first", variant: "destructive" });
      return;
    }

    try {
      const res = await fetch("/api/sequences/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cadenceId: selectedCadence.id,
          cadenceName: selectedCadence.name,
          steps: selectedCadence.steps,
          leadCount: bulkLeadCount, // Use leads from data lake
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: "Sequence Started!",
          description: `${selectedCadence.name} running for ${data.enrolledCount || bulkLeadCount} leads`
        });
        setSelectedCadence(null);
        fetchStats();
      } else {
        const error = await res.json();
        toast({ title: "Failed", description: error.message || "Sequence start failed", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflow Command Center</h1>
          <p className="text-muted-foreground">
            SMS, Calls, Schedules, Sequences - All in one place
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sent Today</p>
                <p className="text-2xl font-bold">{stats.sentToday}</p>
              </div>
              <Send className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold">{stats.scheduledToday}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Sequences</p>
                <p className="text-2xl font-bold">{stats.activeSequences}</p>
              </div>
              <Repeat className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Queue</p>
                <p className="text-2xl font-bold">{stats.queueSize}</p>
              </div>
              <ListChecks className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="quick" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="quick" className="gap-2">
            <Zap className="h-4 w-4" />
            Quick Actions
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="blast" className="gap-2">
            <Users className="h-4 w-4" />
            Bulk Blast
          </TabsTrigger>
          <TabsTrigger value="sequences" className="gap-2">
            <Repeat className="h-4 w-4" />
            Sequences
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* QUICK ACTIONS TAB */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="quick" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Click to SMS */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-green-500" />
                  Click to SMS
                </CardTitle>
                <CardDescription>Send an instant SMS to any number</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    placeholder="+1 (555) 123-4567"
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    placeholder="Type your message..."
                    value={quickMessage}
                    onChange={(e) => setQuickMessage(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleQuickSMS}
                  disabled={sending}
                >
                  {sending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send SMS Now
                </Button>
              </CardContent>
            </Card>

            {/* Click to Call */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-blue-500" />
                  Click to Call
                </CardTitle>
                <CardDescription>Initiate a call instantly</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    placeholder="+1 (555) 123-4567"
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value)}
                  />
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Call will be placed using your registered phone number via Twilio
                  </p>
                </div>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleQuickCall}
                  disabled={calling}
                >
                  {calling ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PhoneCall className="mr-2 h-4 w-4" />
                  )}
                  Start Call Now
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* SCHEDULE TAB */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                Schedule SMS or Call
              </CardTitle>
              <CardDescription>Set it and forget it - we'll send at your chosen time</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={scheduleType} onValueChange={(v) => setScheduleType(v as "sms" | "call")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sms">
                        <span className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" /> SMS
                        </span>
                      </SelectItem>
                      <SelectItem value="call">
                        <span className="flex items-center gap-2">
                          <Phone className="h-4 w-4" /> Call
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    placeholder="+1 (555) 123-4567"
                    value={schedulePhone}
                    onChange={(e) => setSchedulePhone(e.target.value)}
                  />
                </div>
              </div>

              {scheduleType === "sms" && (
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    placeholder="Type your scheduled message..."
                    value={scheduleMessage}
                    onChange={(e) => setScheduleMessage(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
              </div>

              <Button className="w-full" onClick={handleSchedule}>
                <Clock className="mr-2 h-4 w-4" />
                Schedule {scheduleType.toUpperCase()}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* BULK BLAST TAB */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="blast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-red-500" />
                Bulk SMS Blast
              </CardTitle>
              <CardDescription>Send to many leads from your Data Lake at once</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Message (use {"{firstName}"}, {"{company}"} for personalization)</Label>
                <Textarea
                  placeholder="Hi {firstName}, I wanted to reach out about..."
                  value={bulkMessage}
                  onChange={(e) => setBulkMessage(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Number of Leads</Label>
                  <Badge variant="secondary">{bulkLeadCount} leads</Badge>
                </div>
                <Slider
                  value={[bulkLeadCount]}
                  onValueChange={(v) => setBulkLeadCount(v[0])}
                  min={10}
                  max={2000}
                  step={10}
                />
                <p className="text-sm text-muted-foreground">
                  Cost: ~${(bulkLeadCount * 0.01).toFixed(2)} (SignalHouse)
                </p>
              </div>

              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">Daily Limit: 2,000</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      SignalHouse 10DLC compliance limits sending to 2K/day
                    </p>
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                variant="destructive"
                onClick={handleBulkBlast}
                disabled={bulkSending}
              >
                {bulkSending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Launch Blast to {bulkLeadCount} Leads
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* SEQUENCES TAB */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="sequences" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Cadence Templates */}
            <Card>
              <CardHeader>
                <CardTitle>Cadence Templates</CardTitle>
                <CardDescription>Pre-built multi-step sequences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {CADENCE_TEMPLATES.map((cadence) => (
                  <div
                    key={cadence.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedCadence?.id === cadence.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedCadence(cadence)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{cadence.name}</p>
                        <p className="text-sm text-muted-foreground">{cadence.description}</p>
                      </div>
                      {selectedCadence?.id === cadence.id && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="mt-2 flex gap-1">
                      {cadence.steps.filter(s => s.type !== "wait").map((step, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {step.type === "sms" && <MessageSquare className="h-3 w-3 mr-1" />}
                          {step.type === "call" && <Phone className="h-3 w-3 mr-1" />}
                          {step.type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Sequence Preview & Start */}
            <Card>
              <CardHeader>
                <CardTitle>Start Sequence</CardTitle>
                <CardDescription>
                  {selectedCadence
                    ? `Preview: ${selectedCadence.name}`
                    : "Select a cadence to preview"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedCadence ? (
                  <>
                    {/* Step Timeline */}
                    <div className="space-y-2">
                      {selectedCadence.steps.map((step, i) => (
                        <div key={step.id} className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            step.type === "sms" ? "bg-green-100 text-green-600" :
                            step.type === "call" ? "bg-blue-100 text-blue-600" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {step.type === "sms" && <MessageSquare className="h-4 w-4" />}
                            {step.type === "call" && <Phone className="h-4 w-4" />}
                            {step.type === "wait" && <Clock className="h-4 w-4" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium capitalize">
                              {step.type === "wait" ? `Wait ${step.waitDays} days` : step.type}
                            </p>
                            {step.message && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {step.message}
                              </p>
                            )}
                          </div>
                          {i < selectedCadence.steps.length - 1 && (
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Lead Count */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Enroll Leads</Label>
                        <Badge variant="secondary">{bulkLeadCount} leads</Badge>
                      </div>
                      <Slider
                        value={[bulkLeadCount]}
                        onValueChange={(v) => setBulkLeadCount(v[0])}
                        min={10}
                        max={500}
                        step={10}
                      />
                    </div>

                    <Button className="w-full" onClick={handleStartSequence}>
                      <Play className="mr-2 h-4 w-4" />
                      Start Sequence for {bulkLeadCount} Leads
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Repeat className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a cadence template to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
