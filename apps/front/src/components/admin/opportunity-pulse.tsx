"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Phone,
  Mail,
  Calendar,
  ExternalLink,
  Zap,
  Building2,
  User,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  Loader2,
  MessageSquare,
  DollarSign,
  Users,
  MapPin,
} from "lucide-react";

// Apollo-scored lead with engagement data
export interface OpportunityLead {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl?: string;
  // Apollo signals
  apolloScore: number; // 0-100
  revenueRange?: string;
  employeeCount?: number;
  industry?: string;
  signals: string[]; // e.g., "hiring surge", "funding", "news"
  // Engagement tracking
  lastOutreach?: Date | string;
  outreachCount: number;
  status: "hot" | "warm" | "cold" | "contacted" | "qualified";
  nextAction?: string;
  notes?: string;
}

interface OpportunityPulseProps {
  leads?: OpportunityLead[];
  onCall?: (lead: OpportunityLead) => void;
  onEmail?: (lead: OpportunityLead) => void;
  onSchedule?: (lead: OpportunityLead) => void;
  onMarkContacted?: (lead: OpportunityLead) => void;
}

// Score color coding per playbook
function getScoreColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Hot";
  if (score >= 60) return "Warm";
  if (score >= 40) return "Tepid";
  return "Cold";
}

function getStatusBadge(status: OpportunityLead["status"]) {
  const styles = {
    hot: "bg-red-600 text-white",
    warm: "bg-orange-500 text-white",
    cold: "bg-blue-500 text-white",
    contacted: "bg-purple-600 text-white",
    qualified: "bg-green-600 text-white",
  };
  return styles[status];
}

