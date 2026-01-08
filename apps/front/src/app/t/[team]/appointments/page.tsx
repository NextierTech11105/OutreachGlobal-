"use client";

import { useState, useEffect } from "react";
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

interface Appointment {
  id: string;
  leadName: string;
  leadPhone: string;
  scheduledAt: string;
  duration: number;
  type: "call" | "meeting" | "demo";
  status: "scheduled" | "completed" | "cancelled" | "no-show";
  notes?: string;
}

export default function AppointmentsPage() {
  const params = useParams<{ team: string }>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch appointments from real API
  useEffect(() => {
    async function fetchAppointments() {
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
    }
    if (params.team) fetchAppointments();
  }, [params.team]);
  const [activeTab, setActiveTab] = useState("upcoming");

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
          <Button>
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
            {appointments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No appointments</h3>
                  <p className="text-muted-foreground text-center mt-1">
                    Schedule your first appointment to get started
                  </p>
                  <Button className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Schedule Appointment
                  </Button>
                </CardContent>
              </Card>
            ) : (
              appointments.map((apt) => (
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
                      <Badge
                        variant="outline"
                        className={getStatusColor(apt.status) + " text-white"}
                      >
                        {apt.status}
                      </Badge>
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
    </div>
  );
}
