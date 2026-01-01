"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  RotateCcw,
  Laugh,
  FileText,
  Calendar,
  Clock,
  Play,
  Pause,
  ChevronRight,
  Zap,
  Target,
  Anchor,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Block types and their visual config - simplified shaded colors like inbox labels
const BLOCK_TYPES = {
  initial: {
    label: "INITIAL",
    sublabel: "gianna",
    icon: MessageSquare,
    color: "bg-purple-50 dark:bg-purple-950/50",
    borderColor: "border-purple-200 dark:border-purple-800",
    textColor: "text-purple-700 dark:text-purple-300",
    badgeColor:
      "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300",
    hoverBg: "hover:bg-purple-100 dark:hover:bg-purple-900/70",
  },
  retarget: {
    label: "RETARGET",
    sublabel: "gianna",
    icon: RotateCcw,
    color: "bg-blue-50 dark:bg-blue-950/50",
    borderColor: "border-blue-200 dark:border-blue-800",
    textColor: "text-blue-700 dark:text-blue-300",
    badgeColor:
      "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300",
    hoverBg: "hover:bg-blue-100 dark:hover:bg-blue-900/70",
  },
  nudger: {
    label: "NUDGER",
    sublabel: "cathy",
    icon: Laugh,
    color: "bg-orange-50 dark:bg-orange-950/50",
    borderColor: "border-orange-200 dark:border-orange-800",
    textColor: "text-orange-700 dark:text-orange-300",
    badgeColor:
      "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300",
    hoverBg: "hover:bg-orange-100 dark:hover:bg-orange-900/70",
  },
  nurture: {
    label: "NURTURE",
    sublabel: "gianna",
    icon: FileText,
    color: "bg-cyan-50 dark:bg-cyan-950/50",
    borderColor: "border-cyan-200 dark:border-cyan-800",
    textColor: "text-cyan-700 dark:text-cyan-300",
    badgeColor:
      "bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300",
    hoverBg: "hover:bg-cyan-100 dark:hover:bg-cyan-900/70",
  },
  book: {
    label: "BOOK",
    sublabel: "sabrina",
    icon: Calendar,
    color: "bg-emerald-50 dark:bg-emerald-950/50",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    textColor: "text-emerald-700 dark:text-emerald-300",
    badgeColor:
      "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300",
    hoverBg: "hover:bg-emerald-100 dark:hover:bg-emerald-900/70",
  },
  anchor: {
    label: "ANCHOR",
    sublabel: "archive",
    icon: Anchor,
    color: "bg-slate-50 dark:bg-slate-950/50",
    borderColor: "border-slate-200 dark:border-slate-800",
    textColor: "text-slate-700 dark:text-slate-300",
    badgeColor:
      "bg-slate-100 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300",
    hoverBg: "hover:bg-slate-100 dark:hover:bg-slate-900/70",
  },
} as const;

type BlockType = keyof typeof BLOCK_TYPES;

interface CampaignBlock {
  id: string;
  type: BlockType;
  count: number;
  target: number;
  responseRate: number;
  status: "idle" | "active" | "complete" | "paused";
  signals: number; // Stacking weight from responses
}

// Blocks loaded from API - starts empty
const INITIAL_BLOCKS: CampaignBlock[] = [];

interface BlockCardProps {
  block: CampaignBlock;
  onActivate: (id: string) => void;
  onPause: (id: string) => void;
  isSelected: boolean;
  onClick: () => void;
}

