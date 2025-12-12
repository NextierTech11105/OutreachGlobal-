"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox,
  Flame,
  Zap,
  Clock,
  Sparkles,
  Filter,
  Search,
  ChevronRight,
  MessageSquare,
  Phone,
  Star,
  CheckCircle2,
  AlertCircle,
  Bot,
  ArrowUpRight,
  RefreshCw,
  SlidersHorizontal,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
type Priority = "HOT" | "WARM" | "COLD" | "URGENT";
type Classification =
  | "POSITIVE"
  | "NEUTRAL"
  | "WRONG_NUMBER"
  | "PROFANITY"
  | "DNC_REQUEST"
  | "UNCLASSIFIED";

interface InboxMessage {
  id: string;
  leadId: string;
  leadName: string;
  phone: string;
  message: string;
  classification: Classification;
  classificationConfidence: number;
  priority: Priority;
  priorityScore: number;
  sentiment: string;
  intent: string;
  suggestedAction: string;
  campaignId?: string;
  campaignName?: string;
  assignedSdrId?: string;
  assignedSdrName?: string;
  initialMessageId?: string;
  isRead: boolean;
  isStarred: boolean;
  requiresReview: boolean;
  timestamp: Date;
  aiNotes?: string;
}

interface SdrAssignment {
  sdrId: string;
  sdrName: string;
  campaignId: string;
  initialMessageId: string;
  initialMessageContent: string;
}

// Priority configuration
const priorityConfig = {
  URGENT: {
    icon: Sparkles,
    color: "#a855f7",
    label: "Urgent",
    glow: "rgba(168, 85, 247, 0.5)",
  },
  HOT: {
    icon: Flame,
    color: "#ef4444",
    label: "Hot",
    glow: "rgba(239, 68, 68, 0.5)",
  },
  WARM: {
    icon: Zap,
    color: "#f59e0b",
    label: "Warm",
    glow: "rgba(245, 158, 11, 0.5)",
  },
  COLD: {
    icon: Clock,
    color: "#3b82f6",
    label: "Cold",
    glow: "rgba(59, 130, 246, 0.5)",
  },
};

const classificationConfig = {
  POSITIVE: { color: "#22c55e", label: "Positive" },
  NEUTRAL: { color: "#f59e0b", label: "Neutral" },
  WRONG_NUMBER: { color: "#8b5cf6", label: "Wrong Number" },
  PROFANITY: { color: "#ef4444", label: "Profanity" },
  DNC_REQUEST: { color: "#06b6d4", label: "DNC Request" },
  UNCLASSIFIED: { color: "#6b7280", label: "Unclassified" },
};

// Priority Score Calculator
function calculatePriorityScore(message: Partial<InboxMessage>): number {
  let score = 50; // Base score

  // Classification boosts
  if (message.classification === "POSITIVE") score += 30;
  if (message.classification === "NEUTRAL") score += 10;
  if (message.classification === "DNC_REQUEST") score += 20; // Needs quick action

  // Sentiment boosts
  if (message.sentiment === "positive") score += 15;
  if (message.sentiment === "negative") score -= 10;

  // Intent boosts
  if (message.intent === "interested") score += 25;
  if (message.intent === "question") score += 15;

  // Confidence penalty
  if (
    message.classificationConfidence &&
    message.classificationConfidence < 70
  ) {
    score += 10; // Needs human review
  }

  // Time decay - newer messages get slight boost
  const ageMinutes = message.timestamp
    ? (Date.now() - new Date(message.timestamp).getTime()) / 60000
    : 0;
  if (ageMinutes < 5) score += 10;
  else if (ageMinutes < 30) score += 5;

  return Math.min(100, Math.max(0, score));
}

// Determine priority from score
function getPriorityFromScore(score: number): Priority {
  if (score >= 85) return "URGENT";
  if (score >= 70) return "HOT";
  if (score >= 40) return "WARM";
  return "COLD";
}

