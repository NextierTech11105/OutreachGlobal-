"use client";

import { sf, sfd } from "@/lib/utils/safe-format";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Mail,
  MessageSquare,
  Phone,
  Reply,
  Forward,
  Trash,
  Archive,
  Flag,
  UserPlus,
  Tag,
  MoreHorizontal,
  Download,
  Bot,
  PhoneCall,
  Ban,
  Snowflake,
} from "lucide-react";
import { toast } from "sonner";
import type { Message } from "@/types/message";
import { GiannaResponseHandler } from "@/components/gianna-response-handler";

interface MessageDetailProps {
  message: Message;
  onReply: () => void;
  onClose: () => void;
}

export function MessageDetail({
  message,
  onReply,
  onClose,
}: MessageDetailProps) {
  const [activeTab, setActiveTab] = useState<
    "message" | "ai" | "history" | "details"
  >("message");

  // AI Co-Pilot handlers
  const handleSendAiReply = async (replyMessage: string) => {
    // Send via SignalHouse
    const response = await fetch("/api/signalhouse/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: message.phone,
        message: replyMessage,
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }

    toast.success("Reply sent!");
  };

  const handlePushToCallCenter = () => {
    // Store lead info for call center
    const callLead = {
      name: message.from,
      phone: message.phone,
      email: message.email,
      notes: `Interested response: "${message.content}"`,
      source: "inbox_escalation",
      priority: "hot",
    };

    // Add to call queue in localStorage (or API call)
    const existing = JSON.parse(localStorage.getItem("call_queue") || "[]");
    existing.unshift(callLead);
    localStorage.setItem("call_queue", JSON.stringify(existing));

    toast.success(`${message.from} added to Call Center queue!`);
  };

  const handleAddToDnc = () => {
    // Add to DNC list
    fetch("/api/dnc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: message.phone }),
    })
      .then(() => {
        toast.success(`${message.phone} added to Do Not Contact list`);
      })
      .catch(() => {
        toast.error("Failed to add to DNC");
      });
  };

  const handleMarkCold = () => {
    toast.info(`${message.from} marked as cold lead`);
    // In real app, update lead status via API
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return sf(date);
  };

  const getMessageTypeIcon = () => {
    switch (message.type) {
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

  const getStatusBadge = () => {
    switch (message.status) {
      case "new":
        return <Badge variant="default">New</Badge>;
      case "read":
        return <Badge variant="outline">Read</Badge>;
      case "replied":
        return <Badge variant="secondary">Replied</Badge>;
      case "unsubscribed":
        return <Badge variant="destructive">Unsubscribed</Badge>;
      case "flagged":
        return <Badge variant="destructive">Flagged</Badge>;
      case "archived":
        return <Badge variant="outline">Archived</Badge>;
      case "spam":
        return <Badge variant="destructive">Spam</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full border-0 shadow-none">
      <CardHeader className="px-0 pt-0 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{message.from.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">
                  {message.subject || "No Subject"}
                </h3>
                {getMessageTypeIcon()}
                {getStatusBadge()}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center text-sm text-muted-foreground gap-1 sm:gap-4">
                <div>
                  From:{" "}
                  <span className="font-medium">
                    {message.from} {message.email && `<${message.email}>`}{" "}
                    {message.phone && `(${message.phone})`}
                  </span>
                </div>
                <div>Date: {formatDate(message.date)}</div>
                {message.campaign && <div>Campaign: {message.campaign}</div>}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Flag className="mr-2 h-4 w-4" /> Flag
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Archive className="mr-2 h-4 w-4" /> Archive
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Trash className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
              <DropdownMenuItem>
                <UserPlus className="mr-2 h-4 w-4" /> Assign
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Tag className="mr-2 h-4 w-4" /> Add Label
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <Tabs
          defaultValue="message"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as any)}
        >
          <TabsList className="mb-4 h-9">
            <TabsTrigger value="message" className="text-xs">
              Message
            </TabsTrigger>
            <TabsTrigger value="ai" className="text-xs flex items-center gap-1">
              <Bot className="h-3 w-3" />
              Gianna
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              History
            </TabsTrigger>
            <TabsTrigger value="details" className="text-xs">
              Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="message" className="space-y-4">
            {message.type === "voice" && message.voiceRecording && (
              <div className="bg-muted/50 p-4 rounded-md">
                <div className="mb-2 font-medium">Voice Recording</div>
                <audio controls className="w-full">
                  <source src={message.voiceRecording} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
                <Button variant="outline" size="sm" className="mt-2">
                  <Download className="mr-2 h-4 w-4" /> Download Recording
                </Button>
              </div>
            )}

            {message.type === "voice" && message.voiceTranscript ? (
              <div className="whitespace-pre-line">
                <div className="mb-2 font-medium">Transcript:</div>
                {message.voiceTranscript}
              </div>
            ) : (
              <div className="whitespace-pre-line">{message.content}</div>
            )}

            {message.attachments && message.attachments.length > 0 && (
              <div className="border-t pt-4 mt-4">
                <div className="font-medium mb-2">
                  Attachments ({message.attachments.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {message.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center p-2 border rounded-md"
                    >
                      <div className="flex-1 truncate">
                        <div className="font-medium truncate">
                          {attachment.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(attachment.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" asChild>
                        <a
                          href={attachment.url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* GIANNA AI TAB */}
          <TabsContent value="ai" className="space-y-4">
            {message.type === "sms" && message.content ? (
              <GiannaResponseHandler
                incomingMessage={message.content}
                leadName={message.from}
                leadPhone={message.phone || ""}
                campaignType="real_estate"
                onSendReply={handleSendAiReply}
                onPushToCallCenter={handlePushToCallCenter}
                onAddToDnc={handleAddToDnc}
                onMarkCold={handleMarkCold}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Gianna is available for SMS messages</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Message history will be displayed here, including previous
              interactions with this contact.
            </div>
            {/* In a real app, you would fetch and display the message history here */}
            <div className="border-l-2 border-muted pl-4 space-y-4">
              <div className="space-y-1">
                <div className="text-sm font-medium">
                  Previous message - {formatDate("2025-04-10T14:30:00")}
                </div>
                <div className="text-sm">
                  Initial outreach from campaign "{message.campaign}"
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">
                  Contact created - {formatDate("2025-04-05T09:15:00")}
                </div>
                <div className="text-sm">
                  Added to campaign "{message.campaign}"
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Contact Information</div>
                <div className="text-sm">Name: {message.from}</div>
                {message.email && (
                  <div className="text-sm">Email: {message.email}</div>
                )}
                {message.phone && (
                  <div className="text-sm">Phone: {message.phone}</div>
                )}
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Message Details</div>
                <div className="text-sm">
                  Type: {message.type.toUpperCase()}
                </div>
                <div className="text-sm">Status: {message.status}</div>
                <div className="text-sm">Date: {formatDate(message.date)}</div>
                {message.campaign && (
                  <div className="text-sm">Campaign: {message.campaign}</div>
                )}
                {message.assignedTo && (
                  <div className="text-sm">
                    Assigned To: {message.assignedTo}
                  </div>
                )}
              </div>
              {message.metadata && (
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <div className="text-sm font-medium">Additional Metadata</div>
                  <pre className="text-xs bg-muted/50 p-2 rounded-md overflow-auto">
                    {JSON.stringify(message.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between px-0 pt-4 border-t">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onReply}
            disabled={message.status === "unsubscribed"}
            className="flex items-center h-8"
          >
            <Reply className="mr-2 h-4 w-4" /> Reply
          </Button>
          <Button variant="outline" size="sm" className="flex items-center h-8">
            <Forward className="mr-2 h-4 w-4" /> Forward
          </Button>
        </div>
        <Button variant="secondary" size="sm" onClick={onClose} className="h-8">
          Close
        </Button>
      </CardFooter>
    </Card>
  );
}
