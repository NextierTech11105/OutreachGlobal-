"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Inbox,
  ThumbsUp,
  HelpCircle,
  Phone,
  AlertTriangle,
  Ban,
  Shield,
  ArrowRight,
  Sparkles,
  Flame,
  Star,
  Zap,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface InboxItem {
  id: string;
  leadName: string;
  phone: string;
  message: string;
  classification: string;
  priority: "HOT" | "WARM" | "COLD" | "URGENT";
  priorityScore: number;
  timestamp: Date;
  campaignName?: string;
  sdrName?: string;
}

interface Bucket {
  id: string;
  type: string;
  name: string;
  color: string;
  glowColor: string;
  icon: React.ReactNode;
  items: InboxItem[];
  count: number;
}

// Priority badge component
const PriorityBadge = ({ priority }: { priority: string }) => {
  const config = {
    HOT: { icon: Flame, color: "text-red-500", bg: "bg-red-500/20", glow: "shadow-red-500/50" },
    WARM: { icon: Zap, color: "text-orange-500", bg: "bg-orange-500/20", glow: "shadow-orange-500/50" },
    COLD: { icon: Clock, color: "text-blue-500", bg: "bg-blue-500/20", glow: "shadow-blue-500/50" },
    URGENT: { icon: Sparkles, color: "text-purple-500", bg: "bg-purple-500/20", glow: "shadow-purple-500/50" },
  }[priority] || { icon: Clock, color: "text-gray-500", bg: "bg-gray-500/20", glow: "" };

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        config.bg,
        config.color,
        priority === "HOT" || priority === "URGENT" ? "animate-pulse" : ""
      )}
    >
      <Icon className="w-3 h-3" />
      {priority}
    </motion.div>
  );
};

