"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MessageSquare,
  Phone,
  Mail,
  Voicemail,
  ChevronRight,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  Zap,
  Target,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import {
  OUTREACH_SEQUENCE,
  TOUCH_COLORS,
  type TouchPoint,
  type LeadTouchProgress,
  type SequenceStats,
} from "@/lib/workflows/outreach-sequence";
import { cn } from "@/lib/utils";

// Channel icon mapping
const ChannelIcon = ({ channel }: { channel: string }) => {
  switch (channel) {
    case "sms":
      return <MessageSquare className="h-4 w-4" />;
    case "call":
      return <Phone className="h-4 w-4" />;
    case "email":
      return <Mail className="h-4 w-4" />;
    case "voicemail":
      return <Voicemail className="h-4 w-4" />;
    default:
      return <MessageSquare className="h-4 w-4" />;
  }
};

// Mock data for visualization
const MOCK_STATS: SequenceStats = {
  totalActive: 847,
  byTouch: {
    1: 234,
    2: 156,
    3: 142,
    4: 98,
    5: 87,
    6: 54,
    7: 38,
    8: 22,
    9: 12,
    10: 4,
  },
  completedThisWeek: 23,
  convertedThisWeek: 8,
  responseRate: 34.2,
  avgTouchesToResponse: 3.7,
  optOutRate: 2.1,
};

const MOCK_QUEUE: { touch: number; count: number; nextBatch: string }[] = [
  { touch: 1, count: 45, nextBatch: "Today 10:00 AM" },
  { touch: 2, count: 32, nextBatch: "Today 2:00 PM" },
  { touch: 3, count: 28, nextBatch: "Tomorrow 9:30 AM" },
  { touch: 5, count: 15, nextBatch: "Tomorrow 2:00 PM" },
  { touch: 7, count: 12, nextBatch: "Friday 9:30 AM" },
];

