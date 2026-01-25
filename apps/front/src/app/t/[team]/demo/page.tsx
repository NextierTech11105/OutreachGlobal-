"use client";

import { useState } from "react";
import { useCurrentTeam } from "@/features/team/team.context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { TeamDescription } from "@/features/team/layouts/team-description";
import { Play, Users, MessageSquare, Send, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface DemoLead {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  company?: string;
  city?: string;
  state?: string;
}

interface BatchResult {
  batchId: string;
  totalQueued: number;
  success: number;
  failed: number;
  estimatedCost: number;
}

export default function DemoPage() {
  const { teamId } = useCurrentTeam();

  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<DemoLead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);

  // Form state
  const [leadCount, setLeadCount] = useState(10);
  const [industry, setIndustry] = useState("real_estate");
  const [state, setState] = useState("FL");
  const [templateType, setTemplateType] = useState("opener");
  const [customTemplate, setCustomTemplate] = useState("");
  const [dryRun, setDryRun] = useState(true);

  const generateLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/demo/leads/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: leadCount,
          industry,
          state,
          includeProperty: true,
        }),
      });
      const data = await res.json();
      setLeads(data.leads || []);
      setSelectedLeads(data.leads?.map((l: DemoLead) => l.id) || []);
      toast.success(`Generated ${data.count} demo leads`);
    } catch (err) {
      toast.error("Failed to generate leads");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const previewSms = async () => {
    if (selectedLeads.length === 0) {
      toast.error("Select at least one lead");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/demo/sms/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: teamId,
          leadIds: selectedLeads,
          templateType,
          customTemplate: customTemplate || undefined,
        }),
      });
      const data = await res.json();
      toast.success(`Preview ready: ${data.count} messages, $${data.estimatedCost.toFixed(2)}`);
    } catch (err) {
      toast.error("Failed to preview SMS");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const executeBatch = async () => {
    if (selectedLeads.length === 0) {
      toast.error("Select at least one lead");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/demo/sms/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: teamId,
          leadIds: selectedLeads,
          templateType,
          customTemplate: customTemplate || undefined,
          dryRun,
        }),
      });
      const data = await res.json();
      setBatchResult(data);
      toast.success(dryRun ? `DRY RUN: ${data.totalQueued} messages` : `Sent ${data.totalQueued} messages!`);
    } catch (err) {
      toast.error("Failed to execute batch");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runFullWorkflow = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/demo/workflow/full`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: teamId,
          count: leadCount,
          industry,
          state,
          templateType,
          customTemplate: customTemplate || undefined,
          dryRun,
        }),
      });
      const data = await res.json();
      setBatchResult(data.batch);
      toast.success(`Full workflow complete: ${data.leads.generated} leads, ${data.batch.totalQueued} SMS queued`);
    } catch (err) {
      toast.error("Workflow failed");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TeamSection>
      <TeamHeader title="Demo Mode" />

      <div className="container max-w-6xl">
        <div className="mb-6">
          <TeamTitle>SMS Demo Platform</TeamTitle>
          <TeamDescription>
            Generate leads, preview messages, and execute SMS campaigns with GIANNA & CATHY agents.
          </TeamDescription>
        </div>

        <Tabs defaultValue="generate" className="space-y-4">
          <TabsList className="bg-zinc-800">
            <TabsTrigger value="generate" className="gap-2">
              <Users className="h-4 w-4" />
              Generate Leads
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Send SMS
            </TabsTrigger>
            <TabsTrigger value="workflow" className="gap-2">
              <Play className="h-4 w-4" />
              Full Workflow
            </TabsTrigger>
          </TabsList>

          {/* GENERATE LEADS */}
          <TabsContent value="generate" className="space-y-4">
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle>Generate Demo Leads</CardTitle>
                <CardDescription>Create simulated leads for testing the SMS platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Lead Count</Label>
                    <Input
                      type="number"
                      min={1}
                      max={2000}
                      value={leadCount}
                      onChange={(e) => setLeadCount(parseInt(e.target.value) || 10)}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                  <div>
                    <Label>Industry</Label>
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="real_estate">Real Estate</SelectItem>
                        <SelectItem value="insurance">Insurance</SelectItem>
                        <SelectItem value="solar">Solar</SelectItem>
                        <SelectItem value="roofing">Roofing</SelectItem>
                        <SelectItem value="hvac">HVAC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>State</Label>
                    <Select value={state} onValueChange={setState}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FL">Florida</SelectItem>
                        <SelectItem value="TX">Texas</SelectItem>
                        <SelectItem value="CA">California</SelectItem>
                        <SelectItem value="NY">New York</SelectItem>
                        <SelectItem value="AZ">Arizona</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={generateLeads} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                  Generate {leadCount} Leads
                </Button>

                {leads.length > 0 && (
                  <div className="mt-4 border border-zinc-800 rounded-lg overflow-hidden">
                    <div className="bg-zinc-800 px-4 py-2 flex items-center justify-between">
                      <span className="text-sm font-medium">{leads.length} Leads Generated</span>
                      <Badge variant="outline">{selectedLeads.length} selected</Badge>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-800/50">
                          <tr>
                            <th className="px-4 py-2 text-left">Name</th>
                            <th className="px-4 py-2 text-left">Phone</th>
                            <th className="px-4 py-2 text-left">Company</th>
                            <th className="px-4 py-2 text-left">Location</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leads.slice(0, 20).map((lead) => (
                            <tr key={lead.id} className="border-t border-zinc-800">
                              <td className="px-4 py-2">{lead.firstName} {lead.lastName}</td>
                              <td className="px-4 py-2 font-mono text-xs">{lead.phone}</td>
                              <td className="px-4 py-2">{lead.company || "-"}</td>
                              <td className="px-4 py-2">{lead.city}, {lead.state}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {leads.length > 20 && (
                        <div className="px-4 py-2 text-center text-zinc-500 text-xs">
                          + {leads.length - 20} more leads
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SEND SMS */}
          <TabsContent value="sms" className="space-y-4">
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle>SMS Configuration</CardTitle>
                <CardDescription>Configure and send SMS messages to your leads</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Template Type</Label>
                    <Select value={templateType} onValueChange={setTemplateType}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="opener">GIANNA Opener</SelectItem>
                        <SelectItem value="followup">CATHY Follow-up</SelectItem>
                        <SelectItem value="reengagement">Re-engagement</SelectItem>
                        <SelectItem value="custom">Custom Template</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dryRun}
                        onChange={(e) => setDryRun(e.target.checked)}
                        className="rounded border-zinc-700"
                      />
                      <span className="text-sm">Dry Run (no actual SMS sent)</span>
                    </label>
                  </div>
                </div>

                {templateType === "custom" && (
                  <div>
                    <Label>Custom Message</Label>
                    <Textarea
                      placeholder="Hey {firstName}, this is {agentName}..."
                      value={customTemplate}
                      onChange={(e) => setCustomTemplate(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 min-h-[100px]"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      Variables: {"{firstName}"}, {"{lastName}"}, {"{company}"}, {"{city}"}, {"{state}"}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={previewSms} disabled={loading || leads.length === 0}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                    Preview Messages
                  </Button>
                  <Button onClick={executeBatch} disabled={loading || leads.length === 0}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {dryRun ? "Execute Dry Run" : "Send SMS"}
                  </Button>
                </div>

                {batchResult && (
                  <div className="mt-4 p-4 border border-zinc-800 rounded-lg bg-zinc-800/50">
                    <div className="flex items-center gap-2 mb-2">
                      {batchResult.failed === 0 ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="font-medium">Batch Result</span>
                      <Badge variant="outline" className="ml-auto font-mono text-xs">
                        {batchResult.batchId}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-zinc-500">Queued</span>
                        <p className="font-mono text-lg">{batchResult.totalQueued}</p>
                      </div>
                      <div>
                        <span className="text-zinc-500">Success</span>
                        <p className="font-mono text-lg text-green-500">{batchResult.success}</p>
                      </div>
                      <div>
                        <span className="text-zinc-500">Failed</span>
                        <p className="font-mono text-lg text-red-500">{batchResult.failed}</p>
                      </div>
                      <div>
                        <span className="text-zinc-500">Est. Cost</span>
                        <p className="font-mono text-lg">${batchResult.estimatedCost?.toFixed(2) || "0.00"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* FULL WORKFLOW */}
          <TabsContent value="workflow" className="space-y-4">
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle>Full Demo Workflow</CardTitle>
                <CardDescription>
                  One-click: Generate leads, save to database, and execute SMS batch
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label>Lead Count</Label>
                    <Input
                      type="number"
                      min={10}
                      max={2000}
                      value={leadCount}
                      onChange={(e) => setLeadCount(parseInt(e.target.value) || 10)}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                  <div>
                    <Label>Industry</Label>
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="real_estate">Real Estate</SelectItem>
                        <SelectItem value="insurance">Insurance</SelectItem>
                        <SelectItem value="solar">Solar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>State</Label>
                    <Select value={state} onValueChange={setState}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FL">Florida</SelectItem>
                        <SelectItem value="TX">Texas</SelectItem>
                        <SelectItem value="CA">California</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Template</Label>
                    <Select value={templateType} onValueChange={setTemplateType}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="opener">GIANNA Opener</SelectItem>
                        <SelectItem value="followup">CATHY Follow-up</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dryRun}
                      onChange={(e) => setDryRun(e.target.checked)}
                      className="rounded border-zinc-700"
                    />
                    <span className="text-sm">Dry Run Mode</span>
                  </label>
                </div>

                <Button
                  onClick={runFullWorkflow}
                  disabled={loading}
                  size="lg"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-5 w-5" />
                  )}
                  Run Full Demo Workflow
                </Button>

                {batchResult && (
                  <div className="mt-4 p-4 border border-green-800 rounded-lg bg-green-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-medium text-green-400">Workflow Complete</span>
                    </div>
                    <p className="text-sm text-zinc-400">
                      Generated and queued {batchResult.totalQueued} SMS messages for delivery.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TeamSection>
  );
}