// Individual card component
const ResponseCard = ({
  item,
  onDragEnd,
  isNew,
}: {
  item: InboxItem;
  onDragEnd?: () => void;
  isNew?: boolean;
}) => {
  return (
    <motion.div
      layout
      initial={isNew ? { scale: 0.8, opacity: 0, y: -20 } : false}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0, x: 100 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      drag
      dragSnapToOrigin
      onDragEnd={onDragEnd}
      className={cn(
        "bg-zinc-800/80 backdrop-blur-sm border border-zinc-700/50 rounded-lg p-3 cursor-grab active:cursor-grabbing",
        "hover:border-zinc-600 hover:shadow-lg transition-all duration-200",
        item.priority === "HOT" && "border-l-4 border-l-red-500",
        item.priority === "URGENT" && "border-l-4 border-l-purple-500 animate-pulse"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-zinc-100 truncate">{item.leadName}</p>
          <p className="text-xs text-zinc-500">{item.phone}</p>
        </div>
        <PriorityBadge priority={item.priority} />
      </div>

      <p className="text-sm text-zinc-400 line-clamp-2 mb-2">{item.message}</p>

      <div className="flex items-center justify-between text-xs text-zinc-500">
        {item.campaignName && (
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {item.campaignName}
          </span>
        )}
        <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
      </div>

      {item.sdrName && (
        <div className="mt-2 pt-2 border-t border-zinc-700/50">
          <span className="text-xs text-indigo-400 flex items-center gap-1">
            <Star className="w-3 h-3" />
            {item.sdrName}
          </span>
        </div>
      )}
    </motion.div>
  );
};

// Bucket column component
const BucketColumn = ({
  bucket,
  onItemMove,
  onItemClick,
}: {
  bucket: Bucket;
  onItemMove: (itemId: string, toBucket: string) => void;
  onItemClick: (item: InboxItem) => void;
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col bg-zinc-900/50 backdrop-blur-sm rounded-xl border border-zinc-800 min-w-[300px] max-w-[300px]",
        isDragOver && "border-2 border-dashed",
        isDragOver && `border-[${bucket.color}]`
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={() => setIsDragOver(false)}
    >
      {/* Header */}
      <div
        className="p-4 border-b border-zinc-800 rounded-t-xl"
        style={{
          background: `linear-gradient(135deg, ${bucket.color}20, transparent)`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              whileHover={{ rotate: 10, scale: 1.1 }}
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${bucket.color}30` }}
            >
              {bucket.icon}
            </motion.div>
            <div>
              <h3 className="font-semibold text-zinc-100">{bucket.name}</h3>
              <p className="text-xs text-zinc-500">{bucket.count} items</p>
            </div>
          </div>

          {/* Count badge with animation */}
          <motion.div
            key={bucket.count}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
              bucket.count > 0 ? "text-white" : "text-zinc-500"
            )}
            style={{
              backgroundColor: bucket.count > 0 ? bucket.color : "transparent",
              boxShadow: bucket.count > 0 ? `0 0 20px ${bucket.glowColor}` : "none",
            }}
          >
            {bucket.count}
          </motion.div>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-zinc-700">
        <AnimatePresence mode="popLayout">
          {bucket.items.map((item) => (
            <div key={item.id} onClick={() => onItemClick(item)}>
              <ResponseCard item={item} />
            </div>
          ))}
        </AnimatePresence>

        {bucket.items.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-8 text-zinc-600"
          >
            <CheckCircle2 className="w-8 h-8 mb-2" />
            <p className="text-sm">All clear!</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// Progress ring component
const ProgressRing = ({ progress, size = 60, strokeWidth = 4 }: { progress: number; size?: number; strokeWidth?: number }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-zinc-800"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <motion.circle
          className="text-indigo-500"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{
            strokeDasharray: circumference,
            filter: "drop-shadow(0 0 6px rgb(99 102 241 / 0.5))",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-zinc-100">{progress}%</span>
      </div>
    </div>
  );
};

// Main Kanban component
export function ResponseKanban() {
  const [buckets, setBuckets] = useState<Bucket[]>([
    {
      id: "universal_inbox",
      type: "UNIVERSAL_INBOX",
      name: "Universal Inbox",
      color: "#6366f1",
      glowColor: "rgba(99, 102, 241, 0.5)",
      icon: <Inbox className="w-5 h-5 text-indigo-400" />,
      items: [],
      count: 0,
    },
    {
      id: "positive",
      type: "POSITIVE_RESPONSES",
      name: "Positive",
      color: "#22c55e",
      glowColor: "rgba(34, 197, 94, 0.5)",
      icon: <ThumbsUp className="w-5 h-5 text-green-400" />,
      items: [],
      count: 0,
    },
    {
      id: "neutral",
      type: "NEUTRAL_REVIEW",
      name: "Neutral Review",
      color: "#f59e0b",
      glowColor: "rgba(245, 158, 11, 0.5)",
      icon: <HelpCircle className="w-5 h-5 text-amber-400" />,
      items: [],
      count: 0,
    },
    {
      id: "wrong_number",
      type: "WRONG_NUMBER",
      name: "Wrong Number",
      color: "#8b5cf6",
      glowColor: "rgba(139, 92, 246, 0.5)",
      icon: <Phone className="w-5 h-5 text-violet-400" />,
      items: [],
      count: 0,
    },
    {
      id: "profanity",
      type: "PROFANITY_REVIEW",
      name: "Profanity Review",
      color: "#ef4444",
      glowColor: "rgba(239, 68, 68, 0.5)",
      icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
      items: [],
      count: 0,
    },
    {
      id: "blacklist",
      type: "BLACKLIST",
      name: "Blacklist",
      color: "#1f2937",
      glowColor: "rgba(31, 41, 55, 0.5)",
      icon: <Ban className="w-5 h-5 text-zinc-400" />,
      items: [],
      count: 0,
    },
    {
      id: "legal_dnc",
      type: "LEGAL_DNC",
      name: "Legal DNC",
      color: "#0ea5e9",
      glowColor: "rgba(14, 165, 233, 0.5)",
      icon: <Shield className="w-5 h-5 text-sky-400" />,
      items: [],
      count: 0,
    },
  ]);

  const [stats, setStats] = useState({
    processedToday: 0,
    dailyGoal: 50,
    streak: 0,
    positiveRate: 0,
  });

  const handleItemMove = (itemId: string, toBucket: string) => {
    // Handle item movement between buckets
    console.log(`Moving ${itemId} to ${toBucket}`);
  };

  const handleItemClick = (item: InboxItem) => {
    // Handle item click - open detail view
    console.log("Clicked item:", item);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header Stats */}
      <div className="border-b border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-400" />
              Response Pipeline
            </h1>
            <p className="text-zinc-500 mt-1">AI-powered response triage</p>
          </div>

          <div className="flex items-center gap-6">
            {/* Daily Progress */}
            <div className="flex items-center gap-3">
              <ProgressRing progress={Math.round((stats.processedToday / stats.dailyGoal) * 100)} />
              <div>
                <p className="text-sm text-zinc-400">Daily Goal</p>
                <p className="font-semibold">
                  {stats.processedToday}/{stats.dailyGoal}
                </p>
              </div>
            </div>

            {/* Streak */}
            <div className="flex items-center gap-2 bg-orange-500/20 px-4 py-2 rounded-lg">
              <Flame className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-xs text-orange-400">Streak</p>
                <p className="font-bold text-orange-500">{stats.streak} days</p>
              </div>
            </div>

            {/* Positive Rate */}
            <div className="flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-lg">
              <ThumbsUp className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-xs text-green-400">Positive Rate</p>
                <p className="font-bold text-green-500">{stats.positiveRate}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="p-6 overflow-x-auto">
        <div className="flex gap-4 pb-4">
          {buckets.map((bucket) => (
            <BucketColumn
              key={bucket.id}
              bucket={bucket}
              onItemMove={handleItemMove}
              onItemClick={handleItemClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ResponseKanban;
