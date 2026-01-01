"use client";

import { useState, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare,
  Mail,
  Phone,
  Clock,
  GitBranch,
  Zap,
  Plus,
  Save,
  Play,
  Trash2,
  GripVertical,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Settings,
  Library,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SequenceNode, type SequenceStepNode } from "./sequence-node";
import { ConditionBuilder } from "./condition-builder";
import { TemplateLibrary } from "./template-library";
import { SequenceCalendar } from "./sequence-calendar";
import { ComplianceChecker } from "./compliance-checker";
import {
  type SmsTemplate,
  type SequenceStep,
  type SequencePreset,
  SEQUENCE_EXAMPLE_PRESETS,
  ALL_EXAMPLE_TEMPLATES,
  WORKER_META,
} from "@/lib/templates/nextier-defaults";

// Step types available in the designer
const STEP_TYPES = [
  { type: "sms", label: "SMS", icon: MessageSquare, color: "bg-purple-500" },
  { type: "email", label: "Email", icon: Mail, color: "bg-blue-500" },
  { type: "call", label: "Call", icon: Phone, color: "bg-green-500" },
  { type: "wait", label: "Wait", icon: Clock, color: "bg-gray-500" },
  {
    type: "condition",
    label: "If/Then",
    icon: GitBranch,
    color: "bg-orange-500",
  },
] as const;

type StepType = (typeof STEP_TYPES)[number]["type"];

interface DesignerStep {
  id: string;
  type: StepType;
  templateId?: string;
  template?: SmsTemplate;
  waitDays?: number;
  waitHours?: number;
  condition?: {
    type: "no-response" | "replied" | "email-opened" | "link-clicked";
    threshold?: number;
    thenAction: "continue" | "escalate" | "archive";
    escalateTo?: "gianna" | "cathy" | "sabrina";
  };
  emailSubject?: string;
  emailBody?: string;
  callScript?: string;
}

interface SequenceDesignerProps {
  sequenceId?: string;
  onSave?: (steps: DesignerStep[]) => void;
  initialSteps?: DesignerStep[];
  presetId?: string;
}

