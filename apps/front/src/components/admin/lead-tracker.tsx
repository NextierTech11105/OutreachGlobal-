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
  Info,
  Send,
  CloudUpload,
  Eye,
  Upload,
  FileUp,
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

// Property types from RealEstateAPI - ONLY these 6 values are valid!
// API error: "PropertySearchPropertyTypeEnums" must be one of [SFR, MFR, LAND, CONDO, OTHER, MOBILE]
const PROPERTY_TYPES = [
  { value: "SFR", label: "Single Family", icon: Home },
  { value: "MFR", label: "Multi-Family", icon: Building },
  { value: "CONDO", label: "Condo", icon: Building2 },
  { value: "LAND", label: "Land", icon: TreePine },
  { value: "MOBILE", label: "Mobile Home", icon: Home },
  { value: "OTHER", label: "Commercial/Other", icon: Factory },
];

const STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
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
  yearsOwned: number | null;  // Years current owner has owned
  isAbsentee: boolean;
  isPreForeclosure: boolean;
  isTaxLien: boolean;
  isVacant: boolean;
  // MLS & Change Tracking
  isMlsActive: boolean;       // Currently listed - DO NOT PURSUE
  isMlsExpired: boolean;      // Listing expired - HOT LEAD!
  hasDeedChange: boolean;     // Recent deed change - FLAG for review
  hasStatusChange: boolean;   // Any recent status change
  changeType?: "added" | "updated" | "deleted" | "unchanged";
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
  mlsExpired: 35,      // Listing expired = HOT! Failed to sell
  deedChange: -50,     // Recent sale = probably not motivated (negative)
  mlsActive: -100,     // Currently listed = DO NOT PURSUE
};