// Message Card Component
function InboxMessageCard({
  message,
  onSelect,
  onAssignSdr,
  isSelected,
}: {
  message: InboxMessage;
  onSelect: () => void;
  onAssignSdr: (sdrAssignment: SdrAssignment) => void;
  isSelected: boolean;
}) {
  const priority = priorityConfig[message.priority];
  const classification = classificationConfig[message.classification];
  const PriorityIcon = priority.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      whileHover={{ x: 4 }}
      onClick={onSelect}
      className={cn(
        "relative bg-zinc-900/50 border rounded-lg p-4 cursor-pointer transition-all",
        isSelected
          ? "border-indigo-500 bg-indigo-500/10"
          : "border-zinc-800 hover:border-zinc-700",
        !message.isRead && "border-l-4",
        message.priority === "HOT" && !message.isRead && "border-l-red-500",
        message.priority === "URGENT" &&
          !message.isRead &&
          "border-l-purple-500",
        message.requiresReview && "ring-1 ring-amber-500/50",
      )}
    >
      {/* Priority indicator glow */}
      {(message.priority === "HOT" || message.priority === "URGENT") && (
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{ boxShadow: `inset 0 0 20px ${priority.glow}` }}
        />
      )}

      <div className="relative flex gap-4">
        {/* Priority Badge */}
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${priority.color}20` }}
        >
          <PriorityIcon className="w-6 h-6" style={{ color: priority.color }} />
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "font-medium",
                  !message.isRead && "text-zinc-100",
                )}
              >
                {message.leadName}
              </span>
              {message.isStarred && (
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              )}
              {message.requiresReview && (
                <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
                  Review
                </span>
              )}
            </div>
            <span className="text-xs text-zinc-500 flex-shrink-0">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>

          <p className="text-sm text-zinc-400 mb-2">{message.phone}</p>

          <p
            className={cn(
              "text-sm line-clamp-2 mb-3",
              !message.isRead ? "text-zinc-200" : "text-zinc-400",
            )}
          >
            {message.message}
          </p>

          {/* Tags Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Classification */}
            <span
              className="px-2 py-0.5 text-xs rounded-full"
              style={{
                backgroundColor: `${classification.color}20`,
                color: classification.color,
              }}
            >
              {classification.label}
            </span>

            {/* Confidence */}
            <span className="px-2 py-0.5 text-xs bg-zinc-800 text-zinc-400 rounded-full">
              {message.classificationConfidence}% confident
            </span>

            {/* Priority Score */}
            <span
              className="px-2 py-0.5 text-xs rounded-full"
              style={{
                backgroundColor: `${priority.color}20`,
                color: priority.color,
              }}
            >
              Score: {message.priorityScore}
            </span>

            {/* Campaign */}
            {message.campaignName && (
              <span className="px-2 py-0.5 text-xs bg-indigo-500/20 text-indigo-400 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {message.campaignName}
              </span>
            )}
          </div>

          {/* AI Suggestion */}
          {message.suggestedAction && (
            <div className="mt-3 p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
              <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                <Bot className="w-3 h-3" />
                AI Suggestion
              </div>
              <p className="text-sm text-zinc-300">{message.suggestedAction}</p>
            </div>
          )}

          {/* SDR Assignment */}
          {message.assignedSdrName && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <Bot className="w-4 h-4 text-indigo-400" />
              <span className="text-indigo-400">{message.assignedSdrName}</span>
              <span className="text-zinc-500">assigned</span>
            </div>
          )}
        </div>

        {/* Action Arrow */}
        <ChevronRight className="w-5 h-5 text-zinc-600 flex-shrink-0 self-center" />
      </div>
    </motion.div>
  );
}

// Stats Bar Component
function InboxStats({ messages }: { messages: InboxMessage[] }) {
  const stats = useMemo(() => {
    const urgent = messages.filter((m) => m.priority === "URGENT").length;
    const hot = messages.filter((m) => m.priority === "HOT").length;
    const unread = messages.filter((m) => !m.isRead).length;
    const positive = messages.filter(
      (m) => m.classification === "POSITIVE",
    ).length;
    const needsReview = messages.filter((m) => m.requiresReview).length;

    return { urgent, hot, unread, positive, needsReview };
  }, [messages]);

  return (
    <div className="flex items-center gap-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <p className="text-lg font-bold text-purple-400">{stats.urgent}</p>
          <p className="text-xs text-zinc-500">Urgent</p>
        </div>
      </div>

      <div className="w-px h-8 bg-zinc-800" />

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
          <Flame className="w-4 h-4 text-red-400" />
        </div>
        <div>
          <p className="text-lg font-bold text-red-400">{stats.hot}</p>
          <p className="text-xs text-zinc-500">Hot</p>
        </div>
      </div>

      <div className="w-px h-8 bg-zinc-800" />

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
        </div>
        <div>
          <p className="text-lg font-bold text-green-400">{stats.positive}</p>
          <p className="text-xs text-zinc-500">Positive</p>
        </div>
      </div>

      <div className="w-px h-8 bg-zinc-800" />

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
          <AlertCircle className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <p className="text-lg font-bold text-amber-400">
            {stats.needsReview}
          </p>
          <p className="text-xs text-zinc-500">Review</p>
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-zinc-400" />
        <span className="text-sm text-zinc-400">{stats.unread} unread</span>
      </div>
    </div>
  );
}

// Main Universal Inbox Component
export function UniversalInbox() {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<{
    priority?: Priority;
    classification?: Classification;
    showUnreadOnly: boolean;
  }>({ showUnreadOnly: false });
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sort and filter messages
  const sortedMessages = useMemo(() => {
    let filtered = [...messages];

    // Apply filters
    if (filter.priority) {
      filtered = filtered.filter((m) => m.priority === filter.priority);
    }
    if (filter.classification) {
      filtered = filtered.filter(
        (m) => m.classification === filter.classification,
      );
    }
    if (filter.showUnreadOnly) {
      filtered = filtered.filter((m) => !m.isRead);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.leadName.toLowerCase().includes(query) ||
          m.message.toLowerCase().includes(query) ||
          m.phone.includes(query),
      );
    }

    // Sort by priority score (highest first), then by timestamp (newest first)
    return filtered.sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [messages, filter, searchQuery]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleAssignSdr = (messageId: string, assignment: SdrAssignment) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              assignedSdrId: assignment.sdrId,
              assignedSdrName: assignment.sdrName,
              initialMessageId: assignment.initialMessageId,
            }
          : m,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center"
            >
              <Inbox className="w-5 h-5 text-indigo-400" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold">Universal Inbox</h1>
              <p className="text-sm text-zinc-500">
                AI-prioritized response queue
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              <RefreshCw
                className={cn(
                  "w-5 h-5 text-zinc-400",
                  isRefreshing && "animate-spin",
                )}
              />
            </motion.button>
          </div>
        </div>

        {/* Stats */}
        <InboxStats messages={messages} />
      </div>

      {/* Filters */}
      <div className="border-b border-zinc-800 p-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-2">
            {(["URGENT", "HOT", "WARM", "COLD"] as Priority[]).map(
              (priority) => {
                const config = priorityConfig[priority];
                const Icon = config.icon;
                const isActive = filter.priority === priority;

                return (
                  <motion.button
                    key={priority}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() =>
                      setFilter((f) => ({
                        ...f,
                        priority:
                          f.priority === priority ? undefined : priority,
                      }))
                    }
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-all",
                      isActive
                        ? "bg-opacity-100"
                        : "bg-zinc-800 hover:bg-zinc-700",
                    )}
                    style={{
                      backgroundColor: isActive
                        ? `${config.color}30`
                        : undefined,
                      color: isActive ? config.color : undefined,
                      boxShadow: isActive
                        ? `0 0 10px ${config.glow}`
                        : undefined,
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </motion.button>
                );
              },
            )}
          </div>

          {/* Unread Toggle */}
          <button
            onClick={() =>
              setFilter((f) => ({ ...f, showUnreadOnly: !f.showUnreadOnly }))
            }
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm transition-colors",
              filter.showUnreadOnly
                ? "bg-indigo-500/20 text-indigo-400"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700",
            )}
          >
            Unread only
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="p-6">
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {sortedMessages.map((message) => (
              <InboxMessageCard
                key={message.id}
                message={message}
                isSelected={selectedMessage === message.id}
                onSelect={() => setSelectedMessage(message.id)}
                onAssignSdr={(assignment) =>
                  handleAssignSdr(message.id, assignment)
                }
              />
            ))}
          </AnimatePresence>

          {sortedMessages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-100">Inbox Zero!</h3>
              <p className="text-zinc-500">All caught up. Great work!</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// Export prioritization utilities
export { calculatePriorityScore, getPriorityFromScore };
export default UniversalInbox;
