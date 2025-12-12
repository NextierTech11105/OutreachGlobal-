"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Phone,
  Zap,
  Clock,
  Users,
  Send,
  Eye,
  Shuffle,
  Target,
  TrendingUp,
} from "lucide-react";
import masterTemplates from "@/lib/templates/master_templates.json";
import smsInitial from "@/lib/templates/sms_initial.json";
import {
  PERSONALITY_ARCHETYPES,
  PersonalityArchetype,
} from "@/lib/gianna/personality-dna";
import { sf } from "@/lib/utils/safe-format";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface SMSDripConfig {
  // Trigger settings
  triggerEvent: "skip_trace_complete" | "lead_created" | "lead_has_mobile";
  requireMobile: boolean;

  // Template settings
  templateCategory: string;
  selectedTemplate: string;
  personality: PersonalityArchetype;

  // Batch settings
  batchSize: number;
  maxPerDay: number;
  dripDelayMinutes: number;

  // Schedule settings
  scheduleEnabled: boolean;
  scheduleStartHour: number;
  scheduleEndHour: number;
  scheduleDays: number[]; // 0-6, Sunday-Saturday

  // Straight Line settings
  straightLineEnabled: boolean;
  agreeOvercomeClose: boolean;
}

interface LeadPreview {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phone: string;
  industry: string;
}

