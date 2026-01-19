"use client";

import { useEffect, useState } from "react";
import { useCurrentTeam } from "@/features/team/team.context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone,
  Mail,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CallQueueLead {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string | null;
  source: string | null;
  createdAt: string;
  metadata?: {
    smsConsent?: boolean;
    source?: string;
  };
}

export function CallQueueList() {
  const { team } = useCurrentTeam();
  const [leads, setLeads] = useState<CallQueueLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCallQueueLeads = async () => {
    if (!team?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/leads/call-queue?teamId=${team.id}&limit=50`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch leads");
      }

      setLeads(data.leads || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load call queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCallQueueLeads();
  }, [team?.id]);

  const markAsCalled = async (leadId: string) => {
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "contacted",
          pipelineStatus: "contacted",
        }),
      });
      // Remove from list
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
    } catch (err) {
      console.error("Failed to update lead:", err);
    }
  };

  const markAsBooked = async (leadId: string) => {
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "qualified",
          pipelineStatus: "booked",
        }),
      });
      // Remove from list
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
    } catch (err) {
      console.error("Failed to update lead:", err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-10 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 text-center">
          <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCallQueueLeads}
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (leads.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-12 text-center">
          <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No leads in call queue</h3>
          <p className="text-muted-foreground mb-4">
            When people submit the form on your website, they'll appear here for
            you to call.
          </p>
          <Button variant="outline" onClick={fetchCallQueueLeads}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {leads.length} lead{leads.length !== 1 ? "s" : ""} waiting for your
          call
        </p>
        <Button variant="ghost" size="sm" onClick={fetchCallQueueLeads}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {leads.map((lead) => (
          <Card key={lead.id} className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                {/* Lead Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg truncate">
                      {lead.firstName} {lead.lastName}
                    </h3>
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200"
                    >
                      Call Queue
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        className="flex items-center gap-2 hover:text-primary"
                      >
                        <Phone className="h-4 w-4" />
                        {lead.phone}
                      </a>
                    )}
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}`}
                        className="flex items-center gap-2 hover:text-primary truncate"
                      >
                        <Mail className="h-4 w-4 shrink-0" />
                        {lead.email}
                      </a>
                    )}
                    {lead.company && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {lead.company}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {formatDistanceToNow(new Date(lead.createdAt), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>

                  {lead.source && (
                    <div className="mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {lead.source}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <a href={`tel:${lead.phone}`}>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                      <Phone className="h-4 w-4 mr-2" />
                      Call Now
                    </Button>
                  </a>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markAsCalled(lead.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Called
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markAsBooked(lead.id)}
                      className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Booked
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
