"use client";

import { useState, useEffect } from "react";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTeam } from "@/features/team/hooks/use-team";
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
  Filter,
} from "lucide-react";

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  email: string;
  enrichmentStatus: string;
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
  const { team } = useTeam();
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
  const [activeTab, setActiveTab] = useState("data-lake");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch leads and stats
  useEffect(() => {
    const fetchData = async () => {
      if (!team?.id) return;

      try {
        // Fetch pipeline stats
        const statsRes = await fetch(`/api/pipeline/stats?teamId=${team.id}`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        // Fetch leads (first 100 for now)
        const leadsRes = await fetch(`/api/leads?teamId=${team.id}&limit=100&status=${statusFilter}`);
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
  }, [team?.id, statusFilter]);

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

  const handleSkipTrace = async () => {
    if (selectedLeads.size === 0) return;

    try {
      const res = await fetch("/api/skip-trace/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: team?.id,
          leadIds: Array.from(selectedLeads),
        }),
      });

      if (res.ok) {
        alert(`Skip trace queued for ${selectedLeads.size} leads`);
      }
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
        body: JSON.stringify({
          teamId: team?.id,
          leadIds: Array.from(selectedLeads),
        }),
      });

      if (res.ok) {
        alert(`Phone validation queued for ${selectedLeads.size} leads`);
      }
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
        body: JSON.stringify({
          teamId: team?.id,
          leadIds: Array.from(selectedLeads),
          message: smsMessage,
        }),
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

  const createCampaignBatch = () => {
    // Select first 2000 leads with phones
    const leadsWithPhone = leads.filter((l) => l.phone);
    const batch = leadsWithPhone.slice(0, 2000);
    setSelectedLeads(new Set(batch.map((l) => l.id)));
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

      <div className="container py-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.raw.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Raw Leads</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.skipTraced.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Skip Traced</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.validated.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Validated</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{stats.ready.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">SMS Ready</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">{stats.campaign.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">In Campaign</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="data-lake">
              <Database className="w-4 h-4 mr-2" />
              Data Lake
            </TabsTrigger>
            <TabsTrigger value="enrich">
              <Zap className="w-4 h-4 mr-2" />
              Enrich
            </TabsTrigger>
            <TabsTrigger value="sms">
              <MessageSquare className="w-4 h-4 mr-2" />
              SMS Campaign
            </TabsTrigger>
            <TabsTrigger value="queue">
              <Clock className="w-4 h-4 mr-2" />
              Queue
            </TabsTrigger>
          </TabsList>

          {/* Data Lake Tab */}
          <TabsContent value="data-lake">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Lead Data Lake ({leads.length.toLocaleString()} loaded)
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={createCampaignBatch}>
                      <Users className="w-4 h-4 mr-2" />
                      Select 2K Batch
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search leads..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Leads</SelectItem>
                      <SelectItem value="raw">Raw</SelectItem>
                      <SelectItem value="traced">Skip Traced</SelectItem>
                      <SelectItem value="validated">Validated</SelectItem>
                      <SelectItem value="ready">SMS Ready</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Selection Actions */}
                {selectedLeads.size > 0 && (
                  <div className="flex gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
                    <Badge variant="secondary">{selectedLeads.size} selected</Badge>
                    <Button size="sm" variant="outline" onClick={handleSkipTrace}>
                      <Search className="w-4 h-4 mr-2" />
                      Tracerfy Skip Trace
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleValidate}>
                      <Phone className="w-4 h-4 mr-2" />
                      Trestle Validate
                    </Button>
                    <Button size="sm" onClick={() => setActiveTab("sms")}>
                      <Send className="w-4 h-4 mr-2" />
                      Send SMS
                    </Button>
                  </div>
                )}

                {/* Leads Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedLeads.size === leads.length && leads.length > 0}
                            onCheckedChange={selectAll}
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            Loading leads...
                          </TableCell>
                        </TableRow>
                      ) : filteredLeads.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            No leads found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredLeads.map((lead) => (
                          <TableRow key={lead.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedLeads.has(lead.id)}
                                onCheckedChange={() => toggleLeadSelection(lead.id)}
                              />
                            </TableCell>
                            <TableCell>
                              {lead.firstName} {lead.lastName}
                            </TableCell>
                            <TableCell>{lead.company}</TableCell>
                            <TableCell>
                              {lead.phone ? (
                                <span className="font-mono">{lead.phone}</span>
                              ) : (
                                <span className="text-muted-foreground">No phone</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  lead.enrichmentStatus === "ready"
                                    ? "default"
                                    : lead.enrichmentStatus === "traced"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {lead.enrichmentStatus || "raw"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {lead.score !== null && lead.score !== undefined ? (
                                <span className={lead.score >= 70 ? "text-green-600 font-bold" : ""}>
                                  {lead.score}
                                </span>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enrich Tab */}
          <TabsContent value="enrich">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Tracerfy Skip Trace
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Enrich leads with phone numbers, emails, and address data.
                  </p>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Selected leads:</span>
                      <span className="font-bold">{selectedLeads.size}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Cost estimate:</span>
                      <span className="font-bold">${(selectedLeads.size * 0.12).toFixed(2)}</span>
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleSkipTrace}
                      disabled={selectedLeads.size === 0}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Run Skip Trace ({selectedLeads.size} leads)
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Trestle Phone Validation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Validate phone numbers for deliverability and line type.
                  </p>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Selected leads:</span>
                      <span className="font-bold">{selectedLeads.size}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Cost estimate:</span>
                      <span className="font-bold">${(selectedLeads.size * 0.02).toFixed(2)}</span>
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleValidate}
                      disabled={selectedLeads.size === 0}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Validate Phones ({selectedLeads.size} leads)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* SMS Campaign Tab */}
          <TabsContent value="sms">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Bulk SMS via SignalHouse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-4">Compose Message</h3>
                    <Textarea
                      placeholder="Hey {firstName}, just wanted to reach out about..."
                      value={smsMessage}
                      onChange={(e) => setSmsMessage(e.target.value)}
                      rows={6}
                      className="mb-2"
                    />
                    <div className="text-sm text-muted-foreground mb-4">
                      {smsMessage.length}/480 characters
                    </div>
                    <div className="flex gap-2 flex-wrap mb-4">
                      <Badge variant="outline" className="cursor-pointer" onClick={() => setSmsMessage(m => m + "{firstName}")}>
                        {"{firstName}"}
                      </Badge>
                      <Badge variant="outline" className="cursor-pointer" onClick={() => setSmsMessage(m => m + "{lastName}")}>
                        {"{lastName}"}
                      </Badge>
                      <Badge variant="outline" className="cursor-pointer" onClick={() => setSmsMessage(m => m + "{company}")}>
                        {"{company}"}
                      </Badge>
                      <Badge variant="outline" className="cursor-pointer" onClick={() => setSmsMessage(m => m + "{city}")}>
                        {"{city}"}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4">Campaign Summary</h3>
                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between">
                        <span>Recipients:</span>
                        <span className="font-bold">{selectedLeads.size}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SignalHouse Daily Limit:</span>
                        <span className="font-bold">2,000/day</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Batches needed:</span>
                        <span className="font-bold">{Math.ceil(selectedLeads.size / 2000)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Est. delivery time:</span>
                        <span className="font-bold">{Math.ceil(selectedLeads.size / 2000)} days</span>
                      </div>
                    </div>

                    <Button
                      className="w-full mt-4"
                      size="lg"
                      onClick={handleBulkSMS}
                      disabled={selectedLeads.size === 0 || !smsMessage.trim()}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Launch Campaign ({selectedLeads.size} leads)
                    </Button>

                    {selectedLeads.size === 0 && (
                      <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Select leads from the Data Lake tab first
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Queue Tab */}
          <TabsContent value="queue">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  SMS Queue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Active campaigns and scheduled messages will appear here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TeamSection>
  );
}
