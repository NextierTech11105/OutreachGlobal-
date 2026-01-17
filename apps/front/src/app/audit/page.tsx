"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LEAD LAB - A NextTier Solution
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Contactability Audit - Lead Data Assessment
 *
 * Upload your lead data and get a comprehensive contactability report.
 * Powered by NextTier's proprietary Contactability Engine (Trestle Real Contact).
 *
 * FEATURES:
 * - CSV upload (phone + name required)
 * - Activity score distribution (0-100)
 * - Contact grade breakdown (A-F)
 * - Risk tier classification (SAFE, ELEVATED, HIGH, BLOCK)
 * - Litigator risk flagging (TCPA compliance)
 * - Line type analysis (Mobile, Landline, VoIP)
 * - Routing recommendations
 * - Export results
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Phone,
  Mail,
  Shield,
  Download,
  BarChart3,
  Users,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface AuditResult {
  name: string;
  phone: string;
  email?: string;
  isValid: boolean;
  activityScore: number | null;
  lineType: string | null;
  contactGrade: string | null;
  nameMatch: boolean | null;
  isLitigatorRisk: boolean;
  isContactable: boolean;
}

interface AuditSummary {
  totalRecords: number;
  validPhones: number;
  contactableLeads: number;
  litigatorRisks: number;
  gradeDistribution: {
    A: number;
    B: number;
    C: number;
    D: number;
    F: number;
  };
  lineTypeDistribution: {
    Mobile: number;
    Landline: number;
    VoIP: number;
    Other: number;
  };
  activityScoreAverage: number;
  processingTime: number;
  costEstimate: number;
}

