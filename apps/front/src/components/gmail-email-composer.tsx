"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Send, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface GmailEmailComposerProps {
  /** Pre-fill recipient email */
  to?: string;
  /** Pre-fill recipient name */
  toName?: string;
  /** Pre-fill subject */
  subject?: string;
  /** Called after successful send */
  onSent?: () => void;
  /** Called when cancelled */
  onCancel?: () => void;
  /** Compact mode for embedding */
  compact?: boolean;
}

export function GmailEmailComposer({
  to: defaultTo = "",
  toName = "",
  subject: defaultSubject = "",
  onSent,
  onCancel,
  compact = false,
}: GmailEmailComposerProps) {
  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [showCc, setShowCc] = useState(false);

  const handleSend = async () => {
    if (!to || !subject || !body) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject,
          text: body,
          html: body.replace(/\n/g, "<br>"),
          ...(cc && { cc }),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send email");
      }

      toast.success(`Email sent to ${to}`);

      // Clear form
      setTo(defaultTo);
      setSubject("");
      setBody("");
      setCc("");

      onSent?.();
    } catch (error: any) {
      console.error("[Gmail] Send error:", error);
      toast.error(error.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  if (compact) {
    return (
      <div className="space-y-3 p-4 border rounded-lg bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Quick Email</span>
          </div>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Input
          type="email"
          placeholder="To: email@example.com"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />

        <Input
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />

        <Textarea
          placeholder="Write your message..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-[100px]"
        />

        <div className="flex justify-end">
          <Button
            onClick={handleSend}
            disabled={sending || !to || !subject || !body}
            size="sm"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Compose Email
          </CardTitle>
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Sending from: tb@outreachglobal.io
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* To field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="to">To</Label>
            {!showCc && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => setShowCc(true)}
              >
                Add CC
              </Button>
            )}
          </div>
          <Input
            id="to"
            type="email"
            placeholder={
              toName ? `${toName} <email@example.com>` : "email@example.com"
            }
            value={to}
            onChange={(e) => setTo(e.target.value)}
            required
          />
        </div>

        {/* CC field (optional) */}
        {showCc && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="cc">CC</Label>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-muted-foreground"
                onClick={() => {
                  setShowCc(false);
                  setCc("");
                }}
              >
                Remove
              </Button>
            </div>
            <Input
              id="cc"
              type="email"
              placeholder="cc@example.com"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
            />
          </div>
        )}

        {/* Subject */}
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            placeholder="Enter subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
        </div>

        {/* Body */}
        <div className="space-y-2">
          <Label htmlFor="body">Message</Label>
          <Textarea
            id="body"
            placeholder="Write your email message..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-[200px]"
            required
          />
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          {body.length > 0 && `${body.length} characters`}
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSend}
            disabled={sending || !to || !subject || !body}
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
