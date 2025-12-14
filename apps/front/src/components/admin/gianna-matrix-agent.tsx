"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Bot,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Database,
  Users,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Target,
  Layers,
  ChevronRight,
  AlertCircle,
  Settings,
  Download,
  Filter,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";

// ============================================================================
// TYPES
// ============================================================================

interface Lead {
  id: string;
  name: string;
  contact_name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  sector: string;
  sector_label: string;
  // Prioritization
  priority_score: number;
  signals: string[];
  // Contact tracking
  contact_status: "no_contact" | "attempted" | "contacted" | "responded" | "converted";
  attempts: number;
  last_attempt?: Date;
  // Campaign
  campaign_id?: string;
  queued_at?: Date;
}

interface SectorQueue {
  sector: string;
  label: string;
  total: number;
  no_contact: number;
  attempted: number;
  contacted: number;
  responded: number;
  converted: number;
  avg_priority: number;
  active: boolean;
}

interface Campaign {
  id: string;
  name: string;
  sectors: string[];
  batch_size: number;
  status: "draft" | "running" | "paused" | "completed";
  total_leads: number;
  processed: number;
  contacted: number;
  responded: number;
  created_at: Date;
}

interface AgentStats {
  total_leads: number;
  no_contact: number;
  contacted: number;
  responded: number;
  conversion_rate: number;
  leads_per_hour: number;
  active_campaigns: number;
}

// ============================================================================
// PRIORITIZATION ENGINE
// ============================================================================

interface PriorityWeights {
  has_phone: number;
  has_email: number;
  has_contact_name: number;
  sector_match: number;
  no_previous_attempts: number;
  recent_upload: number;
  revenue_signal: number;
  owner_title: number;
}

const DEFAULT_WEIGHTS: PriorityWeights = {
  has_phone: 25,
  has_email: 20,
  has_contact_name: 15,
  sector_match: 10,
  no_previous_attempts: 10,
  recent_upload: 5,
  revenue_signal: 10,
  owner_title: 5,
};

function calculatePriorityScore(lead: Partial<Lead>, weights: PriorityWeights): number {
  let score = 0;

  if (lead.phone) score += weights.has_phone;
  if (lead.email) score += weights.has_email;
  if (lead.contact_name) score += weights.has_contact_name;
  if (lead.sector) score += weights.sector_match;
  if (!lead.attempts || lead.attempts === 0) score += weights.no_previous_attempts;

  // Title signals
  const title = lead.contact_name?.toLowerCase() || "";
  if (title.includes("owner") || title.includes("ceo") || title.includes("president")) {
    score += weights.owner_title;
  }

  return Math.min(score, 100);
}

// ============================================================================
// MOCK DATA GENERATOR
// ============================================================================

const SECTOR_CONFIG: Record<string, { label: string; color: string }> = {
  "hotel-motel": { label: "Hotels & Motels", color: "bg-blue-500" },
  "campgrounds-rv": { label: "Campgrounds & RV", color: "bg-green-500" },
  "trucking": { label: "Trucking", color: "bg-orange-500" },
  "auto-dealers": { label: "Auto Dealers", color: "bg-purple-500" },
  "auto-repair": { label: "Auto Repair", color: "bg-red-500" },
  "aircraft-parts": { label: "Aircraft Parts", color: "bg-cyan-500" },
  "restaurants": { label: "Restaurants", color: "bg-yellow-500" },
  "construction": { label: "Construction", color: "bg-amber-500" },
  "medical": { label: "Medical", color: "bg-pink-500" },
  "dental": { label: "Dental", color: "bg-indigo-500" },
};

function generateMockQueues(): SectorQueue[] {
  return Object.entries(SECTOR_CONFIG).map(([sector, config]) => {
    const total = Math.floor(Math.random() * 5000) + 500;
    const no_contact = Math.floor(total * 0.7);
    const attempted = Math.floor(total * 0.15);
    const contacted = Math.floor(total * 0.1);
    const responded = Math.floor(total * 0.04);
    const converted = Math.floor(total * 0.01);

    return {
      sector,
      label: config.label,
      total,
      no_contact,
      attempted,
      contacted,
      responded,
      converted,
      avg_priority: Math.floor(Math.random() * 30) + 60,
      active: Math.random() > 0.3,
    };
  });
}

// ============================================================================
// COMPONENT
// ============================================================================

