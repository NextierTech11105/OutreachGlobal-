"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Calendar,
  Clock,
  User,
  Phone,
  MapPin,
  Plus,
  Filter,
  Loader2,
  Search,
  X,
  CheckCircle,
  XCircle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface Appointment {
  id: string;
  leadId?: string;
  leadName: string;
  leadPhone: string;
  scheduledAt: string;
  duration: number;
  type: "call" | "meeting" | "demo" | "discovery" | "strategy";
  status: "scheduled" | "completed" | "cancelled" | "no-show";
  notes?: string;
}

interface Lead {
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  companyName?: string;
}

export default function AppointmentsPage() {
  const params = useParams<{ team: string }>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");

  // New appointment dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [leadSearch, setLeadSearch] = useState("");
  const [leadResults, setLeadResults] = useState<Lead[]>([]);
  const [searchingLeads, setSearchingLeads] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Form state
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [appointmentType, setAppointmentType] = useState<string>("call");
  const [appointmentDuration, setAppointmentDuration] = useState("15");
  const [appointmentNotes, setAppointmentNotes] = useState("");

  // Fetch appointments from real API
  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch(`/api/appointments?teamId=${params.team}`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
    } finally {
      setLoading(false);
    }
  }, [params.team]);

  useEffect(() => {
    if (params.team) fetchAppointments();
  }, [params.team, fetchAppointments]);

  // Search leads
  const searchLeads = useCallback(
    async (query: string) => {
      if (!query || query.length < 2) {
        setLeadResults([]);
        return;
      }

      setSearchingLeads(true);
      try {
        const res = await fetch(
          `/api/leads/search?teamId=${params.team}&q=${encodeURIComponent(query)}&limit=10`,
        );
        if (res.ok) {
          const data = await res.json();
          setLeadResults(data.leads || []);
        }
      } catch (error) {
        console.error("Failed to search leads:", error);
      } finally {
        setSearchingLeads(false);
      }
    },
    [params.team],
  );

  // Debounced lead search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (leadSearch) searchLeads(leadSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [leadSearch, searchLeads]);

  // Create appointment
  const handleCreateAppointment = async () => {
    if (!selectedLead) {
      toast.error("Please select a lead");
      return;
    }
    if (!appointmentDate || !appointmentTime) {
      toast.error("Please select date and time");
      return;
    }

    setCreating(true);
    try {
      const scheduledAt = new Date(
        `${appointmentDate}T${appointmentTime}`,
      ).toISOString();

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: selectedLead.id,
          teamId: params.team,
          scheduledAt,
          duration: parseInt(appointmentDuration),
          type: appointmentType,
          notes: appointmentNotes || undefined,
        }),
      });

      if (res.ok) {
        toast.success("Appointment scheduled!");
        setDialogOpen(false);
        resetForm();
        fetchAppointments();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create appointment");
      }
    } catch (error) {
      toast.error("Failed to create appointment");
    } finally {
      setCreating(false);
    }
  };

  // Update appointment status
  const handleUpdateStatus = async (
    leadId: string,
    status: "completed" | "cancelled" | "no-show",
  ) => {
    try {
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, status }),
      });

      if (res.ok) {
        toast.success(`Appointment marked as ${status}`);
        fetchAppointments();
      }
    } catch (error) {
      toast.error("Failed to update appointment");
    }
  };

  const resetForm = () => {
    setLeadSearch("");
    setLeadResults([]);
    setSelectedLead(null);
    setAppointmentDate("");
    setAppointmentTime("");
    setAppointmentType("call");
    setAppointmentDuration("15");
    setAppointmentNotes("");
  };

  const openDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const getStatusColor = (status: Appointment["status"]) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      case "cancelled":
        return "bg-gray-500";
      case "no-show":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getTypeIcon = (type: Appointment["type"]) => {
    switch (type) {
      case "call":
        return <Phone className="h-4 w-4" />;
      case "meeting":
      case "discovery":
      case "strategy":
        return <User className="h-4 w-4" />;
      case "demo":
        return <MapPin className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getLeadDisplayName = (lead: Lead) => {
    const name = `${lead.firstName || ""} ${lead.lastName || ""}`.trim();
    return name || lead.email || lead.phone || "Unknown";
  };

  // Filter appointments based on active tab
  const filteredAppointments = appointments.filter((apt) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const aptDate = new Date(apt.scheduledAt);

    switch (activeTab) {
      case "today":
        return (
          aptDate >= today && aptDate < tomorrow && apt.status === "scheduled"
        );
      case "upcoming":
        return aptDate >= tomorrow && apt.status === "scheduled";
      case "past":
        return aptDate < today || apt.status === "completed";
      case "cancelled":
        return apt.status === "cancelled" || apt.status === "no-show";
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">
            Manage your scheduled calls, meetings, and demos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button onClick={openDialog}>
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid gap-4">
            {filteredAppointments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No appointments</h3>
                  <p className="text-muted-foreground text-center mt-1">
                    Schedule your first appointment to get started
                  </p>
                  <Button className="mt-4" onClick={openDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Schedule Appointment
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredAppointments.map((apt) => (
                <Card
                  key={apt.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-full ${getStatusColor(apt.status)} bg-opacity-20`}
                        >
                          {getTypeIcon(apt.type)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {apt.leadName}
                          </CardTitle>
                          <CardDescription>{apt.leadPhone}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {apt.status === "scheduled" && apt.leadId && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600"
                              onClick={() =>
                                handleUpdateStatus(apt.leadId!, "completed")
                              }
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              onClick={() =>
                                handleUpdateStatus(apt.leadId!, "no-show")
                              }
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              No Show
                            </Button>
                          </>
                        )}
                        <Badge
                          variant="outline"
                          className={getStatusColor(apt.status) + " text-white"}
                        >
                          {apt.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(apt.scheduledAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {apt.duration} min
                      </div>
                      <Badge variant="secondary">{apt.type}</Badge>
                    </div>
                    {apt.notes && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        {apt.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* New Appointment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule New Appointment</DialogTitle>
            <DialogDescription>
              Search for a lead and schedule a call, meeting, or demo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Lead Search */}
            <div className="space-y-2">
              <Label>Lead</Label>
              {selectedLead ? (
                <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                  <div>
                    <p className="font-medium">
                      {getLeadDisplayName(selectedLead)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedLead.phone || selectedLead.email}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedLead(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, phone, or email..."
                    className="pl-9"
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                  />
                  {searchingLeads && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                  )}
                  {leadResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-auto">
                      {leadResults.map((lead) => (
                        <button
                          key={lead.id}
                          className="w-full p-3 text-left hover:bg-muted transition-colors"
                          onClick={() => {
                            setSelectedLead(lead);
                            setLeadResults([]);
                            setLeadSearch("");
                          }}
                        >
                          <p className="font-medium">
                            {getLeadDisplayName(lead)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {lead.phone}{" "}
                            {lead.companyName && `• ${lead.companyName}`}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                />
              </div>
            </div>

            {/* Type and Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={appointmentType}
                  onValueChange={setAppointmentType}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Phone Call</SelectItem>
                    <SelectItem value="discovery">15-min Discovery</SelectItem>
                    <SelectItem value="strategy">Strategy Session</SelectItem>
                    <SelectItem value="demo">Product Demo</SelectItem>
                    <SelectItem value="meeting">General Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select
                  value={appointmentDuration}
                  onValueChange={setAppointmentDuration}
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

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Add any notes about this appointment..."
                value={appointmentNotes}
                onChange={(e) => setAppointmentNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAppointment} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Schedule Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
