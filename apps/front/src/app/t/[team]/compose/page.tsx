"use client";

import { useState, useEffect } from "react";
import { useCurrentTeam } from "@/features/team/team.context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamTitle } from "@/features/team/layouts/team-title";
import {
  Send,
  Users,
  FileSpreadsheet,
  MessageSquare,
  Eye,
  Loader2,
  RefreshCw,
  Sparkles,
  Database,
  CheckCircle2,
  AlertCircle,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";

// Spintax processor - picks random option from [option1|option2|option3]
function processSpintax(text: string): string {
  return text.replace(/\[([^\]]+)\]/g, (_, options) => {
    const choices = options.split("|");
    return choices[Math.floor(Math.random() * choices.length)];
  });
}

// Merge field processor - replaces {fieldName} with lead data
function processMergeFields(text: string, lead: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, field) => {
    const value = lead[field] || lead[field.toLowerCase()] || "";
    return value || `{${field}}`;
  });
}

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  company?: string;
  city?: string;
  state?: string;
}

interface Bucket {
  id: string;
  name: string;
  source: string;
  totalLeads: number;
  createdAt: string;
}

export default function ComposePage() {
  const { teamId } = useCurrentTeam();

  // Data state
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string>("");
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  // Message state
  const [message, setMessage] = useState("");
  const [includeOptOut, setIncludeOptOut] = useState(true);

  // Preview state
  const [previewLead, setPreviewLead] = useState<Lead | null>(null);
  const [previewMessage, setPreviewMessage] = useState("");

  // Loading state
  const [loadingBuckets, setLoadingBuckets] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [sending, setSending] = useState(false);

  // Load buckets (imported CSVs)
  useEffect(() => {
    loadBuckets();
  }, []);

  const loadBuckets = async () => {
    setLoadingBuckets(true);
    try {
      const res = await fetch("/api/leads/import");
      const data = await res.json();
      if (data.success) {
        setBuckets(data.buckets || []);
      }
    } catch (err) {
      toast.error("Failed to load data sources");
    } finally {
      setLoadingBuckets(false);
    }
  };

  // Load leads from selected bucket
  const loadLeadsFromBucket = async (bucketId: string) => {
    if (!bucketId || !teamId) return;

    setLoadingLeads(true);
    setSelectedBucket(bucketId);
    setSelectedLeads(new Set());

    try {
      // Fetch leads that were imported in this bucket
      const res = await fetch(`/api/leads?limit=2000`);
      const data = await res.json();

      if (data.success && data.leads) {
        // Filter by bucket if customFields contains bucketId
        const bucketLeads = data.leads.filter((lead: any) => {
          const customFields = lead.customFields || {};
          return customFields.bucketId === bucketId;
        });

        setLeads(bucketLeads.length > 0 ? bucketLeads : data.leads.slice(0, 100));

        // Select first lead for preview
        if (bucketLeads.length > 0 || data.leads.length > 0) {
          const firstLead = bucketLeads[0] || data.leads[0];
          setPreviewLead(firstLead);
        }
      }
    } catch (err) {
      toast.error("Failed to load leads");
    } finally {
      setLoadingLeads(false);
    }
  };

  // Update preview when message or preview lead changes
  useEffect(() => {
    if (previewLead && message) {
      let processed = processSpintax(message);
      processed = processMergeFields(processed, previewLead as any);
      if (includeOptOut) {
        processed += "\n\nReply STOP to opt-out";
      }
      setPreviewMessage(processed);
    } else {
      setPreviewMessage("");
    }
  }, [message, previewLead, includeOptOut]);

  // Toggle lead selection
  const toggleLead = (leadId: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  // Select/deselect all
  const toggleAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map(l => l.id)));
    }
  };

  // Insert merge field
  const insertMergeField = (field: string) => {
    setMessage(prev => prev + `{${field}}`);
  };

  // Calculate SMS stats
  const charCount = previewMessage.length;
  const segmentCount = Math.ceil(charCount / 160) || 1;
  const creditCost = selectedLeads.size * segmentCount;

  // Send SMS
  const handleSend = async () => {
    if (selectedLeads.size === 0) {
      toast.error("Select at least one recipient");
      return;
    }
    if (!message.trim()) {
      toast.error("Enter a message");
      return;
    }

    setSending(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const selectedLeadsList = leads.filter(l => selectedLeads.has(l.id));

      for (const lead of selectedLeadsList) {
        let personalizedMessage = processSpintax(message);
        personalizedMessage = processMergeFields(personalizedMessage, lead as any);
        if (includeOptOut) {
          personalizedMessage += "\n\nReply STOP to opt-out";
        }

        try {
          const res = await fetch("/api/sms/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: lead.phone,
              message: personalizedMessage,
              leadId: lead.id,
            }),
          });

          const result = await res.json();
          if (result.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Sent ${successCount} messages${failCount > 0 ? `, ${failCount} failed` : ""}`);
      } else {
        toast.error("All messages failed to send");
      }
    } catch (err) {
      toast.error("Send operation failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <TeamSection>
      <TeamHeader title="Compose Campaign" />

      <div className="container max-w-7xl">
        <div className="mb-6">
          <TeamTitle>SMS Campaign Composer</TeamTitle>
          <p className="text-muted-foreground mt-1">
            Select recipients, compose your message, preview and send.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Data Source & Recipients */}
          <div className="lg:col-span-1 space-y-4">
            {/* Data Source Selector */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Data Source
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Select value={selectedBucket} onValueChange={loadLeadsFromBucket}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select uploaded list..." />
                    </SelectTrigger>
                    <SelectContent>
                      {buckets.map(bucket => (
                        <SelectItem key={bucket.id} value={bucket.id}>
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4" />
                            <span>{bucket.name}</span>
                            <Badge variant="secondary" className="ml-auto">
                              {bucket.totalLeads}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                      {buckets.length === 0 && (
                        <SelectItem value="none" disabled>
                          No uploads found - import a CSV first
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={loadBuckets} disabled={loadingBuckets}>
                    <RefreshCw className={`h-4 w-4 ${loadingBuckets ? "animate-spin" : ""}`} />
                  </Button>
                </div>

                {/* Quick LUCI fetch */}
                <div className="pt-2 border-t">
                  <Button variant="outline" size="sm" className="w-full gap-2" disabled>
                    <Sparkles className="h-4 w-4" />
                    Ask LUCI to fetch data
                    <Badge variant="secondary">Soon</Badge>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recipients List */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Recipients
                  </CardTitle>
                  <Badge variant={selectedLeads.size > 0 ? "default" : "secondary"}>
                    {selectedLeads.size} selected
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {loadingLeads ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : leads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Select a data source above</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Select All */}
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Checkbox
                        checked={selectedLeads.size === leads.length}
                        onCheckedChange={toggleAll}
                      />
                      <span className="text-sm font-medium">
                        Select all ({leads.length})
                      </span>
                    </div>

                    {/* Lead list */}
                    <div className="max-h-[300px] overflow-y-auto space-y-1">
                      {leads.map(lead => (
                        <div
                          key={lead.id}
                          className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50 ${
                            selectedLeads.has(lead.id) ? "bg-muted" : ""
                          }`}
                          onClick={() => {
                            toggleLead(lead.id);
                            setPreviewLead(lead);
                          }}
                        >
                          <Checkbox
                            checked={selectedLeads.has(lead.id)}
                            onCheckedChange={() => toggleLead(lead.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {lead.firstName} {lead.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {lead.phone}
                            </p>
                          </div>
                          {lead.company && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {lead.company.slice(0, 15)}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* CENTER: Message Composer */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Message
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Merge Fields */}
                <div>
                  <Label className="text-xs text-muted-foreground">Insert merge field</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {["firstName", "lastName", "company", "city", "state"].map(field => (
                      <Button
                        key={field}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => insertMergeField(field)}
                      >
                        {`{${field}}`}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Message Input */}
                <div>
                  <Textarea
                    placeholder="[Hi|Hello|Hey] {firstName}, this is Gianna from Nextier..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                  />
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>{charCount} / 1,500 characters</span>
                    <span>{segmentCount} segment(s)</span>
                  </div>
                </div>

                {/* Spintax Help */}
                <div className="p-3 bg-muted/50 rounded-md text-xs">
                  <p className="font-medium mb-1">Spintax supported</p>
                  <p className="text-muted-foreground">
                    Use [option1|option2|option3] to randomly pick one.
                    Example: [Hi|Hello|Hey] {"{firstName}"}
                  </p>
                </div>

                {/* Opt-out Toggle */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="optout"
                    checked={includeOptOut}
                    onCheckedChange={(c) => setIncludeOptOut(c === true)}
                  />
                  <Label htmlFor="optout" className="text-sm cursor-pointer">
                    Include "Reply STOP to opt-out"
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Preview & Send */}
          <div className="lg:col-span-1 space-y-4">
            {/* Preview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {previewLead ? (
                  <div className="space-y-3">
                    <div className="text-xs text-muted-foreground">
                      Previewing for: {previewLead.firstName} {previewLead.lastName}
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <div className="bg-primary text-primary-foreground rounded-lg p-3 text-sm max-w-[85%] ml-auto">
                        {previewMessage || "Enter a message to preview..."}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Select a recipient to preview</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Send Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Send Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Recipients</p>
                    <p className="text-2xl font-bold">{selectedLeads.size}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Est. Credits</p>
                    <p className="text-2xl font-bold">{creditCost}</p>
                  </div>
                </div>

                {selectedLeads.size > 0 && message.trim() && (
                  <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-md text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Ready to send
                  </div>
                )}

                {selectedLeads.size === 0 && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded-md text-sm text-yellow-600">
                    <AlertCircle className="h-4 w-4" />
                    Select recipients first
                  </div>
                )}

                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={handleSend}
                  disabled={sending || selectedLeads.size === 0 || !message.trim()}
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send {selectedLeads.size} Messages
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TeamSection>
  );
}
