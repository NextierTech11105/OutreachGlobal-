"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PropertySearchResult } from "@/lib/services/real-estate-api";
import { Database, List, Copy, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SearchResultsProps {
  results?: PropertySearchResult[];
  propertyIds?: string[];
  resultCount?: number;
  idsOnly?: boolean;
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  SFR: "Single Family",
  MFR: "Multi-Family",
  CONDO: "Condo",
  TOWNHOUSE: "Townhouse",
  LAND: "Vacant Land",
  MOBILE: "Mobile Home",
  OTHER: "Other",
};

export function SearchResults({
  results = [],
  propertyIds = [],
  resultCount = 0,
  idsOnly = false,
}: SearchResultsProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [enrichCount, setEnrichCount] = useState("1000");
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (idsOnly) {
      if (selectedIds.size === propertyIds.length) {
        setSelectedIds(new Set());
      } else {
        setSelectedIds(new Set(propertyIds));
      }
    } else {
      if (selectedIds.size === results.length) {
        setSelectedIds(new Set());
      } else {
        setSelectedIds(new Set(results.map(r => r.id)));
      }
    }
  };

  const handleCopyIds = () => {
    const ids = idsOnly ? propertyIds : results.map(r => r.id);
    navigator.clipboard.writeText(ids.join("\n"));
    toast.success(`Copied ${ids.length} property IDs to clipboard`);
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      if (idsOnly) {
        const csv = "Property ID\n" + propertyIds.join("\n");
        downloadCSV(csv, "property-ids.csv");
      } else {
        const headers = ["ID", "Address", "City", "State", "ZIP", "Type", "Equity %", "Value", "Beds", "Baths", "SqFt", "Year Built"];
        const rows = results.map(r => [
          r.id,
          r.address?.street || "",
          r.address?.city || "",
          r.address?.state || "",
          r.address?.zip || "",
          r.propertyType,
          r.equityPercent,
          r.estimatedValue,
          r.bedrooms || "",
          r.bathrooms || "",
          r.squareFeet || "",
          r.yearBuilt || "",
        ]);
        const csv = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
        downloadCSV(csv, "property-results.csv");
      }
      toast.success("Export complete");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getDistressIndicator = (result: PropertySearchResult) => {
    if (result.preForeclosure) return "Pre-Foreclosure";
    if (result.foreclosure) return "Foreclosure";
    if (result.auction) return "Auction";
    if (result.taxLien) return "Tax Lien";
    if (result.vacant) return "Vacant";
    if (result.reo) return "REO";
    return null;
  };

  const filteredResults = filter
    ? results.filter(r =>
        r.id.toLowerCase().includes(filter.toLowerCase()) ||
        r.address?.street?.toLowerCase().includes(filter.toLowerCase()) ||
        r.address?.city?.toLowerCase().includes(filter.toLowerCase())
      )
    : results;

  const filteredIds = filter
    ? propertyIds.filter(id => id.toLowerCase().includes(filter.toLowerCase()))
    : propertyIds;

  const paginatedResults = filteredResults.slice(page * pageSize, (page + 1) * pageSize);
  const paginatedIds = filteredIds.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil((idsOnly ? filteredIds.length : filteredResults.length) / pageSize);

  if (idsOnly) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-medium">Property IDs</h3>
              <p className="text-sm text-muted-foreground">
                {resultCount.toLocaleString()} total matching properties
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleCopyIds}>
              <Copy className="h-4 w-4 mr-2" />
              Copy All
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isExporting}>
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export CSV
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Input
            className="max-w-sm"
            placeholder="Filter IDs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <Badge variant="secondary">{filteredIds.length.toLocaleString()} IDs</Badge>
        </div>

        <Card>
          <ScrollArea className="h-[400px]">
            <div className="p-4">
              <div className="grid grid-cols-4 gap-2">
                {paginatedIds.map((id) => (
                  <div
                    key={id}
                    className={`flex items-center gap-2 p-2 rounded border text-sm font-mono ${
                      selectedIds.has(id) ? "bg-primary/10 border-primary" : "bg-muted/30"
                    }`}
                    onClick={() => toggleSelect(id)}
                  >
                    <Checkbox
                      checked={selectedIds.has(id)}
                      onCheckedChange={() => toggleSelect(id)}
                    />
                    <span className="truncate">{id}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </Card>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, filteredIds.length)} of {filteredIds.length.toLocaleString()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center space-x-2">
            <Label htmlFor="enrich-count" className="text-sm">
              Enrich Top:
            </Label>
            <Select value={enrichCount} onValueChange={setEnrichCount}>
              <SelectTrigger id="enrich-count" className="w-24">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="250">250</SelectItem>
                <SelectItem value="500">500</SelectItem>
                <SelectItem value="1000">1,000</SelectItem>
                <SelectItem value="2500">2,500</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button>
            <List className="h-4 w-4 mr-2" />
            Enrich {selectedIds.size > 0 ? `${selectedIds.size} Selected` : `Top ${enrichCount}`}
          </Button>
        </div>
      </div>
    );
  }

  // Full results view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Search Results</h3>
          <p className="text-sm text-muted-foreground">
            {resultCount.toLocaleString()} properties found, showing {results.length} detailed
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export CSV
          </Button>
          <Button>Enrich Selected</Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Input
          className="max-w-sm"
          placeholder="Filter results..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <Button variant="outline">Filter</Button>
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.size > 0 && selectedIds.size === results.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Property ID</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Equity</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Distress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedResults.map((result) => {
              const distress = getDistressIndicator(result);
              const address = result.address
                ? `${result.address.street}, ${result.address.city}, ${result.address.state} ${result.address.zip}`
                : "N/A";

              return (
                <TableRow key={result.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(result.id)}
                      onCheckedChange={() => toggleSelect(result.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{result.id}</TableCell>
                  <TableCell className="max-w-[250px] truncate">{address}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {PROPERTY_TYPE_LABELS[result.propertyType] || result.propertyType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        result.equityPercent >= 80
                          ? "default"
                          : result.equityPercent <= 30
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {result.equityPercent}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    ${result.estimatedValue?.toLocaleString() || "N/A"}
                  </TableCell>
                  <TableCell>
                    {distress ? (
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      >
                        {distress}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {paginatedResults.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No results found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, filteredResults.length)} of {filteredResults.length.toLocaleString()} results
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {Math.max(1, totalPages)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
