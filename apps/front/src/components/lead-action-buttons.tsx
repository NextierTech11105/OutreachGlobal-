"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pause,
  XCircle,
  RefreshCw,
  CalendarClock,
  Play,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";

type LeadAction = "pause" | "suppress" | "rethink" | "revisit" | "resume";

interface LeadActionButtonsProps {
  leadIds: string[];
  onActionComplete?: (action: LeadAction, count: number) => void;
  variant?: "buttons" | "dropdown" | "compact";
  disabled?: boolean;
}

const PAUSE_REASONS = [
  { value: "timing", label: "Bad timing" },
  { value: "busy", label: "Too busy" },
  { value: "vacation", label: "On vacation" },
  { value: "other", label: "Other" },
];

const SUPPRESS_REASONS = [
  { value: "dnc", label: "Do not contact" },
  { value: "wrong_number", label: "Wrong number" },
  { value: "deceased", label: "Deceased" },
  { value: "requested", label: "Requested removal" },
  { value: "duplicate", label: "Duplicate record" },
];

const RETHINK_REASONS = [
  { value: "strategy_change", label: "Strategy change needed" },
  { value: "new_info", label: "New information" },
  { value: "escalate", label: "Needs escalation" },
  { value: "review", label: "General review" },
];

const REVISIT_REASONS = [
  { value: "callback", label: "Callback requested" },
  { value: "follow_up", label: "Follow-up needed" },
  { value: "nurture", label: "Nurture sequence" },
  { value: "seasonal", label: "Seasonal timing" },
];

