"use client";

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * AI PERSONA CALENDAR
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * Embedded calendar in the AI Inbound Response Center that shows:
 * - Which AI persona is handling the current lead (GIANNA/CATHY/SABRINA)
 * - Their calendar availability
 * - Push-to-call center buttons
 * - Scheduled calls view
 *
 * PERSONAS:
 * - GIANNA: Handles initial, retarget, nurture
 * - CATHY: Handles nudger (ghost revival)
 * - SABRINA: Handles follow_up, book_appointment
 */

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar as CalendarIcon,
  Phone,
  PhoneCall,
  PhoneOutgoing,
  Clock,
  User,
  Building2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

// AI Persona types
type AIPersona = "gianna" | "cathy" | "sabrina";

interface ScheduledCall {
  id: string;
  leadId: string;
  leadName: string;
  companyName: string;
  phone: string;
  scheduledFor: Date;
  persona: AIPersona;
  status: "pending" | "confirmed" | "completed" | "missed" | "rescheduled";
  notes?: string;
  campaignContext: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  booked?: ScheduledCall;
}

// Persona configurations
const PERSONA_CONFIG: Record<
  AIPersona,
  {
    name: string;
    tagline: string;
    color: string;
    bgColor: string;
    icon: string;
    handles: string[];
  }
> = {
  gianna: {
    name: "GIANNA",
    tagline: "Direct, authoritative, gets to the point",
    color: "text-purple-400",
    bgColor: "bg-purple-600",
    icon: "G",
    handles: ["initial", "retarget", "nurture"],
  },
  cathy: {
    name: "CATHY",
    tagline: "Humor-based ghost revival",
    color: "text-pink-400",
    bgColor: "bg-pink-600",
    icon: "C",
    handles: ["nudger"],
  },
  sabrina: {
    name: "SABRINA",
    tagline: "Appointment booking specialist",
    color: "text-blue-400",
    bgColor: "bg-blue-600",
    icon: "S",
    handles: ["follow_up", "book_appointment"],
  },
};

interface AIPersonaCalendarProps {
  leadId?: string;
  leadName?: string;
  companyName?: string;
  phone?: string;
  campaignContext?: string;
  onCallScheduled?: (call: ScheduledCall) => void;
}

