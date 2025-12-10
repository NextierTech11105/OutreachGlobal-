"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search, Download, Loader2, MapPin, Home, Phone, Mail, UserSearch,
  Filter, Save, FolderOpen, Layers, AlertTriangle, Building2, Users,
  DollarSign, TrendingUp, Ban, X, ChevronLeft, ChevronRight,
  Plus, MessageSquare, Zap, Target, Landmark, RotateCcw, Send, CheckCircle2, Wand2,
  Map, List, FileText, Calendar, PhoneCall, MailPlus, Clock, Eye, Play
} from "lucide-react";
import { toast } from "sonner";
import { CampaignSmsConfigurator } from "@/components/campaign-sms-configurator";
import { PropertyMap, PropertyMarker } from "@/components/property-map/property-map";
import { sf, sfd } from "@/lib/utils/safe-format";

// ============ MOTIVATED SELLER LEAD TYPES (PropWire-style) ============
const LEAD_TYPES = [
  { id: "pre_foreclosure", label: "Pre-Foreclosure", icon: AlertTriangle, color: "text-red-500", description: "Behind on mortgage" },
  { id: "foreclosure", label: "Foreclosure", icon: AlertTriangle, color: "text-red-600", description: "Bank-owned" },
  { id: "auction", label: "Auction", icon: TrendingUp, color: "text-orange-500", description: "Going to auction" },
  { id: "tax_lien", label: "Tax Lien", icon: DollarSign, color: "text-amber-500", description: "Delinquent taxes" },
  { id: "absentee_owner", label: "Absentee Owner", icon: Users, color: "text-blue-500", description: "Owner lives elsewhere" },
  { id: "vacant", label: "Vacant", icon: Home, color: "text-purple-500", description: "Unoccupied property" },
  { id: "high_equity", label: "High Equity", icon: TrendingUp, color: "text-green-500", description: "50%+ equity" },
  { id: "free_clear", label: "Free & Clear", icon: DollarSign, color: "text-emerald-500", description: "No mortgage" },
  { id: "inherited", label: "Inherited/Probate", icon: Users, color: "text-indigo-500", description: "Recently inherited" },
  { id: "death", label: "Death in Family", icon: Users, color: "text-slate-500", description: "Recent death record" },
  { id: "divorce", label: "Divorce", icon: Users, color: "text-pink-500", description: "Divorce filing" },
  { id: "tired_landlord", label: "Tired Landlord", icon: Building2, color: "text-cyan-500", description: "Long-term rentals" },
  { id: "corporate_owned", label: "Corporate Owned", icon: Building2, color: "text-gray-500", description: "LLC/Corp ownership" },
  { id: "cash_buyer", label: "Cash Buyer", icon: DollarSign, color: "text-yellow-500", description: "Previous cash purchase" },
  { id: "investor_buyer", label: "Investor", icon: Target, color: "text-teal-500", description: "Known investor" },
  { id: "code_violation", label: "Code Violation", icon: Ban, color: "text-rose-500", description: "City violations" },
  { id: "out_of_state", label: "Out of State", icon: MapPin, color: "text-violet-500", description: "Owner in different state" },
  { id: "reverse_mortgage", label: "Reverse Mortgage", icon: RotateCcw, color: "text-orange-600", description: "Loan type: REV" },
  { id: "compulink_lender", label: "Compulink PHH", icon: Landmark, color: "text-sky-600", description: "Lender: Compulink PHH Reverse" },
];

const US_STATES = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" }, { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" }, { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" }, { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" }, { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" }, { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" }, { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" }, { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" }, { value: "MN", label: "Minnesota" }, { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" }, { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" }, { value: "NH", label: "New Hampshire" }, { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" }, { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" }, { value: "OH", label: "Ohio" }, { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" }, { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" }, { value: "SD", label: "South Dakota" }, { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" }, { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" }, { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" }
];

const PROPERTY_TYPES = [
  { value: "SFR", label: "Single Family" },
  { value: "MFR", label: "Multi-Family" },
  { value: "CONDO", label: "Condo" },
  { value: "LAND", label: "Land" },
  { value: "MOBILE", label: "Mobile Home" },
  { value: "OTHER", label: "Other" },
];

// Saved search interface
interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: Date;
  lastRun?: Date;
  resultCount?: number;
}

interface SearchFilters {
  state: string;
  county: string;
  city: string;
  zip: string;
  propertyType: string;
  leadTypes: string[];
  equityMin: number;
  equityMax: number;
  valueMin: string;
  valueMax: string;
  bedsMin: string;
  bathsMin: string;
  sqftMin: string;
  sqftMax: string;
  yearBuiltMin: string;
  yearBuiltMax: string;
  // Portfolio/Linked Properties Filters (for whale investors)
  propertiesOwnedMin: string;
  propertiesOwnedMax: string;
  portfolioValueMin: string;
  portfolioValueMax: string;
  portfolioEquityMin: string;
  portfolioEquityMax: string;
  portfolioMortgageMin: string;
  portfolioMortgageMax: string;
  activeBuyerMin: string;
  activeBuyerMax: string;
  // Sorting
  sortField: string;
  sortDirection: "asc" | "desc" | "";
}

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  county?: string;
  propertyType: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
  estimatedValue?: number;
  equity?: number;
  equityPercent?: number;
  ownerName?: string;
  ownerOccupied?: boolean;
  absenteeOwner?: boolean;
  vacant?: boolean;
  preForeclosure?: boolean;
  // Skip trace fields
  phones?: string[];
  emails?: string[];
  mailingAddress?: string;
  skipTraced?: boolean;
  // Lead type flags
  leadTypes?: string[];
  // Location coordinates for map
  lat?: number;
  lng?: number;
}

// Default filters
const DEFAULT_FILTERS: SearchFilters = {
  state: "",
  county: "",
  city: "",
  zip: "",
  propertyType: "",
  leadTypes: [],
  equityMin: 0,
  equityMax: 100,
  valueMin: "",
  valueMax: "",
  bedsMin: "",
  bathsMin: "",
  sqftMin: "",
  sqftMax: "",
  yearBuiltMin: "",
  yearBuiltMax: "",
  // Portfolio/Linked Properties
  propertiesOwnedMin: "",
  propertiesOwnedMax: "",
  portfolioValueMin: "",
  portfolioValueMax: "",
  portfolioEquityMin: "",
  portfolioEquityMax: "",
  portfolioMortgageMin: "",
  portfolioMortgageMax: "",
  activeBuyerMin: "",
  activeBuyerMax: "",
  // Sorting
  sortField: "",
  sortDirection: "",
};

