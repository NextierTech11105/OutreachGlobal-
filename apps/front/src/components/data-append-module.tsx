"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { InfoIcon as InfoCircle, PlusCircle, Download, CheckCircle, XCircle, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface EnrichmentResult {
  propertyId: string;
  address: string;
  success: boolean;
  data?: {
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
    sqft?: number;
    yearBuilt?: number;
    estimatedValue?: number;
    estimatedEquity?: number;
    ownerName?: string;
    mortgageAmount?: number;
    mortgageLender?: string;
    lastSaleDate?: string;
    lastSaleAmount?: number;
    preForeclosure?: boolean;
    absenteeOwner?: boolean;
  };
  error?: string;
}

interface UsageInfo {
  used: number;
  limit: number;
  remaining: number;
}

export function DataAppendModule() {
  const [provider, setProvider] = useState("realestateapi");
  const [isProcessing, setIsProcessing] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [results, setResults] = useState<EnrichmentResult[]>([]);
  const [propertyIds, setPropertyIds] = useState("");
  const [dataFields, setDataFields] = useState({
    propertyCharacteristics: true,
    ownerInfo: true,
    taxAssessment: true,
    mortgageInfo: true,
    foreclosureStatus: true,
    marketValue: true,
    salesHistory: true,
  });

  // Fetch usage on mount
  useEffect(() => {
    fetch("/api/enrichment/usage")
      .then((r) => r.json())
      .then((data) => {
        setUsage({
          used: data.daily?.used || 0,
          limit: data.daily?.limit || 5000,
          remaining: data.daily?.remaining || 5000,
        });
      })
      .catch(() => {
        setUsage({ used: 0, limit: 5000, remaining: 5000 });
      });
  }, []);

  const handleToggleField = (field: string) => {
    setDataFields((prev) => ({
      ...prev,
      [field]: !prev[field as keyof typeof dataFields],
    }));
  };

  const handleAppendData = async () => {
    const ids = propertyIds
      .split("\n")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (ids.length === 0) {
      toast.error("Please enter property IDs (one per line)");
      return;
    }

    if (ids.length > 250) {
      toast.error("Maximum 250 properties at a time");
      return;
    }

    setIsProcessing(true);
    setResults([]);

    try {
      // Use batch property detail API
      const response = await fetch("/api/property-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Enrichment failed");
        return;
      }

      const enrichmentResults: EnrichmentResult[] = (data.results || []).map((r: any) => ({
        propertyId: r.id || r.propertyId,
        address: r.address?.address || r.address?.street || "",
        success: r.success !== false,
        data: r.success !== false ? {
          propertyType: r.propertyType,
          bedrooms: r.bedrooms,
          bathrooms: r.bathrooms,
          sqft: r.squareFeet || r.sqft,
          yearBuilt: r.yearBuilt,
          estimatedValue: r.estimatedValue || r.avm,
          estimatedEquity: r.estimatedEquity,
          ownerName: [r.owner1FirstName, r.owner1LastName].filter(Boolean).join(" ") || r.ownerName,
          mortgageAmount: r.mortgage1Amount || r.openLoanAmount,
          mortgageLender: r.mortgage1Lender,
          lastSaleDate: r.lastSaleDate,
          lastSaleAmount: r.lastSaleAmount,
          preForeclosure: r.preForeclosure,
          absenteeOwner: r.absenteeOwner,
        } : undefined,
        error: r.error,
      }));

      setResults(enrichmentResults);
      const successful = enrichmentResults.filter((r) => r.success).length;
      toast.success(`Enriched ${successful}/${ids.length} properties`);
    } catch (error: any) {
      toast.error(error.message || "Enrichment failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResults = () => {
    if (results.length === 0) return;
    const csv = [
      ["Property ID", "Address", "Type", "Beds", "Baths", "SqFt", "Year", "Value", "Equity", "Owner", "Mortgage", "Last Sale", "Success"].join(","),
      ...results.map((r) =>
        [
          r.propertyId,
          `"${r.address}"`,
          r.data?.propertyType || "",
          r.data?.bedrooms || "",
          r.data?.bathrooms || "",
          r.data?.sqft || "",
          r.data?.yearBuilt || "",
          r.data?.estimatedValue || "",
          r.data?.estimatedEquity || "",
          `"${r.data?.ownerName || ""}"`,
          r.data?.mortgageAmount || "",
          r.data?.lastSaleDate || "",
          r.success ? "Yes" : "No",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `property-enrichment-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Append Property Data</h3>
              <p className="text-sm text-muted-foreground">
                Enrich property records with RealEstateAPI data
              </p>
            </div>
            <Badge
              variant="outline"
              className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
            >
              {usage ? `${usage.remaining.toLocaleString()} / ${usage.limit.toLocaleString()} remaining` : "Loading..."}
            </Badge>
          </div>

          <Tabs defaultValue="ids">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ids">Property IDs</TabsTrigger>
              <TabsTrigger value="single">Single Property</TabsTrigger>
            </TabsList>

            <TabsContent value="ids" className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="propertyIds">Enter Property IDs (one per line, max 250)</Label>
                <Textarea
                  id="propertyIds"
                  placeholder="12345678&#10;23456789&#10;34567890"
                  rows={6}
                  value={propertyIds}
                  onChange={(e) => setPropertyIds(e.target.value)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Get property IDs from search results or skip trace
              </p>
            </TabsContent>

            <TabsContent value="single" className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="singleId">Property ID</Label>
                <Input
                  id="singleId"
                  placeholder="Enter property ID"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const input = e.target as HTMLInputElement;
                      setPropertyIds(input.value);
                      handleAppendData();
                    }
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="provider">Data Provider</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        RealEstateAPI provides comprehensive property data including owner info, valuations, and mortgage details.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realestateapi">RealEstateAPI (Configured)</SelectItem>
                  <SelectItem value="attom" disabled>ATTOM Data (Not configured)</SelectItem>
                  <SelectItem value="corelogic" disabled>CoreLogic (Not configured)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data Fields to Append</Label>
              <div className="grid grid-cols-2 gap-2 rounded-md border p-4">
                {Object.entries(dataFields).map(([field, checked]) => (
                  <div key={field} className="flex items-center space-x-2">
                    <Checkbox
                      id={field}
                      checked={checked}
                      onCheckedChange={() => handleToggleField(field)}
                    />
                    <Label htmlFor={field} className="text-sm capitalize">
                      {field.replace(/([A-Z])/g, " $1").trim()}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  Results ({results.filter((r) => r.success).length}/{results.length} enriched)
                </h3>
                <Button variant="outline" size="sm" onClick={downloadResults}>
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
              </div>
              <div className="max-h-64 overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Address</th>
                      <th className="p-2 text-left">Owner</th>
                      <th className="p-2 text-right">Value</th>
                      <th className="p-2 text-right">Equity</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.slice(0, 50).map((r) => (
                      <tr key={r.propertyId} className="border-t">
                        <td className="p-2">{r.address || "-"}</td>
                        <td className="p-2">{r.data?.ownerName || "-"}</td>
                        <td className="p-2 text-right">
                          {r.data?.estimatedValue ? `$${r.data.estimatedValue.toLocaleString()}` : "-"}
                        </td>
                        <td className="p-2 text-right">
                          {r.data?.estimatedEquity ? `$${r.data.estimatedEquity.toLocaleString()}` : "-"}
                        </td>
                        <td className="p-2 text-center">
                          {r.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500 inline" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500 inline" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => { setResults([]); setPropertyIds(""); }}>
          {results.length > 0 ? "Clear Results" : "Cancel"}
        </Button>
        <Button onClick={handleAppendData} disabled={isProcessing}>
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Append Data
              <PlusCircle className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
