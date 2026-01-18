"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Zap,
  Phone,
  Mail,
  MapPin,
  Building2,
  Users,
} from "lucide-react";

// Campaign verticals for isolated campaigns
const CAMPAIGN_VERTICALS = [
  { id: "PLUMBING", name: "Plumbing Companies", icon: "🔧", color: "#3B82F6" },
  { id: "TRUCKING", name: "Trucking Companies", icon: "🚛", color: "#EF4444" },
  { id: "CPA", name: "CPAs & Accountants", icon: "📊", color: "#10B981" },
  { id: "CONSULTANT", name: "Consultants", icon: "💼", color: "#8B5CF6" },
  { id: "AGENT_BROKER", name: "Agents & Brokers", icon: "🏠", color: "#F59E0B" },
  { id: "SALES_PRO", name: "Sales Professionals", icon: "📈", color: "#EC4899" },
  { id: "SOLOPRENEUR", name: "Solopreneurs", icon: "🚀", color: "#06B6D4" },
  { id: "PE_BOUTIQUE", name: "PE Boutiques", icon: "💎", color: "#6366F1" },
  { id: "GENERAL", name: "General / Other", icon: "📁", color: "#6B7280" },
] as const;

// Enrichment costs
const COSTS = {
  TRACERFY_PER_RECORD: 0.02,
  TRESTLE_PER_PHONE: 0.03,
  AVG_PHONES_PER_RECORD: 3,
  SMS_PER_MESSAGE: 0.0075,
} as const;

function estimateCosts(recordCount: number) {
  const tracerfy = recordCount * COSTS.TRACERFY_PER_RECORD;
  const trestle = recordCount * COSTS.AVG_PHONES_PER_RECORD * COSTS.TRESTLE_PER_PHONE;
  const enrichmentTotal = tracerfy + trestle;
  const estimatedQualified = Math.floor(recordCount * 0.33); // 33% qualify rate
  const estimatedSMS = estimatedQualified * COSTS.SMS_PER_MESSAGE;
  return { tracerfy, trestle, enrichmentTotal, estimatedQualified, estimatedSMS, total: enrichmentTotal + estimatedSMS };
}

type ImportStep = "upload" | "configure" | "preview" | "processing" | "complete";

interface ImportResult {
  success: boolean;
  message: string;
  stats: {
    totalRows: number;
    inserted: number;
    errors: number;
    duplicates: number;
  };
  errors?: string[];
}

interface PipelineResult {
  success: boolean;
  campaign: {
    id: string;
    name: string;
    status: string;
    totalLeads: number;
    stats: {
      totalRecords: number;
      enriched: number;
      scored: number;
      qualified: number;
      rejected: number;
      qualifyRate: number;
    };
    costs: {
      tracerfy: number;
      trestle: number;
      enrichmentTotal: number;
      estimatedSMS: number;
      costPerQualifiedLead: number;
    };
    signalHouse: {
      campaignId: string;
      brandId: string;
      fromPhone: string;
    } | null;
  };
  message: string;
}

