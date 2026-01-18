"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  ChevronRight,
  Clock,
  Sparkles,
  Check,
  AlertCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  TEMPLATE_GROUPS,
  type TemplateGroup,
  type SMSTemplate,
  FOLLOWUP_TEMPLATES,
} from "@/lib/sms/campaign-templates";

/**
 * AUTOMATION SETUP COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════════
 * Creates a 30-day SMS campaign automation:
 *
 * Day 1: Initial Message
 * Day X: First Bump (Reminder)
 * Day Y: Second Bump (Nudge)
 * [30 DAYS PAUSE]
 * Pivot: New campaign/number OR follow-up
 * ═══════════════════════════════════════════════════════════════════════════════
 */

interface AutomationConfig {
  name: string;
  templateGroup: TemplateGroup | null;
  initialMessage: SMSTemplate | null;
  firstBump: {
    template: SMSTemplate | null;
    daysAfterInitial: number;
  };
  secondBump: {
    template: SMSTemplate | null;
    daysAfterFirstBump: number;
  };
  pivotTemplate: SMSTemplate | null;
}

interface AutomationSetupProps {
  onSave?: (config: AutomationConfig) => void;
  onGenerate?: (config: AutomationConfig) => void;
  className?: string;
}

const DAY_OPTIONS = [1, 2, 3, 4, 5, 7, 10, 14];

