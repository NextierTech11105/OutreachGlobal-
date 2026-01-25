"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Search,
  Phone,
  Mail,
  User,
  Sparkles,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type WorkerId = "gianna" | "cathy" | "sabrina" | "all";

interface ConversationSummary {
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadEmail?: string;
  lastMessage: string;
  lastDirection: "INBOUND" | "OUTBOUND";
  lastMessageAt: string;
  classification?: string;
  campaignId?: string;
  campaignName?: string;
  isRead: boolean;
  isProcessed: boolean;
  unreadCount: number;
}

interface ConversationMessage {
  id: string;
  body: string;
  direction: "INBOUND" | "OUTBOUND";
  status: string;
  sentAt: string;
  deliveredAt?: string;
  worker?: string;
}

interface Conversation {
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadEmail?: string;
  campaignId?: string;
  campaignName?: string;
  classification?: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: ConversationMessage[];
}

interface QueueStats {
  pending: number;
  sent: number;
  delivered: number;
  failed: number;
  dailyRemaining: number;
}

const WORKER_CONFIG = {
  gianna: {
    name: "GIANNA",
    role: "Opener",
    color: "bg-purple-500",
    gradient: "from-purple-500 to-indigo-600",
  },
  cathy: {
    name: "CATHY",
    role: "Nudger",
    color: "bg-orange-500",
    gradient: "from-orange-500 to-amber-600",
  },
  sabrina: {
    name: "SABRINA",
    role: "Closer",
    color: "bg-emerald-500",
    gradient: "from-emerald-500 to-teal-600",
  },
};

const CLASSIFICATION_COLORS: Record<string, string> = {
  "email-capture": "bg-green-500/20 text-green-400 border-green-500/50",
  interested: "bg-green-500/20 text-green-400 border-green-500/50",
  question: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  "called-back": "bg-cyan-500/20 text-cyan-400 border-cyan-500/50",
  objection: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  "not-interested": "bg-zinc-500/20 text-zinc-400 border-zinc-500/50",
  "opt-out": "bg-red-500/20 text-red-400 border-red-500/50",
  profanity: "bg-red-500/20 text-red-400 border-red-500/50",
  "wrong-number": "bg-zinc-500/20 text-zinc-400 border-zinc-500/50",
};

interface SMSCommandCenterProps {
  teamId: string;
}