export function AIPersonaCalendar({
  leadId,
  leadName,
  companyName,
  phone,
  campaignContext = "initial",
  onCallScheduled,
}: AIPersonaCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [selectedPersona, setSelectedPersona] = useState<AIPersona>("gianna");
  const [scheduledCalls, setScheduledCalls] = useState<ScheduledCall[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [callNotes, setCallNotes] = useState("");

  // Determine which persona based on campaign context
  useEffect(() => {
    if (campaignContext) {
      if (["initial", "retarget", "nurture"].includes(campaignContext)) {
        setSelectedPersona("gianna");
      } else if (campaignContext === "nudger") {
        setSelectedPersona("cathy");
      } else if (["follow_up", "book_appointment"].includes(campaignContext)) {
        setSelectedPersona("sabrina");
      }
    }
  }, [campaignContext]);

  // Generate time slots for selected date
  useEffect(() => {
    if (selectedDate) {
      const slots: TimeSlot[] = [];
      const baseHour = 9; // 9 AM start

      for (let i = 0; i < 16; i++) {
        // 9 AM to 5 PM (half hour slots)
        const hour = Math.floor(baseHour + i / 2);
        const minutes = i % 2 === 0 ? "00" : "30";
        const time = `${hour.toString().padStart(2, "0")}:${minutes}`;
        const displayTime =
          hour > 12 ? `${hour - 12}:${minutes} PM` : `${hour}:${minutes} AM`;

        // Check if slot is booked
        const booked = scheduledCalls.find((call) => {
          const callDate = new Date(call.scheduledFor);
          return (
            callDate.toDateString() === selectedDate.toDateString() &&
            callDate.getHours() === hour &&
            callDate.getMinutes() === parseInt(minutes)
          );
        });

        slots.push({
          time: displayTime,
          available: !booked && hour >= 9 && hour < 17,
          booked,
        });
      }

      setTimeSlots(slots);
    }
  }, [selectedDate, scheduledCalls]);

  // Load scheduled calls
  useEffect(() => {
    // Simulated scheduled calls
    const mockCalls: ScheduledCall[] = [
      {
        id: "call_1",
        leadId: "lead_001",
        leadName: "John Smith",
        companyName: "ABC Plumbing",
        phone: "(555) 123-4567",
        scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        persona: "sabrina",
        status: "confirmed",
        campaignContext: "book_appointment",
      },
      {
        id: "call_2",
        leadId: "lead_002",
        leadName: "Jane Doe",
        companyName: "XYZ Construction",
        phone: "(555) 987-6543",
        scheduledFor: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
        persona: "gianna",
        status: "pending",
        campaignContext: "initial",
      },
    ];
    setScheduledCalls(mockCalls);
  }, []);

  const handleScheduleCall = async () => {
    if (!selectedSlot || !selectedDate || !leadId) return;

    setLoading(true);

    // Parse the selected time
    const [hourStr, rest] = selectedSlot.split(":");
    const [minutes, period] = rest.split(" ");
    let hour = parseInt(hourStr);
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;

    const scheduledFor = new Date(selectedDate);
    scheduledFor.setHours(hour, parseInt(minutes), 0, 0);

    const newCall: ScheduledCall = {
      id: `call_${Date.now()}`,
      leadId: leadId || "unknown",
      leadName: leadName || "Unknown Lead",
      companyName: companyName || "Unknown Company",
      phone: phone || "(XXX) XXX-XXXX",
      scheduledFor,
      persona: selectedPersona,
      status: "pending",
      notes: callNotes,
      campaignContext: campaignContext || "initial",
    };

    // Simulate API call
    await new Promise((r) => setTimeout(r, 500));

    setScheduledCalls((prev) => [...prev, newCall]);
    onCallScheduled?.(newCall);

    setLoading(false);
    setShowScheduleDialog(false);
    setSelectedSlot(null);
    setCallNotes("");
  };

  const handlePushToCallCenter = async () => {
    if (!leadId) return;

    setLoading(true);

    // Push lead to call center queue
    try {
      const response = await fetch("/api/call-center/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          leadName,
          companyName,
          phone,
          persona: selectedPersona,
          campaignContext,
          priority: "high",
        }),
      });

      if (response.ok) {
        console.log("[Calendar] Pushed to call center queue");
      }
    } catch (err) {
      console.error("[Calendar] Failed to push to call center:", err);
    }

    setLoading(false);
  };

  const persona = PERSONA_CONFIG[selectedPersona];
  const todaysCalls = scheduledCalls.filter(
    (call) =>
      new Date(call.scheduledFor).toDateString() === new Date().toDateString(),
  );

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold",
                persona.bgColor,
              )}
            >
              {persona.icon}
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {persona.name}'s Calendar
                <Badge className={persona.bgColor}>{campaignContext}</Badge>
              </CardTitle>
              <CardDescription className={persona.color}>
                {persona.tagline}
              </CardDescription>
            </div>
          </div>

          <Select
            value={selectedPersona}
            onValueChange={(v) => setSelectedPersona(v as AIPersona)}
          >
            <SelectTrigger className="w-36 bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gianna">GIANNA</SelectItem>
              <SelectItem value="cathy">CATHY</SelectItem>
              <SelectItem value="sabrina">SABRINA</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div className="flex gap-2">
          <Dialog
            open={showScheduleDialog}
            onOpenChange={setShowScheduleDialog}
          >
            <DialogTrigger asChild>
              <Button
                className={cn("flex-1", persona.bgColor, "hover:opacity-90")}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Schedule Call
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-700">
              <DialogHeader>
                <DialogTitle>Schedule Call with {persona.name}</DialogTitle>
                <DialogDescription>
                  {leadName
                    ? `Scheduling call for ${leadName} at ${companyName}`
                    : "Select a time slot"}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date</Label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="rounded-md border border-zinc-700 bg-zinc-800"
                    />
                  </div>
                  <div>
                    <Label>Available Times</Label>
                    <div className="h-[280px] overflow-y-auto space-y-1 mt-2">
                      {timeSlots.map((slot, i) => (
                        <Button
                          key={i}
                          variant={
                            selectedSlot === slot.time ? "default" : "outline"
                          }
                          size="sm"
                          className={cn(
                            "w-full justify-start",
                            !slot.available && "opacity-50 cursor-not-allowed",
                            selectedSlot === slot.time && persona.bgColor,
                          )}
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot.time)}
                        >
                          <Clock className="h-3 w-3 mr-2" />
                          {slot.time}
                          {slot.booked && (
                            <Badge className="ml-auto bg-zinc-600 text-xs">
                              Booked
                            </Badge>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Call Notes (optional)</Label>
                  <Textarea
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    placeholder="Add context for the call..."
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowScheduleDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleScheduleCall}
                  disabled={!selectedSlot || loading}
                  className={persona.bgColor}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Schedule Call"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            className="flex-1 border-orange-600 text-orange-400 hover:bg-orange-600/20"
            onClick={handlePushToCallCenter}
            disabled={loading || !phone}
          >
            <PhoneOutgoing className="h-4 w-4 mr-2" />
            Push to Call Center
          </Button>
        </div>

        {/* Today's Calls */}
        <div>
          <h4 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Today's Scheduled Calls ({todaysCalls.length})
          </h4>

          {todaysCalls.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-4">
              No calls scheduled for today
            </p>
          ) : (
            <div className="space-y-2">
              {todaysCalls.map((call) => {
                const callPersona = PERSONA_CONFIG[call.persona];
                return (
                  <div
                    key={call.id}
                    className="flex items-center justify-between p-2 bg-zinc-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold",
                          callPersona.bgColor,
                        )}
                      >
                        {callPersona.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium flex items-center gap-2">
                          {call.leadName}
                          <Badge
                            className={cn(
                              "text-xs",
                              call.status === "confirmed" && "bg-green-600",
                              call.status === "pending" && "bg-yellow-600",
                              call.status === "completed" && "bg-blue-600",
                            )}
                          >
                            {call.status}
                          </Badge>
                        </p>
                        <p className="text-xs text-zinc-400">
                          {call.companyName} • {call.phone}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono">
                        {new Date(call.scheduledFor).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs text-green-400"
                      >
                        <PhoneCall className="h-3 w-3 mr-1" />
                        Call Now
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Handles Info */}
        <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-800">
          <span className={persona.color}>{persona.name}</span> handles:{" "}
          {persona.handles.join(", ")}
        </div>
      </CardContent>
    </Card>
  );
}
