"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  MessageSquare,
  Send,
  Phone,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

/**
 * INITIAL MESSAGE WORKSPACE - GIANNA AI
 *
 * Send first outreach messages to new leads.
 * Fetches REAL leads from the database - no mock data.
 */

// Message templates
const TEMPLATES = [
  {
    id: "valuation",
    name: "Property Valuation",
    template: "Hi {firstName}, I put together a quick valuation report for your property. What's the best email to send it to?",
  },
  {
    id: "blueprint",
    name: "AI Blueprint",
    template: "Hey {firstName}! I've been helping companies with AI automation. Got a blueprint that saves 10+ hrs/week. Best email to send it?",
  },
  {
    id: "check_in",
    name: "Simple Check-In",
    template: "Hi {firstName}, this is Gianna - wanted to quickly reach out about your property. Got a minute to chat?",
  },
];

interface InitialLead {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  company?: string;
  address?: string;
  status: string;
}

export default function InitialMessageWorkspacePage() {
  const params = useParams();
  const teamId = params.team as string;

  const [leads, setLeads] = useState<InitialLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<InitialLead | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id);

  // Fetch new leads that need initial outreach
  useEffect(() => {
    async function fetchLeads() {
      try {
        const response = await fetch(`/api/leads?teamId=${teamId}&status=new&limit=50`);
        const data = await response.json();

        if (data.success && data.leads) {
          const initialLeads: InitialLead[] = data.leads
            .map((lead: Record<string, unknown>) => ({
              id: lead.id,
              firstName: lead.firstName || "",
              lastName: lead.lastName || "",
              phone: lead.phone || "",
              email: lead.email || "",
              company: lead.company || "",
              address: lead.address || "",
              status: lead.status || "new",
            }))
            .filter((l: InitialLead) => l.phone); // Only leads with phone

          setLeads(initialLeads);
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

  // Generate message from template
  const generateMessage = (lead: InitialLead, templateId: string) => {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (!template) return "";

    const firstName = lead.firstName || "there";
    return template.template.replace(/{firstName}/g, firstName);
  };

  // Send initial message
  const handleSendMessage = async () => {
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
          worker: "gianna",
          teamId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Message sent to ${selectedLead.firstName || selectedLead.phone}`);

        // Update lead status and remove from list
        await fetch("/api/leads/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: selectedLead.id,
            status: "contacted",
          }),
        });

        setLeads(prev => prev.filter(l => l.id !== selectedLead.id));
        setSelectedLead(null);
        setMessage("");
      } else {
        toast.error(data.error || "Failed to send SMS");
      }
    } catch (error) {
      console.error("Send error:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleSelectLead = (lead: InitialLead) => {
    setSelectedLead(lead);
    setMessage(generateMessage(lead, selectedTemplate));
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (selectedLead) {
      setMessage(generateMessage(selectedLead, templateId));
    }
  };

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
          <MessageSquare className="h-6 w-6 text-blue-500" />
          Initial Message Workspace
          <Badge variant="outline" className="ml-2 text-blue-600 border-blue-300">
            GIANNA
          </Badge>
        </h1>
        <p className="text-muted-foreground">
          Send first outreach to new leads • {leads.length} leads ready
        </p>
      </div>

      {leads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-medium">No new leads</h3>
            <p className="text-muted-foreground">New leads will appear here when added.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lead List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">New Leads</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedLead?.id === lead.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                      : "hover:border-blue-300"
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
                    {lead.company && (
                      <Badge variant="outline">{lead.company}</Badge>
                    )}
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
                    {selectedLead.address && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedLead.address}
                      </p>
                    )}
                  </div>

                  {/* Template Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Template</label>
                    <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATES.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      onClick={handleSendMessage}
                      disabled={sending || !message.trim()}
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Send Message
                    </Button>
                    <Button variant="outline" onClick={handleSkip}>
                      Skip
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Click on a lead to compose an initial message</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
