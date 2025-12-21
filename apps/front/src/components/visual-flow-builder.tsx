"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  GripVertical,
  MessageSquare,
  Mail,
  Phone,
  Clock,
  Tag,
  User,
  Webhook,
  GitBranch,
  Play,
  Pause,
  Save,
  ChevronDown,
  Zap,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ulid } from "ulid";

// ============================================
// SIMPLE NAMING - Even a moron can understand
// ============================================
const TRIGGER_OPTIONS = [
  {
    value: "label_added",
    label: "When Label Added",
    description: "Fires when you tag a contact",
    icon: Tag,
    color: "text-purple-400",
  },
  {
    value: "no_response",
    label: "No Reply",
    description: "Contact didn't respond in X days",
    icon: Clock,
    color: "text-orange-400",
  },
  {
    value: "message_received",
    label: "Got a Reply",
    description: "Contact texted back",
    icon: MessageSquare,
    color: "text-blue-400",
  },
  {
    value: "email_captured",
    label: "Email Captured",
    description: "Got their email address",
    icon: Mail,
    color: "text-green-400",
  },
  {
    value: "call_completed",
    label: "Call Ended",
    description: "After a phone call finishes",
    icon: Phone,
    color: "text-cyan-400",
  },
  {
    value: "calendar_booked",
    label: "Meeting Booked",
    description: "They scheduled a call with you",
    icon: CheckCircle2,
    color: "text-emerald-400",
  },
];

const ACTION_OPTIONS = [
  {
    value: "send_sms",
    label: "Send Text",
    description: "Send an SMS message",
    icon: MessageSquare,
    color: "bg-blue-500",
  },
  {
    value: "send_email",
    label: "Send Email",
    description: "Send an email",
    icon: Mail,
    color: "bg-purple-500",
  },
  {
    value: "schedule_call",
    label: "Schedule Call",
    description: "Add to call queue",
    icon: Phone,
    color: "bg-green-500",
  },
  {
    value: "wait",
    label: "Wait",
    description: "Pause for X hours/days",
    icon: Clock,
    color: "bg-orange-500",
  },
  {
    value: "add_label",
    label: "Add Label",
    description: "Tag the contact",
    icon: Tag,
    color: "bg-pink-500",
  },
  {
    value: "assign_worker",
    label: "Assign to AI",
    description: "Hand off to Gianna/Sabrina/Cathy",
    icon: User,
    color: "bg-cyan-500",
  },
  {
    value: "condition",
    label: "If/Then",
    description: "Branch based on condition",
    icon: GitBranch,
    color: "bg-yellow-500",
  },
  {
    value: "webhook",
    label: "Webhook",
    description: "Call external API",
    icon: Webhook,
    color: "bg-gray-500",
  },
];

interface PlayStep {
  id: string;
  order: number;
  actionType: string;
  config: Record<string, unknown>;
}

interface FlowBuilderProps {
  playId?: string;
  initialName?: string;
  initialTrigger?: string;
  initialTriggerConfig?: Record<string, unknown>;
  initialSteps?: PlayStep[];
  onSave?: (data: {
    name: string;
    trigger: string;
    triggerConfig: Record<string, unknown>;
    steps: PlayStep[];
  }) => void;
  className?: string;
}

