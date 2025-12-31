"use client";

import { sf } from "@/lib/utils/safe-format";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Search,
  Building2,
  MapPin,
  Phone,
  Mail,
  Loader2,
  Zap,
  CheckCircle,
  AlertCircle,
  Database,
  LayoutGrid,
  List,
  ArrowUpDown,
  Tag,
  UserSearch,
  Crown,
  Briefcase,
  Users,
  DollarSign,
  Building,
  Download,
  Sparkles,
  CheckSquare,
  Square,
  PhoneCall,
} from "lucide-react";

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  title?: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  sic_code?: string;
  sic_description?: string;
  industry?: string;
  revenue?: string;
  employees?: string;
  is_decision_maker?: boolean;
  property_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Industry tag colors
const INDUSTRY_COLORS: Record<string, string> = {
  consultants: "bg-purple-600",
  telephone: "bg-blue-600",
  stereo: "bg-pink-600",
  personnel: "bg-green-600",
  "real estate": "bg-amber-600",
  insurance: "bg-cyan-600",
  restaurant: "bg-red-600",
  construction: "bg-orange-600",
  healthcare: "bg-emerald-600",
  legal: "bg-indigo-600",
  retail: "bg-rose-600",
  technology: "bg-violet-600",
  manufacturing: "bg-slate-600",
  finance: "bg-yellow-600",
  default: "bg-zinc-600",
};