export function OutreachPipeline() {
  const [stats] = useState<SequenceStats>(MOCK_STATS);
  const [selectedTouch, setSelectedTouch] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(true);

  // Calculate total in pipeline
  const totalInPipeline = Object.values(stats.byTouch).reduce(
    (a, b) => a + b,
    0,
  );

  return (
    <div className="space-y-6">
      {/* HEADER STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-black text-blue-400">
                  {totalInPipeline}
                </div>
                <div className="text-xs text-blue-300/70 uppercase tracking-wide">
                  In Pipeline
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-black text-green-400">
                  {stats.responseRate}%
                </div>
                <div className="text-xs text-green-300/70 uppercase tracking-wide">
                  Response Rate
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Target className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-black text-purple-400">
                  {stats.avgTouchesToResponse}
                </div>
                <div className="text-xs text-purple-300/70 uppercase tracking-wide">
                  Avg Touches
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-600/20 to-cyan-800/20 border-cyan-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <div className="text-2xl font-black text-cyan-400">
                  {stats.convertedThisWeek}
                </div>
                <div className="text-xs text-cyan-300/70 uppercase tracking-wide">
                  Converted
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 border-orange-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Clock className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <div className="text-2xl font-black text-orange-400">
                  {stats.completedThisWeek}
                </div>
                <div className="text-xs text-orange-300/70 uppercase tracking-wide">
                  Completed
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-600/20 to-red-800/20 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <div className="text-2xl font-black text-red-400">
                  {stats.optOutRate}%
                </div>
                <div className="text-xs text-red-300/70 uppercase tracking-wide">
                  Opt-Out Rate
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PIPELINE VISUALIZATION */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl font-black">
                10-TOUCH 30-DAY PIPELINE
              </CardTitle>
              <Badge
                className={cn(
                  "font-bold",
                  isRunning
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
                )}
              >
                {isRunning ? (
                  <>
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                    RUNNING
                  </>
                ) : (
                  <>
                    <Pause className="h-3 w-3 mr-1" />
                    PAUSED
                  </>
                )}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRunning(!isRunning)}
                className={cn(
                  "border-2",
                  isRunning
                    ? "border-yellow-500/50 text-yellow-400"
                    : "border-green-500/50 text-green-400",
                )}
              >
                {isRunning ? (
                  <Pause className="h-4 w-4 mr-1" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                {isRunning ? "PAUSE" : "RESUME"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-purple-500/50 text-purple-400"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                RESET
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* TIMELINE VIEW */}
          <div className="relative">
            {/* Connection line */}
            <div className="absolute top-8 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-green-500 via-yellow-500 to-red-500 opacity-30 rounded-full" />

            {/* Touch points */}
            <div className="flex justify-between relative">
              {OUTREACH_SEQUENCE.map((touch, index) => {
                const colors = TOUCH_COLORS[touch.position];
                const count = stats.byTouch[touch.position] || 0;
                const isSelected = selectedTouch === touch.position;

                return (
                  <TooltipProvider key={touch.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() =>
                            setSelectedTouch(isSelected ? null : touch.position)
                          }
                          className={cn(
                            "relative flex flex-col items-center p-2 rounded-xl transition-all",
                            isSelected
                              ? `${colors.bg} ${colors.border} border-2 scale-110`
                              : "hover:bg-zinc-800/50",
                          )}
                        >
                          {/* Touch number badge */}
                          <div
                            className={cn(
                              "w-12 h-12 rounded-full flex items-center justify-center border-2 mb-2",
                              colors.bg,
                              colors.border,
                            )}
                          >
                            <span
                              className={cn("text-lg font-black", colors.text)}
                            >
                              {touch.position}
                            </span>
                          </div>

                          {/* Channel icon */}
                          <div
                            className={cn("p-1.5 rounded-lg mb-1", colors.bg)}
                          >
                            <ChannelIcon channel={touch.channel} />
                          </div>

                          {/* Lead count */}
                          <div className="text-center">
                            <div
                              className={cn("text-lg font-bold", colors.text)}
                            >
                              {count}
                            </div>
                            <div className="text-[10px] text-zinc-500 uppercase">
                              leads
                            </div>
                          </div>

                          {/* Day indicator */}
                          <div className="text-[10px] text-zinc-600 mt-1">
                            Day {touch.dayOffset}
                          </div>

                          {/* Arrow to next */}
                          {index < OUTREACH_SEQUENCE.length - 1 && (
                            <ChevronRight className="absolute -right-2 top-8 h-4 w-4 text-zinc-600" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <div className="space-y-1">
                          <div className="font-bold">{touch.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {touch.purpose}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {touch.timeOfDay === "morning" && "9:00 - 11:00 AM"}
                            {touch.timeOfDay === "afternoon" &&
                              "1:00 - 3:00 PM"}
                            {touch.timeOfDay === "evening" && "5:00 - 7:00 PM"}
                          </div>
                          {touch.escalation && (
                            <div className="text-xs text-yellow-400 mt-1">
                              {touch.escalation}
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>

          {/* WEEK LABELS */}
          <div className="flex justify-between mt-4 px-4">
            <div className="text-center flex-1">
              <Badge variant="outline" className="text-xs">
                WEEK 1: INITIAL
              </Badge>
            </div>
            <div className="text-center flex-1">
              <Badge variant="outline" className="text-xs">
                WEEK 2: ENGAGE
              </Badge>
            </div>
            <div className="text-center flex-1">
              <Badge variant="outline" className="text-xs">
                WEEK 3: PERSIST
              </Badge>
            </div>
            <div className="text-center flex-1">
              <Badge variant="outline" className="text-xs">
                WEEK 4: FINAL
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* UPCOMING QUEUE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              NEXT UP IN QUEUE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {MOCK_QUEUE.map((item, i) => {
                  const touch = OUTREACH_SEQUENCE.find(
                    (t) => t.position === item.touch,
                  );
                  const colors = TOUCH_COLORS[item.touch];

                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        colors.bg,
                        colors.border,
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            colors.bg,
                          )}
                        >
                          <span
                            className={cn("text-sm font-bold", colors.text)}
                          >
                            #{item.touch}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold">{touch?.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <ChannelIcon channel={touch?.channel || "sms"} />
                            {touch?.channel.toUpperCase()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn("text-lg font-bold", colors.text)}>
                          {item.count}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.nextBatch}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* CHANNEL BREAKDOWN */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold">
              CHANNEL BREAKDOWN
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium">SMS</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={60} className="w-32 h-2" />
                  <span className="text-sm font-bold text-blue-400">
                    6 touches
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-medium">CALLS</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={30} className="w-32 h-2" />
                  <span className="text-sm font-bold text-green-400">
                    3 touches
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-medium">EMAIL</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={20} className="w-32 h-2" />
                  <span className="text-sm font-bold text-purple-400">
                    2 touches
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <div className="text-sm text-muted-foreground mb-2">
                TYPICAL SEQUENCE FLOW
              </div>
              <div className="flex items-center gap-1 text-xs">
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  SMS
                </Badge>
                <ArrowRight className="h-3 w-3 text-zinc-600" />
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  CALL
                </Badge>
                <ArrowRight className="h-3 w-3 text-zinc-600" />
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  SMS
                </Badge>
                <ArrowRight className="h-3 w-3 text-zinc-600" />
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                  EMAIL
                </Badge>
                <span className="text-zinc-500">... x10</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SELECTED TOUCH DETAIL */}
      {selectedTouch && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            {(() => {
              const touch = OUTREACH_SEQUENCE.find(
                (t) => t.position === selectedTouch,
              );
              const colors = TOUCH_COLORS[selectedTouch];
              if (!touch) return null;

              return (
                <div className="flex items-start gap-6">
                  <div
                    className={cn(
                      "w-20 h-20 rounded-2xl flex items-center justify-center border-2",
                      colors.bg,
                      colors.border,
                    )}
                  >
                    <span className={cn("text-3xl font-black", colors.text)}>
                      {touch.position}
                    </span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{touch.name}</h3>
                      <Badge
                        className={cn(colors.bg, colors.text, colors.border)}
                      >
                        DAY {touch.dayOffset}
                      </Badge>
                      <Badge variant="outline">
                        <ChannelIcon channel={touch.channel} />
                        <span className="ml-1">
                          {touch.channel.toUpperCase()}
                        </span>
                      </Badge>
                    </div>

                    <p className="text-muted-foreground mb-4">
                      {touch.purpose}
                    </p>

                    <div className="flex items-center gap-4">
                      <Button className="bg-gradient-to-r from-green-600 to-emerald-600">
                        <Play className="h-4 w-4 mr-2" />
                        EXECUTE NOW ({stats.byTouch[selectedTouch]} leads)
                      </Button>
                      <Button variant="outline">VIEW LEADS</Button>
                      <Button variant="outline">EDIT TEMPLATE</Button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