export function SequenceDesigner({
  sequenceId,
  onSave,
  initialSteps,
  presetId,
}: SequenceDesignerProps) {
  const [steps, setSteps] = useState<DesignerStep[]>(initialSteps || []);
  const [selectedStep, setSelectedStep] = useState<DesignerStep | null>(null);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [showConditionBuilder, setShowConditionBuilder] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "designer" | "calendar" | "templates"
  >("designer");
  const [sequenceName, setSequenceName] = useState("New Sequence");
  const [isDirty, setIsDirty] = useState(false);

  // Generate unique ID
  const generateId = () =>
    `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add a new step
  const addStep = useCallback((type: StepType) => {
    const newStep: DesignerStep = {
      id: generateId(),
      type,
      waitDays: type === "wait" ? 1 : undefined,
    };

    if (type === "condition") {
      newStep.condition = {
        type: "no-response",
        threshold: 48,
        thenAction: "escalate",
        escalateTo: "cathy",
      };
    }

    setSteps((prev) => [...prev, newStep]);
    setSelectedStep(newStep);
    setIsDirty(true);

    if (type === "sms") {
      setShowTemplateLibrary(true);
    } else if (type === "condition") {
      setShowConditionBuilder(true);
    }
  }, []);

  // Remove a step
  const removeStep = useCallback((stepId: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
    setSelectedStep(null);
    setIsDirty(true);
  }, []);

  // Update a step
  const updateStep = useCallback(
    (stepId: string, updates: Partial<DesignerStep>) => {
      setSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, ...updates } : s)),
      );
      setIsDirty(true);
    },
    [],
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;

      const items = Array.from(steps);
      const [reordered] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reordered);

      setSteps(items);
      setIsDirty(true);
    },
    [steps],
  );

  // Load a preset
  const loadPreset = useCallback((preset: SequencePreset) => {
    const designerSteps: DesignerStep[] = preset.steps.map((step) => ({
      id: generateId(),
      type: step.type as StepType,
      templateId: step.templateId,
      template: step.templateId
        ? ALL_EXAMPLE_TEMPLATES.find((t) => t.id === step.templateId)
        : undefined,
      waitDays: step.waitDays,
      waitHours: step.waitHours,
      condition: step.condition,
    }));

    setSteps(designerSteps);
    setSequenceName(preset.name);
    setIsDirty(false);
  }, []);

  // Handle template selection
  const handleTemplateSelect = useCallback(
    (template: SmsTemplate) => {
      if (selectedStep) {
        updateStep(selectedStep.id, {
          templateId: template.id,
          template,
        });
      }
      setShowTemplateLibrary(false);
    },
    [selectedStep, updateStep],
  );

  // Handle condition save
  const handleConditionSave = useCallback(
    (condition: DesignerStep["condition"]) => {
      if (selectedStep) {
        updateStep(selectedStep.id, { condition });
      }
      setShowConditionBuilder(false);
    },
    [selectedStep, updateStep],
  );

  // Calculate sequence stats
  const sequenceStats = {
    totalSteps: steps.length,
    smsCount: steps.filter((s) => s.type === "sms").length,
    emailCount: steps.filter((s) => s.type === "email").length,
    callCount: steps.filter((s) => s.type === "call").length,
    conditionCount: steps.filter((s) => s.type === "condition").length,
    totalDays: steps.reduce((acc, s) => acc + (s.waitDays || 0), 0),
    escalationPoints: steps.filter(
      (s) => s.condition?.thenAction === "escalate",
    ).length,
  };

  // Save sequence
  const handleSave = () => {
    onSave?.(steps);
    setIsDirty(false);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Left Panel: Step Palette + Presets */}
      <div className="w-64 border-r bg-muted/30 p-4 flex flex-col gap-4">
        {/* Step Palette */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Step
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 pt-0">
            {STEP_TYPES.map((stepType) => (
              <Button
                key={stepType.type}
                variant="outline"
                size="sm"
                className="flex flex-col gap-1 h-auto py-3"
                onClick={() => addStep(stepType.type)}
              >
                <div className={cn("p-1.5 rounded", stepType.color)}>
                  <stepType.icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs">{stepType.label}</span>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Sequence Presets */}
        <Card className="flex-1">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Presets
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {SEQUENCE_EXAMPLE_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-2"
                    onClick={() => loadPreset(preset)}
                  >
                    <div>
                      <div className="font-medium text-sm">{preset.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {preset.steps.length} steps · {preset.totalDays} days
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Sequence Stats */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Steps</span>
              <span className="font-medium">{sequenceStats.totalSteps}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Days</span>
              <span className="font-medium">{sequenceStats.totalDays}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Escalation Points</span>
              <span className="font-medium">
                {sequenceStats.escalationPoints}
              </span>
            </div>
            <div className="flex gap-2 pt-2">
              {sequenceStats.smsCount > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-purple-100 text-purple-700"
                >
                  {sequenceStats.smsCount} SMS
                </Badge>
              )}
              {sequenceStats.emailCount > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-700"
                >
                  {sequenceStats.emailCount} Email
                </Badge>
              )}
              {sequenceStats.callCount > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-700"
                >
                  {sequenceStats.callCount} Call
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Center Panel: Sequence Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-3 flex items-center justify-between bg-background">
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={sequenceName}
              onChange={(e) => {
                setSequenceName(e.target.value);
                setIsDirty(true);
              }}
              className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0"
            />
            {isDirty && (
              <Badge
                variant="outline"
                className="text-orange-600 border-orange-300"
              >
                Unsaved
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Play className="h-4 w-4 mr-2" />
              Test
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!isDirty}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="flex-1 flex flex-col"
        >
          <div className="border-b px-6">
            <TabsList className="bg-transparent h-12">
              <TabsTrigger value="designer" className="gap-2">
                <GitBranch className="h-4 w-4" />
                Designer
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <Calendar className="h-4 w-4" />
                Calendar View
              </TabsTrigger>
              <TabsTrigger value="templates" className="gap-2">
                <Library className="h-4 w-4" />
                Templates
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="designer" className="flex-1 m-0 overflow-hidden">
            <div className="flex h-full">
              {/* Sequence Flow */}
              <ScrollArea className="flex-1 p-6">
                {steps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <GitBranch className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">No steps yet</p>
                    <p className="text-sm">
                      Add steps from the left panel or load a preset
                    </p>
                  </div>
                ) : (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="sequence">
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="space-y-2"
                        >
                          {/* Trigger Node */}
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                              <Zap className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <div className="font-medium">
                                Lead Enters Campaign
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Trigger
                              </div>
                            </div>
                          </div>

                          {steps.map((step, index) => (
                            <Draggable
                              key={step.id}
                              draggableId={step.id}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={cn(
                                    "relative",
                                    snapshot.isDragging && "opacity-50",
                                  )}
                                >
                                  {/* Connector Line */}
                                  {index > 0 && (
                                    <div className="absolute -top-2 left-5 w-0.5 h-4 bg-border" />
                                  )}

                                  <SequenceNode
                                    step={step}
                                    isSelected={selectedStep?.id === step.id}
                                    onClick={() => setSelectedStep(step)}
                                    onDelete={() => removeStep(step.id)}
                                    onEdit={() => {
                                      setSelectedStep(step);
                                      if (step.type === "sms") {
                                        setShowTemplateLibrary(true);
                                      } else if (step.type === "condition") {
                                        setShowConditionBuilder(true);
                                      }
                                    }}
                                    dragHandleProps={provided.dragHandleProps}
                                  />

                                  {/* Arrow to next */}
                                  {index < steps.length - 1 && (
                                    <div className="absolute -bottom-2 left-5 w-0.5 h-4 bg-border" />
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}
              </ScrollArea>

              {/* Compliance Sidebar */}
              <div className="w-72 border-l bg-muted/30">
                <ComplianceChecker steps={steps} />
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="calendar"
            className="flex-1 m-0 p-6 overflow-auto"
          >
            <SequenceCalendar steps={steps} />
          </TabsContent>

          <TabsContent
            value="templates"
            className="flex-1 m-0 p-6 overflow-auto"
          >
            <TemplateLibrary
              onSelect={handleTemplateSelect}
              selectedTemplateId={selectedStep?.templateId}
              inline
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Template Library Modal */}
      {showTemplateLibrary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-xl w-[800px] max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Select SMS Template</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplateLibrary(false)}
              >
                ✕
              </Button>
            </div>
            <TemplateLibrary
              onSelect={handleTemplateSelect}
              selectedTemplateId={selectedStep?.templateId}
            />
          </div>
        </div>
      )}

      {/* Condition Builder Modal */}
      {showConditionBuilder && selectedStep && (
        <ConditionBuilder
          condition={selectedStep.condition}
          onSave={handleConditionSave}
          onClose={() => setShowConditionBuilder(false)}
        />
      )}
    </div>
  );
}

export default SequenceDesigner;