export function AutomationSetup({
  onSave,
  onGenerate,
  className,
}: AutomationSetupProps) {
  const [config, setConfig] = useState<AutomationConfig>({
    name: "",
    templateGroup: null,
    initialMessage: null,
    firstBump: { template: null, daysAfterInitial: 2 },
    secondBump: { template: null, daysAfterFirstBump: 3 },
    pivotTemplate: null,
  });

  const [step, setStep] = useState<1 | 2>(1);

  // Select a template group and auto-fill all messages
  const handleSelectGroup = (groupId: string) => {
    const group = TEMPLATE_GROUPS.find((g) => g.id === groupId);
    if (group) {
      setConfig({
        ...config,
        templateGroup: group,
        initialMessage: group.templates.initial,
        firstBump: {
          ...config.firstBump,
          template: group.templates.reminder,
        },
        secondBump: {
          ...config.secondBump,
          template: group.templates.nudge,
        },
        pivotTemplate: FOLLOWUP_TEMPLATES[0] || null,
      });
    }
  };

  // Check if config is complete
  const isComplete =
    config.initialMessage &&
    config.firstBump.template &&
    config.secondBump.template;

  const handleGenerate = () => {
    if (onGenerate && isComplete) {
      onGenerate(config);
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Automation Setup
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure your 30-day SMS campaign sequence
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={!isComplete}
          className="bg-gradient-to-r from-emerald-600 to-teal-600"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Automation
        </Button>
      </div>

      {/* Step 1: Automation Info / Template Group Selection */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <CardTitle className="text-base">Automation Info</CardTitle>
              <CardDescription>Select a template group</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm mb-2 block">Template Group</Label>
            <Select
              value={config.templateGroup?.id || ""}
              onValueChange={handleSelectGroup}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a template group..." />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_GROUPS.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    <div className="flex items-center gap-2">
                      <span>{group.name}</span>
                      <Badge variant="outline" className="text-xs">
                        3 messages
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {config.templateGroup && (
              <p className="text-xs text-muted-foreground mt-2">
                {config.templateGroup.description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Settings / Message Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <CardTitle className="text-base">Settings</CardTitle>
              <CardDescription>Configure message timing</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Initial Message */}
            <MessageSlot
              title="Initial Message"
              template={config.initialMessage}
              onSelectTemplate={(t) =>
                setConfig({ ...config, initialMessage: t })
              }
              available={
                config.templateGroup
                  ? [config.templateGroup.templates.initial]
                  : []
              }
            />

            {/* First Bump */}
            <MessageSlot
              title="First Bump"
              subtitle={
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    Send message
                  </span>
                  <Select
                    value={String(config.firstBump.daysAfterInitial)}
                    onValueChange={(v) =>
                      setConfig({
                        ...config,
                        firstBump: {
                          ...config.firstBump,
                          daysAfterInitial: parseInt(v),
                        },
                      })
                    }
                  >
                    <SelectTrigger className="h-7 w-16 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAY_OPTIONS.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">
                    day(s) after initial message
                  </span>
                </div>
              }
              template={config.firstBump.template}
              onSelectTemplate={(t) =>
                setConfig({
                  ...config,
                  firstBump: { ...config.firstBump, template: t },
                })
              }
              available={
                config.templateGroup
                  ? [config.templateGroup.templates.reminder]
                  : []
              }
            />

            {/* Second Bump */}
            <MessageSlot
              title="Second Bump"
              subtitle={
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    Send message
                  </span>
                  <Select
                    value={String(config.secondBump.daysAfterFirstBump)}
                    onValueChange={(v) =>
                      setConfig({
                        ...config,
                        secondBump: {
                          ...config.secondBump,
                          daysAfterFirstBump: parseInt(v),
                        },
                      })
                    }
                  >
                    <SelectTrigger className="h-7 w-16 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAY_OPTIONS.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">
                    day(s) after first bump
                  </span>
                </div>
              }
              template={config.secondBump.template}
              onSelectTemplate={(t) =>
                setConfig({
                  ...config,
                  secondBump: { ...config.secondBump, template: t },
                })
              }
              available={
                config.templateGroup
                  ? [config.templateGroup.templates.nudge]
                  : []
              }
            />
          </div>

          {/* Timeline Preview */}
          {config.templateGroup && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Campaign Timeline
              </h4>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="secondary">Day 1</Badge>
                <span className="text-muted-foreground">Initial</span>
                <ChevronRight className="h-3 w-3" />
                <Badge variant="secondary">
                  Day {1 + config.firstBump.daysAfterInitial}
                </Badge>
                <span className="text-muted-foreground">First Bump</span>
                <ChevronRight className="h-3 w-3" />
                <Badge variant="secondary">
                  Day{" "}
                  {1 +
                    config.firstBump.daysAfterInitial +
                    config.secondBump.daysAfterFirstBump}
                </Badge>
                <span className="text-muted-foreground">Second Bump</span>
                <ChevronRight className="h-3 w-3" />
                <Badge variant="outline" className="bg-amber-50 text-amber-700">
                  30 Day Pause
                </Badge>
                <ChevronRight className="h-3 w-3" />
                <Badge variant="secondary">Pivot</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Status */}
      <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
        {isComplete ? (
          <>
            <Check className="h-5 w-5 text-green-500" />
            <span className="text-sm text-green-600 font-medium">
              Automation ready to generate
            </span>
          </>
        ) : (
          <>
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <span className="text-sm text-muted-foreground">
              Select a template group to configure all messages
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Message Slot Component
 */
interface MessageSlotProps {
  title: string;
  subtitle?: React.ReactNode;
  template: SMSTemplate | null;
  onSelectTemplate: (template: SMSTemplate) => void;
  available: SMSTemplate[];
}

function MessageSlot({
  title,
  subtitle,
  template,
  onSelectTemplate,
  available,
}: MessageSlotProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Card className={cn(template ? "border-green-200 bg-green-50/30" : "")}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {subtitle}
      </CardHeader>
      <CardContent>
        {template ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground line-clamp-3">
              {template.message}
            </p>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {template.charCount} chars
              </Badge>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs h-7">
                    Change
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Select {title}</DialogTitle>
                    <DialogDescription>
                      Choose a template for this stage
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {available.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          onSelectTemplate(t);
                          setDialogOpen(false);
                        }}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors",
                          template?.id === t.id && "border-primary bg-primary/5"
                        )}
                      >
                        <p className="text-sm">{t.message}</p>
                        <Badge variant="outline" className="text-xs mt-2">
                          {t.charCount} chars
                        </Badge>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ) : (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full text-blue-600">
                <MessageSquare className="h-4 w-4 mr-2" />
                Select Message
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Select {title}</DialogTitle>
                <DialogDescription>
                  Choose a template for this stage
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {available.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Select a template group first
                  </p>
                ) : (
                  available.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        onSelectTemplate(t);
                        setDialogOpen(false);
                      }}
                      className="p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors"
                    >
                      <p className="text-sm">{t.message}</p>
                      <Badge variant="outline" className="text-xs mt-2">
                        {t.charCount} chars
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

export default AutomationSetup;
