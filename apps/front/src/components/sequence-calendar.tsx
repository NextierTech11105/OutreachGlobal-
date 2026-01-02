"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  CalendarPlus,
  Plus,
  PhoneCall,
  CalendarCheck,
  UserPlus,
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

// Event types for sequence calendar
type SequenceEventType = "callback" | "appointment" | "follow_up" | "escalation";

interface SequenceEvent {
  id: string;
  type: SequenceEventType;
  title: string;
  dayNumber: number;
  time?: string;
  notes?: string;
  assignedTo?: string;
}

const EVENT_TYPE_CONFIG: Record<SequenceEventType, {
  label: string;
  color: string;
  bgColor: string;
  icon: typeof PhoneCall;
}> = {
  callback: {
    label: "Callback",
    color: "text-blue-600",
    bgColor: "bg-blue-100 border-blue-300",
    icon: PhoneCall,
  },
  appointment: {
    label: "Appointment",
    color: "text-green-600",
    bgColor: "bg-green-100 border-green-300",
    icon: CalendarCheck,
  },
  follow_up: {
    label: "Follow-up",
    color: "text-purple-600",
    bgColor: "bg-purple-100 border-purple-300",
    icon: Clock,
  },
  escalation: {
    label: "Escalation",
    color: "text-orange-600",
    bgColor: "bg-orange-100 border-orange-300",
    icon: UserPlus,
  },
};

interface SequenceCalendarProps {
  steps: SequenceStep[];
  startDate?: Date;
  onEventCreate?: (event: SequenceEvent) => void;
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
  onEventCreate,
}: SequenceCalendarProps) {
  // Event state
  const [events, setEvents] = useState<SequenceEvent[]>([]);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null);
  const [newEvent, setNewEvent] = useState<Partial<SequenceEvent>>({
    type: "callback",
    title: "",
    notes: "",
    time: "09:00",
  });

  // Event handlers
  const handleDayClick = (dayNum: number) => {
    if (dayNum >= 0) {
      setSelectedDayNumber(dayNum);
      setNewEvent({ ...newEvent, dayNumber: dayNum });
      setShowEventDialog(true);
    }
  };

  const handleCreateEvent = () => {
    if (!newEvent.type || selectedDayNumber === null) return;

    const event: SequenceEvent = {
      id: `evt_${Date.now()}`,
      type: newEvent.type as SequenceEventType,
      title: newEvent.title || EVENT_TYPE_CONFIG[newEvent.type as SequenceEventType].label,
      dayNumber: selectedDayNumber,
      time: newEvent.time,
      notes: newEvent.notes,
      assignedTo: newEvent.assignedTo,
    };

    setEvents([...events, event]);
    onEventCreate?.(event);
    setShowEventDialog(false);
    setNewEvent({ type: "callback", title: "", notes: "", time: "09:00" });
  };

  // Get events for a specific day
  const getEventsForDay = (dayNum: number) => {
    return events.filter((e) => e.dayNumber === dayNum);
  };

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
    const dayEvents = getEventsForDay(dayNum);
    const isSequenceDay = dayNum >= 0 && dayNum < totalDays;
    const isToday =
      format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

    return (
      <div
        key={date.toISOString()}
        onClick={() => handleDayClick(dayNum)}
        className={cn(
          "min-h-[100px] border-r border-b p-2 cursor-pointer transition-colors hover:bg-muted/50 group",
          isSequenceDay && "bg-muted/30",
          isToday && "bg-blue-50 hover:bg-blue-100",
          dayNum < 0 && "bg-muted/10 cursor-default hover:bg-muted/10",
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
          <div className="flex items-center gap-1">
            {dayNum >= 0 && dayNum < totalDays && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                Day {dayNum + 1}
              </Badge>
            )}
            {dayNum >= 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDayClick(dayNum);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-primary/10"
              >
                <Plus className="h-3 w-3 text-primary" />
              </button>
            )}
          </div>
        </div>

        {/* Steps on this day */}
        <div className="space-y-1">
          {stepsOnDay.map((step, idx) => {
            const config = STEP_CONFIG[step.type];
            const Icon = config.icon;

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

          {/* Events on this day */}
          {dayEvents.map((event) => {
            const config = EVENT_TYPE_CONFIG[event.type];
            const Icon = config.icon;
            return (
              <div
                key={event.id}
                className={cn(
                  "flex items-center gap-1 p-1 rounded text-xs border",
                  config.bgColor,
                  config.color,
                )}
              >
                <Icon className="h-3 w-3 shrink-0" />
                <span className="truncate font-medium">{event.title}</span>
                {event.time && (
                  <span className="text-[10px] opacity-75 ml-auto">{event.time}</span>
                )}
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
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setSelectedDayNumber(0);
              setShowEventDialog(true);
            }}
            className="gap-1"
          >
            <CalendarPlus className="h-4 w-4" />
            Create Event
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
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

      {/* Create Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-primary" />
              Create Event - Day {(selectedDayNumber || 0) + 1}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Event Type Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Event Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(EVENT_TYPE_CONFIG) as [SequenceEventType, typeof EVENT_TYPE_CONFIG[SequenceEventType]][]).map(
                  ([type, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewEvent({ ...newEvent, type })}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border-2 transition-all",
                          newEvent.type === type
                            ? `${config.bgColor} border-current ${config.color}`
                            : "border-muted hover:border-muted-foreground/50"
                        )}
                      >
                        <Icon className={cn("h-4 w-4", newEvent.type === type ? config.color : "text-muted-foreground")} />
                        <span className={cn("font-medium text-sm", newEvent.type === type ? config.color : "")}>
                          {config.label}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="event-title">Title (optional)</Label>
              <Input
                id="event-title"
                placeholder={newEvent.type ? EVENT_TYPE_CONFIG[newEvent.type as SequenceEventType].label : "Event title"}
                value={newEvent.title || ""}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              />
            </div>

            {/* Time */}
            <div className="space-y-2">
              <Label htmlFor="event-time">Time</Label>
              <Input
                id="event-time"
                type="time"
                value={newEvent.time || "09:00"}
                onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="event-notes">Notes</Label>
              <Textarea
                id="event-notes"
                placeholder="Add any notes..."
                value={newEvent.notes || ""}
                onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateEvent}>
              <CalendarPlus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SequenceCalendar;
