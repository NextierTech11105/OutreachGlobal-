"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap,
  Clock,
  Thermometer,
  MessageSquare,
  ArrowRight,
  Users,
  Sparkles,
  Check,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ALL_TEMPLATES,
  type SmsTemplate,
} from "@/lib/templates/nextier-defaults";

/**
 * SEQUENCE WIZARD
 *
 * Quick sequence creation with 4 steps:
 * 1. CADENCE (Timing) - Aggressive / Standard / Slow Burn
 * 2. TEMPERATURE (Tone) - Professional / Friendly / Direct
 * 3. CONTENT (Templates) - Pick for Initial / Follow-up / Nudge / Closer
 * 4. ESCALATION - No response rules
 */

// Cadence options
const CADENCE_OPTIONS = [
  {
    id: "aggressive",
    name: "Aggressive",
    description: "1-2 days between messages",
    days: [1, 2, 1, 2, 1],
    color: "text-red-400",
    bgColor: "bg-red-900/30 border-red-500/30",
  },
  {
    id: "standard",
    name: "Standard",
    description: "3-4 days between messages",
    days: [3, 3, 4, 3, 4],
    color: "text-amber-400",
    bgColor: "bg-amber-900/30 border-amber-500/30",
  },
  {
    id: "slow",
    name: "Slow Burn",
    description: "7+ days between messages",
    days: [7, 7, 5, 7, 7],
    color: "text-emerald-400",
    bgColor: "bg-emerald-900/30 border-emerald-500/30",
  },
];

// Temperature options
const TEMPERATURE_OPTIONS = [
  {
    id: "professional",
    name: "Professional",
    description: "Formal, business-first",
    icon: "briefcase",
    color: "text-blue-400",
    bgColor: "bg-blue-900/30 border-blue-500/30",
  },
  {
    id: "friendly",
    name: "Friendly",
    description: "Warm, personable",
    icon: "smile",
    color: "text-purple-400",
    bgColor: "bg-purple-900/30 border-purple-500/30",
  },
  {
    id: "direct",
    name: "Direct",
    description: "No fluff, straight to point",
    icon: "target",
    color: "text-orange-400",
    bgColor: "bg-orange-900/30 border-orange-500/30",
  },
];

// Content slots
const CONTENT_SLOTS = [
  { id: "initial", name: "Initial", category: "initial", worker: "gianna" },
  { id: "followup", name: "Follow-up", category: "retarget", worker: "gianna" },
  { id: "nudge", name: "Nudge", category: "nudge", worker: "cathy" },
  { id: "closer", name: "Closer", category: "closer", worker: "sabrina" },
];

// Escalation options
const ESCALATION_OPTIONS = [
  { id: "3", label: "3 days", value: 3 },
  { id: "5", label: "5 days", value: 5 },
  { id: "7", label: "7 days", value: 7 },
];

const ESCALATION_ACTIONS = [
  { id: "cathy", label: "Route to CATHY", worker: "cathy" },
  { id: "sabrina", label: "Route to SABRINA", worker: "sabrina" },
  { id: "archive", label: "Archive (30-day retry)", worker: null },
];

interface WizardConfig {
  name: string;
  cadence: string;
  temperature: string;
  templates: Record<string, string>;
  escalationDays: number;
  escalationAction: string;
}

interface SequenceWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: (config: WizardConfig) => void;
}

