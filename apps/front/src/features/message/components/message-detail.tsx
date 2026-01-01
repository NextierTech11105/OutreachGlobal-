"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import {
  Mail,
  MessageSquare,
  Phone,
  Reply,
  Sparkles,
  Send,
  Edit2,
  ChevronDown,
  RefreshCw,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useCurrentTeam } from "@/features/team/team.context";

interface Message {
  id: string;
  type: "sms" | "email" | "call";
  direction: "inbound" | "outbound";
  content?: string | null;
  subject?: string | null;
  createdAt: string;
  lead?: {
    id: string;
    name?: string | null;
  } | null;
  assignedWorker?: "gianna" | "cathy" | "sabrina" | null;
}

interface MessageDetailProps {
  message: Message | null;
  onReply?: () => void;
  onClose?: () => void;
}

const WORKERS = [
  { id: "gianna", name: "GIANNA", role: "Opener", color: "text-purple-400" },
  { id: "cathy", name: "CATHY", role: "Nudger", color: "text-orange-400" },
  { id: "sabrina", name: "SABRINA", role: "Closer", color: "text-emerald-400" },
];

export function MessageDetail({
  message,
  onReply,
  onClose,
}: MessageDetailProps) {
  const { team } = useCurrentTeam();
  const [aiSuggestion, setAiSuggestion] = useState<string>("");
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSuggestion, setEditedSuggestion] = useState("");
  const [assignedWorker, setAssignedWorker] = useState<string | null>(
    message?.assignedWorker || null,
  );
  const [isSending, setIsSending] = useState(false);

  // Fetch AI suggestion when message changes
  useEffect(() => {
    if (message?.direction === "inbound" && message?.content) {
      fetchAiSuggestion();
    }
  }, [message?.id]);

  const fetchAiSuggestion = async () => {
    if (!message) return;

    setIsLoadingSuggestion(true);
    try {
      const response = await fetch("/api/ai/suggest-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: message.id,
          messageContent: message.content,
          messageType: message.type,
          leadName: message.lead?.name,
          worker: assignedWorker,
          teamId: team?.id,
        }),
      });

      const data = await response.json();
      if (data.suggestion) {
        setAiSuggestion(data.suggestion);
        setEditedSuggestion(data.suggestion);
      } else {
        // Mock suggestion for demonstration
        const mockSuggestion = message.lead?.name
          ? `Hi ${message.lead.name}! Thanks for getting back to me. I'd love to tell you more about how we can help your business grow. Would you have a few minutes to chat this week?`
          : `Thanks for your reply! I'd love to tell you more about what we offer. When would be a good time to connect?`;
        setAiSuggestion(mockSuggestion);
        setEditedSuggestion(mockSuggestion);
      }
    } catch (error) {
      console.error("Failed to fetch AI suggestion:", error);
      // Use mock suggestion on error
      setAiSuggestion(
        "Thanks for getting back to me! I'd love to chat more about how we can help. When works best for you?",
      );
      setEditedSuggestion(
        "Thanks for getting back to me! I'd love to chat more about how we can help. When works best for you?",
      );
    } finally {
      setIsLoadingSuggestion(false);
    }
  };

  const handleApproveAndSend = async () => {
    if (!message) return;

    setIsSending(true);
    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replyTo: message.id,
          content: isEditing ? editedSuggestion : aiSuggestion,
          type: message.type,
          leadId: message.lead?.id,
          teamId: team?.id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Message sent successfully!");
        onClose?.();
      } else {
        toast.error("Failed to send message");
      }
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleAssignWorker = async (workerId: string) => {
    setAssignedWorker(workerId);
    toast.success(`Assigned to ${workerId.toUpperCase()}`);
    // Refresh suggestion with new worker context
    fetchAiSuggestion();
  };

  if (!message) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a message to view details
      </div>
    );
  }

  const getIcon = () => {
    switch (message.type) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "sms":
        return <MessageSquare className="h-4 w-4" />;
      case "call":
        return <Phone className="h-4 w-4" />;
    }
  };

  const currentWorker = WORKERS.find((w) => w.id === assignedWorker);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>
                {message.lead?.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">
                {message.lead?.name || "Unknown"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(message.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              {getIcon()}
              {message.type.toUpperCase()}
            </Badge>
            <Badge
              variant={
                message.direction === "inbound" ? "default" : "secondary"
              }
            >
              {message.direction}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Message Content */}
        <div>
          {message.subject && (
            <h3 className="font-medium mb-2">{message.subject}</h3>
          )}
          <div className="prose prose-sm max-w-none bg-muted/30 p-4 rounded-lg">
            {message.content || "No content"}
          </div>
        </div>

        {/* AI Suggestion Panel - Only for inbound messages */}
        {message.direction === "inbound" && (
          <div className="border rounded-lg bg-gradient-to-br from-purple-500/5 to-indigo-500/5 border-purple-500/20">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-purple-500/20">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span className="font-medium text-sm">AI Suggested Reply</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Worker Assignment */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                    >
                      <Users className="h-3 w-3" />
                      {currentWorker ? (
                        <span className={currentWorker.color}>
                          {currentWorker.name}
                        </span>
                      ) : (
                        "Assign Worker"
                      )}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {WORKERS.map((worker) => (
                      <DropdownMenuItem
                        key={worker.id}
                        onClick={() => handleAssignWorker(worker.id)}
                      >
                        <span className={worker.color}>{worker.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({worker.role})
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Regenerate */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={fetchAiSuggestion}
                  disabled={isLoadingSuggestion}
                >
                  <RefreshCw
                    className={`h-3 w-3 ${isLoadingSuggestion ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            </div>

            {/* Suggestion Content */}
            <div className="p-3">
              {isLoadingSuggestion ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating AI suggestion...
                </div>
              ) : isEditing ? (
                <Textarea
                  value={editedSuggestion}
                  onChange={(e) => setEditedSuggestion(e.target.value)}
                  className="min-h-[100px] bg-background"
                  placeholder="Edit your reply..."
                />
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {aiSuggestion || "Click refresh to generate a suggestion"}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            {aiSuggestion && (
              <div className="flex items-center gap-2 p-3 border-t border-purple-500/20">
                <Button
                  size="sm"
                  className="gap-1 bg-purple-600 hover:bg-purple-700"
                  onClick={handleApproveAndSend}
                  disabled={isSending}
                >
                  <Send className="h-3 w-3" />
                  {isSending ? "Sending..." : "Approve & Send"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => {
                    setIsEditing(!isEditing);
                    if (!isEditing) {
                      setEditedSuggestion(aiSuggestion);
                    }
                  }}
                >
                  <Edit2 className="h-3 w-3" />
                  {isEditing ? "Cancel Edit" : "Edit"}
                </Button>
                {onReply && (
                  <Button size="sm" variant="ghost" onClick={onReply}>
                    <Reply className="h-3 w-3 mr-1" />
                    Custom Reply
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Standard Reply Button for outbound or if no AI suggestion */}
        {message.direction === "outbound" && onReply && (
          <div className="pt-4 border-t">
            <Button onClick={onReply} variant="outline">
              <Reply className="h-4 w-4 mr-2" />
              Reply
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
