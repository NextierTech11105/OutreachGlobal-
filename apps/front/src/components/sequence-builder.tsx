"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Mail,
  Phone,
  Clock,
  GitBranch,
  Zap,
  Plus,
  Save,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Play,
  ArrowDown,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Step types
type StepType = "sms" | "email" | "call" | "wait" | "condition";

interface SequenceStep {
  id: string;
  type: StepType;
  content?: string;
  subject?: string;
  waitDays?: number;
  waitHours?: number;
  condition?: {
    check: "no-reply" | "replied" | "clicked";
    yesBranch: "continue" | "stop" | "call";
    noBranch: "continue" | "stop" | "call";
  };
}

const STEP_CONFIG = {
  sms: {
    label: "SMS",
    icon: MessageSquare,
    color: "bg-purple-500",
    borderColor: "border-purple-500",
  },
  email: {
    label: "Email",
    icon: Mail,
    color: "bg-blue-500",
    borderColor: "border-blue-500",
  },
  call: {
    label: "Call",
    icon: Phone,
    color: "bg-green-500",
    borderColor: "border-green-500",
  },
  wait: {
    label: "Wait",
    icon: Clock,
    color: "bg-gray-500",
    borderColor: "border-gray-500",
  },
  condition: {
    label: "If/Then",
    icon: GitBranch,
    color: "bg-orange-500",
    borderColor: "border-orange-500",
  },
};

interface SequenceBuilderProps {
  initialSteps?: SequenceStep[];
  onSave?: (steps: SequenceStep[]) => void;
  sequenceName?: string;
}