export function SMSCommandCenter({ teamId }: SMSCommandCenterProps) {
  // State
  const [activeWorker, setActiveWorker] = useState<WorkerId>("all");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    pending: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    dailyRemaining: 2000,
  });
  const [conversationStats, setConversationStats] = useState({
    pending: 0,
    read: 0,
    replied: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "replied">(
    "all",
  );

  // Fetch queue stats
  const fetchQueueStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/sms/queue?teamId=${teamId}`);
      const data = await response.json();
      if (data.success && data.stats) {
        setQueueStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch queue stats:", error);
    }
  }, [teamId]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        teamId,
        limit: "50",
      });
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const response = await fetch(`/api/sms/conversations?${params}`);
      const data = await response.json();

      if (data.success) {
        setConversations(data.conversations || []);
        if (data.stats) {
          setConversationStats(data.stats);
        }
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [teamId, statusFilter]);

  // Fetch single conversation thread
  const fetchThread = async (leadId: string) => {
    setLoadingThread(true);
    try {
      const response = await fetch(
        `/api/sms/conversations?teamId=${teamId}&leadId=${leadId}`,
      );
      const data = await response.json();

      if (data.success && data.conversation) {
        setSelectedConversation(data.conversation);

        // Mark as read
        await fetch("/api/sms/conversations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId, teamId, action: "read" }),
        });

        // Update local state
        setConversations((prev) =>
          prev.map((c) =>
            c.leadId === leadId ? { ...c, isRead: true, unreadCount: 0 } : c,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to fetch thread:", error);
      toast.error("Failed to load conversation");
    } finally {
      setLoadingThread(false);
    }
  };

  // Send reply
  const handleSendReply = async () => {
    if (!selectedConversation || !replyText.trim()) return;

    setSending(true);
    try {
      // Use the direct SMS send endpoint for free-form replies
      const response = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selectedConversation.leadPhone,
          message: replyText,
          leadId: selectedConversation.leadId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Reply sent!");
        setReplyText("");

        // Add message to local state
        const worker = activeWorker === "all" ? "manual" : activeWorker;
        setSelectedConversation((prev) =>
          prev
            ? {
                ...prev,
                messages: [
                  ...prev.messages,
                  {
                    id: data.dbMessageId || `temp_${Date.now()}`,
                    body: replyText,
                    direction: "OUTBOUND",
                    status: "SENT",
                    sentAt: new Date().toISOString(),
                    worker,
                  },
                ],
              }
            : null,
        );

        // Mark as processed
        await fetch("/api/sms/conversations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: selectedConversation.leadId,
            teamId,
            action: "archive",
          }),
        });

        // Refresh conversations
        fetchConversations();
      } else {
        toast.error(data.error || "Failed to send reply");
      }
    } catch (error) {
      console.error("Send reply error:", error);
      toast.error("Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  // Initial load and polling
  useEffect(() => {
    fetchQueueStats();
    fetchConversations();

    const interval = setInterval(() => {
      fetchQueueStats();
      fetchConversations();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchQueueStats, fetchConversations]);

  // Filter conversations by search
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.leadName.toLowerCase().includes(query) ||
      c.leadPhone.includes(query) ||
      c.lastMessage?.toLowerCase().includes(query)
    );
  });

  const handleRefresh = () => {
    setLoading(true);
    fetchQueueStats();
    fetchConversations();
    toast.success("Refreshed");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
              <Clock className="w-3 h-3" />
              Pending
            </div>
            <p className="text-xl font-bold text-yellow-400">
              {(conversationStats.pending ?? 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
              <Send className="w-3 h-3" />
              Sent Today
            </div>
            <p className="text-xl font-bold text-blue-400">
              {(queueStats.sent ?? 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
              <CheckCircle className="w-3 h-3" />
              Delivered
            </div>
            <p className="text-xl font-bold text-green-400">
              {(queueStats.delivered ?? 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
              <XCircle className="w-3 h-3" />
              Failed
            </div>
            <p className="text-xl font-bold text-red-400">
              {(queueStats.failed ?? 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
              <MessageSquare className="w-3 h-3" />
              Daily Left
            </div>
            <p className="text-xl font-bold text-zinc-100">
              {(queueStats.dailyRemaining ?? 2000).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Worker Tabs + Conversation List */}
        <div className="lg:col-span-5 flex flex-col min-h-0">
          <Card className="bg-zinc-900 border-zinc-800 flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-2 flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Conversations
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={handleRefresh}>
                  <RefreshCw
                    className={cn("w-4 h-4", loading && "animate-spin")}
                  />
                </Button>
              </div>

              {/* Worker Tabs */}
              <Tabs
                value={activeWorker}
                onValueChange={(v) => setActiveWorker(v as WorkerId)}
                className="mt-2"
              >
                <TabsList className="bg-zinc-800 border border-zinc-700 w-full justify-start">
                  <TabsTrigger value="all" className="text-xs">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="gianna" className="text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    GIANNA
                  </TabsTrigger>
                  <TabsTrigger value="cathy" className="text-xs">
                    <MessageCircle className="w-3 h-3 mr-1" />
                    CATHY
                  </TabsTrigger>
                  <TabsTrigger value="sabrina" className="text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    SABRINA
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Filters */}
              <div className="flex gap-2 mt-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-8 bg-zinc-800 border-zinc-700"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(v: any) => setStatusFilter(v)}
                >
                  <SelectTrigger className="w-[100px] h-8 bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="replied">Replied</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden pt-2 pb-4">
              <ScrollArea className="h-full">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No conversations yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 pr-2">
                    {filteredConversations.map((conv) => (
                      <button
                        key={conv.leadId}
                        onClick={() => fetchThread(conv.leadId)}
                        className={cn(
                          "w-full p-3 rounded-lg text-left transition-colors",
                          "hover:bg-zinc-800/80 border border-transparent",
                          selectedConversation?.leadId === conv.leadId &&
                            "bg-zinc-800 border-zinc-700",
                          !conv.isRead && "bg-zinc-800/40",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-zinc-100 truncate">
                                {conv.leadName}
                              </span>
                              {conv.unreadCount > 0 && (
                                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                                  {conv.unreadCount}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-zinc-400 truncate mt-0.5">
                              {conv.lastDirection === "OUTBOUND" && "You: "}
                              {conv.lastMessage}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-zinc-500">
                                {formatDistanceToNow(
                                  new Date(conv.lastMessageAt),
                                  {
                                    addSuffix: true,
                                  },
                                )}
                              </span>
                              {conv.classification && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs py-0",
                                    CLASSIFICATION_COLORS[
                                      conv.classification
                                    ] || "border-zinc-600",
                                  )}
                                >
                                  {conv.classification.replace("-", " ")}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Conversation Thread */}
        <div className="lg:col-span-7 flex flex-col min-h-0">
          <Card className="bg-zinc-900 border-zinc-800 flex-1 flex flex-col min-h-0">
            {loadingThread ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
              </div>
            ) : selectedConversation ? (
              <>
                {/* Header */}
                <CardHeader className="pb-3 flex-shrink-0 border-b border-zinc-800">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="w-5 h-5" />
                        {selectedConversation.leadName}
                      </CardTitle>
                      <div className="flex items-center gap-3 mt-1 text-sm text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {selectedConversation.leadPhone}
                        </span>
                        {selectedConversation.leadEmail && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {selectedConversation.leadEmail}
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedConversation.campaignName && (
                      <Badge variant="outline" className="text-xs">
                        {selectedConversation.campaignName}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 overflow-hidden py-4">
                  <ScrollArea className="h-full">
                    <div className="space-y-4 pr-4">
                      {selectedConversation.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex",
                            msg.direction === "OUTBOUND"
                              ? "justify-end"
                              : "justify-start",
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[75%] p-3 rounded-lg",
                              msg.direction === "OUTBOUND"
                                ? "bg-purple-600 text-white"
                                : "bg-zinc-800 text-zinc-100",
                            )}
                          >
                            <p className="text-sm">{msg.body}</p>
                            <div
                              className={cn(
                                "flex items-center gap-2 mt-1 text-xs",
                                msg.direction === "OUTBOUND"
                                  ? "text-purple-200"
                                  : "text-zinc-500",
                              )}
                            >
                              <span>
                                {formatDistanceToNow(new Date(msg.sentAt), {
                                  addSuffix: true,
                                })}
                              </span>
                              {msg.worker && (
                                <span className="capitalize">
                                  via {msg.worker}
                                </span>
                              )}
                              {msg.status === "DELIVERED" && (
                                <CheckCircle className="w-3 h-3" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>

                {/* Reply Box */}
                <div className="p-4 border-t border-zinc-800 flex-shrink-0">
                  <div className="space-y-3">
                    <Textarea
                      placeholder={`Reply as ${activeWorker === "all" ? "GIANNA" : WORKER_CONFIG[activeWorker as keyof typeof WORKER_CONFIG].name}...`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={3}
                      className="bg-zinc-800 border-zinc-700 resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">
                        {replyText.length}/160 (
                        {Math.ceil(replyText.length / 160) || 1} segment
                        {Math.ceil(replyText.length / 160) !== 1 ? "s" : ""})
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedConversation(null);
                            setReplyText("");
                          }}
                        >
                          Close
                        </Button>
                        <Button
                          onClick={handleSendReply}
                          disabled={!replyText.trim() || sending}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {sending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4 mr-2" />
                          )}
                          Send
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-500">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">Select a conversation</p>
                  <p className="text-sm mt-1">
                    Choose a lead from the list to view the thread
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
