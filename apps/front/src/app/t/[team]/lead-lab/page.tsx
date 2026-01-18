"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Users,
  FileCheck,
  Rocket,
  Phone,
  AtSign,
  BarChart3,
  CreditCard,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Pricing
const FREE_TIER_LIMIT = 10_000;
const PRICE_PER_RECORD = 0.03;
const MIN_CHARGE = 5.0;

type AssessmentStatus = "idle" | "uploading" | "processing" | "complete" | "error";

interface AssessmentStats {
  total: number;
  gradeBreakdown: { A: number; B: number; C: number; D: number; F: number };
  qualityBreakdown: { high: number; medium: number; low: number };
  averageScore: number;
  contactableRate: number;
  litigatorRiskCount: number;
  mobileCount: number;
  landlineCount: number;
  dataFormat: {
    validPhones: number;
    invalidPhones: number;
    validEmails: number;
    invalidEmails: number;
    missingNames: number;
    duplicates: number;
  };
  campaignReadiness: {
    smsReady: number;
    callReady: number;
    emailReady: number;
    notReady: number;
  };
}

// Calendly link for demos
const CALENDLY_LINK = "https://calendly.com/nextier/demo";

export default function TeamLeadLabPage() {
  const params = useParams<{ team: string }>();
  const searchParams = useSearchParams();
  const simpleMode =
    searchParams.get("simple") === "true" || searchParams.get("demo") === "true";

  const [email, setEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<AssessmentStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AssessmentStats | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [recordCount, setRecordCount] = useState(0);
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [showDetailedView, setShowDetailedView] = useState(!simpleMode);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith(".csv")) {
      setFile(droppedFile);
      setError(null);
      countRecords(droppedFile);
    } else {
      setError("Please upload a CSV file");
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Handle file input
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith(".csv")) {
      setFile(selectedFile);
      setError(null);
      countRecords(selectedFile);
    } else {
      setError("Please upload a CSV file");
    }
  }, []);

  // Count records in CSV
  const countRecords = async (csvFile: File) => {
    const text = await csvFile.text();
    const lines = text.split("\n").filter((line) => line.trim());
    const count = Math.max(0, lines.length - 1);
    setRecordCount(count);
    setRequiresPayment(count > FREE_TIER_LIMIT);
  };

  // Calculate price
  const estimatedCost = Math.max(MIN_CHARGE, recordCount * PRICE_PER_RECORD);

  // Submit assessment
  const handleSubmit = async (tier: "free" | "paid") => {
    if (!email || !file) {
      setError("Please provide both email and CSV file");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setStatus("uploading");
    setProgress(10);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("file", file);
      formData.append("tier", tier);

      const response = await fetch("/api/lead-lab/assess", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402 && data.requiresPayment) {
          setRequiresPayment(true);
          setStatus("idle");
          toast.error(`Free tier limited to ${FREE_TIER_LIMIT.toLocaleString()} records`);
          return;
        }
        throw new Error(data.error || "Assessment failed");
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      setStatus("processing");
      setProgress(30);

      await pollForResults(data.assessmentId);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Assessment failed");
      toast.error("Assessment failed");
    }
  };

  // Poll for assessment results
  const pollForResults = async (assessmentId: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`/api/lead-lab/status/${assessmentId}`);
        const data = await response.json();

        if (data.status === "complete") {
          setStats(data.stats);
          setStatus("complete");
          setProgress(100);
          toast.success("Assessment complete!");
          return;
        }

        if (data.status === "error") {
          throw new Error(data.error || "Assessment failed");
        }

        setProgress(30 + (attempts / maxAttempts) * 60);
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to get results");
        return;
      }
    }

    setStatus("error");
    setError("Assessment timed out. Results will be emailed when ready.");
  };

  // Reset form
  const handleReset = () => {
    setFile(null);
    setEmail("");
    setStatus("idle");
    setProgress(0);
    setError(null);
    setStats(null);
    setRecordCount(0);
    setRequiresPayment(false);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Lead Lab</h2>
            <p className="text-muted-foreground">
              Upload your lead list and get a contactability assessment
            </p>
          </div>
          <Badge variant="secondary">
            <BarChart3 className="h-3 w-3 mr-1" />
            Powered by Trestle
          </Badge>
        </div>

        <DashboardShell>
          <div className="max-w-3xl mx-auto">
            {/* Results View */}
            {stats ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                  <div>
                    <h3 className="text-xl font-semibold">Assessment Complete</h3>
                    <p className="text-sm text-muted-foreground">
                      Full report sent to {email}
                    </p>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-xl">
                    <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Records</p>
                  </div>
                  <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <p className="text-2xl font-bold text-green-600">
                      {Math.round(stats.contactableRate)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Contactable</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-xl">
                    <p className="text-2xl font-bold">{stats.averageScore}</p>
                    <p className="text-xs text-muted-foreground">Avg Score</p>
                  </div>
                </div>

                {/* Simple Mode - Grade summary */}
                {!showDetailedView && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      {(["A", "B", "C", "D", "F"] as const).map((grade) => (
                        <div
                          key={grade}
                          className={cn(
                            "flex-1 text-center p-3 rounded-lg",
                            grade === "A" && "bg-green-500/20",
                            grade === "B" && "bg-green-400/20",
                            grade === "C" && "bg-amber-500/20",
                            grade === "D" && "bg-orange-500/20",
                            grade === "F" && "bg-red-500/20"
                          )}
                        >
                          <p className="font-bold text-lg">{grade}</p>
                          <p className="text-sm text-muted-foreground">
                            {stats.gradeBreakdown[grade]}
                          </p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowDetailedView(true)}
                      className="text-sm text-primary hover:underline"
                    >
                      View detailed breakdown
                    </button>
                  </div>
                )}

                {/* Detailed View - Full tabs */}
                {showDetailedView && (
                  <Tabs defaultValue="contactability" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="contactability">
                        <Users className="h-3 w-3 mr-1" />
                        Contactability
                      </TabsTrigger>
                      <TabsTrigger value="format">
                        <FileCheck className="h-3 w-3 mr-1" />
                        Data Format
                      </TabsTrigger>
                      <TabsTrigger value="readiness">
                        <Rocket className="h-3 w-3 mr-1" />
                        Readiness
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="contactability" className="mt-4 space-y-4">
                      <div className="flex gap-2">
                        {(["A", "B", "C", "D", "F"] as const).map((grade) => (
                          <div
                            key={grade}
                            className={cn(
                              "flex-1 text-center p-3 rounded-lg",
                              grade === "A" && "bg-green-500/20",
                              grade === "B" && "bg-green-400/20",
                              grade === "C" && "bg-amber-500/20",
                              grade === "D" && "bg-orange-500/20",
                              grade === "F" && "bg-red-500/20"
                            )}
                          >
                            <p className="font-bold text-lg">{grade}</p>
                            <p className="text-sm text-muted-foreground">
                              {stats.gradeBreakdown[grade]}
                            </p>
                          </div>
                        ))}
                      </div>

                      {stats.litigatorRiskCount > 0 && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-red-500">
                            {stats.litigatorRiskCount} litigator risk flags
                          </span>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="format" className="mt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Phone className="h-4 w-4 text-primary" />
                            <span className="font-medium">Phones</span>
                          </div>
                          <p className="text-2xl font-bold text-green-600">
                            {stats.dataFormat.validPhones}
                          </p>
                          <p className="text-xs text-muted-foreground">valid</p>
                          {stats.dataFormat.invalidPhones > 0 && (
                            <p className="text-xs text-red-500 mt-1">
                              {stats.dataFormat.invalidPhones} invalid
                            </p>
                          )}
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <AtSign className="h-4 w-4 text-purple-500" />
                            <span className="font-medium">Emails</span>
                          </div>
                          <p className="text-2xl font-bold text-green-600">
                            {stats.dataFormat.validEmails}
                          </p>
                          <p className="text-xs text-muted-foreground">valid</p>
                          {stats.dataFormat.invalidEmails > 0 && (
                            <p className="text-xs text-red-500 mt-1">
                              {stats.dataFormat.invalidEmails} invalid
                            </p>
                          )}
                        </div>
                      </div>
                      {(stats.dataFormat.duplicates > 0 ||
                        stats.dataFormat.missingNames > 0) && (
                        <div className="space-y-2">
                          {stats.dataFormat.duplicates > 0 && (
                            <div className="flex justify-between p-2 bg-amber-500/10 rounded">
                              <span className="text-sm text-amber-600">Duplicates</span>
                              <Badge variant="outline">
                                {stats.dataFormat.duplicates}
                              </Badge>
                            </div>
                          )}
                          {stats.dataFormat.missingNames > 0 && (
                            <div className="flex justify-between p-2 bg-amber-500/10 rounded">
                              <span className="text-sm text-amber-600">
                                Missing names
                              </span>
                              <Badge variant="outline">
                                {stats.dataFormat.missingNames}
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="readiness" className="mt-4 space-y-3">
                      <ReadinessRow
                        icon={Phone}
                        label="SMS Ready"
                        count={stats.campaignReadiness.smsReady}
                        total={stats.total}
                        color="sky"
                      />
                      <ReadinessRow
                        icon={Phone}
                        label="Call Ready"
                        count={stats.campaignReadiness.callReady}
                        total={stats.total}
                        color="green"
                      />
                      <ReadinessRow
                        icon={AtSign}
                        label="Email Ready"
                        count={stats.campaignReadiness.emailReady}
                        total={stats.total}
                        color="purple"
                      />
                      {stats.campaignReadiness.notReady > 0 && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
                          <span className="text-amber-600 font-medium">
                            {stats.campaignReadiness.notReady} records
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            not ready for any channel
                          </span>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                )}

                {/* Primary CTA */}
                <div className="space-y-3 pt-4">
                  <a
                    href={CALENDLY_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full" size="lg">
                      <Calendar className="h-4 w-4 mr-2" />
                      Book a Demo
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </a>
                  <p className="text-center text-xs text-muted-foreground">
                    See how NEXTIER can automate outreach to your{" "}
                    {stats.campaignReadiness.smsReady.toLocaleString()} SMS-ready leads
                  </p>
                  <Button onClick={handleReset} variant="outline" className="w-full">
                    Run Another Assessment
                  </Button>
                </div>
              </div>
            ) : (
              /* Upload Form */
              <div className="space-y-6">
                {/* Email Input */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium mb-2"
                  >
                    Email for report delivery
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full px-4 py-3 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={status !== "idle"}
                  />
                </div>

                {/* File Upload */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={cn(
                    "flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-10 px-4 cursor-pointer transition",
                    isDragging && "border-primary bg-primary/5",
                    file && "border-green-500 bg-green-500/5",
                    !isDragging && !file && "border-muted-foreground/25 hover:border-primary",
                    status !== "idle" && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => {
                    if (status === "idle") {
                      document.getElementById("file-upload")?.click();
                    }
                  }}
                >
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileInput}
                    className="hidden"
                    disabled={status !== "idle"}
                    aria-label="Upload CSV file"
                  />

                  {file ? (
                    <div className="flex items-center gap-4">
                      <FileSpreadsheet className="h-10 w-10 text-green-500" />
                      <div className="text-left">
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {recordCount.toLocaleString()} records •{" "}
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      {status === "idle" && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                            setRecordCount(0);
                            setRequiresPayment(false);
                          }}
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                      <span className="text-lg font-medium mb-1">
                        Drag & drop your CSV here
                      </span>
                      <span className="text-sm text-muted-foreground mb-4">
                        or click to browse files
                      </span>
                      <Button variant="secondary">Browse Files</Button>
                      <p className="mt-4 text-xs text-muted-foreground">
                        CSV • up to {FREE_TIER_LIMIT.toLocaleString()} rows free
                      </p>
                    </>
                  )}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-2 text-red-500 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                {/* Progress */}
                {(status === "uploading" || status === "processing") && (
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      {status === "uploading" ? "Uploading..." : "Processing records..."}
                    </p>
                  </div>
                )}

                {/* Payment Required Notice */}
                {requiresPayment && recordCount > FREE_TIER_LIMIT && status === "idle" && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-sm text-amber-600 mb-2">
                      Your file has {recordCount.toLocaleString()} records (free tier:{" "}
                      {FREE_TIER_LIMIT.toLocaleString()})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Upgrade to Pro for ${estimatedCost.toFixed(2)} to process all
                      records with per-lead results
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                {status === "idle" && (
                  <div className="space-y-3">
                    {recordCount <= FREE_TIER_LIMIT ? (
                      <Button
                        onClick={() => handleSubmit("free")}
                        disabled={!email || !file}
                        className="w-full"
                        size="lg"
                      >
                        Run Free Lead Lab Report
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleSubmit("paid")}
                          disabled={!email || !file}
                          className="w-full"
                          size="lg"
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pay ${estimatedCost.toFixed(2)} & Run Full Report
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                          Includes per-lead results, geocoding, and CSV export
                        </p>
                      </>
                    )}
                  </div>
                )}

                {status === "processing" && (
                  <Button disabled className="w-full" size="lg">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </Button>
                )}

                {/* 3-step explainer */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 text-sm">
                  <div className="p-4 bg-muted rounded-lg">
                    <p>
                      <span className="font-semibold text-primary">1.</span> Upload your
                      lead list with names, phones, and emails.
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p>
                      <span className="font-semibold text-primary">2.</span> Lead Lab
                      runs Real Contact + Tracerfy scoring on each record.
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p>
                      <span className="font-semibold text-primary">3.</span> Get a clear
                      report of good vs junk leads and next actions.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DashboardShell>
      </div>
    </div>
  );
}

// Helper component for campaign readiness rows
function ReadinessRow({
  icon: Icon,
  label,
  count,
  total,
  color,
}: {
  icon: typeof Phone;
  label: string;
  count: number;
  total: number;
  color: "sky" | "green" | "purple";
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  const colorClasses = {
    sky: "bg-sky-500/20 text-sky-600",
    green: "bg-green-500/20 text-green-600",
    purple: "bg-purple-500/20 text-purple-600",
  };

  return (
    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center",
            colorClasses[color]
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span className="font-medium">{label}</span>
      </div>
      <div className="text-right">
        <p className="font-bold">{count.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">{percentage}%</p>
      </div>
    </div>
  );
}
