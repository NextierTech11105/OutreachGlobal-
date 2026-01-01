"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Mail,
  Phone,
  Clock,
  GitBranch,
  ChevronLeft,
  ChevronRight,
  Zap,
  Bell,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { format, addDays, startOfWeek, eachDayOfInterval } from "date-fns";
import type { SmsTemplate } from "@/lib/templates/nextier-defaults";

interface SequenceStep {
  id: string;
  type: "sms" | "email" | "call" | "wait" | "condition";
  templateId?: string;
  template?: SmsTemplate;
  waitDays?: number;
  waitHours?: number;
  condition?: {
    type: string;
    threshold?: number;
    thenAction: string;
    escalateTo?: string;
  };
}

interface SequenceCalendarProps {
  steps: SequenceStep[];
  startDate?: Date;
}

const STEP_CONFIG = {
  sms: { icon: MessageSquare, color: "bg-purple-500", label: "SMS" },
  email: { icon: Mail, color: "bg-blue-500", label: "Email" },
  call: { icon: Phone, color: "bg-green-500", label: "Call" },
  wait: { icon: Clock, color: "bg-gray-400", label: "Wait" },
  condition: { icon: GitBranch, color: "bg-orange-500", label: "Condition" },
};

const WORKER_CONFIG = {
  gianna: { name: "GIANNA", color: "bg-purple-500" },
  cathy: { name: "CATHY", color: "bg-orange-500" },
  sabrina: { name: "SABRINA", color: "bg-green-500" },
};

export function SequenceCalendar({
  steps,
  startDate = new Date(),
}: SequenceCalendarProps) {
  // Calculate which day each step falls on
  const stepsByDay = useMemo(() => {
    const dayMap: Record<number, SequenceStep[]> = {};
    let currentDay = 0;

    steps.forEach((step) => {
      if (step.type === "wait") {
        currentDay += step.waitDays || 0;
        const waitHours = step.waitHours || 0;
        if (waitHours >= 24) {
          currentDay += Math.floor(waitHours / 24);
        }
      } else {
        if (!dayMap[currentDay]) dayMap[currentDay] = [];
        dayMap[currentDay].push(step);
      }
    });

    return dayMap;
  }, [steps]);

  // Get total days in sequence
  const totalDays = useMemo(() => {
    return Math.max(...Object.keys(stepsByDay).map(Number), 0) + 1;
  }, [stepsByDay]);

  // Generate calendar weeks
  const weeks = useMemo(() => {
    const start = startOfWeek(startDate, { weekStartsOn: 1 }); // Monday
    const daysNeeded = Math.max(totalDays + 7, 14); // At least 2 weeks
    const end = addDays(start, daysNeeded);
    const allDays = eachDayOfInterval({ start, end });

    // Group into weeks
    const weekGroups: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      weekGroups.push(allDays.slice(i, i + 7));
    }
    return weekGroups;
  }, [startDate, totalDays]);

  // Get day number relative to start
  const getDayNumber = (date: Date) => {
    const diffTime = date.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const renderDayCell = (date: Date, dayNum: number) => {
    const stepsOnDay = stepsByDay[dayNum] || [];
    const isSequenceDay = dayNum >= 0 && dayNum < totalDays;
    const isToday =
      format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

    return (
      <div
        key={date.toISOString()}
        className={cn(
          "min-h-[100px] border-r border-b p-2",
          isSequenceDay && "bg-muted/30",
          isToday && "bg-blue-50",
          dayNum < 0 && "bg-muted/10",
        )}
      >
        {/* Date Header */}
        <div className="flex items-center justify-between mb-2">
          <span
            className={cn(
              "text-xs font-medium",
              isToday && "text-blue-600",
              dayNum < 0 && "text-muted-foreground",
            )}
          >
            {format(date, "d")}
          </span>
          {dayNum >= 0 && dayNum < totalDays && (
            <Badge variant="outline" className="text-[10px] px-1 py-0">
              Day {dayNum + 1}
            </Badge>
          )}
        </div>

        {/* Steps on this day */}
        <div className="space-y-1">
          {stepsOnDay.map((step, idx) => {
            const config = STEP_CONFIG[step.type];
            const Icon = config.icon;
            const workerColor = step.template?.worker
              ? WORKER_CONFIG[step.template.worker]?.color
              : null;

            return (
              <div
                key={step.id || idx}
                className={cn(
                  "flex items-center gap-1 p-1 rounded text-xs",
                  config.color,
                  "text-white",
                )}
              >
                <Icon className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {step.template?.name || config.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Sequence Timeline</h3>
          <p className="text-sm text-muted-foreground">
            {totalDays} day sequence ·{" "}
            {steps.filter((s) => s.type !== "wait").length} touchpoints
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(STEP_CONFIG)
          .filter(([key]) => key !== "wait")
          .map(([key, config]) => {
            const Icon = config.icon;
            return (
              <div key={key} className="flex items-center gap-1">
                <div className={cn("p-1 rounded", config.color)}>
                  <Icon className="h-3 w-3 text-white" />
                </div>
                <span className="text-muted-foreground">{config.label}</span>
              </div>
            );
          })}
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div
                key={day}
                className="px-2 py-2 text-xs font-medium text-muted-foreground text-center border-r last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.slice(0, 3).map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7">
              {week.map((date) => renderDayCell(date, getDayNumber(date)))}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Sequence Summary */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Sequence Flow</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 flex-wrap">
            {steps.map((step, idx) => {
              const config = STEP_CONFIG[step.type];
              const Icon = config.icon;

              if (step.type === "wait") {
                return (
                  <div
                    key={step.id || idx}
                    className="flex items-center gap-1 text-xs text-muted-foreground"
                  >
                    <Clock className="h-3 w-3" />
                    <span>{step.waitDays}d</span>
                    {idx < steps.length - 1 && <span>→</span>}
                  </div>
                );
              }

              return (
                <div key={step.id || idx} className="flex items-center gap-1">
                  <Badge className={cn("gap-1", config.color)}>
                    <Icon className="h-3 w-3" />
                    <span className="text-xs">
                      {step.template?.name || config.label}
                    </span>
                  </Badge>
                  {idx < steps.length - 1 && step.type !== "wait" && (
                    <span className="text-muted-foreground">→</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Daily Breakdown */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Day-by-Day Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {Object.entries(stepsByDay)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([day, daySteps]) => (
                <div key={day} className="flex items-start gap-3 text-sm">
                  <Badge variant="outline" className="shrink-0">
                    Day {Number(day) + 1}
                  </Badge>
                  <div className="flex flex-wrap gap-2">
                    {daySteps.map((step, idx) => {
                      const config = STEP_CONFIG[step.type];
                      const Icon = config.icon;
                      return (
                        <div
                          key={step.id || idx}
                          className="flex items-center gap-1 text-xs"
                        >
                          <div className={cn("p-1 rounded", config.color)}>
                            <Icon className="h-3 w-3 text-white" />
                          </div>
                          <span>{step.template?.name || config.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SequenceCalendar;
