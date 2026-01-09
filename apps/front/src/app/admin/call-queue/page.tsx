"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PhoneCall, Loader2, Phone, Users, Clock, Flame } from "lucide-react";
import Link from "next/link";

interface QueuedLead {
  id: string;
  name: string;
  company?: string;
  phone: string;
  priority: "hot" | "warm" | "cold";
  reason: string;
  addedAt: string;
}

export default function CallQueuePage() {
  const [queuedLeads, setQueuedLeads] = useState<QueuedLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQueue() {
      try {
        const response = await fetch("/api/admin/call-queue");
        const data = await response.json();
        if (data.leads) {
          setQueuedLeads(data.leads);
        }
      } catch (error) {
        console.error("Failed to fetch call queue:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchQueue();
  }, []);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "hot":
        return <Badge className="bg-red-500">HOT</Badge>;
      case "warm":
        return <Badge className="bg-orange-500">Warm</Badge>;
      default:
        return <Badge variant="outline">Cold</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <PhoneCall className="h-8 w-8 text-orange-500" />
            Call Queue
          </h1>
          <p className="text-muted-foreground mt-1">
            Hot leads ready for immediate dial
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/power-dialer">
            <Phone className="mr-2 h-4 w-4" />
            Open Power Dialer
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-100">
                <Flame className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {queuedLeads.filter((l) => l.priority === "hot").length}
                </p>
                <p className="text-sm text-muted-foreground">Hot Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-100">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{queuedLeads.length}</p>
                <p className="text-sm text-muted-foreground">Total in Queue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Avg Wait Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Queued Leads</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : queuedLeads.length === 0 ? (
            <div className="text-center py-12">
              <PhoneCall className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No leads in queue</h3>
              <p className="text-muted-foreground mb-4">
                Leads are automatically added when they respond to campaigns
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queuedLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>{getPriorityBadge(lead.priority)}</TableCell>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>{lead.company || "-"}</TableCell>
                    <TableCell>{lead.phone}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {lead.reason}
                    </TableCell>
                    <TableCell>
                      <Button size="sm">
                        <Phone className="mr-1 h-3 w-3" />
                        Call
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
