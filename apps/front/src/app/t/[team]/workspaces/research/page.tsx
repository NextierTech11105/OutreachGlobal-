"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Search,
  FileText,
  Building2,
  User,
  TrendingUp,
  ExternalLink,
  Loader2,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Clock,
  CheckCircle2,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

/**
 * RESEARCH & MEETING PREP WORKSPACE
 *
 * Powered by NEVA (Perplexity API)
 * Provides pre-call intelligence for leads in the call queue.
 *
 * Features:
 * - One-click "Prep for Call" button
 * - Company intel (industry, size, tech stack)
 * - Person intel (title, decision maker status)
 * - Talking points and objection handling
 * - Citation sources for verification
 */

interface Lead {
  id: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  title: string | null;
  city: string | null;
  state: string | null;
  leadState: string | null;
  score: number;
}

interface CompanyIntel {
  name?: string;
  domain?: string;
  industry?: string;
  size?: string;
  founded?: string;
  description?: string;
  techStack?: string[];
  buyingSignals?: string[];
}

interface PersonIntel {
  name?: string;
  title?: string;
  seniority?: string;
  department?: string;
  decisionMaker?: boolean;
}

interface ResearchResult {
  companyIntel?: CompanyIntel;
  personIntel?: PersonIntel;
  talkingPoints?: string[];
  objectionHandling?: { objection: string; response: string }[];
  enrichmentScore?: number;
  confidenceScore?: number;
  citations?: { url: string; title: string; source: string }[];
  createdAt?: string;
}