export default function ImportPage() {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState("business");
  const [vertical, setVertical] = useState("GENERAL");
  const [autoEnrich, setAutoEnrich] = useState(true);
  const [smsPipeline, setSmsPipeline] = useState(false); // New: Full SMS pipeline mode
  const [batchSize, setBatchSize] = useState("500");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    headers: string[];
    rows: string[][];
    rowCount: number;
  } | null>(null);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setResult(null);

    // Parse CSV preview
    try {
      const text = await selectedFile.slice(0, 50000).text();
      const lines = text.split("\n").filter((l) => l.trim());
      const headers = lines[0]?.split(",").map((h) => h.trim().replace(/"/g, "")) || [];
      const rows = lines.slice(1, 6).map((l) =>
        l.split(",").map((c) => c.trim().replace(/"/g, ""))
      );

      // Count total rows (approximate for large files)
      const fullText = await selectedFile.text();
      const rowCount = fullText.split("\n").filter((l) => l.trim()).length - 1;

      setPreviewData({ headers, rows, rowCount });
      setStep("configure");
    } catch {
      setError("Could not parse CSV file. Please check the format.");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile?.name.endsWith(".csv")) {
        handleFileSelect(droppedFile);
      } else {
        setError("Please upload a CSV file");
      }
    },
    [handleFileSelect]
  );

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    setStep("processing");
    setUploading(true);
    setError(null);
    setResult(null);
    setPipelineResult(null);
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 500);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Use SMS pipeline or standard import
      if (smsPipeline) {
        formData.append("name", `${vertical} - ${file.name}`);
        formData.append("config", JSON.stringify({
          blockSize: 2000,
          minGrade: "B",
          minActivityScore: 70,
          requireMobile: true,
          requireNameMatch: true,
          blockLitigators: true,
        }));

        const response = await fetch("/api/pipeline/data-to-sms", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        clearInterval(progressInterval);
        setProgress(100);

        if (data.success) {
          setPipelineResult(data);
          setStep("complete");
        } else {
          setError(data.error || "Pipeline processing failed");
          setStep("configure");
        }
      } else {
        // Standard import
        formData.append("type", importType);
        formData.append("vertical", vertical);
        formData.append("autoEnrich", String(autoEnrich));
        formData.append("batchSize", batchSize);

        const response = await fetch("/api/datalake/import", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        clearInterval(progressInterval);
        setProgress(100);

        if (data.success) {
          setResult(data);
          setStep("complete");
        } else {
          setError(data.error || "Import failed");
          setStep("configure");
        }
      }
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : "Upload failed");
      setStep("configure");
    } finally {
      setUploading(false);
    }
  };

  const resetImport = () => {
    setStep("upload");
    setFile(null);
    setPreviewData(null);
    setResult(null);
    setPipelineResult(null);
    setSmsPipeline(false);
    setError(null);
    setProgress(0);
  };

  const selectedVertical = CAMPAIGN_VERTICALS.find((v) => v.id === vertical);

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {["upload", "configure", "processing", "complete"].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : ["upload", "configure", "processing", "complete"].indexOf(step) > i
                  ? "bg-green-500 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {["upload", "configure", "processing", "complete"].indexOf(step) > i ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            {i < 3 && (
              <div
                className={`w-12 h-0.5 ${
                  ["upload", "configure", "processing", "complete"].indexOf(step) > i
                    ? "bg-green-500"
                    : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Import Leads</CardTitle>
            <CardDescription>
              Upload your CSV file to import contacts into NEXTIER
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">
                Drag & drop your CSV file here
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse
              </p>
              <Input
                id="file-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />
              <Button variant="outline">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Select CSV File
              </Button>
            </div>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Supported Fields */}
            <div className="mt-8 grid md:grid-cols-2 gap-6">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Business Data
                </h3>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Company Name*
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Contact Name (First, Last)
                  </li>
                  <li className="flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    Phone Number
                  </li>
                  <li className="flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    Email Address
                  </li>
                  <li className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    Address, City, State, Zip, County
                  </li>
                </ul>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Additional Fields
                </h3>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li>Website URL</li>
                  <li>Number of Employees</li>
                  <li>Annual Revenue</li>
                  <li>SIC Code / Industry</li>
                  <li>Custom fields (auto-mapped)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Configure */}
      {step === "configure" && previewData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Configure Import</CardTitle>
                  <CardDescription>
                    {file?.name} • {previewData.rowCount.toLocaleString()} records
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {previewData.rowCount.toLocaleString()} rows
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Campaign Vertical Selection */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  Campaign Vertical
                </Label>
                <p className="text-sm text-muted-foreground">
                  Assign these leads to a specific industry vertical for isolated campaign tracking
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {CAMPAIGN_VERTICALS.map((v) => (
                    <button
                      type="button"
                      key={v.id}
                      onClick={() => setVertical(v.id)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        vertical === v.id
                          ? "border-primary bg-primary/5"
                          : "border-transparent bg-muted/50 hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{v.icon}</span>
                        <span className="font-medium text-sm">{v.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Import Type */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Record Type</Label>
                  <Select value={importType} onValueChange={setImportType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="business">Business Records</SelectItem>
                      <SelectItem value="contact">Contact Records</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Batch Size</Label>
                  <Input
                    type="number"
                    value={batchSize}
                    onChange={(e) => setBatchSize(e.target.value)}
                    min="10"
                    max="1000"
                  />
                </div>
              </div>

              {/* SMS Pipeline Toggle */}
              <div className={`p-4 rounded-lg border-2 transition-all ${
                smsPipeline
                  ? "bg-green-500/10 border-green-500/50"
                  : "bg-muted/50 border-transparent"
              }`}>
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="sms-pipeline"
                    checked={smsPipeline}
                    onCheckedChange={(checked) => {
                      setSmsPipeline(checked === true);
                      if (checked) setAutoEnrich(true);
                    }}
                  />
                  <div className="space-y-1 flex-1">
                    <Label
                      htmlFor="sms-pipeline"
                      className="font-semibold cursor-pointer flex items-center gap-2"
                    >
                      <Phone className="h-4 w-4 text-green-500" />
                      Full SMS Campaign Pipeline
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Skip trace + contactability scoring + filter. Only Grade A/B, Activity 70+, Mobile phones reach your SMS campaign.
                    </p>
                  </div>
                </div>

                {/* Cost Estimate */}
                {smsPipeline && previewData && (
                  <div className="mt-4 p-3 bg-background rounded-lg">
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                      ESTIMATED COSTS
                    </div>
                    {(() => {
                      const costs = estimateCosts(previewData.rowCount);
                      return (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <div className="font-semibold">${costs.tracerfy.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">Tracerfy</div>
                          </div>
                          <div>
                            <div className="font-semibold">${costs.trestle.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">Trestle</div>
                          </div>
                          <div>
                            <div className="font-semibold text-green-600">~{costs.estimatedQualified.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">Qualified (33%)</div>
                          </div>
                          <div>
                            <div className="font-semibold text-primary">${costs.total.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">Total</div>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="mt-3 text-xs text-muted-foreground">
                      Contactability Gate: Grade A/B, Activity 70+, Mobile only, Name match, No litigators
                    </div>
                  </div>
                )}
              </div>

              {/* Auto-Enrich Toggle (only show if not using SMS pipeline) */}
              {!smsPipeline && (
                <div className="flex items-start space-x-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <Checkbox
                    id="auto-enrich"
                    checked={autoEnrich}
                    onCheckedChange={(checked) => setAutoEnrich(checked === true)}
                  />
                  <div className="space-y-1">
                    <Label
                      htmlFor="auto-enrich"
                      className="font-semibold cursor-pointer flex items-center gap-2"
                    >
                      <Zap className="h-4 w-4 text-yellow-500" />
                      Auto-Enrich with LUCI
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically verify phone numbers, find missing emails, and score
                      contactability. Pay-as-you-go pricing applies.
                    </p>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div className="space-y-2">
                <Label>Data Preview</Label>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          {previewData.headers.slice(0, 6).map((h, i) => (
                            <th
                              key={i}
                              className="px-3 py-2 text-left font-medium text-xs"
                            >
                              {h}
                            </th>
                          ))}
                          {previewData.headers.length > 6 && (
                            <th className="px-3 py-2 text-left font-medium text-xs text-muted-foreground">
                              +{previewData.headers.length - 6} more
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.rows.map((row, i) => (
                          <tr key={i} className="border-t">
                            {row.slice(0, 6).map((cell, j) => (
                              <td
                                key={j}
                                className="px-3 py-2 text-xs truncate max-w-[150px]"
                              >
                                {cell || "-"}
                              </td>
                            ))}
                            {row.length > 6 && <td className="px-3 py-2">...</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={resetImport}>
                  Back
                </Button>
                <Button onClick={handleUpload} className="flex-1">
                  Import {previewData.rowCount.toLocaleString()} Records
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Processing */}
      {step === "processing" && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Importing Records...</h2>
            <p className="text-muted-foreground mb-6">
              {selectedVertical?.icon} {selectedVertical?.name} • {file?.name}
            </p>
            <div className="max-w-md mx-auto space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {progress.toFixed(0)}% complete
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Complete - Standard Import */}
      {step === "complete" && result && !pipelineResult && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Import Complete!</h2>
            <p className="text-muted-foreground mb-6">{result.message}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mb-8">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">
                  {result.stats.totalRows.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Total Rows</div>
              </div>
              <div className="p-4 bg-green-500/10 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {result.stats.inserted.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Imported</div>
              </div>
              <div className="p-4 bg-yellow-500/10 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {result.stats.duplicates?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-muted-foreground">Duplicates</div>
              </div>
              <div className="p-4 bg-red-500/10 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {result.stats.errors.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Errors</div>
              </div>
            </div>

            {selectedVertical && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full mb-6">
                <span className="text-lg">{selectedVertical.icon}</span>
                <span className="font-medium">{selectedVertical.name}</span>
                <Badge variant="secondary">Ready for Campaign</Badge>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={resetImport}>
                Import More
              </Button>
              <Button asChild>
                <a href="/leads">View Leads</a>
              </Button>
              <Button variant="default" asChild>
                <a href="/campaign-builder">
                  <Zap className="mr-2 h-4 w-4" />
                  Create Campaign
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Complete - SMS Pipeline */}
      {step === "complete" && pipelineResult && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
              <Phone className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">SMS Campaign Ready!</h2>
            <p className="text-muted-foreground mb-6">{pipelineResult.message}</p>

            {/* Pipeline Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 max-w-3xl mx-auto mb-6">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xl font-bold">
                  {pipelineResult.campaign.stats.totalRecords.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <div className="text-xl font-bold text-blue-600">
                  {pipelineResult.campaign.stats.enriched.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Enriched</div>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <div className="text-xl font-bold text-purple-600">
                  {pipelineResult.campaign.stats.scored.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Scored</div>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <div className="text-xl font-bold text-green-600">
                  {pipelineResult.campaign.stats.qualified.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Qualified</div>
              </div>
              <div className="p-3 bg-red-500/10 rounded-lg">
                <div className="text-xl font-bold text-red-600">
                  {pipelineResult.campaign.stats.rejected.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Filtered</div>
              </div>
            </div>

            {/* Qualify Rate */}
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-green-500/10 rounded-full mb-6">
              <span className="font-semibold text-green-600">
                {(pipelineResult.campaign.stats.qualifyRate * 100).toFixed(1)}% Qualify Rate
              </span>
              <span className="text-sm text-muted-foreground">|</span>
              <span className="text-sm">
                ${pipelineResult.campaign.costs.costPerQualifiedLead.toFixed(2)}/qualified lead
              </span>
            </div>

            {/* Cost Breakdown */}
            <div className="max-w-md mx-auto mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium mb-2">Cost Breakdown</div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="font-semibold">${pipelineResult.campaign.costs.tracerfy.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Tracerfy</div>
                </div>
                <div>
                  <div className="font-semibold">${pipelineResult.campaign.costs.trestle.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Trestle</div>
                </div>
                <div>
                  <div className="font-semibold text-primary">${pipelineResult.campaign.costs.enrichmentTotal.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </div>
            </div>

            {/* SignalHouse Config */}
            {pipelineResult.campaign.signalHouse && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full mb-6">
                <Phone className="h-4 w-4" />
                <span className="font-medium">Campaign {pipelineResult.campaign.signalHouse.campaignId}</span>
                <Badge variant="secondary">SignalHouse Ready</Badge>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={resetImport}>
                Import More
              </Button>
              <Button variant="default" asChild>
                <a href="/campaign-builder">
                  <Zap className="mr-2 h-4 w-4" />
                  Launch SMS Campaign
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
