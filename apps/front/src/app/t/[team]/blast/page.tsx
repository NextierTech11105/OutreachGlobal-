"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useCurrentTeam } from "@/features/team/team.context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Send,
  Phone,
  Users,
  MessageSquare,
  Rocket,
  CalendarDays,
  Save,
  Flame,
  Clock,
  Eye,
  AlertTriangle,
  X,
  Bookmark,
  Zap,
  Bell,
  RotateCcw,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Lead {
  firstName: string;
  lastName: string;
  phone: string;
  company?: string;
  email?: string;
  city?: string;
  state?: string;
}

interface SavedTemplate {
  id: string;
  name: string;
  label: string;
  message: string;
  createdAt: string;
}

type BlastStep = "upload" | "compose" | "confirm" | "sending" | "complete";

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const TEMPLATE_VARS = [
  { key: "{firstName}", desc: "Lead first name" },
  { key: "{lastName}", desc: "Lead last name" },
  { key: "{company}", desc: "Company name" },
  { key: "{city}", desc: "City" },
  { key: "{state}", desc: "State" },
];

const MESSAGE_LABELS = [
  { value: "initial", label: "Initial SMS", icon: MessageSquare, color: "bg-blue-500" },
  { value: "reminder_1", label: "Reminder #1", icon: Bell, color: "bg-yellow-500" },
  { value: "reminder_2", label: "Reminder #2", icon: Bell, color: "bg-orange-500" },
  { value: "follow_up", label: "Follow Up", icon: RotateCcw, color: "bg-purple-500" },
  { value: "hot_lead", label: "Hot Lead Push", icon: Flame, color: "bg-red-600" },
  { value: "custom", label: "Custom", icon: Tag, color: "bg-gray-500" },
];

// Database lead sources
const LEAD_SOURCES = [
  { value: "all", label: "All Active Leads", badge: "ALL", badgeColor: "bg-gray-500" },
  { value: "responded", label: "Responded Leads", badge: "GREEN", badgeColor: "bg-green-500" },
  { value: "gold", label: "Email + Mobile Captured", badge: "GOLD", badgeColor: "bg-yellow-500" },
  { value: "hot", label: "Hot Leads", badge: "HOT", badgeColor: "bg-red-500" },
  { value: "warm", label: "Warm Leads", badge: "WARM", badgeColor: "bg-orange-500" },
  { value: "ready", label: "Ready Status", badge: "READY", badgeColor: "bg-blue-500" },
  { value: "validated", label: "Validated", badge: "VALID", badgeColor: "bg-purple-500" },
];