function BlockCard({
  block,
  onActivate,
  onPause,
  isSelected,
  onClick,
}: BlockCardProps) {
  const config = BLOCK_TYPES[block.type];
  const Icon = config.icon;
  const progress = Math.round((block.count / block.target) * 100);
  const isAnchored = block.type === "anchor";

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative cursor-pointer select-none",
        "w-full aspect-square min-h-[180px]",
        "rounded-xl border",
        config.color,
        config.borderColor,
        config.hoverBg,
        "shadow-sm",
        "transition-all duration-200",
        isSelected && "ring-2 ring-primary ring-offset-2",
        block.status === "active" && "ring-2 ring-green-500",
      )}
    >
      {/* Signal stacking indicator - confluence weight */}
      {block.signals > 0 && (
        <div
          className={cn(
            "absolute -top-2 -right-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-mono",
            config.badgeColor,
          )}
        >
          <Zap className="w-3 h-3" />
          <span>{block.signals}x</span>
        </div>
      )}

      {/* Block content */}
      <div className="absolute inset-0 p-4 flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <span
              className={cn(
                "inline-flex px-2 py-0.5 rounded text-xs font-medium mb-1",
                config.badgeColor,
              )}
            >
              {config.sublabel.toUpperCase()}
            </span>
            <div
              className={cn(
                "text-lg font-bold tracking-tight",
                config.textColor,
              )}
            >
              {config.label}
            </div>
          </div>
          <div
            className={cn(
              "p-2 rounded-lg",
              config.badgeColor,
              block.status === "active" && "ring-2 ring-green-500",
            )}
          >
            <Icon className={cn("w-5 h-5", config.textColor)} />
          </div>
        </div>

        {/* Progress section */}
        <div className="space-y-2">
          {/* Count display */}
          <div className="flex items-baseline justify-between">
            <span
              className={cn(
                "text-3xl font-bold font-mono tabular-nums",
                config.textColor,
              )}
            >
              {block.count.toLocaleString()}
            </span>
            <span className="text-sm font-mono text-muted-foreground">
              / {block.target.toLocaleString()}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full",
                block.status === "active" ? "bg-green-500" : "bg-primary/60",
              )}
            />
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between text-xs font-mono">
            <div className={cn("flex items-center gap-1", config.textColor)}>
              <Target className="w-3 h-3" />
              <span>{block.responseRate}% resp</span>
            </div>
            <div
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider",
                block.status === "active" &&
                  "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300",
                block.status === "complete" &&
                  "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300",
                block.status === "paused" &&
                  "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300",
                block.status === "idle" &&
                  "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
              )}
            >
              {block.status}
            </div>
          </div>
        </div>
      </div>

      {/* Action button overlay - appears on hover */}
      <div className="absolute inset-0 bg-background/0 hover:bg-background/60 transition-colors rounded-xl flex items-center justify-center opacity-0 hover:opacity-100">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            if (block.status === "active") {
              onPause(block.id);
            } else {
              onActivate(block.id);
            }
          }}
          className={cn(
            "p-4 rounded-full",
            "bg-primary text-primary-foreground",
            "shadow-lg",
            "transition-all",
          )}
        >
          {block.status === "active" ? (
            <Pause className="w-8 h-8" />
          ) : (
            <Play className="w-8 h-8" />
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

interface MonthlyPoolProps {
  used: number;
  total: number;
}

function MonthlyPool({ used, total }: MonthlyPoolProps) {
  const percentage = Math.round((used / total) * 100);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-zinc-500" />
          <span className="text-sm font-mono text-zinc-400">MONTHLY POOL</span>
        </div>
        <span className="text-sm font-mono text-zinc-500">
          {new Date().toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-4xl font-bold font-mono text-white tabular-nums">
          {used.toLocaleString()}
        </span>
        <span className="text-xl font-mono text-zinc-500">
          / {total.toLocaleString()}
        </span>
      </div>

      <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn(
            "h-full rounded-full",
            percentage < 50 && "bg-gradient-to-r from-green-500 to-green-400",
            percentage >= 50 &&
              percentage < 80 &&
              "bg-gradient-to-r from-yellow-500 to-yellow-400",
            percentage >= 80 && "bg-gradient-to-r from-red-500 to-red-400",
          )}
        />
      </div>

      <div className="flex justify-between mt-2 text-xs font-mono text-zinc-500">
        <span>{percentage}% used</span>
        <span>{(total - used).toLocaleString()} remaining</span>
      </div>
    </div>
  );
}

export function CampaignBlocksBoard() {
  const [blocks, setBlocks] = useState<CampaignBlock[]>(INITIAL_BLOCKS);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [monthlyUsed, setMonthlyUsed] = useState(0);
  const [monthlyTotal] = useState(20000);

  // TODO: Fetch real blocks from API
  // useEffect(() => {
  //   fetch('/api/campaigns/blocks').then(r => r.json()).then(data => {
  //     setBlocks(data.blocks);
  //     setMonthlyUsed(data.monthlyUsed);
  //   });
  // }, []);

  const handleActivate = useCallback((id: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "active" as const } : b)),
    );
  }, []);

  const handlePause = useCallback((id: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "paused" as const } : b)),
    );
  }, []);

  const activeBlocks = blocks.filter((b) => b.type !== "anchor");
  const anchorBlocks = blocks.filter((b) => b.type === "anchor");

  return (
    <div className="space-y-6">
      {/* Monthly Pool */}
      <MonthlyPool used={monthlyUsed} total={monthlyTotal} />

      {/* Main grid - campaign blocks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-mono text-zinc-400 uppercase tracking-wider">
            ACTIVE BLOCKS
          </h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-mono text-zinc-300 transition-colors"
          >
            <span>ADD BLOCK</span>
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {activeBlocks.map((block) => (
              <BlockCard
                key={block.id}
                block={block}
                onActivate={handleActivate}
                onPause={handlePause}
                isSelected={selectedBlock === block.id}
                onClick={() =>
                  setSelectedBlock(block.id === selectedBlock ? null : block.id)
                }
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Anchor zone - archived leads */}
      <div className="space-y-4 pt-4 border-t border-zinc-800">
        <div className="flex items-center gap-2">
          <Anchor className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-mono text-zinc-500 uppercase tracking-wider">
            ANCHOR ZONE
          </h3>
          <span className="text-xs font-mono text-zinc-600">
            no response after 2 weeks
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {anchorBlocks.map((block) => (
            <BlockCard
              key={block.id}
              block={block}
              onActivate={handleActivate}
              onPause={handlePause}
              isSelected={selectedBlock === block.id}
              onClick={() =>
                setSelectedBlock(block.id === selectedBlock ? null : block.id)
              }
            />
          ))}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
        <div className="text-center">
          <div className="text-3xl font-bold font-mono text-white">
            {blocks.reduce((acc, b) => acc + b.count, 0).toLocaleString()}
          </div>
          <div className="text-xs font-mono text-zinc-500 uppercase">
            Total Contacts
          </div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold font-mono text-green-400">
            {Math.round(
              blocks.reduce((acc, b) => acc + b.responseRate, 0) /
                blocks.filter((b) => b.responseRate > 0).length || 0,
            )}
            %
          </div>
          <div className="text-xs font-mono text-zinc-500 uppercase">
            Avg Response
          </div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold font-mono text-yellow-400">
            {blocks.reduce((acc, b) => acc + b.signals, 0)}
          </div>
          <div className="text-xs font-mono text-zinc-500 uppercase">
            Confluence
          </div>
        </div>
      </div>
    </div>
  );
}