export function LeadActionButtons({
  leadIds,
  onActionComplete,
  variant = "buttons",
  disabled = false,
}: LeadActionButtonsProps) {
  const [loading, setLoading] = useState<LeadAction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<LeadAction | null>(null);
  const [reason, setReason] = useState("");
  const [revisitDate, setRevisitDate] = useState("");

  const executeAction = async (action: LeadAction, actionReason?: string, actionRevisitDate?: string) => {
    if (leadIds.length === 0) {
      toast.error("No leads selected");
      return;
    }

    setLoading(action);

    try {
      const response = await fetch("/api/leads/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds,
          action,
          reason: actionReason,
          revisitDate: actionRevisitDate,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Action failed");
      }

      const data = await response.json();

      const actionLabels: Record<LeadAction, string> = {
        pause: "paused",
        suppress: "suppressed",
        rethink: "flagged for review",
        revisit: "scheduled for revisit",
        resume: "resumed",
      };

      toast.success(`${data.count} lead${data.count > 1 ? "s" : ""} ${actionLabels[action]}`);
      onActionComplete?.(action, data.count);
      setDialogOpen(false);
      setReason("");
      setRevisitDate("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setLoading(null);
      setCurrentAction(null);
    }
  };

  const openDialog = (action: LeadAction) => {
    setCurrentAction(action);
    setReason("");
    setRevisitDate("");
    setDialogOpen(true);
  };

  const handleDialogConfirm = () => {
    if (currentAction === "revisit" && !revisitDate) {
      toast.error("Please select a revisit date");
      return;
    }
    executeAction(currentAction!, reason, revisitDate);
  };

  const getReasonOptions = () => {
    switch (currentAction) {
      case "pause": return PAUSE_REASONS;
      case "suppress": return SUPPRESS_REASONS;
      case "rethink": return RETHINK_REASONS;
      case "revisit": return REVISIT_REASONS;
      default: return [];
    }
  };

  const getDialogTitle = () => {
    const count = leadIds.length;
    switch (currentAction) {
      case "pause": return `Pause ${count} lead${count > 1 ? "s" : ""}`;
      case "suppress": return `Suppress ${count} lead${count > 1 ? "s" : ""}`;
      case "rethink": return `Flag ${count} lead${count > 1 ? "s" : ""} for review`;
      case "revisit": return `Schedule revisit for ${count} lead${count > 1 ? "s" : ""}`;
      default: return "Confirm Action";
    }
  };

  const getDialogDescription = () => {
    switch (currentAction) {
      case "pause": return "Paused leads will be skipped in campaign queues until resumed.";
      case "suppress": return "Suppressed leads will be permanently removed from all campaigns (DNC).";
      case "rethink": return "Flagged leads will appear in your review queue.";
      case "revisit": return "Select when you want to revisit these leads.";
      default: return "";
    }
  };

  // Compact dropdown variant
  if (variant === "dropdown" || variant === "compact") {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size={variant === "compact" ? "icon" : "sm"}
              disabled={disabled || leadIds.length === 0}
              className={variant === "compact" ? "h-7 w-7" : ""}
            >
              <MoreVertical className="h-4 w-4" />
              {variant !== "compact" && <span className="ml-1">Actions</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openDialog("pause")}>
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openDialog("rethink")}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Rethink
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openDialog("revisit")}>
              <CalendarClock className="h-4 w-4 mr-2" />
              Revisit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => executeAction("resume")}>
              <Play className="h-4 w-4 mr-2" />
              Resume
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => openDialog("suppress")}
              className="text-red-600"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Suppress (DNC)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ActionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={getDialogTitle()}
          description={getDialogDescription()}
          reasonOptions={getReasonOptions()}
          reason={reason}
          onReasonChange={setReason}
          showRevisitDate={currentAction === "revisit"}
          revisitDate={revisitDate}
          onRevisitDateChange={setRevisitDate}
          onConfirm={handleDialogConfirm}
          loading={loading !== null}
          action={currentAction}
        />
      </>
    );
  }

  // Full buttons variant
  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => openDialog("pause")}
          disabled={disabled || loading !== null || leadIds.length === 0}
          className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
        >
          <Pause className="h-3.5 w-3.5 mr-1" />
          Pause
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => openDialog("rethink")}
          disabled={disabled || loading !== null || leadIds.length === 0}
          className="text-blue-600 border-blue-300 hover:bg-blue-50"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Rethink
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => openDialog("revisit")}
          disabled={disabled || loading !== null || leadIds.length === 0}
          className="text-purple-600 border-purple-300 hover:bg-purple-50"
        >
          <CalendarClock className="h-3.5 w-3.5 mr-1" />
          Revisit
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => openDialog("suppress")}
          disabled={disabled || loading !== null || leadIds.length === 0}
          className="text-red-600 border-red-300 hover:bg-red-50"
        >
          <XCircle className="h-3.5 w-3.5 mr-1" />
          Suppress
        </Button>
      </div>

      <ActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={getDialogTitle()}
        description={getDialogDescription()}
        reasonOptions={getReasonOptions()}
        reason={reason}
        onReasonChange={setReason}
        showRevisitDate={currentAction === "revisit"}
        revisitDate={revisitDate}
        onRevisitDateChange={setRevisitDate}
        onConfirm={handleDialogConfirm}
        loading={loading !== null}
        action={currentAction}
      />
    </>
  );
}

// Separate dialog component for cleaner code
interface ActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  reasonOptions: { value: string; label: string }[];
  reason: string;
  onReasonChange: (value: string) => void;
  showRevisitDate: boolean;
  revisitDate: string;
  onRevisitDateChange: (value: string) => void;
  onConfirm: () => void;
  loading: boolean;
  action: LeadAction | null;
}

function ActionDialog({
  open,
  onOpenChange,
  title,
  description,
  reasonOptions,
  reason,
  onReasonChange,
  showRevisitDate,
  revisitDate,
  onRevisitDateChange,
  onConfirm,
  loading,
  action,
}: ActionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason</Label>
            <Select value={reason} onValueChange={onReasonChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {reasonOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showRevisitDate && (
            <div className="grid gap-2">
              <Label htmlFor="revisitDate">Revisit Date</Label>
              <Input
                id="revisitDate"
                type="date"
                value={revisitDate}
                onChange={(e) => onRevisitDateChange(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={action === "suppress" ? "bg-red-600 hover:bg-red-700" : ""}
          >
            {loading ? "Processing..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