const STARTER_TEMPLATES = [
  {
    name: "Simple Intro",
    label: "initial",
    message: "Hi {firstName}, this is [Your Name] reaching out about {company}. Do you have 2 minutes for a quick chat?",
  },
  {
    name: "Value Prop",
    label: "initial",
    message: "Hey {firstName}! I help businesses like {company} increase revenue by 20-40%. Would you be open to a quick call this week?",
  },
  {
    name: "Follow Up",
    label: "follow_up",
    message: "Hi {firstName}, just following up on my last message. Is now a better time to connect? Let me know!",
  },
  {
    name: "Reminder",
    label: "reminder_1",
    message: "Hey {firstName}, wanted to circle back. I know you're busy but this could really help {company}. Worth a quick call?",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function BlastPage() {
  const { teamId } = useCurrentTeam();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step state
  const [step, setStep] = useState<BlastStep>("upload");

  // Source mode: CSV or Database
  const [sourceMode, setSourceMode] = useState<"csv" | "database">("database");
  const [selectedSource, setSelectedSource] = useState("all");
  const [dbLeadCount, setDbLeadCount] = useState(0);
  const [loadingDbLeads, setLoadingDbLeads] = useState(false);

  // File & Leads
  const [file, setFile] = useState<File | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [previewLead, setPreviewLead] = useState<Lead | null>(null);

  // Message
  const [message, setMessage] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("initial");

  // Templates
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");

  // Scheduling
  const [showCalendar, setShowCalendar] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState("09:00");

  // Options
  const [pushToHotQueue, setPushToHotQueue] = useState(false);
  const [maxLeads, setMaxLeads] = useState(100);

  // Progress
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  // Load saved templates
  useEffect(() => {
    const saved = localStorage.getItem(`blast_templates_${teamId}`);
    if (saved) {
      try {
        setSavedTemplates(JSON.parse(saved));
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, [teamId]);

  // Fetch database leads when source changes
  const fetchDatabaseLeads = useCallback(async () => {
    if (sourceMode !== "database") return;

    setLoadingDbLeads(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/leads/count?source=${selectedSource}&limit=${maxLeads}&teamId=${teamId || ""}`
      );
      const data = await response.json();

      setDbLeadCount(data.count || 0);

      if (data.preview && data.preview.length > 0) {
        const dbLeads: Lead[] = data.preview.map((l: Record<string, string>) => ({
          firstName: l.firstName || "",
          lastName: l.lastName || "",
          phone: l.phone || "",
          company: l.company || "",
          email: l.email || "",
          city: l.city || "",
          state: l.state || "",
        }));
        setLeads(dbLeads);
        setPreviewLead(dbLeads[0]);
      } else {
        setLeads([]);
        setPreviewLead(null);
      }
    } catch (err) {
      console.error("Failed to fetch leads:", err);
      setError("Failed to load leads from database");
      setDbLeadCount(0);
    } finally {
      setLoadingDbLeads(false);
    }
  }, [sourceMode, selectedSource, maxLeads, teamId]);

  // Fetch leads when database mode or source changes
  useEffect(() => {
    if (sourceMode === "database") {
      fetchDatabaseLeads();
    }
  }, [sourceMode, selectedSource, maxLeads, fetchDatabaseLeads]);

  // Use database leads for sending
  const handleUseDatabaseLeads = async () => {
    if (dbLeadCount === 0) {
      toast.error("No leads found for this source");
      return;
    }

    // Fetch full lead list for sending
    setLoadingDbLeads(true);
    try {
      const response = await fetch(
        `/api/leads/list?source=${selectedSource}&limit=${maxLeads}&teamId=${teamId || ""}`
      );
      const data = await response.json();

      if (data.leads && data.leads.length > 0) {
        const dbLeads: Lead[] = data.leads.map((l: Record<string, string>) => ({
          firstName: l.firstName || "",
          lastName: l.lastName || "",
          phone: l.phone || "",
          company: l.company || "",
          email: l.email || "",
          city: l.city || "",
          state: l.state || "",
        }));
        setLeads(dbLeads);
        setPreviewLead(dbLeads[0]);
        setStep("compose");
        toast.success(`Loaded ${dbLeads.length} leads from database`);
      } else {
        toast.error("No leads found");
      }
    } catch {
      toast.error("Failed to load leads");
    } finally {
      setLoadingDbLeads(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // FILE HANDLING
  // ═══════════════════════════════════════════════════════════════════════════════

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);

    try {
      const text = await selectedFile.text();
      const lines = text.split("\n").filter((l) => l.trim());

      if (lines.length < 2) {
        setError("CSV is empty or has no data rows");
        return;
      }

      // Parse headers
      const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim().toLowerCase());

      // Find column indexes
      const phoneIdx = headers.findIndex((h) =>
        h.includes("phone") || h.includes("mobile") || h.includes("cell")
      );
      const firstNameIdx = headers.findIndex((h) =>
        h.includes("first") || h === "firstname" || h === "first_name"
      );
      const lastNameIdx = headers.findIndex((h) =>
        h.includes("last") || h === "lastname" || h === "last_name"
      );
      const companyIdx = headers.findIndex((h) =>
        h.includes("company") || h.includes("business")
      );
      const emailIdx = headers.findIndex((h) => h.includes("email"));
      const cityIdx = headers.findIndex((h) => h === "city");
      const stateIdx = headers.findIndex((h) => h === "state");

      if (phoneIdx === -1) {
        setError("CSV must have a column with 'phone', 'mobile', or 'cell' in the header");
        return;
      }

      // Parse leads
      const parsedLeads: Lead[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.replace(/"/g, "").trim());
        const phone = values[phoneIdx];

        // Clean phone - must have 10+ digits
        const cleanPhone = phone?.replace(/\D/g, "");
        if (!cleanPhone || cleanPhone.length < 10) continue;

        parsedLeads.push({
          firstName: firstNameIdx >= 0 ? values[firstNameIdx] || "" : "",
          lastName: lastNameIdx >= 0 ? values[lastNameIdx] || "" : "",
          phone: cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`,
          company: companyIdx >= 0 ? values[companyIdx] || "" : "",
          email: emailIdx >= 0 ? values[emailIdx] || "" : "",
          city: cityIdx >= 0 ? values[cityIdx] || "" : "",
          state: stateIdx >= 0 ? values[stateIdx] || "" : "",
        });
      }

      if (parsedLeads.length === 0) {
        setError("No valid phone numbers found in CSV");
        return;
      }

      setLeads(parsedLeads);
      setPreviewLead(parsedLeads[0]);
      setStep("compose");
      toast.success(`Loaded ${parsedLeads.length} leads from ${selectedFile.name}`);
    } catch {
      setError("Could not parse CSV file. Please check the format.");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile?.name.endsWith(".csv")) {
        handleFileSelect(droppedFile);
      } else {
        setError("Please upload a CSV file");
      }
    },
    [handleFileSelect]
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // MESSAGE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  const renderPreview = (lead: Lead | null) => {
    if (!lead || !message) return message || "Enter your message above...";

    return message
      .replace(/{firstName}/gi, lead.firstName || "")
      .replace(/{lastName}/gi, lead.lastName || "")
      .replace(/{company}/gi, lead.company || "")
      .replace(/{city}/gi, lead.city || "")
      .replace(/{state}/gi, lead.state || "")
      .trim();
  };

  const insertVariable = (varKey: string) => {
    setMessage((prev) => prev + varKey);
  };

  const charCount = message.length;
  const segmentCount = charCount === 0 ? 0 : Math.ceil(charCount / 160);

  // ═══════════════════════════════════════════════════════════════════════════════
  // TEMPLATE HANDLING
  // ═══════════════════════════════════════════════════════════════════════════════

  const handleSaveTemplate = () => {
    if (!templateName.trim() || !message.trim()) {
      toast.error("Please enter template name and message");
      return;
    }

    const newTemplate: SavedTemplate = {
      id: `tpl_${Date.now()}`,
      name: templateName,
      label: selectedLabel,
      message: message,
      createdAt: new Date().toISOString(),
    };

    const updated = [...savedTemplates, newTemplate];
    setSavedTemplates(updated);
    localStorage.setItem(`blast_templates_${teamId}`, JSON.stringify(updated));
    setShowSaveDialog(false);
    setTemplateName("");
    toast.success("Template saved!");
  };

  const loadTemplate = (template: { name: string; label: string; message: string }) => {
    setMessage(template.message);
    setSelectedLabel(template.label);
    toast.success(`Loaded: ${template.name}`);
  };

  const deleteTemplate = (id: string) => {
    const updated = savedTemplates.filter((t) => t.id !== id);
    setSavedTemplates(updated);
    localStorage.setItem(`blast_templates_${teamId}`, JSON.stringify(updated));
    toast.success("Template deleted");
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // SEND LOGIC
  // ═══════════════════════════════════════════════════════════════════════════════

  const handleSendClick = () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }
    setStep("confirm");
  };

  const executeSend = async () => {
    const toSend = leads.slice(0, maxLeads);
    setStep("sending");
    setProgress({ sent: 0, failed: 0, total: toSend.length });
    setError(null);

    let sent = 0;
    let failed = 0;

    for (const lead of toSend) {
      try {
        const personalizedMsg = message
          .replace(/{firstName}/gi, lead.firstName || "")
          .replace(/{lastName}/gi, lead.lastName || "")
          .replace(/{company}/gi, lead.company || "")
          .replace(/{city}/gi, lead.city || "")
          .replace(/{state}/gi, lead.state || "")
          .trim();

        const res = await fetch("/api/sms/quick-send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: lead.phone,
            message: personalizedMsg,
          }),
        });

        if (res.ok) {
          sent++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }

      setProgress({ sent, failed, total: toSend.length });
      await new Promise((r) => setTimeout(r, 100));
    }

    setStep("complete");
    toast.success(`Sent ${sent} messages, ${failed} failed`);
  };

  const resetBlast = () => {
    setStep("upload");
    setFile(null);
    setLeads([]);
    setPreviewLead(null);
    setMessage("");
    setProgress({ sent: 0, failed: 0, total: 0 });
    setError(null);
    setScheduledDate(undefined);
    setPushToHotQueue(false);
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════

  const stepIndex = ["upload", "compose", "confirm", "sending", "complete"].indexOf(step);
  const labelInfo = MESSAGE_LABELS.find((l) => l.value === selectedLabel);
  const effectiveLeadCount = Math.min(leads.length, maxLeads);

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {["Upload", "Compose", "Confirm", "Send", "Done"].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                stepIndex === i
                  ? "bg-primary text-primary-foreground"
                  : stepIndex > i
                  ? "bg-green-500 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {stepIndex > i ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            {i < 4 && (
              <div className={`w-8 h-0.5 ${stepIndex > i ? "bg-green-500" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* STEP 1: SELECT SOURCE */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {step === "upload" && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <Rocket className="h-6 w-6" />
              SMS Blast
            </CardTitle>
            <CardDescription>
              Select leads from database OR upload CSV → Compose → Send
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Source Mode Toggle */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <Button
                variant={sourceMode === "database" ? "default" : "ghost"}
                className="flex-1"
                onClick={() => setSourceMode("database")}
              >
                <Users className="mr-2 h-4 w-4" />
                Database Leads
              </Button>
              <Button
                variant={sourceMode === "csv" ? "default" : "ghost"}
                className="flex-1"
                onClick={() => setSourceMode("csv")}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Upload CSV
              </Button>
            </div>

            {/* DATABASE MODE */}
            {sourceMode === "database" && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Lead Source</Label>
                    <Select value={selectedSource} onValueChange={setSelectedSource}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_SOURCES.map((source) => (
                          <SelectItem key={source.value} value={source.value}>
                            <div className="flex items-center gap-2">
                              <Badge className={source.badgeColor}>{source.badge}</Badge>
                              {source.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Max Recipients</Label>
                    <Select value={maxLeads.toString()} onValueChange={(v) => setMaxLeads(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 (Test)</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="250">250</SelectItem>
                        <SelectItem value="500">500</SelectItem>
                        <SelectItem value="1000">1,000</SelectItem>
                        <SelectItem value="2000">2,000 (Max)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Lead Count Display */}
                <div className="p-6 bg-muted rounded-lg text-center">
                  {loadingDbLeads ? (
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="h-5 w-5 animate-spin" />
                      <span>Loading leads...</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-4xl font-bold mb-2">
                        {dbLeadCount.toLocaleString()}
                      </div>
                      <div className="text-muted-foreground">
                        leads available with {selectedSource === "all" ? "any status" : selectedSource} status
                      </div>
                      {dbLeadCount > 0 && previewLead && (
                        <div className="mt-4 text-sm text-muted-foreground">
                          Sample: {previewLead.firstName} {previewLead.lastName} - {previewLead.phone}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleUseDatabaseLeads}
                  disabled={dbLeadCount === 0 || loadingDbLeads}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Use {Math.min(dbLeadCount, maxLeads).toLocaleString()} Leads from Database
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* CSV MODE */}
            {sourceMode === "csv" && (
              <>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">Drag & drop your CSV file here</p>
                  <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    aria-label="Upload CSV file"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelect(f);
                    }}
                  />
                  <Button variant="outline">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Select CSV File
                  </Button>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Required CSV Columns
                  </h3>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      <strong>phone</strong> (or mobile, cell) - Required
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                      firstName, lastName, company, city, state - Optional
                    </li>
                  </ul>
                </div>
              </>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* STEP 2: COMPOSE */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {step === "compose" && (
        <div className="space-y-6">
          {/* Header Card */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Compose Message</CardTitle>
                  <CardDescription>{file?.name}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    <Users className="h-4 w-4 mr-2" />
                    {leads.length.toLocaleString()} leads
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={resetBlast}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Options Row */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Message Type</Label>
                  <Select value={selectedLabel} onValueChange={setSelectedLabel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MESSAGE_LABELS.map((label) => {
                        const Icon = label.icon;
                        return (
                          <SelectItem key={label.value} value={label.value}>
                            <div className="flex items-center gap-2">
                              <div className={`p-1 rounded ${label.color}`}>
                                <Icon className="h-3 w-3 text-white" />
                              </div>
                              {label.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Max Recipients</Label>
                  <Select value={maxLeads.toString()} onValueChange={(v) => setMaxLeads(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 (Test)</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="250">250</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                      <SelectItem value="1000">1,000</SelectItem>
                      <SelectItem value="2000">2,000 (Max)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Starter Templates */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Quick Templates
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {STARTER_TEMPLATES.map((tpl, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => loadTemplate(tpl)}
                    >
                      {tpl.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Saved Templates */}
              {savedTemplates.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Bookmark className="h-4 w-4" />
                    Saved Templates
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    {savedTemplates.map((tpl) => (
                      <Badge
                        key={tpl.id}
                        variant="secondary"
                        className="cursor-pointer hover:bg-muted group"
                      >
                        <span onClick={() => loadTemplate(tpl)}>{tpl.name}</span>
                        <X
                          className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTemplate(tpl.id);
                          }}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Message</Label>
                  <div className="flex gap-1">
                    {TEMPLATE_VARS.map((v) => (
                      <Button
                        key={v.key}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => insertVariable(v.key)}
                        title={v.desc}
                      >
                        {v.key}
                      </Button>
                    ))}
                  </div>
                </div>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hey {firstName}, just wanted to reach out about..."
                  className="min-h-[120px] font-mono text-sm"
                  maxLength={480}
                />
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>{charCount}/480 characters • {segmentCount} segment(s)</span>
                  {segmentCount > 1 && (
                    <span className="text-amber-500 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Multiple segments = higher cost
                    </span>
                  )}
                </div>
              </div>

              {/* Live Preview */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <Label>Live Preview</Label>
                  {leads.length > 1 && (
                    <Select
                      value={previewLead?.phone || ""}
                      onValueChange={(phone) => setPreviewLead(leads.find((l) => l.phone === phone) || null)}
                    >
                      <SelectTrigger className="h-7 w-[180px]">
                        <SelectValue placeholder="Select lead" />
                      </SelectTrigger>
                      <SelectContent>
                        {leads.slice(0, 10).map((lead, i) => (
                          <SelectItem key={i} value={lead.phone}>
                            {lead.firstName} {lead.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border-l-4 border-green-500">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        To: {previewLead ? `${previewLead.firstName} ${previewLead.lastName}` : "[Lead Name]"}
                      </p>
                      <p className="mt-1 text-sm text-green-700 dark:text-green-300 whitespace-pre-wrap">
                        {renderPreview(previewLead)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Row */}
              <div className="flex flex-wrap gap-2">
                <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <CalendarDays className="h-4 w-4" />
                      {scheduledDate ? format(scheduledDate, "PPP") : "Schedule"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3 border-b">
                      <Label>Send Time</Label>
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <Calendar
                      mode="single"
                      selected={scheduledDate}
                      onSelect={(date) => {
                        setScheduledDate(date);
                        if (date) setShowCalendar(false);
                      }}
                      disabled={(date) => date < new Date()}
                    />
                    {scheduledDate && (
                      <div className="p-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setScheduledDate(undefined);
                            setShowCalendar(false);
                          }}
                        >
                          Clear Schedule
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>

                <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowSaveDialog(true)}>
                  <Save className="h-4 w-4" />
                  Save Template
                </Button>

                <Button
                  variant={pushToHotQueue ? "default" : "outline"}
                  size="sm"
                  className={`gap-2 ${pushToHotQueue ? "bg-red-500 hover:bg-red-600" : ""}`}
                  onClick={() => setPushToHotQueue(!pushToHotQueue)}
                >
                  <Flame className="h-4 w-4" />
                  Hot Queue
                </Button>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Main Action */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={resetBlast}>
                  Back
                </Button>
                <Button onClick={handleSendClick} className="flex-1 bg-green-600 hover:bg-green-700">
                  <Send className="mr-2 h-4 w-4" />
                  Continue to {effectiveLeadCount.toLocaleString()} Leads
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* STEP 3: CONFIRM */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {step === "confirm" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm SMS Blast
            </CardTitle>
            <CardDescription>
              {scheduledDate
                ? `Scheduling for ${format(scheduledDate, "PPP")} at ${scheduledTime}`
                : `Sending to ${effectiveLeadCount.toLocaleString()} leads immediately`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Message Preview</span>
                {labelInfo && <Badge className={labelInfo.color}>{labelInfo.label}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {renderPreview(previewLead)}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <Users className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                <div className="text-lg font-bold">{effectiveLeadCount}</div>
                <div className="text-xs text-muted-foreground">Recipients</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <MessageSquare className="h-5 w-5 mx-auto mb-1 text-green-500" />
                <div className="text-lg font-bold">{segmentCount}</div>
                <div className="text-xs text-muted-foreground">Segments</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <Clock className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                <div className="text-lg font-bold">{scheduledDate ? "Scheduled" : "Now"}</div>
                <div className="text-xs text-muted-foreground">Send Time</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <Flame className="h-5 w-5 mx-auto mb-1 text-red-500" />
                <div className="text-lg font-bold">{pushToHotQueue ? "Yes" : "No"}</div>
                <div className="text-xs text-muted-foreground">Hot Queue</div>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will send via SignalHouse. Daily limit: 2,000 messages. This action cannot be undone.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("compose")}>
                Back
              </Button>
              <Button onClick={executeSend} className="flex-1 bg-green-600 hover:bg-green-700">
                <Zap className="mr-2 h-4 w-4" />
                {scheduledDate ? "Confirm & Schedule" : "Confirm & Send"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* STEP 4: SENDING */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {step === "sending" && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Sending Messages...</h2>
            <p className="text-muted-foreground mb-6">
              {progress.sent + progress.failed} of {progress.total} processed
            </p>
            <div className="max-w-md mx-auto space-y-4">
              <Progress value={(progress.sent + progress.failed) / progress.total * 100} className="h-3" />
              <div className="flex justify-center gap-8 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>{progress.sent} sent</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span>{progress.failed} failed</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* STEP 5: COMPLETE */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {step === "complete" && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Blast Complete!</h2>
            <p className="text-muted-foreground mb-6">
              Your messages have been sent via SignalHouse
            </p>

            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{progress.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="p-4 bg-green-500/10 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{progress.sent}</div>
                <div className="text-xs text-muted-foreground">Sent</div>
              </div>
              <div className="p-4 bg-red-500/10 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{progress.failed}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={resetBlast}>
                <Rocket className="mr-2 h-4 w-4" />
                Send Another Blast
              </Button>
              <Button asChild>
                <a href="inbox">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  View Inbox
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* DIALOGS */}
      {/* ════════════════════════════════════════════════════════════════════════ */}

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>Save this message for quick reuse later</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Initial Outreach, Follow-up #1"
              />
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Message Preview:</p>
              <p className="text-sm whitespace-pre-wrap">{message || "No message"}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
