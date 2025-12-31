"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Mail,
  Zap,
  CalendarIcon,
  Users,
  Send,
  Loader2,
  Clock,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ============ TYPES ============
export type OutreachType = "sms" | "call" | "email";
export type OutreachMode = "instant" | "scheduled" | "queue";

interface Lead {
  id: string;
  name?: string;
  firstName?: string;
  phone?: string;
  email?: string;
  company?: string;
}

interface OutreachDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: OutreachType;
  leads: Lead[];
  onComplete?: (result: OutreachResult) => void;
}

interface OutreachResult {
  type: OutreachType;
  mode: OutreachMode;
  leadCount: number;
  scheduledAt?: Date;
  message?: string;
  success: boolean;
}

// ============ COMPONENT ============
export function OutreachDialog({
  open,
  onOpenChange,
  type,
  leads,
  onComplete,
}: OutreachDialogProps) {
  const [mode, setMode] = useState<OutreachMode>("instant");
  const [message, setMessage] = useState("");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [queuePriority, setQueuePriority] = useState<"high" | "medium" | "low">("medium");

  // Filter leads that have the required contact info
  const validLeads = leads.filter((lead) => {
    if (type === "sms" || type === "call") return !!lead.phone;
    if (type === "email") return !!lead.email;
    return false;
  });

  const invalidLeads = leads.length - validLeads.length;

  // Get icon and labels based on type
  const config = {
    sms: {
      icon: MessageSquare,
      label: "SMS",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      placeholder: "Type your message here...",
    },
    call: {
      icon: Phone,
      label: "Call",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      placeholder: "Call script or notes (optional)...",
    },
    email: {
      icon: Mail,
      label: "Email",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      placeholder: "Email body...",
    },
  }[type];

  const Icon = config.icon;

  // Handle submission
  const handleSubmit = async () => {
    if (validLeads.length === 0) {
      toast.error(`No leads with valid ${type === "email" ? "email" : "phone"} addresses`);
      return;
    }

    if (mode === "scheduled" && !scheduledDate) {
      toast.error("Please select a date for scheduled outreach");
      return;
    }

    if ((type === "sms" || type === "email") && !message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsSubmitting(true);

    try {
      // Build scheduled datetime
      let scheduledAt: Date | undefined;
      if (mode === "scheduled" && scheduledDate) {
        const [hours, minutes] = scheduledTime.split(":").map(Number);
        scheduledAt = new Date(scheduledDate);
        scheduledAt.setHours(hours, minutes, 0, 0);
      }

      // API call based on mode and type
      if (mode === "instant") {
        if (type === "sms") {
          // Send SMS immediately
          const response = await fetch("/api/signalhouse/bulk-send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              leads: validLeads.map((l) => ({
                phone: l.phone,
                leadId: l.id,
                name: l.firstName || l.name,
              })),
              message,
            }),
          });

          if (!response.ok) throw new Error("Failed to send SMS");

          const result = await response.json();
          toast.success(`Sent ${result.sent || validLeads.length} SMS messages`);
        } else if (type === "call") {
          // Open power dialer
          toast.success(`Opening power dialer for ${validLeads.length} leads`);
          // TODO: Integrate with power dialer
        } else if (type === "email") {
          // Send email immediately
          const response = await fetch("/api/email/bulk-send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              leads: validLeads.map((l) => ({
                email: l.email,
                leadId: l.id,
                name: l.firstName || l.name,
              })),
              message,
            }),
          });

          if (!response.ok) throw new Error("Failed to send emails");
          toast.success(`Sent ${validLeads.length} emails`);
        }
      } else if (mode === "scheduled") {
        // Schedule for later
        const response = await fetch("/api/outreach/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            leads: validLeads.map((l) => l.id),
            message,
            scheduledAt: scheduledAt?.toISOString(),
          }),
        });

        if (!response.ok) throw new Error("Failed to schedule outreach");
        toast.success(`Scheduled ${validLeads.length} ${type} for ${format(scheduledAt!, "PPP 'at' p")}`);
      } else if (mode === "queue") {
        // Add to human review queue
        const response = await fetch("/api/outreach/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            leads: validLeads.map((l) => l.id),
            message,
            priority: queuePriority,
          }),
        });

        if (!response.ok) throw new Error("Failed to queue outreach");
        toast.success(`Added ${validLeads.length} leads to ${queuePriority} priority queue`);
      }

      onComplete?.({
        type,
        mode,
        leadCount: validLeads.length,
        scheduledAt,
        message,
        success: true,
      });

      onOpenChange(false);
      setMessage("");
      setScheduledDate(undefined);
    } catch (error) {
      console.error("Outreach error:", error);
      toast.error(`Failed to ${mode === "instant" ? "send" : mode} ${type}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn("p-2 rounded-lg", config.bgColor)}>
              <Icon className={cn("h-5 w-5", config.color)} />
            </div>
            Send {config.label}
          </DialogTitle>
          <DialogDescription>
            {validLeads.length} lead{validLeads.length !== 1 ? "s" : ""} selected
            {invalidLeads > 0 && (
              <span className="text-amber-500 ml-2">
                ({invalidLeads} without {type === "email" ? "email" : "phone"})
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Mode Selection */}
          <div className="space-y-2">
            <Label>Delivery Mode</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={mode === "instant" ? "default" : "outline"}
                className={cn(
                  "flex flex-col h-auto py-3",
                  mode === "instant" && "bg-blue-600 hover:bg-blue-700"
                )}
                onClick={() => setMode("instant")}
              >
                <Zap className="h-5 w-5 mb-1" />
                <span className="text-xs">Instant</span>
                <span className="text-[10px] text-muted-foreground">Send now</span>
              </Button>
              <Button
                variant={mode === "scheduled" ? "default" : "outline"}
                className={cn(
                  "flex flex-col h-auto py-3",
                  mode === "scheduled" && "bg-amber-600 hover:bg-amber-700"
                )}
                onClick={() => setMode("scheduled")}
              >
                <CalendarIcon className="h-5 w-5 mb-1" />
                <span className="text-xs">Scheduled</span>
                <span className="text-[10px] text-muted-foreground">Pick date/time</span>
              </Button>
              <Button
                variant={mode === "queue" ? "default" : "outline"}
                className={cn(
                  "flex flex-col h-auto py-3",
                  mode === "queue" && "bg-purple-600 hover:bg-purple-700"
                )}
                onClick={() => setMode("queue")}
              >
                <Users className="h-5 w-5 mb-1" />
                <span className="text-xs">Queue</span>
                <span className="text-[10px] text-muted-foreground">Human review</span>
              </Button>
            </div>
          </div>

          {/* Scheduled Date/Time */}
          {mode === "scheduled" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !scheduledDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledDate}
                      onSelect={setScheduledDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Select value={scheduledTime} onValueChange={setScheduledTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, "0");
                      return (
                        <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                          {format(new Date().setHours(i, 0), "h:mm a")}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Queue Priority */}
          {mode === "queue" && (
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={queuePriority} onValueChange={(v) => setQueuePriority(v as typeof queuePriority)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="h-2 w-2 p-0 rounded-full" />
                      High - Review first
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <Badge className="h-2 w-2 p-0 rounded-full bg-amber-500" />
                      Medium - Standard
                    </div>
                  </SelectItem>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <Badge className="h-2 w-2 p-0 rounded-full bg-zinc-500" />
                      Low - When available
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Message Input (for SMS and Email) */}
          {(type === "sms" || type === "email") && (
            <div className="space-y-2">
              <Label>{type === "sms" ? "Message" : "Email Body"}</Label>
              <Textarea
                placeholder={config.placeholder}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
              {type === "sms" && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{message.length} characters</span>
                  <span>{Math.ceil(message.length / 160)} segment{Math.ceil(message.length / 160) !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>
          )}

          {/* Call Script (optional for calls) */}
          {type === "call" && (
            <div className="space-y-2">
              <Label>Call Script (optional)</Label>
              <Textarea
                placeholder={config.placeholder}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Lead Preview */}
          <div className="space-y-2">
            <Label>Recipients Preview</Label>
            <div className="max-h-32 overflow-y-auto rounded-lg border p-2 space-y-1">
              {validLeads.slice(0, 5).map((lead) => (
                <div key={lead.id} className="flex items-center justify-between text-sm">
                  <span>{lead.firstName || lead.name || "Unknown"}</span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {type === "email" ? lead.email : lead.phone}
                  </span>
                </div>
              ))}
              {validLeads.length > 5 && (
                <div className="text-xs text-muted-foreground text-center pt-1">
                  +{validLeads.length - 5} more
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || validLeads.length === 0}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : mode === "instant" ? (
              <Send className="mr-2 h-4 w-4" />
            ) : mode === "scheduled" ? (
              <Clock className="mr-2 h-4 w-4" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            {mode === "instant"
              ? `Send ${config.label}`
              : mode === "scheduled"
                ? "Schedule"
                : "Add to Queue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
