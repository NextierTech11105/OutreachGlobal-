"use client";

import { useState, useEffect, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Phone,
  Mail,
  RefreshCw,
  Calendar as CalendarIcon,
  Clock,
  Users,
  Loader2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============ TYPES ============
export type EventType = "sms" | "call" | "email" | "drip" | "followup";

export interface OutreachEvent {
  id: string;
  type: EventType;
  title: string;
  description?: string;
  scheduledAt: string; // ISO date string
  leadCount?: number;
  campaignId?: string;
  campaignName?: string;
  status: "scheduled" | "sent" | "failed" | "pending";
}

interface OutreachCalendarProps {
  events?: OutreachEvent[];
  onEventClick?: (event: OutreachEvent) => void;
  onDateClick?: (date: Date) => void;
  loading?: boolean;
  className?: string;
}

// ============ EVENT CONFIG ============
const eventConfig: Record<
  EventType,
  { icon: typeof MessageSquare; color: string; bgColor: string; label: string }
> = {
  sms: {
    icon: MessageSquare,
    color: "text-blue-500",
    bgColor: "bg-blue-500",
    label: "SMS",
  },
  call: {
    icon: Phone,
    color: "text-green-500",
    bgColor: "bg-green-500",
    label: "Call",
  },
  email: {
    icon: Mail,
    color: "text-purple-500",
    bgColor: "bg-purple-500",
    label: "Email",
  },
  drip: {
    icon: RefreshCw,
    color: "text-orange-500",
    bgColor: "bg-orange-500",
    label: "Drip",
  },
  followup: {
    icon: Clock,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500",
    label: "Follow-up",
  },
};

// ============ COMPONENT ============
export function OutreachCalendar({
  events = [],
  onEventClick,
  onDateClick,
  loading = false,
  className,
}: OutreachCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<OutreachEvent | null>(
    null,
  );

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, OutreachEvent[]> = {};
    events.forEach((event) => {
      const dateKey = format(parseISO(event.scheduledAt), "yyyy-MM-dd");
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [events]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const handleEventClick = (event: OutreachEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    onEventClick?.(event);
  };

  const handleDateClick = (date: Date) => {
    onDateClick?.(date);
  };

  // Navigate months
  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  return (
    <div className={cn("bg-background rounded-lg border", className)}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-4 py-2 border-b bg-muted/30">
        {Object.entries(eventConfig).map(([key, config]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs">
            <div className={cn("w-2.5 h-2.5 rounded-full", config.bgColor)} />
            <span className="text-muted-foreground">{config.label}</span>
          </div>
        ))}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="p-2 text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, idx) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDate[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={idx}
              onClick={() => handleDateClick(day)}
              className={cn(
                "min-h-[100px] p-1 border-b border-r cursor-pointer transition-colors",
                !isCurrentMonth && "bg-muted/30",
                isCurrentDay && "bg-blue-500/5",
                "hover:bg-muted/50",
              )}
            >
              {/* Day Number */}
              <div
                className={cn(
                  "text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full",
                  !isCurrentMonth && "text-muted-foreground",
                  isCurrentDay && "bg-blue-500 text-white",
                )}
              >
                {format(day, "d")}
              </div>

              {/* Events */}
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => {
                  const config = eventConfig[event.type];
                  const Icon = config.icon;
                  return (
                    <div
                      key={event.id}
                      onClick={(e) => handleEventClick(event, e)}
                      className={cn(
                        "flex items-center gap-1 px-1.5 py-0.5 rounded text-xs truncate cursor-pointer",
                        "hover:ring-1 hover:ring-offset-1",
                        config.bgColor + "/20",
                        config.color,
                      )}
                    >
                      <Icon className="h-3 w-3 shrink-0" />
                      <span className="truncate">{event.title}</span>
                      {event.leadCount && event.leadCount > 1 && (
                        <Badge
                          variant="secondary"
                          className="h-4 px-1 text-[10px] shrink-0"
                        >
                          {event.leadCount}
                        </Badge>
                      )}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1.5">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Event Detail Dialog */}
      <Dialog
        open={!!selectedEvent}
        onOpenChange={() => setSelectedEvent(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const config = eventConfig[selectedEvent.type];
                    const Icon = config.icon;
                    return (
                      <>
                        <div
                          className={cn(
                            "p-2 rounded-lg",
                            config.bgColor + "/20",
                          )}
                        >
                          <Icon className={cn("h-5 w-5", config.color)} />
                        </div>
                        {selectedEvent.title}
                      </>
                    );
                  })()}
                </DialogTitle>
                <DialogDescription>
                  {format(parseISO(selectedEvent.scheduledAt), "PPP 'at' p")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge
                    variant={
                      selectedEvent.status === "sent"
                        ? "default"
                        : selectedEvent.status === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {selectedEvent.status}
                  </Badge>
                </div>

                {/* Type */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <span className="text-sm font-medium">
                    {eventConfig[selectedEvent.type].label}
                  </span>
                </div>

                {/* Lead Count */}
                {selectedEvent.leadCount && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Leads</span>
                    <span className="text-sm font-medium flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {selectedEvent.leadCount}
                    </span>
                  </div>
                )}

                {/* Campaign */}
                {selectedEvent.campaignName && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Campaign
                    </span>
                    <span className="text-sm font-medium">
                      {selectedEvent.campaignName}
                    </span>
                  </div>
                )}

                {/* Description */}
                {selectedEvent.description && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      {selectedEvent.description}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedEvent(null)}
                >
                  Close
                </Button>
                {selectedEvent.status === "scheduled" && (
                  <Button>
                    <Zap className="mr-2 h-4 w-4" />
                    Send Now
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
