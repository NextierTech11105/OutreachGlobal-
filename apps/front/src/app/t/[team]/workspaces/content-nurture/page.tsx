"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  BookOpen,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
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
 * CONTENT NURTURE WORKSPACE - GIANNA AI
 *
 * Drip "Did You Know" content to leads in nurture mode.
 * Industry insights, articles, valuable content.
 */

const CONTENT_TEMPLATES = [
  {
    id: "did_you_know",
    name: "Did You Know?",
    template:
      "Hey {firstName}! Did you know that {factTopic}? Thought you might find this interesting. Want me to send you more info?",
  },
  {
    id: "industry_news",
    name: "Industry News",
    template:
      "Hi {firstName}, just saw some news about {industry} that made me think of you. Quick question - are you still interested in {topic}?",
  },
  {
    id: "value_article",
    name: "Valuable Article",
    template:
      "Hey {firstName}! Found this great article about {topic}. Best email to send it to?",
  },
  {
    id: "check_in",
    name: "Soft Check-In",
    template:
      "Hi {firstName}, hope you're doing well! Just checking in - anything I can help with?",
  },
];

interface NurtureLead {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  company?: string;
  lastContactedAt?: string;
  status: string;
}

export default function ContentNurtureWorkspacePage() {
  const params = useParams();
  const teamId = params.team as string;

  const [leads, setLeads] = useState<NurtureLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<NurtureLead | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(
    CONTENT_TEMPLATES[0].id,
  );

  // Fetch leads in nurture status
  useEffect(() => {
    async function fetchLeads() {
      try {
        const response = await fetch(
          `/api/leads?teamId=${teamId}&status=nurture&limit=50`,
        );
        const data = await response.json();

        if (data.success && data.leads) {
          const nurtureLeads: NurtureLead[] = data.leads
            .map((lead: Record<string, unknown>) => ({
              id: lead.id,
              firstName: lead.firstName || "",
              lastName: lead.lastName || "",
              phone: lead.phone || "",
              email: lead.email || "",
              company: lead.company || "",
              lastContactedAt: lead.updatedAt || "",
              status: lead.status || "nurture",
            }))
            .filter((l: NurtureLead) => l.phone);

          setLeads(nurtureLeads);
        }
      } catch (error) {
        console.error("Failed to fetch leads:", error);
        toast.error("Failed to load nurture leads");
      } finally {
        setLoading(false);
      }
    }

    fetchLeads();
  }, [teamId]);

  const generateMessage = (lead: NurtureLead, templateId: string) => {
    const template = CONTENT_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return "";

    const firstName = lead.firstName || "there";
    return template.template
      .replace(/{firstName}/g, firstName)
      .replace(/{factTopic}/g, "[industry insight]")
      .replace(/{industry}/g, "[their industry]")
      .replace(/{topic}/g, "[relevant topic]");
  };

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
          context: "nurture",
          teamId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          `Content sent to ${selectedLead.firstName || selectedLead.phone}`,
        );
        setLeads((prev) => prev.filter((l) => l.id !== selectedLead.id));
        setSelectedLead(null);
        setMessage("");
      } else {
        toast.error(data.error || "Failed to send");
      }
    } catch (error) {
      console.error("Send error:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleSelectLead = (lead: NurtureLead) => {
    setSelectedLead(lead);
    setMessage(generateMessage(lead, selectedTemplate));
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (selectedLead) {
      setMessage(generateMessage(selectedLead, templateId));
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-cyan-500" />
          Content Nurture Workspace
          <Badge
            variant="outline"
            className="ml-2 text-cyan-600 border-cyan-300"
          >
            GIANNA
          </Badge>
        </h1>
        <p className="text-muted-foreground">
          Drip valuable content to nurture leads • {leads.length} leads in
          nurture
        </p>
      </div>

      {leads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-medium">No leads in nurture</h3>
            <p className="text-muted-foreground">
              Leads moved to nurture will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Nurture Queue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedLead?.id === lead.id
                      ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20"
                      : "hover:border-cyan-300"
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
                    <Badge variant="secondary">Nurture</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedLead
                  ? `Send Content to ${selectedLead.firstName || "Lead"}`
                  : "Select a Lead"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedLead ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Content Template
                    </label>
                    <Select
                      value={selectedTemplate}
                      onValueChange={handleTemplateChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTENT_TEMPLATES.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Customize your content message..."
                    rows={4}
                  />

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                      onClick={handleSendMessage}
                      disabled={sending || !message.trim()}
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Send Content
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Select a lead to send nurture content</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
