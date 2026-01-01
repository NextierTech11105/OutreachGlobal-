"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  GitBranch,
  ArrowRight,
  Clock,
  MessageSquare,
  Mail,
  MousePointer,
  Zap,
  Bell,
  Calendar,
  Archive,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConditionConfig {
  type: "no-response" | "replied" | "email-opened" | "link-clicked";
  threshold?: number; // hours
  thenAction: "continue" | "escalate" | "archive";
  escalateTo?: "gianna" | "cathy" | "sabrina";
}

interface ConditionBuilderProps {
  condition?: ConditionConfig;
  onSave: (condition: ConditionConfig) => void;
  onClose: () => void;
}

const CONDITION_TYPES = [
  {
    value: "no-response",
    label: "No Response",
    icon: Clock,
    description: "Lead hasn't replied within time window",
    color: "text-orange-500",
    bgColor: "bg-orange-50",
  },
  {
    value: "replied",
    label: "Lead Replied",
    icon: MessageSquare,
    description: "Lead sent any response",
    color: "text-green-500",
    bgColor: "bg-green-50",
  },
  {
    value: "email-opened",
    label: "Email Opened",
    icon: Mail,
    description: "Lead opened an email",
    color: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  {
    value: "link-clicked",
    label: "Link Clicked",
    icon: MousePointer,
    description: "Lead clicked a tracking link",
    color: "text-purple-500",
    bgColor: "bg-purple-50",
  },
] as const;

const ACTION_TYPES = [
  {
    value: "continue",
    label: "Continue Sequence",
    icon: ChevronRight,
    description: "Move to next step in sequence",
    color: "text-gray-600",
  },
  {
    value: "escalate",
    label: "Escalate to Worker",
    icon: Zap,
    description: "Hand off to AI worker for specialized follow-up",
    color: "text-yellow-600",
  },
  {
    value: "archive",
    label: "Archive Lead",
    icon: Archive,
    description: "Mark as cold and stop sequence",
    color: "text-red-600",
  },
] as const;

const WORKERS = [
  {
    value: "gianna",
    name: "GIANNA",
    role: "Opener",
    icon: Zap,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    description: "Initial outreach specialist",
  },
  {
    value: "cathy",
    name: "CATHY",
    role: "Nudger",
    icon: Bell,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    description: "Friendly follow-up expert",
  },
  {
    value: "sabrina",
    name: "SABRINA",
    role: "Closer",
    icon: Calendar,
    color: "text-green-600",
    bgColor: "bg-green-100",
    description: "Meeting booker",
  },
] as const;

const TIME_PRESETS = [
  { value: 24, label: "24 hours" },
  { value: 48, label: "48 hours" },
  { value: 72, label: "3 days" },
  { value: 120, label: "5 days" },
  { value: 168, label: "7 days" },
];

export function ConditionBuilder({
  condition,
  onSave,
  onClose,
}: ConditionBuilderProps) {
  const [config, setConfig] = useState<ConditionConfig>(
    condition || {
      type: "no-response",
      threshold: 48,
      thenAction: "escalate",
      escalateTo: "cathy",
    },
  );

  const selectedCondition = CONDITION_TYPES.find(
    (c) => c.value === config.type,
  );
  const selectedAction = ACTION_TYPES.find(
    (a) => a.value === config.thenAction,
  );
  const selectedWorker = config.escalateTo
    ? WORKERS.find((w) => w.value === config.escalateTo)
    : null;

  const handleSave = () => {
    onSave(config);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-orange-500" />
            Configure Condition
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* IF Condition */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-orange-500 text-white">IF</Badge>
              <span className="text-sm text-muted-foreground">
                When this happens...
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {CONDITION_TYPES.map((condType) => {
                const Icon = condType.icon;
                const isSelected = config.type === condType.value;
                return (
                  <button
                    key={condType.value}
                    type="button"
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-all hover:shadow-md",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50",
                    )}
                    onClick={() =>
                      setConfig((prev) => ({ ...prev, type: condType.value }))
                    }
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg", condType.bgColor)}>
                        <Icon className={cn("h-4 w-4", condType.color)} />
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {condType.label}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {condType.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Threshold (for applicable conditions) */}
          {(config.type === "no-response" ||
            config.type === "email-opened") && (
            <div className="space-y-3">
              <Label className="text-sm">Time Window</Label>
              <div className="flex flex-wrap gap-2">
                {TIME_PRESETS.map((preset) => (
                  <Button
                    key={preset.value}
                    variant={
                      config.threshold === preset.value ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        threshold: preset.value,
                      }))
                    }
                  >
                    {preset.label}
                  </Button>
                ))}
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={720}
                    value={config.threshold || ""}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        threshold: parseInt(e.target.value) || undefined,
                      }))
                    }
                    className="w-20 h-9"
                    placeholder="Custom"
                  />
                  <span className="text-sm text-muted-foreground">hours</span>
                </div>
              </div>
            </div>
          )}

          {/* THEN Action */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500 text-white">THEN</Badge>
              <span className="text-sm text-muted-foreground">Do this...</span>
            </div>

            <div className="space-y-2">
              {ACTION_TYPES.map((action) => {
                const Icon = action.icon;
                const isSelected = config.thenAction === action.value;
                return (
                  <button
                    key={action.value}
                    type="button"
                    className={cn(
                      "w-full p-3 rounded-lg border-2 text-left transition-all hover:shadow-sm",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50",
                    )}
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        thenAction: action.value,
                      }))
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn("h-5 w-5", action.color)} />
                      <div>
                        <div className="font-medium text-sm">
                          {action.label}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {action.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Worker Selection (if escalate) */}
          {config.thenAction === "escalate" && (
            <div className="space-y-3">
              <Label className="text-sm">Escalate To</Label>
              <div className="grid grid-cols-3 gap-2">
                {WORKERS.map((worker) => {
                  const Icon = worker.icon;
                  const isSelected = config.escalateTo === worker.value;
                  return (
                    <button
                      key={worker.value}
                      type="button"
                      className={cn(
                        "p-3 rounded-lg border-2 text-center transition-all hover:shadow-md",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50",
                      )}
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          escalateTo:
                            worker.value as ConditionConfig["escalateTo"],
                        }))
                      }
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className={cn("p-2 rounded-full", worker.bgColor)}>
                          <Icon className={cn("h-5 w-5", worker.color)} />
                        </div>
                        <div>
                          <div
                            className={cn("font-bold text-sm", worker.color)}
                          >
                            {worker.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {worker.role}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Preview */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="text-sm">
                <span className="font-medium">Summary: </span>
                <span className="text-muted-foreground">
                  IF{" "}
                  <span className="font-medium text-foreground">
                    {selectedCondition?.label.toLowerCase()}
                  </span>
                  {config.threshold && (
                    <>
                      {" "}
                      after{" "}
                      <span className="font-medium text-foreground">
                        {config.threshold} hours
                      </span>
                    </>
                  )}
                  , THEN{" "}
                  <span className="font-medium text-foreground">
                    {selectedAction?.label.toLowerCase()}
                  </span>
                  {selectedWorker && (
                    <>
                      {" "}
                      to{" "}
                      <span className={cn("font-bold", selectedWorker.color)}>
                        {selectedWorker.name}
                      </span>
                    </>
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <GitBranch className="h-4 w-4 mr-2" />
            Save Condition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConditionBuilder;
