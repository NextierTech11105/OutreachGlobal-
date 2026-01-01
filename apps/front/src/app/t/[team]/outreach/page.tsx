"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  MessageSquare,
  Phone,
  Building2,
  DollarSign,
  MapPin,
  User,
  Clock,
  Zap,
  Calendar,
  Search,
  Filter,
  CreditCard,
  Users,
  TrendingUp,
  Star,
  Flame,
  Target,
  MoreVertical,
  Send,
  ChevronRight,
  Sparkles,
  Tag,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Lead type from USA BizData
interface Lead {
  id: string;
  companyName: string;
  ownerFirstName: string;
  ownerLastName: string;
  annualRevenue: number;
  companyAddress: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  email?: string;
  industry?: string;
  employeeCount?: number;
  yearsInBusiness?: number;
  // Computed/enriched fields
  score: number;
  tags: string[];
  audience: string;
  status: "new" | "contacted" | "interested" | "hot" | "cold";
  lastContact?: Date;
}

// Tag color mapping
const TAG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  // Revenue tiers
  "High Revenue": { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" },
  "Mid Revenue": { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30" },
  "Growth Stage": { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
  // Industry
  "Manufacturing": { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" },
  "Tech": { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
  "Healthcare": { bg: "bg-pink-500/20", text: "text-pink-400", border: "border-pink-500/30" },
  "Retail": { bg: "bg-cyan-500/20", text: "text-cyan-400", border: "border-cyan-500/30" },
  "Construction": { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
  "Services": { bg: "bg-indigo-500/20", text: "text-indigo-400", border: "border-indigo-500/30" },
  // Status
  "Hot Lead": { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" },
  "Decision Maker": { bg: "bg-violet-500/20", text: "text-violet-400", border: "border-violet-500/30" },
  "Exit Ready": { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" },
  "Established": { bg: "bg-slate-500/20", text: "text-slate-300", border: "border-slate-500/30" },
  "New Lead": { bg: "bg-sky-500/20", text: "text-sky-400", border: "border-sky-500/30" },
};

// Status colors
const STATUS_CONFIG = {
  new: { label: "New", color: "bg-blue-500", icon: Sparkles },
  contacted: { label: "Contacted", color: "bg-yellow-500", icon: MessageSquare },
  interested: { label: "Interested", color: "bg-purple-500", icon: Star },
  hot: { label: "Hot", color: "bg-red-500", icon: Flame },
  cold: { label: "Cold", color: "bg-slate-500", icon: Target },
};

// Audience categories
const AUDIENCES = [
  { id: "all", name: "All Leads", icon: Users },
  { id: "high-value", name: "High Value", icon: DollarSign },
  { id: "hot-leads", name: "Hot Leads", icon: Flame },
  { id: "decision-makers", name: "Decision Makers", icon: Target },
  { id: "exit-ready", name: "Exit Ready", icon: TrendingUp },
  { id: "new-today", name: "New Today", icon: Sparkles },
];

// Format revenue
function formatRevenue(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount}`;
}

// Generate mock leads for demo
function generateMockLeads(): Lead[] {
  const industries = ["Manufacturing", "Tech", "Healthcare", "Retail", "Construction", "Services"];
  const states = ["CA", "TX", "FL", "NY", "IL", "PA", "OH", "GA", "NC", "MI"];
  const firstNames = ["John", "Michael", "David", "James", "Robert", "William", "Richard", "Joseph", "Thomas", "Charles"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];
  const companyPrefixes = ["Premier", "Advanced", "Elite", "Pro", "First", "National", "American", "United", "Global", "Pacific"];
  const companySuffixes = ["Solutions", "Industries", "Services", "Group", "Corp", "Inc", "LLC", "Enterprises", "Partners", "Holdings"];

  return Array.from({ length: 50 }, (_, i) => {
    const revenue = Math.floor(Math.random() * 10000000) + 500000;
    const industry = industries[Math.floor(Math.random() * industries.length)];
    const state = states[Math.floor(Math.random() * states.length)];
    const yearsInBusiness = Math.floor(Math.random() * 30) + 5;

    const tags: string[] = [];
    if (revenue > 5000000) tags.push("High Revenue");
    else if (revenue > 2000000) tags.push("Mid Revenue");
    else tags.push("Growth Stage");

    tags.push(industry);

    if (yearsInBusiness > 15) tags.push("Established");
    if (Math.random() > 0.7) tags.push("Decision Maker");
    if (Math.random() > 0.8) tags.push("Exit Ready");
    if (Math.random() > 0.85) tags.push("Hot Lead");
    if (i < 5) tags.push("New Lead");

    const statuses: Lead["status"][] = ["new", "contacted", "interested", "hot", "cold"];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    let audience = "all";
    if (revenue > 5000000) audience = "high-value";
    if (tags.includes("Hot Lead")) audience = "hot-leads";
    if (tags.includes("Decision Maker")) audience = "decision-makers";
    if (tags.includes("Exit Ready")) audience = "exit-ready";
    if (i < 5) audience = "new-today";

    return {
      id: `lead-${i + 1}`,
      companyName: `${companyPrefixes[Math.floor(Math.random() * companyPrefixes.length)]} ${companySuffixes[Math.floor(Math.random() * companySuffixes.length)]}`,
      ownerFirstName: firstNames[Math.floor(Math.random() * firstNames.length)],
      ownerLastName: lastNames[Math.floor(Math.random() * lastNames.length)],
      annualRevenue: revenue,
      companyAddress: `${Math.floor(Math.random() * 9999) + 1} ${["Main", "Oak", "Maple", "Cedar", "Pine", "Elm"][Math.floor(Math.random() * 6)]} St`,
      city: ["Los Angeles", "Houston", "Miami", "New York", "Chicago", "Philadelphia"][Math.floor(Math.random() * 6)],
      state,
      zip: String(Math.floor(Math.random() * 90000) + 10000),
      phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      email: `owner@${companyPrefixes[Math.floor(Math.random() * companyPrefixes.length)].toLowerCase()}.com`,
      industry,
      employeeCount: Math.floor(Math.random() * 100) + 5,
      yearsInBusiness,
      score: Math.floor(Math.random() * 40) + 60,
      tags,
      audience,
      status,
      lastContact: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : undefined,
    };
  });
}

export default function OutreachPage() {
  const params = useParams();
  const teamId = params.team as string;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAudience, setSelectedAudience] = useState("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [actionDialog, setActionDialog] = useState<{ type: "sms" | "call"; mode: "instant" | "scheduled" } | null>(null);
  const [messageText, setMessageText] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  // Credits tracking
  const [credits, setCredits] = useState({
    sms: { used: 0, total: 5000, remaining: 5000 },
    calls: { used: 0, total: 1000, remaining: 1000 },
    enrichment: { used: 0, total: 2000, remaining: 2000 },
  });

  // Load leads
  useEffect(() => {
    // In production, fetch from API
    setTimeout(() => {
      setLeads(generateMockLeads());
      setLoading(false);
    }, 500);
  }, []);

  // Filter leads by audience and search
  const filteredLeads = leads.filter((lead) => {
    const matchesAudience = selectedAudience === "all" || lead.audience === selectedAudience;
    const matchesSearch = !searchQuery ||
      lead.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.ownerFirstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.ownerLastName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAudience && matchesSearch;
  });

  // Group leads by audience for Netflix rows
  const leadsByAudience = AUDIENCES.reduce((acc, audience) => {
    acc[audience.id] = leads.filter(l =>
      audience.id === "all" ? true : l.audience === audience.id
    ).slice(0, 15);
    return acc;
  }, {} as Record<string, Lead[]>);

  // Handle actions
  const handleSendSMS = (lead: Lead, scheduled: boolean) => {
    if (!messageText.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    if (scheduled && (!scheduleDate || !scheduleTime)) {
      toast.error("Please select date and time");
      return;
    }

    // Deduct credits
    setCredits(prev => ({
      ...prev,
      sms: { ...prev.sms, used: prev.sms.used + 1, remaining: prev.sms.remaining - 1 }
    }));

    toast.success(scheduled
      ? `SMS scheduled for ${lead.ownerFirstName} on ${scheduleDate} at ${scheduleTime}`
      : `SMS sent to ${lead.ownerFirstName}!`
    );

    setActionDialog(null);
    setMessageText("");
    setScheduleDate("");
    setScheduleTime("");
  };

  const handleCall = (lead: Lead, scheduled: boolean) => {
    if (scheduled && (!scheduleDate || !scheduleTime)) {
      toast.error("Please select date and time");
      return;
    }

    // Deduct credits
    setCredits(prev => ({
      ...prev,
      calls: { ...prev.calls, used: prev.calls.used + 1, remaining: prev.calls.remaining - 1 }
    }));

    toast.success(scheduled
      ? `Call scheduled for ${lead.ownerFirstName} on ${scheduleDate} at ${scheduleTime}`
      : `Calling ${lead.ownerFirstName}...`
    );

    setActionDialog(null);
    setScheduleDate("");
    setScheduleTime("");
  };

  // Lead Card Component
  const LeadCard = ({ lead, size = "normal" }: { lead: Lead; size?: "normal" | "large" }) => {
    const StatusIcon = STATUS_CONFIG[lead.status].icon;

    return (
      <Card
        className={cn(
          "group relative overflow-hidden cursor-pointer transition-all duration-300",
          "bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800",
          "hover:border-zinc-600 hover:shadow-xl hover:shadow-purple-500/10 hover:scale-[1.02]",
          size === "large" ? "w-[320px]" : "w-[280px]",
          "flex-shrink-0"
        )}
        onClick={() => setSelectedLead(lead)}
      >
        {/* Score indicator */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-1",
          lead.score >= 80 ? "bg-gradient-to-r from-green-500 to-emerald-500" :
          lead.score >= 60 ? "bg-gradient-to-r from-yellow-500 to-orange-500" :
          "bg-gradient-to-r from-red-500 to-pink-500"
        )} />

        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white truncate text-lg group-hover:text-purple-300 transition-colors">
                {lead.companyName}
              </h3>
              <div className="flex items-center gap-1.5 text-sm text-zinc-400 mt-0.5">
                <User className="h-3.5 w-3.5" />
                <span className="truncate">{lead.ownerFirstName} {lead.ownerLastName}</span>
              </div>
            </div>
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
              STATUS_CONFIG[lead.status].color,
              "text-white"
            )}>
              <StatusIcon className="h-3 w-3" />
              {STATUS_CONFIG[lead.status].label}
            </div>
          </div>

          {/* Key Insight - Revenue */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/50">
            <div className="p-1.5 rounded bg-emerald-500/20">
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Annual Revenue</p>
              <p className="text-lg font-bold text-emerald-400">{formatRevenue(lead.annualRevenue)}</p>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-2 text-sm text-zinc-400">
            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="truncate">{lead.companyAddress}, {lead.city}, {lead.state}</span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {lead.tags.slice(0, 4).map((tag) => {
              const colors = TAG_COLORS[tag] || { bg: "bg-zinc-700", text: "text-zinc-300", border: "border-zinc-600" };
              return (
                <Badge
                  key={tag}
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0 border",
                    colors.bg, colors.text, colors.border
                  )}
                >
                  {tag}
                </Badge>
              );
            })}
            {lead.tags.length > 4 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-zinc-800 text-zinc-400">
                +{lead.tags.length - 4}
              </Badge>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2 border-t border-zinc-800">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 text-xs bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedLead(lead);
                setActionDialog({ type: "sms", mode: "instant" });
              }}
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              SMS
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 text-xs bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedLead(lead);
                setActionDialog({ type: "call", mode: "instant" });
              }}
            >
              <Phone className="h-3.5 w-3.5 mr-1" />
              Call
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700">
                <DropdownMenuItem
                  className="text-zinc-300"
                  onClick={() => {
                    setSelectedLead(lead);
                    setActionDialog({ type: "sms", mode: "scheduled" });
                  }}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Schedule SMS
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-zinc-300"
                  onClick={() => {
                    setSelectedLead(lead);
                    setActionDialog({ type: "call", mode: "scheduled" });
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Call
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-700" />
                <DropdownMenuItem className="text-zinc-300">
                  <Tag className="h-4 w-4 mr-2" />
                  Add to Audience
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Netflix-style row
  const LeadRow = ({ title, leads, icon: Icon }: { title: string; leads: Lead[]; icon: any }) => {
    if (leads.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <Badge variant="outline" className="bg-zinc-800 text-zinc-400 border-zinc-700">
              {leads.length}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
            See all <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <ScrollArea className="w-full">
          <div className="flex gap-4 px-6 pb-4">
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="bg-zinc-800" />
        </ScrollArea>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Building2 className="h-6 w-6 text-purple-500" />
                Outreach Center
              </h1>
              <p className="text-zinc-400 text-sm mt-1">USA BizData leads with instant outreach</p>
            </div>

            {/* Credits Display */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-6 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-400" />
                  <div className="text-xs">
                    <p className="text-zinc-500">SMS Credits</p>
                    <p className="font-semibold text-white">{credits.sms.remaining.toLocaleString()}</p>
                  </div>
                </div>
                <div className="w-px h-8 bg-zinc-700" />
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-green-400" />
                  <div className="text-xs">
                    <p className="text-zinc-500">Call Credits</p>
                    <p className="font-semibold text-white">{credits.calls.remaining.toLocaleString()}</p>
                  </div>
                </div>
                <div className="w-px h-8 bg-zinc-700" />
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-purple-400" />
                  <div className="text-xs">
                    <p className="text-zinc-500">Enrichment</p>
                    <p className="font-semibold text-white">{credits.enrichment.remaining.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Zap className="h-4 w-4 mr-2" />
                Buy Credits
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search leads by company or owner name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>
            <Button variant="outline" className="bg-zinc-900 border-zinc-700 text-zinc-300">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        {/* Audience Tabs */}
        <Tabs value={selectedAudience} onValueChange={setSelectedAudience} className="px-6">
          <TabsList className="bg-zinc-900 border border-zinc-800 p-1">
            {AUDIENCES.map((audience) => {
              const Icon = audience.icon;
              const count = audience.id === "all" ? leads.length : leads.filter(l => l.audience === audience.id).length;
              return (
                <TabsTrigger
                  key={audience.id}
                  value={audience.id}
                  className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-zinc-400"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {audience.name}
                  <Badge variant="outline" className="ml-2 bg-transparent border-zinc-600 text-zinc-400 text-xs">
                    {count}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="py-6 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 text-purple-500 animate-spin" />
          </div>
        ) : selectedAudience === "all" ? (
          // Netflix-style rows for "All" view
          <>
            <LeadRow title="Hot Leads" leads={leadsByAudience["hot-leads"]} icon={Flame} />
            <LeadRow title="New Today" leads={leadsByAudience["new-today"]} icon={Sparkles} />
            <LeadRow title="High Value" leads={leadsByAudience["high-value"]} icon={DollarSign} />
            <LeadRow title="Decision Makers" leads={leadsByAudience["decision-makers"]} icon={Target} />
            <LeadRow title="Exit Ready" leads={leadsByAudience["exit-ready"]} icon={TrendingUp} />
          </>
        ) : (
          // Grid view for filtered audience
          <div className="px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>
            {filteredLeads.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
                <h3 className="text-lg font-medium text-zinc-400">No leads found</h3>
                <p className="text-zinc-500">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead && !actionDialog} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-2xl">
          {selectedLead && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-purple-400" />
                  {selectedLead.companyName}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Owner Info */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-zinc-800">
                  <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <User className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{selectedLead.ownerFirstName} {selectedLead.ownerLastName}</p>
                    <p className="text-zinc-400">Business Owner</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-2xl font-bold text-emerald-400">{formatRevenue(selectedLead.annualRevenue)}</p>
                    <p className="text-zinc-500 text-sm">Annual Revenue</p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-zinc-800/50">
                    <p className="text-zinc-500 text-sm">Address</p>
                    <p className="text-white">{selectedLead.companyAddress}</p>
                    <p className="text-zinc-400">{selectedLead.city}, {selectedLead.state} {selectedLead.zip}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-800/50">
                    <p className="text-zinc-500 text-sm">Contact</p>
                    <p className="text-white">{selectedLead.phone || "No phone"}</p>
                    <p className="text-zinc-400">{selectedLead.email || "No email"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-800/50">
                    <p className="text-zinc-500 text-sm">Industry</p>
                    <p className="text-white">{selectedLead.industry}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-800/50">
                    <p className="text-zinc-500 text-sm">Company Info</p>
                    <p className="text-white">{selectedLead.employeeCount} employees</p>
                    <p className="text-zinc-400">{selectedLead.yearsInBusiness} years in business</p>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {selectedLead.tags.map((tag) => {
                    const colors = TAG_COLORS[tag] || { bg: "bg-zinc-700", text: "text-zinc-300", border: "border-zinc-600" };
                    return (
                      <Badge
                        key={tag}
                        variant="outline"
                        className={cn("px-2 py-1 border", colors.bg, colors.text, colors.border)}
                      >
                        {tag}
                      </Badge>
                    );
                  })}
                </div>

                {/* Score */}
                <div className="flex items-center gap-4 p-3 rounded-lg bg-zinc-800/50">
                  <div className="flex-1">
                    <p className="text-zinc-500 text-sm mb-1">Lead Score</p>
                    <div className="h-2 rounded-full bg-zinc-700 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          selectedLead.score >= 80 ? "bg-green-500" :
                          selectedLead.score >= 60 ? "bg-yellow-500" :
                          "bg-red-500"
                        )}
                        style={{ width: `${selectedLead.score}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">{selectedLead.score}</p>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  className="bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
                  onClick={() => setActionDialog({ type: "sms", mode: "instant" })}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send SMS
                </Button>
                <Button
                  variant="outline"
                  className="bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
                  onClick={() => setActionDialog({ type: "call", mode: "instant" })}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call Now
                </Button>
                <Button
                  variant="outline"
                  className="bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
                  onClick={() => setActionDialog({ type: "sms", mode: "scheduled" })}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white">
          {selectedLead && actionDialog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {actionDialog.type === "sms" ? (
                    <MessageSquare className="h-5 w-5 text-blue-400" />
                  ) : (
                    <Phone className="h-5 w-5 text-green-400" />
                  )}
                  {actionDialog.mode === "scheduled" ? "Schedule" : ""} {actionDialog.type === "sms" ? "SMS" : "Call"} to {selectedLead.ownerFirstName}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Recipient Info */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800">
                  <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <User className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedLead.ownerFirstName} {selectedLead.ownerLastName}</p>
                    <p className="text-sm text-zinc-400">{selectedLead.companyName}</p>
                  </div>
                </div>

                {/* Message for SMS */}
                {actionDialog.type === "sms" && (
                  <div>
                    <label className="text-sm text-zinc-400 mb-1 block">Message</label>
                    <Textarea
                      placeholder={`Hi ${selectedLead.ownerFirstName}, ...`}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white min-h-[100px]"
                    />
                    <p className="text-xs text-zinc-500 mt-1">{messageText.length}/160 characters</p>
                  </div>
                )}

                {/* Schedule Fields */}
                {actionDialog.mode === "scheduled" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-zinc-400 mb-1 block">Date</label>
                      <Input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-zinc-400 mb-1 block">Time</label>
                      <Input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Credits Warning */}
                <div className="flex items-center gap-2 p-2 rounded bg-zinc-800/50 text-xs text-zinc-400">
                  <CreditCard className="h-4 w-4" />
                  <span>
                    This will use 1 {actionDialog.type === "sms" ? "SMS" : "call"} credit.
                    You have {actionDialog.type === "sms" ? credits.sms.remaining : credits.calls.remaining} remaining.
                  </span>
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setActionDialog(null)}>
                  Cancel
                </Button>
                <Button
                  className={actionDialog.type === "sms" ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"}
                  onClick={() => {
                    if (actionDialog.type === "sms") {
                      handleSendSMS(selectedLead, actionDialog.mode === "scheduled");
                    } else {
                      handleCall(selectedLead, actionDialog.mode === "scheduled");
                    }
                  }}
                >
                  {actionDialog.mode === "scheduled" ? (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {actionDialog.type === "sms" ? "Send SMS" : "Call Now"}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
