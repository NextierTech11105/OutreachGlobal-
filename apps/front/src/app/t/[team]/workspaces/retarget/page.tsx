"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  RefreshCw,
  Send,
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
 * RETARGET WORKSPACE - CATHY AI
 *
 * Re-engage leads who haven't responded.
 * Fetches REAL leads from the database - no mock data.
 */

interface RetargetLead {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  company?: string;
  lastContactAt: string;
  daysSinceContact: number;
  previousAttempts: number;
  status: string;
}

export default function RetargetWorkspacePage() {
  const params = useParams();
  const teamId = params.team as string;

  const [leads, setLeads] = useState<RetargetLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<RetargetLead | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Fetch leads that need retargeting (no response leads)
  useEffect(() => {
    async function fetchLeads() {
      try {
        // Fetch leads with status "contacted" that haven't responded
        const response = await fetch(
          `/api/leads?teamId=${teamId}&status=contacted&limit=50`,
        );
        const data = await response.json();

        if (data.success && data.leads) {
          const now = new Date();
          const retargetLeads: RetargetLead[] = data.leads
            .map((lead: Record<string, unknown>) => {
              const lastContact = lead.updatedAt
                ? new Date(lead.updatedAt as string)
                : new Date(lead.createdAt as string);
              const daysSince = Math.floor(
                (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24),
              );
              return {
                id: lead.id,
                firstName: lead.firstName || "",
                lastName: lead.lastName || "",
                phone: lead.phone || "",
                email: lead.email || "",
                company: lead.company || "",
                lastContactAt: lastContact.toISOString(),
                daysSinceContact: daysSince,
                previousAttempts: 1,
                status: lead.status || "contacted",
              };
            })
            .filter((l: RetargetLead) => l.phone && l.daysSinceContact >= 3); // 3+ days without response

          setLeads(retargetLeads);
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

  // Generate retarget message
  const generateMessage = (lead: RetargetLead) => {
    const firstName = lead.firstName || "there";
    const days = lead.daysSinceContact;

    if (days < 7) {
      return `Hey ${firstName}! Just checking in - still interested in chatting? Let me know if now is a better time! - Cathy`;
    } else if (days < 14) {
      return `Hey ${firstName}, wanted to circle back! I know things get busy. If you're still interested, just reply and we can set up a quick call. - Cathy`;
    } else {
      return `Hey ${firstName}! It's been a while - just making sure my messages are getting through. If you're still interested, I'm here! - Cathy`;
    }
  };

  // Send retarget message via SignalHouse SMS
  const handleSendRetarget = async () => {
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
        toast.success(
          `Retarget sent to ${selectedLead.firstName || selectedLead.phone}`,
        );
        setLeads((prev) => prev.filter((l) => l.id !== selectedLead.id));
        setSelectedLead(null);
        setMessage("");
      } else {
        toast.error(data.error || "Failed to send SMS");
      }
    } catch (error) {
      console.error("Send error:", error);
      toast.error("Failed to send retarget");
    } finally {
      setSending(false);
    }
  };

  const handleSelectLead = (lead: RetargetLead) => {
    setSelectedLead(lead);
    setMessage(generateMessage(lead));
  };

  const handleSkip = () => {
    if (selectedLead) {
      setLeads((prev) => prev.filter((l) => l.id !== selectedLead.id));
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
          <RefreshCw className="h-6 w-6 text-purple-500" />
          Retarget Workspace
          <Badge
            variant="outline"
            className="ml-2 text-purple-600 border-purple-300"
          >
            CATHY
          </Badge>
        </h1>
        <p className="text-muted-foreground">
          Re-engage leads who haven't responded • {leads.length} leads
        </p>
      </div>

      {leads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-medium">No leads to retarget</h3>
            <p className="text-muted-foreground">
              All leads have been contacted recently.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lead List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Leads to Retarget</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedLead?.id === lead.id
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20"
                      : "hover:border-purple-300"
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
                    <Badge
                      variant={
                        lead.daysSinceContact > 7 ? "destructive" : "outline"
                      }
                    >
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
                {selectedLead
                  ? `Retarget ${selectedLead.firstName || "Lead"}`
                  : "Select a Lead"}
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
                    <p className="text-sm text-muted-foreground mt-1">
                      Last contact: {selectedLead.daysSinceContact} days ago
                    </p>
                  </div>

                  {/* Message Input */}
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your retarget message..."
                    rows={4}
                  />

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                      onClick={handleSendRetarget}
                      disabled={sending || !message.trim()}
                    >
                      {sending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Send Retarget
                    </Button>
                    <Button variant="outline" onClick={handleSkip}>
                      Skip
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Click on a lead to compose a retarget message</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
