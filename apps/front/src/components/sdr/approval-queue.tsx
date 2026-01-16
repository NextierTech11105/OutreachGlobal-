"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  MessageSquare,
  User,
  Building2,
} from "lucide-react";
import type { SDRActivity } from "@/hooks/use-sdr-stream";

// Rejection reasons
const REJECTION_REASONS = [
  { id: "inappropriate_tone", label: "Inappropriate Tone" },
  { id: "wrong_information", label: "Wrong Information" },
  { id: "bad_timing", label: "Bad Timing" },
  { id: "needs_human_touch", label: "Needs Human Touch" },
  { id: "compliance_risk", label: "Compliance Risk" },
  { id: "other", label: "Other" },
];

interface ApprovalQueueProps {
  approvals: SDRActivity[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
}

const AGENT_COLORS: Record<string, string> = {
  GIANNA: "text-purple-600 bg-purple-100 dark:bg-purple-900/30",
  CATHY: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
  SABRINA: "text-pink-600 bg-pink-100 dark:bg-pink-900/30",
  LUCI: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
  COPILOT: "text-green-600 bg-green-100 dark:bg-green-900/30",
};

export function ApprovalQueue({
  approvals,
  selectedIds,
  onToggleSelect,
  onApprove,
  onReject,
}: ApprovalQueueProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (approvals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500/50 mb-3" />
        <p className="text-sm font-medium">All caught up!</p>
        <p className="text-xs text-muted-foreground">
          No pending approvals
        </p>
      </div>
    );
  }

  const handleApprove = async (id: string) => {
    setLoadingId(id);
    try {
      await onApprove(id);
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    setLoadingId(id);
    try {
      await onReject(id, reason);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {approvals.map((approval) => {
        const payload = approval.payload as Record<string, unknown> | null;
        const isSelected = selectedIds.includes(approval.id);
        const isLoading = loadingId === approval.id;

        // Calculate SLA status
        const slaDeadline = approval.slaDeadline
          ? new Date(approval.slaDeadline)
          : null;
        const now = new Date();
        const isBreached = slaDeadline && now > slaDeadline;
        const isUrgent =
          slaDeadline &&
          !isBreached &&
          slaDeadline.getTime() - now.getTime() < 5 * 60 * 1000; // 5 min

        return (
          <div
            key={approval.id}
            className={cn(
              "flex items-start gap-3 p-4 rounded-lg border transition-colors",
              isSelected ? "border-primary bg-primary/5" : "border-border",
              isBreached && "border-destructive bg-destructive/5",
            )}
          >
            {/* Checkbox */}
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(approval.id)}
              disabled={isLoading}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  className={cn(
                    "text-xs",
                    AGENT_COLORS[approval.agent] || "bg-gray-100",
                  )}
                >
                  {approval.agent}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {approval.action}
                </Badge>

                {/* SLA indicator */}
                {slaDeadline && (
                  <Badge
                    variant={isBreached ? "destructive" : isUrgent ? "secondary" : "outline"}
                    className="text-xs gap-1"
                  >
                    {isBreached ? (
                      <>
                        <AlertTriangle className="h-3 w-3" />
                        SLA Breached
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(slaDeadline)}
                      </>
                    )}
                  </Badge>
                )}
              </div>

              {/* Suggestion preview */}
              {payload?.suggestion && (
                <div className="flex items-start gap-2 mb-2 p-2 bg-muted rounded">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm">{String(payload.suggestion)}</p>
                </div>
              )}

              {/* Lead info */}
              {(payload?.contactName || payload?.companyName) && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                  {payload.contactName && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {String(payload.contactName)}
                    </span>
                  )}
                  {payload.companyName && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {String(payload.companyName)}
                    </span>
                  )}
                </div>
              )}

              {/* Confidence score */}
              {payload?.confidence && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-muted-foreground">
                    Confidence:
                  </span>
                  <Badge
                    variant={
                      Number(payload.confidence) >= 0.85
                        ? "default"
                        : Number(payload.confidence) >= 0.7
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {Math.round(Number(payload.confidence) * 100)}%
                  </Badge>
                </div>
              )}

              {/* Timestamp */}
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(approval.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => handleApprove(approval.id)}
                disabled={isLoading}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Approve
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="destructive" disabled={isLoading}>
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {REJECTION_REASONS.map((reason) => (
                    <DropdownMenuItem
                      key={reason.id}
                      onClick={() => handleReject(approval.id, reason.id)}
                    >
                      {reason.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      })}
    </div>
  );
}