export default function ResearchWorkspacePage() {
  const params = useParams();
  const teamId = params.team as string;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [researching, setResearching] = useState(false);

  // Fetch leads in call queue
  useEffect(() => {
    async function fetchLeads() {
      try {
        const response = await fetch(
          `/api/leads?teamId=${teamId}&leadState=in_call_queue&limit=50`,
        );
        const data = await response.json();

        if (data.success && data.leads) {
          setLeads(data.leads);
        } else if (data.data) {
          setLeads(data.data);
        } else {
          setLeads([]);
        }
      } catch (error) {
        console.error("Failed to fetch leads:", error);
        setLeads([]);
      } finally {
        setLoading(false);
      }
    }

    fetchLeads();
  }, [teamId]);

  // Check for existing research when lead is selected
  useEffect(() => {
    async function checkExistingResearch() {
      if (!selectedLead) {
        setResearch(null);
        return;
      }

      try {
        const response = await fetch(
          `/api/neva/enrichment?leadId=${selectedLead.id}`,
        );
        const data = await response.json();

        if (data.success && data.enrichment) {
          setResearch({
            companyIntel: data.enrichment.companyIntel,
            personIntel: data.enrichment.personIntel,
            enrichmentScore: data.enrichment.enrichmentScore,
            confidenceScore: data.enrichment.confidenceScore,
            createdAt: data.enrichment.enrichedAt,
          });
        } else {
          setResearch(null);
        }
      } catch (error) {
        console.error("Failed to check existing research:", error);
        setResearch(null);
      }
    }

    checkExistingResearch();
  }, [selectedLead]);

  // Trigger research via NEVA
  const handlePrepForCall = async () => {
    if (!selectedLead) return;

    setResearching(true);
    try {
      const response = await fetch("/api/neva/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "call_prep",
          companyName: selectedLead.company,
          contactName:
            `${selectedLead.firstName || ""} ${selectedLead.lastName || ""}`.trim(),
          address: {
            city: selectedLead.city,
            state: selectedLead.state,
          },
          leadId: selectedLead.id,
          teamId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResearch({
          companyIntel: data.result?.companyIntel || data.companyIntel,
          personIntel: data.result?.personIntel || data.personIntel,
          talkingPoints: data.result?.talkingPoints || data.talkingPoints,
          objectionHandling: data.result?.objectionHandling,
          enrichmentScore: data.result?.enrichmentScore || 0,
          confidenceScore: data.result?.confidenceScore || 0,
          citations: data.result?.citations || data.citations,
          createdAt: new Date().toISOString(),
        });
        toast.success(`Research complete for ${selectedLead.firstName}`);
      } else {
        toast.error(data.error || "Failed to generate research");
      }
    } catch (error) {
      console.error("Research error:", error);
      toast.error("Failed to generate research");
    } finally {
      setResearching(false);
    }
  };

  const getLeadName = (lead: Lead) => {
    const name = `${lead.firstName || ""} ${lead.lastName || ""}`.trim();
    return name || "Unknown";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-purple-500" />
          Research & Meeting Prep
          <Badge
            variant="outline"
            className="ml-2 text-purple-600 border-purple-300"
          >
            NEVA
          </Badge>
        </h1>
        <p className="text-muted-foreground">
          Pre-call intelligence powered by Perplexity AI • {leads.length} leads
          in call queue
        </p>
      </div>

      {leads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium">No leads in call queue</h3>
            <p className="text-muted-foreground">
              Leads will appear here when they reach the &quot;In Call
              Queue&quot; stage.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lead List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-5 w-5 text-purple-500" />
                Call Queue ({leads.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {leads.map((lead) => (
                    <div
                      key={lead.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedLead?.id === lead.id
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20"
                          : "hover:border-purple-300"
                      }`}
                      onClick={() => setSelectedLead(lead)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{getLeadName(lead)}</p>
                          {lead.company && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {lead.company}
                            </p>
                          )}
                          {lead.title && (
                            <p className="text-xs text-muted-foreground">
                              {lead.title}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={lead.score >= 80 ? "default" : "outline"}
                          className={
                            lead.score >= 80
                              ? "bg-emerald-500"
                              : lead.score >= 50
                                ? "bg-yellow-500"
                                : ""
                          }
                        >
                          {lead.score}
                        </Badge>
                      </div>
                      {(lead.city || lead.state) && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[lead.city, lead.state].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Research Panel */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {selectedLead
                    ? `Research: ${getLeadName(selectedLead)}`
                    : "Select a Lead"}
                </CardTitle>
                {selectedLead && (
                  <Button
                    onClick={handlePrepForCall}
                    disabled={researching}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {researching ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Researching...
                      </>
                    ) : research ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Research
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Prep for Call
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedLead ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Select a lead from the call queue to view research</p>
                </div>
              ) : !research ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No research yet</p>
                  <p className="text-sm">
                    Click &quot;Prep for Call&quot; to generate intelligence
                  </p>
                </div>
              ) : (
                <Tabs defaultValue="company" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="company">Company</TabsTrigger>
                    <TabsTrigger value="person">Person</TabsTrigger>
                    <TabsTrigger value="talking">Talking Points</TabsTrigger>
                    <TabsTrigger value="sources">Sources</TabsTrigger>
                  </TabsList>

                  {/* Company Intel Tab */}
                  <TabsContent value="company" className="mt-4">
                    <div className="space-y-4">
                      {research.companyIntel ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <InfoCard
                              icon={<Building2 className="h-4 w-4" />}
                              label="Company"
                              value={
                                research.companyIntel.name ||
                                selectedLead.company
                              }
                            />
                            <InfoCard
                              icon={<Briefcase className="h-4 w-4" />}
                              label="Industry"
                              value={research.companyIntel.industry}
                            />
                            <InfoCard
                              icon={<User className="h-4 w-4" />}
                              label="Size"
                              value={research.companyIntel.size}
                            />
                            <InfoCard
                              icon={<Clock className="h-4 w-4" />}
                              label="Founded"
                              value={research.companyIntel.founded}
                            />
                          </div>

                          {research.companyIntel.description && (
                            <div className="p-3 bg-muted rounded-lg">
                              <p className="text-sm font-medium mb-1">
                                Description
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {research.companyIntel.description}
                              </p>
                            </div>
                          )}

                          {research.companyIntel.techStack &&
                            research.companyIntel.techStack.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-2">
                                  Tech Stack
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {research.companyIntel.techStack.map(
                                    (tech, i) => (
                                      <Badge key={i} variant="secondary">
                                        {tech}
                                      </Badge>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}

                          {research.companyIntel.buyingSignals &&
                            research.companyIntel.buyingSignals.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                                  Buying Signals
                                </p>
                                <ul className="space-y-1">
                                  {research.companyIntel.buyingSignals.map(
                                    (signal, i) => (
                                      <li
                                        key={i}
                                        className="text-sm flex items-start gap-2"
                                      >
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                                        {signal}
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </div>
                            )}
                        </>
                      ) : (
                        <p className="text-muted-foreground text-center py-8">
                          No company intel available
                        </p>
                      )}
                    </div>
                  </TabsContent>

                  {/* Person Intel Tab */}
                  <TabsContent value="person" className="mt-4">
                    <div className="space-y-4">
                      {research.personIntel ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <InfoCard
                              icon={<User className="h-4 w-4" />}
                              label="Name"
                              value={
                                research.personIntel.name ||
                                getLeadName(selectedLead)
                              }
                            />
                            <InfoCard
                              icon={<Briefcase className="h-4 w-4" />}
                              label="Title"
                              value={
                                research.personIntel.title || selectedLead.title
                              }
                            />
                            <InfoCard
                              icon={<TrendingUp className="h-4 w-4" />}
                              label="Seniority"
                              value={research.personIntel.seniority}
                            />
                            <InfoCard
                              icon={<Building2 className="h-4 w-4" />}
                              label="Department"
                              value={research.personIntel.department}
                            />
                          </div>

                          {research.personIntel.decisionMaker !== undefined && (
                            <div className="p-3 bg-muted rounded-lg">
                              <p className="text-sm font-medium flex items-center gap-2">
                                Decision Maker:
                                {research.personIntel.decisionMaker ? (
                                  <Badge className="bg-emerald-500">Yes</Badge>
                                ) : (
                                  <Badge variant="outline">No</Badge>
                                )}
                              </p>
                            </div>
                          )}

                          {/* Contact Info */}
                          <div className="p-3 border rounded-lg">
                            <p className="text-sm font-medium mb-2">
                              Contact Info
                            </p>
                            <div className="space-y-1 text-sm">
                              {selectedLead.phone && (
                                <p className="flex items-center gap-2">
                                  <Phone className="h-4 w-4" />
                                  {selectedLead.phone}
                                </p>
                              )}
                              {selectedLead.email && (
                                <p className="flex items-center gap-2">
                                  <Mail className="h-4 w-4" />
                                  {selectedLead.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-muted-foreground text-center py-8">
                          No person intel available
                        </p>
                      )}
                    </div>
                  </TabsContent>

                  {/* Talking Points Tab */}
                  <TabsContent value="talking" className="mt-4">
                    <div className="space-y-4">
                      {research.talkingPoints &&
                      research.talkingPoints.length > 0 ? (
                        <div>
                          <p className="text-sm font-medium mb-2">
                            Key Talking Points
                          </p>
                          <ul className="space-y-2">
                            {research.talkingPoints.map((point, i) => (
                              <li
                                key={i}
                                className="p-2 bg-muted rounded-lg text-sm flex items-start gap-2"
                              >
                                <CheckCircle2 className="h-4 w-4 text-purple-500 mt-0.5" />
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">
                          No talking points available
                        </p>
                      )}

                      {research.objectionHandling &&
                        research.objectionHandling.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4 text-yellow-500" />
                              Objection Handling
                            </p>
                            <div className="space-y-2">
                              {research.objectionHandling.map((obj, i) => (
                                <div key={i} className="p-3 border rounded-lg">
                                  <p className="text-sm font-medium text-red-600">
                                    &quot;{obj.objection}&quot;
                                  </p>
                                  <p className="text-sm mt-1 text-emerald-600">
                                    → {obj.response}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </TabsContent>

                  {/* Sources Tab */}
                  <TabsContent value="sources" className="mt-4">
                    <div className="space-y-4">
                      {/* Scores */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <p className="text-2xl font-bold text-purple-600">
                            {research.enrichmentScore || 0}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Enrichment Score
                          </p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <p className="text-2xl font-bold text-purple-600">
                            {research.confidenceScore || 0}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Confidence Score
                          </p>
                        </div>
                      </div>

                      {/* Citations */}
                      {research.citations && research.citations.length > 0 ? (
                        <div>
                          <p className="text-sm font-medium mb-2">Sources</p>
                          <ScrollArea className="h-[300px]">
                            <div className="space-y-2">
                              {research.citations.map((citation, i) => (
                                <a
                                  key={i}
                                  href={citation.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block p-2 border rounded-lg hover:bg-muted transition-colors"
                                >
                                  <p className="text-sm font-medium flex items-center gap-1">
                                    {citation.title}
                                    <ExternalLink className="h-3 w-3" />
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {citation.source}
                                  </p>
                                </a>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">
                          No sources available
                        </p>
                      )}

                      {research.createdAt && (
                        <p className="text-xs text-muted-foreground text-center">
                          Last updated:{" "}
                          {new Date(research.createdAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Helper component for info cards
function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="p-3 bg-muted rounded-lg">
      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
        {icon}
        {label}
      </p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );
}
