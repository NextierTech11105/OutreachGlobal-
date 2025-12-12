"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PropertyMap, type PropertyMarker } from "@/components/property-map";
import {
  PropertyFiltersPanel,
  type PropertyFilters,
} from "@/components/property-search/property-filters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Download,
  Users,
  User,
  Rocket,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Home,
  DollarSign,
  Save,
  Loader2,
  Grid3X3,
  List,
  Map,
  Search,
  UserSearch,
  CheckCircle,
  Eye,
} from "lucide-react";
import { UniversalDetailModal } from "@/components/universal-detail-modal";
import { cn } from "@/lib/utils";
import { useCurrentTeam } from "@/features/team/team.context";
import {
  performSkipTrace,
  type SkipTraceInput,
} from "@/lib/services/data-enrichment-service";
import { toast } from "sonner";

// REST API helper to create lead (avoids Apollo bundling issues)
async function createLeadViaAPI(
  teamId: string,
  input: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    source?: string;
    tags?: string[];
  },
) {
  const response = await fetch("/api/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        mutation CreateLead($teamId: ID!, $input: CreateLeadInput!) {
          createLead(teamId: $teamId, input: $input) {
            lead { id }
          }
        }
      `,
      variables: { teamId, input },
    }),
  });
  const data = await response.json();
  if (data.errors)
    throw new Error(data.errors[0]?.message || "Failed to create lead");
  return data.data;
}

interface PropertyResult {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  propertyType: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
  lotSize?: number;
  estimatedValue?: number;
  equity?: number;
  equityPercent?: number;
  mortgageBalance?: number;
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  mailingAddress?: string;
  latitude?: number;
  longitude?: number;
  preForeclosure?: boolean;
  foreclosure?: boolean;
  vacant?: boolean;
  absenteeOwner?: boolean;
  mlsStatus?: string;
  daysOnMarket?: number;
}

type ViewMode = "split" | "map" | "table";

const defaultFilters: PropertyFilters = {
  radius: 25,
};

export function PropertyTerminal() {
  const router = useRouter();
  const { team } = useCurrentTeam();

  const [filters, setFilters] = useState<PropertyFilters>(defaultFilters);
  const [results, setResults] = useState<PropertyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedProperty, setSelectedProperty] =
    useState<PropertyResult | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 100;

  // Skip Trace & Lead Creation state
  const [skipTraceDialogOpen, setSkipTraceDialogOpen] = useState(false);
  const [skipTraceLoading, setSkipTraceLoading] = useState(false);
  const [skipTraceResults, setSkipTraceResults] = useState<
    Map<string, { phone?: string; email?: string }>
  >(new Map());
  const [createLeadsDialogOpen, setCreateLeadsDialogOpen] = useState(false);
  const [createLeadsLoading, setCreateLeadsLoading] = useState(false);
  const [createdLeadsCount, setCreatedLeadsCount] = useState(0);

  // Convert results to map markers
  const markers: PropertyMarker[] = useMemo(() => {
    return results
      .filter((r) => r.latitude && r.longitude)
      .map((r) => ({
        id: r.id,
        lat: r.latitude!,
        lng: r.longitude!,
        address: r.address,
        city: r.city,
        state: r.state,
        zip: r.zip,
        propertyType: r.propertyType,
        estimatedValue: r.estimatedValue,
        equity: r.equity,
        beds: r.beds,
        baths: r.baths,
        sqft: r.sqft,
        ownerName: r.ownerName,
      }));
  }, [results]);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      // Build query from filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "" && value !== false) {
          params.set(key, String(value));
        }
      });

      params.set("size", String(pageSize));
      params.set("from", String((page - 1) * pageSize));

      const response = await fetch(`/api/property-search?${params.toString()}`);
      const data = await response.json();

      if (data.error) {
        console.error("Search error:", data.error);
        return;
      }

      // Transform API response to our format - handles both direct API and wrapped responses
      const rawData = data.data || data.properties || data.results || [];
      const properties: PropertyResult[] = rawData.map(
        (p: Record<string, unknown>) => {
          // Handle nested address object from RealEstateAPI
          const addr = p.address as Record<string, string> | string;
          const addressStr =
            typeof addr === "object"
              ? addr?.address || addr?.street
              : addr || "";
          const cityStr =
            typeof addr === "object" ? addr?.city : (p.city as string) || "";
          const stateStr =
            typeof addr === "object" ? addr?.state : (p.state as string) || "";
          const zipStr =
            typeof addr === "object"
              ? addr?.zip
              : (p.zip as string) || (p.zipcode as string) || "";

          return {
            id: String(
              p.id || p.propertyId || p.property_id || crypto.randomUUID(),
            ),
            address: addressStr,
            city: cityStr,
            state: stateStr,
            zip: zipStr,
            propertyType: String(
              p.propertyType || p.property_type || "Unknown",
            ),
            beds: Number(p.bedrooms || p.beds) || undefined,
            baths: Number(p.bathrooms || p.baths) || undefined,
            sqft:
              Number(p.squareFeet || p.sqft || p.building_size) || undefined,
            yearBuilt: Number(p.yearBuilt || p.year_built) || undefined,
            lotSize: Number(p.lotSquareFeet || p.lot_size) || undefined,
            estimatedValue:
              Number(p.estimatedValue || p.estimated_value) || undefined,
            equity:
              Number(p.estimatedEquity || p.estimated_equity) || undefined,
            equityPercent:
              Number(p.equityPercent || p.equity_percent) || undefined,
            mortgageBalance:
              Number(p.openMortgageBalance || p.mortgage_balance) || undefined,
            ownerName:
              [p.owner1FirstName, p.owner1LastName].filter(Boolean).join(" ") ||
              (p.ownerName as string) ||
              undefined,
            ownerPhone: (p.owner_phone as string) || undefined,
            ownerEmail: (p.owner_email as string) || undefined,
            mailingAddress:
              typeof p.mailAddress === "object"
                ? (p.mailAddress as Record<string, string>)?.address
                : undefined,
            latitude: Number(p.latitude) || undefined,
            longitude: Number(p.longitude) || undefined,
            preForeclosure: Boolean(p.preForeclosure || p.pre_foreclosure),
            foreclosure: Boolean(p.foreclosure),
            vacant: Boolean(p.vacant),
            absenteeOwner: Boolean(p.absenteeOwner || p.absentee_owner),
            mlsStatus: (p.mlsStatus as string) || undefined,
            daysOnMarket:
              Number(p.mlsDaysOnMarket || p.days_on_market) || undefined,
          };
        },
      );

      setResults(properties);
      setTotalCount(
        data.resultCount ||
          data.recordCount ||
          data.total ||
          data.count ||
          properties.length,
      );
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  const handleMapSearch = useCallback(
    (bounds: { lat: number; lng: number; radius: number }) => {
      setFilters((prev) => ({
        ...prev,
        latitude: bounds.lat,
        longitude: bounds.lng,
        radius: bounds.radius,
      }));
      // Trigger search after setting location
      setTimeout(() => handleSearch(), 100);
    },
    [handleSearch],
  );

  const handleReset = useCallback(() => {
    setFilters(defaultFilters);
    setResults([]);
    setSelectedIds(new Set());
    setPage(1);
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map((r) => r.id)));
    }
  }, [selectedIds.size, results]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleExportCSV = useCallback(() => {
    const toExport = results.filter(
      (r) => selectedIds.size === 0 || selectedIds.has(r.id),
    );

    const headers = [
      "Address",
      "City",
      "State",
      "ZIP",
      "Type",
      "Beds",
      "Baths",
      "SqFt",
      "Year Built",
      "Value",
      "Equity",
      "Owner Name",
      "Phone",
      "Email",
    ];

    const rows = toExport.map((p) => [
      p.address,
      p.city,
      p.state,
      p.zip,
      p.propertyType,
      p.beds || "",
      p.baths || "",
      p.sqft || "",
      p.yearBuilt || "",
      p.estimatedValue || "",
      p.equity || "",
      p.ownerName || "",
      p.ownerPhone || "",
      p.ownerEmail || "",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `properties-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results, selectedIds]);

  const handlePropertyClick = useCallback(
    (property: PropertyMarker) => {
      const full = results.find((r) => r.id === property.id);
      if (full) {
        setSelectedProperty(full);
        setDetailModalOpen(true);
      }
    },
    [results],
  );

  const handleOpenDetail = useCallback((property: PropertyResult) => {
    setSelectedProperty(property);
    setDetailModalOpen(true);
  }, []);

  // Skip Trace handler - finds contact info for selected properties
  const handleSkipTrace = useCallback(async () => {
    const selectedProperties = results.filter((r) => selectedIds.has(r.id));
    if (selectedProperties.length === 0) return;

    setSkipTraceLoading(true);
    setSkipTraceDialogOpen(true);

    try {
      // Prepare inputs for skip trace
      const inputs: SkipTraceInput[] = selectedProperties.map((p) => {
        const nameParts = p.ownerName?.split(" ") || [];
        return {
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(" "),
          address: p.address,
          city: p.city,
          state: p.state,
          zip: p.zip,
        };
      });

      // Perform skip trace
      const results = await performSkipTrace(inputs, {
        provider: "tlo",
        fields: { name: true, phone: true, email: true, address: true },
      });

      // Map results back to property IDs
      const newSkipTraceResults = new Map<
        string,
        { phone?: string; email?: string }
      >();
      selectedProperties.forEach((p, index) => {
        const result = results[index];
        if (result) {
          newSkipTraceResults.set(p.id, {
            phone: result.phones?.[0]?.number,
            email: result.emails?.[0]?.email,
          });
        }
      });

      setSkipTraceResults(newSkipTraceResults);
      toast.success(`Skip traced ${results.length} properties`);
    } catch (error) {
      console.error("Skip trace failed:", error);
      toast.error("Skip trace failed. Please try again.");
    } finally {
      setSkipTraceLoading(false);
    }
  }, [results, selectedIds]);

  // Create Leads handler - converts selected properties to leads
  const handleCreateLeads = useCallback(async () => {
    if (!team?.id) {
      toast.error("No team selected");
      return;
    }

    const selectedProperties = results.filter((r) => selectedIds.has(r.id));
    if (selectedProperties.length === 0) return;

    // Check 5k max limit
    if (selectedProperties.length > 5000) {
      toast.error(
        "Maximum 5,000 leads per batch. Please select fewer properties.",
      );
      return;
    }

    setCreateLeadsLoading(true);
    setCreateLeadsDialogOpen(true);
    setCreatedLeadsCount(0);

    try {
      let successCount = 0;

      // Create leads in batches of 10 for better UX
      for (const property of selectedProperties) {
        const nameParts = property.ownerName?.split(" ") || [];
        const skipTraceData = skipTraceResults.get(property.id);

        await createLeadViaAPI(team.id, {
          firstName: nameParts[0] || undefined,
          lastName: nameParts.slice(1).join(" ") || undefined,
          phone: skipTraceData?.phone || property.ownerPhone || undefined,
          email: skipTraceData?.email || property.ownerEmail || undefined,
          address: property.address,
          city: property.city,
          state: property.state,
          zipCode: property.zip,
          source: "Property Search",
          tags: ["Property Search", property.propertyType].filter(Boolean),
        });

        successCount++;
        setCreatedLeadsCount(successCount);
      }

      toast.success(`Created ${successCount} leads successfully!`);
    } catch (error) {
      console.error("Create leads failed:", error);
      toast.error("Failed to create some leads. Please try again.");
    } finally {
      setCreateLeadsLoading(false);
    }
  }, [team?.id, results, selectedIds, skipTraceResults]);

  // Launch Campaign handler - navigates to campaign creation with selected leads
  const handleLaunchCampaign = useCallback(() => {
    if (!team?.id) {
      toast.error("No team selected");
      return;
    }

    const selectedProperties = results.filter((r) => selectedIds.has(r.id));
    if (selectedProperties.length === 0) {
      toast.error("No properties selected");
      return;
    }

    // Store selected properties in session storage for campaign creation
    const campaignData = selectedProperties.map((p) => {
      const skipTraceData = skipTraceResults.get(p.id);
      const nameParts = p.ownerName?.split(" ") || [];
      return {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(" "),
        phone: skipTraceData?.phone || p.ownerPhone,
        email: skipTraceData?.email || p.ownerEmail,
        address: p.address,
        city: p.city,
        state: p.state,
        zip: p.zip,
        propertyType: p.propertyType,
        estimatedValue: p.estimatedValue,
        equity: p.equity,
      };
    });

    sessionStorage.setItem("campaignLeads", JSON.stringify(campaignData));

    // Navigate to campaign creation
    router.push(
      `/t/${team.slug}/campaigns/new?source=property-search&count=${selectedProperties.length}`,
    );
  }, [team?.id, team?.slug, results, selectedIds, skipTraceResults, router]);

  const formatCurrency = (value?: number) => {
    if (!value) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value?: number) => {
    if (!value) return "-";
    return new Intl.NumberFormat("en-US").format(value);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "split" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("split")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "map" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("map")}
            >
              <Map className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Badge variant="outline" className="font-mono">
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <MapPin className="h-3 w-3 mr-1" />
            )}
            {formatNumber(totalCount)} properties
          </Badge>

          {selectedIds.size > 0 && (
            <Badge variant="secondary">{selectedIds.size} selected</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={selectedIds.size === 0}
            onClick={handleSkipTrace}
          >
            <UserSearch className="h-4 w-4 mr-1" />
            Skip Trace
            {skipTraceResults.size > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1">
                {skipTraceResults.size}
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={selectedIds.size === 0}
            onClick={handleCreateLeads}
          >
            <Users className="h-4 w-4 mr-1" />
            Create Leads
          </Button>
          <Button
            size="sm"
            disabled={selectedIds.size === 0}
            onClick={handleLaunchCampaign}
          >
            <Rocket className="h-4 w-4 mr-1" />
            Launch Campaign
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Filters Panel */}
        <div
          className={cn(
            "border-r bg-background transition-all duration-200",
            filtersCollapsed ? "w-0 overflow-hidden" : "w-80",
          )}
        >
          <PropertyFiltersPanel
            filters={filters}
            onChange={setFilters}
            onSearch={handleSearch}
            onReset={handleReset}
            loading={loading}
          />
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setFiltersCollapsed(!filtersCollapsed)}
          className="flex items-center justify-center w-4 bg-muted/50 hover:bg-muted transition-colors"
        >
          {filtersCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        {/* Results Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {viewMode === "split" ? (
            <div className="flex-1 flex">
              {/* Map */}
              <div className="flex-1 border-r">
                <PropertyMap
                  properties={markers}
                  onSearchArea={handleMapSearch}
                  onPropertyClick={handlePropertyClick}
                  loading={loading}
                />
              </div>

              {/* Table */}
              <div className="w-1/2 flex flex-col">
                <ScrollArea className="flex-1">
                  <PropertyTable
                    results={results}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onToggleSelectAll={toggleSelectAll}
                    onRowClick={(p) => setSelectedProperty(p)}
                    onViewDetail={handleOpenDetail}
                    formatCurrency={formatCurrency}
                    formatNumber={formatNumber}
                  />
                </ScrollArea>
              </div>
            </div>
          ) : viewMode === "map" ? (
            <div className="flex-1">
              <PropertyMap
                properties={markers}
                onSearchArea={handleMapSearch}
                onPropertyClick={handlePropertyClick}
                loading={loading}
              />
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <PropertyTable
                results={results}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
                onRowClick={(p) => setSelectedProperty(p)}
                onViewDetail={handleOpenDetail}
                formatCurrency={formatCurrency}
                formatNumber={formatNumber}
              />
            </ScrollArea>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min((page - 1) * pageSize + 1, totalCount)} -{" "}
              {Math.min(page * pageSize, totalCount)} of{" "}
              {formatNumber(totalCount)}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <Badge variant="outline" className="font-mono">
                Page {page} / {Math.ceil(totalCount / pageSize) || 1}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * pageSize >= totalCount || loading}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Universal Detail Modal */}
      <UniversalDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        record={selectedProperty}
        recordType="property"
        onAction={(action, data) => {
          console.log("Action:", action, data);
          if (action === "add-lead") {
            handleCreateLeads();
          } else if (action === "add-campaign") {
            handleLaunchCampaign();
          }
        }}
      />

      {/* Skip Trace Dialog */}
      <Dialog open={skipTraceDialogOpen} onOpenChange={setSkipTraceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserSearch className="h-5 w-5" />
              Skip Trace Properties
            </DialogTitle>
            <DialogDescription>
              Finding contact information for {selectedIds.size} selected
              properties
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            {skipTraceLoading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Searching TLO database for contact information...
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <div className="text-center">
                  <p className="font-medium">Skip trace complete!</p>
                  <p className="text-sm text-muted-foreground">
                    Found contact info for {skipTraceResults.size} properties
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSkipTraceDialogOpen(false)}
              disabled={skipTraceLoading}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setSkipTraceDialogOpen(false);
                handleCreateLeads();
              }}
              disabled={skipTraceLoading || skipTraceResults.size === 0}
            >
              <Users className="h-4 w-4 mr-1" />
              Create Leads
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Leads Dialog */}
      <Dialog
        open={createLeadsDialogOpen}
        onOpenChange={setCreateLeadsDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Creating Leads
            </DialogTitle>
            <DialogDescription>
              Converting {selectedIds.size} properties to leads
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            {createLeadsLoading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {createdLeadsCount} / {selectedIds.size}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Creating leads...
                  </p>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{
                      width: `${(createdLeadsCount / selectedIds.size) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <div className="text-center">
                  <p className="font-medium">Leads created successfully!</p>
                  <p className="text-sm text-muted-foreground">
                    {createdLeadsCount} leads added to your team
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateLeadsDialogOpen(false)}
              disabled={createLeadsLoading}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setCreateLeadsDialogOpen(false);
                handleLaunchCampaign();
              }}
              disabled={createLeadsLoading}
            >
              <Rocket className="h-4 w-4 mr-1" />
              Launch Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Property Table Component
interface PropertyTableProps {
  results: PropertyResult[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onRowClick: (property: PropertyResult) => void;
  onViewDetail: (property: PropertyResult) => void;
  formatCurrency: (value?: number) => string;
  formatNumber: (value?: number) => string;
}

function PropertyTable({
  results,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onRowClick,
  onViewDetail,
  formatCurrency,
  formatNumber,
}: PropertyTableProps) {
  return (
    <Table>
      <TableHeader className="sticky top-0 bg-background z-10">
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={
                results.length > 0 && selectedIds.size === results.length
              }
              onCheckedChange={onToggleSelectAll}
            />
          </TableHead>
          <TableHead>Address</TableHead>
          <TableHead>City</TableHead>
          <TableHead className="w-12">ST</TableHead>
          <TableHead className="w-16">ZIP</TableHead>
          <TableHead className="w-20">Type</TableHead>
          <TableHead className="w-16 text-right">Beds</TableHead>
          <TableHead className="w-16 text-right">Baths</TableHead>
          <TableHead className="w-20 text-right">SqFt</TableHead>
          <TableHead className="w-24 text-right">Value</TableHead>
          <TableHead className="w-24 text-right">Equity</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead className="w-12 text-center">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.map((property) => (
          <TableRow
            key={property.id}
            className={cn(
              "cursor-pointer hover:bg-muted/50",
              selectedIds.has(property.id) && "bg-muted",
            )}
            onClick={() => onRowClick(property)}
          >
            <TableCell onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={selectedIds.has(property.id)}
                onCheckedChange={() => onToggleSelect(property.id)}
              />
            </TableCell>
            <TableCell className="font-medium">{property.address}</TableCell>
            <TableCell>{property.city}</TableCell>
            <TableCell>{property.state}</TableCell>
            <TableCell>{property.zip}</TableCell>
            <TableCell>
              <Badge variant="outline" className="text-xs">
                {property.propertyType}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-mono">
              {property.beds || "-"}
            </TableCell>
            <TableCell className="text-right font-mono">
              {property.baths || "-"}
            </TableCell>
            <TableCell className="text-right font-mono">
              {formatNumber(property.sqft)}
            </TableCell>
            <TableCell className="text-right font-mono">
              {formatCurrency(property.estimatedValue)}
            </TableCell>
            <TableCell className="text-right font-mono text-green-600">
              {formatCurrency(property.equity)}
            </TableCell>
            <TableCell className="truncate max-w-[150px]">
              {property.ownerName || "-"}
            </TableCell>
            <TableCell
              className="text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-primary/10"
                onClick={() => onViewDetail(property)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
        {results.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={13}
              className="text-center py-8 text-muted-foreground"
            >
              No properties found. Use the filters or draw on the map to search.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

// Property Detail Panel
interface PropertyDetailPanelProps {
  property: PropertyResult;
  formatCurrency: (value?: number) => string;
  formatNumber: (value?: number) => string;
}

function PropertyDetailPanel({
  property,
  formatCurrency,
  formatNumber,
}: PropertyDetailPanelProps) {
  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-start gap-2">
          <Home className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <div>{property.address}</div>
            <div className="text-sm font-normal text-muted-foreground">
              {property.city}, {property.state} {property.zip}
            </div>
          </div>
        </SheetTitle>
      </SheetHeader>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="w-full">
          <TabsTrigger value="overview" className="flex-1">
            Overview
          </TabsTrigger>
          <TabsTrigger value="owner" className="flex-1">
            Owner
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex-1">
            Financial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Property Type</div>
              <div className="font-medium">{property.propertyType}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Year Built</div>
              <div className="font-medium">{property.yearBuilt || "-"}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Beds / Baths</div>
              <div className="font-medium">
                {property.beds || "-"} / {property.baths || "-"}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Square Feet</div>
              <div className="font-medium">{formatNumber(property.sqft)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Lot Size</div>
              <div className="font-medium">
                {property.lotSize ? `${property.lotSize} acres` : "-"}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">MLS Status</div>
              <div className="font-medium">
                {property.mlsStatus || "Not Listed"}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {property.preForeclosure && (
              <Badge variant="destructive">Pre-Foreclosure</Badge>
            )}
            {property.foreclosure && (
              <Badge variant="destructive">Foreclosure</Badge>
            )}
            {property.vacant && <Badge variant="secondary">Vacant</Badge>}
            {property.absenteeOwner && (
              <Badge variant="secondary">Absentee</Badge>
            )}
          </div>
        </TabsContent>

        <TabsContent value="owner" className="space-y-4 mt-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">
                  {property.ownerName || "Unknown"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Property Owner
                </div>
              </div>
            </div>

            {property.ownerPhone && (
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`tel:${property.ownerPhone}`}
                  className="text-primary hover:underline"
                >
                  {property.ownerPhone}
                </a>
              </div>
            )}

            {property.ownerEmail && (
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${property.ownerEmail}`}
                  className="text-primary hover:underline"
                >
                  {property.ownerEmail}
                </a>
              </div>
            )}

            {property.mailingAddress && (
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">{property.mailingAddress}</div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" size="sm">
              <Users className="h-4 w-4 mr-1" />
              Create Lead
            </Button>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4 mt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">
                Estimated Value
              </div>
              <div className="font-bold text-lg">
                {formatCurrency(property.estimatedValue)}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
              <div className="text-sm text-muted-foreground">Equity</div>
              <div className="font-bold text-lg text-green-600">
                {formatCurrency(property.equity)}
                {property.equityPercent && (
                  <span className="text-sm ml-1">
                    ({property.equityPercent}%)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground">
                Mortgage Balance
              </div>
              <div className="font-medium">
                {formatCurrency(property.mortgageBalance)}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-6 space-y-2">
        <Button className="w-full">
          <Rocket className="h-4 w-4 mr-2" />
          Add to Campaign
        </Button>
        <Button variant="outline" className="w-full">
          <Save className="h-4 w-4 mr-2" />
          Save to List
        </Button>
      </div>
    </>
  );
}
