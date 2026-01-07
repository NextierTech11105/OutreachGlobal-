"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LeadContext {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  address?: string;
  // Property-specific
  propertyAddress?: string;
  propertyType?: string;
  // Additional data
  metadata?: Record<string, any>;
}

export interface ScheduledCall {
  id: string;
  leadId: string;
  leadName?: string;
  leadPhone: string;
  scheduledAt: Date;
  notes?: string;
  priority: number;
  status: "pending" | "completed" | "cancelled";
  createdAt: Date;
}

export interface SMSCampaignEntry {
  id: string;
  leadId: string;
  leadName?: string;
  leadPhone: string;
  templateId?: string;
  message?: string;
  scheduledAt?: Date;
  priority: number;
  status: "queued" | "sent" | "failed";
  createdAt: Date;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  type: "call" | "meeting" | "task" | "reminder" | "sms";
  leadId?: string;
  location?: string;
  googleEventId?: string;
}

interface GlobalActionsContextType {
  // Selected lead context - available globally
  selectedLead: LeadContext | null;
  setSelectedLead: (lead: LeadContext | null) => void;

  // Team context
  teamId: string | null;

  // SMS Campaign Queue
  smsCampaignQueue: SMSCampaignEntry[];
  pushToSMSCampaign: (
    lead: LeadContext,
    options?: {
      templateId?: string;
      message?: string;
      scheduledAt?: Date;
      priority?: number;
    },
  ) => void;
  removeFromSMSQueue: (entryId: string) => void;

  // Phone Center / Scheduled Calls
  scheduledCalls: ScheduledCall[];
  pushToPhoneCenter: (
    lead: LeadContext,
    options?: {
      scheduledAt?: Date;
      notes?: string;
      priority?: number;
    },
  ) => void;
  removeScheduledCall: (callId: string) => void;
  completeScheduledCall: (callId: string) => void;

  // Calendar
  calendarEvents: CalendarEvent[];
  isCalendarOpen: boolean;
  openCalendar: () => void;
  closeCalendar: () => void;
  addCalendarEvent: (event: Omit<CalendarEvent, "id">) => void;
  removeCalendarEvent: (eventId: string) => void;
  createGoogleCalendarEvent: (event: CalendarEvent) => void;

  // Quick action dialogs
  isSMSDialogOpen: boolean;
  openSMSDialog: (lead?: LeadContext) => void;
  closeSMSDialog: () => void;

  isScheduleCallDialogOpen: boolean;
  openScheduleCallDialog: (lead?: LeadContext) => void;
  closeScheduleCallDialog: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

const GlobalActionsContext = createContext<GlobalActionsContextType | null>(
  null,
);

export function useGlobalActions() {
  const context = useContext(GlobalActionsContext);
  if (!context) {
    throw new Error(
      "useGlobalActions must be used within GlobalActionsProvider",
    );
  }
  return context;
}

// Safe hook for optional use (won't throw if outside provider)
export function useGlobalActionsSafe() {
  return useContext(GlobalActionsContext);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

export function GlobalActionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Extract team ID from pathname
  const teamId = React.useMemo(() => {
    const match = pathname?.match(/\/t\/([^\/]+)/);
    return match ? match[1] : null;
  }, [pathname]);

  // State
  const [selectedLead, setSelectedLead] = useState<LeadContext | null>(null);
  const [smsCampaignQueue, setSMSCampaignQueue] = useState<SMSCampaignEntry[]>(
    [],
  );
  const [scheduledCalls, setScheduledCalls] = useState<ScheduledCall[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isSMSDialogOpen, setIsSMSDialogOpen] = useState(false);
  const [isScheduleCallDialogOpen, setIsScheduleCallDialogOpen] =
    useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // SMS CAMPAIGN ACTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  const pushToSMSCampaign = useCallback(
    (
      lead: LeadContext,
      options?: {
        templateId?: string;
        message?: string;
        scheduledAt?: Date;
        priority?: number;
      },
    ) => {
      if (!lead.phone) {
        toast.error("Cannot add to SMS queue", {
          description: "Lead has no phone number",
        });
        return;
      }

      const entry: SMSCampaignEntry = {
        id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        leadId: lead.id,
        leadName: lead.name,
        leadPhone: lead.phone,
        templateId: options?.templateId,
        message: options?.message,
        scheduledAt: options?.scheduledAt,
        priority: options?.priority || 5,
        status: "queued",
        createdAt: new Date(),
      };

      setSMSCampaignQueue((prev) => [...prev, entry]);

      toast.success("Added to SMS Campaign Queue", {
        description: `${lead.name || lead.phone} queued for initial message`,
        action: {
          label: "View Queue",
          onClick: () => router.push(`/t/${teamId}/sms/queue`),
        },
      });
    },
    [teamId, router],
  );

