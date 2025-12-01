"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Search,
  Download,
  Save,
  Trash2,
  Tag,
  Loader2,
  Plus,
  X,
  Zap,
  Phone,
  RefreshCw,
  ChevronDown,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  Database,
  Pause,
  Play,
  AlertCircle,
} from "lucide-react";

// All 50 US States
const US_STATES = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" }
];

// Property Types (NO condos/co-ops)
const PROPERTY_TYPES = [
  { code: "SFR", name: "Single Family" },
  { code: "MFR_SMALL", name: "Multi-Family (2-4 Units)" },
  { code: "MFR_LARGE", name: "Multi-Family (5+ Units)" },
  { code: "COMMERCIAL", name: "Commercial" },
  { code: "INDUSTRIAL", name: "Industrial" },
  { code: "RETAIL", name: "Retail" },
  { code: "OFFICE", name: "Office" },
  { code: "LAND", name: "Land/Vacant Lot" },
  { code: "MOBILE", name: "Mobile Home" },
];

// Default tags
const DEFAULT_TAGS = [
  { name: "Hot", color: "bg-red-600" },
  { name: "High Equity", color: "bg-green-600" },
  { name: "Long Ownership", color: "bg-cyan-600" },
  { name: "Pre-Foreclosure", color: "bg-orange-600" },
  { name: "Free & Clear", color: "bg-pink-600" },
  { name: "Follow Up", color: "bg-yellow-600" },
  { name: "Cold", color: "bg-blue-600" },
  { name: "Skip Traced", color: "bg-purple-600" },
  { name: "Validated", color: "bg-emerald-600" },
  { name: "In Campaign", color: "bg-indigo-600" },
];

// Auto-tagging rules based on property data
const AUTO_TAG_RULES = [
  { field: "equityPercent", condition: (v: number) => v >= 50, tag: "High Equity" },
  { field: "yearsOwned", condition: (v: number) => v >= 10, tag: "Long Ownership" },
  { field: "preForeclosure", condition: (v: boolean) => v === true, tag: "Pre-Foreclosure" },
  { field: "freeClear", condition: (v: boolean) => v === true, tag: "Free & Clear" },
  { field: "absenteeOwner", condition: (v: boolean) => v === true, tag: "Absentee" },
  { field: "vacant", condition: (v: boolean) => v === true, tag: "Vacant" },
];

// Fields to flag for full detail enrichment
const ENRICHMENT_FIELDS = [
  "owner1FirstName", "owner1LastName", "owner2FirstName", "owner2LastName",
  "mailAddress", "phone", "email", "estimatedValue", "estimatedEquity",
  "lastSaleDate", "lastSaleAmount", "lenderName", "openMortgageBalance"
];

interface CSVRow {
  [key: string]: string | number | boolean;
}

interface ImportedProperty {
  id: string;
  address?: string;
  city?: string;
  state?: string;
  county?: string;
  zip?: string;
  propertyType?: string;
  equityPercent?: number;
  yearsOwned?: number;
  absenteeOwner?: boolean;
  preForeclosure?: boolean;
  vacant?: boolean;
  freeClear?: boolean;
  autoTags: string[];
  needsEnrichment: string[];
}

interface SearchFilters {
  state: string;
  county: string;
  city: string;
  zip: string;
  propertyType: string;
  minEquity: string;
  minOwnership: string;
  absenteeOwner: boolean;
  preForeclosure: boolean;
  vacant: boolean;
  freeAndClear: boolean;
}

const defaultFilters: SearchFilters = {
  state: "",
  county: "",
  city: "",
  zip: "",
  propertyType: "SFR",
  minEquity: "",
  minOwnership: "",
  absenteeOwner: false,
  preForeclosure: false,
  vacant: false,
  freeAndClear: false,
};

interface BatchInfo {
  batchNumber: number;
  totalBatches: number;
  idsInBatch: number;
  status: "pending" | "fetching" | "complete" | "error";
}

interface EnrichmentJob {
  id: string;
  bucketId: string;
  bucketLabel: string;
  status: "pending" | "processing" | "completed" | "failed" | "paused";
  progress: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    currentBatch: number;
    totalBatches: number;
  };
}

interface EnrichmentUsage {
  date: string;
  count: number;
  remaining: number;
  limit: number;
}

interface SavedSearch {
  id: string;
  label: string;
  tags: string[];
  filters: SearchFilters;
  totalCount: number;
  propertyIds: string[];
  batches: BatchInfo[];
  createdAt: Date;
  notes: string;
  queueStatus?: "pending" | "queued" | "skip_traced" | "validated" | "in_campaign";
  campaignId?: string;
  enrichmentJobId?: string;
  enrichmentStatus?: "pending" | "processing" | "completed" | "failed" | "paused";
}

