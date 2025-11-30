"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  Search,
  MapPin,
  Building,
  Home,
  Factory,
  Store,
  TreePine,
  Building2,
  Download,
  RefreshCw,
  Star,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Plus,
  Trash2,
  Play,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Zap,
  Database,
  FileSearch,
  Hash,
} from "lucide-react";
import { toast } from "sonner";

// Activity log entry
interface ActivityLogEntry {
  id: string;
  timestamp: Date;
  type: "info" | "success" | "error" | "step";
  step?: number;
  message: string;
  details?: string;
}

// Property types from RealEstateAPI
const PROPERTY_TYPES = [
  { value: "SFR", label: "Single Family", icon: Home },
  { value: "MFR", label: "Multi-Family", icon: Building },
  { value: "LAND", label: "Land", icon: TreePine },
  { value: "CONDO", label: "Condo", icon: Building2 },
  { value: "MOBILE", label: "Mobile", icon: Home },
  { value: "OTHER", label: "Commercial/Other", icon: Factory },
];

const STATES = [
  { value: "NY", label: "New York" },
  { value: "NJ", label: "New Jersey" },
  { value: "CT", label: "Connecticut" },
  { value: "FL", label: "Florida" },
  { value: "TX", label: "Texas" },
  { value: "CA", label: "California" },
];

interface SavedSearch {
  id: string;
  name: string;
  county: string;
  state: string;
  propertyType: string;
  filters: Record<string, any>;
  propertyIds: string[];
  lastRun: Date | null;
  resultCount: number;
  status: "pending" | "running" | "complete" | "error";
}

interface PrioritizedLead {
  id: string;
  address: string;
  city: string;
  state: string;
  county: string;
  propertyType: string;
  owner: string;
  score: number;
  scoreBreakdown: {
    absentee: number;
    equity: number;
    lotSize: number;
    propertyType: number;
    distressed: number;
  };
  equity: number | null;
  value: number | null;
  lotSize: number | null;
  isAbsentee: boolean;
  isPreForeclosure: boolean;
  isTaxLien: boolean;
  isVacant: boolean;
  raw: any;
}

// Lead scoring weights
const SCORE_WEIGHTS = {
  absentee: 25,        // Absentee owner = high motivation
  highEquity: 20,      // 50%+ equity = can sell below market
  preForeclosure: 30,  // Distressed = urgent seller
  taxLien: 25,         // Tax issues = motivated
  vacant: 15,          // Vacant = carrying costs
  bigLot: 10,          // Development potential
  sfr: 5,              // Single family baseline
  mfr: 15,             // Multi-family = investor target
  commercial: 20,      // Commercial = higher value
};

