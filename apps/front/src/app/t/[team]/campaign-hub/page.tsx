"use client";

import { useState, useEffect } from "react";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentTeam } from "@/features/team/team.context";
import {
  Database,
  Send,
  Phone,
  Search,
  MessageSquare,
  Users,
  Zap,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronRight,
  X,
} from "lucide-react";

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  enrichmentStatus: string;
  pipelineStatus: string;
  score: number;
  createdAt: string;
}

interface PipelineStats {
  raw: number;
  skipTraced: number;
  validated: number;
  ready: number;
  campaign: number;
}

export default function CampaignHubPage() {
  const { team } = useCurrentTeam();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PipelineStats>({
    raw: 0,
    skipTraced: 0,
    validated: 0,
    ready: 0,
    campaign: 0,
  });
  const [smsMessage, setSmsMessage] = useState("");
  const [activePanel, setActivePanel] = useState<"sms" | "enrich" | "queue" | null>("sms");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch leads and stats
  useEffect(() => {
    const fetchData = async () => {
      if (!team?.id) return;

      try {
        // Use the leads API with pipeline_stats action
        const statsRes = await fetch(`/api/leads?action=pipeline_stats`, {
          credentials: "include",
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData.pipeline) {
            setStats({
              raw: statsData.pipeline.raw || 0,
              skipTraced: 0, // Will calculate from enrichment status later
              validated: 0,
              ready: statsData.pipeline.ready || 0,
              campaign: (statsData.pipeline.queued || 0) + (statsData.pipeline.sent || 0),
            });
          }
        }

        // Build query params
        const params = new URLSearchParams({ limit: "100", sortBy });
        if (statusFilter !== "all") params.append("status", statusFilter);
        if (sourceFilter !== "all") params.append("source", sourceFilter);

        const leadsRes = await fetch(`/api/leads?${params.toString()}`, {
          credentials: "include",
        });
        if (leadsRes.ok) {
          const leadsData = await leadsRes.json();
          setLeads(leadsData.leads || []);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [team?.id, statusFilter, sourceFilter, sortBy]);

  const toggleLeadSelection = (leadId: string) => {
    const newSelection = new Set(selectedLeads);
    if (newSelection.has(leadId)) {
      newSelection.delete(leadId);
    } else {
      newSelection.add(leadId);
    }
    setSelectedLeads(newSelection);
  };

  const selectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map((l) => l.id)));
    }
  };

  const select2KBatch = () => {
    const leadsWithPhone = leads.filter((l) => l.phone);
    const batch = leadsWithPhone.slice(0, 2000);
    setSelectedLeads(new Set(batch.map((l) => l.id)));
  };

  const handleSkipTrace = async () => {
    if (selectedLeads.size === 0) return;
    try {
      const res = await fetch("/api/skip-trace/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team?.id, leadIds: Array.from(selectedLeads) }),
      });
      if (res.ok) alert(`Skip trace queued for ${selectedLeads.size} leads`);
    } catch (error) {
      console.error("Skip trace failed:", error);
    }
  };

  const handleValidate = async () => {
    if (selectedLeads.size === 0) return;
    try {
      const res = await fetch("/api/phone-validate/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team?.id, leadIds: Array.from(selectedLeads) }),
      });
      if (res.ok) alert(`Phone validation queued for ${selectedLeads.size} leads`);
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  const handleBulkSMS = async () => {
    if (selectedLeads.size === 0 || !smsMessage.trim()) return;
    try {
      const res = await fetch("/api/signalhouse/bulk-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team?.id, leadIds: Array.from(selectedLeads), message: smsMessage }),
      });
      if (res.ok) {
        const data = await res.json();
        alert(`SMS campaign created: ${data.queued} messages queued`);
        setSmsMessage("");
        setSelectedLeads(new Set());
      }
    } catch (error) {
      console.error("Bulk SMS failed:", error);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        lead.firstName?.toLowerCase().includes(query) ||
        lead.lastName?.toLowerCase().includes(query) ||
        lead.company?.toLowerCase().includes(query) ||
        lead.phone?.includes(query)
      );
    }
    return true;
  });

  return (
    <TeamSection>
      <TeamHeader title="Campaign Hub" />

      <div className="flex h-[calc(100vh-120px)]">
        {/* LEFT PANEL - Lead List */}
        <div className="flex-1 flex flex-col border-r">
          {/* Stats Bar */}
          <div className="flex gap-2 p-3 border-b bg-background">
            <Badge variant="outline" className="px-3 py-1">
              <Database className="w-3 h-3 mr-1" />
              {stats.raw.toLocaleString()} Raw
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              <Search className="w-3 h-3 mr-1" />
              {stats.skipTraced.toLocaleString()} Traced
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              <CheckCircle className="w-3 h-3 mr-1" />
              {stats.validated.toLocaleString()} Valid
            </Badge>
            <Badge variant="default" className="px-3 py-1 bg-green-600">
              <Send className="w-3 h-3 mr-1" />
              {stats.ready.toLocaleString()} Ready
            </Badge>
          </div>

          {/* Filters & Actions */}
          <div className="flex gap-2 p-3 border-b">
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="raw">Raw</SelectItem>
                <SelectItem value="traced">Traced</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="usbizdata">USBizData</SelectItem>
                <SelectItem value="apollo">Apollo</SelectItem>
                <SelectItem value="tracerfy">Tracerfy</SelectItem>
                <SelectItem value="propwire">PropWire</SelectItem>
                <SelectItem value="import">CSV Import</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Newest</SelectItem>
                <SelectItem value="score">Score</SelectItem>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="state">State</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={select2KBatch}>
              <Users className="w-4 h-4 mr-1" />
              2K Batch
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Selection Bar */}
          {selectedLeads.size > 0 && (
            <div className="flex items-center gap-2 p-2 bg-primary/10 border-b">
              <Badge>{selectedLeads.size} selected</Badge>
              <Button size="sm" variant="ghost" onClick={() => setSelectedLeads(new Set())}>
                <X className="w-3 h-3 mr-1" /> Clear
              </Button>
              <div className="flex-1" />
              <Button size="sm" variant="outline" onClick={() => setActivePanel("enrich")}>
                <Zap className="w-3 h-3 mr-1" /> Enrich
              </Button>
              <Button size="sm" onClick={() => setActivePanel("sms")}>
                <Send className="w-3 h-3 mr-1" /> SMS
              </Button>
            </div>
          )}

          {/* Lead List */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading leads...</div>
            ) : filteredLeads.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No leads found</div>
            ) : (
              <div className="divide-y">
                {/* Select All Header */}
                <div className="flex items-center gap-3 p-3 bg-muted sticky top-0">
                  <Checkbox
                    checked={selectedLeads.size === leads.length && leads.length > 0}
                    onCheckedChange={selectAll}
                  />
                  <span className="text-sm font-medium">Select All ({filteredLeads.length})</span>
                </div>

                {filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className={`flex items-center gap-3 p-3 hover:bg-muted cursor-pointer ${
                      selectedLeads.has(lead.id) ? "bg-primary/10" : ""
                    }`}
                    onClick={() => toggleLeadSelection(lead.id)}
                  >
                    <Checkbox
                      checked={selectedLeads.has(lead.id)}
                      onCheckedChange={() => toggleLeadSelection(lead.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {lead.firstName} {lead.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {lead.company}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {[lead.address, lead.city, lead.state, lead.zipCode].filter(Boolean).join(", ") || "No address"}
                      </div>
                    </div>
                    <div className="text-right">
                      {lead.phone ? (
                        <div className="font-mono text-sm">{lead.phone}</div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No phone</div>
                      )}
                      <Badge
                        variant={
                          lead.enrichmentStatus === "ready" ? "default" :
                          lead.enrichmentStatus === "traced" ? "secondary" : "outline"
                        }
                        className="text-xs"
                      >
                        {lead.enrichmentStatus || "raw"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* RIGHT PANEL - Actions */}
        <div className="w-96 flex flex-col bg-muted/50">
          {/* Panel Tabs */}
          <div className="flex border-b">
            <button
              className={`flex-1 p-3 text-sm font-medium ${activePanel === "sms" ? "bg-background border-b-2 border-primary" : ""}`}
              onClick={() => setActivePanel("sms")}
            >
              <MessageSquare className="w-4 h-4 inline mr-1" />
              SMS
            </button>
            <button
              className={`flex-1 p-3 text-sm font-medium ${activePanel === "enrich" ? "bg-background border-b-2 border-primary" : ""}`}
              onClick={() => setActivePanel("enrich")}
            >
              <Zap className="w-4 h-4 inline mr-1" />
              Enrich
            </button>
            <button
              className={`flex-1 p-3 text-sm font-medium ${activePanel === "queue" ? "bg-background border-b-2 border-primary" : ""}`}
              onClick={() => setActivePanel("queue")}
            >
              <Clock className="w-4 h-4 inline mr-1" />
              Queue
            </button>
          </div>

          {/* SMS Panel */}
          {activePanel === "sms" && (
            <div className="flex-1 p-4 space-y-4 overflow-auto">
              <div>
                <label className="text-sm font-medium mb-2 block">Message</label>
                <Textarea
                  placeholder="Hey {firstName}, just wanted to reach out..."
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  rows={5}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {smsMessage.length}/480 characters
                </div>
              </div>

              <div className="flex gap-1 flex-wrap">
                {["{firstName}", "{lastName}", "{company}", "{city}", "{state}", "{address}", "{phone}", "{email}"].map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => setSmsMessage((m) => m + tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Campaign Topic</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select topic..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ai-consulting">AI Consulting</SelectItem>
                    <SelectItem value="platform-whitelabel">Platform White Label</SelectItem>
                    <SelectItem value="business-exits">Business Exits</SelectItem>
                    <SelectItem value="capital-connect">Capital Connect</SelectItem>
                    <SelectItem value="foundational-dataverse">Foundational Dataverse</SelectItem>
                    <SelectItem value="terminals">Terminals</SelectItem>
                    <SelectItem value="blueprints">Blueprints</SelectItem>
                    <SelectItem value="system-mapping">System Mapping</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Recipients:</span>
                    <span className="font-bold">{selectedLeads.size}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Daily Limit:</span>
                    <span className="font-bold">2,000/day</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Batches:</span>
                    <span className="font-bold">{Math.ceil(selectedLeads.size / 2000) || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Button
                className="w-full"
                size="lg"
                onClick={handleBulkSMS}
                disabled={selectedLeads.size === 0 || !smsMessage.trim()}
              >
                <Send className="w-4 h-4 mr-2" />
                Send to {selectedLeads.size} Leads
              </Button>

              {selectedLeads.size === 0 && (
                <p className="text-sm text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Select leads from the list first
                </p>
              )}
            </div>
          )}

          {/* Enrich Panel */}
          {activePanel === "enrich" && (
            <div className="flex-1 p-4 space-y-4 overflow-auto">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Tracerfy Skip Trace
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Get phone numbers, emails, addresses
                  </p>
                  <div className="flex justify-between text-sm">
                    <span>Selected:</span>
                    <span className="font-bold">{selectedLeads.size}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Est. Cost:</span>
                    <span className="font-bold">${(selectedLeads.size * 0.12).toFixed(2)}</span>
                  </div>
                  <Button className="w-full" onClick={handleSkipTrace} disabled={selectedLeads.size === 0}>
                    <Zap className="w-4 h-4 mr-2" />
                    Skip Trace {selectedLeads.size} Leads
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Trestle Phone Validation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Verify line type & deliverability
                  </p>
                  <div className="flex justify-between text-sm">
                    <span>Selected:</span>
                    <span className="font-bold">{selectedLeads.size}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Est. Cost:</span>
                    <span className="font-bold">${(selectedLeads.size * 0.02).toFixed(2)}</span>
                  </div>
                  <Button className="w-full" onClick={handleValidate} disabled={selectedLeads.size === 0}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Validate {selectedLeads.size} Phones
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Queue Panel */}
          {activePanel === "queue" && (
            <div className="flex-1 p-4">
              <div className="text-center text-muted-foreground py-8">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No active campaigns</p>
                <p className="text-sm">Send an SMS campaign to see it here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </TeamSection>
  );
}