// Get industry color
const getIndustryColor = (industry: string | undefined): string => {
  if (!industry) return INDUSTRY_COLORS.default;
  const lower = industry.toLowerCase();
  for (const [key, color] of Object.entries(INDUSTRY_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return INDUSTRY_COLORS.default;
};

// Title icons based on role
const getTitleIcon = (title: string | undefined) => {
  if (!title) return <Briefcase className="h-3 w-3" />;
  const lower = title.toLowerCase();
  if (
    lower.includes("owner") ||
    lower.includes("ceo") ||
    lower.includes("founder")
  ) {
    return <Crown className="h-3 w-3 text-yellow-400" />;
  }
  if (
    lower.includes("president") ||
    lower.includes("director") ||
    lower.includes("vp")
  ) {
    return <Building className="h-3 w-3 text-blue-400" />;
  }
  if (lower.includes("manager") || lower.includes("partner")) {
    return <Users className="h-3 w-3 text-green-400" />;
  }
  return <Briefcase className="h-3 w-3 text-zinc-400" />;
};

type SortField = "company" | "name" | "city" | "title" | "created_at";
type SortOrder = "asc" | "desc";
type ViewMode = "list" | "card";
type DataSource = "ny-usbiz" | "apollo-all";

interface EnrichedProperty {
  id: string;
  owner_first_name: string;
  owner_last_name: string;
  estimated_value: number;
  equity_amount: number;
  equity_percent: number;
  type: string;
}

// US States
const US_STATES = [
  { code: "NY", name: "New York" },
  { code: "NJ", name: "New Jersey" },
  { code: "CT", name: "Connecticut" },
  { code: "FL", name: "Florida" },
  { code: "CA", name: "California" },
  { code: "TX", name: "Texas" },
  { code: "PA", name: "Pennsylvania" },
  { code: "IL", name: "Illinois" },
  { code: "OH", name: "Ohio" },
  { code: "GA", name: "Georgia" },
];

export default function B2BPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [enrichedProperties, setEnrichedProperties] = useState<
    Record<string, EnrichedProperty>
  >({});

  // View mode and sorting
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortField, setSortField] = useState<SortField>("company");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [decisionMakersOnly, setDecisionMakersOnly] = useState(true);

  // Data source toggle
  const [dataSource, setDataSource] = useState<DataSource>("ny-usbiz");

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Batch operations progress
  const [batchOperation, setBatchOperation] = useState<{
    type: "skip-trace" | "apollo" | "export" | "pipeline" | null;
    current: number;
    total: number;
    success: number;
    failed: number;
  }>({ type: null, current: 0, total: 0, success: 0, failed: 0 });

  // Filters
  const [state, setState] = useState("NY");
  const [city, setCity] = useState("");
  const [company, setCompany] = useState("");
  const [titleFilter, setTitleFilter] = useState("");

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === sortedLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedLeads.map((l) => l.id)));
    }
  };

  const selectedLeads = useMemo(() => {
    return leads.filter((l) => selectedIds.has(l.id));
  }, [leads, selectedIds]);

  // Sorted leads
  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      let aVal: string, bVal: string;
      switch (sortField) {
        case "company":
          aVal = a.company || "";
          bVal = b.company || "";
          break;
        case "name":
          aVal = `${a.first_name} ${a.last_name}`;
          bVal = `${b.first_name} ${b.last_name}`;
          break;
        case "city":
          aVal = a.city || "";
          bVal = b.city || "";
          break;
        case "title":
          aVal = a.title || "";
          bVal = b.title || "";
          break;
        case "created_at":
          aVal = a.created_at || "";
          bVal = b.created_at || "";
          break;
        default:
          aVal = "";
          bVal = "";
      }
      const cmp = aVal.localeCompare(bVal);
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [leads, sortField, sortOrder]);

  // Toggle sort
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const searchLeads = async () => {
    setLoading(true);
    setSelectedIds(new Set()); // Clear selection on new search
    try {
      if (dataSource === "ny-usbiz") {
        // NY USBizData from DO Spaces (5.5M records)
        const res = await fetch("/api/b2b/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            state,
            city,
            company,
            title: titleFilter,
            decisionMakersOnly,
            limit: 100,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setLeads(data.leads);
        setTotal(data.total);
        toast.success(
          `Found ${data.total} B2B leads from USBizData${decisionMakersOnly ? " (decision makers)" : ""}`,
        );
      } else {
        // Apollo API (all US states - 34M+ records)
        const res = await fetch("/api/business-list/companies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: company || undefined,
            state: state ? [state] : undefined,
            city: city ? [city] : undefined,
            page: 1,
            per_page: 100,
          }),
        });

        const data = await res.json();
        if (data.error && data.hits?.length === 0) throw new Error(data.error);

        // Transform Apollo results to Lead format
        const apolloLeads: Lead[] = (data.hits || []).map(
          (hit: {
            id: string;
            name?: string;
            domain?: string;
            industry?: string;
            city?: string;
            state?: string;
            phone?: string;
            employees?: number;
            revenue?: number;
          }) => ({
            id:
              hit.id ||
              `apollo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            first_name: "",
            last_name: "",
            title: "",
            company: hit.name || "",
            email: hit.domain ? `info@${hit.domain}` : "",
            phone: hit.phone || "",
            address: "",
            city: hit.city || "",
            state: hit.state || "",
            zip_code: "",
            sic_code: "",
            sic_description: "",
            industry: hit.industry || "",
            revenue: hit.revenue
              ? `$${(hit.revenue / 100).toLocaleString()}`
              : "",
            employees: hit.employees?.toString() || "",
            is_decision_maker: false, // Will be enriched later
            property_id: null,
            metadata: { source: "apollo", domain: hit.domain },
            created_at: new Date().toISOString(),
          }),
        );

        // If decision makers filter is on, we need to search for people at these companies
        if (decisionMakersOnly && apolloLeads.length > 0) {
          toast.info("Searching for decision makers at these companies...");

          // Search for people at the first 10 companies
          const enrichPromises = apolloLeads.slice(0, 10).map(async (lead) => {
            try {
              const peopleRes = await fetch("/api/business-list/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  company_name: lead.company ? [lead.company] : undefined,
                  title: titleFilter
                    ? [titleFilter]
                    : ["owner", "ceo", "founder", "president", "director"],
                }),
              });

              const peopleData = await peopleRes.json();
              if (peopleData.hits && peopleData.hits.length > 0) {
                const person = peopleData.hits[0];
                return {
                  ...lead,
                  first_name: person.name?.split(" ")[0] || "",
                  last_name: person.name?.split(" ").slice(1).join(" ") || "",
                  title: person.title || "",
                  email: person.email || lead.email,
                  phone: person.phone || lead.phone,
                  is_decision_maker: true,
                };
              }
              return lead;
            } catch {
              return lead;
            }
          });

          const enrichedLeads = await Promise.all(enrichPromises);
          setLeads([...enrichedLeads, ...apolloLeads.slice(10)]);
        } else {
          setLeads(apolloLeads);
        }

        setTotal(data.estimatedTotalHits || apolloLeads.length);
        toast.success(
          `Found ${data.estimatedTotalHits || apolloLeads.length} companies from Apollo API`,
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const enrichLead = async (lead: Lead) => {
    if (!lead.address || !lead.state) {
      toast.error("Lead missing address or state");
      return;
    }

    setEnrichingId(lead.id);
    try {
      const res = await fetch("/api/b2b/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          address: lead.address,
          city: lead.city,
          state: lead.state,
          zip: lead.zip_code,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      // Update lead with property_id
      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id ? { ...l, property_id: data.property.id } : l,
        ),
      );

      // Store enriched property
      setEnrichedProperties((prev) => ({
        ...prev,
        [lead.id]: data.property,
      }));

      toast.success(
        `Enriched! Value: $${sf(data.property.estimated_value) || "N/A"}, Equity: ${data.property.equity_percent || 0}%`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enrichment failed");
    } finally {
      setEnrichingId(null);
    }
  };

  const enrichAll = async () => {
    const unenrichedLeads = leads.filter(
      (l) => !l.property_id && l.address && l.state,
    );

    if (unenrichedLeads.length === 0) {
      toast.info("All leads with addresses are already enriched");
      return;
    }

    toast.info(`Enriching ${unenrichedLeads.length} leads...`);

    for (const lead of unenrichedLeads) {
      await enrichLead(lead);
      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 500));
    }

    toast.success("Batch enrichment complete!");
  };

  // Batch Skip Trace (RealEstateAPI)
  const batchSkipTrace = async () => {
    const toProcess = selectedLeads.filter((l) => l.first_name && l.last_name);
    if (toProcess.length === 0) {
      toast.error("No leads selected with names for skip trace");
      return;
    }

    setBatchOperation({
      type: "skip-trace",
      current: 0,
      total: toProcess.length,
      success: 0,
      failed: 0,
    });

    let success = 0;
    let failed = 0;

    for (let i = 0; i < toProcess.length; i++) {
      const lead = toProcess[i];
      try {
        const res = await fetch("/api/enrichment/skip-trace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: lead.first_name,
            lastName: lead.last_name,
            address: lead.address,
            city: lead.city,
            state: lead.state,
            zip: lead.zip_code,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          // Update lead with skip trace data
          setLeads((prev) =>
            prev.map((l) =>
              l.id === lead.id
                ? {
                    ...l,
                    phone: data.phone || l.phone,
                    metadata: {
                      ...l.metadata,
                      skipTraced: true,
                      skipTraceData: data,
                    },
                  }
                : l,
            ),
          );
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }

      setBatchOperation((prev) => ({
        ...prev,
        current: i + 1,
        success,
        failed,
      }));
      await new Promise((r) => setTimeout(r, 300)); // Rate limit
    }

    setBatchOperation({
      type: null,
      current: 0,
      total: 0,
      success: 0,
      failed: 0,
    });
    toast.success(`Skip trace complete: ${success} success, ${failed} failed`);
  };

  // Batch Apollo Enrich
  const batchApolloEnrich = async () => {
    const toProcess = selectedLeads.filter(
      (l) => l.first_name && l.last_name && (l.company || l.email),
    );
    if (toProcess.length === 0) {
      toast.error(
        "No leads selected with sufficient data for Apollo enrichment",
      );
      return;
    }

    setBatchOperation({
      type: "apollo",
      current: 0,
      total: toProcess.length,
      success: 0,
      failed: 0,
    });

    let success = 0;
    let failed = 0;

    for (let i = 0; i < toProcess.length; i++) {
      const lead = toProcess[i];
      try {
        const res = await fetch("/api/enrichment/apollo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recordId: lead.id,
            bucketId: "b2b-leads",
            firstName: lead.first_name,
            lastName: lead.last_name,
            companyName: lead.company,
            email: lead.email,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.enrichedData) {
            setLeads((prev) =>
              prev.map((l) =>
                l.id === lead.id
                  ? {
                      ...l,
                      email: data.enrichedData.email || l.email,
                      title: data.enrichedData.title || l.title,
                      metadata: {
                        ...l.metadata,
                        apolloEnriched: true,
                        apolloData: data.enrichedData,
                      },
                    }
                  : l,
              ),
            );
            success++;
          } else {
            failed++;
          }
        } else {
          failed++;
        }
      } catch {
        failed++;
      }

      setBatchOperation((prev) => ({
        ...prev,
        current: i + 1,
        success,
        failed,
      }));
      await new Promise((r) => setTimeout(r, 500)); // Rate limit
    }

    setBatchOperation({
      type: null,
      current: 0,
      total: 0,
      success: 0,
      failed: 0,
    });
    toast.success(
      `Apollo enrichment complete: ${success} success, ${failed} failed`,
    );
  };

  // Full Pipeline: Skip Trace → Apollo
  const runFullPipeline = async () => {
    const toProcess = selectedLeads.filter((l) => l.first_name && l.last_name);
    if (toProcess.length === 0) {
      toast.error("No leads selected for pipeline");
      return;
    }

    setBatchOperation({
      type: "pipeline",
      current: 0,
      total: toProcess.length * 2,
      success: 0,
      failed: 0,
    });

    let success = 0;
    let failed = 0;

    for (let i = 0; i < toProcess.length; i++) {
      const lead = toProcess[i];

      // Step 1: Skip Trace
      try {
        const skipRes = await fetch("/api/enrichment/skip-trace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: lead.first_name,
            lastName: lead.last_name,
            address: lead.address,
            city: lead.city,
            state: lead.state,
            zip: lead.zip_code,
          }),
        });

        if (skipRes.ok) {
          const skipData = await skipRes.json();
          setLeads((prev) =>
            prev.map((l) =>
              l.id === lead.id
                ? {
                    ...l,
                    phone: skipData.phone || l.phone,
                    metadata: { ...l.metadata, skipTraced: true },
                  }
                : l,
            ),
          );
          success++;
        }
      } catch {
        /* continue */
      }

      setBatchOperation((prev) => ({
        ...prev,
        current: i * 2 + 1,
        success,
        failed,
      }));
      await new Promise((r) => setTimeout(r, 300));

      // Step 2: Apollo Enrich
      if (lead.company || lead.email) {
        try {
          const apolloRes = await fetch("/api/enrichment/apollo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recordId: lead.id,
              bucketId: "b2b-leads",
              firstName: lead.first_name,
              lastName: lead.last_name,
              companyName: lead.company,
              email: lead.email,
            }),
          });

          if (apolloRes.ok) {
            const apolloData = await apolloRes.json();
            if (apolloData.success) {
              setLeads((prev) =>
                prev.map((l) =>
                  l.id === lead.id
                    ? {
                        ...l,
                        metadata: { ...l.metadata, apolloEnriched: true },
                      }
                    : l,
                ),
              );
              success++;
            } else {
              failed++;
            }
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }

      setBatchOperation((prev) => ({
        ...prev,
        current: i * 2 + 2,
        success,
        failed,
      }));
      await new Promise((r) => setTimeout(r, 500));
    }

    setBatchOperation({
      type: null,
      current: 0,
      total: 0,
      success: 0,
      failed: 0,
    });
    toast.success(
      `Pipeline complete: ${success} enrichments, ${failed} failed`,
    );
  };

  // Export to DO Spaces
  const exportToSpaces = async () => {
    const toExport = selectedLeads.length > 0 ? selectedLeads : leads;
    if (toExport.length === 0) {
      toast.error("No leads to export");
      return;
    }

    setBatchOperation({
      type: "export",
      current: 0,
      total: 1,
      success: 0,
      failed: 0,
    });

    try {
      // Generate CSV content
      const headers = [
        "id",
        "first_name",
        "last_name",
        "title",
        "company",
        "email",
        "phone",
        "address",
        "city",
        "state",
        "zip_code",
        "industry",
        "sic_code",
        "is_decision_maker",
      ];
      const csvRows = [headers.join(",")];

      for (const lead of toExport) {
        const row = headers.map((h) => {
          const val = lead[h as keyof Lead];
          if (val === null || val === undefined) return "";
          const str = String(val).replace(/"/g, '""');
          return str.includes(",") || str.includes('"') ? `"${str}"` : str;
        });
        csvRows.push(row.join(","));
      }

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });

      // Upload to Spaces via API
      const formData = new FormData();
      formData.append("file", blob, `b2b-export-${Date.now()}.csv`);
      formData.append("bucketId", "b2b-exports");

      const res = await fetch("/api/datalake/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        toast.success(`Exported ${toExport.length} leads to DO Spaces`);

        // Also trigger download for user
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `b2b-leads-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        setBatchOperation((prev) => ({ ...prev, current: 1, success: 1 }));
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      toast.error("Export failed - downloading locally instead");
      // Fallback: local download only
      const headers = [
        "id",
        "first_name",
        "last_name",
        "title",
        "company",
        "email",
        "phone",
        "address",
        "city",
        "state",
        "zip_code",
        "industry",
        "sic_code",
      ];
      const csvRows = [headers.join(",")];
      for (const lead of toExport) {
        const row = headers.map((h) => {
          const val = lead[h as keyof Lead];
          if (val === null || val === undefined) return "";
          const str = String(val).replace(/"/g, '""');
          return str.includes(",") || str.includes('"') ? `"${str}"` : str;
        });
        csvRows.push(row.join(","));
      }
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `b2b-leads-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }

    setBatchOperation({
      type: null,
      current: 0,
      total: 0,
      success: 0,
      failed: 0,
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-lg ${dataSource === "ny-usbiz" ? "bg-blue-600" : "bg-purple-600"}`}
            >
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">B2B Lead Enrichment</h1>
              <p className="text-zinc-400 text-sm">
                Search B2B leads → Enrich with Apollo + RealEstateAPI → Get
                contact + property details
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Data Source Toggle */}
            <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setDataSource("ny-usbiz")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  dataSource === "ny-usbiz"
                    ? "bg-blue-600 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Database className="h-4 w-4 inline-block mr-1" />
                NY USBiz (5.5M)
              </button>
              <button
                type="button"
                onClick={() => setDataSource("apollo-all")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  dataSource === "apollo-all"
                    ? "bg-purple-600 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Sparkles className="h-4 w-4 inline-block mr-1" />
                Apollo (All US)
              </button>
            </div>
            <Badge className="bg-green-600 text-white px-4 py-2 text-lg">
              {sf(total)} Total Leads
            </Badge>
          </div>
        </div>

        {/* Search Filters */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search B2B Leads
              {dataSource === "ny-usbiz" ? (
                <Badge className="bg-blue-600 ml-2">
                  <Database className="h-3 w-3 mr-1" />
                  5.5M+ NY Records (USBizData)
                </Badge>
              ) : (
                <Badge className="bg-purple-600 ml-2">
                  <Sparkles className="h-3 w-3 mr-1" />
                  All US States (Apollo API)
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-5 gap-4">
              <div>
                <Label className="text-zinc-400 text-xs" htmlFor="state-select">
                  State
                </Label>
                <select
                  id="state-select"
                  title="Select state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full h-10 px-3 rounded bg-zinc-800 border border-zinc-700 text-white"
                >
                  <option value="">All States</option>
                  {US_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">City</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City name..."
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Company</Label>
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company name..."
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Title</Label>
                <Input
                  value={titleFilter}
                  onChange={(e) => setTitleFilter(e.target.value)}
                  placeholder="CEO, Owner, Manager..."
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={searchLeads}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Filter Options Row */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={decisionMakersOnly}
                    onCheckedChange={setDecisionMakersOnly}
                    className="data-[state=checked]:bg-yellow-600"
                  />
                  <Label className="text-zinc-300 text-sm flex items-center gap-1">
                    <Crown className="h-4 w-4 text-yellow-400" />
                    Decision Makers Only
                  </Label>
                </div>
                <div className="text-xs text-zinc-500">
                  {decisionMakersOnly
                    ? "Owner, CEO, VP, Director, Partner, Manager"
                    : "All contacts"}
                </div>
              </div>
              <Button
                onClick={enrichAll}
                disabled={loading || leads.length === 0}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Zap className="h-4 w-4 mr-2" />
                Enrich All (
                {leads.filter((l) => !l.property_id && l.address).length})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Batch Actions Toolbar */}
        {(selectedIds.size > 0 || batchOperation.type) && (
          <Card className="bg-zinc-800 border-zinc-700">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge className="bg-blue-600 text-white px-3 py-1">
                    {selectedIds.size} Selected
                  </Badge>

                  {batchOperation.type ? (
                    <div className="flex items-center gap-3 flex-1 min-w-[300px]">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                      <div className="flex-1">
                        <div className="flex justify-between text-xs text-zinc-400 mb-1">
                          <span>
                            {batchOperation.type === "skip-trace" &&
                              "Skip Tracing..."}
                            {batchOperation.type === "apollo" &&
                              "Apollo Enriching..."}
                            {batchOperation.type === "pipeline" &&
                              "Running Pipeline..."}
                            {batchOperation.type === "export" && "Exporting..."}
                          </span>
                          <span>
                            {batchOperation.current}/{batchOperation.total}
                          </span>
                        </div>
                        <Progress
                          value={
                            (batchOperation.current / batchOperation.total) *
                            100
                          }
                          className="h-2"
                        />
                        <div className="flex gap-3 text-xs mt-1">
                          <span className="text-green-400">
                            {batchOperation.success} success
                          </span>
                          <span className="text-red-400">
                            {batchOperation.failed} failed
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={batchSkipTrace}
                        className="bg-amber-600 hover:bg-amber-700"
                      >
                        <PhoneCall className="h-4 w-4 mr-1" />
                        Skip Trace
                      </Button>
                      <Button
                        size="sm"
                        onClick={batchApolloEnrich}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        Apollo Enrich
                      </Button>
                      <Button
                        size="sm"
                        onClick={runFullPipeline}
                        className="bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-700 hover:to-purple-700"
                      >
                        <Zap className="h-4 w-4 mr-1" />
                        Full Pipeline
                      </Button>
                      <div className="w-px h-6 bg-zinc-600 mx-1" />
                      <Button
                        size="sm"
                        onClick={exportToSpaces}
                        variant="outline"
                        className="border-zinc-600"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Export CSV
                      </Button>
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-zinc-400 hover:text-white"
                >
                  Clear Selection
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Database className="h-5 w-5" />
              B2B Leads ({sortedLeads.length})
              {sortedLeads.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={selectAll}
                  className="ml-2 h-6 px-2 text-xs text-zinc-400 hover:text-white"
                >
                  {selectedIds.size === sortedLeads.length ? (
                    <>
                      <CheckSquare className="h-3 w-3 mr-1" /> Deselect All
                    </>
                  ) : (
                    <>
                      <Square className="h-3 w-3 mr-1" /> Select All
                    </>
                  )}
                </Button>
              )}
            </CardTitle>
            <div className="flex items-center gap-4">
              {/* Sort Buttons */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-zinc-500 mr-1">Sort:</span>
                {(["company", "name", "city", "title"] as SortField[]).map(
                  (field) => (
                    <Button
                      key={field}
                      size="sm"
                      variant={sortField === field ? "default" : "ghost"}
                      onClick={() => toggleSort(field)}
                      className={`h-7 px-2 text-xs ${sortField === field ? "bg-blue-600" : "text-zinc-400"}`}
                    >
                      {field.charAt(0).toUpperCase() + field.slice(1)}
                      {sortField === field && (
                        <ArrowUpDown className="h-3 w-3 ml-1" />
                      )}
                    </Button>
                  ),
                )}
              </div>
              {/* View Toggle */}
              <div className="flex items-center gap-1 border border-zinc-700 rounded p-0.5">
                <Button
                  size="sm"
                  variant={viewMode === "list" ? "default" : "ghost"}
                  onClick={() => setViewMode("list")}
                  className={`h-7 px-2 ${viewMode === "list" ? "bg-zinc-700" : ""}`}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "card" ? "default" : "ghost"}
                  onClick={() => setViewMode("card")}
                  className={`h-7 px-2 ${viewMode === "card" ? "bg-zinc-700" : ""}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {sortedLeads.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Search for B2B leads to enrich with property data</p>
              </div>
            ) : viewMode === "card" ? (
              /* Card View */
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedLeads.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => toggleSelect(lead.id)}
                    className={`p-4 bg-zinc-800 rounded-lg border transition-colors cursor-pointer ${
                      selectedIds.has(lead.id)
                        ? "border-blue-500 bg-blue-950/30"
                        : "border-zinc-700 hover:border-zinc-500"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedIds.has(lead.id)}
                          onCheckedChange={() => toggleSelect(lead.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="data-[state=checked]:bg-blue-600"
                        />
                        {getTitleIcon(lead.title)}
                        <h3 className="font-bold text-white text-sm truncate max-w-[150px]">
                          {lead.company || "No Company"}
                        </h3>
                      </div>
                      {lead.is_decision_maker && (
                        <Crown className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-zinc-300 text-sm">
                      {lead.first_name} {lead.last_name}
                    </p>
                    {lead.title && (
                      <p className="text-zinc-500 text-xs truncate">
                        {lead.title}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {lead.industry && (
                        <Badge
                          className={`${getIndustryColor(lead.industry)} text-white text-[10px] px-1.5 py-0`}
                        >
                          <Tag className="h-2.5 w-2.5 mr-0.5" />
                          {lead.industry.split(" ").slice(0, 2).join(" ")}
                        </Badge>
                      )}
                      {lead.property_id ? (
                        <Badge className="bg-green-600 text-white text-[10px] px-1.5 py-0">
                          <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                          Enriched
                        </Badge>
                      ) : lead.address ? (
                        <Badge className="bg-yellow-600 text-white text-[10px] px-1.5 py-0">
                          Ready
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-3 pt-2 border-t border-zinc-700 text-xs text-zinc-500 space-y-1">
                      {lead.email && (
                        <p className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </p>
                      )}
                      {lead.phone && (
                        <p className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </p>
                      )}
                      <p className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {lead.city}, {lead.state}
                      </p>
                    </div>
                    <Button
                      onClick={() => enrichLead(lead)}
                      disabled={enrichingId === lead.id || !lead.address}
                      size="sm"
                      className={`w-full mt-3 h-7 text-xs ${lead.property_id ? "bg-zinc-700" : "bg-purple-600 hover:bg-purple-700"}`}
                    >
                      {enrichingId === lead.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Zap className="h-3 w-3 mr-1" />
                      )}
                      {lead.property_id ? "Re-Enrich" : "Enrich"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              /* List View */
              <div className="space-y-3">
                {sortedLeads.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => toggleSelect(lead.id)}
                    className={`p-4 bg-zinc-800 rounded-lg border transition-colors cursor-pointer ${
                      selectedIds.has(lead.id)
                        ? "border-blue-500 bg-blue-950/30"
                        : "border-zinc-700 hover:border-zinc-600"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedIds.has(lead.id)}
                        onCheckedChange={() => toggleSelect(lead.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="data-[state=checked]:bg-blue-600 mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              {getTitleIcon(lead.title)}
                              <h3 className="font-bold text-white text-lg">
                                {lead.company || "No Company"}
                              </h3>
                            </div>
                            {lead.is_decision_maker && (
                              <Badge className="bg-yellow-600/20 text-yellow-400 border border-yellow-600">
                                <Crown className="h-3 w-3 mr-1" />
                                Decision Maker
                              </Badge>
                            )}
                            {lead.industry && (
                              <Badge
                                className={`${getIndustryColor(lead.industry)} text-white`}
                              >
                                <Tag className="h-3 w-3 mr-1" />
                                {lead.industry.split(" ").slice(0, 2).join(" ")}
                              </Badge>
                            )}
                            {lead.property_id ? (
                              <Badge className="bg-green-600 text-white">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Enriched
                              </Badge>
                            ) : lead.address ? (
                              <Badge className="bg-yellow-600 text-white">
                                Ready to Enrich
                              </Badge>
                            ) : (
                              <Badge className="bg-zinc-600 text-white">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                No Address
                              </Badge>
                            )}
                          </div>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              enrichLead(lead);
                            }}
                            disabled={enrichingId === lead.id || !lead.address}
                            size="sm"
                            className={
                              lead.property_id
                                ? "bg-zinc-700 hover:bg-zinc-600"
                                : "bg-purple-600 hover:bg-purple-700"
                            }
                          >
                            {enrichingId === lead.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Zap className="h-4 w-4 mr-1" />
                                {lead.property_id ? "Re-Enrich" : "Enrich"}
                              </>
                            )}
                          </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-zinc-300 flex items-center gap-1">
                              <UserSearch className="h-3 w-3 text-zinc-500" />
                              {lead.first_name} {lead.last_name}
                            </p>
                            {lead.title && (
                              <p className="text-zinc-500 text-xs ml-4">
                                {lead.title}
                              </p>
                            )}
                            {lead.email && (
                              <p className="text-zinc-500 flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {lead.email}
                              </p>
                            )}
                            {lead.phone && (
                              <p className="text-zinc-500 flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {lead.phone}
                              </p>
                            )}
                          </div>
                          <div>
                            {lead.address && (
                              <p className="text-zinc-400 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {lead.address}
                              </p>
                            )}
                            <p className="text-zinc-500">
                              {lead.city}, {lead.state} {lead.zip_code}
                            </p>
                          </div>
                          <div className="text-xs text-zinc-500">
                            {lead.sic_code && <p>SIC: {lead.sic_code}</p>}
                            {lead.employees && (
                              <p className="flex items-center gap-1">
                                <Users className="h-3 w-3" /> {lead.employees}{" "}
                                employees
                              </p>
                            )}
                            {lead.revenue && (
                              <p className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />{" "}
                                {lead.revenue}
                              </p>
                            )}
                          </div>
                        </div>

                        {enrichedProperties[lead.id] && (
                          <div className="mt-3 p-3 bg-zinc-700/50 rounded-lg">
                            <p className="text-xs text-zinc-400 mb-2">
                              Property Details:
                            </p>
                            <div className="flex gap-4 text-sm flex-wrap">
                              <span className="text-green-400">
                                Value: $
                                {sf(
                                  enrichedProperties[lead.id].estimated_value,
                                ) || "N/A"}
                              </span>
                              <span className="text-cyan-400">
                                Equity:{" "}
                                {enrichedProperties[lead.id].equity_percent ||
                                  0}
                                %
                              </span>
                              <span className="text-purple-400">
                                $
                                {sf(
                                  enrichedProperties[lead.id].equity_amount,
                                ) || "N/A"}
                              </span>
                              <span className="text-zinc-400">
                                Owner:{" "}
                                {enrichedProperties[lead.id].owner_first_name}{" "}
                                {enrichedProperties[lead.id].owner_last_name}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
