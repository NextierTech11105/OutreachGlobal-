"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Upload,
  Download,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  UserSearch,
  FileSpreadsheet,
  Trash2,
  Send,
  Copy,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SkipTraceInput {
  id?: string;
  full_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

interface SkipTraceResult {
  input: SkipTraceInput;
  success: boolean;
  mobile?: string;
  email?: string;
  all_phones?: Array<{ number: string; type: string }>;
  all_emails?: Array<{ email: string; type: string }>;
  confidence?: number;
  error?: string;
}

interface UsageInfo {
  today: number;
  limit: number;
  remaining: number;
}

interface SignalHouseCampaign {
  campaignId: string;
  brandId: string;
  usecase: string;
  status?: string;
}

export default function SkipTracePage() {
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<SkipTraceResult[]>([]);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(
    new Set(),
  );
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [campaigns, setCampaigns] = useState<SignalHouseCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");

  // Single lookup form
  const [singleInput, setSingleInput] = useState({
    full_name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });

  // Batch upload state
  const [batchRecords, setBatchRecords] = useState<SkipTraceInput[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // Fetch usage and campaigns on mount
  useEffect(() => {
    fetchUsage();
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/signalhouse/campaign");
      const data = await res.json();
      if (data.success && data.campaigns) {
        setCampaigns(data.campaigns);
        if (data.campaigns.length > 0) {
          setSelectedCampaign(data.campaigns[0].campaignId);
        }
      }
    } catch (err) {
      console.error("Failed to fetch SignalHouse campaigns:", err);
    }
  };

  const fetchUsage = async () => {
    try {
      const response = await fetch("/api/enrichment/usbiz-skip-trace");
      const data = await response.json();
      setIsConfigured(data.configured);
      setUsage(data.usage);
    } catch {
      setUsage({ today: 0, limit: 2000, remaining: 2000 });
    }
  };

  // Single skip trace
  const handleSingleSkipTrace = async () => {
    if (!singleInput.full_name || !singleInput.address) {
      toast.error("Full name and address are required");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("/api/enrichment/usbiz-skip-trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(singleInput),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Skip trace failed");
        return;
      }

      if (data.success) {
        const result: SkipTraceResult = {
          input: singleInput,
          success: true,
          mobile: data.mobile,
          email: data.email,
          all_phones: data.all_phones,
          all_emails: data.all_emails,
        };
        setResults((prev) => [result, ...prev]);
        toast.success(
          `Found ${data.all_phones?.length || 0} phones, ${data.all_emails?.length || 0} emails`,
        );
        setSingleInput({
          full_name: "",
          address: "",
          city: "",
          state: "",
          zip: "",
        });
      } else {
        const result: SkipTraceResult = {
          input: singleInput,
          success: false,
          error: data.error || "No results found",
        };
        setResults((prev) => [result, ...prev]);
        toast.error(data.error || "No results found");
      }

      if (data.usage) {
        setUsage(data.usage);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Skip trace failed");
    } finally {
      setIsProcessing(false);
    }
  };

  // Parse CSV file - supports USBizData format
  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setCsvFile(file);
      const reader = new FileReader();

      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());

        if (lines.length < 2) {
          toast.error("CSV must have header row and at least one data row");
          return;
        }

        const headers = lines[0]
          .toLowerCase()
          .split(",")
          .map((h) => h.trim().replace(/"/g, ""));

        // Map USBizData column names:
        // - "Contact Name" or "contact_name" → full_name
        // - "Street Address" or "street_address" → address
        // - "City", "State", "Zip Code" → location
        const nameIndex = headers.findIndex(
          (h) =>
            h.includes("contact_name") ||
            h.includes("contact name") ||
            h.includes("full_name") ||
            h.includes("fullname") ||
            h.includes("owner") ||
            h === "name",
        );
        const addressIndex = headers.findIndex(
          (h) =>
            h.includes("street_address") ||
            h.includes("street address") ||
            h.includes("address") ||
            h.includes("street"),
        );
        const cityIndex = headers.findIndex(
          (h) => h === "city" || h.includes("city"),
        );
        const stateIndex = headers.findIndex(
          (h) => h === "state" || h.includes("state"),
        );
        const zipIndex = headers.findIndex(
          (h) =>
            h === "zip" ||
            h.includes("zip_code") ||
            h.includes("zip code") ||
            h.includes("postal"),
        );

        if (nameIndex === -1 || addressIndex === -1) {
          toast.error(
            "CSV must have 'Contact Name' and 'Street Address' columns",
          );
          return;
        }

        const records: SkipTraceInput[] = [];
        let skippedCorp = 0;

        for (let i = 1; i < lines.length; i++) {
          // Handle CSV with quoted values containing commas
          const values: string[] = [];
          let current = "";
          let inQuotes = false;
          for (const char of lines[i]) {
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === "," && !inQuotes) {
              values.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          values.push(current.trim());

          const full_name = values[nameIndex]?.replace(/"/g, "") || "";
          const address = values[addressIndex]?.replace(/"/g, "") || "";
          const city =
            cityIndex !== -1 ? values[cityIndex]?.replace(/"/g, "") || "" : "";
          const state =
            stateIndex !== -1
              ? values[stateIndex]?.replace(/"/g, "") || ""
              : "";
          const zip =
            zipIndex !== -1 ? values[zipIndex]?.replace(/"/g, "") || "" : "";

          // Skip LLC/Trust/Corporate names - they won't match in skip trace
          const invalidPatterns =
            /\b(LLC|INC|CORP|LTD|LP|TRUST|ESTATE|COMPANY|CO\.|HOLDINGS|PROPERTIES)\b/i;
          if (full_name && address) {
            if (invalidPatterns.test(full_name)) {
              skippedCorp++;
            } else {
              records.push({
                id: `row_${i}`,
                full_name,
                address,
                city,
                state,
                zip,
              });
            }
          }
        }

        setBatchRecords(records);
        if (skippedCorp > 0) {
          toast.success(
            `Loaded ${records.length} records (skipped ${skippedCorp} corporate/LLC names)`,
          );
        } else {
          toast.success(`Loaded ${records.length} records from CSV`);
        }
      };

      reader.readAsText(file);
    },
    [],
  );

  // Process batch
  const handleBatchSkipTrace = async () => {
    if (batchRecords.length === 0) {
      toast.error("No records to process");
      return;
    }

    if (usage && batchRecords.length > usage.remaining) {
      toast.error(`Only ${usage.remaining} skip traces remaining today`);
      return;
    }

    setIsProcessing(true);
    setBatchProgress({ current: 0, total: batchRecords.length });

    try {
      const response = await fetch("/api/enrichment/usbiz-skip-trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: batchRecords }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Batch skip trace failed");
        return;
      }

      if (data.results) {
        setResults((prev) => [...data.results, ...prev]);
        toast.success(
          `Processed ${data.stats.total}: ${data.stats.matched} matched, ${data.stats.with_mobile} with mobile`,
        );
      }

      if (data.usage) {
        setUsage(data.usage);
      }

      setBatchRecords([]);
      setCsvFile(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Batch skip trace failed",
      );
    } finally {
      setIsProcessing(false);
      setBatchProgress({ current: 0, total: 0 });
    }
  };

  // Export results to CSV
  const handleExportResults = () => {
    if (results.length === 0) {
      toast.error("No results to export");
      return;
    }

    const csv = [
      [
        "Full Name",
        "Address",
        "City",
        "State",
        "ZIP",
        "Mobile",
        "Email",
        "All Phones",
        "All Emails",
        "Status",
      ].join(","),
      ...results.map((r) =>
        [
          `"${r.input.full_name}"`,
          `"${r.input.address}"`,
          r.input.city,
          r.input.state,
          r.input.zip,
          r.mobile || "",
          r.email || "",
          `"${r.all_phones?.map((p) => `${p.number} (${p.type})`).join("; ") || ""}"`,
          `"${r.all_emails?.map((e) => `${e.email} (${e.type})`).join("; ") || ""}"`,
          r.success ? "Success" : r.error || "Failed",
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skip-trace-results-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Results exported");
  };

  // Copy phone to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  // Toggle result selection
  const toggleResultSelection = (id: string) => {
    setSelectedResults((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all results
  const selectAllResults = () => {
    const successfulResults = results.filter((r) => r.success);
    if (selectedResults.size === successfulResults.length) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(
        new Set(successfulResults.map((_, i) => `result_${i}`)),
      );
    }
  };

  // Add selected to SignalHouse campaign for SMS
  const handleAddToSmsQueue = async () => {
    const selectedRecords = results.filter(
      (r, i) => selectedResults.has(`result_${i}`) && r.success && r.mobile,
    );

    if (selectedRecords.length === 0) {
      toast.error("No records with mobile phones selected");
      return;
    }

    if (!selectedCampaign) {
      toast.error("Please select a SignalHouse campaign first");
      return;
    }

    try {
      // Send to SignalHouse via bulk-send API
      const response = await fetch("/api/signalhouse/bulk-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: selectedCampaign,
          contacts: selectedRecords.map((r) => ({
            to: r.mobile,
            firstName: r.input.full_name.split(" ")[0],
            lastName: r.input.full_name.split(" ").slice(1).join(" "),
            email: r.email,
            address: `${r.input.address}, ${r.input.city}, ${r.input.state} ${r.input.zip}`.trim(),
            source: "skip_trace",
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          `Queued ${data.queued || selectedRecords.length} contacts for SignalHouse campaign ${selectedCampaign}`,
        );
        setSelectedResults(new Set());
      } else {
        toast.error(data.error || "Failed to queue for SignalHouse");
      }
    } catch (err) {
      toast.error("Failed to connect to SignalHouse");
      console.error("SignalHouse error:", err);
    }
  };

  const successfulResults = results.filter((r) => r.success);
  const withMobile = results.filter((r) => r.success && r.mobile);
  const withEmail = results.filter((r) => r.success && r.email);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 space-y-6 p-8 pt-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <UserSearch className="h-8 w-8" />
              Skip Trace
            </h2>
            <p className="text-muted-foreground mt-1">
              Find mobile phones and emails for business owners - contactability
              is the standard
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={cn(
                "text-sm py-1 px-3",
                !isConfigured
                  ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                  : usage && usage.remaining < 100
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    : "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
              )}
            >
              {!isConfigured
                ? "Not Configured"
                : usage
                  ? `${usage.remaining.toLocaleString()} / ${usage.limit.toLocaleString()} remaining`
                  : "Loading..."}
            </Badge>
            <Button variant="outline" size="sm" onClick={fetchUsage}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!isConfigured && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800 dark:text-red-300">
                    RealEstateAPI Not Configured
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                    Set REAL_ESTATE_API_KEY environment variable to enable skip
                    tracing.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Skip Trace Input</CardTitle>
              <CardDescription>
                Owner name + business address only. No company names.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="single">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="single">
                    <Search className="h-4 w-4 mr-2" />
                    Single
                  </TabsTrigger>
                  <TabsTrigger value="batch">
                    <Upload className="h-4 w-4 mr-2" />
                    Batch
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="single" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      placeholder="John Smith"
                      value={singleInput.full_name}
                      onChange={(e) =>
                        setSingleInput({
                          ...singleInput,
                          full_name: e.target.value,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Owner/CEO/Partner - NO LLC, Trust, or Corp names
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Street Address *</Label>
                    <Input
                      id="address"
                      placeholder="123 Business Ave"
                      value={singleInput.address}
                      onChange={(e) =>
                        setSingleInput({
                          ...singleInput,
                          address: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        placeholder="Miami"
                        value={singleInput.city}
                        onChange={(e) =>
                          setSingleInput({
                            ...singleInput,
                            city: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        placeholder="FL"
                        maxLength={2}
                        value={singleInput.state}
                        onChange={(e) =>
                          setSingleInput({
                            ...singleInput,
                            state: e.target.value.toUpperCase(),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip">ZIP</Label>
                      <Input
                        id="zip"
                        placeholder="33101"
                        maxLength={5}
                        value={singleInput.zip}
                        onChange={(e) =>
                          setSingleInput({
                            ...singleInput,
                            zip: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSingleSkipTrace}
                    disabled={isProcessing || !isConfigured}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Skip Trace
                      </>
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="batch" className="space-y-4 mt-4">
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload USBizData CSV: Contact Name, Street Address, City,
                      State, Zip Code
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label htmlFor="csv-upload">
                      <Button variant="outline" asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          Choose File
                        </span>
                      </Button>
                    </label>
                    {csvFile && (
                      <p className="text-sm mt-2 font-medium">{csvFile.name}</p>
                    )}
                  </div>

                  {batchRecords.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {batchRecords.length} records loaded
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setBatchRecords([]);
                            setCsvFile(null);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="max-h-32 overflow-auto text-xs bg-muted rounded p-2">
                        {batchRecords.slice(0, 5).map((r, i) => (
                          <div key={i} className="truncate">
                            {r.full_name} - {r.address}
                          </div>
                        ))}
                        {batchRecords.length > 5 && (
                          <div className="text-muted-foreground mt-1">
                            +{batchRecords.length - 5} more...
                          </div>
                        )}
                      </div>
                      <Button
                        className="w-full"
                        onClick={handleBatchSkipTrace}
                        disabled={isProcessing || !isConfigured}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing {batchProgress.current}/
                            {batchProgress.total}...
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4 mr-2" />
                            Skip Trace All ({batchRecords.length})
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Results</CardTitle>
                <CardDescription>
                  {results.length} total · {successfulResults.length} matched ·{" "}
                  {withMobile.length} with mobile
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {/* Campaign Selector for SignalHouse */}
                {campaigns.length > 0 && (
                  <select
                    value={selectedCampaign}
                    onChange={(e) => setSelectedCampaign(e.target.value)}
                    className="h-9 px-3 py-1 text-sm border rounded-md bg-background"
                  >
                    {campaigns.map((c) => (
                      <option key={c.campaignId} value={c.campaignId}>
                        {c.campaignId} {c.status ? `(${c.status})` : ""}
                      </option>
                    ))}
                  </select>
                )}
                {selectedResults.size > 0 && (
                  <Button size="sm" onClick={handleAddToSmsQueue}>
                    <Send className="h-4 w-4 mr-2" />
                    Send to SignalHouse ({selectedResults.size})
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportResults}
                  disabled={results.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                {results.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setResults([])}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isProcessing && batchProgress.total > 0 && (
                <div className="mb-4">
                  <Progress
                    value={(batchProgress.current / batchProgress.total) * 100}
                  />
                  <p className="text-sm text-muted-foreground mt-1 text-center">
                    Processing {batchProgress.current} of {batchProgress.total}
                  </p>
                </div>
              )}

              {results.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <UserSearch className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No skip trace results yet</p>
                  <p className="text-sm">
                    Enter a name + address to find contact info
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={
                              selectedResults.size ===
                                successfulResults.length &&
                              successfulResults.length > 0
                            }
                            onCheckedChange={selectAllResults}
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.slice(0, 50).map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Checkbox
                              checked={selectedResults.has(`result_${i}`)}
                              onCheckedChange={() =>
                                toggleResultSelection(`result_${i}`)
                              }
                              disabled={!r.success || !r.mobile}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {r.input.full_name}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {[r.input.city, r.input.state]
                              .filter(Boolean)
                              .join(", ")}
                          </TableCell>
                          <TableCell>
                            {r.mobile ? (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-green-500" />
                                <span className="text-sm font-mono">
                                  {r.mobile}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => copyToClipboard(r.mobile!)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : r.all_phones?.length ? (
                              <span className="text-sm text-muted-foreground">
                                {r.all_phones.length} phones (no mobile)
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {r.email ? (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3 text-blue-500" />
                                <span className="text-sm truncate max-w-[150px]">
                                  {r.email}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => copyToClipboard(r.email!)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {r.success ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 inline" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500 inline" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {results.length > 50 && (
                    <div className="p-2 text-center text-sm text-muted-foreground bg-muted">
                      Showing 50 of {results.length} results. Export CSV for
                      full data.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            {results.length > 0 && (
              <CardFooter className="border-t bg-muted/30">
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>{successfulResults.length} matched</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-green-500" />
                    <span>{withMobile.length} with mobile</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-500" />
                    <span>{withEmail.length} with email</span>
                  </div>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
