"use client";

import { useState, useCallback, useMemo } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Download,
  Users,
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
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [filters, setFilters] = useState<PropertyFilters>(defaultFilters);
  const [results, setResults] = useState<PropertyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedProperty, setSelectedProperty] = useState<PropertyResult | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 100;

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

      // Transform API response to our format
      const properties: PropertyResult[] = (data.properties || data.results || []).map(
        (p: Record<string, unknown>) => ({
          id: p.id || p.property_id || crypto.randomUUID(),
          address: p.address || p.street_address || "",
          city: p.city || "",
          state: p.state || "",
          zip: p.zip || p.zipcode || "",
          propertyType: p.property_type || p.propertyType || "Unknown",
          beds: p.beds || p.bedrooms,
          baths: p.baths || p.bathrooms,
          sqft: p.sqft || p.square_feet || p.living_area,
          yearBuilt: p.year_built || p.yearBuilt,
          lotSize: p.lot_size || p.lotSize,
          estimatedValue: p.estimated_value || p.estimatedValue || p.avm,
          equity: p.equity || p.estimated_equity,
          equityPercent: p.equity_percent,
          mortgageBalance: p.mortgage_balance,
          ownerName: p.owner_name || p.ownerName,
          ownerPhone: p.owner_phone || p.phone,
          ownerEmail: p.owner_email || p.email,
          mailingAddress: p.mailing_address,
          latitude: p.latitude || p.lat,
          longitude: p.longitude || p.lng || p.lon,
          preForeclosure: p.pre_foreclosure,
          foreclosure: p.foreclosure,
          vacant: p.vacant,
          absenteeOwner: p.absentee_owner,
          mlsStatus: p.mls_status,
          daysOnMarket: p.days_on_market,
        })
      );

      setResults(properties);
      setTotalCount(data.total || data.count || properties.length);
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
    [handleSearch]
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
      (r) => selectedIds.size === 0 || selectedIds.has(r.id)
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

    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join(
      "\n"
    );

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `properties-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results, selectedIds]);

  const handlePropertyClick = useCallback((property: PropertyMarker) => {
    const full = results.find((r) => r.id === property.id);
    if (full) {
      setSelectedProperty(full);
    }
  }, [results]);

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
            <Badge variant="secondary">
              {selectedIds.size} selected
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" disabled={selectedIds.size === 0}>
            <Users className="h-4 w-4 mr-1" />
            Create Leads
          </Button>
          <Button size="sm" disabled={selectedIds.size === 0}>
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
            filtersCollapsed ? "w-0 overflow-hidden" : "w-80"
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
                formatCurrency={formatCurrency}
                formatNumber={formatNumber}
              />
            </ScrollArea>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min((page - 1) * pageSize + 1, totalCount)} -{" "}
              {Math.min(page * pageSize, totalCount)} of {formatNumber(totalCount)}
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

      {/* Property Detail Sheet */}
      <Sheet open={!!selectedProperty} onOpenChange={() => setSelectedProperty(null)}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          {selectedProperty && (
            <PropertyDetailPanel
              property={selectedProperty}
              formatCurrency={formatCurrency}
              formatNumber={formatNumber}
            />
          )}
        </SheetContent>
      </Sheet>
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
  formatCurrency: (value?: number) => string;
  formatNumber: (value?: number) => string;
}

function PropertyTable({
  results,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onRowClick,
  formatCurrency,
  formatNumber,
}: PropertyTableProps) {
  return (
    <Table>
      <TableHeader className="sticky top-0 bg-background z-10">
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={results.length > 0 && selectedIds.size === results.length}
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
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.map((property) => (
          <TableRow
            key={property.id}
            className={cn(
              "cursor-pointer hover:bg-muted/50",
              selectedIds.has(property.id) && "bg-muted"
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
            <TableCell className="text-right font-mono">{property.beds || "-"}</TableCell>
            <TableCell className="text-right font-mono">{property.baths || "-"}</TableCell>
            <TableCell className="text-right font-mono">
              {formatNumber(property.sqft)}
            </TableCell>
            <TableCell className="text-right font-mono">
              {formatCurrency(property.estimatedValue)}
            </TableCell>
            <TableCell className="text-right font-mono text-green-600">
              {formatCurrency(property.equity)}
            </TableCell>
            <TableCell className="truncate max-w-[150px]">{property.ownerName || "-"}</TableCell>
          </TableRow>
        ))}
        {results.length === 0 && (
          <TableRow>
            <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
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
              <div className="font-medium">{property.mlsStatus || "Not Listed"}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {property.preForeclosure && (
              <Badge variant="destructive">Pre-Foreclosure</Badge>
            )}
            {property.foreclosure && <Badge variant="destructive">Foreclosure</Badge>}
            {property.vacant && <Badge variant="secondary">Vacant</Badge>}
            {property.absenteeOwner && <Badge variant="secondary">Absentee</Badge>}
          </div>
        </TabsContent>

        <TabsContent value="owner" className="space-y-4 mt-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">{property.ownerName || "Unknown"}</div>
                <div className="text-xs text-muted-foreground">Property Owner</div>
              </div>
            </div>

            {property.ownerPhone && (
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${property.ownerPhone}`} className="text-primary hover:underline">
                  {property.ownerPhone}
                </a>
              </div>
            )}

            {property.ownerEmail && (
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${property.ownerEmail}`} className="text-primary hover:underline">
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
              <div className="text-sm text-muted-foreground">Estimated Value</div>
              <div className="font-bold text-lg">
                {formatCurrency(property.estimatedValue)}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
              <div className="text-sm text-muted-foreground">Equity</div>
              <div className="font-bold text-lg text-green-600">
                {formatCurrency(property.equity)}
                {property.equityPercent && (
                  <span className="text-sm ml-1">({property.equityPercent}%)</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground">Mortgage Balance</div>
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