export function SequenceWizard({
  open,
  onClose,
  onComplete,
}: SequenceWizardProps) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<WizardConfig>({
    name: "",
    cadence: "standard",
    temperature: "friendly",
    templates: {},
    escalationDays: 5,
    escalationAction: "cathy",
  });

  const totalSteps = 4;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onComplete(config);
      onClose();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return config.name.trim().length > 0 && config.cadence;
      case 2:
        return config.temperature;
      case 3:
        return Object.keys(config.templates).length >= 2; // At least 2 templates selected
      case 4:
        return config.escalationDays && config.escalationAction;
      default:
        return true;
    }
  };

  // Filter templates by category
  const getTemplatesForSlot = (category: string) => {
    return ALL_TEMPLATES.filter((t) => t.category === category);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            New Sequence Wizard
            <Badge variant="outline" className="ml-2">
              Step {step} of {totalSteps}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="flex gap-1 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                s <= step ? "bg-purple-500" : "bg-zinc-700",
              )}
            />
          ))}
        </div>

        {/* Step 1: Cadence */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium mb-4 block">
                Sequence Name
              </Label>
              <Input
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                placeholder="e.g., CRM Consultant Opener"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div>
              <Label className="text-base font-medium mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Cadence (Timing)
              </Label>
              <RadioGroup
                value={config.cadence}
                onValueChange={(v) => setConfig({ ...config, cadence: v })}
                className="space-y-3"
              >
                {CADENCE_OPTIONS.map((option) => (
                  <Label
                    key={option.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all",
                      config.cadence === option.id
                        ? option.bgColor
                        : "border-zinc-700 hover:border-zinc-600",
                    )}
                  >
                    <RadioGroupItem value={option.id} />
                    <div className="flex-1">
                      <div className={cn("font-medium", option.color)}>
                        {option.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {option.description}
                      </div>
                    </div>
                    {config.cadence === option.id && (
                      <Check className="h-5 w-5 text-green-400" />
                    )}
                  </Label>
                ))}
              </RadioGroup>
            </div>
          </div>
        )}

        {/* Step 2: Temperature */}
        {step === 2 && (
          <div className="space-y-6">
            <Label className="text-base font-medium mb-4 flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              Temperature (Tone)
            </Label>
            <RadioGroup
              value={config.temperature}
              onValueChange={(v) => setConfig({ ...config, temperature: v })}
              className="space-y-3"
            >
              {TEMPERATURE_OPTIONS.map((option) => (
                <Label
                  key={option.id}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all",
                    config.temperature === option.id
                      ? option.bgColor
                      : "border-zinc-700 hover:border-zinc-600",
                  )}
                >
                  <RadioGroupItem value={option.id} />
                  <div className="flex-1">
                    <div className={cn("font-medium", option.color)}>
                      {option.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                  {config.temperature === option.id && (
                    <Check className="h-5 w-5 text-green-400" />
                  )}
                </Label>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Step 3: Content */}
        {step === 3 && (
          <div className="space-y-6">
            <Label className="text-base font-medium mb-4 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Content (Templates)
            </Label>
            <div className="space-y-4">
              {CONTENT_SLOTS.map((slot) => {
                const templates = getTemplatesForSlot(slot.category);
                const selectedId = config.templates[slot.id];
                const selectedTemplate = templates.find(
                  (t) => t.id === selectedId,
                );

                return (
                  <div key={slot.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          slot.worker === "gianna" &&
                            "border-purple-500/30 text-purple-300",
                          slot.worker === "cathy" &&
                            "border-orange-500/30 text-orange-300",
                          slot.worker === "sabrina" &&
                            "border-emerald-500/30 text-emerald-300",
                        )}
                      >
                        {slot.worker.toUpperCase()}
                      </Badge>
                      <span className="text-sm font-medium">{slot.name}</span>
                    </div>
                    <Select
                      value={selectedId || ""}
                      onValueChange={(v) =>
                        setConfig({
                          ...config,
                          templates: { ...config.templates, [slot.id]: v },
                        })
                      }
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue placeholder="Select template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center gap-2">
                              <span>{template.name}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {template.content.length}/160
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="write_new">
                          + Write New Template
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedTemplate && (
                      <div className="p-2 bg-zinc-800/50 rounded text-xs text-muted-foreground">
                        {selectedTemplate.content.substring(0, 80)}...
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Escalation */}
        {step === 4 && (
          <div className="space-y-6">
            <Label className="text-base font-medium mb-4 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Escalation Rules
            </Label>

            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">
                  No response after
                </Label>
                <div className="flex gap-2">
                  {ESCALATION_OPTIONS.map((option) => (
                    <Button
                      key={option.id}
                      variant={
                        config.escalationDays === option.value
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      className={cn(
                        config.escalationDays === option.value
                          ? "bg-purple-600 hover:bg-purple-700"
                          : "border-zinc-700",
                      )}
                      onClick={() =>
                        setConfig({ ...config, escalationDays: option.value })
                      }
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">
                  Then
                </Label>
                <RadioGroup
                  value={config.escalationAction}
                  onValueChange={(v) =>
                    setConfig({ ...config, escalationAction: v })
                  }
                  className="space-y-2"
                >
                  {ESCALATION_ACTIONS.map((action) => (
                    <Label
                      key={action.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                        config.escalationAction === action.id
                          ? "bg-zinc-800 border-purple-500/50"
                          : "border-zinc-700 hover:border-zinc-600",
                      )}
                    >
                      <RadioGroupItem value={action.id} />
                      <span className="text-sm">{action.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            </div>

            {/* Preview */}
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Sequence Preview</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <Badge variant="outline">{config.name || "Untitled"}</Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {CADENCE_OPTIONS.find((c) => c.id === config.cadence)?.name}{" "}
                    cadence
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {
                      TEMPERATURE_OPTIONS.find(
                        (t) => t.id === config.temperature,
                      )?.name
                    }{" "}
                    tone
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {Object.keys(config.templates).length} templates
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
            className="border-zinc-700"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="bg-gradient-to-r from-purple-600 to-blue-600"
            >
              {step === totalSteps ? (
                <>
                  Create Sequence
                  <Check className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SequenceWizard;