export function GiannaMatrixAgent() {
  const [queues, setQueues] = useState<SectorQueue[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<AgentStats>({
    total_leads: 0,
    no_contact: 0,
    contacted: 0,
    responded: 0,
    conversion_rate: 0,
    leads_per_hour: 0,
    active_campaigns: 0,
  });
  const [weights, setWeights] = useState<PriorityWeights>(DEFAULT_WEIGHTS);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedSectors, setSelectedSectors] = useState<Set<string>>(new Set());
  const [batchSize] = useState(2000);
  const [processingSpeed, setProcessingSpeed] = useState(0);

  // Initialize with mock data
  useEffect(() => {
    const mockQueues = generateMockQueues();
    setQueues(mockQueues);

    // Calculate stats
    const totalLeads = mockQueues.reduce((sum, q) => sum + q.total, 0);
    const noContact = mockQueues.reduce((sum, q) => sum + q.no_contact, 0);
    const contacted = mockQueues.reduce((sum, q) => sum + q.contacted, 0);
    const responded = mockQueues.reduce((sum, q) => sum + q.responded, 0);

    setStats({
      total_leads: totalLeads,
      no_contact: noContact,
      contacted,
      responded,
      conversion_rate: totalLeads > 0 ? (responded / totalLeads) * 100 : 0,
      leads_per_hour: 0,
      active_campaigns: 0,
    });
  }, []);

  // Toggle sector selection
  const toggleSector = (sector: string) => {
    setSelectedSectors(prev => {
      const next = new Set(prev);
      if (next.has(sector)) {
        next.delete(sector);
      } else {
        next.add(sector);
      }
      return next;
    });
  };

  // Select all sectors
  const selectAllSectors = () => {
    setSelectedSectors(new Set(queues.map(q => q.sector)));
  };

  // Launch campaign
  const launchCampaign = useCallback(() => {
    if (selectedSectors.size === 0) {
      toast.error("Select at least one sector");
      return;
    }

    const selectedQueues = queues.filter(q => selectedSectors.has(q.sector));
    const totalLeads = selectedQueues.reduce((sum, q) => sum + q.no_contact, 0);
    const batches = Math.ceil(totalLeads / batchSize);

    const newCampaign: Campaign = {
      id: `camp_${Date.now()}`,
      name: `Omni Campaign ${campaigns.length + 1}`,
      sectors: Array.from(selectedSectors),
      batch_size: batchSize,
      status: "running",
      total_leads: totalLeads,
      processed: 0,
      contacted: 0,
      responded: 0,
      created_at: new Date(),
    };

    setCampaigns(prev => [newCampaign, ...prev]);
    setIsRunning(true);
    setStats(prev => ({ ...prev, active_campaigns: prev.active_campaigns + 1 }));

    toast.success(`Campaign launched: ${totalLeads.toLocaleString()} leads across ${selectedSectors.size} sectors (${batches} batches of ${batchSize})`);

    // Simulate processing
    simulateProcessing(newCampaign.id, totalLeads);
  }, [selectedSectors, queues, batchSize, campaigns.length]);

  // Simulate processing
  const simulateProcessing = (campaignId: string, totalLeads: number) => {
    let processed = 0;
    const interval = setInterval(() => {
      const batch = Math.min(Math.floor(Math.random() * 50) + 20, totalLeads - processed);
      processed += batch;

      setProcessingSpeed(batch * 60); // leads per minute extrapolated

      setCampaigns(prev => prev.map(c => {
        if (c.id === campaignId) {
          const contacted = Math.floor(processed * 0.3);
          const responded = Math.floor(contacted * 0.15);
          return {
            ...c,
            processed,
            contacted,
            responded,
            status: processed >= totalLeads ? "completed" : "running",
          };
        }
        return c;
      }));

      // Update queues
      setQueues(prev => prev.map(q => {
        if (selectedSectors.has(q.sector)) {
          const reduction = Math.floor(batch / selectedSectors.size);
          return {
            ...q,
            no_contact: Math.max(0, q.no_contact - reduction),
            attempted: q.attempted + Math.floor(reduction * 0.7),
            contacted: q.contacted + Math.floor(reduction * 0.2),
            responded: q.responded + Math.floor(reduction * 0.08),
            converted: q.converted + Math.floor(reduction * 0.02),
          };
        }
        return q;
      }));

      if (processed >= totalLeads) {
        clearInterval(interval);
        setIsRunning(false);
        setProcessingSpeed(0);
        toast.success("Campaign completed!");
      }
    }, 500);
  };

  // Pause/Resume
  const togglePause = () => {
    setIsRunning(!isRunning);
    toast.info(isRunning ? "Campaign paused" : "Campaign resumed");
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "no_contact": return "text-zinc-400";
      case "attempted": return "text-yellow-400";
      case "contacted": return "text-blue-400";
      case "responded": return "text-green-400";
      case "converted": return "text-purple-400";
      default: return "text-zinc-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-pink-600 to-purple-600 rounded-xl">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              Gianna Matrix Agent
              {isRunning && (
                <Badge className="bg-green-500 animate-pulse">LIVE</Badge>
              )}
            </h2>
            <p className="text-zinc-400">
              Multi-sector execution • Prioritization engine • 2,000/batch
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAllSectors}
            className="border-zinc-700 text-zinc-400"
          >
            Select All
          </Button>
          <Button
            onClick={launchCampaign}
            disabled={selectedSectors.size === 0}
            className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
          >
            <Play className="h-4 w-4 mr-2" />
            Launch Omni Campaign
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-6 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Database className="h-4 w-4" />
              <span className="text-xs">Total Leads</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.total_leads.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">No Contact</span>
            </div>
            <p className="text-2xl font-bold text-yellow-400">{stats.no_contact.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Phone className="h-4 w-4" />
              <span className="text-xs">Contacted</span>
            </div>
            <p className="text-2xl font-bold text-blue-400">{stats.contacted.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs">Responded</span>
            </div>
            <p className="text-2xl font-bold text-green-400">{stats.responded.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Conversion</span>
            </div>
            <p className="text-2xl font-bold text-purple-400">{stats.conversion_rate.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Zap className="h-4 w-4" />
              <span className="text-xs">Speed</span>
            </div>
            <p className="text-2xl font-bold text-cyan-400">
              {processingSpeed > 0 ? `${processingSpeed}/hr` : "Idle"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sector Matrix */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Sector Matrix
            </CardTitle>
            <Badge variant="outline" className="border-zinc-700 text-zinc-400">
              {selectedSectors.size} selected • {queues.reduce((sum, q) => selectedSectors.has(q.sector) ? sum + q.no_contact : sum, 0).toLocaleString()} leads queued
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {queues.map((queue) => {
              const isSelected = selectedSectors.has(queue.sector);
              const contactRate = queue.total > 0 ? ((queue.contacted + queue.responded + queue.converted) / queue.total) * 100 : 0;

              return (
                <div
                  key={queue.sector}
                  onClick={() => toggleSector(queue.sector)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? "bg-purple-600/20 border-purple-500"
                      : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${SECTOR_CONFIG[queue.sector]?.color || "bg-zinc-500"}`} />
                      <span className="font-medium text-white">{queue.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-zinc-700 text-zinc-300 text-xs">
                        Avg: {queue.avg_priority}
                      </Badge>
                      {isSelected && (
                        <CheckCircle className="h-4 w-4 text-purple-400" />
                      )}
                    </div>
                  </div>

                  {/* Progress breakdown */}
                  <div className="space-y-2">
                    <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-zinc-700">
                      <div
                        className="bg-zinc-500 transition-all"
                        style={{ width: `${(queue.no_contact / queue.total) * 100}%` }}
                        title="No Contact"
                      />
                      <div
                        className="bg-yellow-500 transition-all"
                        style={{ width: `${(queue.attempted / queue.total) * 100}%` }}
                        title="Attempted"
                      />
                      <div
                        className="bg-blue-500 transition-all"
                        style={{ width: `${(queue.contacted / queue.total) * 100}%` }}
                        title="Contacted"
                      />
                      <div
                        className="bg-green-500 transition-all"
                        style={{ width: `${(queue.responded / queue.total) * 100}%` }}
                        title="Responded"
                      />
                      <div
                        className="bg-purple-500 transition-all"
                        style={{ width: `${(queue.converted / queue.total) * 100}%` }}
                        title="Converted"
                      />
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">
                        {queue.total.toLocaleString()} total
                      </span>
                      <div className="flex gap-3">
                        <span className="text-zinc-400">{queue.no_contact.toLocaleString()} pending</span>
                        <span className="text-green-400">{contactRate.toFixed(1)}% contacted</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Active Campaigns */}
      {campaigns.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="h-5 w-5" />
              Active Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {campaigns.map((campaign) => {
                const progress = campaign.total_leads > 0 ? (campaign.processed / campaign.total_leads) * 100 : 0;

                return (
                  <div key={campaign.id} className="p-4 bg-zinc-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{campaign.name}</span>
                        <Badge className={
                          campaign.status === "running" ? "bg-green-600" :
                          campaign.status === "completed" ? "bg-purple-600" :
                          "bg-yellow-600"
                        }>
                          {campaign.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {campaign.status === "running" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={togglePause}
                            className="h-7 border-zinc-700"
                          >
                            {isRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                          </Button>
                        )}
                      </div>
                    </div>

                    <Progress value={progress} className="h-2 mb-2" />

                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>{campaign.processed.toLocaleString()} / {campaign.total_leads.toLocaleString()} processed</span>
                      <div className="flex gap-4">
                        <span className="text-blue-400">{campaign.contacted.toLocaleString()} contacted</span>
                        <span className="text-green-400">{campaign.responded.toLocaleString()} responded</span>
                      </div>
                    </div>

                    <div className="flex gap-1 mt-2">
                      {campaign.sectors.map(s => (
                        <Badge key={s} variant="outline" className="text-xs border-zinc-700 text-zinc-500">
                          {SECTOR_CONFIG[s]?.label || s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prioritization Weights */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Prioritization Engine Weights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {Object.entries(weights).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 capitalize">{key.replace(/_/g, " ")}</span>
                  <span className="text-xs font-mono text-white">{value}</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-4">
            Weights determine lead priority score. Higher priority leads are processed first in each batch.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
