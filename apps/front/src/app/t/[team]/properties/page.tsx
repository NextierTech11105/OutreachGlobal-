"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Download, Loader2, MapPin, Home } from "lucide-react";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  propertyType: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  estimatedValue?: number;
  equity?: number;
  ownerName?: string;
}

export default function PropertiesPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Property[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [propertyType, setPropertyType] = useState("");

  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (state && state !== "__all__") params.set("state", state);
      if (city) params.set("city", city);
      if (zip) params.set("zip", zip);
      if (propertyType && propertyType !== "__all__") params.set("property_type", propertyType);
      params.set("size", "50");

      const response = await fetch(`/api/property-search?${params.toString()}`);
      const data = await response.json();

      if (data.error) {
        console.error("Search error:", data.error);
        return;
      }

      const rawData = data.data || data.properties || data.results || [];
      const properties: Property[] = rawData.map((p: Record<string, unknown>) => {
        const addr = p.address as Record<string, string> | string;
        return {
          id: String(p.id || p.propertyId || crypto.randomUUID()),
          address: typeof addr === 'object' ? addr?.address || addr?.street : addr || "",
          city: typeof addr === 'object' ? addr?.city : p.city as string || "",
          state: typeof addr === 'object' ? addr?.state : p.state as string || "",
          zip: typeof addr === 'object' ? addr?.zip : p.zip as string || "",
          propertyType: String(p.propertyType || p.property_type || "Unknown"),
          beds: Number(p.bedrooms || p.beds) || undefined,
          baths: Number(p.bathrooms || p.baths) || undefined,
          sqft: Number(p.squareFeet || p.sqft) || undefined,
          estimatedValue: Number(p.estimatedValue || p.estimated_value) || undefined,
          equity: Number(p.estimatedEquity || p.estimated_equity) || undefined,
          ownerName: [p.owner1FirstName, p.owner1LastName].filter(Boolean).join(' ') || p.ownerName as string || undefined,
        };
      });

      setResults(properties);
      setTotalCount(data.resultCount || data.recordCount || data.total || properties.length);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  }, [state, city, zip, propertyType]);

  const handleExportCSV = () => {
    const headers = ["Address", "City", "State", "ZIP", "Type", "Beds", "Baths", "SqFt", "Value", "Equity", "Owner"];
    const rows = results.map((p) => [
      p.address, p.city, p.state, p.zip, p.propertyType,
      p.beds || "", p.baths || "", p.sqft || "", p.estimatedValue || "", p.equity || "", p.ownerName || ""
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Home className="h-6 w-6" />
            Property Search
          </h1>
          <p className="text-muted-foreground">Search for properties and build lists</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-lg px-3 py-1">
            <MapPin className="h-4 w-4 mr-1" />
            {totalCount.toLocaleString()} properties
          </Badge>
          <Button variant="outline" onClick={handleExportCSV} disabled={results.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Any State</SelectItem>
                  {US_STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input placeholder="Enter city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>ZIP Code</Label>
              <Input placeholder="Enter ZIP" value={zip} onChange={(e) => setZip(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Property Type</Label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger>
                  <SelectValue placeholder="Any type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Any Type</SelectItem>
                  <SelectItem value="SFR">Single Family</SelectItem>
                  <SelectItem value="MFR">Multi-Family</SelectItem>
                  <SelectItem value="CONDO">Condo</SelectItem>
                  <SelectItem value="LAND">Land</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Search Properties
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead>City</TableHead>
                <TableHead>State</TableHead>
                <TableHead>ZIP</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Beds</TableHead>
                <TableHead className="text-right">Baths</TableHead>
                <TableHead className="text-right">SqFt</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Equity</TableHead>
                <TableHead>Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((property) => (
                <TableRow key={property.id}>
                  <TableCell className="font-medium">{property.address}</TableCell>
                  <TableCell>{property.city}</TableCell>
                  <TableCell>{property.state}</TableCell>
                  <TableCell>{property.zip}</TableCell>
                  <TableCell><Badge variant="outline">{property.propertyType}</Badge></TableCell>
                  <TableCell className="text-right">{property.beds || "-"}</TableCell>
                  <TableCell className="text-right">{property.baths || "-"}</TableCell>
                  <TableCell className="text-right">{property.sqft?.toLocaleString() || "-"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(property.estimatedValue)}</TableCell>
                  <TableCell className="text-right text-green-600">{formatCurrency(property.equity)}</TableCell>
                  <TableCell>{property.ownerName || "-"}</TableCell>
                </TableRow>
              ))}
              {results.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    No properties found. Enter search criteria and click Search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
