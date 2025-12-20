"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox,
  MessageCircle,
  Phone,
  Clock,
  User,
  RefreshCw,
  ChevronRight,
  Send,
  Loader2,
  Filter,
  Search,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Bot,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type WorkerId = "gianna" | "cathy" | "sabrina";

interface InboxMessage {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  message: string;
  direction: "inbound" | "outbound";
  status: "new" | "read" | "replied" | "archived";
  classification?: string;
  sentiment?: "positive" | "negative" | "neutral";
  createdAt: Date;
  campaign?: string;
}

interface WorkerInboxProps {
  workerId: WorkerId;
  teamId: string;
  phoneNumber?: string;
  onHandoff?: (leadId: string, toWorker: WorkerId) => void;
  className?: string;
}

const WORKER_CONFIG = {
  gianna: {
    name: "GIANNA",
    role: "Opener",
    color: "purple",
    icon: Sparkles,
    description: "Initial outreach and email capture",
    gradient: "from-purple-500 to-indigo-600",
  },
  cathy: {
    name: "CATHY",
    role: "Nudger",
    color: "orange",
    icon: MessageCircle,
    description: "Humor-based re-engagement",
    gradient: "from-orange-500 to-amber-600",
  },
  sabrina: {
    name: "SABRINA",
    role: "Closer",
    color: "emerald",
    icon: CheckCircle2,
    description: "Objection handling and booking",
    gradient: "from-emerald-500 to-teal-600",
  },
};