export function LeadTracker() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [prioritizedLeads, setPrioritizedLeads] = useState<PrioritizedLead[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [currentStep, setCurrentStep] = useState<{ search: string; step: number; total: number } | null>(null);
  const activityLogRef = useRef<HTMLDivElement>(null);

  // New search form
  const [selectedState, setSelectedState] = useState<string>("");
  const [county, setCounty] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["SFR", "MFR"]);

  // Add entry to activity log
  const addLog = (type: ActivityLogEntry["type"], message: string, details?: string, step?: number) => {
    const entry: ActivityLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
      type,
      step,
      message,
      details,
    };
    setActivityLog((prev) => [...prev.slice(-50), entry]); // Keep last 50 entries

    // Auto-scroll to bottom
    setTimeout(() => {
      if (activityLogRef.current) {
        activityLogRef.current.scrollTop = activityLogRef.current.scrollHeight;
      }
    }, 50);
  };

  // Load saved searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("leadTracker_searches");
    if (saved) {
      const parsed = JSON.parse(saved);
      setSavedSearches(parsed.map((s: any) => ({
        ...s,
        lastRun: s.lastRun ? new Date(s.lastRun) : null,
      })));
    }

    const leads = localStorage.getItem("leadTracker_leads");
    if (leads) {
      setPrioritizedLeads(JSON.parse(leads));
    }
  }, []);

  // Save to localStorage when data changes
  useEffect(() => {
    if (savedSearches.length > 0) {
      localStorage.setItem("leadTracker_searches", JSON.stringify(savedSearches));
    }
  }, [savedSearches]);

  useEffect(() => {
    if (prioritizedLeads.length > 0) {
      localStorage.setItem("leadTracker_leads", JSON.stringify(prioritizedLeads));
    }
  }, [prioritizedLeads]);

  // Generate searches for county + all selected property types
  const generateSearches = () => {
    if (!selectedState || !county.trim()) {
      toast.error("Please select a state and enter a county");
      return;
    }

    if (selectedTypes.length === 0) {
      toast.error("Please select at least one property type");
      return;
    }

    const newSearches: SavedSearch[] = selectedTypes.map((type) => ({
      id: `${county}-${selectedState}-${type}-${Date.now()}`,
      name: `${county} County ${selectedState} - ${PROPERTY_TYPES.find(t => t.value === type)?.label || type}`,
      county: county.trim(),
      state: selectedState,
      propertyType: type,
      filters: {
        county: county.trim(),
        state: selectedState,
        property_type: type,
        absentee_owner: true,
        size: 100,
      },
      propertyIds: [],
      lastRun: null,
      resultCount: 0,
      status: "pending",
    }));

    setSavedSearches((prev) => [...prev, ...newSearches]);
    setCounty("");
    toast.success(`Created ${newSearches.length} saved searches for ${county} County`);
  };

  // Calculate lead score using API response fields
  // API fields: absenteeOwner, equityPercent, preForeclosure, taxLien, vacant, lotSize, propertyType
  const calculateScore = (prop: any): { score: number; breakdown: PrioritizedLead["scoreBreakdown"] } => {
    const breakdown = {
      absentee: 0,
      equity: 0,
      lotSize: 0,
      propertyType: 0,
      distressed: 0,
    };

    // Absentee owner (API field: absenteeOwner)
    if (prop.absenteeOwner) {
      breakdown.absentee = SCORE_WEIGHTS.absentee;
    }

    // High equity (API field: equityPercent)
    const equityPercent = prop.equityPercent || 0;
    if (equityPercent >= 50) {
      breakdown.equity = SCORE_WEIGHTS.highEquity;
    } else if (equityPercent >= 30) {
      breakdown.equity = SCORE_WEIGHTS.highEquity * 0.5;
    }

    // Distressed indicators (API fields: preForeclosure, foreclosure, taxLien, vacant)
    if (prop.preForeclosure || prop.foreclosure) {
      breakdown.distressed += SCORE_WEIGHTS.preForeclosure;
    }
    if (prop.taxLien) {
      breakdown.distressed += SCORE_WEIGHTS.taxLien;
    }
    if (prop.vacant) {
      breakdown.distressed += SCORE_WEIGHTS.vacant;
    }

    // Big lot (development potential) - over 1 acre (API field: lotSize or lotSquareFeet)
    const lotSize = prop.lotSize || prop.lotSquareFeet || 0;
    if (lotSize >= 43560) { // 1 acre in sqft
      breakdown.lotSize = SCORE_WEIGHTS.bigLot;
    }

    // Property type scoring (API field: propertyType - SFR, MFR, CONDO, etc.)
    const propType = prop.propertyType || "";
    if (propType === "MFR" || propType.includes("Multi")) {
      breakdown.propertyType = SCORE_WEIGHTS.mfr;
    } else if (propType === "OTHER" || propType.includes("Commercial")) {
      breakdown.propertyType = SCORE_WEIGHTS.commercial;
    } else {
      breakdown.propertyType = SCORE_WEIGHTS.sfr;
    }

    const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
    return { score, breakdown };
  };

  // Run a single search - Get IDs + first batch of details
  const runSearch = async (searchId: string) => {
    const searchIndex = savedSearches.findIndex((s) => s.id === searchId);
    if (searchIndex === -1) return;

    const search = savedSearches[searchIndex];
    const searchName = `${search.county} ${search.state} - ${search.propertyType}`;

    addLog("info", `Starting search: ${searchName}`, "Initializing 3-step workflow...");
    setCurrentStep({ search: searchName, step: 0, total: 3 });

    // Update status to running
    setSavedSearches((prev) =>
      prev.map((s) => (s.id === searchId ? { ...s, status: "running" } : s))
    );

    try {
      // Build the search params - ensure all fields are present
      const searchParams = {
        county: search.county,
        state: search.state,
        property_type: search.propertyType || "SFR",
        absentee_owner: true,
      };

      // ====== STEP 1: Get count first (FREE - 0 credits) ======
      setCurrentStep({ search: searchName, step: 1, total: 3 });
      addLog("step", "STEP 1/3: Count Query", `Fetching total count (FREE - 0 credits)`, 1);

      const countResponse = await fetch("/api/property/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...searchParams, count: true }),
      });

      if (!countResponse.ok) {
        const errorData = await countResponse.json();
        addLog("error", `Step 1 FAILED: ${errorData.message || "Count query failed"}`);
        throw new Error(errorData.message || "Count query failed");
      }

      const countData = await countResponse.json();
      const totalCount = countData.resultCount || countData.count || 0;

      addLog("success", `✓ Found ${totalCount.toLocaleString()} properties`, `${search.propertyType} absentee owners in ${search.county} County`);

      if (totalCount === 0) {
        addLog("info", "No properties found - search complete");
        setCurrentStep(null);
        setSavedSearches((prev) =>
          prev.map((s) => s.id === searchId ? { ...s, status: "complete", lastRun: new Date(), resultCount: 0, propertyIds: [] } : s)
        );
        return;
      }

      // ====== STEP 2: Get IDs using ids_only: true (up to 10,000 IDs per call) ======
      setCurrentStep({ search: searchName, step: 2, total: 3 });
      addLog("step", "STEP 2/3: Fetch Property IDs", `Retrieving up to 10,000 IDs for tracking`, 2);

      const idsResponse = await fetch("/api/property/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...searchParams, ids_only: true }),
      });

      if (!idsResponse.ok) {
        const errorData = await idsResponse.json();
        addLog("error", `Step 2 FAILED: ${errorData.message || "IDs query failed"}`);
        throw new Error(errorData.message || "IDs query failed");
      }

      const idsData = await idsResponse.json();
      const propertyIds = idsData.data || [];

      addLog("success", `✓ Retrieved ${propertyIds.length.toLocaleString()} property IDs`, "IDs stored for monitoring changes");

      // ====== STEP 3: Get first batch of full details (250 max per call) for scoring ======
      setCurrentStep({ search: searchName, step: 3, total: 3 });
      addLog("step", "STEP 3/3: Get Property Details", `Fetching 250 properties for lead scoring`, 3);

      const detailResponse = await fetch("/api/property/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...searchParams, size: 250 }),
      });

      let properties: any[] = [];
      if (detailResponse.ok) {
        const detailData = await detailResponse.json();
        properties = detailData.data || [];
        addLog("success", `✓ Got ${properties.length} properties with full details`, "Ready for lead scoring");
      } else {
        addLog("error", "Step 3 FAILED: Could not fetch property details");
      }

      // Store property IDs (convert numbers to strings)
      const storedIds = propertyIds.map((p: any) => String(p));

      // Update search with results - totalCount is the real count, storedIds are the tracked IDs
      setSavedSearches((prev) =>
        prev.map((s) =>
          s.id === searchId
            ? {
                ...s,
                status: "complete",
                lastRun: new Date(),
                resultCount: totalCount,  // Use the count from the count query
                propertyIds: storedIds,   // Store the IDs from ids_only
              }
            : s
        )
      );

      // Process and score leads from the detail response
      // API Response fields: id, propertyId, address.{street,city,state,zip,county},
      // owner1FirstName, owner1LastName, equityPercent, estimatedValue, absenteeOwner, etc.
      const newLeads: PrioritizedLead[] = properties.map((prop: any) => {
        const { score, breakdown } = calculateScore(prop);
        // Build owner name from owner1FirstName + owner1LastName
        const ownerName = [prop.owner1FirstName, prop.owner1LastName]
          .filter(Boolean)
          .join(" ") || prop.ownerName || "Unknown";

        return {
          id: prop.id || prop.propertyId || `${prop.address?.street}-${prop.address?.zip}`,
          address: prop.address?.street || prop.address?.address || "",
          city: prop.address?.city || "",
          state: prop.address?.state || search.state,
          county: prop.address?.county || search.county,
          propertyType: prop.propertyType || search.propertyType,
          owner: ownerName,
          score,
          scoreBreakdown: breakdown,
          equity: prop.equityPercent || null,
          value: prop.estimatedValue || null,
          lotSize: prop.lotSize || prop.lotSquareFeet || null,
          isAbsentee: prop.absenteeOwner || false,
          isPreForeclosure: prop.preForeclosure || false,
          isTaxLien: prop.taxLien || false,
          isVacant: prop.vacant || false,
          raw: prop,
        };
      });

      // Merge with existing leads (avoid duplicates)
      setPrioritizedLeads((prev) => {
        const existingIds = new Set(prev.map((l) => l.id));
        const uniqueNew = newLeads.filter((l) => !existingIds.has(l.id));
        const merged = [...prev, ...uniqueNew];
        // Sort by score descending
        return merged.sort((a, b) => b.score - a.score);
      });

      // Search complete
      setCurrentStep(null);
      addLog("success", `✓ COMPLETE: ${searchName}`, `${totalCount.toLocaleString()} total | ${storedIds.length.toLocaleString()} tracked | ${newLeads.length} scored`);
      toast.success(`${search.name} complete!`);
    } catch (error: any) {
      console.error("Search error:", error);
      setCurrentStep(null);
      addLog("error", `✗ FAILED: ${searchName}`, error.message);
      setSavedSearches((prev) =>
        prev.map((s) => (s.id === searchId ? { ...s, status: "error" } : s))
      );
      toast.error(`Error: ${error.message}`);
    }
  };

  // Run all searches
  const runAllSearches = async () => {
    if (savedSearches.length === 0) {
      toast.error("No searches to run! Create searches first.");
      return;
    }

    setIsRunningAll(true);
    addLog("info", `▶ STARTING BATCH: ${savedSearches.length} searches`, "Running all saved searches sequentially...");

    let completed = 0;
    let failed = 0;

    for (let i = 0; i < savedSearches.length; i++) {
      const search = savedSearches[i];
      addLog("info", `Processing ${i + 1}/${savedSearches.length}: ${search.name}`);

      if (search.status !== "running") {
        try {
          await runSearch(search.id);
          completed++;
        } catch (e) {
          failed++;
        }
        // Small delay between requests
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    setIsRunningAll(false);
    addLog("success", `✓ BATCH COMPLETE: ${completed} succeeded, ${failed} failed`);
    toast.success(`All searches complete! ${completed} succeeded, ${failed} failed`);
  };

  // Delete a search
  const deleteSearch = (searchId: string) => {
    setSavedSearches((prev) => prev.filter((s) => s.id !== searchId));
    toast.success("Search deleted");
  };

  // Push to SMS Campaign (5K batch)
  const pushToCampaign = async (leads: PrioritizedLead[], campaignName: string) => {
    if (leads.length === 0) {
      toast.error("No leads selected");
      return;
    }

    const batchSize = 5000;
    const batches = Math.ceil(leads.length / batchSize);

    for (let i = 0; i < batches; i++) {
      const batch = leads.slice(i * batchSize, (i + 1) * batchSize);

      // Format for SMS campaign
      const campaignData = batch.map((lead) => ({
        id: lead.id,
        phone: lead.raw?.owner?.phones?.[0] || "",
        name: lead.owner,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        tags: getLeadTags(lead),
        score: lead.score,
        propertyType: lead.propertyType,
      }));

      // Store campaign batch in localStorage (would be API call in production)
      const existingCampaigns = JSON.parse(localStorage.getItem("sms_campaigns") || "[]");
      existingCampaigns.push({
        id: `${campaignName}-batch-${i + 1}-${Date.now()}`,
        name: `${campaignName} - Batch ${i + 1}`,
        leads: campaignData,
        createdAt: new Date().toISOString(),
        status: "ready",
        totalLeads: campaignData.length,
      });
      localStorage.setItem("sms_campaigns", JSON.stringify(existingCampaigns));
    }

    toast.success(`Pushed ${leads.length} leads to "${campaignName}" campaign (${batches} batch${batches > 1 ? "es" : ""})`);
  };

  // Generate tags for a lead
  const getLeadTags = (lead: PrioritizedLead): string[] => {
    const tags: string[] = [];

    if (lead.isAbsentee) tags.push("ABSENTEE");
    if (lead.isPreForeclosure) tags.push("PRE_FORECLOSURE");
    if (lead.isTaxLien) tags.push("TAX_LIEN");
    if (lead.isVacant) tags.push("VACANT");
    if (lead.equity && lead.equity >= 50) tags.push("HIGH_EQUITY");
    if (lead.score >= 70) tags.push("HOT_LEAD");
    if (lead.score >= 40 && lead.score < 70) tags.push("WARM_LEAD");

    // Property type tag
    tags.push(lead.propertyType);

    return tags;
  };

  // Event flags that need monitoring
  const EVENT_FLAGS = [
    { key: "mls_active", label: "Property Listed", color: "blue" },
    { key: "mls_cancelled", label: "Listing Expired", color: "orange" },
    { key: "pre_foreclosure", label: "Lis Pendens Notice", color: "red" },
    { key: "vacant", label: "Now Vacant", color: "purple" },
    { key: "foreclosure", label: "Foreclosure Filed", color: "red" },
    { key: "auction", label: "Auction Scheduled", color: "yellow" },
  ];

  // Export leads to CSV
  const exportLeadsToCSV = () => {
    if (prioritizedLeads.length === 0) {
      toast.error("No leads to export");
      return;
    }

    const headers = [
      "Score",
      "Address",
      "City",
      "State",
      "County",
      "Property Type",
      "Owner",
      "Equity %",
      "Value",
      "Lot Size",
      "Absentee",
      "Pre-Foreclosure",
      "Tax Lien",
      "Vacant",
      "Absentee Score",
      "Equity Score",
      "Lot Score",
      "Type Score",
      "Distressed Score",
    ];

    const rows = prioritizedLeads.map((lead) => [
      lead.score,
      lead.address,
      lead.city,
      lead.state,
      lead.county,
      lead.propertyType,
      lead.owner,
      lead.equity || "",
      lead.value || "",
      lead.lotSize || "",
      lead.isAbsentee ? "Yes" : "No",
      lead.isPreForeclosure ? "Yes" : "No",
      lead.isTaxLien ? "Yes" : "No",
      lead.isVacant ? "Yes" : "No",
      lead.scoreBreakdown.absentee,
      lead.scoreBreakdown.equity,
      lead.scoreBreakdown.lotSize,
      lead.scoreBreakdown.propertyType,
      lead.scoreBreakdown.distressed,
    ].map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","));

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `prioritized_leads_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${prioritizedLeads.length} leads to CSV`);
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-400 bg-green-900/50 border-green-700";
    if (score >= 40) return "text-yellow-400 bg-yellow-900/50 border-yellow-700";
    return "text-zinc-400 bg-zinc-800 border-zinc-700";
  };

  const getTypeIcon = (type: string) => {
    const found = PROPERTY_TYPES.find((t) => t.value === type);
    return found?.icon || Building;
  };

  // Calculate totals for dashboard
  const totalProperties = savedSearches.reduce((sum, s) => sum + s.resultCount, 0);
  const totalTrackedIds = savedSearches.reduce((sum, s) => sum + s.propertyIds.length, 0);
  const completedSearches = savedSearches.filter((s) => s.status === "complete").length;
  const hotLeads = prioritizedLeads.filter((l) => l.score >= 70).length;
  const warmLeads = prioritizedLeads.filter((l) => l.score >= 40 && l.score < 70).length;

  return (
    <div className="space-y-6">
      {/* ===== LIVE DASHBOARD ===== */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-blue-900/50 to-blue-950 border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-xs text-blue-300">Total Properties</p>
                <p className="text-xl font-bold text-white">{totalProperties.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-900/50 to-purple-950 border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-purple-400" />
              <div>
                <p className="text-xs text-purple-300">IDs Tracked</p>
                <p className="text-xl font-bold text-white">{totalTrackedIds.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-900/50 to-green-950 border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-xs text-green-300">Searches Done</p>
                <p className="text-xl font-bold text-white">{completedSearches} / {savedSearches.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-900/50 to-orange-950 border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-400" />
              <div>
                <p className="text-xs text-orange-300">Hot Leads (70+)</p>
                <p className="text-xl font-bold text-white">{hotLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-900/50 to-yellow-950 border-yellow-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-yellow-400" />
              <div>
                <p className="text-xs text-yellow-300">Warm Leads (40+)</p>
                <p className="text-xl font-bold text-white">{warmLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-zinc-800/50 to-zinc-900 border-zinc-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-zinc-400" />
              <div>
                <p className="text-xs text-zinc-300">Total Leads</p>
                <p className="text-xl font-bold text-white">{prioritizedLeads.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== LIVE ACTIVITY LOG ===== */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-zinc-100 text-sm">
              <Activity className="h-4 w-4 text-cyan-400" />
              Live Activity
              {currentStep && (
                <Badge className="ml-2 bg-cyan-900/50 text-cyan-300 animate-pulse">
                  {currentStep.search}: Step {currentStep.step}/{currentStep.total}
                </Badge>
              )}
            </CardTitle>
            {activityLog.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActivityLog([])}
                className="text-zinc-500 hover:text-zinc-300 text-xs"
              >
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div
            ref={activityLogRef}
            className="h-32 overflow-y-auto bg-black/40 rounded-lg p-2 font-mono text-xs space-y-1"
          >
            {activityLog.length === 0 ? (
              <p className="text-zinc-600 text-center py-4">Waiting for activity... Run searches to see live progress.</p>
            ) : (
              activityLog.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-start gap-2 ${
                    entry.type === "success"
                      ? "text-green-400"
                      : entry.type === "error"
                      ? "text-red-400"
                      : entry.type === "step"
                      ? "text-cyan-400"
                      : "text-zinc-400"
                  }`}
                >
                  <span className="text-zinc-600 shrink-0">
                    {entry.timestamp.toLocaleTimeString("en-US", { hour12: false })}
                  </span>
                  {entry.type === "step" && <FileSearch className="h-3 w-3 shrink-0 mt-0.5" />}
                  {entry.type === "success" && <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />}
                  {entry.type === "error" && <XCircle className="h-3 w-3 shrink-0 mt-0.5" />}
                  {entry.type === "info" && <Clock className="h-3 w-3 shrink-0 mt-0.5" />}
                  <span>
                    {entry.message}
                    {entry.details && <span className="text-zinc-500 ml-2">— {entry.details}</span>}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Step Progress Bar */}
          {currentStep && (
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>{currentStep.search}</span>
                <span>Step {currentStep.step} of {currentStep.total}</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${(currentStep.step / currentStep.total) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className={currentStep.step >= 1 ? "text-green-400" : "text-zinc-600"}>① Count (FREE)</span>
                <span className={currentStep.step >= 2 ? "text-green-400" : "text-zinc-600"}>② Get IDs</span>
                <span className={currentStep.step >= 3 ? "text-green-400" : "text-zinc-600"}>③ Details</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Searches */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <Target className="h-5 w-5 text-purple-400" />
            Generate Saved Searches by County
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Select a county to auto-generate searches for each property type
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">State</Label>
              <select
                value={selectedState}
                aria-label="Select state"
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200"
              >
                <option value="">Select State</option>
                {STATES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">County</Label>
              <Input
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                placeholder="e.g., Bergen, Harris, Miami-Dade"
                className="bg-zinc-800 border-zinc-700 text-zinc-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Property Types</Label>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedTypes.includes(type.value);
                  return (
                    <Badge
                      key={type.value}
                      variant="outline"
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-purple-900/50 text-purple-300 border-purple-600"
                          : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                      }`}
                      onClick={() =>
                        setSelectedTypes((prev) =>
                          isSelected
                            ? prev.filter((t) => t !== type.value)
                            : [...prev, type.value]
                        )
                      }
                    >
                      <Icon className="h-3 w-3 mr-1" />
                      {type.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>
          <Button onClick={generateSearches} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-2" />
            Generate Searches
          </Button>
        </CardContent>
      </Card>

      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-zinc-100">
                  <Save className="h-5 w-5 text-blue-400" />
                  Saved Searches ({savedSearches.length})
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Run searches to populate leads with property IDs
                </CardDescription>
              </div>
              <Button
                onClick={runAllSearches}
                disabled={isRunningAll}
                className="bg-green-600 hover:bg-green-700"
              >
                {isRunningAll ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Run All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {savedSearches.map((search) => {
                const TypeIcon = getTypeIcon(search.propertyType);
                return (
                  <div
                    key={search.id}
                    className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <TypeIcon className="h-4 w-4 text-zinc-400" />
                        <div>
                          <p className="text-sm font-medium text-zinc-200">{search.name}</p>
                          <p className="text-xs text-zinc-500">
                            {search.resultCount} properties | {search.propertyIds.length} tracked
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={
                          search.status === "complete"
                            ? "bg-green-900/50 text-green-300"
                            : search.status === "running"
                            ? "bg-blue-900/50 text-blue-300"
                            : search.status === "error"
                            ? "bg-red-900/50 text-red-300"
                            : "bg-zinc-800 text-zinc-400"
                        }
                      >
                        {search.status}
                      </Badge>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runSearch(search.id)}
                        disabled={search.status === "running"}
                        className="flex-1 border-zinc-700"
                      >
                        {search.status === "running" ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteSearch(search.id)}
                        className="border-red-900 text-red-400 hover:bg-red-900/20"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prioritized Leads */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-zinc-100">
                <TrendingUp className="h-5 w-5 text-green-400" />
                Prioritized Leads ({prioritizedLeads.length})
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Leads scored by: Absentee + Equity + Distress + Lot Size + Property Type
              </CardDescription>
            </div>
            {prioritizedLeads.length > 0 && (
              <div className="flex gap-2">
                <Button
                  onClick={() => pushToCampaign(prioritizedLeads.filter(l => l.score >= 40), "Hot_Leads")}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Push to SMS ({prioritizedLeads.filter(l => l.score >= 40).length})
                </Button>
                <Button onClick={exportLeadsToCSV} className="bg-green-600 hover:bg-green-700">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {prioritizedLeads.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No leads yet. Create and run saved searches to generate prioritized leads.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {prioritizedLeads.slice(0, 50).map((lead, i) => (
                <div
                  key={lead.id}
                  className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700"
                >
                  <div className={`flex items-center justify-center w-12 h-12 rounded-lg font-bold ${getScoreColor(lead.score)}`}>
                    {lead.score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-zinc-200 truncate">{lead.address}</p>
                      {lead.isAbsentee && (
                        <Badge className="bg-purple-900/50 text-purple-300 text-xs">Absentee</Badge>
                      )}
                      {lead.isPreForeclosure && (
                        <Badge className="bg-red-900/50 text-red-300 text-xs">Pre-Foreclosure</Badge>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">
                      {lead.city}, {lead.state} | {lead.county} County | {lead.propertyType}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {lead.equity && (
                      <Badge className="bg-green-900/50 text-green-300 border-green-700">
                        {lead.equity}% equity
                      </Badge>
                    )}
                    {lead.value && (
                      <Badge className="bg-blue-900/50 text-blue-300 border-blue-700">
                        ${(lead.value / 1000).toFixed(0)}K
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 shrink-0">
                    <Users className="h-3 w-3 inline mr-1" />
                    {lead.owner}
                  </div>
                </div>
              ))}
              {prioritizedLeads.length > 50 && (
                <p className="text-xs text-zinc-500 text-center py-2">
                  Showing top 50 of {prioritizedLeads.length} leads. Export to CSV for full list.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Score Legend */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100 text-sm">
            <Star className="h-4 w-4 text-yellow-400" />
            Lead Scoring Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div className="p-2 bg-zinc-800/50 rounded">
              <p className="text-zinc-400">Absentee Owner</p>
              <p className="text-zinc-200 font-bold">+{SCORE_WEIGHTS.absentee} pts</p>
            </div>
            <div className="p-2 bg-zinc-800/50 rounded">
              <p className="text-zinc-400">Pre-Foreclosure</p>
              <p className="text-zinc-200 font-bold">+{SCORE_WEIGHTS.preForeclosure} pts</p>
            </div>
            <div className="p-2 bg-zinc-800/50 rounded">
              <p className="text-zinc-400">Tax Lien</p>
              <p className="text-zinc-200 font-bold">+{SCORE_WEIGHTS.taxLien} pts</p>
            </div>
            <div className="p-2 bg-zinc-800/50 rounded">
              <p className="text-zinc-400">High Equity (50%+)</p>
              <p className="text-zinc-200 font-bold">+{SCORE_WEIGHTS.highEquity} pts</p>
            </div>
            <div className="p-2 bg-zinc-800/50 rounded">
              <p className="text-zinc-400">Commercial</p>
              <p className="text-zinc-200 font-bold">+{SCORE_WEIGHTS.commercial} pts</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
