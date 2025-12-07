"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  ExternalLink,
  Phone,
  MessageSquare,
  Clock,
  MapPin,
  Users,
  X,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useGlobalActions, CalendarEvent } from "@/lib/providers/global-actions-provider";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALENDAR DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function CalendarDashboard() {
  const {
    calendarEvents,
    scheduledCalls,
    addCalendarEvent,
    removeCalendarEvent,
    createGoogleCalendarEvent,
    isCalendarOpen,
    closeCalendar,
  } = useGlobalActions();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    type: "call" as CalendarEvent["type"],
    startTime: "",
    endTime: "",
    location: "",
  });

  // Combine calendar events with scheduled calls
  const allEvents = useMemo(() => {
    const callEvents: CalendarEvent[] = scheduledCalls
      .filter((c) => c.status === "pending")
      .map((call) => ({
        id: call.id,
        title: `Call: ${call.leadName || call.leadPhone}`,
        description: call.notes,
        startTime: call.scheduledAt,
        endTime: new Date(call.scheduledAt.getTime() + 30 * 60 * 1000),
        type: "call" as const,
        leadId: call.leadId,
      }));
    return [...calendarEvents, ...callEvents];
  }, [calendarEvents, scheduledCalls]);

  // Generate calendar days for current month view
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const dayEvents = allEvents.filter((event) => {
        const eventDate = new Date(event.startTime);
        return (
          eventDate.getFullYear() === date.getFullYear() &&
          eventDate.getMonth() === date.getMonth() &&
          eventDate.getDate() === date.getDate()
        );
      });

      days.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.getTime() === today.getTime(),
        events: dayEvents,
      });
    }

    return days;
  }, [currentDate, allEvents]);

  // Today's events
  const todayEvents = useMemo(() => {
    const today = new Date();
    return allEvents.filter((event) => {
      const eventDate = new Date(event.startTime);
      return (
        eventDate.getFullYear() === today.getFullYear() &&
        eventDate.getMonth() === today.getMonth() &&
        eventDate.getDate() === today.getDate()
      );
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [allEvents]);

  // Selected date events
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return allEvents.filter((event) => {
      const eventDate = new Date(event.startTime);
      return (
        eventDate.getFullYear() === selectedDate.getFullYear() &&
        eventDate.getMonth() === selectedDate.getMonth() &&
        eventDate.getDate() === selectedDate.getDate()
      );
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [selectedDate, allEvents]);

  const navigateMonth = (direction: number) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.startTime) return;

    const startTime = new Date(newEvent.startTime);
    const endTime = newEvent.endTime
      ? new Date(newEvent.endTime)
      : new Date(startTime.getTime() + 60 * 60 * 1000);

    addCalendarEvent({
      title: newEvent.title,
      description: newEvent.description,
      type: newEvent.type,
      startTime,
      endTime,
      location: newEvent.location,
    });

    setIsAddEventOpen(false);
    setNewEvent({
      title: "",
      description: "",
      type: "call",
      startTime: "",
      endTime: "",
      location: "",
    });
  };

  const openGoogleCalendar = () => {
    window.open("https://calendar.google.com", "_blank");
  };

  const getEventColor = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "call":
        return "bg-green-500";
      case "meeting":
        return "bg-blue-500";
      case "task":
        return "bg-purple-500";
      case "reminder":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getEventIcon = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "call":
        return Phone;
      case "meeting":
        return Users;
      case "task":
        return Clock;
      case "reminder":
        return MessageSquare;
      default:
        return Calendar;
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <Dialog open={isCalendarOpen} onOpenChange={closeCalendar}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendar
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={openGoogleCalendar}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Google Calendar
              </Button>
              <Button size="sm" onClick={() => setIsAddEventOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Calendar */}
          <div className="flex-1 p-6 overflow-auto">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-semibold min-w-[180px] text-center">
                  {monthYear}
                </h2>
                <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="border rounded-lg overflow-hidden">
              {/* Day Headers */}
              <div className="grid grid-cols-7 bg-muted">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div
                    key={day}
                    className="p-2 text-center text-sm font-medium text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedDate(day.date)}
                    className={cn(
                      "min-h-[100px] p-2 border-t border-l cursor-pointer transition-colors hover:bg-muted/50",
                      !day.isCurrentMonth && "bg-muted/30 text-muted-foreground",
                      day.isToday && "bg-primary/5",
                      selectedDate?.getTime() === day.date.getTime() && "bg-primary/10 ring-2 ring-primary ring-inset"
                    )}
                  >
                    <div
                      className={cn(
                        "text-sm font-medium mb-1",
                        day.isToday && "bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center"
                      )}
                    >
                      {day.date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {day.events.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className={cn(
                            "text-xs px-1.5 py-0.5 rounded truncate text-white",
                            getEventColor(event.type)
                          )}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      ))}
                      {day.events.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{day.events.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar - Today's Events / Selected Date */}
          <div className="w-80 border-l bg-muted/30 p-4 overflow-auto">
            <div className="space-y-4">
              {/* Today's Schedule */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {selectedDate
                      ? selectedDate.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })
                      : "Today's Schedule"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(selectedDate ? selectedDateEvents : todayEvents).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No events scheduled</p>
                  ) : (
                    (selectedDate ? selectedDateEvents : todayEvents).map((event) => {
                      const Icon = getEventIcon(event.type);
                      return (
                        <div
                          key={event.id}
                          className="flex items-start gap-3 p-2 rounded-lg bg-background border"
                        >
                          <div className={cn("p-1.5 rounded", getEventColor(event.type))}>
                            <Icon className="h-3 w-3 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{event.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatTime(event.startTime)} - {formatTime(event.endTime)}
                            </p>
                            {event.location && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => createGoogleCalendarEvent(event)}
                              title="Add to Google Calendar"
                            >
                              <Link2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => removeCalendarEvent(event.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* Quick Links */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Quick Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={openGoogleCalendar}
                  >
                    <Calendar className="h-4 w-4 mr-2 text-red-500" />
                    Open Google Calendar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=New+Event`;
                      window.open(url, "_blank");
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2 text-green-500" />
                    Create in Google Calendar
                  </Button>
                </CardContent>
              </Card>

              {/* Upcoming Events Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 bg-green-500/10 rounded">
                      <p className="text-lg font-bold text-green-600">
                        {allEvents.filter((e) => e.type === "call").length}
                      </p>
                      <p className="text-xs text-muted-foreground">Calls</p>
                    </div>
                    <div className="p-2 bg-blue-500/10 rounded">
                      <p className="text-lg font-bold text-blue-600">
                        {allEvents.filter((e) => e.type === "meeting").length}
                      </p>
                      <p className="text-xs text-muted-foreground">Meetings</p>
                    </div>
                    <div className="p-2 bg-purple-500/10 rounded">
                      <p className="text-lg font-bold text-purple-600">
                        {allEvents.filter((e) => e.type === "task").length}
                      </p>
                      <p className="text-xs text-muted-foreground">Tasks</p>
                    </div>
                    <div className="p-2 bg-yellow-500/10 rounded">
                      <p className="text-lg font-bold text-yellow-600">
                        {allEvents.filter((e) => e.type === "reminder").length}
                      </p>
                      <p className="text-xs text-muted-foreground">Reminders</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Add Event Dialog */}
        <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Event title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={newEvent.type}
                  onValueChange={(value: CalendarEvent["type"]) =>
                    setNewEvent({ ...newEvent, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location (optional)</Label>
                <Input
                  id="location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  placeholder="Meeting location"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Event description"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddEventOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddEvent}>Add Event</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