export function VisualFlowBuilder({
  playId,
  initialName = "",
  initialTrigger = "",
  initialTriggerConfig = {},
  initialSteps = [],
  onSave,
  className,
}: FlowBuilderProps) {
  const [name, setName] = useState(initialName);
  const [trigger, setTrigger] = useState(initialTrigger);
  const [triggerConfig, setTriggerConfig] = useState(initialTriggerConfig);
  const [steps, setSteps] = useState<PlayStep[]>(initialSteps);
  const [selectedStep, setSelectedStep] = useState<PlayStep | null>(null);
  const [showActionPicker, setShowActionPicker] = useState(false);
  const [insertAfterIndex, setInsertAfterIndex] = useState(-1);

  // Add a new step
  const addStep = useCallback(
    (actionType: string, afterIndex: number) => {
      const newStep: PlayStep = {
        id: ulid(),
        order: afterIndex + 1,
        actionType,
        config: {},
      };

      const newSteps = [...steps];
      newSteps.splice(afterIndex + 1, 0, newStep);

      // Re-order
      newSteps.forEach((s, i) => (s.order = i));
      setSteps(newSteps);
      setSelectedStep(newStep);
      setShowActionPicker(false);
    },
    [steps],
  );

  // Remove a step
  const removeStep = useCallback(
    (stepId: string) => {
      setSteps(steps.filter((s) => s.id !== stepId));
      if (selectedStep?.id === stepId) {
        setSelectedStep(null);
      }
    },
    [steps, selectedStep],
  );

  // Update step config
  const updateStepConfig = useCallback(
    (stepId: string, config: Record<string, unknown>) => {
      setSteps(
        steps.map((s) =>
          s.id === stepId ? { ...s, config: { ...s.config, ...config } } : s,
        ),
      );
    },
    [steps],
  );

  // Get action info
  const getActionInfo = (type: string) =>
    ACTION_OPTIONS.find((a) => a.value === type);
  const getTriggerInfo = (type: string) =>
    TRIGGER_OPTIONS.find((t) => t.value === type);

  const selectedTrigger = getTriggerInfo(trigger);

  return (
    <div className={cn("flex h-full", className)}>
      {/* Left: Visual Flow Canvas */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Play Name */}
        <div className="mb-6">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name this play (e.g., 'If No Reply in 3 Days')"
            className="text-xl font-semibold bg-transparent border-none focus:ring-0 px-0"
          />
        </div>

        {/* Trigger Block */}
        <div className="flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <Card
              className={cn(
                "border-2 cursor-pointer transition-all hover:border-primary/50",
                trigger
                  ? "border-emerald-500/50"
                  : "border-dashed border-zinc-700",
              )}
              onClick={() => {
                /* Open trigger picker */
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      trigger ? "bg-emerald-500/20" : "bg-zinc-800",
                    )}
                  >
                    {selectedTrigger ? (
                      <selectedTrigger.icon
                        className={cn("w-5 h-5", selectedTrigger.color)}
                      />
                    ) : (
                      <Zap className="w-5 h-5 text-zinc-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Badge
                      variant="outline"
                      className="mb-1 text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    >
                      TRIGGER
                    </Badge>
                    <p className="font-medium text-zinc-100">
                      {selectedTrigger?.label || "Choose what starts this play"}
                    </p>
                    {selectedTrigger && (
                      <p className="text-sm text-zinc-500">
                        {selectedTrigger.description}
                      </p>
                    )}
                  </div>
                  <ChevronDown className="w-5 h-5 text-zinc-500" />
                </div>

                {/* Trigger Config */}
                {trigger === "no_response" && (
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <Label className="text-xs text-zinc-400">
                      Wait how many days?
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={(triggerConfig.days as number) || 3}
                        onChange={(e) =>
                          setTriggerConfig({
                            ...triggerConfig,
                            days: parseInt(e.target.value),
                          })
                        }
                        className="w-20"
                      />
                      <span className="text-sm text-zinc-400">days</span>
                    </div>
                  </div>
                )}

                {trigger === "label_added" && (
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <Label className="text-xs text-zinc-400">
                      Which label?
                    </Label>
                    <Select
                      value={(triggerConfig.label as string) || ""}
                      onValueChange={(v) =>
                        setTriggerConfig({ ...triggerConfig, label: v })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select a label" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hot_lead">🔥 Hot Lead</SelectItem>
                        <SelectItem value="email_captured">
                          📧 Email Captured
                        </SelectItem>
                        <SelectItem value="has_questions">
                          ❓ Has Questions
                        </SelectItem>
                        <SelectItem value="needs_follow_up">
                          📞 Needs Follow-up
                        </SelectItem>
                        <SelectItem value="sold">✅ Sold</SelectItem>
                        <SelectItem value="not_interested">
                          ❌ Not Interested
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Connector Line */}
          {trigger && (
            <div className="flex flex-col items-center my-2">
              <div className="w-0.5 h-8 bg-zinc-700" />
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 hover:border-primary"
                onClick={() => {
                  setInsertAfterIndex(-1);
                  setShowActionPicker(true);
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
              <div className="w-0.5 h-8 bg-zinc-700" />
            </div>
          )}

          {/* Steps */}
          <AnimatePresence>
            {steps.map((step, index) => {
              const actionInfo = getActionInfo(step.actionType);
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="w-full max-w-md flex flex-col items-center"
                >
                  <Card
                    className={cn(
                      "w-full border cursor-pointer transition-all",
                      selectedStep?.id === step.id
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-zinc-800 hover:border-zinc-700",
                    )}
                    onClick={() => setSelectedStep(step)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="cursor-grab">
                          <GripVertical className="w-4 h-4 text-zinc-600" />
                        </div>
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            actionInfo?.color || "bg-zinc-800",
                          )}
                        >
                          {actionInfo?.icon && (
                            <actionInfo.icon className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-zinc-100">
                            {actionInfo?.label || step.actionType}
                          </p>
                          <p className="text-sm text-zinc-500">
                            {getStepSummary(step)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-zinc-500 hover:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeStep(step.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Connector & Add Button */}
                  <div className="flex flex-col items-center my-2">
                    <div className="w-0.5 h-8 bg-zinc-700" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 hover:border-primary"
                      onClick={() => {
                        setInsertAfterIndex(index);
                        setShowActionPicker(true);
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <div className="w-0.5 h-8 bg-zinc-700" />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* End Block */}
          {trigger && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-md"
            >
              <Card className="border-red-500/30 bg-red-500/5">
                <CardContent className="p-4 text-center">
                  <p className="text-sm font-medium text-red-400">
                    Flow ends here
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>

      {/* Right: Step Configuration Panel */}
      <div className="w-80 border-l border-zinc-800 bg-zinc-950 p-4 overflow-auto">
        {selectedStep ? (
          <StepConfigPanel
            step={selectedStep}
            onUpdate={(config) => updateStepConfig(selectedStep.id, config)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertCircle className="w-12 h-12 text-zinc-600 mb-4" />
            <p className="text-zinc-500">Click on a step to configure it</p>
          </div>
        )}

        {/* Save/Run Buttons */}
        <div className="absolute bottom-4 left-0 right-0 px-4 flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onSave?.({ name, trigger, triggerConfig, steps })}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button className="flex-1">
            <Play className="w-4 h-4 mr-2" />
            Activate
          </Button>
        </div>
      </div>

      {/* Action Picker Sheet */}
      <Sheet open={showActionPicker} onOpenChange={setShowActionPicker}>
        <SheetContent side="bottom" className="h-96">
          <SheetHeader>
            <SheetTitle>Add an Action</SheetTitle>
            <SheetDescription>
              What should happen next in this play?
            </SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {ACTION_OPTIONS.map((action) => (
              <Card
                key={action.value}
                className="cursor-pointer hover:border-primary transition-all"
                onClick={() => addStep(action.value, insertAfterIndex)}
              >
                <CardContent className="p-4 text-center">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3",
                      action.color,
                    )}
                  >
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-medium text-zinc-100">{action.label}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {action.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Step Configuration Panel
function StepConfigPanel({
  step,
  onUpdate,
}: {
  step: PlayStep;
  onUpdate: (config: Record<string, unknown>) => void;
}) {
  const actionInfo = ACTION_OPTIONS.find((a) => a.value === step.actionType);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            actionInfo?.color || "bg-zinc-800",
          )}
        >
          {actionInfo?.icon && (
            <actionInfo.icon className="w-5 h-5 text-white" />
          )}
        </div>
        <div>
          <p className="font-medium text-zinc-100">{actionInfo?.label}</p>
          <p className="text-xs text-zinc-500">ID: {step.id.slice(0, 8)}...</p>
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-800 space-y-4">
        {step.actionType === "send_sms" && (
          <>
            <div>
              <Label>Message</Label>
              <Textarea
                value={(step.config.message as string) || ""}
                onChange={(e) => onUpdate({ message: e.target.value })}
                placeholder="Type your message... Use {firstName}, {companyName}, etc."
                rows={4}
                className="mt-1"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Variables: {"{firstName}"}, {"{lastName}"}, {"{companyName}"},{" "}
                {"{phone}"}
              </p>
            </div>
            <div>
              <Label>Send as</Label>
              <Select
                value={(step.config.worker as string) || "gianna"}
                onValueChange={(v) => onUpdate({ worker: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gianna">🔥 Gianna (The Closer)</SelectItem>
                  <SelectItem value="sabrina">
                    ✅ Sabrina (Email SDR)
                  </SelectItem>
                  <SelectItem value="cathy">💜 Cathy (Relationship)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {step.actionType === "wait" && (
          <div>
            <Label>Wait for</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                min={1}
                value={(step.config.duration as number) || 1}
                onChange={(e) =>
                  onUpdate({ duration: parseInt(e.target.value) })
                }
                className="w-20"
              />
              <Select
                value={(step.config.unit as string) || "days"}
                onValueChange={(v) => onUpdate({ unit: v })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step.actionType === "add_label" && (
          <div>
            <Label>Add label</Label>
            <Select
              value={(step.config.label as string) || ""}
              onValueChange={(v) => onUpdate({ label: v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select label" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hot_lead">🔥 Hot Lead</SelectItem>
                <SelectItem value="follow_up_needed">
                  📞 Follow-up Needed
                </SelectItem>
                <SelectItem value="email_sent">📧 Email Sent</SelectItem>
                <SelectItem value="called">📱 Called</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {step.actionType === "assign_worker" && (
          <div>
            <Label>Hand off to</Label>
            <Select
              value={(step.config.worker as string) || ""}
              onValueChange={(v) => onUpdate({ worker: v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select AI worker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gianna">🔥 Gianna (The Closer)</SelectItem>
                <SelectItem value="sabrina">✅ Sabrina (Email SDR)</SelectItem>
                <SelectItem value="cathy">💜 Cathy (Relationship)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-500 mt-2">
              The AI will take over this conversation
            </p>
          </div>
        )}

        {step.actionType === "schedule_call" && (
          <>
            <div>
              <Label>Call priority</Label>
              <Select
                value={(step.config.priority as string) || "normal"}
                onValueChange={(v) => onUpdate({ priority: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">🔴 High - Call ASAP</SelectItem>
                  <SelectItem value="normal">🟡 Normal</SelectItem>
                  <SelectItem value="low">🟢 Low - Whenever</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes for caller</Label>
              <Textarea
                value={(step.config.notes as string) || ""}
                onChange={(e) => onUpdate({ notes: e.target.value })}
                placeholder="Add context for the call..."
                rows={3}
                className="mt-1"
              />
            </div>
          </>
        )}

        {step.actionType === "send_email" && (
          <>
            <div>
              <Label>Subject</Label>
              <Input
                value={(step.config.subject as string) || ""}
                onChange={(e) => onUpdate({ subject: e.target.value })}
                placeholder="{firstName}, quick update..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea
                value={(step.config.body as string) || ""}
                onChange={(e) => onUpdate({ body: e.target.value })}
                placeholder="Type your email..."
                rows={6}
                className="mt-1"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Helper to get step summary
function getStepSummary(step: PlayStep): string {
  switch (step.actionType) {
    case "send_sms":
      return step.config.message
        ? `"${(step.config.message as string).slice(0, 30)}..."`
        : "Configure message";
    case "wait":
      return `${step.config.duration || 1} ${step.config.unit || "days"}`;
    case "add_label":
      return step.config.label ? `Add "${step.config.label}"` : "Select label";
    case "assign_worker":
      return step.config.worker
        ? `Hand to ${step.config.worker}`
        : "Select worker";
    case "send_email":
      return step.config.subject || "Configure email";
    case "schedule_call":
      return `Priority: ${step.config.priority || "normal"}`;
    default:
      return "Configure action";
  }
}