export default function PropertiesPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [skipTracing, setSkipTracing] = useState(false);
  const [skipTraceProgress, setSkipTraceProgress] = useState(0);
  const [results, setResults] = useState<Property[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(100);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mcpLabel, setMcpLabel] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards" | "map">("table");
  const [showFilters, setShowFilters] = useState(true);

  // Enhanced filters with lead types
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [counties, setCounties] = useState<string[]>([]);
  const [loadingCounties, setLoadingCounties] = useState(false);

  // Saved searches
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [searchName, setSearchName] = useState("");

  // Skip trace usage
  const [skipTraceUsage, setSkipTraceUsage] = useState<{
    used: number;
    limit: number;
    remaining: number;
  } | null>(null);

  // Stacked list (selected property tray like PropWire)
  const [showTray, setShowTray] = useState(false);

  // SMS Dialog - Push Button Mode!
  const [showSmsDialog, setShowSmsDialog] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const [smsProgress, setSmsProgress] = useState<{
    sent: number;
    failed: number;
    total: number;
  } | null>(null);

  // Property Detail Panel
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showPropertyDetail, setShowPropertyDetail] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [propertyDetail, setPropertyDetail] = useState<Record<string, unknown> | null>(null);

  // Schedule Dialog (Kiosk)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleType, setScheduleType] = useState<"sms" | "call" | "email">("sms");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleMessage, setScheduleMessage] = useState("");
  const [schedulingProperty, setSchedulingProperty] = useState<Property | null>(null);

  // ============ BUCKET DATALAKE MANAGEMENT ============
  // Save 800K+ IDs, enrich 2K at a time on demand
  const [showBucketDialog, setShowBucketDialog] = useState(false);
  const [bucketName, setBucketName] = useState("");
  const [buckets, setBuckets] = useState<Array<{
    id: string;
    name: string;
    description?: string;
    totalLeads: number;
    enrichedLeads: number;
    enrichmentStatus: string;
    createdAt: string;
  }>>([]);
  const [showBucketList, setShowBucketList] = useState(false);
  const [savingToBucket, setSavingToBucket] = useState(false);
  const [processingBucket, setProcessingBucket] = useState<string | null>(null);
  const [distressSignals, setDistressSignals] = useState<{
    preForeclosure: number;
    taxLien: number;
    highEquity: number;
    vacant: number;
    absenteeOwner: number;
    reverseMortgage: number;
  } | null>(null);

  // Apollo Enrichment State
  const [apolloEnriching, setApolloEnriching] = useState<string | null>(null);

  // Legacy state aliases for backward compatibility
  const state = filters.state;
  const city = filters.city;
  const zip = filters.zip;
  const propertyType = filters.propertyType;

  // Fetch skip trace usage on mount
  useEffect(() => {
    fetch("/api/skip-trace")
      .then((r) => r.json())
      .then((data) => setSkipTraceUsage(data))
      .catch(console.error);
  }, []);

  // Fetch buckets on mount
  useEffect(() => {
    fetch("/api/property/bucket")
      .then((r) => r.json())
      .then((data) => {
        if (data.buckets) setBuckets(data.buckets);
      })
      .catch(console.error);
  }, []);

  // Save IDs to Bucket (datalake) - economical, no enrichment yet
  const saveIdsToBucket = useCallback(async () => {
    if (!bucketName.trim()) {
      toast.error("Enter a name for this bucket");
      return;
    }

    if (results.length === 0) {
      toast.error("No properties to save");
      return;
    }

    setSavingToBucket(true);
    try {
      // Extract just the IDs - economical storage
      const propertyIds = results.map((p) => p.id);

      const response = await fetch("/api/property/bucket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: bucketName,
          description: `${propertyIds.length} ${filters.state || ""} ${filters.leadTypes.join(", ") || "properties"}`,
          filters: { ...filters },
          propertyIds,
          signals: distressSignals,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Saved ${propertyIds.length} IDs to "${bucketName}" bucket`);
      setBucketName("");
      setShowBucketDialog(false);

      // Refresh buckets list
      const bucketsRes = await fetch("/api/property/bucket");
      const bucketsData = await bucketsRes.json();
      if (bucketsData.buckets) setBuckets(bucketsData.buckets);
    } catch (error) {
      console.error("Save to bucket failed:", error);
      toast.error("Failed to save to bucket");
    } finally {
      setSavingToBucket(false);
    }
  }, [bucketName, results, filters, distressSignals]);

  // Process bucket - enrich 2K at a time
  const processBucket = useCallback(async (bucketId: string, limit?: number) => {
    setProcessingBucket(bucketId);
    toast.info(`Processing bucket... Enriching up to ${limit || 2000} leads`);

    try {
      const response = await fetch("/api/property/bucket/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucketId,
          limit: limit || 2000,
          skipTrace: true,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success(
        `Enriched ${data.stats.successful}/${data.stats.processed} leads. ${data.stats.withPhones} with phones. ${data.stats.remaining} remaining.`
      );

      // Refresh buckets
      const bucketsRes = await fetch("/api/property/bucket");
      const bucketsData = await bucketsRes.json();
      if (bucketsData.buckets) setBuckets(bucketsData.buckets);

      // If leads with phones, offer SMS campaign
      if (data.stats.withPhones > 0) {
        setTimeout(() => {
          if (confirm(`${data.stats.withPhones} leads have phone numbers. Launch SMS Campaign?`)) {
            window.location.href = `/t/default/campaigns/new?bucketId=${bucketId}`;
          }
        }, 500);
      }
    } catch (error) {
      console.error("Process bucket failed:", error);
      toast.error("Failed to process bucket");
    } finally {
      setProcessingBucket(null);
    }
  }, []);

  // Delete bucket
  const deleteBucket = useCallback(async (bucketId: string) => {
    if (!confirm("Delete this bucket and all its leads?")) return;

    try {
      const response = await fetch(`/api/property/bucket?id=${bucketId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Deleted bucket "${data.deleted.name}"`);

      // Refresh buckets
      setBuckets((prev) => prev.filter((b) => b.id !== bucketId));
    } catch (error) {
      console.error("Delete bucket failed:", error);
      toast.error("Failed to delete bucket");
    }
  }, []);

  // Apollo Enrich Bucket - Bulk enrich leads with Apollo.io (10 per request)
  const apolloEnrichBucket = useCallback(async (bucketId: string, limit?: number) => {
    setApolloEnriching(bucketId);
    const enrichLimit = limit || 50; // Default to 50 for Apollo (5 API calls of 10)
    toast.info(`Apollo enriching bucket... (${enrichLimit} leads)`);

    try {
      // First, get leads from the bucket that need Apollo enrichment
      const bucketRes = await fetch(`/api/property/bucket?id=${bucketId}`);
      const bucketData = await bucketRes.json();

      if (!bucketData.bucket) {
        toast.error("Bucket not found");
        return;
      }

      // Get lead IDs from bucket (enriched ones that may not have Apollo data)
      const leadsRes = await fetch(`/api/property/bucket/leads?bucketId=${bucketId}&limit=${enrichLimit}&needsApollo=true`);
      const leadsData = await leadsRes.json();

      if (!leadsData.leads || leadsData.leads.length === 0) {
        toast.warning("No leads need Apollo enrichment");
        setApolloEnriching(null);
        return;
      }

      const leadIds = leadsData.leads.map((l: { id: string }) => l.id);

      // Call Apollo bulk enrich
      const response = await fetch("/api/apollo/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds,
          type: "people",
          revealEmails: true,
          revealPhones: true,
          updateDb: true,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success(
        `Apollo enriched ${data.results.enriched}/${data.results.total}. ` +
        `${data.results.withPhones} phones, ${data.results.withEmails} emails.`
      );

      // Refresh buckets
      const bucketsRes = await fetch("/api/property/bucket");
      const bucketsRefresh = await bucketsRes.json();
      if (bucketsRefresh.buckets) setBuckets(bucketsRefresh.buckets);
    } catch (error) {
      console.error("Apollo enrich failed:", error);
      toast.error("Apollo enrichment failed");
    } finally {
      setApolloEnriching(null);
    }
  }, []);

  // Fetch counties when state changes
  useEffect(() => {
    if (!filters.state || filters.state === "__all__") {
      setCounties([]);
      return;
    }
    setLoadingCounties(true);
    fetch("/api/property/autocomplete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: filters.state, type: "county" }),
    })
      .then((r) => r.json())
      .then((data) => setCounties(data.counties || []))
      .catch(() => setCounties([]))
      .finally(() => setLoadingCounties(false));
  }, [filters.state]);

  // Load saved searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("nextier_saved_searches");
    if (saved) {
      try {
        setSavedSearches(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Toggle lead type filter
  const toggleLeadType = (id: string) => {
    setFilters((prev) => ({
      ...prev,
      leadTypes: prev.leadTypes.includes(id)
        ? prev.leadTypes.filter((t) => t !== id)
        : [...prev.leadTypes, id],
    }));
  };

  // Update filter helper
  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setCurrentPage(0);
  };

  // Reset page when filters change
  const updateFilterAndResetPage = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(0);
  };

  // Save current search
  const saveCurrentSearch = () => {
    if (!searchName.trim()) {
      toast.error("Enter a name for this search");
      return;
    }
    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name: searchName,
      filters: { ...filters },
      createdAt: new Date(),
      resultCount: totalCount,
    };
    const updated = [newSearch, ...savedSearches];
    setSavedSearches(updated);
    localStorage.setItem("nextier_saved_searches", JSON.stringify(updated));
    setSearchName("");
    toast.success(`Saved search "${searchName}"`);
  };

  // Load saved search
  const loadSavedSearch = (search: SavedSearch) => {
    setFilters(search.filters);
    setShowSavedSearches(false);
    toast.info(`Loaded "${search.name}"`);
  };

  // Delete saved search
  const deleteSavedSearch = (id: string) => {
    const updated = savedSearches.filter((s) => s.id !== id);
    setSavedSearches(updated);
    localStorage.setItem("nextier_saved_searches", JSON.stringify(updated));
    toast.success("Search deleted");
  };

  // Load from MCP Command Center if coming from there
  useEffect(() => {
    const fromMcp = searchParams.get("from") === "mcp";
    if (!fromMcp) return;

    const stored = localStorage.getItem("mcpPropertyIds");
    if (!stored) return;

    try {
      const data = JSON.parse(stored);
      if (data.ids && data.ids.length > 0) {
        setMcpLabel(data.label);
        setTotalCount(data.totalCount || data.ids.length);
        toast.info(`Loading ${data.ids.length} properties from "${data.label}"...`);

        // Fetch property details for the IDs
        loadPropertiesFromIds(data.ids);

        // Clear the stored data
        localStorage.removeItem("mcpPropertyIds");
      }
    } catch (err) {
      console.error("Failed to load MCP data:", err);
    }
  }, [searchParams]);

  // Load properties by IDs (uses skip-trace endpoint which fetches details)
  const loadPropertiesFromIds = async (ids: string[]) => {
    setLoading(true);
    try {
      const response = await fetch("/api/skip-trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      // Map skip trace results to Property format
      const properties: Property[] = (data.results || []).map((r: {
        id: string;
        propertyId?: string;
        address?: string;
        ownerName?: string;
        phones?: string[];
        emails?: string[];
        success?: boolean;
      }) => ({
        id: r.id || r.propertyId || "",
        address: r.address || "",
        city: "",
        state: "",
        zip: "",
        propertyType: "Unknown",
        ownerName: r.ownerName,
        phones: r.phones || [],
        emails: r.emails || [],
        skipTraced: r.success,
      }));

      setResults(properties);
      toast.success(`Loaded ${properties.length} properties with contact info`);
    } catch (error) {
      console.error("Failed to load properties:", error);
      toast.error("Failed to load properties");
    } finally {
      setLoading(false);
    }
  };

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map(p => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Skip trace handler - batches 250 at a time until 5,000 daily limit
  const BATCH_SIZE = 250;
  const DAILY_LIMIT = 5000;

  const handleSkipTrace = useCallback(async () => {
    if (selectedIds.size === 0) {
      toast.error("Select properties to skip trace");
      return;
    }

    setSkipTracing(true);
    setSkipTraceProgress(0);

    try {
      const allIds = Array.from(selectedIds);
      const totalToProcess = Math.min(allIds.length, DAILY_LIMIT);
      let processedCount = 0;
      let totalWithPhones = 0;
      let totalWithEmails = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let allSkipResults: any[] = [];

      // Process in batches of 250
      const numBatches = Math.ceil(totalToProcess / BATCH_SIZE);
      toast.info(`Skip tracing ${totalToProcess} properties in ${numBatches} batches...`);

      for (let batchIndex = 0; batchIndex < numBatches; batchIndex++) {
        const startIdx = batchIndex * BATCH_SIZE;
        const endIdx = Math.min(startIdx + BATCH_SIZE, totalToProcess);
        const batchIds = allIds.slice(startIdx, endIdx);

        // Update progress
        const progressPercent = Math.round(((batchIndex + 1) / numBatches) * 100);
        setSkipTraceProgress(progressPercent);

        console.log(`[Skip Trace] Batch ${batchIndex + 1}/${numBatches}: ${batchIds.length} IDs`);

        const response = await fetch("/api/skip-trace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: batchIds }),
        });

        const data = await response.json();

        if (data.error === "Daily skip trace limit reached") {
          toast.error(`Daily limit reached! Processed ${processedCount} of ${totalToProcess}`);
          break;
        }

        if (data.error) {
          console.error(`Batch ${batchIndex + 1} error:`, data.error);
          continue;
        }

        // Collect results
        if (data.results) {
          allSkipResults.push(...data.results);
        }

        processedCount += data.stats?.successful || 0;
        totalWithPhones += data.stats?.withPhones || 0;
        totalWithEmails += data.stats?.withEmails || 0;

        // Update skip trace usage display
        if (data.usage) {
          setSkipTraceUsage({
            used: data.usage.today,
            limit: data.usage.limit,
            remaining: data.usage.remaining,
          });
        }

        // Show batch progress
        toast.info(`Batch ${batchIndex + 1}/${numBatches}: ${data.stats?.withPhones || 0} phones found`);

        // Small delay between batches to avoid overwhelming the API
        if (batchIndex < numBatches - 1) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      // Update all results with skip trace data
      setResults((prev) =>
        prev.map((property) => {
          // Match by input.propertyId, input.id, or direct id
          const skipData = allSkipResults.find((r) => {
            const skipId = r.id || r.input?.propertyId || r.input?.id;
            return skipId === property.id;
          });
          if (skipData && skipData.success) {
            // Handle both string[] and {number: string}[] formats from API
            const phones = (skipData.phones || []).map((p: string | { number: string }) =>
              typeof p === 'string' ? p : p.number
            );
            const emails = (skipData.emails || []).map((e: string | { email: string }) =>
              typeof e === 'string' ? e : e.email
            );
            return {
              ...property,
              phones,
              emails,
              ownerName: skipData.ownerName || property.ownerName,
              skipTraced: true,
            };
          }
          return property;
        })
      );

      toast.success(
        `Skip traced ${processedCount} properties - ${totalWithPhones} phones, ${totalWithEmails} emails`
      );
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Skip trace failed:", error);
      toast.error("Skip trace failed");
    } finally {
      setSkipTracing(false);
      setSkipTraceProgress(0);
    }
  }, [selectedIds]);

  const handleSearch = useCallback(async (page?: number) => {
    const searchPage = page ?? currentPage;
    setLoading(true);
    try {
      // Build request body with all filters
      const body: Record<string, unknown> = {};

      // Location
      if (filters.state && filters.state !== "__all__") body.state = filters.state;
      if (filters.county && filters.county !== "__all__") body.county = filters.county;
      if (filters.city) body.city = filters.city;
      if (filters.zip) body.zip = filters.zip;

      // Property type
      if (filters.propertyType && filters.propertyType !== "__all__") {
        body.property_type = filters.propertyType;
      }

      // Equity filters
      if (filters.equityMin > 0) body.equity_percent_min = filters.equityMin;
      if (filters.equityMax < 100) body.equity_percent_max = filters.equityMax;

      // Value filters
      if (filters.valueMin) body.estimated_value_min = parseInt(filters.valueMin);
      if (filters.valueMax) body.estimated_value_max = parseInt(filters.valueMax);

      // Property characteristics
      if (filters.bedsMin) body.beds_min = parseInt(filters.bedsMin);
      if (filters.bathsMin) body.baths_min = parseInt(filters.bathsMin);
      if (filters.sqftMin) body.building_size_min = parseInt(filters.sqftMin);
      if (filters.sqftMax) body.building_size_max = parseInt(filters.sqftMax);
      if (filters.yearBuiltMin) body.year_built_min = parseInt(filters.yearBuiltMin);
      if (filters.yearBuiltMax) body.year_built_max = parseInt(filters.yearBuiltMax);

      // Lead type filters (motivated seller tags)
      filters.leadTypes.forEach((type) => {
        // Special handling for mortgage/lender flags
        if (type === "reverse_mortgage") {
          body.loan_type_code_first = "REV";
        } else if (type === "compulink_lender") {
          body.lender_name_match = "Compulink PHH Reverse";
          body.flag_compulink = true; // For post-processing
        } else {
          body[type] = true;
        }
      });

      // Portfolio/Linked Properties Filters (find whale investors)
      if (filters.propertiesOwnedMin) body.properties_owned_min = parseInt(filters.propertiesOwnedMin);
      if (filters.propertiesOwnedMax) body.properties_owned_max = parseInt(filters.propertiesOwnedMax);
      if (filters.portfolioValueMin) body.portfolio_value_min = parseInt(filters.portfolioValueMin);
      if (filters.portfolioValueMax) body.portfolio_value_max = parseInt(filters.portfolioValueMax);
      if (filters.portfolioEquityMin) body.portfolio_equity_min = parseInt(filters.portfolioEquityMin);
      if (filters.portfolioEquityMax) body.portfolio_equity_max = parseInt(filters.portfolioEquityMax);
      if (filters.portfolioMortgageMin) body.portfolio_mortgage_balance_min = parseInt(filters.portfolioMortgageMin);
      if (filters.portfolioMortgageMax) body.portfolio_mortgage_balance_max = parseInt(filters.portfolioMortgageMax);
      if (filters.activeBuyerMin) body.portfolio_purchased_last12_min = parseInt(filters.activeBuyerMin);
      if (filters.activeBuyerMax) body.portfolio_purchased_last12_max = parseInt(filters.activeBuyerMax);

      // Sorting
      if (filters.sortField && filters.sortDirection) {
        body.sort = { [filters.sortField]: filters.sortDirection };
      }

      body.size = pageSize;
      if (searchPage > 0) {
        body.resultIndex = searchPage * pageSize;
      }

      const response = await fetch("/api/property/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (data.error) {
        toast.error(data.message || "Search failed");
        console.error("Search error:", data.error);
        return;
      }

      const rawData = data.data || data.properties || data.results || [];
      const properties: Property[] = rawData.map((p: Record<string, unknown>) => {
        const addr = p.address as Record<string, string> | string;

        // Detect lead types from flags
        const detectedLeadTypes: string[] = [];
        if (p.preForeclosure || p.pre_foreclosure) detectedLeadTypes.push("pre_foreclosure");
        if (p.foreclosure) detectedLeadTypes.push("foreclosure");
        if (p.absenteeOwner || p.absentee_owner) detectedLeadTypes.push("absentee_owner");
        if (p.vacant) detectedLeadTypes.push("vacant");
        if (p.taxLien || p.tax_lien) detectedLeadTypes.push("tax_lien");
        if (p.inherited) detectedLeadTypes.push("inherited");
        if (p.highEquity || p.high_equity || (p.equityPercent && Number(p.equityPercent) >= 50)) {
          detectedLeadTypes.push("high_equity");
        }
        if (p.freeClear || p.free_clear) detectedLeadTypes.push("free_clear");
        if (p.corporateOwned || p.corporate_owned) detectedLeadTypes.push("corporate_owned");

        // Mortgage/Lender flags from RealEstateAPI
        const mortgages = (p.currentMortgages || p.mortgages || []) as Array<{ loan_type_code?: string; lender_name?: string; loanType?: string; lenderName?: string }>;
        const hasReverseMortgage = mortgages.some((m) =>
          m.loan_type_code === "REV" || m.loanType === "REV" ||
          (p.loanTypeCode1 === "REV" || p.loan_type_code_first === "REV")
        );
        if (hasReverseMortgage) detectedLeadTypes.push("reverse_mortgage");

        const hasCompulinkLender = mortgages.some((m) =>
          (m.lender_name || m.lenderName || "").toLowerCase().includes("compulink phh reverse")
        ) || (String(p.lenderName1 || p.lender_name_first || "").toLowerCase().includes("compulink phh reverse"));
        if (hasCompulinkLender) detectedLeadTypes.push("compulink_lender");

        return {
          id: String(p.id || p.propertyId || crypto.randomUUID()),
          address: typeof addr === "object" ? addr?.address || addr?.street : String(addr || ""),
          city: typeof addr === "object" ? addr?.city : String(p.city || ""),
          state: typeof addr === "object" ? addr?.state : String(p.state || ""),
          zip: typeof addr === "object" ? addr?.zip : String(p.zip || ""),
          county: typeof addr === "object" ? addr?.county : String(p.county || ""),
          propertyType: String(p.propertyType || p.property_type || "Unknown"),
          beds: Number(p.bedrooms || p.beds) || undefined,
          baths: Number(p.bathrooms || p.baths) || undefined,
          sqft: Number(p.squareFeet || p.sqft || p.livingArea) || undefined,
          yearBuilt: Number(p.yearBuilt || p.year_built) || undefined,
          estimatedValue: Number(p.estimatedValue || p.estimated_value || p.avm) || undefined,
          equity: Number(p.estimatedEquity || p.estimated_equity) || undefined,
          equityPercent: Number(p.equityPercent || p.equity_percent) || undefined,
          ownerName:
            [p.owner1FirstName, p.owner1LastName].filter(Boolean).join(" ") ||
            (p.ownerName as string) ||
            undefined,
          ownerOccupied: Boolean(p.ownerOccupied || p.owner_occupied),
          absenteeOwner: Boolean(p.absenteeOwner || p.absentee_owner),
          vacant: Boolean(p.vacant),
          preForeclosure: Boolean(p.preForeclosure || p.pre_foreclosure),
          leadTypes: detectedLeadTypes,
          // Map coordinates from RealEstateAPI response
          lat: Number(p.latitude || p.lat || (typeof addr === "object" && addr?.latitude)) || undefined,
          lng: Number(p.longitude || p.lng || p.lon || (typeof addr === "object" && addr?.longitude)) || undefined,
        };
      });

      setResults(properties);
      setTotalCount(data.resultCount || data.recordCount || data.total || properties.length);

      // Capture distress signals from response (for bucket saving)
      if (data.signals) {
        setDistressSignals(data.signals);
      }

      // Show tray if we have results
      if (properties.length > 0) {
        setShowTray(true);
      }

      toast.success(`Found ${properties.length} properties`);
    } catch (error) {
      console.error("Search failed:", error);
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, pageSize]);

  // PUSH BUTTON SMS - Send via SignalHouse
  const handleSendSms = useCallback(async (messageOverride?: string) => {
    // Get properties with phone numbers
    const propertiesWithPhones = results.filter(
      (p) => selectedIds.has(p.id) && p.phones && p.phones.length > 0
    );

    if (propertiesWithPhones.length === 0) {
      toast.error("No selected properties have phone numbers. Skip trace first!");
      return;
    }

    const messageToSend = messageOverride || smsMessage;
    if (!messageToSend.trim()) {
      toast.error("Enter a message to send");
      return;
    }

    setSendingSms(true);
    setSmsProgress({ sent: 0, failed: 0, total: propertiesWithPhones.length });

    try {
      // Collect all phone numbers
      const phoneNumbers = propertiesWithPhones.flatMap((p) => p.phones || []);

      console.log(`[SMS] Sending to ${phoneNumbers.length} phone numbers via SignalHouse...`);

      const response = await fetch("/api/signalhouse/bulk-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phoneNumbers,
          message: messageToSend,
          campaignId: `property-blitz-${Date.now()}`,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        setSmsProgress(null);
        return;
      }

      setSmsProgress({
        sent: data.sent || 0,
        failed: data.failed || 0,
        total: phoneNumbers.length,
      });

      toast.success(
        `SMS Blast Complete! ${data.sent} sent, ${data.failed} failed. Daily remaining: ${data.dailyRemaining}`
      );

      // Clear selection and close dialog after success
      setTimeout(() => {
        setShowSmsDialog(false);
        setSmsMessage("");
        setSmsProgress(null);
        setSelectedIds(new Set());
      }, 2000);
    } catch (error) {
      console.error("SMS send failed:", error);
      toast.error("Failed to send SMS");
      setSmsProgress(null);
    } finally {
      setSendingSms(false);
    }
  }, [results, selectedIds, smsMessage]);

  // Run Detail - Fetches full property data with auto skip trace
  const handleRunDetail = useCallback(async (property: Property) => {
    setSelectedProperty(property);
    setShowPropertyDetail(true);
    setLoadingDetail(true);
    setPropertyDetail(null);

    try {
      const response = await fetch("/api/property/detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: property.id, autoSkipTrace: true }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setPropertyDetail(data.property);

      // Update the property in results with skip trace data
      if (data.property) {
        setResults((prev) =>
          prev.map((p) =>
            p.id === property.id
              ? {
                  ...p,
                  phones: data.property.phones || p.phones,
                  emails: data.property.emails || p.emails,
                  ownerName: data.property.ownerName || p.ownerName,
                  skipTraced: true,
                }
              : p
          )
        );
      }

      toast.success("Property detail loaded with skip trace data");
    } catch (error) {
      console.error("Failed to load property detail:", error);
      toast.error("Failed to load property detail");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // Push to valuation page with property data
  const handlePushToValuation = useCallback((property: Property) => {
    const address = `${property.address}, ${property.city}, ${property.state} ${property.zip}`;
    localStorage.setItem("nextier_valuation_property", JSON.stringify({
      address,
      propertyId: property.id,
      ownerName: property.ownerName,
      phones: property.phones,
      emails: property.emails,
      estimatedValue: property.estimatedValue,
      propertyDetail,
    }));
    window.location.href = `/t/default/valuation?address=${encodeURIComponent(address)}`;
  }, [propertyDetail]);

  // 🚀 FULL REPORT - Combined Detail + Skip Trace + Push to Valuation
  // This is the ONE BUTTON that does everything
  const [fullReportLoading, setFullReportLoading] = useState<string | null>(null);
  const [bulkReportProgress, setBulkReportProgress] = useState<{
    processed: number;
    total: number;
    withPhones: number;
    withEmails: number;
  } | null>(null);
  const [bulkReportRunning, setBulkReportRunning] = useState(false);

  // Bulk Full Report - Uses SkipTraceBatchAwait API for up to 1,000 at once
  // Much faster than sequential calls - 2K daily limit, push to SMS queue
  const BULK_API_BATCH_SIZE = 1000; // RealEstateAPI SkipTraceBatchAwait max
  const BULK_DAILY_LIMIT = 2000;

  const handleBulkFullReport = useCallback(async () => {
    if (selectedIds.size === 0) {
      toast.error("Select properties to process");
      return;
    }

    setBulkReportRunning(true);
    setBulkReportProgress({ processed: 0, total: Math.min(selectedIds.size, BULK_DAILY_LIMIT), withPhones: 0, withEmails: 0 });

    try {
      const allIds = Array.from(selectedIds);
      const totalToProcess = Math.min(allIds.length, BULK_DAILY_LIMIT);
      let processedCount = 0;
      let totalWithPhones = 0;
      let totalWithEmails = 0;
      const processedLeads: Array<{
        name: string;
        phone: string;
        email: string;
        address: string;
        propertyValue: number;
        equity: number;
        propertyId: string;
      }> = [];

      // Get the properties to process
      const propertiesToProcess = results.filter(p => selectedIds.has(p.id)).slice(0, totalToProcess);

      // Process in batches of 1,000 using BULK API (SkipTraceBatchAwait)
      const batchSize = BULK_API_BATCH_SIZE;
      const numBatches = Math.ceil(propertiesToProcess.length / batchSize);

      toast.info(`🚀 BULK Skip Trace: ${totalToProcess} properties in ${numBatches} batch(es) of up to ${batchSize}...`);

      for (let batchIndex = 0; batchIndex < numBatches; batchIndex++) {
        const startIdx = batchIndex * batchSize;
        const endIdx = Math.min(startIdx + batchSize, propertiesToProcess.length);
        const batchProperties = propertiesToProcess.slice(startIdx, endIdx);
        const batchIds = batchProperties.map(p => p.id);

        console.log(`[Bulk Skip Trace] Batch ${batchIndex + 1}/${numBatches}: ${batchIds.length} properties via SkipTraceBatchAwait`);

        // BULK skip trace call using SkipTraceBatchAwait API
        const response = await fetch("/api/skip-trace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: batchIds,
            bulk: true, // Use SkipTraceBatchAwait API for much faster processing
          }),
        });

        const data = await response.json();

        if (data.error === "Daily skip trace limit reached") {
          toast.error(`Daily limit reached! Processed ${processedCount} of ${totalToProcess}`);
          break;
        }

        if (data.error) {
          console.error(`Batch ${batchIndex + 1} error:`, data.error);
          continue;
        }

        // Process results and collect leads with phones
        if (data.results) {
          for (const skipResult of data.results) {
            if (skipResult.success) {
              processedCount++;
              const phones = (skipResult.phones || []).map((p: string | { number: string }) =>
                typeof p === 'string' ? p : p.number
              );
              const emails = (skipResult.emails || []).map((e: string | { email: string }) =>
                typeof e === 'string' ? e : e.email
              );

              if (phones.length > 0) totalWithPhones++;
              if (emails.length > 0) totalWithEmails++;

              // Find original property
              const originalProperty = batchProperties.find(p => p.id === skipResult.id || p.id === skipResult.input?.propertyId);

              // Add to leads if has phone
              if (phones.length > 0 && originalProperty) {
                processedLeads.push({
                  name: skipResult.ownerName || originalProperty.ownerName || "Property Owner",
                  phone: phones[0],
                  email: emails[0] || "",
                  address: `${originalProperty.address}, ${originalProperty.city}, ${originalProperty.state} ${originalProperty.zip}`,
                  propertyValue: originalProperty.estimatedValue || 0,
                  equity: originalProperty.equity || 0,
                  propertyId: originalProperty.id,
                });
              }

              // Update property in results
              setResults((prev) =>
                prev.map((p) => {
                  if (p.id === skipResult.id || p.id === skipResult.input?.propertyId) {
                    return {
                      ...p,
                      phones,
                      emails,
                      ownerName: skipResult.ownerName || p.ownerName,
                      skipTraced: true,
                    };
                  }
                  return p;
                })
              );
            }
          }
        }

        // Update progress
        setBulkReportProgress({
          processed: processedCount,
          total: totalToProcess,
          withPhones: totalWithPhones,
          withEmails: totalWithEmails,
        });

        // Show batch progress (Bulk API mode)
        const apiMode = data.mode === "bulk" ? "🚀 Bulk API" : "Standard";
        toast.info(`${apiMode} Batch ${batchIndex + 1}/${numBatches}: ${data.stats?.withPhones || 0} phones, ${data.stats?.withEmails || 0} emails`);

        // Small delay between batches
        if (batchIndex < numBatches - 1) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      // Push all leads with phones to SMS Campaign Queue
      if (processedLeads.length > 0) {
        localStorage.setItem("nextier_sms_queue", JSON.stringify({
          leads: processedLeads,
          source: "bulk-full-report",
          createdAt: new Date().toISOString(),
          stats: {
            processed: processedCount,
            withPhones: totalWithPhones,
            withEmails: totalWithEmails,
          },
        }));

        toast.success(
          `🚀 Bulk Skip Trace Complete! ${processedCount} processed, ${totalWithPhones} phones, ${totalWithEmails} emails. ${processedLeads.length} leads pushed to SMS Queue!`
        );

        // Offer to go to SMS Campaign
        setTimeout(() => {
          if (confirm(`${processedLeads.length} leads are ready for Initial SMS Campaign. Go to Campaign Setup?`)) {
            window.location.href = "/t/default/campaigns/new?from=bulk-report&queue=sms";
          }
        }, 1000);
      } else {
        toast.warning(`Bulk Skip Trace Complete. ${processedCount} processed but no phone numbers found.`);
      }

      setSelectedIds(new Set());
    } catch (error) {
      console.error("Bulk Skip Trace failed:", error);
      toast.error("Bulk Skip Trace failed");
    } finally {
      setBulkReportRunning(false);
      setBulkReportProgress(null);
    }
  }, [selectedIds, results]);

  const handleFullReport = useCallback(async (property: Property) => {
    setFullReportLoading(property.id);
    toast.info(`Running Full Report for ${property.address}...`);

    try {
      // Step 1: Fetch property detail with auto skip trace
      const response = await fetch("/api/property/detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: property.id, autoSkipTrace: true }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        setFullReportLoading(null);
        return;
      }

      const detail = data.property;

      // Update the property in results with skip trace data
      if (detail) {
        setResults((prev) =>
          prev.map((p) =>
            p.id === property.id
              ? {
                  ...p,
                  phones: detail.phones || p.phones,
                  emails: detail.emails || p.emails,
                  ownerName: detail.ownerName || p.ownerName,
                  skipTraced: true,
                }
              : p
          )
        );
      }

      // Step 2: Store data and redirect to Valuation page
      const address = `${property.address}, ${property.city}, ${property.state} ${property.zip}`;
      localStorage.setItem("nextier_valuation_property", JSON.stringify({
        address,
        propertyId: property.id,
        ownerName: detail?.ownerName || property.ownerName,
        phones: detail?.phones || property.phones,
        emails: detail?.emails || property.emails,
        estimatedValue: detail?.estimatedValue || property.estimatedValue,
        equity: detail?.equity || property.equity,
        beds: detail?.beds || property.beds,
        baths: detail?.baths || property.baths,
        sqft: detail?.sqft || property.sqft,
        yearBuilt: detail?.yearBuilt || property.yearBuilt,
        propertyType: detail?.propertyType || property.propertyType,
        propertyDetail: detail,
      }));

      toast.success("Full Report complete! Redirecting to Valuation...");

      // Short delay to show success message, then redirect
      setTimeout(() => {
        window.location.href = `/t/default/valuation?address=${encodeURIComponent(address)}`;
      }, 500);

    } catch (error) {
      console.error("Full Report failed:", error);
      toast.error("Failed to run Full Report");
      setFullReportLoading(null);
    }
  }, []);

  // Schedule action for a property (SMS, Call, Email)
  const handleSchedule = useCallback(async () => {
    if (!schedulingProperty) return;

    if (!scheduleDate || !scheduleTime) {
      toast.error("Please select a date and time");
      return;
    }

    const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();

    try {
      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: scheduleType,
          scheduledFor,
          recipient: {
            name: schedulingProperty.ownerName,
            phone: schedulingProperty.phones?.[0],
            email: schedulingProperty.emails?.[0],
            propertyId: schedulingProperty.id,
            propertyAddress: `${schedulingProperty.address}, ${schedulingProperty.city}, ${schedulingProperty.state}`,
          },
          content: {
            message: scheduleMessage,
          },
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`${scheduleType.toUpperCase()} scheduled for ${sfd(scheduledFor)}`);
      setShowScheduleDialog(false);
      setSchedulingProperty(null);
      setScheduleDate("");
      setScheduleTime("");
      setScheduleMessage("");
    } catch (error) {
      console.error("Failed to schedule:", error);
      toast.error("Failed to schedule");
    }
  }, [schedulingProperty, scheduleType, scheduleDate, scheduleTime, scheduleMessage]);

  // Open schedule dialog for a property
  const openScheduleDialog = useCallback((property: Property, type: "sms" | "call" | "email") => {
    setSchedulingProperty(property);
    setScheduleType(type);
    setShowScheduleDialog(true);
  }, []);

  const handleExportCSV = () => {
    const headers = ["Address", "City", "State", "ZIP", "Type", "Beds", "Baths", "SqFt", "Value", "Equity", "Owner", "Phones", "Emails"];
    const rows = results.map((p) => [
      p.address, p.city, p.state, p.zip, p.propertyType,
      p.beds || "", p.baths || "", p.sqft || "", p.estimatedValue || "", p.equity || "", p.ownerName || "",
      p.phones?.join("; ") || "", p.emails?.join("; ") || ""
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `properties-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const formatCurrency = (value?: number) => {
    if (!value) return "-";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  };

  // Count active filters
  const activeFilterCount =
    filters.leadTypes.length +
    (filters.state && filters.state !== "__all__" ? 1 : 0) +
    (filters.county && filters.county !== "__all__" ? 1 : 0) +
    (filters.city ? 1 : 0) +
    (filters.zip ? 1 : 0) +
    (filters.propertyType && filters.propertyType !== "__all__" ? 1 : 0) +
    (filters.equityMin > 0 ? 1 : 0) +
    (filters.equityMax < 100 ? 1 : 0) +
    (filters.valueMin ? 1 : 0) +
    (filters.valueMax ? 1 : 0) +
    (filters.bedsMin ? 1 : 0) +
    (filters.bathsMin ? 1 : 0);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* PropWire-style Header Bar */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Target className="h-6 w-6 text-purple-300" />
              <h1 className="text-xl font-bold">
                {mcpLabel ? mcpLabel : "Property Search"}
              </h1>
            </div>
            <Separator orientation="vertical" className="h-6 bg-white/20" />
            <div className="flex items-center gap-2 text-sm">
              <Badge className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                <MapPin className="h-3 w-3 mr-1" />
                {sf(totalCount)} properties
              </Badge>
              {selectedIds.size > 0 && (
                <Badge className="bg-green-500/20 text-green-300 border-green-400/30">
                  {selectedIds.size} selected
                </Badge>
              )}
              {skipTraceUsage && (
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30">
                  <Zap className="h-3 w-3 mr-1" />
                  {sf(skipTraceUsage.remaining)} skip traces left
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Saved Searches */}
            <Sheet open={showSavedSearches} onOpenChange={setShowSavedSearches}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Saved ({savedSearches.length})
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px]">
                <SheetHeader>
                  <SheetTitle>Saved Searches</SheetTitle>
                  <SheetDescription>Load or manage your saved property searches</SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-2">
                  {savedSearches.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-8 text-center">
                      No saved searches yet. Search and click Save.
                    </p>
                  ) : (
                    savedSearches.map((search) => (
                      <div
                        key={search.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                        onClick={() => loadSavedSearch(search)}
                      >
                        <div>
                          <div className="font-medium">{search.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {search.filters.leadTypes.length} filters • {sf(search.resultCount) || 0} results
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSavedSearch(search.id);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* Save Current Search */}
            <div className="flex items-center gap-1">
              <Input
                placeholder="Search name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-32 h-8 bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={saveCurrentSearch}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6 bg-white/20" />

            {/* Bucket Datalake Management */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBucketDialog(true)}
              disabled={results.length === 0}
              className="bg-cyan-500/20 border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/30"
            >
              <Layers className="h-4 w-4 mr-2" />
              Save IDs ({results.length})
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBucketList(true)}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Buckets ({buckets.length})
            </Button>

            <Separator orientation="vertical" className="h-6 bg-white/20" />

            {/* Actions */}
            <Button
              size="sm"
              onClick={handleSkipTrace}
              disabled={selectedIds.size === 0 || skipTracing}
              className="bg-green-600 hover:bg-green-700"
            >
              {skipTracing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserSearch className="h-4 w-4 mr-2" />
              )}
              Skip Trace ({selectedIds.size})
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={results.length === 0}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            {/* Map/List Toggle */}
            <div className="flex items-center bg-white/10 rounded-md p-0.5">
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className={viewMode === "table" ? "" : "text-white hover:bg-white/20"}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "map" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("map")}
                className={viewMode === "map" ? "" : "text-white hover:bg-white/20"}
              >
                <Map className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Filters Sidebar */}
        {showFilters && (
          <div className="w-80 border-r bg-muted/30 overflow-y-auto">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-6">
                {/* Location */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </Label>
                    {(filters.state || filters.county || filters.city || filters.zip) && (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => {
                        updateFilter("state", "");
                        updateFilter("county", "");
                        updateFilter("city", "");
                        updateFilter("zip", "");
                      }}>
                        Clear
                      </Button>
                    )}
                  </div>

                  <Select value={filters.state} onValueChange={(v) => updateFilter("state", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Any State</SelectItem>
                      {US_STATES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {filters.state && filters.state !== "__all__" && (
                    <Select
                      value={filters.county}
                      onValueChange={(v) => updateFilter("county", v)}
                      disabled={loadingCounties}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingCounties ? "Loading..." : "Select county"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Any County</SelectItem>
                        {counties.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Input
                    placeholder="City"
                    value={filters.city}
                    onChange={(e) => updateFilter("city", e.target.value)}
                  />

                  <Input
                    placeholder="ZIP Code"
                    value={filters.zip}
                    onChange={(e) => updateFilter("zip", e.target.value)}
                    maxLength={5}
                  />
                </div>

                <Separator />

                {/* Property Type */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Property Type
                  </Label>
                  <Select value={filters.propertyType} onValueChange={(v) => updateFilter("propertyType", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Any Type</SelectItem>
                      {PROPERTY_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Lead Types (Motivated Seller Tags) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Lead Types
                    </Label>
                    {filters.leadTypes.length > 0 && (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => updateFilter("leadTypes", [])}>
                        Clear ({filters.leadTypes.length})
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {LEAD_TYPES.map((type) => {
                      const Icon = type.icon;
                      const isActive = filters.leadTypes.includes(type.id);
                      return (
                        <div
                          key={type.id}
                          onClick={() => toggleLeadType(type.id)}
                          className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all border ${
                            isActive
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-muted border-transparent hover:border-muted-foreground/20"
                          }`}
                        >
                          <Icon className={`h-4 w-4 ${type.color}`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground truncate">{type.description}</div>
                          </div>
                          {isActive && (
                            <Badge variant="default" className="ml-auto">
                              <X className="h-3 w-3" />
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* Equity Range */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Equity: {filters.equityMin}% - {filters.equityMax}%
                  </Label>
                  <div className="px-2">
                    <Slider
                      value={[filters.equityMin, filters.equityMax]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={([min, max]) => {
                        updateFilter("equityMin", min);
                        updateFilter("equityMax", max);
                      }}
                    />
                  </div>
                </div>

                <Separator />

                {/* Value Range */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Property Value
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Min $"
                      type="number"
                      value={filters.valueMin}
                      onChange={(e) => updateFilter("valueMin", e.target.value)}
                    />
                    <Input
                      placeholder="Max $"
                      type="number"
                      value={filters.valueMax}
                      onChange={(e) => updateFilter("valueMax", e.target.value)}
                    />
                  </div>
                </div>

                <Separator />

                {/* Property Details */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Property Details
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Beds</Label>
                      <Input
                        placeholder="Min"
                        type="number"
                        value={filters.bedsMin}
                        onChange={(e) => updateFilter("bedsMin", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Baths</Label>
                      <Input
                        placeholder="Min"
                        type="number"
                        value={filters.bathsMin}
                        onChange={(e) => updateFilter("bathsMin", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Sqft Min</Label>
                      <Input
                        placeholder="Min"
                        type="number"
                        value={filters.sqftMin}
                        onChange={(e) => updateFilter("sqftMin", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Sqft Max</Label>
                      <Input
                        placeholder="Max"
                        type="number"
                        value={filters.sqftMax}
                        onChange={(e) => updateFilter("sqftMax", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Year Min</Label>
                      <Input
                        placeholder="1900"
                        type="number"
                        value={filters.yearBuiltMin}
                        onChange={(e) => updateFilter("yearBuiltMin", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Year Max</Label>
                      <Input
                        placeholder="2024"
                        type="number"
                        value={filters.yearBuiltMax}
                        onChange={(e) => updateFilter("yearBuiltMax", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Search Button */}
                <div className="space-y-2">
                  <Button className="w-full" size="lg" onClick={() => { setCurrentPage(0); handleSearch(0); }} disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Search Properties
                  </Button>
                  <Button variant="outline" className="w-full" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Clear All Filters
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Results Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Map View */}
          {viewMode === "map" && (
            <div className="flex-1 relative">
              <PropertyMap
                properties={results
                  .filter((p) => p.lat && p.lng)
                  .map((p) => ({
                    id: p.id,
                    lat: p.lat!,
                    lng: p.lng!,
                    address: p.address,
                    city: p.city,
                    state: p.state,
                    zip: p.zip,
                    propertyType: p.propertyType,
                    estimatedValue: p.estimatedValue,
                    equity: p.equity,
                    beds: p.beds,
                    baths: p.baths,
                    sqft: p.sqft,
                    ownerName: p.ownerName,
                  }))}
                loading={loading}
                onPropertyClick={(property) => {
                  // Toggle selection when clicking property on map
                  toggleSelect(property.id);
                }}
              />
              {results.length > 0 && results.filter((p) => p.lat && p.lng).length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <div className="text-center p-6">
                    <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium">No coordinates available</p>
                    <p className="text-sm text-muted-foreground">
                      Properties in this search don't have GPS coordinates.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results Table */}
          {viewMode === "table" && (
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={results.length > 0 && selectedIds.size === results.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Lead Types</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Equity</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((property) => (
                  <TableRow
                    key={property.id}
                    className={`${
                      property.skipTraced
                        ? "bg-green-50 dark:bg-green-950/20"
                        : selectedIds.has(property.id)
                        ? "bg-primary/5"
                        : ""
                    }`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(property.id)}
                        onCheckedChange={() => toggleSelect(property.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>{property.address}</div>
                      <div className="text-xs text-muted-foreground">
                        {property.city}, {property.state} {property.zip}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {property.leadTypes?.slice(0, 3).map((type) => {
                          const leadType = LEAD_TYPES.find((t) => t.id === type);
                          if (!leadType) return null;
                          const Icon = leadType.icon;
                          return (
                            <Badge
                              key={type}
                              variant="outline"
                              className={`text-xs ${leadType.color} border-current`}
                            >
                              <Icon className="h-3 w-3 mr-1" />
                              {leadType.label}
                            </Badge>
                          );
                        })}
                        {(property.leadTypes?.length || 0) > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{(property.leadTypes?.length || 0) - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{property.propertyType}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(property.estimatedValue)}</TableCell>
                    <TableCell className="text-right">
                      <div className="text-green-600 font-medium">{formatCurrency(property.equity)}</div>
                      {property.equityPercent && (
                        <div className="text-xs text-muted-foreground">{property.equityPercent}%</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span>{property.ownerName || "-"}</span>
                      </div>
                      {property.absenteeOwner && (
                        <Badge variant="outline" className="text-xs text-blue-500 mt-1">Absentee</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {property.phones && property.phones.length > 0 ? (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-green-600" />
                          <span className="text-sm">{property.phones[0]}</span>
                          {property.phones.length > 1 && (
                            <Badge variant="secondary" className="text-xs">+{property.phones.length - 1}</Badge>
                          )}
                        </div>
                      ) : property.skipTraced ? (
                        <span className="text-muted-foreground text-sm">None</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {property.emails && property.emails.length > 0 ? (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-blue-600" />
                          <span className="text-sm truncate max-w-[120px]">{property.emails[0]}</span>
                          {property.emails.length > 1 && (
                            <Badge variant="secondary" className="text-xs">+{property.emails.length - 1}</Badge>
                          )}
                        </div>
                      ) : property.skipTraced ? (
                        <span className="text-muted-foreground text-sm">None</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    {/* ACTION KIOSK - Full Report + Detail + Schedule SMS/Call/Email */}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {/* 🚀 FULL REPORT - One button does Detail + Skip Trace + Valuation */}
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                          onClick={() => handleFullReport(property)}
                          disabled={fullReportLoading === property.id}
                        >
                          {fullReportLoading === property.id ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Zap className="h-3 w-3 mr-1" />
                          )}
                          Full Report
                        </Button>
                        {/* View Full Detail Page */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => window.location.href = `/t/default/properties/${property.id}`}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Detail
                        </Button>
                        {/* Schedule SMS */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => openScheduleDialog(property, "sms")}
                          disabled={!property.phones || property.phones.length === 0}
                          title="Schedule SMS"
                        >
                          <MessageSquare className="h-3 w-3 text-green-600" />
                        </Button>
                        {/* Schedule Call */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => openScheduleDialog(property, "call")}
                          disabled={!property.phones || property.phones.length === 0}
                          title="Schedule Call"
                        >
                          <PhoneCall className="h-3 w-3 text-blue-600" />
                        </Button>
                        {/* Schedule Email */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => openScheduleDialog(property, "email")}
                          disabled={!property.emails || property.emails.length === 0}
                          title="Schedule Email"
                        >
                          <MailPlus className="h-3 w-3 text-purple-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {results.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Search className="h-12 w-12 opacity-20" />
                        <div className="text-lg font-medium">No properties found</div>
                        <div className="text-sm">Select filters and click Search to find properties</div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          )}

          {/* Pagination Controls */}
          {totalCount > pageSize && (
            <div className="border-t bg-muted/30 px-4 py-2 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {currentPage * pageSize + 1} - {Math.min((currentPage + 1) * pageSize, totalCount)} of {sf(totalCount)} properties
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newPage = Math.max(0, currentPage - 1);
                    setCurrentPage(newPage);
                    handleSearch(newPage);
                  }}
                  disabled={currentPage === 0 || loading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1 px-2">
                  <span className="text-sm font-medium">Page {currentPage + 1}</span>
                  <span className="text-sm text-muted-foreground">of {Math.ceil(totalCount / pageSize)}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newPage = currentPage + 1;
                    setCurrentPage(newPage);
                    handleSearch(newPage);
                  }}
                  disabled={(currentPage + 1) * pageSize >= totalCount || loading}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Bottom Action Bar (PropWire-style tray) */}
          {(selectedIds.size > 0 || results.length > 0) && (
            <div className="border-t bg-muted/50 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="font-medium">{selectedIds.size}</span> of{" "}
                    <span className="font-medium">{results.length}</span> selected
                  </div>
                  {selectedIds.size > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                      Clear Selection
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* 🚀 BULK SKIP TRACE - Uses SkipTraceBatchAwait API (1,000 at once) */}
                  <Button
                    size="sm"
                    onClick={handleBulkFullReport}
                    disabled={selectedIds.size === 0 || bulkReportRunning}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                    title="Uses RealEstateAPI SkipTraceBatchAwait for fast bulk processing (up to 1,000 per batch)"
                  >
                    {bulkReportRunning ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Bulk Skip Trace... {bulkReportProgress && `(${bulkReportProgress.processed}/${bulkReportProgress.total})`}
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Bulk Skip Trace ({Math.min(selectedIds.size, BULK_DAILY_LIMIT)})
                      </>
                    )}
                  </Button>

                  {/* Progress indicator */}
                  {bulkReportProgress && (
                    <Badge className="bg-purple-600/20 text-purple-300 border-purple-400/30">
                      {bulkReportProgress.withPhones} 📱 | {bulkReportProgress.withEmails} ✉️
                    </Badge>
                  )}

                  {/* Batch Skip Trace with progress */}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSkipTrace}
                    disabled={selectedIds.size === 0 || skipTracing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {skipTracing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Skip Tracing... {skipTraceProgress > 0 && `(${skipTraceProgress}%)`}
                      </>
                    ) : (
                      <>
                        <UserSearch className="h-4 w-4 mr-2" />
                        Skip Trace ({Math.min(selectedIds.size, 250)} / batch 250)
                      </>
                    )}
                  </Button>

                  {/* 🚀 SEND SMS NOW - Push Button Mode! */}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      const withPhones = results.filter(
                        (p) => selectedIds.has(p.id) && p.phones && p.phones.length > 0
                      );
                      if (withPhones.length === 0) {
                        toast.error("No selected properties have phone numbers. Skip trace first!");
                        return;
                      }
                      setShowSmsDialog(true);
                    }}
                    disabled={selectedIds.size === 0}
                    className="bg-green-600 hover:bg-green-700 animate-pulse"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    📲 SEND SMS NOW
                  </Button>

                  {/* Push to Campaign */}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      // Get properties with phones
                      const withPhones = results.filter(
                        (p) => selectedIds.has(p.id) && p.phones && p.phones.length > 0
                      );
                      if (withPhones.length === 0) {
                        toast.error("No selected properties have phone numbers. Skip trace first!");
                        return;
                      }
                      // Store in localStorage for campaign creation
                      localStorage.setItem(
                        "nextier_campaign_leads",
                        JSON.stringify({
                          properties: withPhones.map((p) => ({
                            name: p.ownerName || "Property Owner",
                            phone: p.phones?.[0],
                            email: p.emails?.[0],
                            address: `${p.address}, ${p.city}, ${p.state} ${p.zip}`,
                            propertyValue: p.estimatedValue,
                            equity: p.equity,
                          })),
                          source: "property-search",
                          createdAt: new Date().toISOString(),
                        })
                      );
                      toast.success(`${withPhones.length} leads ready for campaign!`);
                      // Navigate to campaign creation
                      window.location.href = "/t/default/campaigns/new?from=properties";
                    }}
                    disabled={selectedIds.size === 0}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Push to Campaign
                  </Button>

                  {/* Create Leads */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const withPhones = results.filter(
                        (p) => selectedIds.has(p.id) && p.phones && p.phones.length > 0
                      );
                      if (withPhones.length === 0) {
                        toast.error("No selected properties have phone numbers. Skip trace first!");
                        return;
                      }
                      localStorage.setItem(
                        "nextier_import_leads",
                        JSON.stringify(
                          withPhones.map((p) => ({
                            name: p.ownerName || "Property Owner",
                            phone: p.phones?.[0],
                            email: p.emails?.[0],
                            address: `${p.address}, ${p.city}, ${p.state} ${p.zip}`,
                            notes: `Property: ${p.propertyType} | Value: ${formatCurrency(p.estimatedValue)} | Equity: ${formatCurrency(p.equity)}`,
                          }))
                        )
                      );
                      toast.success(`${withPhones.length} leads ready for import!`);
                      window.location.href = "/t/default/leads?from=properties";
                    }}
                    disabled={selectedIds.size === 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Leads
                  </Button>

                  {/* Export */}
                  <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={results.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 📲 SMS DIALOG - AI-Powered Campaign Configurator */}
      <Dialog open={showSmsDialog} onOpenChange={setShowSmsDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-purple-600" />
              AI Campaign SMS
            </DialogTitle>
            <DialogDescription>
              Configure tone, intent, and generate AI-powered messages for {results.filter(p => selectedIds.has(p.id) && p.phones?.length).length} recipients
            </DialogDescription>
          </DialogHeader>

          <CampaignSmsConfigurator
            recipientCount={results.filter(p => selectedIds.has(p.id) && p.phones?.length).length}
            campaignType="real_estate"
            leadType={filters.leadTypes[0]}
            onSendSms={async (message) => {
              await handleSendSms(message);
            }}
            onClose={() => setShowSmsDialog(false)}
            sendProgress={smsProgress}
            isSending={sendingSms}
          />
        </DialogContent>
      </Dialog>

      {/* PROPERTY DETAIL SHEET - Full property data with skip trace */}
      <Sheet open={showPropertyDetail} onOpenChange={setShowPropertyDetail}>
        <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Property Detail
            </SheetTitle>
            <SheetDescription>
              {selectedProperty?.address}, {selectedProperty?.city}, {selectedProperty?.state}
            </SheetDescription>
          </SheetHeader>

          {loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading detail + skip trace...</span>
            </div>
          ) : propertyDetail ? (
            <div className="mt-6 space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(Number(propertyDetail.estimatedValue) || selectedProperty?.estimatedValue)}
                    </div>
                    <div className="text-xs text-muted-foreground">Estimated Value</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(Number(propertyDetail.equity) || selectedProperty?.equity)}
                    </div>
                    <div className="text-xs text-muted-foreground">Equity</div>
                  </CardContent>
                </Card>
              </div>

              {/* Owner Info (from skip trace) */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Owner Info (Skip Traced)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{String(propertyDetail.ownerName) || selectedProperty?.ownerName || "Unknown"}</span>
                  </div>
                  {(propertyDetail.phones as string[])?.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phones:</span>
                      <div className="text-right">
                        {(propertyDetail.phones as string[]).map((p, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-green-600" />
                            <span>{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(propertyDetail.emails as string[])?.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Emails:</span>
                      <div className="text-right">
                        {(propertyDetail.emails as string[]).map((e, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-blue-600" />
                            <span className="text-sm">{e}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {propertyDetail.mailingAddress ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mailing:</span>
                      <span className="text-right text-sm">{String(propertyDetail.mailingAddress)}</span>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {/* Property Details */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Property Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-xl font-bold">{Number(propertyDetail.beds) || selectedProperty?.beds || "-"}</div>
                      <div className="text-xs text-muted-foreground">Beds</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">{Number(propertyDetail.baths) || selectedProperty?.baths || "-"}</div>
                      <div className="text-xs text-muted-foreground">Baths</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">{sf(Number(propertyDetail.sqft) || selectedProperty?.sqft) || "-"}</div>
                      <div className="text-xs text-muted-foreground">Sq Ft</div>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span>{String(propertyDetail.propertyType) || selectedProperty?.propertyType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Year Built:</span>
                      <span>{Number(propertyDetail.yearBuilt) || selectedProperty?.yearBuilt || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lot Size:</span>
                      <span>{sf(Number(propertyDetail.lotSize)) || "-"} sq ft</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  onClick={() => selectedProperty && handlePushToValuation(selectedProperty)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Push to Valuation Report
                </Button>
                <Button
                  variant="outline"
                  onClick={() => selectedProperty && openScheduleDialog(selectedProperty, "sms")}
                  disabled={!(propertyDetail.phones as string[])?.length}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => selectedProperty && openScheduleDialog(selectedProperty, "call")}
                  disabled={!(propertyDetail.phones as string[])?.length}
                >
                  <PhoneCall className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              No detail loaded
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* SCHEDULE DIALOG - Kiosk for scheduling SMS/Call/Email */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Schedule {scheduleType.toUpperCase()}
            </DialogTitle>
            <DialogDescription>
              {schedulingProperty?.ownerName || "Property Owner"} - {schedulingProperty?.address}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            </div>

            {/* Recipient Info */}
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                {scheduleType === "email" ? (
                  <>
                    <Mail className="h-4 w-4" />
                    <span>{schedulingProperty?.emails?.[0] || "No email"}</span>
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4" />
                    <span>{schedulingProperty?.phones?.[0] || "No phone"}</span>
                  </>
                )}
              </div>
            </div>

            {/* Message (for SMS/Email) */}
            {scheduleType !== "call" && (
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  placeholder={scheduleType === "sms" ? "Enter SMS message..." : "Enter email content..."}
                  value={scheduleMessage}
                  onChange={(e) => setScheduleMessage(e.target.value)}
                  rows={4}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSchedule} className="bg-blue-600 hover:bg-blue-700">
              <Clock className="h-4 w-4 mr-2" />
              Schedule {scheduleType.toUpperCase()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save to Bucket Dialog */}
      <Dialog open={showBucketDialog} onOpenChange={setShowBucketDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-cyan-500" />
              Save IDs to Bucket
            </DialogTitle>
            <DialogDescription>
              Save {sf(results.length)} property IDs to a bucket for economical batch enrichment.
              No credits used until you process the bucket.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bucket-name">Bucket Name</Label>
              <Input
                id="bucket-name"
                placeholder="e.g., FL Pre-Foreclosure December 2024"
                value={bucketName}
                onChange={(e) => setBucketName(e.target.value)}
              />
            </div>

            {distressSignals && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <Label className="text-sm font-medium">Distress Signals Detected</Label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {distressSignals.preForeclosure > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                      <span>{distressSignals.preForeclosure} Pre-Foreclosure</span>
                    </div>
                  )}
                  {distressSignals.taxLien > 0 && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-3 w-3 text-amber-500" />
                      <span>{distressSignals.taxLien} Tax Lien</span>
                    </div>
                  )}
                  {distressSignals.highEquity > 0 && (
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span>{distressSignals.highEquity} High Equity</span>
                    </div>
                  )}
                  {distressSignals.vacant > 0 && (
                    <div className="flex items-center gap-2">
                      <Home className="h-3 w-3 text-purple-500" />
                      <span>{distressSignals.vacant} Vacant</span>
                    </div>
                  )}
                  {distressSignals.absenteeOwner > 0 && (
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 text-blue-500" />
                      <span>{distressSignals.absenteeOwner} Absentee</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800 rounded-lg p-3 text-sm">
              <p className="font-medium text-cyan-800 dark:text-cyan-200">Economical Pipeline:</p>
              <ul className="mt-1 space-y-1 text-cyan-700 dark:text-cyan-300">
                <li>• Save 800K+ IDs (no credits)</li>
                <li>• Process 2K per campaign block</li>
                <li>• Detail + Skip Trace on demand</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBucketDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveIdsToBucket}
              disabled={!bucketName.trim() || savingToBucket}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {savingToBucket ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Layers className="h-4 w-4 mr-2" />
              )}
              Save {sf(results.length)} IDs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Buckets List Sheet */}
      <Sheet open={showBucketList} onOpenChange={setShowBucketList}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-cyan-500" />
              Property ID Buckets
            </SheetTitle>
            <SheetDescription>
              Your saved property ID buckets. Process to enrich with detail + skip trace.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {buckets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Layers className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No buckets yet.</p>
                <p className="text-sm">Search properties and click "Save IDs" to create a bucket.</p>
              </div>
            ) : (
              buckets.map((bucket) => (
                <Card key={bucket.id} className="overflow-hidden">
                  <CardHeader className="py-3 px-4 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{bucket.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {bucket.description || `${sf(bucket.totalLeads)} properties`}
                        </CardDescription>
                      </div>
                      <Badge
                        className={
                          bucket.enrichmentStatus === "completed"
                            ? "bg-green-100 text-green-800"
                            : bucket.enrichmentStatus === "processing"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {bucket.enrichmentStatus}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">
                            Total: <span className="font-medium text-foreground">{sf(bucket.totalLeads)}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Enriched: <span className="font-medium text-green-600">{sf(bucket.enrichedLeads)}</span>
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created: {new Date(bucket.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => processBucket(bucket.id, 250)}
                          disabled={processingBucket === bucket.id || bucket.enrichedLeads >= bucket.totalLeads}
                          className="text-xs"
                        >
                          {processingBucket === bucket.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>250</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => processBucket(bucket.id, 2000)}
                          disabled={processingBucket === bucket.id || bucket.enrichedLeads >= bucket.totalLeads}
                          className="bg-cyan-600 hover:bg-cyan-700 text-xs"
                        >
                          {processingBucket === bucket.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Play className="h-3 w-3 mr-1" />
                              2K Block
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => apolloEnrichBucket(bucket.id, 50)}
                          disabled={apolloEnriching === bucket.id || bucket.enrichedLeads === 0}
                          className="text-xs border-orange-500 text-orange-600 hover:bg-orange-50"
                          title="Apollo.io bulk enrichment (10 per request)"
                        >
                          {apolloEnriching === bucket.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Wand2 className="h-3 w-3 mr-1" />
                              Apollo
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteBucket(bucket.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {bucket.totalLeads > 0 && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-500 transition-all"
                            style={{ width: `${(bucket.enrichedLeads / bucket.totalLeads) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}