export function LeadTracker() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [prioritizedLeads, setPrioritizedLeads] = useState<PrioritizedLead[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Lead filtering
  const [hideMlsActive, setHideMlsActive] = useState(true); // Default: hide MLS listed
  const [showOnlyHot, setShowOnlyHot] = useState(false);    // Show only score >= 70
  const [showOnlyExpired, setShowOnlyExpired] = useState(false); // Show only expired listings
  const [currentStep, setCurrentStep] = useState<{ search: string; step: number; total: number } | null>(null);
  const activityLogRef = useRef<HTMLDivElement>(null);

  // New search form
  const [selectedState, setSelectedState] = useState<string>("");
  const [county, setCounty] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["SFR", "MFR"]);

  // Search filters
  const [minYearsOwned, setMinYearsOwned] = useState<number>(5); // Default 5+ years
  const [filterByYearsOwned, setFilterByYearsOwned] = useState<boolean>(true); // Enable by default
  const [includeMlsData, setIncludeMlsData] = useState<boolean>(true); // Include MLS status

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
        size: 250, // Max allowed by API
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
  // MLS fields: mlsActive, mlsCancelled (expired), mlsDaysOnMarket
  const calculateScore = (prop: any): { score: number; breakdown: PrioritizedLead["scoreBreakdown"] } => {
    const breakdown = {
      absentee: 0,
      equity: 0,
      lotSize: 0,
      propertyType: 0,
      distressed: 0,
    };

    // === MLS STATUS - Critical for deciding whether to pursue ===
    // Currently listed = DO NOT PURSUE (will be filtered out)
    if (prop.mlsActive) {
      // Return -100 score - these will be filtered/hidden
      return { score: SCORE_WEIGHTS.mlsActive, breakdown };
    }

    // MLS Expired/Cancelled = HOT LEAD! Failed to sell, motivated seller
    if (prop.mlsCancelled) {
      breakdown.distressed += SCORE_WEIGHTS.mlsExpired;
    }

    // Recent deed change (last 90 days) = Recently sold, not motivated
    if (prop.lastSaleDate) {
      const lastSale = new Date(prop.lastSaleDate);
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      if (lastSale > ninetyDaysAgo) {
        breakdown.distressed += SCORE_WEIGHTS.deedChange; // Negative score
      }
    }

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

    // Property type scoring (API values: SFR, MFR, CONDO, LAND, MOBILE, OTHER)
    const propType = (prop.propertyType || "").toUpperCase();
    if (propType === "MFR") {
      breakdown.propertyType = SCORE_WEIGHTS.mfr;
    } else if (propType === "OTHER") {
      breakdown.propertyType = SCORE_WEIGHTS.commercial; // OTHER = commercial/industrial
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
      const searchParams: Record<string, any> = {
        county: search.county,
        state: search.state,
        property_type: search.propertyType || "SFR",
        absentee_owner: true,
      };

      // Add years owned filter if enabled (5+ years = more equity, more motivated)
      if (filterByYearsOwned && minYearsOwned > 0) {
        searchParams.min_years_owned = minYearsOwned;
        searchParams.sort_by = "years_owned"; // Sort by longest ownership first
        searchParams.sort_direction = "desc";
      }

      // Include MLS data to flag listed properties
      if (includeMlsData) {
        searchParams.include_mls = true;
      }

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

      // ====== STEP 3: Get property details with pagination (250 per page, 3 pages = 750 max) ======
      setCurrentStep({ search: searchName, step: 3, total: 3 });
      addLog("step", "STEP 3/3: Get Property Details", `Fetching up to 750 properties (3 pages) for lead scoring`, 3);

      let properties: any[] = [];
      const maxPages = 3; // Get 3 pages of 250 = 750 properties max

      for (let page = 1; page <= maxPages; page++) {
        const detailResponse = await fetch("/api/property/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...searchParams, size: 250, page }),
        });

        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          const pageData = detailData.data || [];
          properties = [...properties, ...pageData];
          addLog("success", `✓ Page ${page}: Got ${pageData.length} properties`, `Total so far: ${properties.length}`);

          // Stop if we got less than 250 (no more pages)
          if (pageData.length < 250) break;
        } else {
          addLog("error", `Page ${page} FAILED: Could not fetch property details`);
          break;
        }

        // Small delay between pages
        if (page < maxPages) await new Promise((r) => setTimeout(r, 200));
      }

      addLog("success", `✓ Got ${properties.length} total properties with full details`, "Ready for lead scoring");

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

        // Check MLS status from API response
        const isMlsActive = prop.mlsActive || false;
        const isMlsExpired = prop.mlsCancelled || false;
        const hasDeedChange = prop.lastSale?.documentTypeCode === "DTWD" &&
          prop.lastSaleDate && new Date(prop.lastSaleDate) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Last 90 days

        // Calculate years owned from lastSaleDate
        let yearsOwned: number | null = null;
        if (prop.lastSaleDate) {
          const saleDate = new Date(prop.lastSaleDate);
          const now = new Date();
          yearsOwned = Math.floor((now.getTime() - saleDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        } else if (prop.yearsOwned) {
          yearsOwned = prop.yearsOwned;
        }

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
          yearsOwned,  // Years current owner has owned
          isAbsentee: prop.absenteeOwner || false,
          isPreForeclosure: prop.preForeclosure || false,
          isTaxLien: prop.taxLien || false,
          isVacant: prop.vacant || false,
          // MLS & Change Tracking
          isMlsActive,           // Currently listed - DO NOT PURSUE
          isMlsExpired,          // Listing expired - HOT LEAD!
          hasDeedChange,         // Recent deed change - FLAG
          hasStatusChange: false, // Will be set from Portfolio API
          changeType: undefined,
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

  // Save all searches to RealEstateAPI Portfolio (official tracking with daily change reports)
  const saveAllToDatabase = async () => {
    if (savedSearches.length === 0) {
      toast.error("No searches to save");
      return;
    }

    setIsSavingToDb(true);
    addLog("info", "Saving to RealEstateAPI Portfolio...", "Creating tracked saved searches with daily change reports");

    let saved = 0;
    let failed = 0;

    for (const search of savedSearches) {
      if (search.status !== "complete" || search.propertyIds.length === 0) continue;

      try {
        // Use RealEstateAPI's official Saved Search API for tracking changes
        const response = await fetch("/api/portfolio/saved-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            search_name: search.name,
            list_size: Math.min(search.propertyIds.length, 10000),
            search_query: {
              ids: search.propertyIds.slice(0, 10000), // Track by IDs (max 10K)
            },
            meta_data: {
              county: search.county,
              state: search.state,
              property_type: search.propertyType,
              source: "lead_tracker",
            },
          }),
        });

        if (response.ok) {
          const result = await response.json();
          saved++;
          addLog("success", `✓ Saved: ${search.name}`, `searchId: ${result.searchId}`);
        } else {
          failed++;
          const err = await response.json();
          addLog("error", `✗ Failed: ${search.name}`, err.error || err.message);
        }
      } catch (err: any) {
        failed++;
        addLog("error", `✗ Failed: ${search.name}`, err.message);
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    setIsSavingToDb(false);
    if (saved > 0) {
      toast.success(`${saved} searches saved to RealEstateAPI Portfolio!`);
      addLog("success", `Daily tracking enabled for ${saved} searches`, "Check changes via Retrieve API");
    }
  };

  // Fetch batch details for leads (250 at a time)
  const fetchBatchDetails = async () => {
    const leadsNeedingDetails = prioritizedLeads.filter((l) => !l.raw?.saleHistory);

    if (leadsNeedingDetails.length === 0) {
      toast.info("All leads already have details");
      return;
    }

    setIsFetchingDetails(true);
    const batchSize = 250;
    const ids = leadsNeedingDetails.slice(0, batchSize).map((l) => l.id);

    addLog("step", `Fetching details for ${ids.length} properties...`, "Getting personalization variables");

    try {
      const response = await fetch("/api/property/detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch details");
      }

      const result = await response.json();
      const details = result.data || [];

      addLog("success", `✓ Got ${details.length} property details`, "Owner info, sale history, equity data");

      // Merge details with existing leads
      setPrioritizedLeads((prev) => {
        return prev.map((lead) => {
          const detail = details.find((d: any) => String(d.id) === String(lead.id) || String(d.propertyId) === String(lead.id));
          if (detail) {
            return {
              ...lead,
              raw: { ...lead.raw, ...detail },
              // Update with more accurate data
              equity: detail.equityPercent || lead.equity,
              value: detail.estimatedValue || lead.value,
              owner: detail.owner1FirstName && detail.owner1LastName
                ? `${detail.owner1FirstName} ${detail.owner1LastName}`
                : lead.owner,
            };
          }
          return lead;
        });
      });

      toast.success(`Updated ${details.length} leads with details`);
    } catch (err: any) {
      addLog("error", "Failed to fetch details", err.message);
      toast.error(err.message);
    }

    setIsFetchingDetails(false);
  };

  // Handle CSV Upload - Import addresses from PropWire, Zoho, etc.
  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingCsv(true);
    addLog("info", `Uploading CSV: ${file.name}`, "Parsing addresses...");

    try {
      const text = await file.text();
      const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);

      // Get headers from first line
      const headers = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/"/g, ""));
      const addressIdx = headers.findIndex((h) =>
        h.includes("address") || h.includes("street") || h.includes("property")
      );
      const cityIdx = headers.findIndex((h) => h.includes("city"));
      const stateIdx = headers.findIndex((h) => h.includes("state"));
      const zipIdx = headers.findIndex((h) => h.includes("zip") || h.includes("postal"));

      if (addressIdx === -1) {
        throw new Error("CSV must have an address column (address, street, or property_address)");
      }

      const addresses: Array<{ address: string; city?: string; state?: string; zip?: string }> = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/"/g, ""));
        const addr = cols[addressIdx];
        if (addr && addr.length > 5) {
          addresses.push({
            address: addr,
            city: cityIdx >= 0 ? cols[cityIdx] : undefined,
            state: stateIdx >= 0 ? cols[stateIdx] : undefined,
            zip: zipIdx >= 0 ? cols[zipIdx] : undefined,
          });
        }
      }

      addLog("success", `✓ Parsed ${addresses.length} addresses from CSV`);

      if (addresses.length === 0) {
        throw new Error("No valid addresses found in CSV");
      }

      // Create a saved search for this imported list
      const sourceName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
      const newSearch: SavedSearch = {
        id: `import-${sourceName}-${Date.now()}`,
        name: `📁 Imported: ${sourceName} (${addresses.length} properties)`,
        county: addresses[0].city || "Imported",
        state: addresses[0].state || "XX",
        propertyType: "MIXED",
        filters: {
          source: "csv_import",
          filename: file.name,
          addresses: addresses,
        },
        propertyIds: [],
        lastRun: null,
        resultCount: addresses.length,
        status: "pending",
      };

      setSavedSearches((prev) => [...prev, newSearch]);
      addLog("info", `Created search: ${newSearch.name}`, "Click Run to lookup property IDs");

      // Now lookup each address to get property IDs
      addLog("step", "Looking up property IDs...", `Processing ${addresses.length} addresses`);

      const propertyIds: string[] = [];
      const batchSize = 10; // Lookup 10 at a time

      for (let i = 0; i < Math.min(addresses.length, 250); i += batchSize) {
        const batch = addresses.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (addr) => {
            try {
              // Build search query
              const query: any = { size: 1 };
              if (addr.zip) query.zip = addr.zip;
              if (addr.state) query.state = addr.state;
              if (addr.city) query.city = addr.city;

              // Use AutoComplete endpoint to find property by address
              const response = await fetch("/api/property/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...query,
                  address: addr.address,
                  size: 1,
                }),
              });

              if (response.ok) {
                const data = await response.json();
                if (data.data?.[0]?.id) {
                  propertyIds.push(String(data.data[0].id));
                }
              }
            } catch (e) {
              // Skip failed lookups
            }
          })
        );

        addLog("step", `Looked up ${Math.min(i + batchSize, addresses.length)}/${addresses.length}`, `Found ${propertyIds.length} IDs so far`);
        await new Promise((r) => setTimeout(r, 200)); // Rate limit
      }

      // Update the search with found IDs
      setSavedSearches((prev) =>
        prev.map((s) =>
          s.id === newSearch.id
            ? { ...s, propertyIds, status: "complete", lastRun: new Date() }
            : s
        )
      );

      addLog("success", `✓ Found ${propertyIds.length} property IDs`, "Ready to save to Portfolio");
      toast.success(`Imported ${addresses.length} addresses, found ${propertyIds.length} property IDs`);
    } catch (err: any) {
      addLog("error", "CSV Upload Failed", err.message);
      toast.error(err.message);
    } finally {
      setIsUploadingCsv(false);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
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

          {/* Advanced Filters */}
          <div className="border-t border-zinc-800 pt-4 mt-4">
            <Label className="text-zinc-300 mb-3 block">Search Filters</Label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                <Checkbox
                  checked={filterByYearsOwned}
                  onCheckedChange={(checked) => setFilterByYearsOwned(!!checked)}
                  className="border-zinc-600"
                />
                <span>Min {minYearsOwned}+ Years Owned</span>
                <Input
                  type="number"
                  value={minYearsOwned}
                  onChange={(e) => setMinYearsOwned(Number(e.target.value))}
                  className="w-16 h-7 bg-zinc-800 border-zinc-700 text-zinc-200 text-sm px-2"
                  min={0}
                  max={50}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                <Checkbox
                  checked={includeMlsData}
                  onCheckedChange={(checked) => setIncludeMlsData(!!checked)}
                  className="border-zinc-600"
                />
                <span>Include MLS Status (flag listed properties)</span>
              </label>
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              5+ years = more equity | MLS data flags actively listed properties
            </p>
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
              <div className="flex gap-2">
                {/* Hidden CSV input */}
                <input
                  type="file"
                  ref={csvInputRef}
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => csvInputRef.current?.click()}
                  disabled={isUploadingCsv}
                  className="border-zinc-700"
                  title="Import addresses from PropWire, Zoho CSV"
                >
                  {isUploadingCsv ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload CSV
                </Button>
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
                <Button
                  onClick={saveAllToDatabase}
                  disabled={isSavingToDb || savedSearches.filter(s => s.status === "complete").length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                  title="Save to RealEstateAPI Portfolio for daily change tracking"
                >
                  {isSavingToDb ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CloudUpload className="h-4 w-4 mr-2" />
                  )}
                  Save Portfolio
                </Button>
                <Button
                  onClick={fetchBatchDetails}
                  disabled={isFetchingDetails || prioritizedLeads.length === 0}
                  variant="outline"
                  className="border-purple-700 text-purple-400 hover:bg-purple-900/20"
                  title="Fetch full details for 250 leads (personalization variables)"
                >
                  {isFetchingDetails ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Get Details
                </Button>
              </div>
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
                  onClick={() => pushToCampaign(prioritizedLeads.filter(l => l.score >= 40 && !l.isMlsActive), "Hot_Leads")}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Push to SMS ({prioritizedLeads.filter(l => l.score >= 40 && !l.isMlsActive).length})
                </Button>
                <Button onClick={exportLeadsToCSV} className="bg-green-600 hover:bg-green-700">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            )}
          </div>
          {/* Filter Toggles */}
          {prioritizedLeads.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-zinc-800">
              <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                <Checkbox
                  checked={hideMlsActive}
                  onCheckedChange={(checked) => setHideMlsActive(!!checked)}
                  className="border-zinc-600"
                />
                <span>Hide MLS Listed ({prioritizedLeads.filter(l => l.isMlsActive).length})</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                <Checkbox
                  checked={showOnlyHot}
                  onCheckedChange={(checked) => setShowOnlyHot(!!checked)}
                  className="border-zinc-600"
                />
                <span>Hot Leads Only (70+)</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                <Checkbox
                  checked={showOnlyExpired}
                  onCheckedChange={(checked) => setShowOnlyExpired(!!checked)}
                  className="border-zinc-600"
                />
                <span>Expired Listings Only ({prioritizedLeads.filter(l => l.isMlsExpired).length})</span>
              </label>
              {/* Stats */}
              <div className="ml-auto flex gap-4 text-xs text-zinc-500">
                <span className="text-green-400">🔥 Hot: {prioritizedLeads.filter(l => l.score >= 70).length}</span>
                <span className="text-orange-400">⚠️ Warm: {prioritizedLeads.filter(l => l.score >= 40 && l.score < 70).length}</span>
                <span className="text-blue-400">📋 MLS Listed: {prioritizedLeads.filter(l => l.isMlsActive).length}</span>
                <span className="text-purple-400">⏰ Expired: {prioritizedLeads.filter(l => l.isMlsExpired).length}</span>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {prioritizedLeads.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No leads yet. Create and run saved searches to generate prioritized leads.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {prioritizedLeads
                .filter(lead => {
                  // Apply filters
                  if (hideMlsActive && lead.isMlsActive) return false;
                  if (showOnlyHot && lead.score < 70) return false;
                  if (showOnlyExpired && !lead.isMlsExpired) return false;
                  return true;
                })
                .slice(0, 50)
                .map((lead, i) => (
                <div
                  key={lead.id}
                  className={`flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border ${
                    lead.isMlsActive
                      ? "border-blue-700/50 opacity-60"
                      : lead.isMlsExpired
                      ? "border-purple-500 border-2"
                      : "border-zinc-700"
                  }`}
                >
                  <div className={`flex items-center justify-center w-12 h-12 rounded-lg font-bold ${getScoreColor(lead.score)}`}>
                    {lead.score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-zinc-200 truncate">{lead.address}</p>
                      {/* MLS Status Badges - Most Important */}
                      {lead.isMlsActive && (
                        <Badge className="bg-blue-900/50 text-blue-300 text-xs border border-blue-500">📋 MLS Listed</Badge>
                      )}
                      {lead.isMlsExpired && (
                        <Badge className="bg-purple-900/50 text-purple-300 text-xs border border-purple-500">⏰ EXPIRED</Badge>
                      )}
                      {lead.hasDeedChange && (
                        <Badge className="bg-yellow-900/50 text-yellow-300 text-xs">📝 Recent Deed</Badge>
                      )}
                      {lead.isAbsentee && (
                        <Badge className="bg-purple-900/50 text-purple-300 text-xs">Absentee</Badge>
                      )}
                      {lead.isPreForeclosure && (
                        <Badge className="bg-red-900/50 text-red-300 text-xs">Pre-Foreclosure</Badge>
                      )}
                      {lead.isTaxLien && (
                        <Badge className="bg-orange-900/50 text-orange-300 text-xs">Tax Lien</Badge>
                      )}
                      {lead.isVacant && (
                        <Badge className="bg-gray-700/50 text-gray-300 text-xs">Vacant</Badge>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">
                      {lead.city}, {lead.state} | {lead.county} County | {lead.propertyType}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {lead.yearsOwned !== null && lead.yearsOwned >= 5 && (
                      <Badge className="bg-cyan-900/50 text-cyan-300 border-cyan-700">
                        {lead.yearsOwned}+ yrs
                      </Badge>
                    )}
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
