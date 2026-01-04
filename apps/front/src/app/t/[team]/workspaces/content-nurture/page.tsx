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
  Library,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { TemplateLibraryDialog } from "@/components/sms/template-library";
import type { SMSTemplate } from "@/lib/sms/template-cartridges";
import { replaceVariables } from "@/lib/sms";

/**
 * CONTENT NURTURE WORKSPACE - GIANNA AI
 *
 * Drip "Did You Know" content to leads in nurture mode.
 * Industry insights, articles, valuable content.
 *
 * ENFORCES templateId-only - no raw message editing allowed.
 * Templates are selected from the canonical Template Library.
 */

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
  const teamId = (params?.team as string) || "";

  const [leads, setLeads] = useState<NurtureLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<NurtureLead | null>(null);
  const [sending, setSending] = useState(false);
  // ENFORCED: Template from library only - no raw message editing
  const [selectedTemplate, setSelectedTemplate] = useState<SMSTemplate | null>(null);

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

  // Generate preview message from template (read-only display)
  const getMessagePreview = (lead: NurtureLead, template: SMSTemplate | null): string => {
    if (!template) return "";

    // Build variables map from lead data
    const variables: Record<string, string> = {
      name: lead.firstName || "there",
      first_name: lead.firstName || "there",
      firstName: lead.firstName || "there",
      last_name: lead.lastName || "",
      lastName: lead.lastName || "",
      business_name: lead.company || "",
      businessName: lead.company || "",
      company: lead.company || "",
      sender_name: "Gianna",
      senderName: "Gianna",
    };

    return replaceVariables(template.message, variables);
  };

  // Send nurture message - ENFORCES templateId
  const handleSendMessage = async () => {
    if (!selectedLead) {
      toast.error("Select a lead first");
      return;
    }

    // ENFORCEMENT: Must have templateId - no raw message allowed
    if (!selectedTemplate) {
      toast.error("Select a template from the library");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/signalhouse/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selectedLead.phone,
          // CRITICAL: Send templateId, not raw message
          templateId: selectedTemplate.id,
          // Variables for server-side template rendering
          variables: {
            name: selectedLead.firstName || "there",
            firstName: selectedLead.firstName || "there",
            lastName: selectedLead.lastName || "",
            company: selectedLead.company || "",
            businessName: selectedLead.company || "",
          },
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
        setSelectedTemplate(null);
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
  };

  const handleTemplateSelect = (template: SMSTemplate) => {
    setSelectedTemplate(template);
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
                  {/* Template Selection - FROM LIBRARY ONLY */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Template</label>
                      <Badge variant="outline" className="text-xs gap-1">
                        <Lock className="h-3 w-3" />
                        Library Only
                      </Badge>
                    </div>
                    <TemplateLibraryDialog
                      onSelectTemplate={handleTemplateSelect}
                      selectedTemplateId={selectedTemplate?.id}
                    >
                      <Button
                        variant="outline"
                        className="w-full justify-start h-auto py-3"
                      >
                        <Library className="h-4 w-4 mr-2 shrink-0" />
                        {selectedTemplate ? (
                          <div className="text-left">
                            <div className="font-medium">{selectedTemplate.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {selectedTemplate.charCount} chars
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            Choose from Template Library...
                          </span>
                        )}
                      </Button>
                    </TemplateLibraryDialog>
                  </div>

                  {/* Message Preview - READ ONLY */}
                  {selectedTemplate && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Preview</label>
                        <Badge variant="secondary" className="text-xs">
                          Read Only
                        </Badge>
                      </div>
                      <div className="p-3 bg-muted rounded-lg border text-sm leading-relaxed">
                        {getMessagePreview(selectedLead, selectedTemplate)}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                      onClick={handleSendMessage}
                      disabled={sending || !selectedTemplate}
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