export function WorkerInbox({
  workerId,
  teamId,
  phoneNumber,
  onHandoff,
  className,
}: WorkerInboxProps) {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<"all" | "new" | "replied">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const config = WORKER_CONFIG[workerId];
  const Icon = config.icon;

  // Fetch inbox messages
  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/workers/inbox?worker=${workerId}&teamId=${teamId}&phoneNumber=${phoneNumber || ""}`
      );
      const data = await response.json();

      if (data.success) {
        setMessages(
          data.messages.map((m: any) => ({
            ...m,
            createdAt: new Date(m.createdAt),
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch inbox:", error);
    } finally {
      setLoading(false);
    }
  }, [workerId, teamId, phoneNumber]);

  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 30 seconds
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
    toast.success("Inbox refreshed");
  };

  // Send reply
  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;

    setSending(true);
    try {
      const response = await fetch(`/api/${workerId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: selectedMessage.leadId,
          leadPhone: selectedMessage.leadPhone,
          message: replyText,
          teamId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Reply sent!");
        setReplyText("");
        setSelectedMessage(null);
        fetchMessages();
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

  // Handle handoff to another worker
  const handleHandoff = (toWorker: WorkerId) => {
    if (!selectedMessage || !onHandoff) return;
    onHandoff(selectedMessage.leadId, toWorker);
    toast.success(`Handed off to ${WORKER_CONFIG[toWorker].name}`);
    setSelectedMessage(null);
  };

  // Filter and search messages
  const filteredMessages = messages.filter((m) => {
    if (filter === "new" && m.status !== "new") return false;
    if (filter === "replied" && m.status !== "replied") return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        m.leadName.toLowerCase().includes(query) ||
        m.leadPhone.includes(query) ||
        m.message.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Count unread
  const unreadCount = messages.filter((m) => m.status === "new").length;

  return (
    <div className={cn("flex flex-col h-full bg-zinc-900/50 rounded-lg border border-zinc-800", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br",
              config.gradient
            )}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-zinc-100 flex items-center gap-2">
              {config.name} Inbox
              {unreadCount > 0 && (
                <Badge variant="secondary" className="bg-red-500/20 text-red-400">
                  {unreadCount} new
                </Badge>
              )}
            </h3>
            <p className="text-xs text-zinc-400">
              {phoneNumber || "No phone assigned"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={cn("w-4 h-4", refreshing && "animate-spin")}
            />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 p-3 border-b border-zinc-800">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 bg-zinc-800/50 border-zinc-700"
          />
        </div>
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-[120px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="replied">Replied</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Message List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Inbox className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-sm">No messages found</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {filteredMessages.map((message) => (
              <motion.button
                key={message.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelectedMessage(message)}
                className={cn(
                  "w-full p-4 text-left hover:bg-zinc-800/50 transition-colors",
                  message.status === "new" && "bg-zinc-800/30",
                  selectedMessage?.id === message.id && "bg-zinc-800"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-zinc-100 truncate">
                        {message.leadName || message.leadPhone}
                      </span>
                      {message.status === "new" && (
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="text-sm text-zinc-400 line-clamp-2">
                      {message.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-zinc-500">
                        {formatDistanceToNow(message.createdAt, { addSuffix: true })}
                      </span>
                      {message.classification && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            message.classification === "interested" &&
                              "border-green-500/50 text-green-400",
                            message.classification === "question" &&
                              "border-blue-500/50 text-blue-400",
                            message.classification === "objection" &&
                              "border-orange-500/50 text-orange-400",
                            message.classification === "opt_out" &&
                              "border-red-500/50 text-red-400"
                          )}
                        >
                          {message.classification}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Message Detail Sheet */}
      <Sheet
        open={!!selectedMessage}
        onOpenChange={(open) => !open && setSelectedMessage(null)}
      >
        <SheetContent className="w-full sm:max-w-md bg-zinc-900 border-zinc-800">
          {selectedMessage && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-zinc-100">
                  <User className="w-4 h-4" />
                  {selectedMessage.leadName || selectedMessage.leadPhone}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                {/* Lead Info */}
                <div className="flex items-center gap-4 p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Phone className="w-4 h-4" />
                    {selectedMessage.leadPhone}
                  </div>
                  {selectedMessage.campaign && (
                    <Badge variant="outline" className="text-xs">
                      {selectedMessage.campaign}
                    </Badge>
                  )}
                </div>

                {/* Message */}
                <div className="p-4 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-zinc-500 mb-2">Inbound Message</p>
                  <p className="text-zinc-100">{selectedMessage.message}</p>
                  <p className="text-xs text-zinc-500 mt-2">
                    {formatDistanceToNow(selectedMessage.createdAt, {
                      addSuffix: true,
                    })}
                  </p>
                </div>

                {/* Classification */}
                {selectedMessage.classification && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">AI Classification:</span>
                    <Badge
                      className={cn(
                        "text-xs",
                        selectedMessage.classification === "interested" &&
                          "bg-green-500/20 text-green-400",
                        selectedMessage.classification === "question" &&
                          "bg-blue-500/20 text-blue-400",
                        selectedMessage.classification === "objection" &&
                          "bg-orange-500/20 text-orange-400"
                      )}
                    >
                      {selectedMessage.classification}
                    </Badge>
                  </div>
                )}

                {/* Reply Box */}
                <div className="space-y-3">
                  <Textarea
                    placeholder={`Reply as ${config.name}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      {replyText.length}/160 chars
                    </span>
                    <Button
                      onClick={handleSendReply}
                      disabled={!replyText.trim() || sending}
                      className={cn("bg-gradient-to-r", config.gradient)}
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Send Reply
                    </Button>
                  </div>
                </div>

                {/* Handoff Options */}
                {onHandoff && (
                  <div className="pt-4 border-t border-zinc-800">
                    <p className="text-xs text-zinc-500 mb-3">Hand off to:</p>
                    <div className="flex gap-2">
                      {(Object.keys(WORKER_CONFIG) as WorkerId[])
                        .filter((w) => w !== workerId)
                        .map((w) => {
                          const workerConfig = WORKER_CONFIG[w];
                          const WorkerIcon = workerConfig.icon;
                          return (
                            <Button
                              key={w}
                              variant="outline"
                              size="sm"
                              onClick={() => handleHandoff(w)}
                              className="flex-1"
                            >
                              <WorkerIcon className="w-4 h-4 mr-2" />
                              {workerConfig.name}
                            </Button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default WorkerInbox;