interface Props {
  onSave?: (config: SMSDripConfig) => void;
  onPreview?: (leads: LeadPreview[], message: string) => void;
  initialConfig?: Partial<SMSDripConfig>;
  leads?: LeadPreview[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const TRIGGER_EVENTS = [
  {
    value: "skip_trace_complete",
    label: "Skip Trace Complete",
    description: "When skip trace returns a mobile number",
    icon: Phone,
  },
  {
    value: "lead_created",
    label: "Lead Created",
    description: "When a new lead is added with mobile",
    icon: Users,
  },
  {
    value: "lead_has_mobile",
    label: "Lead Has Mobile",
    description: "Any lead with valid mobile number",
    icon: MessageSquare,
  },
];

const TEMPLATE_CATEGORIES = [
  { value: "sms_initial", label: "Initial Outreach", source: "individual" },
  {
    value: "sms_initial_medium_article",
    label: "Medium Article Invite",
    source: "master",
  },
  {
    value: "strategy_session_sms",
    label: "Strategy Session",
    source: "master",
  },
  {
    value: "gianna_nielsen_loop",
    label: "Gianna Nielsen Loop",
    source: "master",
  },
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const DEFAULT_CONFIG: SMSDripConfig = {
  triggerEvent: "skip_trace_complete",
  requireMobile: true,
  templateCategory: "sms_initial_medium_article",
  selectedTemplate: "med_1",
  personality: "brooklyn_bestie",
  batchSize: 250,
  maxPerDay: 2000,
  dripDelayMinutes: 2,
  scheduleEnabled: true,
  scheduleStartHour: 9,
  scheduleEndHour: 17,
  scheduleDays: [1, 2, 3, 4, 5], // Mon-Fri
  straightLineEnabled: true,
  agreeOvercomeClose: true,
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function SMSDripAutomation({
  onSave,
  onPreview,
  initialConfig,
  leads = [],
}: Props) {
  const [config, setConfig] = useState<SMSDripConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });

  const [previewMessage, setPreviewMessage] = useState<string>("");
  const [previewLead, setPreviewLead] = useState<LeadPreview | null>(null);
  const [templates, setTemplates] = useState<
    Array<{ id: string; text: string }>
  >([]);

  // Load templates when category changes
  useEffect(() => {
    loadTemplates(config.templateCategory);
  }, [config.templateCategory]);

  // Update preview when template or lead changes
  useEffect(() => {
    if (config.selectedTemplate && previewLead) {
      renderPreview();
    }
  }, [config.selectedTemplate, previewLead]);

  const loadTemplates = (category: string) => {
    const masterCats = masterTemplates.templates as Record<
      string,
      Array<{ id: string; text: string }>
    >;

    if (masterCats[category]) {
      setTemplates(masterCats[category]);
    } else if (category === "sms_initial") {
      setTemplates(
        smsInitial.templates.map((t) => ({ id: t.id, text: t.message })),
      );
    }
  };

  const renderPreview = () => {
    const template = templates.find((t) => t.id === config.selectedTemplate);
    if (!template || !previewLead) return;

    let message = template.text;
    message = message.replace(
      /\{\{first_name\}\}/g,
      previewLead.firstName || "there",
    );
    message = message.replace(
      /\{\{company_name\}\}/g,
      previewLead.companyName || "your business",
    );
    message = message.replace(
      /\{\{industry\}\}/g,
      previewLead.industry || "your industry",
    );

    setPreviewMessage(message);
  };

  const handleConfigChange = <K extends keyof SMSDripConfig>(
    key: K,
    value: SMSDripConfig[K],
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const toggleDay = (day: number) => {
    const days = config.scheduleDays.includes(day)
      ? config.scheduleDays.filter((d) => d !== day)
      : [...config.scheduleDays, day].sort();
    handleConfigChange("scheduleDays", days);
  };

  const calculateDailyBatches = () => {
    const hoursPerDay = config.scheduleEndHour - config.scheduleStartHour;
    const minutesPerDay = hoursPerDay * 60;
    const batchesPerDay = Math.floor(minutesPerDay / config.dripDelayMinutes);
    const leadsPerDay = Math.min(
      batchesPerDay * config.batchSize,
      config.maxPerDay,
    );
    return { batchesPerDay, leadsPerDay };
  };

  const { batchesPerDay, leadsPerDay } = calculateDailyBatches();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            SMS Drip Automation
          </h2>
          <p className="text-gray-400 text-sm">
            Skip Trace → Mobile → SMS Initial Campaign
          </p>
        </div>
        <Badge variant="outline" className="text-purple-400 border-purple-400">
          Straight Line Method
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Configuration */}
        <div className="space-y-6">
          {/* Trigger Settings */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Target className="w-4 h-4" />
                Trigger Event
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={config.triggerEvent}
                onValueChange={(v) =>
                  handleConfigChange(
                    "triggerEvent",
                    v as SMSDripConfig["triggerEvent"],
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_EVENTS.map((event) => (
                    <SelectItem key={event.value} value={event.value}>
                      <div className="flex items-center gap-2">
                        <event.icon className="w-4 h-4" />
                        <span>{event.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300">Require Mobile Number</Label>
                  <p className="text-xs text-gray-500">
                    Only process leads with mobile
                  </p>
                </div>
                <Switch
                  checked={config.requireMobile}
                  onCheckedChange={(v) =>
                    handleConfigChange("requireMobile", v)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Template Settings */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Message Template
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300">Template Category</Label>
                <Select
                  value={config.templateCategory}
                  onValueChange={(v) =>
                    handleConfigChange("templateCategory", v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300">Select Template</Label>
                <Select
                  value={config.selectedTemplate}
                  onValueChange={(v) =>
                    handleConfigChange("selectedTemplate", v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.id} - {t.text.substring(0, 40)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300">Gianna Personality</Label>
                <Select
                  value={config.personality}
                  onValueChange={(v) =>
                    handleConfigChange("personality", v as PersonalityArchetype)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PERSONALITY_ARCHETYPES).map(([id, p]) => (
                      <SelectItem key={id} value={id}>
                        {p.name} - {p.tagline}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Batch Settings */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                Batch & Rate Limiting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Batch Size</Label>
                  <Input
                    type="number"
                    value={config.batchSize}
                    onChange={(e) =>
                      handleConfigChange(
                        "batchSize",
                        parseInt(e.target.value) || 250,
                      )
                    }
                    min={1}
                    max={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Max 500 per batch
                  </p>
                </div>
                <div>
                  <Label className="text-gray-300">Max Per Day</Label>
                  <Input
                    type="number"
                    value={config.maxPerDay}
                    onChange={(e) =>
                      handleConfigChange(
                        "maxPerDay",
                        parseInt(e.target.value) || 2000,
                      )
                    }
                    min={1}
                    max={5000}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Compliance limit: 2000
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-gray-300">
                  Drip Delay: {config.dripDelayMinutes} minutes between batches
                </Label>
                <Slider
                  value={[config.dripDelayMinutes]}
                  onValueChange={(v) =>
                    handleConfigChange("dripDelayMinutes", v[0])
                  }
                  min={1}
                  max={30}
                  step={1}
                  className="mt-2"
                />
              </div>

              <div className="bg-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Est. batches/day:</span>
                  <span className="text-white font-medium">
                    {batchesPerDay}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Est. leads/day:</span>
                  <span className="text-green-400 font-medium">
                    {sf(leadsPerDay)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Settings */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-gray-300">Enable Scheduling</Label>
                <Switch
                  checked={config.scheduleEnabled}
                  onCheckedChange={(v) =>
                    handleConfigChange("scheduleEnabled", v)
                  }
                />
              </div>

              {config.scheduleEnabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Start Hour</Label>
                      <Select
                        value={config.scheduleStartHour.toString()}
                        onValueChange={(v) =>
                          handleConfigChange("scheduleStartHour", parseInt(v))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i === 0
                                ? "12 AM"
                                : i < 12
                                  ? `${i} AM`
                                  : i === 12
                                    ? "12 PM"
                                    : `${i - 12} PM`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-300">End Hour</Label>
                      <Select
                        value={config.scheduleEndHour.toString()}
                        onValueChange={(v) =>
                          handleConfigChange("scheduleEndHour", parseInt(v))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i === 0
                                ? "12 AM"
                                : i < 12
                                  ? `${i} AM`
                                  : i === 12
                                    ? "12 PM"
                                    : `${i - 12} PM`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-300 mb-2 block">
                      Active Days
                    </Label>
                    <div className="flex gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <Button
                          key={day.value}
                          type="button"
                          variant={
                            config.scheduleDays.includes(day.value)
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => toggleDay(day.value)}
                          className="w-10"
                        >
                          {day.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Straight Line Settings */}
          <Card className="bg-gray-900 border-gray-800 border-purple-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                Straight Line Method (Jordan Belfort)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-gray-300">Enable Straight Line</Label>
                  <p className="text-xs text-gray-500">
                    AGREE → OVERCOME → CLOSE
                  </p>
                </div>
                <Switch
                  checked={config.straightLineEnabled}
                  onCheckedChange={(v) =>
                    handleConfigChange("straightLineEnabled", v)
                  }
                />
              </div>

              {config.straightLineEnabled && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge className="bg-green-500/20 text-green-400">
                      AGREE
                    </Badge>
                    <span className="text-gray-400">
                      → Validate their position
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge className="bg-yellow-500/20 text-yellow-400">
                      OVERCOME
                    </Badge>
                    <span className="text-gray-400">→ Address objections</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge className="bg-blue-500/20 text-blue-400">
                      CLOSE
                    </Badge>
                    <span className="text-gray-400">→ Lock in the meeting</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Preview */}
        <div className="space-y-6">
          {/* Message Preview */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Message Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sample Lead Selector */}
              <div>
                <Label className="text-gray-300 mb-2 block">
                  Preview with Lead
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="First Name"
                    value={previewLead?.firstName || ""}
                    onChange={(e) =>
                      setPreviewLead((prev) => ({
                        id: "preview",
                        firstName: e.target.value,
                        lastName: prev?.lastName || "",
                        companyName: prev?.companyName || "",
                        phone: prev?.phone || "",
                        industry: prev?.industry || "",
                      }))
                    }
                  />
                  <Input
                    placeholder="Company"
                    value={previewLead?.companyName || ""}
                    onChange={(e) =>
                      setPreviewLead((prev) => ({
                        id: "preview",
                        firstName: prev?.firstName || "",
                        lastName: prev?.lastName || "",
                        companyName: e.target.value,
                        phone: prev?.phone || "",
                        industry: prev?.industry || "",
                      }))
                    }
                  />
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={renderPreview}
              >
                <Shuffle className="w-4 h-4 mr-2" />
                Generate Preview
              </Button>

              {/* Preview Display */}
              {previewMessage && (
                <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">SMS Preview</span>
                    <Badge variant="outline" className="text-xs">
                      {previewMessage.length} chars
                    </Badge>
                  </div>

                  <div className="bg-blue-600 text-white p-3 rounded-lg rounded-br-none text-sm">
                    {previewMessage}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      {Math.ceil(previewMessage.length / 160)} SMS segment(s)
                    </span>
                    <span className="text-green-400">
                      {previewMessage.toLowerCase().includes("stop")
                        ? "✓ Has opt-out"
                        : "⚠ Add opt-out"}
                    </span>
                  </div>
                </div>
              )}

              {/* Template Quick View */}
              <div>
                <Label className="text-gray-300 mb-2 block">
                  Available Templates
                </Label>
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {templates.slice(0, 5).map((t) => (
                    <div
                      key={t.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        config.selectedTemplate === t.id
                          ? "bg-purple-500/20 border border-purple-500/40"
                          : "bg-gray-800 hover:bg-gray-700"
                      }`}
                      onClick={() =>
                        handleConfigChange("selectedTemplate", t.id)
                      }
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">{t.id}</span>
                        <Badge variant="outline" className="text-xs">
                          {t.text.length} chars
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-300 line-clamp-2">
                        {t.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Queue Stats */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Send className="w-4 h-4" />
                Queue Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">
                    {leads.length}
                  </div>
                  <div className="text-xs text-gray-400">Leads Ready</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {Math.ceil(leads.length / config.batchSize)}
                  </div>
                  <div className="text-xs text-gray-400">Batches</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {Math.ceil(leads.length / leadsPerDay)}
                  </div>
                  <div className="text-xs text-gray-400">Days to Complete</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {sf(config.maxPerDay)}
                  </div>
                  <div className="text-xs text-gray-400">Daily Limit</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onPreview?.(leads, previewMessage)}
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview Queue
            </Button>
            <Button
              className="flex-1 bg-purple-600 hover:bg-purple-500"
              onClick={() => onSave?.(config)}
            >
              <Zap className="w-4 h-4 mr-2" />
              Start Automation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SMSDripAutomation;
