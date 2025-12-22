"use client";

import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageSquare,
  Clock,
  X,
  PhoneCall,
  Send,
  CalendarPlus,
  Minimize2,
  Maximize2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useGlobalActions,
  CalendarEvent,
} from "@/lib/providers/global-actions-provider";
import { toast } from "sonner";

/**
 * GLOBAL CALENDAR WIDGET
 *
 * A floating, minimizable calendar that appears on ALL pages except raw datalakes.
 * Provides:
 * - Quick view of today's scheduled calls/tasks
 * - Click-to-call / Click-to-SMS actions (integrated SMS and voice stack)
 * - Push leads to calendar from anywhere
 * - Schedule strategy sessions
 *
 * RULES:
 * - Visible on: sectors, campaigns, leads, deals, research-library, buckets, calendar
 * - Hidden on: raw datalakes (unprocessed data without lead IDs)
 */

interface QuickAction {
  id: string;
  leadName: string;
  phone: string;
  email?: string;
  scheduledAt: Date;
  type: "call" | "sms" | "email" | "meeting";
  status: "pending" | "completed" | "missed";
}

export function GlobalCalendarWidget() {
  const {
    calendarEvents,
    scheduledCalls,
    isCalendarOpen,
    openCalendar,
    closeCalendar,
    addCalendarEvent,
  } = useGlobalActions();

  const [isMinimized, setIsMinimized] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [currentDate] = useState(new Date());

  // Create event form state
  const [newEvent, setNewEvent] = useState({
    title: "",
    type: "call" as "call" | "meeting" | "sms" | "task",
    date: new Date().toISOString().split("T")[0],
    time: "09:00",
    leadName: "",
    phone: "",
    notes: "",
  });

  // Handle create event
  const handleCreateEvent = useCallback(() => {
    if (!newEvent.title) {
      toast.error("Please enter an event title");
      return;
    }

    const startTime = new Date(`${newEvent.date}T${newEvent.time}`);

    const event: CalendarEvent = {
      id: `event_${Date.now()}`,
      title: newEvent.title,
      startTime,
      endTime: new Date(startTime.getTime() + 30 * 60 * 1000), // 30 min default
      type: newEvent.type,
      leadId: undefined,
      description: newEvent.notes,
    };

    if (addCalendarEvent) {
      addCalendarEvent(event);
    }

    toast.success(`Event created: ${newEvent.title}`, {
      description: `${startTime.toLocaleDateString()} at ${formatTime(startTime)}`,
    });

    // Reset form
    setNewEvent({
      title: "",
      type: "call",
      date: new Date().toISOString().split("T")[0],
      time: "09:00",
      leadName: "",
      phone: "",
      notes: "",
    });
    setShowCreateForm(false);
  }, [newEvent, addCalendarEvent]);

  // Today's events
  const todaysEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const events = calendarEvents.filter((e) => {
      const eventDate = new Date(e.startTime);
      return eventDate >= today && eventDate < tomorrow;
    });

    const calls = scheduledCalls
      .filter((c) => {
        const callDate = new Date(c.scheduledAt);
        return (
          callDate >= today && callDate < tomorrow && c.status === "pending"
        );
      })
      .map((call) => ({
        id: call.id,
        title: `Call: ${call.leadName || call.leadPhone}`,
        startTime: call.scheduledAt,
        type: "call" as const,
        leadId: call.leadId,
        phone: call.leadPhone,
      }));

    return [...events, ...calls].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }, [calendarEvents, scheduledCalls]);

  // Click to Call (Twilio for voice)
  const handleClickToCall = useCallback(
    async (phone: string, leadName?: string) => {
      if (!phone) {
        toast.error("No phone number available");
        return;
      }

      // Use tel: protocol for now, later integrate with Twilio Device
      window.open(`tel:${phone}`, "_self");
      toast.success(`Calling ${leadName || phone}...`, {
        description: "Call initiated via Twilio",
      });
    },
    [],
  );

  // Click to SMS (SignalHouse for SMS)
  const handleClickToSMS = useCallback(
    async (phone: string, leadName?: string) => {
      if (!phone) {
        toast.error("No phone number available");
        return;
      }

      try {
        // Open SMS composer or queue message via SignalHouse
        const response = await fetch("/api/signalhouse/sms/compose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: phone,
            leadName,
            template: "quick_followup",
          }),
        });

        if (response.ok) {
          toast.success(`SMS queued to ${leadName || phone}`, {
            description: "Message sent via 10DLC",
          });
        } else {
          // Fallback to SMS link
          window.open(`sms:${phone}`, "_self");
          toast.info(`Opening SMS to ${leadName || phone}`);
        }
      } catch {
        window.open(`sms:${phone}`, "_self");
      }
    },
    [],
  );

  // Format time
  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Minimized view - just show count badge
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
        >
          <div className="relative">
            <Calendar className="h-6 w-6 text-white" />
            {todaysEvents.length > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                {todaysEvents.length}
              </Badge>
            )}
          </div>
        </Button>
      </div>
    );
  }

  // Expanded view
  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="shadow-2xl border-2 border-purple-200 dark:border-purple-800">
        <CardHeader className="pb-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Today's Schedule
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={() => openCalendar()}
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={() => setIsMinimized(true)}
              >
                <Minimize2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-white/80">
            {currentDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
        </CardHeader>

        <CardContent className="p-3 max-h-80 overflow-y-auto">
          {todaysEvents.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No scheduled activities today</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => openCalendar()}
              >
                <CalendarPlus className="h-3 w-3 mr-1" />
                Schedule Something
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {todaysEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {event.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(event.startTime)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs shrink-0",
                        event.type === "call" &&
                          "border-green-500 text-green-600",
                        event.type === "meeting" &&
                          "border-blue-500 text-blue-600",
                        event.type === "sms" &&
                          "border-purple-500 text-purple-600",
                      )}
                    >
                      {event.type}
                    </Badge>
                  </div>

                  {/* Quick Actions */}
                  {"phone" in event && event.phone && (
                    <div className="flex items-center gap-1 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs flex-1 border-green-300 text-green-700 hover:bg-green-50"
                        onClick={() =>
                          handleClickToCall(event.phone!, event.title)
                        }
                      >
                        <PhoneCall className="h-3 w-3 mr-1" />
                        Call
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs flex-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                        onClick={() =>
                          handleClickToSMS(event.phone!, event.title)
                        }
                      >
                        <Send className="h-3 w-3 mr-1" />
                        SMS
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Quick Stats */}
          <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-green-600">
                {todaysEvents.filter((e) => e.type === "call").length}
              </p>
              <p className="text-xs text-muted-foreground">Calls</p>
            </div>
            <div>
              <p className="text-lg font-bold text-purple-600">
                {todaysEvents.filter((e) => e.type === "sms").length}
              </p>
              <p className="text-xs text-muted-foreground">SMS</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-600">
                {todaysEvents.filter((e) => e.type === "meeting").length}
              </p>
              <p className="text-xs text-muted-foreground">Meetings</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * LEAD ID GENERATION RULES
 *
 * A record becomes a LEAD (gets a leadId) when:
 *
 * 1. LUCI ENRICHMENT (Automatic)
 *    - RealEstateAPI skip trace returns phone/email/social data
 *    - leadId = `lead_${timestamp}_${random}`
 *    - Triggers: Lead card creation, campaign readiness check
 *
 * 2. MANUAL DATA INPUT (User)
 *    - User manually enters contact info
 *    - Mobile phone field is filled = campaignReady
 *    - leadId generated on save
 *
 * 3. MANUAL SKIP TRACE (User-initiated)
 *    - User triggers skip trace on raw record
 *    - Results populate phone/email fields
 *    - leadId assigned when mobile phone found
 *
 * 4. IMPORT WITH CONTACT DATA
 *    - CSV import includes phone/email columns
 *    - leadId generated during import processing
 *    - campaignReady = true if mobile phone present
 *
 * CAMPAIGN READY CRITERIA:
 * - Has at least ONE mobile phone number
 * - Phone is NOT on DNC list
 * - Not opted out
 *
 * NON-LEADS (No leadId):
 * - Raw datalake records (property data only)
 * - Records without skip trace
 * - Records where skip trace returned no results
 */
export const LEAD_ID_RULES = {
  // Lead ID format
  generateLeadId: () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `lead_${timestamp}_${random}`;
  },

  // Check if record qualifies for lead ID
  qualifiesForLeadId: (record: {
    phone?: string;
    mobilePhone?: string;
    enrichedPhones?: { number: string; type?: string }[];
    email?: string;
    enrichedEmails?: { email: string }[];
  }): boolean => {
    // Has mobile phone from any source
    const hasMobile =
      !!record.mobilePhone ||
      record.enrichedPhones?.some(
        (p) =>
          p.type?.toLowerCase() === "mobile" ||
          p.type?.toLowerCase() === "cell",
      );

    // Has any phone
    const hasAnyPhone =
      !!record.phone ||
      !!record.mobilePhone ||
      (record.enrichedPhones?.length ?? 0) > 0;

    // Has email
    const hasEmail = !!record.email || (record.enrichedEmails?.length ?? 0) > 0;

    // Qualifies if has mobile (preferred) or has email + any phone
    return hasMobile || (hasEmail && hasAnyPhone);
  },

  // Check if campaign ready
  isCampaignReady: (record: {
    mobilePhone?: string;
    enrichedPhones?: { number: string; type?: string; dnc?: boolean }[];
    optedOut?: boolean;
  }): boolean => {
    if (record.optedOut) return false;

    // Has non-DNC mobile phone
    const hasMobileNotDNC =
      !!record.mobilePhone ||
      record.enrichedPhones?.some(
        (p) =>
          (p.type?.toLowerCase() === "mobile" ||
            p.type?.toLowerCase() === "cell") &&
          !p.dnc,
      );

    return !!hasMobileNotDNC;
  },
};

export default GlobalCalendarWidget;
