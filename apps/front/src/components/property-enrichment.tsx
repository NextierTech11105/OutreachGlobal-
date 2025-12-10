"use client";


import { sf, sfd } from "@/lib/utils/safe-format";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileSpreadsheet,
  Sparkles,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface CSVRecord {
  [key: string]: string;
}

interface EnrichmentResult {
  original: CSVRecord;
  enriched: Record<string, unknown> | null;
  status: "success" | "not_found" | "error";
  error?: string;
}

// Common PropWire/property CSV column names
const ADDRESS_COLUMNS = [
  "address",
  "property_address",
  "street_address",
  "full_address",
  "situs_address",
  "property address",
  "street address",
];

const STREET_COLUMNS = ["street", "street_name", "address_line_1", "address1"];
const CITY_COLUMNS = ["city", "property_city", "situs_city"];
const STATE_COLUMNS = ["state", "property_state", "situs_state", "st"];
const ZIP_COLUMNS = ["zip", "zipcode", "zip_code", "postal_code", "property_zip"];

function autoDetectColumn(headers: string[], candidates: string[]): string {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  for (const candidate of candidates) {
    const idx = lowerHeaders.indexOf(candidate.toLowerCase());
    if (idx !== -1) return headers[idx];
  }
  return "";
}

export function PropertyEnrichment() {
  const [step, setStep] = useState<"upload" | "map" | "enrich" | "results">("upload");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [records, setRecords] = useState<CSVRecord[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({
    address: "",
    street: "",
    city: "",
    state: "",
    zip: "",
  });
  const [isEnriching, setIsEnriching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<EnrichmentResult[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    enriched: number;
    notFound: number;
    errors: number;
  } | null>(null);

  const parseCSV = (text: string): { headers: string[]; records: CSVRecord[] } => {
    const lines = text.split("\n").filter(l => l.trim());
    if (lines.length < 2) return { headers: [], records: [] };

    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    const records: CSVRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const record: CSVRecord = {};
      headers.forEach((h, idx) => {
        record[h] = values[idx] || "";
      });
      records.push(record);
    }

    return { headers, records };
  };

  const handleFileSelect = async (file: File) => {
    setCsvFile(file);
    const text = await file.text();
    const { headers, records } = parseCSV(text);

    if (headers.length === 0) {
      toast.error("Could not parse CSV file");
      return;
    }

    setHeaders(headers);
    setRecords(records);

    // Auto-detect column mappings
    setMapping({
      address: autoDetectColumn(headers, ADDRESS_COLUMNS),
      street: autoDetectColumn(headers, STREET_COLUMNS),
      city: autoDetectColumn(headers, CITY_COLUMNS),
      state: autoDetectColumn(headers, STATE_COLUMNS),
      zip: autoDetectColumn(headers, ZIP_COLUMNS),
    });

    setStep("map");
    toast.success(`Loaded ${records.length} records from ${file.name}`);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) {
      handleFileSelect(file);
    } else {
      toast.error("Please upload a CSV file");
    }
  }, []);

  const handleEnrich = async () => {
    if (!mapping.address && (!mapping.street || !mapping.city || !mapping.state)) {
      toast.error("Please map at least the full address OR street + city + state");
      return;
    }

    setIsEnriching(true);
    setProgress(0);
    setResults([]);

    try {
      // Process in smaller batches for progress updates
      const batchSize = 10;
      const allResults: EnrichmentResult[] = [];

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);

        const response = await fetch("/api/enrichment/csv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            records: batch,
            mapping,
            batchSize,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Enrichment failed");
        }

        allResults.push(...data.results);
        setProgress(Math.round(((i + batch.length) / records.length) * 100));
      }

      setResults(allResults);
      setSummary({
        total: allResults.length,
        enriched: allResults.filter(r => r.status === "success").length,
        notFound: allResults.filter(r => r.status === "not_found").length,
        errors: allResults.filter(r => r.status === "error").length,
      });
      setStep("results");
      toast.success(`Enriched ${allResults.filter(r => r.status === "success").length}/${allResults.length} properties`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enrichment failed");
    } finally {
      setIsEnriching(false);
    }
  };

  const downloadEnrichedCSV = () => {
    if (results.length === 0) return;

    // Build enriched CSV with original + enriched columns
    const enrichedHeaders = [
      ...headers,
      "rei_id",
      "rei_address",
      "rei_city",
      "rei_state",
      "rei_zip",
      "rei_county",
      "rei_property_type",
      "rei_bedrooms",
      "rei_bathrooms",
      "rei_sqft",
      "rei_lot_sqft",
      "rei_year_built",
      "rei_estimated_value",
      "rei_estimated_equity",
      "rei_equity_percent",
      "rei_owner_name",
      "rei_owner_occupied",
      "rei_absentee_owner",
      "rei_high_equity",
      "rei_pre_foreclosure",
      "rei_vacant",
      "rei_free_clear",
      "rei_last_sale_date",
      "rei_last_sale_amount",
      "enrichment_status",
    ];

    const rows = results.map(r => {
      const originalValues = headers.map(h => `"${(r.original[h] || "").replace(/"/g, '""')}"`);
      const e = r.enriched as Record<string, unknown> | null;
      const addr = e?.address as Record<string, string> | undefined;

      const enrichedValues = [
        e?.id || e?.propertyId || "",
        addr?.address || addr?.street || "",
        addr?.city || "",
        addr?.state || "",
        addr?.zip || "",
        addr?.county || "",
        e?.propertyType || "",
        e?.bedrooms || "",
        e?.bathrooms || "",
        e?.squareFeet || "",
        e?.lotSquareFeet || "",
        e?.yearBuilt || "",
        e?.estimatedValue || "",
        e?.estimatedEquity || "",
        e?.equityPercent || "",
        [e?.owner1FirstName, e?.owner1LastName].filter(Boolean).join(" ") || e?.companyName || "",
        e?.ownerOccupied ? "Yes" : "No",
        e?.absenteeOwner ? "Yes" : "No",
        e?.highEquity ? "Yes" : "No",
        e?.preForeclosure ? "Yes" : "No",
        e?.vacant ? "Yes" : "No",
        e?.freeClear ? "Yes" : "No",
        e?.lastSaleDate || "",
        e?.lastSaleAmount || "",
        r.status,
      ].map(v => `"${String(v || "").replace(/"/g, '""')}"`);

      return [...originalValues, ...enrichedValues].join(",");
    });

    const csv = [enrichedHeaders.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enriched-${csvFile?.name || "properties"}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setStep("upload");
    setCsvFile(null);
    setHeaders([]);
    setRecords([]);
    setMapping({ address: "", street: "", city: "", state: "", zip: "" });
    setResults([]);
    setSummary(null);
    setProgress(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Property Enrichment
        </CardTitle>
        <CardDescription>
          Upload PropWire/property CSV and enrich with RealEstateAPI data
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Step 1: Upload */}
        {step === "upload" && (
          <div
            className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => document.getElementById("csv-input")?.click()}
          >
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              Drop your PropWire CSV here
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse
            </p>
            <Input
              id="csv-input"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
            <Badge variant="secondary">Supports PropWire, ListSource, PropStream formats</Badge>
          </div>
        )}

        {/* Step 2: Map Columns */}
        {step === "map" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{csvFile?.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {records.length} records, {headers.length} columns
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="h-4 w-4 mr-1" /> Change File
              </Button>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Map Address Columns</h4>
              <p className="text-sm text-muted-foreground">
                Map your CSV columns to address fields. Use either full address OR individual parts.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Address Column</Label>
                  <Select value={mapping.address} onValueChange={(v) => setMapping(m => ({ ...m, address: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- None --</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Street Column</Label>
                  <Select value={mapping.street} onValueChange={(v) => setMapping(m => ({ ...m, street: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- None --</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>City Column</Label>
                  <Select value={mapping.city} onValueChange={(v) => setMapping(m => ({ ...m, city: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- None --</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>State Column</Label>
                  <Select value={mapping.state} onValueChange={(v) => setMapping(m => ({ ...m, state: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- None --</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>ZIP Column</Label>
                  <Select value={mapping.zip} onValueChange={(v) => setMapping(m => ({ ...m, zip: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- None --</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-6">
                <h4 className="font-medium mb-2">Preview (first 3 records)</h4>
                <div className="border rounded overflow-auto max-h-40">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Address Preview</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.slice(0, 3).map((r, i) => {
                        const addr = mapping.address
                          ? r[mapping.address]
                          : [r[mapping.street], r[mapping.city], r[mapping.state], r[mapping.zip]]
                              .filter(Boolean)
                              .join(", ");
                        return (
                          <TableRow key={i}>
                            <TableCell>{addr || "(no address)"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Cancel</Button>
              <Button onClick={handleEnrich} disabled={isEnriching}>
                <Sparkles className="mr-2 h-4 w-4" />
                Enrich {records.length} Properties
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Enriching */}
        {step === "map" && isEnriching && (
          <div className="space-y-4 mt-6">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Enriching properties with RealEstateAPI...</span>
            </div>
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground">
              {Math.round((progress / 100) * records.length)} of {records.length} processed
            </p>
          </div>
        )}

        {/* Step 4: Results */}
        {step === "results" && summary && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{summary.total}</div>
                  <p className="text-sm text-muted-foreground">Total Records</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-green-500">{summary.enriched}</div>
                  <p className="text-sm text-muted-foreground">Enriched</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-yellow-500">{summary.notFound}</div>
                  <p className="text-sm text-muted-foreground">Not Found</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-red-500">{summary.errors}</div>
                  <p className="text-sm text-muted-foreground">Errors</p>
                </CardContent>
              </Card>
            </div>

            {/* Results Table */}
            <div className="border rounded overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Original Address</TableHead>
                    <TableHead>Enriched Address</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Est. Value</TableHead>
                    <TableHead>Equity %</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.slice(0, 50).map((r, i) => {
                    const orig = mapping.address
                      ? r.original[mapping.address]
                      : [r.original[mapping.street], r.original[mapping.city], r.original[mapping.state]]
                          .filter(Boolean)
                          .join(", ");
                    const e = r.enriched as Record<string, unknown> | null;
                    const addr = e?.address as Record<string, string> | undefined;

                    return (
                      <TableRow key={i}>
                        <TableCell className="max-w-[200px] truncate">{orig}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {addr?.address || addr?.street || "-"}
                        </TableCell>
                        <TableCell>
                          {[e?.owner1FirstName, e?.owner1LastName].filter(Boolean).join(" ") ||
                            (e?.companyName as string) || "-"}
                        </TableCell>
                        <TableCell>
                          {e?.estimatedValue
                            ? `$${Numbersf(e.estimatedValue)}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {e?.equityPercent ? `${e.equityPercent}%` : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {e?.highEquity && <Badge variant="secondary" className="text-xs">High Equity</Badge>}
                            {e?.absenteeOwner && <Badge variant="secondary" className="text-xs">Absentee</Badge>}
                            {e?.vacant && <Badge variant="secondary" className="text-xs">Vacant</Badge>}
                            {e?.preForeclosure && <Badge variant="destructive" className="text-xs">Pre-FC</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {r.status === "success" ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : r.status === "not_found" ? (
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {results.length > 50 && (
              <p className="text-sm text-muted-foreground text-center">
                Showing first 50 of {results.length} results. Download CSV for full data.
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={reset}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Another File
              </Button>
              <Button onClick={downloadEnrichedCSV}>
                <Download className="mr-2 h-4 w-4" />
                Download Enriched CSV
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
