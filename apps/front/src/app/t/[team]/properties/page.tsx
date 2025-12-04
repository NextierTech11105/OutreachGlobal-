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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search, Download, Loader2, MapPin, Home, Phone, Mail, UserSearch,
  Filter, Save, FolderOpen, Layers, AlertTriangle, Building2, Users,
  DollarSign, Calendar, TrendingUp, Ban, Bell, ChevronRight, X,
  Plus, ArrowRight, MessageSquare, Zap, Target
} from "lucide-react";
import { toast } from "sonner";

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
};

export default function PropertiesPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [skipTracing, setSkipTracing] = useState(false);
  const [skipTraceProgress, setSkipTraceProgress] = useState(0);
  const [results, setResults] = useState<Property[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mcpLabel, setMcpLabel] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
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

  // Skip trace handler
  const handleSkipTrace = useCallback(async () => {
    if (selectedIds.size === 0) {
      toast.error("Select properties to skip trace");
      return;
    }

    setSkipTracing(true);
    try {
      const ids = Array.from(selectedIds);
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

      // Update results with skip trace data
      setResults(prev => prev.map(property => {
        const skipData = data.results?.find((r: { id: string }) => r.id === property.id);
        if (skipData && skipData.success) {
          return {
            ...property,
            phones: skipData.phones || [],
            emails: skipData.emails || [],
            ownerName: skipData.ownerName || property.ownerName,
            skipTraced: true,
          };
        }
        return property;
      }));

      toast.success(`Skip traced ${data.stats?.successful || 0} properties - ${data.stats?.withPhones || 0} phones, ${data.stats?.withEmails || 0} emails`);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Skip trace failed:", error);
      toast.error("Skip trace failed");
    } finally {
      setSkipTracing(false);
    }
  }, [selectedIds]);

  const handleSearch = useCallback(async () => {
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
        body[type] = true;
      });

      body.size = 100;

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
        };
      });

      setResults(properties);
      setTotalCount(data.resultCount || data.recordCount || data.total || properties.length);

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
  }, [filters]);

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
                {totalCount.toLocaleString()} properties
              </Badge>
              {selectedIds.size > 0 && (
                <Badge className="bg-green-500/20 text-green-300 border-green-400/30">
                  {selectedIds.size} selected
                </Badge>
              )}
              {skipTraceUsage && (
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30">
                  <Zap className="h-3 w-3 mr-1" />
                  {skipTraceUsage.remaining.toLocaleString()} skip traces left
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
                            {search.filters.leadTypes.length} filters • {search.resultCount?.toLocaleString() || 0} results
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
                  <Button className="w-full" size="lg" onClick={handleSearch} disabled={loading}>
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
          {/* Results Table */}
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
                  </TableRow>
                ))}
                {results.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16">
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
    </div>
  );
}