  const removeFromSMSQueue = useCallback((entryId: string) => {
    setSMSCampaignQueue((prev) => prev.filter((e) => e.id !== entryId));
    toast.success("Removed from SMS queue");
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // PHONE CENTER ACTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  const pushToPhoneCenter = useCallback(
    (
      lead: LeadContext,
      options?: {
        scheduledAt?: Date;
        notes?: string;
        priority?: number;
      },
    ) => {
      if (!lead.phone) {
        toast.error("Cannot schedule call", {
          description: "Lead has no phone number",
        });
        return;
      }

      const scheduledCall: ScheduledCall = {
        id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        leadId: lead.id,
        leadName: lead.name,
        leadPhone: lead.phone,
        scheduledAt: options?.scheduledAt || new Date(),
        notes: options?.notes,
        priority: options?.priority || 5,
        status: "pending",
        createdAt: new Date(),
      };

      setScheduledCalls((prev) => {
        // Sort by scheduled time and priority
        const updated = [...prev, scheduledCall];
        return updated.sort((a, b) => {
          if (a.priority !== b.priority) return b.priority - a.priority;
          return a.scheduledAt.getTime() - b.scheduledAt.getTime();
        });
      });

      // Also create a calendar event
      addCalendarEvent({
        title: `Call: ${lead.name || lead.phone}`,
        description: options?.notes,
        startTime: options?.scheduledAt || new Date(),
        endTime: new Date(
          (options?.scheduledAt || new Date()).getTime() + 30 * 60 * 1000,
        ),
        type: "call",
        leadId: lead.id,
      });

      toast.success("Added to Phone Center", {
        description: `Call scheduled for ${lead.name || lead.phone}`,
        action: {
          label: "View Schedule",
          onClick: () => router.push(`/t/${teamId}/power-dialer`),
        },
      });
    },
    [teamId, router],
  );

  const removeScheduledCall = useCallback((callId: string) => {
    setScheduledCalls((prev) => prev.filter((c) => c.id !== callId));
    toast.success("Removed from call schedule");
  }, []);

  const completeScheduledCall = useCallback((callId: string) => {
    setScheduledCalls((prev) =>
      prev.map((c) =>
        c.id === callId ? { ...c, status: "completed" as const } : c,
      ),
    );
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // CALENDAR ACTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  const openCalendar = useCallback(() => {
    setIsCalendarOpen(true);
  }, []);

  const closeCalendar = useCallback(() => {
    setIsCalendarOpen(false);
  }, []);

  const addCalendarEvent = useCallback((event: Omit<CalendarEvent, "id">) => {
    const newEvent: CalendarEvent = {
      ...event,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    setCalendarEvents((prev) => [...prev, newEvent]);
  }, []);

  const removeCalendarEvent = useCallback((eventId: string) => {
    setCalendarEvents((prev) => prev.filter((e) => e.id !== eventId));
  }, []);

  const createGoogleCalendarEvent = useCallback((event: CalendarEvent) => {
    const startDate = event.startTime.toISOString().replace(/-|:|\.\d{3}/g, "");
    const endDate = event.endTime.toISOString().replace(/-|:|\.\d{3}/g, "");

    const url = new URL("https://calendar.google.com/calendar/render");
    url.searchParams.set("action", "TEMPLATE");
    url.searchParams.set("text", event.title);
    url.searchParams.set("dates", `${startDate}/${endDate}`);
    if (event.description) url.searchParams.set("details", event.description);
    if (event.location) url.searchParams.set("location", event.location);

    window.open(url.toString(), "_blank");

    toast.success("Opening Google Calendar", {
      description: "Creating event in new tab",
    });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // DIALOG ACTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  const openSMSDialog = useCallback((lead?: LeadContext) => {
    if (lead) setSelectedLead(lead);
    setIsSMSDialogOpen(true);
  }, []);

  const closeSMSDialog = useCallback(() => {
    setIsSMSDialogOpen(false);
  }, []);

  const openScheduleCallDialog = useCallback((lead?: LeadContext) => {
    if (lead) setSelectedLead(lead);
    setIsScheduleCallDialogOpen(true);
  }, []);

  const closeScheduleCallDialog = useCallback(() => {
    setIsScheduleCallDialogOpen(false);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTEXT VALUE
  // ─────────────────────────────────────────────────────────────────────────────

  const value: GlobalActionsContextType = {
    selectedLead,
    setSelectedLead,
    teamId,
    smsCampaignQueue,
    pushToSMSCampaign,
    removeFromSMSQueue,
    scheduledCalls,
    pushToPhoneCenter,
    removeScheduledCall,
    completeScheduledCall,
    calendarEvents,
    isCalendarOpen,
    openCalendar,
    closeCalendar,
    addCalendarEvent,
    removeCalendarEvent,
    createGoogleCalendarEvent,
    isSMSDialogOpen,
    openSMSDialog,
    closeSMSDialog,
    isScheduleCallDialogOpen,
    openScheduleCallDialog,
    closeScheduleCallDialog,
  };

  return (
    <GlobalActionsContext.Provider value={value}>
      {children}
    </GlobalActionsContext.Provider>
  );
}
