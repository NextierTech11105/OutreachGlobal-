"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  Video,
  Mail,
  ExternalLink,
  Settings,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  leadId?: string;
  leadName: string;
  leadPhone: string;
  leadEmail?: string;
  scheduledAt: string;
  duration: number;
  type: "call" | "meeting" | "demo" | "discovery" | "strategy";
  status: "scheduled" | "completed" | "cancelled" | "no-show";
  notes?: string;
  calendarEventId?: string;
  meetingLink?: string;
}

interface CalendarConnection {
  provider: "google" | "outlook";
  email: string;
  connected: boolean;
  lastSync?: string;
}

// Calendar grid helpers
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

export default function AppointmentsPage() {
  const params = useParams<{ team: string }>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("week");
  const [calendarConnections, setCalendarConnections] = useState<CalendarConnection[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Dialog states
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [showConnectCalendar, setShowConnectCalendar] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    leadName: "",
    leadPhone: "",
    leadEmail: "",
    date: "",
    time: "",
    type: "call",
    duration: "30",
    notes: "",
  });

  // Fetch appointments
  const fetchAppointments = useCallback(async () => {
    try {
      const start = getWeekStart(currentDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);

      const res = await fetch(
        `/api/appointments?teamId=${params.team}&start=${start.toISOString()}&end=${end.toISOString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
    } finally {
      setLoading(false);
    }
  }, [params.team, currentDate]);

  // Fetch calendar connections
  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch(`/api/calendar/connections?teamId=${params.team}`);
      if (res.ok) {
        const data = await res.json();
        setCalendarConnections(data.connections || []);
      }
    } catch (error) {
      console.error("Failed to fetch calendar connections:", error);
    }
  }, [params.team]);

  useEffect(() => {
    if (params.team) {
      fetchAppointments();
      fetchConnections();
    }
  }, [params.team, fetchAppointments, fetchConnections]);

  // Connect to Google Calendar
  const connectGoogle = async () => {
    try {
      const res = await fetch(`/api/calendar/google/auth?teamId=${params.team}`);
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      toast.error("Failed to connect Google Calendar");
    }
  };

  // Connect to Outlook
  const connectOutlook = async () => {
    try {
      const res = await fetch(`/api/calendar/outlook/auth?teamId=${params.team}`);
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      toast.error("Failed to connect Outlook");
    }
  };

  // Sync calendars
  const syncCalendars = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/calendar/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: params.team }),
      });
      if (res.ok) {
        toast.success("Calendars synced!");
        fetchAppointments();
      }
    } catch (error) {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // Create appointment
  const handleCreateAppointment = async () => {
    if (!formData.leadName || !formData.date || !formData.time) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      const scheduledAt = new Date(`${formData.date}T${formData.time}`).toISOString();

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          teamId: params.team,
          scheduledAt,
          duration: parseInt(formData.duration),
          syncToCalendar: calendarConnections.length > 0,
        }),
      });

      if (res.ok) {
        toast.success("Appointment scheduled!");
        setShowNewAppointment(false);
        resetForm();
        fetchAppointments();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create appointment");
      }
    } catch (error) {
      toast.error("Failed to create appointment");
    }
  };

  // Update status
  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });

      if (res.ok) {
        toast.success(`Marked as ${status}`);
        fetchAppointments();
      }
    } catch (error) {
      toast.error("Failed to update");
    }
  };

  const resetForm = () => {
    setFormData({
      leadName: "",
      leadPhone: "",
      leadEmail: "",
      date: "",
      time: "",
      type: "call",
      duration: "30",
      notes: "",
    });
    setSelectedSlot(null);
  };

  // Calendar navigation
  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  // Get week days
  const getWeekDays = () => {
    const start = getWeekStart(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      return day;
    });
  };

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Get appointments for a specific day/hour
  const getAppointmentsForSlot = (date: Date, hour: number) => {
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.scheduledAt);
      return (
        aptDate.getDate() === date.getDate() &&
        aptDate.getMonth() === date.getMonth() &&
        aptDate.getHours() === hour
      );
    });
  };

  // Handle slot click
  const handleSlotClick = (date: Date, hour: number) => {
    const slotDate = new Date(date);
    slotDate.setHours(hour, 0, 0, 0);

    setSelectedSlot({ date: slotDate, hour });
    setFormData((prev) => ({
      ...prev,
      date: slotDate.toISOString().split("T")[0],
      time: `${hour.toString().padStart(2, "0")}:00`,
    }));
    setShowNewAppointment(true);
  };

  const weekDays = getWeekDays();
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const formatWeekRange = () => {
    const start = weekDays[0];
    const end = weekDays[6];
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${start.toLocaleDateString("en-US", opts)} - ${end.toLocaleDateString("en-US", opts)}, ${end.getFullYear()}`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Calendar</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateWeek(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateWeek(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium ml-2">{formatWeekRange()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Calendar Connections Status */}
          {calendarConnections.length > 0 ? (
            <div className="flex items-center gap-2">
              {calendarConnections.map((conn) => (
                <Badge
                  key={conn.provider}
                  variant="outline"
                  className={cn(
                    "gap-1",
                    conn.provider === "google" ? "border-red-500" : "border-blue-500"
                  )}
                >
                  {conn.provider === "google" ? (
                    <Mail className="h-3 w-3 text-red-500" />
                  ) : (
                    <Mail className="h-3 w-3 text-blue-500" />
                  )}
                  {conn.email.split("@")[0]}
                </Badge>
              ))}
              <Button variant="ghost" size="sm" onClick={syncCalendars} disabled={syncing}>
                <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowConnectCalendar(true)}>
              <Mail className="h-4 w-4 mr-2" />
              Connect Calendar
            </Button>
          )}

          <Button onClick={() => setShowNewAppointment(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[800px]">
          {/* Day Headers */}
          <div className="grid grid-cols-8 border-b sticky top-0 bg-background z-10">
            <div className="p-2 border-r text-xs text-muted-foreground">Time</div>
            {weekDays.map((day, i) => (
              <div
                key={i}
                className={cn(
                  "p-2 text-center border-r",
                  isToday(day) && "bg-blue-50 dark:bg-blue-950"
                )}
              >
                <div className="text-xs text-muted-foreground">{DAYS[day.getDay()]}</div>
                <div
                  className={cn(
                    "text-lg font-semibold",
                    isToday(day) && "text-blue-600"
                  )}
                >
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* Time Slots */}
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b min-h-[60px]">
              <div className="p-2 border-r text-xs text-muted-foreground">
                {hour > 12 ? `${hour - 12} PM` : hour === 12 ? "12 PM" : `${hour} AM`}
              </div>
              {weekDays.map((day, dayIndex) => {
                const slotAppointments = getAppointmentsForSlot(day, hour);
                const isPast = new Date(day.setHours(hour)) < new Date();

                return (
                  <div
                    key={dayIndex}
                    className={cn(
                      "p-1 border-r cursor-pointer hover:bg-muted/50 transition-colors relative",
                      isToday(day) && "bg-blue-50/50 dark:bg-blue-950/50",
                      isPast && "opacity-50"
                    )}
                    onClick={() => !isPast && handleSlotClick(day, hour)}
                  >
                    {slotAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className={cn(
                          "p-1 rounded text-xs mb-1 cursor-pointer",
                          apt.type === "call" && "bg-green-100 dark:bg-green-900 border-l-2 border-green-500",
                          apt.type === "meeting" && "bg-blue-100 dark:bg-blue-900 border-l-2 border-blue-500",
                          apt.type === "demo" && "bg-purple-100 dark:bg-purple-900 border-l-2 border-purple-500",
                          apt.status === "completed" && "opacity-60",
                          apt.status === "cancelled" && "line-through opacity-40"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Could open detail view
                        }}
                      >
                        <div className="font-medium truncate">{apt.leadName}</div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          {apt.type === "call" ? (
                            <Phone className="h-3 w-3" />
                          ) : (
                            <Video className="h-3 w-3" />
                          )}
                          {apt.duration}m
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Appointments Sidebar */}
      <div className="w-80 border-l bg-muted/10 p-4 overflow-auto hidden lg:block absolute right-0 top-[140px] bottom-0">
        <h3 className="font-semibold mb-4">Upcoming Today</h3>
        {appointments
          .filter((apt) => {
            const aptDate = new Date(apt.scheduledAt);
            const today = new Date();
            return (
              aptDate.getDate() === today.getDate() &&
              aptDate.getMonth() === today.getMonth() &&
              apt.status === "scheduled"
            );
          })
          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
          .map((apt) => (
            <Card key={apt.id} className="mb-3">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{apt.leadName}</span>
                  <Badge variant="outline" className="text-xs">
                    {new Date(apt.scheduledAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  {apt.leadPhone}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-green-600"
                    onClick={() => handleUpdateStatus(apt.id, "completed")}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Done
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-red-600"
                    onClick={() => handleUpdateStatus(apt.id, "no-show")}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    No Show
                  </Button>
                </div>
                {apt.meetingLink && (
                  <Button
                    size="sm"
                    variant="link"
                    className="w-full mt-2 text-blue-600"
                    onClick={() => window.open(apt.meetingLink, "_blank")}
                  >
                    <Video className="h-3 w-3 mr-1" />
                    Join Meeting
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        {appointments.filter((apt) => {
          const aptDate = new Date(apt.scheduledAt);
          const today = new Date();
          return (
            aptDate.getDate() === today.getDate() &&
            aptDate.getMonth() === today.getMonth() &&
            apt.status === "scheduled"
          );
        }).length === 0 && (
          <p className="text-sm text-muted-foreground">No appointments today</p>
        )}
      </div>

      {/* New Appointment Dialog */}
      <Dialog open={showNewAppointment} onOpenChange={setShowNewAppointment}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule Appointment</DialogTitle>
            <DialogDescription>
              Create a new appointment. It will sync to your connected calendar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  placeholder="Lead name"
                  value={formData.leadName}
                  onChange={(e) => setFormData({ ...formData, leadName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  placeholder="Phone number"
                  value={formData.leadPhone}
                  onChange={(e) => setFormData({ ...formData, leadPhone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="Email for calendar invite"
                value={formData.leadEmail}
                onChange={(e) => setFormData({ ...formData, leadEmail: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="space-y-2">
                <Label>Time *</Label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">📞 Phone Call</SelectItem>
                    <SelectItem value="meeting">🤝 Video Meeting</SelectItem>
                    <SelectItem value="demo">🎬 Product Demo</SelectItem>
                    <SelectItem value="discovery">🔍 Discovery Call</SelectItem>
                    <SelectItem value="strategy">📋 Strategy Session</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select
                  value={formData.duration}
                  onValueChange={(v) => setFormData({ ...formData, duration: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Add notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            {calendarConnections.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-300">
                  Will sync to {calendarConnections.map((c) => c.provider).join(" & ")}
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewAppointment(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAppointment}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Connect Calendar Dialog */}
      <Dialog open={showConnectCalendar} onOpenChange={setShowConnectCalendar}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Connect Your Calendar</DialogTitle>
            <DialogDescription>
              Sync appointments with Google Calendar or Outlook
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Button
              variant="outline"
              className="w-full h-14 justify-start gap-4"
              onClick={connectGoogle}
            >
              <div className="w-8 h-8 rounded bg-red-100 flex items-center justify-center">
                <Mail className="h-5 w-5 text-red-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">Google Calendar</div>
                <div className="text-xs text-muted-foreground">
                  Connect your Gmail account
                </div>
              </div>
              <ExternalLink className="h-4 w-4 ml-auto" />
            </Button>

            <Button
              variant="outline"
              className="w-full h-14 justify-start gap-4"
              onClick={connectOutlook}
            >
              <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">Outlook Calendar</div>
                <div className="text-xs text-muted-foreground">
                  Connect your Microsoft account
                </div>
              </div>
              <ExternalLink className="h-4 w-4 ml-auto" />
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConnectCalendar(false)}>
              Skip for now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
