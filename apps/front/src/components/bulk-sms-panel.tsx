"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Send,
  Users,
  Zap,
  X,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface BulkSMSPanelProps {
  teamId?: string;
  onClose?: () => void;
  onSent?: (count: number) => void;
}

interface LeadPreview {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  company?: string;
}

interface SendProgress {
  total: number;
  sent: number;
  failed: number;
  status: "idle" | "sending" | "complete" | "error";
}

// Template variables available
const TEMPLATE_VARS = [
  { key: "{firstName}", desc: "Lead first name" },
  { key: "{lastName}", desc: "Lead last name" },
  { key: "{company}", desc: "Company name" },
  { key: "{phone}", desc: "Phone number" },
];

export function BulkSMSPanel({ teamId, onClose, onSent }: BulkSMSPanelProps) {
  const [message, setMessage] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("responded");
  const [leadCount, setLeadCount] = useState(0);
  const [maxLeads, setMaxLeads] = useState(100);
  const [leads, setLeads] = useState<LeadPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [previewLead, setPreviewLead] = useState<LeadPreview | null>(null);
  const [progress, setProgress] = useState<SendProgress>({
    total: 0,
    sent: 0,
    failed: 0,
    status: "idle",
  });

  // Fetch lead count when source changes
  useEffect(() => {
    fetchLeadCount();
  }, [selectedSource, maxLeads]);

  const fetchLeadCount = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/leads/count?source=${selectedSource}&limit=${maxLeads}`
      );
      const data = await response.json();
      setLeadCount(data.count || 0);
      setLeads(data.preview || []);
      if (data.preview?.length > 0) {
        setPreviewLead(data.preview[0]);
      }
    } catch (error) {
      console.error("Failed to fetch lead count:", error);
      setLeadCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Render message with variable substitution for preview
  const renderPreview = (lead: LeadPreview | null) => {
    if (!lead || !message) return message || "Enter your message above...";

    return message
      .replace(/{firstName}/gi, lead.firstName || "")
      .replace(/{lastName}/gi, lead.lastName || "")
      .replace(/{company}/gi, lead.company || "")
      .replace(/{phone}/gi, lead.phone || "")
      .trim();
  };

  // Insert variable at cursor
  const insertVariable = (varKey: string) => {
    setMessage((prev) => prev + varKey);
  };

  // Handle send confirmation
  const handleSendClick = () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }
    if (leadCount === 0) {
      toast.error("No leads selected");
      return;
    }
    setShowConfirm(true);
  };

  // Execute bulk send
  const executeBulkSend = async () => {
    setShowConfirm(false);
    setProgress({ total: leadCount, sent: 0, failed: 0, status: "sending" });

    try {
      const response = await fetch("/api/sms/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          source: selectedSource,
          limit: maxLeads,
          teamId,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setProgress({
          total: result.total || leadCount,
          sent: result.sent || 0,
          failed: result.failed || 0,
          status: "complete",
        });
        toast.success(`Sent ${result.sent} messages successfully!`);
        onSent?.(result.sent);
      } else {
        setProgress((prev) => ({ ...prev, status: "error" }));
        toast.error(result.error || "Bulk send failed");
      }
    } catch (error) {
      setProgress((prev) => ({ ...prev, status: "error" }));
      toast.error("Failed to send messages");
    }
  };

  const charCount = message.length;
  const segmentCount = Math.ceil(charCount / 160) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900">
            <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Bulk SMS Blast</h2>
            <p className="text-sm text-muted-foreground">
              Send to up to 2,000 leads at once
            </p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Source Selection */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Lead Source</Label>
          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger>
              <SelectValue placeholder="Select lead source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="responded">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-500">
                    GREEN
                  </Badge>
                  Responded Leads
                </div>
              </SelectItem>
              <SelectItem value="gold">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-yellow-500">
                    GOLD
                  </Badge>
                  Email + Mobile Captured
                </div>
              </SelectItem>
              <SelectItem value="hot">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">HOT</Badge>
                  Hot Leads
                </div>
              </SelectItem>
              <SelectItem value="warm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">WARM</Badge>
                  Warm Leads
                </div>
              </SelectItem>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  All Active Leads
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Max Recipients</Label>
          <Select
            value={maxLeads.toString()}
            onValueChange={(v) => setMaxLeads(parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 (Test)</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="250">250</SelectItem>
              <SelectItem value="500">500</SelectItem>
              <SelectItem value="1000">1,000</SelectItem>
              <SelectItem value="2000">2,000 (Max)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lead Count Badge */}
      <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
        <Users className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1">
          <p className="font-medium">
            {loading ? "Loading..." : `${leadCount.toLocaleString()} leads`}
          </p>
          <p className="text-sm text-muted-foreground">
            Will receive this message
          </p>
        </div>
        {leadCount > 0 && (
          <Badge variant="outline" className="text-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Ready
          </Badge>
        )}
      </div>

      {/* Message Composer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Message</Label>
          <div className="flex gap-1">
            {TEMPLATE_VARS.map((v) => (
              <Button
                key={v.key}
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                onClick={() => insertVariable(v.key)}
                title={v.desc}
              >
                {v.key}
              </Button>
            ))}
          </div>
        </div>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Hey {firstName}, just wanted to reach out about..."
          className="min-h-[120px] font-mono text-sm"
          maxLength={480}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {charCount}/480 characters • {segmentCount} segment
            {segmentCount > 1 ? "s" : ""}
          </span>
          {segmentCount > 1 && (
            <span className="text-amber-500 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Multiple segments = higher cost
            </span>
          )}
        </div>
      </div>

      {/* Live Preview */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <Label>Live Preview</Label>
          {leads.length > 1 && (
            <Select
              value={previewLead?.id || ""}
              onValueChange={(id) =>
                setPreviewLead(leads.find((l) => l.id === id) || null)
              }
            >
              <SelectTrigger className="h-7 w-[180px]">
                <SelectValue placeholder="Select lead" />
              </SelectTrigger>
              <SelectContent>
                {leads.slice(0, 5).map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.firstName} {lead.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border-l-4 border-green-500">
          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                {previewLead
                  ? `To: ${previewLead.firstName} ${previewLead.lastName}`
                  : "To: [Lead Name]"}
              </p>
              <p className="mt-1 text-sm text-green-700 dark:text-green-300 whitespace-pre-wrap">
                {renderPreview(previewLead)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar (when sending) */}
      {progress.status !== "idle" && (
        <div className="space-y-2 p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {progress.status === "sending" && "Sending..."}
              {progress.status === "complete" && "Complete!"}
              {progress.status === "error" && "Error occurred"}
            </span>
            <span className="text-sm text-muted-foreground">
              {progress.sent}/{progress.total}
            </span>
          </div>
          <Progress
            value={(progress.sent / progress.total) * 100}
            className="h-2"
          />
          <div className="flex gap-4 text-xs">
            <span className="text-green-600">
              <CheckCircle2 className="h-3 w-3 inline mr-1" />
              {progress.sent} sent
            </span>
            {progress.failed > 0 && (
              <span className="text-red-600">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                {progress.failed} failed
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSendClick}
          disabled={!message.trim() || leadCount === 0 || progress.status === "sending"}
          className="gap-2"
        >
          {progress.status === "sending" ? (
            <>
              <Clock className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send to {leadCount.toLocaleString()} Leads
            </>
          )}
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Bulk SMS
            </DialogTitle>
            <DialogDescription>
              You are about to send SMS to{" "}
              <strong>{leadCount.toLocaleString()}</strong> leads.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Message Preview:</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {renderPreview(previewLead)}
              </p>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span>{leadCount.toLocaleString()} recipients</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-green-500" />
                <span>{segmentCount} segment(s)</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>SignalHouse Limit:</strong> 2,000 SMS/day. This action
                cannot be undone.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={executeBulkSend}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Zap className="h-4 w-4" />
              Confirm & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
