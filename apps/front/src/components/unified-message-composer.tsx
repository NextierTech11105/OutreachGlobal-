"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare,
  Mail,
  Phone,
  Send,
  X,
  Loader2,
  Sparkles,
  Clock,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentTeam } from "@/features/team/team.context";

interface UnifiedMessageComposerProps {
  /** Default channel: sms, email, voice */
  defaultChannel?: "sms" | "email" | "voice";
  /** Pre-fill recipient phone */
  phone?: string;
  /** Pre-fill recipient email */
  email?: string;
  /** Pre-fill recipient name */
  name?: string;
  /** Pre-fill subject (email only) */
  subject?: string;
  /** Called after successful send */
  onSent?: (channel: string, count?: number) => void;
  /** Called when cancelled */
  onCancel?: () => void;
}

export function UnifiedMessageComposer({
  defaultChannel = "sms",
  phone: defaultPhone = "",
  email: defaultEmail = "",
  name: defaultName = "",
  subject: defaultSubject = "",
  onSent,
  onCancel,
}: UnifiedMessageComposerProps) {
  const { team } = useCurrentTeam();
  const [channel, setChannel] = useState<"sms" | "email" | "voice">(defaultChannel);
  const [phone, setPhone] = useState(defaultPhone);
  const [email, setEmail] = useState(defaultEmail);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [cc, setCc] = useState("");

  // SMS specific
  const smsCharCount = body.length;
  const smsSegments = Math.ceil(smsCharCount / 160) || 1;

  const handleSendSMS = async () => {
    if (!phone || !body) {
      toast.error("Please enter phone number and message");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phone,
          message: body,
          teamId: team?.id,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to send SMS");

      toast.success(`SMS sent to ${phone}`);
      setBody("");
      onSent?.("sms", 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send SMS");
    } finally {
      setSending(false);
    }
  };

  const handleSendEmail = async () => {
    if (!email || !subject || !body) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          subject,
          text: body,
          html: body.replace(/\n/g, "<br>"),
          ...(cc && { cc }),
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to send email");

      toast.success(`Email sent to ${email}`);
      setBody("");
      setSubject("");
      onSent?.("email", 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const handleSendVoice = async () => {
    if (!phone) {
      toast.error("Please enter phone number");
      return;
    }

    // For voice, we initiate a call
    setSending(true);
    try {
      const response = await fetch("/api/call/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phone,
          teamId: team?.id,
          script: body || undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to initiate call");

      toast.success(`Calling ${phone}...`);
      onSent?.("voice", 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to initiate call");
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
    switch (channel) {
      case "sms":
        handleSendSMS();
        break;
      case "email":
        handleSendEmail();
        break;
      case "voice":
        handleSendVoice();
        break;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <Tabs value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="sms" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">SMS</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Email</span>
            </TabsTrigger>
            <TabsTrigger value="voice" className="gap-2">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">Voice</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Recipient */}
        {channel === "sms" && (
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        )}

        {channel === "email" && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="email">To</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setShowCc(!showCc)}
                >
                  {showCc ? "Hide CC" : "Add CC"}
                </Button>
              </div>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {showCc && (
              <div className="space-y-2">
                <Label htmlFor="cc">CC</Label>
                <Input
                  id="cc"
                  type="email"
                  placeholder="cc@example.com"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Enter subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          </>
        )}

        {channel === "voice" && (
          <div className="space-y-2">
            <Label htmlFor="voicePhone">Phone Number</Label>
            <Input
              id="voicePhone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        )}

        {/* Message Body */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="body">
              {channel === "sms" && "Message"}
              {channel === "email" && "Email Body"}
              {channel === "voice" && "Call Script (optional)"}
            </Label>
            {channel === "sms" && (
              <span className="text-xs text-muted-foreground">
                {smsCharCount}/160 · {smsSegments} segment{smsSegments > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <Textarea
            id="body"
            placeholder={
              channel === "sms"
                ? "Type your SMS message..."
                : channel === "email"
                  ? "Write your email..."
                  : "Enter call script or notes..."
            }
            className="min-h-[120px]"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1">
            <Sparkles className="h-3 w-3" />
            AI Generate
          </Button>
          <Button variant="outline" size="sm" className="gap-1">
            <Clock className="h-3 w-3" />
            Schedule
          </Button>
          <Button variant="outline" size="sm" className="gap-1">
            <Users className="h-3 w-3" />
            Templates
          </Button>
        </div>

        {/* Sending From */}
        <div className="text-xs text-muted-foreground">
          {channel === "sms" && (
            <span>Sending from: {process.env.NEXT_PUBLIC_DEFAULT_SMS_NUMBER || "SignalHouse"}</span>
          )}
          {channel === "email" && (
            <span>Sending from: tb@outreachglobal.io</span>
          )}
          {channel === "voice" && (
            <span>Calling from: Twilio</span>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between gap-2">
        <Button variant="outline" onClick={onCancel} disabled={sending}>
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button onClick={handleSend} disabled={sending}>
          {sending ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-1" />
          )}
          {channel === "sms" && "Send SMS"}
          {channel === "email" && "Send Email"}
          {channel === "voice" && "Start Call"}
        </Button>
      </CardFooter>
    </Card>
  );
}
