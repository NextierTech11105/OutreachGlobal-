"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  MessageCircle,
  Send,
  RefreshCw,
  Clock,
  Phone,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

/**
 * NUDGER WORKSPACE - CATHY AI
 *
 * Simple, clean interface for following up with stale leads.
 * Fetches REAL leads from the database - no mock data.
 */

interface NudgeLead {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  company?: string;
  lastContactAt: string;
  daysSinceContact: number;
  status: string;
}

export default function NudgerWorkspacePage() {
  const params = useParams();
  const teamId = params.team as string;

  const [leads, setLeads] = useState<NudgeLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<NudgeLead | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Fetch leads that need nudging (stale leads)
  useEffect(() => {
    async function fetchLeads() {
      try {
        const response = await fetch(`/api/leads?teamId=${teamId}&status=nurturing&limit=50`);
        const data = await response.json();

        if (data.success && data.leads) {
          // Transform and calculate days since contact
          const now = new Date();
          const nudgeLeads: NudgeLead[] = data.leads
            .map((lead: Record<string, unknown>) => {
              const lastContact = lead.updatedAt ? new Date(lead.updatedAt as string) : new Date(lead.createdAt as string);
              const daysSince = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
              return {
                id: lead.id,
                firstName: lead.firstName || "",
                lastName: lead.lastName || "",
                phone: lead.phone || "",
                email: lead.email || "",
                company: lead.company || "",
                lastContactAt: lastContact.toISOString(),
                daysSinceContact: daysSince,
                status: lead.status || "new",
              };
            })
            .filter((l: NudgeLead) => l.phone && l.daysSinceContact >= 2); // Only leads with phone, 2+ days stale

          setLeads(nudgeLeads);
        }
      } catch (error) {
        console.error("Failed to fetch leads:", error);
        toast.error("Failed to load leads");
      } finally {
        setLoading(false);
      }
    }

    fetchLeads();
  }, [teamId]);

  // Generate a simple nudge message
  const generateMessage = (lead: NudgeLead) => {
    const firstName = lead.firstName || "there";
    return `Hey ${firstName}, just checking in! Wanted to see if you had any questions or if now is a better time to chat. Let me know!`;
  };

  // Send the nudge via SignalHouse SMS
  const handleSendNudge = async () => {
    if (!selectedLead || !message.trim()) {
      toast.error("Select a lead and enter a message");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/signalhouse/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selectedLead.phone,
          message: message.trim(),
          leadId: selectedLead.id,
          worker: "cathy",
          teamId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Nudge sent to ${selectedLead.firstName || selectedLead.phone}`);
        // Remove from list
        setLeads(prev => prev.filter(l => l.id !== selectedLead.id));
        setSelectedLead(null);
        setMessage("");
      } else {
        toast.error(data.error || "Failed to send SMS");
      }
    } catch (error) {
      console.error("Send error:", error);
      toast.error("Failed to send nudge");
    } finally {
      setSending(false);
    }
  };

  // Select a lead and populate message
  const handleSelectLead = (lead: NudgeLead) => {
    setSelectedLead(lead);
    setMessage(generateMessage(lead));
  };

  // Skip lead (move to next)
  const handleSkip = () => {
    if (selectedLead) {
      setLeads(prev => prev.filter(l => l.id !== selectedLead.id));
      setSelectedLead(null);
      setMessage("");
      toast.info("Lead skipped");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-pink-500" />
          Nudger Workspace
          <Badge variant="outline" className="ml-2 text-pink-600 border-pink-300">
            CATHY
          </Badge>
        </h1>
        <p className="text-muted-foreground">
          Follow up with stale leads • {leads.length} leads ready
        </p>
      </div>

      {leads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-medium">All caught up!</h3>
            <p className="text-muted-foreground">No stale leads to nudge right now.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lead List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Leads to Nudge</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedLead?.id === lead.id
                      ? "border-pink-500 bg-pink-50 dark:bg-pink-950/20"
                      : "hover:border-pink-300"
                  }`}
                  onClick={() => handleSelectLead(lead)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {lead.firstName} {lead.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {lead.phone}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {lead.daysSinceContact}d ago
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Message Composer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedLead ? `Message ${selectedLead.firstName || "Lead"}` : "Select a Lead"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedLead ? (
                <div className="space-y-4">
                  {/* Lead Info */}
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4" />
                      <span>{selectedLead.phone}</span>
                    </div>
                    {selectedLead.company && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedLead.company}
                      </p>
                    )}
                  </div>

                  {/* Message Input */}
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your nudge message..."
                    rows={4}
                  />

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-pink-600 hover:bg-pink-700"
                      onClick={handleSendNudge}
                      disabled={sending || !message.trim()}
                    >
                      {sending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Send Nudge
                    </Button>
                    <Button variant="outline" onClick={handleSkip}>
                      Skip
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Click on a lead to compose a nudge message</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
