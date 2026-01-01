"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Calendar,
  Phone,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  MessageSquare,
  CalendarDays,
  CheckCircle2,
  PhoneCall,
  Send,
  Users,
  Play,
  Square,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

/**
 * LEAD CALENDAR WORKSPACE
 *
 * Central calendar view for all scheduled lead interactions:
 * - Callbacks
 * - Follow-ups
 * - Booked appointments
 * - Campaign touchpoints
 *
 * INTERNAL COPILOT - Visible across all Call Center pages.
 */

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: "callback" | "appointment" | "followup" | "campaign";
  leadId: string;
  leadName: string;
  phone?: string;
  notes?: string;
  worker?: string;
}

type ViewMode = "day" | "week" | "month";

const EVENT_COLORS = {
  callback: "bg-blue-100 border-blue-400 text-blue-800",
  appointment: "bg-green-100 border-green-400 text-green-800",
  followup: "bg-purple-100 border-purple-400 text-purple-800",
  campaign: "bg-orange-100 border-orange-400 text-orange-800",
};

const EVENT_LABELS = {
  callback: "Callback",
  appointment: "Appointment",
  followup: "Follow-up",
  campaign: "Campaign",
};

export default function LeadCalendarWorkspacePage() {
  const params = useParams<{ team: string }>();
  const teamId = params?.team ?? "";

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [dialerActive, setDialerActive] = useState(false);

  // Fetch calendar events from leads, appointments, and campaign queue
  useEffect(() => {
    async function fetchEvents() {
      try {
        const response = await fetch(
          `/api/calendar/events?teamId=${teamId}&start=${getViewStart(currentDate, viewMode).toISOString()}&end=${getViewEnd(currentDate, viewMode).toISOString()}`,
        );

        if (!response.ok) {
          // Fallback to fetch leads with callbacks
          const leadsResponse = await fetch(
            `/api/leads?teamId=${teamId}&hasCallback=true&limit=100`,
          );
          const leadsData = await leadsResponse.json();

          if (leadsData.success && leadsData.leads) {
            const callbackEvents: CalendarEvent[] = leadsData.leads
              .filter((lead: any) => lead.callbackAt)
              .map((lead: any) => ({
                id: `callback-${lead.id}`,
                title: `Callback: ${lead.firstName || "Lead"} ${lead.lastName || ""}`,
                start: new Date(lead.callbackAt),
                end: new Date(
                  new Date(lead.callbackAt).getTime() + 30 * 60 * 1000,
                ),
                type: "callback" as const,
                leadId: lead.id,
                leadName:
                  `${lead.firstName || ""} ${lead.lastName || ""}`.trim(),
                phone: lead.phone,
                notes: lead.callbackNotes,
              }));

            setEvents(callbackEvents);
          }
          return;
        }

        const data = await response.json();
        if (data.success && data.events) {
          const calendarEvents: CalendarEvent[] = data.events.map(
            (event: any) => ({
              id: event.id,
              title: event.title,
              start: new Date(event.start),
              end: new Date(event.end),
              type: event.type,
              leadId: event.leadId,
              leadName: event.leadName,
              phone: event.phone,
              notes: event.notes,
              worker: event.worker,
            }),
          );
          setEvents(calendarEvents);
        }
      } catch (error) {
        console.error("Failed to fetch calendar events:", error);
        toast.error("Failed to load calendar");
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [teamId, currentDate, viewMode]);

  // Get start/end dates for current view
  function getViewStart(date: Date, mode: ViewMode): Date {
    const start = new Date(date);
    if (mode === "day") {
      start.setHours(0, 0, 0, 0);
    } else if (mode === "week") {
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }
    return start;
  }

  function getViewEnd(date: Date, mode: ViewMode): Date {
    const end = new Date(date);
    if (mode === "day") {
      end.setHours(23, 59, 59, 999);
    } else if (mode === "week") {
      end.setDate(end.getDate() - end.getDay() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    }
    return end;
  }

  // Navigate calendar
  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start);
      return (
        eventDate.getFullYear() === day.getFullYear() &&
        eventDate.getMonth() === day.getMonth() &&
        eventDate.getDate() === day.getDate()
      );
    });
  };

  // Get days for current view
  const viewDays = useMemo(() => {
    const days: Date[] = [];
    const start = getViewStart(currentDate, viewMode);
    const end = getViewEnd(currentDate, viewMode);

    const current = new Date(start);
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [currentDate, viewMode]);

  // Get hours for day view
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

  // Format date for header
  const formatDateHeader = () => {
    const options: Intl.DateTimeFormatOptions =
      viewMode === "month"
        ? { month: "long", year: "numeric" }
        : viewMode === "week"
          ? { month: "short", day: "numeric", year: "numeric" }
          : {
              weekday: "long",
              month: "short",
              day: "numeric",
              year: "numeric",
            };
    return currentDate.toLocaleDateString("en-US", options);
  };

  // ==========================================================================
  // POWER DIALER & SMS ACTIONS - Repeatable Execution
  // ==========================================================================

  // Toggle event selection
  const toggleEventSelection = (eventId: string) => {
    const newSelected = new Set(selectedEvents);
    if (newSelected.has(eventId)) {
      newSelected.delete(eventId);
    } else {
      newSelected.add(eventId);
    }
    setSelectedEvents(newSelected);
  };

  // Select all today's events
  const selectAllToday = () => {
    const todayEvents = getEventsForDay(new Date());
    const newSelected = new Set(todayEvents.map((e) => e.id));
    setSelectedEvents(newSelected);
    setIsSelectMode(true);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedEvents(new Set());
    setIsSelectMode(false);
  };

  // Get selected events as array
  const getSelectedEventsArray = () => {
    return events.filter((e) => selectedEvents.has(e.id));
  };

  // TWILIO CLICK-TO-CALL - Single call
  const handleClickToCall = async (event: CalendarEvent) => {
    if (!event.phone) {
      toast.error("No phone number available");
      return;
    }

    try {
      const response = await fetch("/api/twilio/click-to-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: event.phone,
          leadId: event.leadId,
          teamId,
          callbackId: event.id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Calling ${event.leadName}...`);
      } else {
        toast.error(data.error || "Failed to initiate call");
      }
    } catch (error) {
      console.error("Click-to-call error:", error);
      toast.error("Failed to initiate call");
    }
  };

  // POWER DIALER - Queue multiple calls
  const handleStartDialer = async () => {
    const selected = getSelectedEventsArray();
    const withPhones = selected.filter((e) => e.phone);

    if (withPhones.length === 0) {
      toast.error("No events with phone numbers selected");
      return;
    }

    try {
      const response = await fetch("/api/power-dialer/start-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          leads: withPhones.map((e) => ({
            id: e.leadId,
            phone: e.phone,
            name: e.leadName,
            callbackId: e.id,
          })),
          source: "calendar",
        }),
      });

      const data = await response.json();
      if (data.success) {
        setDialerActive(true);
        toast.success(`Power Dialer started with ${withPhones.length} leads`);
        // Open dialer in new tab or modal
        window.open(
          `/t/${teamId}/call-center?session=${data.sessionId}`,
          "_blank",
        );
      } else {
        toast.error(data.error || "Failed to start dialer");
      }
    } catch (error) {
      console.error("Dialer error:", error);
      toast.error("Failed to start power dialer");
    }
  };

  // QUICK SMS - Single message
  const handleQuickSms = async (event: CalendarEvent, message?: string) => {
    if (!event.phone) {
      toast.error("No phone number available");
      return;
    }

    const smsMessage =
      message ||
      `Hi ${event.leadName?.split(" ")[0] || "there"}, this is a reminder about your scheduled callback. Reply YES to confirm or let us know a better time.`;

    try {
      const response = await fetch("/api/signalhouse/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: event.phone,
          message: smsMessage,
          leadId: event.leadId,
          teamId,
          source: "calendar_reminder",
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`SMS sent to ${event.leadName}`);
      } else {
        toast.error(data.error || "Failed to send SMS");
      }
    } catch (error) {
      console.error("SMS error:", error);
      toast.error("Failed to send SMS");
    }
  };

  // SMS BLAST - Bulk send to selected
  const handleSmsBlast = async (message: string) => {
    const selected = getSelectedEventsArray();
    const withPhones = selected.filter((e) => e.phone);

    if (withPhones.length === 0) {
      toast.error("No events with phone numbers selected");
      return;
    }

    try {
      const response = await fetch("/api/signalhouse/sms/blast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          recipients: withPhones.map((e) => ({
            phone: e.phone,
            leadId: e.leadId,
            variables: { firstName: e.leadName?.split(" ")[0] || "there" },
          })),
          message,
          source: "calendar_blast",
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`SMS blast sent to ${withPhones.length} leads`);
        clearSelection();
      } else {
        toast.error(data.error || "Failed to send SMS blast");
      }
    } catch (error) {
      console.error("SMS blast error:", error);
      toast.error("Failed to send SMS blast");
    }
  };

  // Legacy handler - now uses click-to-call
  const handleInitiateCallback = async (event: CalendarEvent) => {
    await handleClickToCall(event);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-indigo-500" />
            Lead Calendar
          </h1>
          <p className="text-muted-foreground">
            Scheduled callbacks, follow-ups, and appointments
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Action Toolbar */}
          {selectedEvents.size > 0 ? (
            <div className="flex items-center gap-2 mr-4 px-3 py-1 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-sm font-medium text-blue-700">
                {selectedEvents.size} selected
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearSelection}
                className="h-7 px-2"
              >
                <Square className="h-3 w-3 mr-1" />
                Clear
              </Button>
              <div className="w-px h-4 bg-blue-200" />
              <Button
                size="sm"
                onClick={handleStartDialer}
                className="h-7 bg-green-600 hover:bg-green-700"
              >
                <PhoneCall className="h-3 w-3 mr-1" />
                Power Dialer
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  handleSmsBlast(
                    "Hi {firstName}, just following up on our scheduled call. Are you available? Reply YES to confirm.",
                  )
                }
                className="h-7 bg-purple-600 hover:bg-purple-700"
              >
                <Users className="h-3 w-3 mr-1" />
                SMS Blast
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={selectAllToday}
              className="mr-2"
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              Select Today
            </Button>
          )}

          {/* View Mode Selector */}
          <div className="flex border rounded-lg">
            {(["day", "week", "month"] as ViewMode[]).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode(mode)}
                className="capitalize"
              >
                {mode}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDate("prev")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDate("next")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <h2 className="text-lg font-medium ml-2">{formatDateHeader()}</h2>
        </div>

        <div className="flex items-center gap-4 text-sm">
          {Object.entries(EVENT_LABELS).map(([type, label]) => (
            <div key={type} className="flex items-center gap-1">
              <div
                className={`w-3 h-3 rounded-full ${EVENT_COLORS[type as keyof typeof EVENT_COLORS].split(" ")[0]}`}
              />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              {viewMode === "month" ? (
                // Month View
                <div className="grid grid-cols-7">
                  {/* Day Headers */}
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <div
                        key={day}
                        className="p-2 text-center text-sm font-medium border-b bg-muted"
                      >
                        {day}
                      </div>
                    ),
                  )}

                  {/* Calendar Cells */}
                  {viewDays.map((day, index) => {
                    const dayEvents = getEventsForDay(day);
                    const isToday =
                      day.toDateString() === new Date().toDateString();
                    const isCurrentMonth =
                      day.getMonth() === currentDate.getMonth();

                    return (
                      <div
                        key={index}
                        className={`min-h-[100px] p-1 border-b border-r ${!isCurrentMonth ? "bg-muted/50" : ""}`}
                      >
                        <div
                          className={`text-sm p-1 ${isToday ? "bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center" : ""}`}
                        >
                          {day.getDate()}
                        </div>
                        <div className="space-y-1 mt-1">
                          {dayEvents.slice(0, 3).map((event) => (
                            <div
                              key={event.id}
                              className={`text-xs p-1 rounded truncate cursor-pointer border ${EVENT_COLORS[event.type]}`}
                              onClick={() => setSelectedEvent(event)}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-muted-foreground pl-1">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : viewMode === "week" ? (
                // Week View
                <div className="grid grid-cols-8">
                  {/* Time Column Header */}
                  <div className="border-b bg-muted"></div>
                  {/* Day Headers */}
                  {viewDays.map((day) => (
                    <div
                      key={day.toISOString()}
                      className={`p-2 text-center text-sm font-medium border-b bg-muted ${
                        day.toDateString() === new Date().toDateString()
                          ? "bg-blue-100"
                          : ""
                      }`}
                    >
                      <div>
                        {day.toLocaleDateString("en-US", { weekday: "short" })}
                      </div>
                      <div className="text-lg">{day.getDate()}</div>
                    </div>
                  ))}

                  {/* Time Rows */}
                  {hours.map((hour) => (
                    <>
                      <div
                        key={`time-${hour}`}
                        className="p-2 text-xs text-right text-muted-foreground border-r"
                      >
                        {hour > 12 ? hour - 12 : hour}{" "}
                        {hour >= 12 ? "PM" : "AM"}
                      </div>
                      {viewDays.map((day) => {
                        const dayEvents = getEventsForDay(day).filter(
                          (e) => new Date(e.start).getHours() === hour,
                        );
                        return (
                          <div
                            key={`${day.toISOString()}-${hour}`}
                            className="border-r border-b min-h-[60px] p-1"
                          >
                            {dayEvents.map((event) => (
                              <div
                                key={event.id}
                                className={`text-xs p-1 rounded cursor-pointer border ${EVENT_COLORS[event.type]}`}
                                onClick={() => setSelectedEvent(event)}
                              >
                                <div className="font-medium truncate">
                                  {event.leadName}
                                </div>
                                <div className="truncate opacity-75">
                                  {event.type}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </>
                  ))}
                </div>
              ) : (
                // Day View
                <div className="grid grid-cols-2">
                  {/* Time Column */}
                  <div className="col-span-2">
                    {hours.map((hour) => {
                      const dayEvents = getEventsForDay(currentDate).filter(
                        (e) => new Date(e.start).getHours() === hour,
                      );
                      return (
                        <div key={hour} className="flex border-b min-h-[80px]">
                          <div className="w-20 p-2 text-sm text-right text-muted-foreground border-r">
                            {hour > 12 ? hour - 12 : hour}{" "}
                            {hour >= 12 ? "PM" : "AM"}
                          </div>
                          <div className="flex-1 p-2 space-y-1">
                            {dayEvents.map((event) => (
                              <div
                                key={event.id}
                                className={`p-2 rounded cursor-pointer border ${EVENT_COLORS[event.type]}`}
                                onClick={() => setSelectedEvent(event)}
                              >
                                <div className="font-medium">
                                  {event.leadName}
                                </div>
                                <div className="text-sm flex items-center gap-2">
                                  <Clock className="h-3 w-3" />
                                  {new Date(event.start).toLocaleTimeString(
                                    "en-US",
                                    { hour: "numeric", minute: "2-digit" },
                                  )}
                                  {event.phone && (
                                    <>
                                      <Phone className="h-3 w-3 ml-2" />
                                      {event.phone}
                                    </>
                                  )}
                                </div>
                                {event.notes && (
                                  <div className="text-sm mt-1 opacity-75">
                                    {event.notes}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Today's Schedule Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Today
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
              {getEventsForDay(new Date()).length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No events scheduled today</p>
                </div>
              ) : (
                getEventsForDay(new Date()).map((event) => (
                  <div
                    key={event.id}
                    className={`p-3 rounded-lg border cursor-pointer ${
                      selectedEvent?.id === event.id
                        ? "ring-2 ring-blue-500"
                        : ""
                    } ${EVENT_COLORS[event.type]}`}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs capitalize">
                        {event.type}
                      </Badge>
                      <span className="text-xs">
                        {new Date(event.start).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="mt-2">
                      <p className="font-medium">{event.leadName}</p>
                      {event.phone && (
                        <p className="text-sm flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {event.phone}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="w-full mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInitiateCallback(event);
                      }}
                    >
                      <Phone className="h-3 w-3 mr-1" />
                      Call Now
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Selected Event Details */}
          {selectedEvent && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Badge className={EVENT_COLORS[selectedEvent.type]}>
                    {EVENT_LABELS[selectedEvent.type]}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedEvent.leadName}</span>
                  </div>

                  {selectedEvent.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedEvent.phone}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {new Date(selectedEvent.start).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        },
                      )}{" "}
                      at{" "}
                      {new Date(selectedEvent.start).toLocaleTimeString(
                        "en-US",
                        {
                          hour: "numeric",
                          minute: "2-digit",
                        },
                      )}
                    </span>
                  </div>

                  {selectedEvent.notes && (
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm">{selectedEvent.notes}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleInitiateCallback(selectedEvent)}
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Call
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    SMS
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
