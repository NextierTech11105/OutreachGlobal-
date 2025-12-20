"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  Phone,
  Loader2,
  Bell,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

/**
 * SABRINA WORKSPACE - Appointment Confirmation
 *
 * SABRINA ONLY confirms and reminds about BOOKED appointments.
 * She does NOT book appointments, handle objections, or close leads.
 *
 * Workflow:
 * 1. Appointment is booked (by GIANNA or manually)
 * 2. SABRINA sends confirmation message
 * 3. SABRINA sends 24-hour reminder
 * 4. SABRINA sends day-of reminder
 */

interface Appointment {
  id: string;
  leadId: string;
  leadName: string;
  phone: string;
  email?: string;
  appointmentDate: string;
  appointmentTime: string;
  hoursUntil: number;
  status: "booked" | "confirmed" | "reminded" | "completed" | "no_show";
  confirmationSent: boolean;
  reminderSent: boolean;
}

export default function SabrinaWorkspacePage() {
  const params = useParams();
  const teamId = params.team as string;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Fetch upcoming appointments
  useEffect(() => {
    async function fetchAppointments() {
      try {
        const response = await fetch(`/api/calendar/appointments?teamId=${teamId}&upcoming=true`);
        const data = await response.json();

        if (data.success && data.appointments) {
          setAppointments(data.appointments);
        } else {
          // No appointments API yet - show empty state
          setAppointments([]);
        }
      } catch (error) {
        console.error("Failed to fetch appointments:", error);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    }

    fetchAppointments();
  }, [teamId]);

  // Generate confirmation or reminder message
  const generateMessage = (appt: Appointment, type: "confirm" | "remind") => {
    const firstName = appt.leadName.split(" ")[0] || "there";
    const date = new Date(appt.appointmentDate).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    const time = appt.appointmentTime;

    if (type === "confirm") {
      return `Hi ${firstName}! Your appointment is confirmed for ${date} at ${time}. Reply YES to confirm or call us if you need to reschedule. - Sabrina`;
    } else {
      return `Hi ${firstName}! Just a reminder - your appointment is tomorrow, ${date} at ${time}. See you then! Reply if you have any questions. - Sabrina`;
    }
  };

  // Send confirmation or reminder
  const handleSendMessage = async (type: "confirm" | "remind") => {
    if (!selectedAppt || !message.trim()) {
      toast.error("Select an appointment and enter a message");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/signalhouse/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selectedAppt.phone,
          message: message.trim(),
          leadId: selectedAppt.leadId,
          worker: "sabrina",
          teamId,
          messageType: type,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          type === "confirm"
            ? `Confirmation sent to ${selectedAppt.leadName}`
            : `Reminder sent to ${selectedAppt.leadName}`
        );

        // Update appointment status
        setAppointments(prev =>
          prev.map(a =>
            a.id === selectedAppt.id
              ? {
                  ...a,
                  confirmationSent: type === "confirm" ? true : a.confirmationSent,
                  reminderSent: type === "remind" ? true : a.reminderSent,
                  status: type === "confirm" ? "confirmed" : "reminded",
                }
              : a
          )
        );
        setSelectedAppt(null);
        setMessage("");
      } else {
        toast.error(data.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Send error:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleSelectAppt = (appt: Appointment, type: "confirm" | "remind") => {
    setSelectedAppt(appt);
    setMessage(generateMessage(appt, type));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Separate appointments by status
  const needsConfirmation = appointments.filter(a => !a.confirmationSent);
  const needsReminder = appointments.filter(a => a.confirmationSent && !a.reminderSent && a.hoursUntil <= 24);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          Confirmation Workspace
          <Badge variant="outline" className="ml-2 text-emerald-600 border-emerald-300">
            SABRINA
          </Badge>
        </h1>
        <p className="text-muted-foreground">
          Confirm appointments and send reminders • {appointments.length} upcoming
        </p>
      </div>

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium">No upcoming appointments</h3>
            <p className="text-muted-foreground">
              Appointments will appear here when leads are booked.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Appointments List */}
          <div className="space-y-6">
            {/* Needs Confirmation */}
            {needsConfirmation.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    Needs Confirmation ({needsConfirmation.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {needsConfirmation.map((appt) => (
                    <div
                      key={appt.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedAppt?.id === appt.id
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                          : "hover:border-emerald-300"
                      }`}
                      onClick={() => handleSelectAppt(appt, "confirm")}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{appt.leadName}</p>
                          <p className="text-sm text-muted-foreground">
                            {appt.phone}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">
                            {new Date(appt.appointmentDate).toLocaleDateString()}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            {appt.appointmentTime}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Needs Reminder */}
            {needsReminder.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="h-5 w-5 text-yellow-500" />
                    Needs Reminder ({needsReminder.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {needsReminder.map((appt) => (
                    <div
                      key={appt.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedAppt?.id === appt.id
                          ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
                          : "hover:border-yellow-300"
                      }`}
                      onClick={() => handleSelectAppt(appt, "remind")}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{appt.leadName}</p>
                          <p className="text-sm text-muted-foreground">
                            {appt.phone}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-yellow-100">
                          {appt.hoursUntil}h until appt
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Message Composer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedAppt ? `Message ${selectedAppt.leadName}` : "Select an Appointment"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedAppt ? (
                <div className="space-y-4">
                  {/* Appointment Info */}
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(selectedAppt.appointmentDate).toLocaleDateString()} at {selectedAppt.appointmentTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm mt-1">
                      <Phone className="h-4 w-4" />
                      <span>{selectedAppt.phone}</span>
                    </div>
                  </div>

                  {/* Message Input */}
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your message..."
                    rows={4}
                  />

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleSendMessage(selectedAppt.confirmationSent ? "remind" : "confirm")}
                      disabled={sending || !message.trim()}
                    >
                      {sending ? (
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      {selectedAppt.confirmationSent ? "Send Reminder" : "Send Confirmation"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedAppt(null);
                        setMessage("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Click on an appointment to send a confirmation or reminder</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