export function SequenceBuilder({
  initialSteps = [],
  onSave,
  sequenceName = "New Sequence",
}: SequenceBuilderProps) {
  const [steps, setSteps] = useState<SequenceStep[]>(initialSteps);
  const [name, setName] = useState(sequenceName);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState<number | null>(null);

  const generateId = () => `step-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const addStep = (type: StepType, afterIndex: number) => {
    const newStep: SequenceStep = {
      id: generateId(),
      type,
      content: type === "sms" ? "" : undefined,
      subject: type === "email" ? "" : undefined,
      waitDays: type === "wait" ? 1 : undefined,
      condition: type === "condition" ? { check: "no-reply", yesBranch: "continue", noBranch: "stop" } : undefined,
    };

    const newSteps = [...steps];
    newSteps.splice(afterIndex + 1, 0, newStep);
    setSteps(newSteps);
    setExpandedStep(newStep.id);
    setShowAddMenu(null);
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id));
    if (expandedStep === id) setExpandedStep(null);
  };

  const updateStep = (id: string, updates: Partial<SequenceStep>) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;

    const newSteps = [...steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    setSteps(newSteps);
  };

  const handleSave = () => {
    onSave?.(steps);
  };

  // Calculate stats
  const totalDays = steps.reduce((acc, s) => acc + (s.waitDays || 0), 0);
  const smsCount = steps.filter((s) => s.type === "sms").length;
  const emailCount = steps.filter((s) => s.type === "email").length;

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-2xl font-bold border-none px-0 h-auto focus-visible:ring-0"
            placeholder="Sequence Name"
          />
          <div className="flex gap-3 mt-2 text-sm text-muted-foreground">
            <span>{steps.length} steps</span>
            <span>·</span>
            <span>{totalDays} days</span>
            {smsCount > 0 && <Badge variant="secondary" className="text-xs">{smsCount} SMS</Badge>}
            {emailCount > 0 && <Badge variant="secondary" className="text-xs">{emailCount} Email</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Play className="h-4 w-4 mr-2" />
            Test
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Trigger */}
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="font-semibold">Lead Enters Campaign</div>
            <div className="text-sm text-muted-foreground">Trigger</div>
          </div>
        </div>

        {/* Connector Line */}
        <div className="ml-6 border-l-2 border-dashed border-muted-foreground/30 pl-8 pb-4">
          {/* Add First Step Button */}
          {steps.length === 0 && (
            <div className="py-4">
              <AddStepMenu onAdd={(type) => addStep(type, -1)} />
            </div>
          )}

          {/* Steps */}
          {steps.map((step, index) => {
            const config = STEP_CONFIG[step.type];
            const Icon = config.icon;
            const isExpanded = expandedStep === step.id;

            return (
              <div key={step.id} className="relative">
                {/* Connector dot */}
                <div className={cn(
                  "absolute -left-[41px] w-4 h-4 rounded-full border-2 bg-background",
                  config.borderColor
                )} />

                {/* Step Card */}
                <Card
                  className={cn(
                    "mb-4 transition-all cursor-pointer hover:shadow-md",
                    isExpanded && "ring-2 ring-primary"
                  )}
                  onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                >
                  <div className="p-4">
                    {/* Step Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", config.color)}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            Step {index + 1}: {config.label}
                            {step.type === "wait" && (
                              <Badge variant="outline" className="text-xs">
                                {step.waitDays} day{step.waitDays !== 1 ? "s" : ""}
                              </Badge>
                            )}
                          </div>
                          {step.content && !isExpanded && (
                            <div className="text-sm text-muted-foreground truncate max-w-md">
                              {step.content.slice(0, 60)}...
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); moveStep(index, "up"); }}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); moveStep(index, "down"); }}
                          disabled={index === steps.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={(e) => { e.stopPropagation(); removeStep(step.id); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t" onClick={(e) => e.stopPropagation()}>
                        {step.type === "sms" && (
                          <div className="space-y-3">
                            <Textarea
                              placeholder="Enter your SMS message..."
                              value={step.content || ""}
                              onChange={(e) => updateStep(step.id, { content: e.target.value })}
                              rows={4}
                              className="resize-none"
                            />
                            <div className="flex gap-2 text-xs text-muted-foreground">
                              <span>Variables:</span>
                              <button className="text-primary hover:underline" onClick={() => {
                                const current = step.content || "";
                                updateStep(step.id, { content: current + "{{firstName}}" });
                              }}>firstName</button>
                              <button className="text-primary hover:underline" onClick={() => {
                                const current = step.content || "";
                                updateStep(step.id, { content: current + "{{company}}" });
                              }}>company</button>
                            </div>
                          </div>
                        )}

                        {step.type === "email" && (
                          <div className="space-y-3">
                            <Input
                              placeholder="Email subject..."
                              value={step.subject || ""}
                              onChange={(e) => updateStep(step.id, { subject: e.target.value })}
                            />
                            <Textarea
                              placeholder="Email body..."
                              value={step.content || ""}
                              onChange={(e) => updateStep(step.id, { content: e.target.value })}
                              rows={6}
                            />
                          </div>
                        )}

                        {step.type === "call" && (
                          <div className="space-y-3">
                            <Textarea
                              placeholder="Call script / notes..."
                              value={step.content || ""}
                              onChange={(e) => updateStep(step.id, { content: e.target.value })}
                              rows={4}
                            />
                          </div>
                        )}

                        {step.type === "wait" && (
                          <div className="flex items-center gap-4">
                            <span className="text-sm">Wait for</span>
                            <Input
                              type="number"
                              min={1}
                              max={30}
                              value={step.waitDays || 1}
                              onChange={(e) => updateStep(step.id, { waitDays: parseInt(e.target.value) || 1 })}
                              className="w-20"
                            />
                            <span className="text-sm">days</span>
                          </div>
                        )}

                        {step.type === "condition" && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium">If lead</span>
                              <Select
                                value={step.condition?.check || "no-reply"}
                                onValueChange={(v) => updateStep(step.id, {
                                  condition: { ...step.condition!, check: v as any }
                                })}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="no-reply">hasn't replied</SelectItem>
                                  <SelectItem value="replied">has replied</SelectItem>
                                  <SelectItem value="clicked">clicked link</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                                <div className="text-xs font-medium text-green-700 mb-2">✓ YES → Then:</div>
                                <Select
                                  value={step.condition?.yesBranch || "continue"}
                                  onValueChange={(v) => updateStep(step.id, {
                                    condition: { ...step.condition!, yesBranch: v as any }
                                  })}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="continue">Continue sequence</SelectItem>
                                    <SelectItem value="stop">Stop sequence</SelectItem>
                                    <SelectItem value="call">Add to call queue</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                                <div className="text-xs font-medium text-red-700 mb-2">✗ NO → Then:</div>
                                <Select
                                  value={step.condition?.noBranch || "stop"}
                                  onValueChange={(v) => updateStep(step.id, {
                                    condition: { ...step.condition!, noBranch: v as any }
                                  })}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="continue">Continue sequence</SelectItem>
                                    <SelectItem value="stop">Stop sequence</SelectItem>
                                    <SelectItem value="call">Add to call queue</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>

                {/* Add Step After */}
                <div className="relative mb-4">
                  {showAddMenu === index ? (
                    <div className="flex items-center gap-2 py-2">
                      <AddStepMenu
                        onAdd={(type) => addStep(type, index)}
                        onClose={() => setShowAddMenu(null)}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddMenu(index)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add step</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* End */}
        {steps.length > 0 && (
          <div className="flex items-center gap-4 ml-0">
            <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center shadow-lg">
              <div className="w-3 h-3 bg-white rounded-full" />
            </div>
            <div>
              <div className="font-semibold">Sequence Complete</div>
              <div className="text-sm text-muted-foreground">Lead exits campaign</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Add Step Menu Component
function AddStepMenu({
  onAdd,
  onClose
}: {
  onAdd: (type: StepType) => void;
  onClose?: () => void;
}) {
  const stepTypes: { type: StepType; label: string; icon: any; color: string }[] = [
    { type: "sms", label: "SMS", icon: MessageSquare, color: "bg-purple-500 hover:bg-purple-600" },
    { type: "email", label: "Email", icon: Mail, color: "bg-blue-500 hover:bg-blue-600" },
    { type: "call", label: "Call", icon: Phone, color: "bg-green-500 hover:bg-green-600" },
    { type: "wait", label: "Wait", icon: Clock, color: "bg-gray-500 hover:bg-gray-600" },
    { type: "condition", label: "If/Then", icon: GitBranch, color: "bg-orange-500 hover:bg-orange-600" },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {stepTypes.map(({ type, label, icon: Icon, color }) => (
        <Button
          key={type}
          size="sm"
          className={cn("gap-2", color, "text-white")}
          onClick={() => onAdd(type)}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Button>
      ))}
      {onClose && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export default SequenceBuilder;
