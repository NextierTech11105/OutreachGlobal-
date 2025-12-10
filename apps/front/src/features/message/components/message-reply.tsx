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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Mail,
  MessageSquare,
  Phone,
  ChevronDown,
  Clock,
  Sparkles,
  Save,
  FileText,
  Calendar,
  PhoneCall,
} from "lucide-react";
import type { Message, MessageType } from "@/types/message";
import { toast } from "sonner";

interface MessageReplyProps {
  message: Message;
  onSend: (replyText: string) => void;
  onCancel: () => void;
}

export function MessageReply({ message, onSend, onCancel }: MessageReplyProps) {
  const [replyText, setReplyText] = useState("");
  const [replyType, setReplyType] = useState<MessageType>(message.type);
  const [subject, setSubject] = useState(
    message.subject ? `Re: ${message.subject.replace(/^Re: /, "")}` : "",
  );
  const [useAI, setUseAI] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleType, setScheduleType] = useState<"sms" | "call">("sms");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [schedulingCall, setSchedulingCall] = useState(false);

  const handleSend = () => {
    if (replyText.trim()) {
      onSend(replyText);
    }
  };

  const handleSchedule = async () => {
    if (!scheduleDate || !scheduleTime) {
      toast.error("Please select date and time");
      return;
    }

    const scheduledAt = new Date(
      `${scheduleDate}T${scheduleTime}`,
    ).toISOString();
    const phoneNumber = message.phone;

    if (!phoneNumber && scheduleType === "sms") {
      toast.error("No phone number available for SMS");
      return;
    }

    setSchedulingCall(true);

    try {
      if (scheduleType === "sms") {
        // Schedule SMS via SignalHouse
        const response = await fetch("/api/inbox/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: phoneNumber,
            message: replyText,
            scheduleAt: scheduledAt,
          }),
        });

        const data = await response.json();
        if (data.error) {
          toast.error(data.error);
        } else {
          toast.success(`SMS scheduled for ${scheduleDate} at ${scheduleTime}`);
          setShowScheduleDialog(false);
          onSend(replyText); // Close the reply dialog
        }
      } else {
        // Schedule a call reminder (store locally or in database)
        const callReminder = {
          id: `call-${Date.now()}`,
          phone: phoneNumber,
          scheduledAt,
          note: replyText,
          contact: message.from,
        };

        // Store in localStorage for now
        const existingReminders = JSON.parse(
          localStorage.getItem("call-reminders") || "[]",
        );
        existingReminders.push(callReminder);
        localStorage.setItem(
          "call-reminders",
          JSON.stringify(existingReminders),
        );

        toast.success(
          `Call reminder set for ${scheduleDate} at ${scheduleTime}`,
        );
        setShowScheduleDialog(false);
      }
    } catch (error) {
      console.error("Schedule error:", error);
      toast.error("Failed to schedule");
    } finally {
      setSchedulingCall(false);
    }
  };

  const openScheduleDialog = (type: "sms" | "call") => {
    setScheduleType(type);
    // Set default to tomorrow at 10am
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleDate(tomorrow.toISOString().split("T")[0]);
    setScheduleTime("10:00");
    setShowScheduleDialog(true);
  };

  const handleGenerateAIResponse = async () => {
    setIsGenerating(true);

    try {
      // In a real app, this would call an API to generate a response
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const aiResponse = `Dear ${message.from},

Thank you for your message. I appreciate you taking the time to reach out.

${
  message.content.includes("pricing")
    ? "Regarding your pricing inquiry, we offer several flexible plans starting at $49/month for our basic package. I'd be happy to schedule a call to discuss which option would best suit your needs."
    : "I've reviewed your message and would like to provide you with more information about our services. Would you be available for a quick call this week to discuss further?"
}

Please let me know if you have any other questions.

Best regards,
Your Name`;

      setReplyText(aiResponse);
    } catch (error) {
      console.error("Error generating AI response:", error);
    } finally {
      setIsGenerating(false);
      setUseAI(true);
    }
  };

  const handleUseTemplate = (templateText: string) => {
    setReplyText(templateText);
    setShowTemplates(false);
  };

  const getReplyTypeIcon = () => {
    switch (replyType) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "sms":
        return <MessageSquare className="h-4 w-4" />;
      case "voice":
        return <Phone className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Sample templates - in a real app, these would be fetched from the backend
  const templates = [
    {
      id: "template1",
      name: "General Follow-up",
      text: `Hi ${message.from.split(" ")[0]},

Thank you for your message. I'm following up to see if you have any additional questions or if there's anything else I can help you with.

Best regards,
Your Name`,
    },
    {
      id: "template2",
      name: "Meeting Request",
      text: `Hi ${message.from.split(" ")[0]},

Thank you for your interest. I'd like to schedule a meeting to discuss this further. Would you be available for a 30-minute call this week?

Please let me know what times work best for you.

Best regards,
Your Name`,
    },
    {
      id: "template3",
      name: "Information Request",
      text: `Hi ${message.from.split(" ")[0]},

Thank you for your inquiry. I'll gather the information you requested and get back to you within 24 hours.

Best regards,
Your Name`,
    },
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Reply: {message.subject || "No Subject"}</CardTitle>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  {getReplyTypeIcon()}
                  <span>
                    {replyType.charAt(0).toUpperCase() + replyType.slice(1)}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setReplyType("email")}>
                  <Mail className="mr-2 h-4 w-4" /> Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setReplyType("sms")}>
                  <MessageSquare className="mr-2 h-4 w-4" /> SMS
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setReplyType("voice")}>
                  <Phone className="mr-2 h-4 w-4" /> Voice Script
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-1"
            >
              <FileText className="h-4 w-4" />
              <span>Templates</span>
            </Button>
            <Button
              variant={useAI ? "default" : "outline"}
              size="sm"
              onClick={handleGenerateAIResponse}
              disabled={isGenerating}
              className="flex items-center gap-1"
            >
              <Sparkles className="h-4 w-4" />
              <span>{isGenerating ? "Generating..." : "AI Assist"}</span>
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          To: {message.from} {message.email && `<${message.email}>`}{" "}
          {message.phone && `(${message.phone})`}
        </p>
      </CardHeader>
      <CardContent>
        {showTemplates && (
          <div className="mb-4 border rounded-md">
            <div className="p-2 bg-muted font-medium">Select a Template</div>
            <div className="p-2 divide-y">
              {templates.map((template) => (
                <div key={template.id} className="py-2 first:pt-0 last:pb-0">
                  <div className="flex justify-between items-center">
                    <div className="font-medium">{template.name}</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUseTemplate(template.text)}
                    >
                      Use
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {template.text.split("\n")[0]}...
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {replyType === "email" && (
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter subject"
              />
            </div>
          )}

          <div className="border-l-4 border-muted pl-4 mb-4 italic text-sm text-muted-foreground">
            <p>{message.content}</p>
          </div>

          <Tabs defaultValue="compose">
            <TabsList className="mb-2">
              <TabsTrigger value="compose">Compose</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="compose">
              <Textarea
                placeholder={`Type your ${replyType === "voice" ? "voice script" : "reply"} here...`}
                className="min-h-[200px] font-mono text-sm"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
            </TabsContent>
            <TabsContent value="preview">
              <div className="min-h-[200px] p-4 border rounded-md whitespace-pre-line">
                {replyText || (
                  <span className="text-muted-foreground italic">
                    No content to preview
                  </span>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              {replyType === "sms" && (
                <span>{replyText.length} / 160 characters</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1"
              >
                <Save className="h-4 w-4" />
                <span>Save Draft</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Clock className="h-4 w-4" />
                    <span>Schedule</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => openScheduleDialog("sms")}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Schedule SMS
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openScheduleDialog("call")}>
                    <PhoneCall className="mr-2 h-4 w-4" />
                    Schedule Call
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSend} disabled={!replyText.trim()}>
          Send Reply
        </Button>
      </CardFooter>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {scheduleType === "sms" ? (
                <>
                  <MessageSquare className="h-5 w-5" />
                  Schedule SMS
                </>
              ) : (
                <>
                  <PhoneCall className="h-5 w-5" />
                  Schedule Call
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              {scheduleType === "sms"
                ? `Schedule an SMS to ${message.phone || "recipient"}`
                : `Set a reminder to call ${message.from}`}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schedule-date">Date</Label>
                <Input
                  id="schedule-date"
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule-time">Time</Label>
                <Input
                  id="schedule-time"
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            </div>

            {scheduleType === "sms" && (
              <div className="space-y-2">
                <Label>Message Preview</Label>
                <div className="p-3 bg-muted rounded-md text-sm">
                  {replyText || (
                    <span className="text-muted-foreground italic">
                      Enter your message above
                    </span>
                  )}
                </div>
              </div>
            )}

            {scheduleType === "call" && (
              <div className="space-y-2">
                <Label htmlFor="call-note">Call Notes (optional)</Label>
                <Textarea
                  id="call-note"
                  placeholder="Notes for the call..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowScheduleDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={schedulingCall || !scheduleDate || !scheduleTime}
            >
              {schedulingCall
                ? "Scheduling..."
                : scheduleType === "sms"
                  ? "Schedule SMS"
                  : "Set Reminder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
