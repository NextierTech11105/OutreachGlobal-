"use client";

import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  Mail,
  Phone,
  Clock,
  GitBranch,
  GripVertical,
  Trash2,
  Pencil,
  ArrowRight,
  ArrowDown,
  Zap,
  Bell,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SmsTemplate } from "@/lib/templates/nextier-defaults";

export interface SequenceStepNode {
  id: string;
  type: "sms" | "email" | "call" | "wait" | "condition";
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

interface SequenceNodeProps {
  step: SequenceStepNode;
  isSelected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onWaitChange?: (days: number, hours: number) => void;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
}

const STEP_CONFIG = {
  sms: {
    icon: MessageSquare,
    color: "bg-gradient-to-br from-purple-600 to-purple-800",
    borderColor: "border-purple-500/50",
    bgColor: "bg-zinc-900 border border-purple-500/30",
    label: "SMS",
  },
  email: {
    icon: Mail,
    color: "bg-gradient-to-br from-blue-600 to-blue-800",
    borderColor: "border-blue-500/50",
    bgColor: "bg-zinc-900 border border-blue-500/30",
    label: "Email",
  },
  call: {
    icon: Phone,
    color: "bg-gradient-to-br from-emerald-600 to-emerald-800",
    borderColor: "border-emerald-500/50",
    bgColor: "bg-zinc-900 border border-emerald-500/30",
    label: "Call",
  },
  wait: {
    icon: Clock,
    color: "bg-gradient-to-br from-zinc-600 to-zinc-800",
    borderColor: "border-zinc-500/50",
    bgColor: "bg-zinc-900 border border-zinc-600/30",
    label: "Wait",
  },
  condition: {
    icon: GitBranch,
    color: "bg-gradient-to-br from-orange-600 to-orange-800",
    borderColor: "border-orange-500/50",
    bgColor: "bg-zinc-900 border border-orange-500/30",
    label: "Condition",
  },
};

const WORKER_CONFIG = {
  gianna: {
    name: "GIANNA",
    color: "text-purple-300",
    bgColor: "bg-purple-900/50 border border-purple-500/30",
    icon: Zap,
  },
  cathy: {
    name: "CATHY",
    color: "text-orange-300",
    bgColor: "bg-orange-900/50 border border-orange-500/30",
    icon: Bell,
  },
  sabrina: {
    name: "SABRINA",
    color: "text-emerald-300",
    bgColor: "bg-emerald-900/50 border border-emerald-500/30",
    icon: Calendar,
  },
};

const CONDITION_LABELS = {
  "no-response": "No Response",
  replied: "Lead Replied",
  "email-opened": "Email Opened",
  "link-clicked": "Link Clicked",
};

const ACTION_LABELS = {
  continue: "Continue Sequence",
  escalate: "Escalate to Worker",
  archive: "Archive Lead",
};

export function SequenceNode({
  step,
  isSelected,
  onClick,
  onDelete,
  onEdit,
  onWaitChange,
  dragHandleProps,
}: SequenceNodeProps) {
  const config = STEP_CONFIG[step.type];
  const Icon = config.icon;

  // Render content based on step type
  const renderContent = () => {
    switch (step.type) {
      case "sms":
        return (
          <div className="space-y-1">
            <div className="font-medium text-sm">
              {step.template?.name || "Select Template"}
            </div>
            {step.template && (
              <div className="text-xs text-muted-foreground line-clamp-2">
                {step.template.content}
              </div>
            )}
            {step.template && (
              <div className="flex items-center gap-2 pt-1">
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    WORKER_CONFIG[step.template.worker].bgColor,
                    WORKER_CONFIG[step.template.worker].color,
                  )}
                >
                  {WORKER_CONFIG[step.template.worker].name}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {step.template.characterCount} chars
                </span>
              </div>
            )}
          </div>
        );

      case "email":
        return (
          <div className="space-y-1">
            <div className="font-medium text-sm">
              {step.emailSubject || "Configure Email"}
            </div>
            {step.emailBody && (
              <div className="text-xs text-muted-foreground line-clamp-2">
                {step.emailBody}
              </div>
            )}
          </div>
        );

      case "call":
        return (
          <div className="space-y-1">
            <div className="font-medium text-sm">Schedule Call Task</div>
            {step.callScript && (
              <div className="text-xs text-muted-foreground line-clamp-2">
                Script: {step.callScript}
              </div>
            )}
          </div>
        );

      case "wait":
        return (
          <div className="flex items-center gap-3">
            <div className="font-medium text-sm">Wait</div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={30}
                value={step.waitDays || 0}
                onChange={(e) =>
                  onWaitChange?.(
                    parseInt(e.target.value) || 0,
                    step.waitHours || 0,
                  )
                }
                className="w-16 h-7 text-sm"
              />
              <span className="text-sm text-muted-foreground">days</span>
              <Input
                type="number"
                min={0}
                max={23}
                value={step.waitHours || 0}
                onChange={(e) =>
                  onWaitChange?.(
                    step.waitDays || 0,
                    parseInt(e.target.value) || 0,
                  )
                }
                className="w-16 h-7 text-sm"
              />
              <span className="text-sm text-muted-foreground">hours</span>
            </div>
          </div>
        );

      case "condition":
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-orange-100 text-orange-700"
              >
                IF
              </Badge>
              <span className="font-medium text-sm">
                {step.condition
                  ? CONDITION_LABELS[step.condition.type]
                  : "Configure"}
              </span>
              {step.condition?.threshold && (
                <span className="text-xs text-muted-foreground">
                  after {step.condition.threshold}h
                </span>
              )}
            </div>

            {step.condition && (
              <div className="grid grid-cols-2 gap-2 pl-4">
                {/* THEN branch */}
                <div className="flex items-center gap-2 text-xs">
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200"
                  >
                    THEN
                  </Badge>
                  {step.condition.thenAction === "escalate" &&
                  step.condition.escalateTo ? (
                    <div className="flex items-center gap-1">
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge
                        className={cn(
                          "text-xs",
                          WORKER_CONFIG[step.condition.escalateTo].bgColor,
                          WORKER_CONFIG[step.condition.escalateTo].color,
                        )}
                      >
                        {WORKER_CONFIG[step.condition.escalateTo].name}
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      {ACTION_LABELS[step.condition.thenAction]}
                    </span>
                  )}
                </div>

                {/* ELSE branch */}
                <div className="flex items-center gap-2 text-xs">
                  <Badge
                    variant="outline"
                    className="bg-red-50 text-red-700 border-red-200"
                  >
                    ELSE
                  </Badge>
                  <span className="text-muted-foreground">Continue</span>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card
      className={cn(
        "relative transition-all cursor-pointer hover:shadow-md",
        isSelected && "ring-2 ring-primary shadow-md",
        config.bgColor,
      )}
      onClick={onClick}
    >
      <div className="flex items-start p-3 gap-3">
        {/* Drag Handle */}
        <div
          {...dragHandleProps}
          className="flex items-center justify-center cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Icon */}
        <div className={cn("p-2 rounded-lg shrink-0", config.color)}>
          <Icon className="h-5 w-5 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">{renderContent()}</div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {step.type !== "wait" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Connector indicator */}
      <div className="absolute -bottom-3 left-7 flex items-center justify-center">
        <div className="w-0.5 h-3 bg-border" />
        <ChevronRight className="absolute h-3 w-3 text-muted-foreground rotate-90" />
      </div>
    </Card>
  );
}

export default SequenceNode;