function formatLastOutreach(date?: Date | string): string {
  if (!date) return "Never";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

export function OpportunityPulse({
  leads: initialLeads,
  onCall,
  onEmail,
  onSchedule,
  onMarkContacted,
}: OpportunityPulseProps) {
  const [leads, setLeads] = useState<OpportunityLead[]>(initialLeads || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "hot" | "warm" | "cold">("all");

  // Search Apollo for blue-collar business owners
  const searchApollo = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/apollo/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          // Blue-collar industries from playbook
          title: "Owner",
          perPage: 25,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Search failed");
      }

      const data = await response.json();

      // Transform Apollo results to OpportunityLead format
      const newLeads: OpportunityLead[] = data.results.map((r: {
        id: string;
        name: string;
        title: string;
        company: string;
        email: string;
        phone: string;
        location: string;
      }) => ({
        id: r.id,
        name: r.name,
        title: r.title,
        company: r.company,
        email: r.email,
        phone: r.phone,
        location: r.location,
        // Generate Apollo score based on available data
        apolloScore: calculateApolloScore(r),
        signals: detectSignals(r),
        outreachCount: 0,
        status: "cold" as const,
        nextAction: "Initial outreach",
      }));

      setLeads(newLeads);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  // Calculate Apollo score based on data quality
  function calculateApolloScore(result: { email?: string; phone?: string; title?: string; company?: string }): number {
    let score = 40; // Base score
    if (result.email) score += 20;
    if (result.phone) score += 20;
    if (result.title?.toLowerCase().includes("owner")) score += 10;
    if (result.title?.toLowerCase().includes("ceo")) score += 10;
    if (result.company) score += 10;
    return Math.min(score, 100);
  }

  // Detect Apollo signals from result
  function detectSignals(result: { title?: string; company?: string }): string[] {
    const signals: string[] = [];
    if (result.title?.toLowerCase().includes("owner")) signals.push("Owner");
    if (result.title?.toLowerCase().includes("founder")) signals.push("Founder");
    // In production, these would come from Apollo's intent signals
    return signals.length ? signals : ["Apollo Sourced"];
  }

  // Mark lead as contacted
  const handleMarkContacted = useCallback((lead: OpportunityLead) => {
    setLeads(prev => prev.map(l =>
      l.id === lead.id
        ? { ...l, status: "contacted", lastOutreach: new Date(), outreachCount: l.outreachCount + 1 }
        : l
    ));
    onMarkContacted?.(lead);
  }, [onMarkContacted]);

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    if (filter === "all") return true;
    if (filter === "hot") return lead.apolloScore >= 80;
    if (filter === "warm") return lead.apolloScore >= 60 && lead.apolloScore < 80;
    if (filter === "cold") return lead.apolloScore < 60;
    return true;
  });

  // Stats
  const hotCount = leads.filter(l => l.apolloScore >= 80).length;
  const warmCount = leads.filter(l => l.apolloScore >= 60 && l.apolloScore < 80).length;
  const contactedCount = leads.filter(l => l.status === "contacted").length;

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-white">Opportunity Pulse</CardTitle>
                <p className="text-zinc-400 text-sm">Apollo-powered lead scoring & engagement</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge className="bg-green-600">{hotCount} Hot</Badge>
              <Badge className="bg-orange-500">{warmCount} Warm</Badge>
              <Badge className="bg-purple-600">{contactedCount} Contacted</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search blue-collar business owners (HVAC, plumbing, electrical...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchApollo()}
                className="pl-10 bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <Button
              onClick={searchApollo}
              disabled={loading || !searchQuery.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search Apollo"}
            </Button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-4">
            {(["all", "hot", "warm", "cold"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
                className={filter === f ? "bg-purple-600" : "border-zinc-700 text-zinc-400"}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg flex items-center gap-2 text-red-400">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Cards */}
      <div className="grid gap-4">
        {filteredLeads.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800 p-8 text-center">
            <p className="text-zinc-500">
              {leads.length === 0
                ? "Search Apollo to find blue-collar business owners"
                : "No leads match the current filter"}
            </p>
          </Card>
        ) : (
          filteredLeads.map((lead) => (
            <Card key={lead.id} className="bg-zinc-900 border-zinc-800 hover:border-purple-600/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Apollo Score Indicator */}
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-12 h-12 rounded-full ${getScoreColor(lead.apolloScore)} flex items-center justify-center`}>
                      <span className="text-white font-bold">{lead.apolloScore}</span>
                    </div>
                    <span className="text-xs text-zinc-500">{getScoreLabel(lead.apolloScore)}</span>
                  </div>

                  {/* Lead Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-white font-semibold flex items-center gap-2">
                          <User className="h-4 w-4 text-zinc-500" />
                          {lead.name}
                        </h3>
                        <p className="text-zinc-400 text-sm flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {lead.title} at {lead.company}
                        </p>
                        {lead.location && (
                          <p className="text-zinc-500 text-sm flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {lead.location}
                          </p>
                        )}
                      </div>
                      <Badge className={getStatusBadge(lead.status)}>
                        {lead.status}
                      </Badge>
                    </div>

                    {/* Signals */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {lead.signals.map((signal, i) => (
                        <Badge key={i} variant="outline" className="border-purple-600 text-purple-400 text-xs">
                          {signal}
                        </Badge>
                      ))}
                      {lead.revenueRange && (
                        <Badge variant="outline" className="border-green-600 text-green-400 text-xs">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {lead.revenueRange}
                        </Badge>
                      )}
                      {lead.employeeCount && (
                        <Badge variant="outline" className="border-blue-600 text-blue-400 text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {lead.employeeCount} employees
                        </Badge>
                      )}
                    </div>

                    {/* Contact Info & Last Touched */}
                    <div className="flex items-center gap-4 text-sm text-zinc-400 mb-3">
                      {lead.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </span>
                      )}
                      {lead.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-zinc-500">
                        <Clock className="h-3 w-3" />
                        Last: {formatLastOutreach(lead.lastOutreach)}
                      </span>
                    </div>

                    {/* Next Action */}
                    {lead.nextAction && (
                      <div className="flex items-center gap-2 text-sm text-amber-400 mb-3">
                        <TrendingUp className="h-4 w-4" />
                        <span>Next: {lead.nextAction}</span>
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2">
                      {lead.phone && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onCall?.(lead);
                            window.open(`tel:${lead.phone}`);
                          }}
                          className="border-green-600 text-green-400 hover:bg-green-600/20"
                        >
                          <Phone className="h-3 w-3 mr-1" />
                          Call
                        </Button>
                      )}
                      {lead.email && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onEmail?.(lead);
                            window.open(`mailto:${lead.email}`);
                          }}
                          className="border-blue-600 text-blue-400 hover:bg-blue-600/20"
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          Email
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSchedule?.(lead)}
                        className="border-purple-600 text-purple-400 hover:bg-purple-600/20"
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Schedule
                      </Button>
                      {lead.linkedinUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(lead.linkedinUrl, "_blank")}
                          className="border-cyan-600 text-cyan-400 hover:bg-cyan-600/20"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          LinkedIn
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleMarkContacted(lead)}
                        className="bg-purple-600 hover:bg-purple-700 ml-auto"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Mark Contacted
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