export function LeadTrackerSimple() {
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [label, setLabel] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [customTags, setCustomTags] = useState<{ name: string; color: string }[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; ids: string[] } | null>(null);

  // County autocomplete
  const [counties, setCounties] = useState<string[]>([]);
  const [countySearch, setCountySearch] = useState("");
  const [showCountyDropdown, setShowCountyDropdown] = useState(false);
  const [loadingCounties, setLoadingCounties] = useState(false);
  const countyRef = useRef<HTMLDivElement>(null);

  // CSV Import
  const [importedData, setImportedData] = useState<ImportedProperty[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importLabel, setImportLabel] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enrichment Queue
  const [enrichmentJobs, setEnrichmentJobs] = useState<Record<string, EnrichmentJob>>({});
  const [enrichmentUsage, setEnrichmentUsage] = useState<EnrichmentUsage | null>(null);
  const [isEnriching, setIsEnriching] = useState<string | null>(null);
  const enrichmentPollRef = useRef<NodeJS.Timeout | null>(null);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("leadBuckets");
    if (saved) {
      setSavedSearches(JSON.parse(saved).map((s: SavedSearch) => ({
        ...s,
        createdAt: new Date(s.createdAt),
      })));
    }
    const tags = localStorage.getItem("customTags");
    if (tags) setCustomTags(JSON.parse(tags));
  }, []);

  useEffect(() => {
    localStorage.setItem("leadBuckets", JSON.stringify(savedSearches));
  }, [savedSearches]);

  useEffect(() => {
    localStorage.setItem("customTags", JSON.stringify(customTags));
  }, [customTags]);

  // Fetch counties when state changes
  useEffect(() => {
    if (!filters.state) {
      setCounties([]);
      return;
    }

    const fetchCounties = async () => {
      setLoadingCounties(true);
      try {
        const res = await fetch("/api/property/autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: filters.state, type: "county" }),
        });
        const data = await res.json();
        if (data.counties) {
          setCounties(data.counties);
        } else if (data.data) {
          setCounties(data.data.map((c: { county?: string; name?: string }) => c.county || c.name || c));
        }
      } catch {
        // Fallback: just allow text input
        setCounties([]);
      } finally {
        setLoadingCounties(false);
      }
    };

    fetchCounties();
  }, [filters.state]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countyRef.current && !countyRef.current.contains(e.target as Node)) {
        setShowCountyDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch enrichment usage on mount
  useEffect(() => {
    fetchEnrichmentUsage();
    return () => {
      if (enrichmentPollRef.current) clearInterval(enrichmentPollRef.current);
    };
  }, []);

  const fetchEnrichmentUsage = async () => {
    try {
      const res = await fetch("/api/enrichment/usage");
      if (res.ok) {
        const data = await res.json();
        setEnrichmentUsage(data);
      }
    } catch {
      // Silently fail - usage display is optional
    }
  };

  // Poll for job status when enriching
  useEffect(() => {
    if (!isEnriching) {
      if (enrichmentPollRef.current) {
        clearInterval(enrichmentPollRef.current);
        enrichmentPollRef.current = null;
      }
      return;
    }

    const pollJob = async () => {
      try {
        const res = await fetch(`/api/enrichment/job/${isEnriching}`);
        if (res.ok) {
          const { job } = await res.json();
          setEnrichmentJobs(prev => ({ ...prev, [job.bucketId]: job }));

          // Update bucket enrichment status
          setSavedSearches(prev =>
            prev.map(s =>
              s.id === job.bucketId
                ? { ...s, enrichmentJobId: job.id, enrichmentStatus: job.status }
                : s
            )
          );

          // If completed or failed, stop polling
          if (job.status === "completed" || job.status === "failed") {
            setIsEnriching(null);
            fetchEnrichmentUsage();
            if (job.status === "completed") {
              toast.success(`Enrichment complete: ${job.progress.successful} properties enriched`);
            } else {
              toast.error(`Enrichment failed: ${job.error || "Unknown error"}`);
            }
          }
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    };

    pollJob();
    enrichmentPollRef.current = setInterval(pollJob, 3000);

    return () => {
      if (enrichmentPollRef.current) clearInterval(enrichmentPollRef.current);
    };
  }, [isEnriching]);

  // Start enrichment for a bucket
  const startEnrichment = async (search: SavedSearch) => {
    if (isEnriching) {
      toast.error("Another enrichment is in progress");
      return;
    }

    if (!enrichmentUsage || enrichmentUsage.remaining === 0) {
      toast.error("Daily enrichment limit reached. Try again tomorrow.");
      return;
    }

    toast.info(`Queueing ${search.propertyIds.length.toLocaleString()} IDs for enrichment...`);

    try {
      const res = await fetch("/api/enrichment/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucketId: search.id,
          bucketLabel: search.label,
          propertyIds: search.propertyIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to queue enrichment");
        return;
      }

      if (data.warning) {
        toast.warning(data.warning);
      }

      setEnrichmentJobs(prev => ({ ...prev, [search.id]: data.job }));
      setSavedSearches(prev =>
        prev.map(s =>
          s.id === search.id
            ? { ...s, enrichmentJobId: data.job.id, enrichmentStatus: data.job.status }
            : s
        )
      );
      setEnrichmentUsage(data.usage);

      toast.success(`Queued ${data.job.progress.total.toLocaleString()} IDs in ${data.job.progress.totalBatches} batches`);

      // Start processing
      await processEnrichmentBatch(data.job.id, search.id);
    } catch (error) {
      toast.error("Failed to start enrichment");
    }
  };

  // Process next batch
  const processEnrichmentBatch = async (jobId: string, bucketId: string) => {
    setIsEnriching(jobId);

    try {
      const res = await fetch("/api/enrichment/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });

      const data = await res.json();

      if (!res.ok && res.status !== 429) {
        toast.error(data.error || "Processing failed");
        setIsEnriching(null);
        return;
      }

      setEnrichmentJobs(prev => ({ ...prev, [bucketId]: data.job }));

      if (data.nextBatchReady) {
        // Continue processing after a short delay
        setTimeout(() => processEnrichmentBatch(jobId, bucketId), 1000);
      } else {
        // Polling will handle status updates
      }
    } catch (error) {
      toast.error("Processing error");
      setIsEnriching(null);
    }
  };

  // Pause/Resume enrichment
  const toggleEnrichmentPause = async (search: SavedSearch) => {
    if (!search.enrichmentJobId) return;

    const job = enrichmentJobs[search.id];
    const action = job?.status === "paused" ? "resume" : "pause";

    try {
      const res = await fetch(`/api/enrichment/job/${search.enrichmentJobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (res.ok) {
        setEnrichmentJobs(prev => ({ ...prev, [search.id]: data.job }));
        setSavedSearches(prev =>
          prev.map(s =>
            s.id === search.id ? { ...s, enrichmentStatus: data.job.status } : s
          )
        );

        if (action === "resume") {
          processEnrichmentBatch(search.enrichmentJobId, search.id);
        } else {
          setIsEnriching(null);
        }

        toast.success(action === "pause" ? "Enrichment paused" : "Enrichment resumed");
      }
    } catch {
      toast.error(`Failed to ${action} enrichment`);
    }
  };

  const filteredCounties = counties.filter(c =>
    c.toLowerCase().includes(countySearch.toLowerCase())
  );

  const selectCounty = (county: string) => {
    updateFilter("county", county);
    setCountySearch(county);
    setShowCountyDropdown(false);
  };

  // Auto-tag a property based on its data
  const autoTagProperty = (row: CSVRow): string[] => {
    const tags: string[] = [];
    for (const rule of AUTO_TAG_RULES) {
      const value = row[rule.field];
      if (value !== undefined && rule.condition(value as never)) {
        tags.push(rule.tag);
      }
    }
    return tags;
  };

  // Check which fields need enrichment
  const checkEnrichmentNeeds = (row: CSVRow): string[] => {
    return ENRICHMENT_FIELDS.filter(field => !row[field] || row[field] === "");
  };

  // Parse CSV file
  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const row: CSVRow = {};
      headers.forEach((header, idx) => {
        const val = values[idx] || "";
        // Try to parse as number or boolean
        if (val === "true") row[header] = true;
        else if (val === "false") row[header] = false;
        else if (!isNaN(Number(val)) && val !== "") row[header] = Number(val);
        else row[header] = val;
      });
      rows.push(row);
    }
    return rows;
  };

  // Handle CSV file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast.error("No data found in CSV");
        return;
      }

      // Map rows to ImportedProperty with auto-tags
      const properties: ImportedProperty[] = rows.map((row, idx) => ({
        id: String(row.id || row.propertyId || row.property_id || `import-${idx}`),
        address: String(row.address || row.street || ""),
        city: String(row.city || ""),
        state: String(row.state || ""),
        county: String(row.county || ""),
        zip: String(row.zip || row.zipCode || ""),
        propertyType: String(row.propertyType || row.property_type || ""),
        equityPercent: Number(row.equityPercent || row.equity_percent || 0),
        yearsOwned: Number(row.yearsOwned || row.years_owned || 0),
        absenteeOwner: row.absenteeOwner === true || row.absentee_owner === true,
        preForeclosure: row.preForeclosure === true || row.pre_foreclosure === true,
        vacant: row.vacant === true,
        freeClear: row.freeClear === true || row.free_clear === true,
        autoTags: autoTagProperty(row),
        needsEnrichment: checkEnrichmentNeeds(row),
      }));

      setImportedData(properties);
      setImportLabel(file.name.replace(/\.csv$/i, ""));
      setShowImportModal(true);
      toast.success(`Loaded ${properties.length} properties from CSV`);
    } catch (error) {
      toast.error("Failed to parse CSV file");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Save imported data as bucket
  const saveImportedBucket = () => {
    if (importedData.length === 0) return;
    if (!importLabel.trim()) {
      toast.error("Enter a label");
      return;
    }

    // Collect all unique auto-tags
    const allAutoTags = [...new Set(importedData.flatMap(p => p.autoTags))];

    const newSearch: SavedSearch = {
      id: `${Date.now()}`,
      label: importLabel.trim(),
      tags: [...selectedTags, ...allAutoTags],
      filters: defaultFilters,
      totalCount: importedData.length,
      propertyIds: importedData.map(p => p.id),
      batches: [{ batchNumber: 1, totalBatches: 1, idsInBatch: importedData.length, status: "complete" }],
      createdAt: new Date(),
      notes: `Imported from CSV. ${importedData.filter(p => p.needsEnrichment.length > 0).length} need enrichment.`,
      queueStatus: "pending",
    };

    setSavedSearches(prev => [newSearch, ...prev]);
    toast.success(`Saved "${importLabel}" with ${importedData.length} IDs`);

    setImportedData([]);
    setImportLabel("");
    setShowImportModal(false);
    setSelectedTags([]);
  };

  const allTags = [...DEFAULT_TAGS, ...customTags];

  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCount(null);
  };

  // COUNT (FREE via RealEstateAPI)
  const getCount = async () => {
    if (!filters.state) {
      toast.error("Select a state");
      return;
    }
    if (!filters.county && !filters.city && !filters.zip) {
      toast.error("Enter county, city, or ZIP");
      return;
    }

    setIsLoading(true);
    setCount(null);

    try {
      const res = await fetch("/api/property/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: filters.state,
          county: filters.county || undefined,
          city: filters.city || undefined,
          zip: filters.zip || undefined,
          property_type: filters.propertyType,
          equity_percent_min: filters.minEquity ? parseInt(filters.minEquity) : undefined,
          ownership_years_min: filters.minOwnership ? parseInt(filters.minOwnership) : undefined,
          absentee_owner: filters.absenteeOwner || undefined,
          pre_foreclosure: filters.preForeclosure || undefined,
          vacant: filters.vacant || undefined,
          free_and_clear: filters.freeAndClear || undefined,
          count: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Search failed");

      setCount(data.resultCount || 0);
      if (!label) {
        const loc = filters.county || filters.city || filters.zip;
        setLabel(`${loc} ${filters.propertyType}`);
      }
      toast.success(`Found ${(data.resultCount || 0).toLocaleString()} properties`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Search failed";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch IDs in batches of 10K
  const fetchBatch = async (offset: number, size: number): Promise<string[]> => {
    const res = await fetch("/api/property/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        state: filters.state,
        county: filters.county || undefined,
        city: filters.city || undefined,
        zip: filters.zip || undefined,
        property_type: filters.propertyType,
        equity_percent_min: filters.minEquity ? parseInt(filters.minEquity) : undefined,
        ownership_years_min: filters.minOwnership ? parseInt(filters.minOwnership) : undefined,
        absentee_owner: filters.absenteeOwner || undefined,
        pre_foreclosure: filters.preForeclosure || undefined,
        vacant: filters.vacant || undefined,
        free_and_clear: filters.freeAndClear || undefined,
        ids_only: true,
        size: size,
        start: offset,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Batch fetch failed");

    return (data.data || []).map((p: { id?: string; propertyId?: string }) =>
      String(p.id || p.propertyId || p)
    );
  };

  // SAVE with IDs - supports batching for >10K
  const saveSearch = async () => {
    if (count === null || count === 0) {
      toast.error("Run count first");
      return;
    }
    if (!label.trim()) {
      toast.error("Enter a label");
      return;
    }

    setIsSaving(true);
    const BATCH_SIZE = 10000;
    const totalBatches = Math.ceil(count / BATCH_SIZE);
    const allIds: string[] = [];
    const batches: BatchInfo[] = [];

    try {
      for (let i = 0; i < totalBatches; i++) {
        const offset = i * BATCH_SIZE;
        const size = Math.min(BATCH_SIZE, count - offset);

        setBatchProgress({ current: i + 1, total: totalBatches, ids: allIds });
        toast.info(`Fetching batch ${i + 1} of ${totalBatches}...`);

        const batchIds = await fetchBatch(offset, size);
        allIds.push(...batchIds);

        batches.push({
          batchNumber: i + 1,
          totalBatches,
          idsInBatch: batchIds.length,
          status: "complete",
        });
      }

      const newSearch: SavedSearch = {
        id: `${Date.now()}`,
        label: label.trim(),
        tags: selectedTags,
        filters: { ...filters },
        totalCount: count,
        propertyIds: allIds,
        batches,
        createdAt: new Date(),
        notes: notes.trim(),
        queueStatus: "pending",
      };

      setSavedSearches(prev => [newSearch, ...prev]);
      toast.success(`Saved "${label}" with ${allIds.length.toLocaleString()} IDs in ${totalBatches} batch(es)`);

      setCount(null);
      setLabel("");
      setSelectedTags([]);
      setNotes("");
      setBatchProgress(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Save failed";
      toast.error(message);
    } finally {
      setIsSaving(false);
      setBatchProgress(null);
    }
  };

  // Push to Leads Queue for Skip Tracing
  const pushToQueue = async (search: SavedSearch) => {
    toast.info(`Queueing ${search.propertyIds.length.toLocaleString()} IDs for skip tracing...`);

    // Update status
    setSavedSearches(prev =>
      prev.map(s =>
        s.id === search.id
          ? { ...s, queueStatus: "queued" as const, tags: [...new Set([...s.tags, "Skip Traced"])] }
          : s
      )
    );

    // TODO: Call backend API to queue leads for skip tracing
    // This would integrate with PeopleData/SkipTrace API
    toast.success(`Queued ${search.propertyIds.length.toLocaleString()} IDs for skip tracing`);
  };

  // Push to Campaign
  const pushToCampaign = async (search: SavedSearch, campaignId: string) => {
    toast.info(`Pushing ${search.propertyIds.length.toLocaleString()} leads to campaign...`);

    // Update status
    setSavedSearches(prev =>
      prev.map(s =>
        s.id === search.id
          ? { ...s, queueStatus: "in_campaign" as const, campaignId, tags: [...new Set([...s.tags, "In Campaign"])] }
          : s
      )
    );

    // TODO: Call GraphQL mutation to create leads and assign to campaign
    toast.success(`Pushed ${search.propertyIds.length.toLocaleString()} leads to campaign`);
  };

  const toggleSearchTag = (searchId: string, tag: string) => {
    setSavedSearches(prev =>
      prev.map(s =>
        s.id === searchId
          ? { ...s, tags: s.tags.includes(tag) ? s.tags.filter(t => t !== tag) : [...s.tags, tag] }
          : s
      )
    );
  };

  const exportToCsv = (search: SavedSearch) => {
    const headers = ["property_id", "label", "tags", "state", "county", "city", "zip", "property_type", "queue_status"];
    const rows = search.propertyIds.map(id => [
      id, search.label, search.tags.join("; "),
      search.filters.state, search.filters.county, search.filters.city,
      search.filters.zip, search.filters.propertyType, search.queueStatus || "pending"
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${search.label.replace(/[^a-zA-Z0-9]/g, "_")}_${search.propertyIds.length}_ids.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${search.propertyIds.length.toLocaleString()} IDs`);
  };

  const addCustomTag = () => {
    if (!newTagName.trim()) return;
    if (allTags.some(t => t.name.toLowerCase() === newTagName.trim().toLowerCase())) {
      toast.error("Tag exists");
      return;
    }
    const colors = ["bg-indigo-600", "bg-teal-600", "bg-amber-600", "bg-rose-600", "bg-emerald-600"];
    setCustomTags(prev => [...prev, { name: newTagName.trim(), color: colors[prev.length % colors.length] }]);
    setNewTagName("");
  };

  const deleteSearch = (id: string) => {
    setSavedSearches(prev => prev.filter(s => s.id !== id));
    toast.success("Deleted");
  };

  const filteredSearches = filterTag
    ? savedSearches.filter(s => s.tags.includes(filterTag))
    : savedSearches;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "queued": return "bg-yellow-600";
      case "skip_traced": return "bg-purple-600";
      case "validated": return "bg-emerald-600";
      case "in_campaign": return "bg-indigo-600";
      default: return "bg-zinc-600";
    }
  };

  const getEnrichmentStatusColor = (status?: string) => {
    switch (status) {
      case "processing": return "bg-blue-600";
      case "completed": return "bg-green-600";
      case "failed": return "bg-red-600";
      case "paused": return "bg-yellow-600";
      default: return "bg-zinc-600";
    }
  };

  const getEnrichmentJob = (bucketId: string): EnrichmentJob | undefined => {
    return enrichmentJobs[bucketId];
  };

  return (
    <div className="space-y-6 p-6">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".csv"
        className="hidden"
      />

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <Card className="bg-zinc-900 border-zinc-700 w-full max-w-2xl max-h-[80vh] overflow-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Import Preview
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowImportModal(false); setImportedData([]); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-zinc-800 rounded-lg">
                <p className="text-2xl font-bold text-green-400">{importedData.length.toLocaleString()}</p>
                <p className="text-zinc-400 text-sm">Properties loaded</p>
              </div>

              {/* Auto-detected tags */}
              <div>
                <Label className="text-zinc-400 text-xs">Auto-detected Tags</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {[...new Set(importedData.flatMap(p => p.autoTags))].map(tag => {
                    const tagDef = DEFAULT_TAGS.find(t => t.name === tag);
                    return (
                      <Badge key={tag} className={`${tagDef?.color || "bg-zinc-600"} text-white`}>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {tag} ({importedData.filter(p => p.autoTags.includes(tag)).length})
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Enrichment needs */}
              <div className="p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                <p className="text-yellow-400 text-sm font-medium">
                  {importedData.filter(p => p.needsEnrichment.length > 0).length} properties need enrichment
                </p>
                <p className="text-zinc-400 text-xs">Missing: owner info, contact details, valuations</p>
              </div>

              {/* Label input */}
              <div>
                <Label className="text-zinc-400 text-xs">Bucket Label *</Label>
                <Input
                  value={importLabel}
                  onChange={e => setImportLabel(e.target.value)}
                  placeholder="Name this bucket"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>

              {/* Additional tags */}
              <div>
                <Label className="text-zinc-400 text-xs">Add Tags</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {allTags.map(tag => (
                    <button
                      key={tag.name}
                      type="button"
                      onClick={() =>
                        setSelectedTags(prev =>
                          prev.includes(tag.name) ? prev.filter(t => t !== tag.name) : [...prev, tag.name]
                        )
                      }
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        selectedTags.includes(tag.name)
                          ? `${tag.color} text-white ring-2 ring-white`
                          : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={saveImportedBucket}
                disabled={!importLabel.trim()}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Bucket ({importedData.length.toLocaleString()} IDs)
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* IMPORT CSV + ENRICHMENT USAGE */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Upload className="h-5 w-5 text-purple-400" />
                <div>
                  <p className="text-white font-medium">Import CSV</p>
                  <p className="text-zinc-500 text-xs">Upload property IDs with auto-tagging</p>
                </div>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isImporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                {isImporting ? "Processing..." : "Upload CSV"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-cyan-400" />
                <div>
                  <p className="text-white font-medium">Enrichment Quota</p>
                  <p className="text-zinc-500 text-xs">Property Detail API (250/batch, 5K/day)</p>
                </div>
              </div>
              <div className="text-right">
                {enrichmentUsage ? (
                  <>
                    <p className="text-2xl font-bold text-cyan-400">
                      {enrichmentUsage.remaining.toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-500">
                      of {enrichmentUsage.limit.toLocaleString()} remaining today
                    </p>
                  </>
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
                )}
              </div>
            </div>
            {enrichmentUsage && (
              <div className="mt-3">
                <div className="w-full bg-zinc-700 rounded-full h-2">
                  <div
                    className="bg-cyan-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.round((enrichmentUsage.count / enrichmentUsage.limit) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SEARCH */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Search className="h-5 w-5" />
            1. SEARCH & COUNT (FREE)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location Row */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label className="text-zinc-400 text-xs">State *</Label>
              <select
                value={filters.state}
                onChange={e => updateFilter("state", e.target.value)}
                className="w-full h-9 px-2 rounded bg-zinc-800 border border-zinc-700 text-white text-sm"
                aria-label="Select state"
              >
                <option value="">Select State</option>
                {US_STATES.map(s => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
            </div>
            <div ref={countyRef} className="relative">
              <Label className="text-zinc-400 text-xs">County</Label>
              <div className="relative">
                <Input
                  value={countySearch}
                  onChange={e => {
                    setCountySearch(e.target.value);
                    setShowCountyDropdown(true);
                    if (!e.target.value) updateFilter("county", "");
                  }}
                  onFocus={() => filters.state && setShowCountyDropdown(true)}
                  placeholder={filters.state ? (loadingCounties ? "Loading..." : "Type to search") : "Select state first"}
                  disabled={!filters.state}
                  className="h-9 bg-zinc-800 border-zinc-700 text-white pr-8"
                />
                <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-zinc-500" />
              </div>
              {showCountyDropdown && filteredCounties.length > 0 && (
                <div className="absolute z-50 w-full mt-1 max-h-48 overflow-auto bg-zinc-800 border border-zinc-700 rounded-md shadow-lg">
                  {filteredCounties.slice(0, 50).map(county => (
                    <button
                      key={county}
                      type="button"
                      onClick={() => selectCounty(county)}
                      className="w-full px-3 py-2 text-left text-sm text-white hover:bg-zinc-700 focus:bg-zinc-700"
                    >
                      {county}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">City</Label>
              <Input
                value={filters.city}
                onChange={e => updateFilter("city", e.target.value)}
                placeholder="City"
                className="h-9 bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">ZIP</Label>
              <Input
                value={filters.zip}
                onChange={e => updateFilter("zip", e.target.value)}
                placeholder="ZIP"
                maxLength={5}
                className="h-9 bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>

          {/* Property Type + Filters Row */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label className="text-zinc-400 text-xs">Property Type</Label>
              <select
                value={filters.propertyType}
                onChange={e => updateFilter("propertyType", e.target.value)}
                className="w-full h-9 px-2 rounded bg-zinc-800 border border-zinc-700 text-white text-sm"
                aria-label="Select property type"
              >
                {PROPERTY_TYPES.map(t => (
                  <option key={t.code} value={t.code}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Min Equity %</Label>
              <Input
                type="number"
                value={filters.minEquity}
                onChange={e => updateFilter("minEquity", e.target.value)}
                placeholder="40"
                min="0"
                max="100"
                className="h-9 bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Min Ownership (Years)</Label>
              <Input
                type="number"
                value={filters.minOwnership}
                onChange={e => updateFilter("minOwnership", e.target.value)}
                placeholder="5"
                min="0"
                className="h-9 bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={getCount}
                disabled={isLoading || !filters.state}
                className="w-full h-9 bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "COUNT (FREE)"}
              </Button>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.absenteeOwner}
                onCheckedChange={v => updateFilter("absenteeOwner", !!v)}
              />
              <span className="text-zinc-300 text-sm">Absentee Owner</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.preForeclosure}
                onCheckedChange={v => updateFilter("preForeclosure", !!v)}
              />
              <span className="text-zinc-300 text-sm">Pre-Foreclosure</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.vacant}
                onCheckedChange={v => updateFilter("vacant", !!v)}
              />
              <span className="text-zinc-300 text-sm">Vacant</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.freeAndClear}
                onCheckedChange={v => updateFilter("freeAndClear", !!v)}
              />
              <span className="text-zinc-300 text-sm">Free & Clear</span>
            </label>
          </div>

          {/* Count Result */}
          {count !== null && (
            <div className="p-4 bg-zinc-800 rounded-lg space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-4xl font-bold text-green-400">{count.toLocaleString()}</span>
                <span className="text-zinc-400">
                  {filters.propertyType} properties in {filters.county || filters.city || filters.zip}, {filters.state}
                </span>
                {count > 10000 && (
                  <Badge className="bg-orange-600 text-white">
                    Will batch in {Math.ceil(count / 10000)} requests
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-zinc-400 text-xs">Label *</Label>
                  <Input
                    value={label}
                    onChange={e => setLabel(e.target.value)}
                    placeholder="Label this bucket"
                    className="bg-zinc-700 border-zinc-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400 text-xs">Notes</Label>
                  <Input
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Optional notes..."
                    className="bg-zinc-700 border-zinc-600 text-white"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <Label className="text-zinc-400 text-xs">Tags</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {allTags.map(tag => (
                    <button
                      key={tag.name}
                      onClick={() =>
                        setSelectedTags(prev =>
                          prev.includes(tag.name) ? prev.filter(t => t !== tag.name) : [...prev, tag.name]
                        )
                      }
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        selectedTags.includes(tag.name)
                          ? `${tag.color} text-white ring-2 ring-white`
                          : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Batch Progress */}
              {batchProgress && (
                <div className="p-3 bg-zinc-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
                    <span className="text-white font-medium">
                      Fetching Batch {batchProgress.current} of {batchProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-600 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    {batchProgress.ids.length.toLocaleString()} IDs fetched so far
                  </p>
                </div>
              )}

              <Button
                onClick={saveSearch}
                disabled={isSaving || count === 0 || !label.trim()}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {batchProgress ? `Batch ${batchProgress.current}/${batchProgress.total}` : "Saving..."}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    SAVE BUCKET ({count.toLocaleString()} IDs)
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SAVED BUCKETS */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Tag className="h-5 w-5" />
            2. SAVED BUCKETS → QUEUE → CAMPAIGN
          </CardTitle>
          <div className="flex items-center gap-2">
            <Input
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              placeholder="New tag..."
              className="w-32 h-8 text-sm bg-zinc-800 border-zinc-700"
              onKeyDown={e => e.key === "Enter" && addCustomTag()}
            />
            <Button size="sm" onClick={addCustomTag} variant="outline" className="h-8">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter tags */}
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-zinc-800">
            <button
              onClick={() => setFilterTag(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                filterTag === null ? "bg-white text-black" : "bg-zinc-700 text-zinc-300"
              }`}
            >
              All ({savedSearches.length})
            </button>
            {allTags.map(tag => {
              const tagCount = savedSearches.filter(s => s.tags.includes(tag.name)).length;
              if (tagCount === 0) return null;
              return (
                <button
                  key={tag.name}
                  onClick={() => setFilterTag(filterTag === tag.name ? null : tag.name)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    filterTag === tag.name ? `${tag.color} text-white` : "bg-zinc-700 text-zinc-300"
                  }`}
                >
                  {tag.name} ({tagCount})
                </button>
              );
            })}
          </div>

          {/* List */}
          {filteredSearches.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">No saved buckets yet. Search and save above.</p>
          ) : (
            <div className="space-y-3">
              {filteredSearches.map(search => (
                <div key={search.id} className="p-4 bg-zinc-800 rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-white font-bold">{search.label}</h3>
                        <span className="text-zinc-500 text-sm">
                          {search.filters.county || search.filters.city || search.filters.zip}, {search.filters.state}
                        </span>
                        <Badge className={`${getStatusColor(search.queueStatus)} text-white text-xs`}>
                          {search.queueStatus || "pending"}
                        </Badge>
                      </div>
                      <p className="text-sm text-zinc-400 mt-1">
                        <span className="text-green-400 font-bold">{search.propertyIds.length.toLocaleString()}</span> IDs
                        {search.batches?.length > 1 && ` (${search.batches.length} batches)`}
                        {" • "}{search.filters.propertyType}
                        {search.filters.minEquity && ` • ${search.filters.minEquity}%+ equity`}
                        {search.filters.minOwnership && ` • ${search.filters.minOwnership}+ yrs`}
                        {" • "}{search.createdAt.toLocaleDateString()}
                      </p>
                      {search.notes && <p className="text-xs text-zinc-500 mt-1 italic">{search.notes}</p>}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {search.tags.map(tag => {
                          const tagDef = allTags.find(t => t.name === tag);
                          return (
                            <Badge
                              key={tag}
                              className={`${tagDef?.color || "bg-zinc-600"} text-white text-xs cursor-pointer`}
                              onClick={() => toggleSearchTag(search.id, tag)}
                            >
                              {tag} <X className="h-3 w-3 ml-1" />
                            </Badge>
                          );
                        })}
                        <select
                          value=""
                          onChange={e => e.target.value && toggleSearchTag(search.id, e.target.value)}
                          className="h-5 px-1 text-xs bg-zinc-700 border-none rounded text-zinc-300"
                          aria-label="Add tag"
                        >
                          <option value="">+ Tag</option>
                          {allTags.filter(t => !search.tags.includes(t.name)).map(t => (
                            <option key={t.name} value={t.name}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {/* Enrichment Progress */}
                      {getEnrichmentJob(search.id) && (
                        <div className="p-2 bg-zinc-700 rounded-lg mb-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-zinc-400">
                              Enriching: {getEnrichmentJob(search.id)?.progress.processed}/{getEnrichmentJob(search.id)?.progress.total}
                            </span>
                            <Badge className={`${getEnrichmentStatusColor(getEnrichmentJob(search.id)?.status)} text-white text-xs`}>
                              {getEnrichmentJob(search.id)?.status}
                            </Badge>
                          </div>
                          <div className="w-full bg-zinc-600 rounded-full h-1.5">
                            <div
                              className="bg-cyan-500 h-1.5 rounded-full transition-all"
                              style={{
                                width: `${Math.round(((getEnrichmentJob(search.id)?.progress.processed || 0) / (getEnrichmentJob(search.id)?.progress.total || 1)) * 100)}%`
                              }}
                            />
                          </div>
                          {getEnrichmentJob(search.id)?.status === "processing" && (
                            <p className="text-xs text-zinc-500 mt-1">
                              Batch {getEnrichmentJob(search.id)?.progress.currentBatch}/{getEnrichmentJob(search.id)?.progress.totalBatches}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {/* Enrich Button */}
                        {!search.enrichmentStatus || search.enrichmentStatus === "failed" ? (
                          <Button
                            onClick={() => startEnrichment(search)}
                            size="sm"
                            className="bg-cyan-600 hover:bg-cyan-700"
                            disabled={isEnriching !== null || !enrichmentUsage || enrichmentUsage.remaining === 0}
                            title="Enrich with Property Details (250/batch, 5K/day)"
                          >
                            <Database className="h-4 w-4 mr-1" /> Enrich
                          </Button>
                        ) : search.enrichmentStatus === "processing" || search.enrichmentStatus === "paused" ? (
                          <Button
                            onClick={() => toggleEnrichmentPause(search)}
                            size="sm"
                            className={search.enrichmentStatus === "paused" ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"}
                            title={search.enrichmentStatus === "paused" ? "Resume Enrichment" : "Pause Enrichment"}
                          >
                            {search.enrichmentStatus === "paused" ? (
                              <><Play className="h-4 w-4 mr-1" /> Resume</>
                            ) : (
                              <><Pause className="h-4 w-4 mr-1" /> Pause</>
                            )}
                          </Button>
                        ) : search.enrichmentStatus === "completed" ? (
                          <Badge className="bg-green-600 text-white px-3 py-1">
                            <CheckCircle className="h-3 w-3 mr-1" /> Enriched
                          </Badge>
                        ) : null}

                        <Button
                          onClick={() => pushToQueue(search)}
                          size="sm"
                          className="bg-yellow-600 hover:bg-yellow-700"
                          disabled={search.queueStatus !== "pending"}
                          title="Queue for Skip Tracing"
                        >
                          <Phone className="h-4 w-4 mr-1" /> Queue
                        </Button>
                        <Button
                          onClick={() => pushToCampaign(search, "default")}
                          size="sm"
                          className="bg-indigo-600 hover:bg-indigo-700"
                          disabled={search.queueStatus === "pending"}
                          title="Push to Campaign"
                        >
                          <Zap className="h-4 w-4 mr-1" /> Campaign
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => exportToCsv(search)} size="sm" className="bg-purple-600 hover:bg-purple-700">
                          <Download className="h-4 w-4 mr-1" /> CSV
                        </Button>
                        <Button onClick={() => deleteSearch(search.id)} size="sm" variant="destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-white">{savedSearches.length}</p>
            <p className="text-xs text-zinc-400">Saved Buckets</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-green-400">
              {savedSearches.reduce((acc, s) => acc + s.propertyIds.length, 0).toLocaleString()}
            </p>
            <p className="text-xs text-zinc-400">Total IDs</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-yellow-400">
              {savedSearches.filter(s => s.queueStatus === "queued").length}
            </p>
            <p className="text-xs text-zinc-400">In Queue</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-indigo-400">
              {savedSearches.filter(s => s.queueStatus === "in_campaign").length}
            </p>
            <p className="text-xs text-zinc-400">In Campaign</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