type AuditStatus = "idle" | "uploading" | "processing" | "complete" | "error";

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function ContactabilityAuditPage() {
  const [status, setStatus] = useState<AuditStatus>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<AuditResult[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle file selection
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (selectedFile) {
        if (!selectedFile.name.endsWith(".csv")) {
          toast.error("Please upload a CSV file");
          return;
        }
        setFile(selectedFile);
        setStatus("idle");
        setError(null);
      }
    },
    []
  );

  // Handle drag and drop
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) {
      if (!droppedFile.name.endsWith(".csv")) {
        toast.error("Please upload a CSV file");
        return;
      }
      setFile(droppedFile);
      setStatus("idle");
      setError(null);
    }
  }, []);

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
    },
    []
  );

  // Process the audit
  const handleStartAudit = async () => {
    if (!file) return;

    setStatus("uploading");
    setProgress(0);

    try {
      // Parse CSV
      const text = await file.text();
      const lines = text.trim().split("\n");
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

      // Find column indices
      const nameIndex =
        headers.findIndex((h) => h.includes("name")) ||
        headers.findIndex((h) => h === "full_name");
      const firstNameIndex = headers.findIndex(
        (h) => h === "first_name" || h === "firstname"
      );
      const lastNameIndex = headers.findIndex(
        (h) => h === "last_name" || h === "lastname"
      );
      const phoneIndex = headers.findIndex(
        (h) => h.includes("phone") || h === "mobile" || h === "cell"
      );
      const emailIndex = headers.findIndex((h) => h.includes("email"));

      if (phoneIndex === -1) {
        throw new Error("CSV must contain a phone column");
      }

      // Parse records
      const records = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
        let name = "";

        if (nameIndex !== -1) {
          name = values[nameIndex];
        } else if (firstNameIndex !== -1 && lastNameIndex !== -1) {
          name = `${values[firstNameIndex]} ${values[lastNameIndex]}`;
        } else if (firstNameIndex !== -1) {
          name = values[firstNameIndex];
        }

        return {
          name: name || "Unknown",
          phone: values[phoneIndex] || "",
          email: emailIndex !== -1 ? values[emailIndex] : undefined,
        };
      });

      // Filter out empty records
      const validRecords = records.filter((r) => r.phone);

      setStatus("processing");
      setProgress(10);

      // Process in batches
      const batchSize = 10;
      const results: AuditResult[] = [];
      let processed = 0;

      for (let i = 0; i < validRecords.length; i += batchSize) {
        const batch = validRecords.slice(i, i + batchSize);

        // Call validation API for each record in batch
        const batchResults = await Promise.all(
          batch.map(async (record) => {
            try {
              const response = await fetch("/api/validation/trestle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: record.name,
                  phone: record.phone,
                  email: record.email,
                }),
              });

              if (!response.ok) {
                return {
                  ...record,
                  isValid: false,
                  activityScore: null,
                  lineType: null,
                  contactGrade: null,
                  nameMatch: null,
                  isLitigatorRisk: false,
                  isContactable: false,
                };
              }

              const data = await response.json();

              return {
                ...record,
                isValid: data.phone?.isValid ?? false,
                activityScore: data.phone?.activityScore ?? null,
                lineType: data.phone?.lineType ?? null,
                contactGrade: data.phone?.contactGrade ?? null,
                nameMatch: data.phone?.nameMatch ?? null,
                isLitigatorRisk: data.risks?.isLitigatorRisk ?? false,
                isContactable: data.isContactable ?? false,
              };
            } catch {
              return {
                ...record,
                isValid: false,
                activityScore: null,
                lineType: null,
                contactGrade: null,
                nameMatch: null,
                isLitigatorRisk: false,
                isContactable: false,
              };
            }
          })
        );

        results.push(...batchResults);
        processed += batch.length;
        setProgress(10 + Math.round((processed / validRecords.length) * 80));

        // Small delay to avoid rate limiting
        if (i + batchSize < validRecords.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // Calculate summary
      const summary = calculateSummary(results);
      setResults(results);
      setSummary(summary);
      setStatus("complete");
      setProgress(100);
      toast.success(`Audit complete! ${results.length} records processed.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit failed");
      setStatus("error");
      toast.error("Audit failed");
    }
  };

  // Calculate summary statistics
  const calculateSummary = (results: AuditResult[]): AuditSummary => {
    const validPhones = results.filter((r) => r.isValid).length;
    const contactableLeads = results.filter((r) => r.isContactable).length;
    const litigatorRisks = results.filter((r) => r.isLitigatorRisk).length;

    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    results.forEach((r) => {
      if (r.contactGrade && r.contactGrade in gradeDistribution) {
        gradeDistribution[r.contactGrade as keyof typeof gradeDistribution]++;
      }
    });

    const lineTypeDistribution = { Mobile: 0, Landline: 0, VoIP: 0, Other: 0 };
    results.forEach((r) => {
      if (r.lineType === "Mobile") lineTypeDistribution.Mobile++;
      else if (r.lineType === "Landline") lineTypeDistribution.Landline++;
      else if (r.lineType?.includes("VOIP")) lineTypeDistribution.VoIP++;
      else if (r.lineType) lineTypeDistribution.Other++;
    });

    const scores = results
      .filter((r) => r.activityScore !== null)
      .map((r) => r.activityScore!);
    const activityScoreAverage =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

    return {
      totalRecords: results.length,
      validPhones,
      contactableLeads,
      litigatorRisks,
      gradeDistribution,
      lineTypeDistribution,
      activityScoreAverage,
      processingTime: 0, // TODO: track actual time
      costEstimate: results.length * 0.03,
    };
  };

  // Export results as CSV
  const handleExport = () => {
    if (results.length === 0) return;

    const headers = [
      "Name",
      "Phone",
      "Email",
      "Valid",
      "Activity Score",
      "Line Type",
      "Grade",
      "Name Match",
      "Litigator Risk",
      "Contactable",
    ];
    const rows = results.map((r) => [
      r.name,
      r.phone,
      r.email || "",
      r.isValid ? "Yes" : "No",
      r.activityScore?.toString() || "",
      r.lineType || "",
      r.contactGrade || "",
      r.nameMatch === null ? "" : r.nameMatch ? "Yes" : "No",
      r.isLitigatorRisk ? "YES" : "No",
      r.isContactable ? "Yes" : "No",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contactability-audit-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Results exported!");
  };

  // Reset audit
  const handleReset = () => {
    setFile(null);
    setStatus("idle");
    setProgress(0);
    setResults([]);
    setSummary(null);
    setError(null);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col min-h-screen p-6 bg-background">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Lead Lab</h1>
          <p className="text-xs font-medium text-primary tracking-wider uppercase">
            A NextTier Solution
          </p>
          <p className="text-muted-foreground text-lg mt-2">
            Upload your lead data and get a comprehensive contactability
            assessment
          </p>
          <p className="text-sm text-muted-foreground">
            Powered by NextTier&apos;s Proprietary Contactability Engine
          </p>
        </div>

        {/* Upload Section */}
        {status === "idle" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Your CSV File
              </CardTitle>
              <CardDescription>
                Your CSV must contain a <strong>phone</strong> column. Including{" "}
                <strong>name</strong> and <strong>email</strong> improves
                accuracy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer"
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer flex flex-col items-center gap-4"
                >
                  <FileSpreadsheet className="h-16 w-16 text-muted-foreground" />
                  {file ? (
                    <>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">
                        Drop your CSV file here or click to browse
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Supports up to 10,000 records
                      </p>
                    </>
                  )}
                </label>
              </div>

              {file && (
                <div className="mt-6 flex justify-center gap-4">
                  <Button
                    onClick={handleStartAudit}
                    size="lg"
                    className="gap-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Start Audit
                  </Button>
                  <Button onClick={handleReset} variant="outline" size="lg">
                    Clear
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Processing Section */}
        {(status === "uploading" || status === "processing") && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <p className="font-medium">
                  {status === "uploading"
                    ? "Parsing CSV..."
                    : "Validating contacts..."}
                </p>
                <Progress value={progress} className="max-w-md mx-auto" />
                <p className="text-sm text-muted-foreground">
                  {progress}% complete
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Section */}
        {status === "error" && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <XCircle className="h-12 w-12 mx-auto text-destructive" />
                <p className="font-medium text-destructive">Audit Failed</p>
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button onClick={handleReset} variant="outline">
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {status === "complete" && summary && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">
                        {summary.totalRecords}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total Records
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">
                        {summary.contactableLeads}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Contactable (
                        {Math.round(
                          (summary.contactableLeads / summary.totalRecords) *
                            100
                        )}
                        %)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Phone className="h-8 w-8 text-purple-500" />
                    <div>
                      <p className="text-2xl font-bold">
                        {summary.lineTypeDistribution.Mobile}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Mobile Numbers
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                    <div>
                      <p className="text-2xl font-bold">
                        {summary.litigatorRisks}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Litigator Risks
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Grade Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Grade Distribution</CardTitle>
                <CardDescription>
                  Grades A-C are contactable, D-F should be deprioritized
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  {(["A", "B", "C", "D", "F"] as const).map((grade) => {
                    const count =
                      summary.gradeDistribution[
                        grade as keyof typeof summary.gradeDistribution
                      ];
                    const percentage = Math.round(
                      (count / summary.totalRecords) * 100
                    );
                    const color =
                      grade === "A"
                        ? "bg-green-500"
                        : grade === "B"
                          ? "bg-lime-500"
                          : grade === "C"
                            ? "bg-yellow-500"
                            : grade === "D"
                              ? "bg-orange-500"
                              : "bg-red-500";
                    return (
                      <div key={grade} className="flex-1 text-center">
                        <div className="h-32 bg-muted rounded-lg relative overflow-hidden">
                          <div
                            className={`absolute bottom-0 left-0 right-0 ${color} transition-all`}
                            style={{ height: `${percentage}%` }}
                          />
                        </div>
                        <p className="mt-2 font-bold text-lg">Grade {grade}</p>
                        <p className="text-sm text-muted-foreground">
                          {count} ({percentage}%)
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Activity Score & Line Type */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Average Activity Score</CardTitle>
                  <CardDescription>
                    70+ is good, 30- indicates disconnected
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-6xl font-bold">
                      {summary.activityScoreAverage}
                    </p>
                    <p className="text-muted-foreground mt-2">
                      {summary.activityScoreAverage >= 70
                        ? "Good - Most numbers are active"
                        : summary.activityScoreAverage >= 50
                          ? "Moderate - Mixed activity levels"
                          : "Low - Many numbers may be disconnected"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Line Type Breakdown</CardTitle>
                  <CardDescription>
                    Mobile numbers are best for SMS campaigns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Mobile</span>
                      <Badge variant="default">
                        {summary.lineTypeDistribution.Mobile}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Landline</span>
                      <Badge variant="secondary">
                        {summary.lineTypeDistribution.Landline}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>VoIP</span>
                      <Badge variant="outline">
                        {summary.lineTypeDistribution.VoIP}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Other/Unknown</span>
                      <Badge variant="outline">
                        {summary.lineTypeDistribution.Other}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Results Table */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Detailed Results</CardTitle>
                    <CardDescription>
                      {results.length} records processed
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleExport} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button onClick={handleReset} variant="outline">
                      New Audit
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Activity</TableHead>
                        <TableHead>Line Type</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.slice(0, 100).map((result, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            {result.name}
                          </TableCell>
                          <TableCell>{result.phone}</TableCell>
                          <TableCell>
                            {result.contactGrade && (
                              <Badge
                                variant={
                                  ["A", "B", "C"].includes(result.contactGrade)
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                {result.contactGrade}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {result.activityScore !== null && (
                              <span
                                className={
                                  result.activityScore >= 70
                                    ? "text-green-600"
                                    : result.activityScore >= 50
                                      ? "text-yellow-600"
                                      : "text-red-600"
                                }
                              >
                                {result.activityScore}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {result.lineType && (
                              <Badge variant="outline">{result.lineType}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {result.isLitigatorRisk ? (
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Risk
                              </Badge>
                            ) : result.isContactable ? (
                              <Badge
                                variant="default"
                                className="bg-green-500"
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                OK
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <XCircle className="h-3 w-3 mr-1" />
                                Skip
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {results.length > 100 && (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    Showing first 100 of {results.length} results. Export CSV
                    for full data.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Cost Summary */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Estimated Cost
                    </p>
                    <p className="text-2xl font-bold">
                      ${summary.costEstimate.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {summary.totalRecords} records × $0.03/record
                    </p>
                  </div>
                  <Shield className="h-12 w-12 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Features */}
        {status === "idle" && !file && (
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            <Card>
              <CardContent className="pt-6 text-center">
                <BarChart3 className="h-10 w-10 mx-auto text-primary mb-4" />
                <h3 className="font-semibold">Activity Scoring</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  0-100 score indicating phone connectivity and activity levels
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <Shield className="h-10 w-10 mx-auto text-primary mb-4" />
                <h3 className="font-semibold">TCPA Compliance</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Identify litigator risks before you dial or text
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <Mail className="h-10 w-10 mx-auto text-primary mb-4" />
                <h3 className="font-semibold">Email Validation</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Verify email deliverability and name matching
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
