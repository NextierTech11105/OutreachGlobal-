"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Pricing
const FREE_TIER_LIMIT = 10_000;
const PRICE_PER_RECORD = 0.03;
const MIN_CHARGE = 5.00;

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

export default function LeadLabPage() {
  const [email, setEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<AssessmentStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AssessmentStats | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [recordCount, setRecordCount] = useState(0);
  const [requiresPayment, setRequiresPayment] = useState(false);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith(".csv")) {
      setFile(droppedFile);
      setError(null);
      // Count records
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
    const count = Math.max(0, lines.length - 1); // Subtract header
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
          // Redirect to upgrade flow
          setRequiresPayment(true);
          setStatus("idle");
          toast.error(`Free tier limited to ${FREE_TIER_LIMIT.toLocaleString()} records`);
          return;
        }
        throw new Error(data.error || "Assessment failed");
      }

      // If requires payment, redirect to Stripe checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      setStatus("processing");
      setProgress(30);

      // Poll for results
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
          toast.success("Assessment complete! Check your email for the full report.");
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
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Header */}
      <header className="w-full flex justify-between items-center px-6 pt-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-sky-500 to-orange-400 flex items-center justify-center">
            <BarChart3 className="h-7 w-7 text-slate-950" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-xl font-bold text-slate-100">
              LeadLab<span className="text-sky-400">.Ai</span>
            </span>
            <span className="text-xs text-slate-500">
              by Nextier
            </span>
          </div>
        </Link>
        <Link href="/pricing">
          <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
            Pricing
          </Button>
        </Link>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 pb-16 pt-10">
        {/* Title */}
        <div className="max-w-3xl w-full text-center mb-10">
          <p className="text-sky-400 text-sm font-medium tracking-wide uppercase mb-3">
            Stop Wasting Money on Low-Quality Enrichment
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold mb-4">
            Increase Contactability by{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-orange-400">
              250%
            </span>
          </h1>
          <p className="text-slate-300 text-base md:text-lg mb-6">
            Upload your lead list and get a complete Contactability Lab Report in minutes.
            Know which leads are real before you waste a single dial.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <span className="text-emerald-400">✓</span> Phone Validation
            </span>
            <span className="flex items-center gap-1">
              <span className="text-emerald-400">✓</span> Email Verification
            </span>
            <span className="flex items-center gap-1">
              <span className="text-emerald-400">✓</span> Litigator Risk Check
            </span>
            <span className="flex items-center gap-1">
              <span className="text-emerald-400">✓</span> Activity Scoring
            </span>
          </div>
        </div>

        {/* Results View */}
        {stats ? (
          <div className="w-full max-w-2xl">
            <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <div>
                  <h2 className="text-xl font-semibold">Assessment Complete</h2>
                  <p className="text-sm text-slate-400">Full report sent to {email}</p>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                  <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Records</p>
                </div>
                <div className="text-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <p className="text-2xl font-bold text-emerald-400">{Math.round(stats.contactableRate)}%</p>
                  <p className="text-xs text-slate-500">Contactable</p>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                  <p className="text-2xl font-bold">{stats.averageScore}</p>
                  <p className="text-xs text-slate-500">Avg Score</p>
                </div>
              </div>

              {/* Tabbed Results */}
              <Tabs defaultValue="contactability" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-slate-800/50">
                  <TabsTrigger value="contactability" className="text-xs data-[state=active]:bg-slate-700">
                    <Users className="h-3 w-3 mr-1" />
                    Contactability
                  </TabsTrigger>
                  <TabsTrigger value="format" className="text-xs data-[state=active]:bg-slate-700">
                    <FileCheck className="h-3 w-3 mr-1" />
                    Data Format
                  </TabsTrigger>
                  <TabsTrigger value="readiness" className="text-xs data-[state=active]:bg-slate-700">
                    <Rocket className="h-3 w-3 mr-1" />
                    Readiness
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="contactability" className="mt-4 space-y-4">
                  {/* Grade Breakdown */}
                  <div className="flex gap-2">
                    {(["A", "B", "C", "D", "F"] as const).map((grade) => (
                      <div
                        key={grade}
                        className={cn(
                          "flex-1 text-center p-3 rounded-lg",
                          grade === "A" && "bg-emerald-500/20",
                          grade === "B" && "bg-green-500/20",
                          grade === "C" && "bg-amber-500/20",
                          grade === "D" && "bg-orange-500/20",
                          grade === "F" && "bg-red-500/20"
                        )}
                      >
                        <p className="font-bold text-lg">{grade}</p>
                        <p className="text-sm text-slate-400">{stats.gradeBreakdown[grade]}</p>
                      </div>
                    ))}
                  </div>

                  {stats.litigatorRiskCount > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      <span className="text-sm text-red-400">{stats.litigatorRiskCount} litigator risk flags</span>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="format" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Phone className="h-4 w-4 text-sky-400" />
                        <span className="font-medium">Phones</span>
                      </div>
                      <p className="text-2xl font-bold text-emerald-400">{stats.dataFormat.validPhones}</p>
                      <p className="text-xs text-slate-500">valid</p>
                      {stats.dataFormat.invalidPhones > 0 && (
                        <p className="text-xs text-red-400 mt-1">{stats.dataFormat.invalidPhones} invalid</p>
                      )}
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AtSign className="h-4 w-4 text-purple-400" />
                        <span className="font-medium">Emails</span>
                      </div>
                      <p className="text-2xl font-bold text-emerald-400">{stats.dataFormat.validEmails}</p>
                      <p className="text-xs text-slate-500">valid</p>
                      {stats.dataFormat.invalidEmails > 0 && (
                        <p className="text-xs text-red-400 mt-1">{stats.dataFormat.invalidEmails} invalid</p>
                      )}
                    </div>
                  </div>
                  {(stats.dataFormat.duplicates > 0 || stats.dataFormat.missingNames > 0) && (
                    <div className="space-y-2">
                      {stats.dataFormat.duplicates > 0 && (
                        <div className="flex justify-between p-2 bg-amber-500/10 rounded">
                          <span className="text-sm text-amber-400">Duplicates</span>
                          <Badge variant="outline" className="border-amber-500/50 text-amber-400">{stats.dataFormat.duplicates}</Badge>
                        </div>
                      )}
                      {stats.dataFormat.missingNames > 0 && (
                        <div className="flex justify-between p-2 bg-amber-500/10 rounded">
                          <span className="text-sm text-amber-400">Missing names</span>
                          <Badge variant="outline" className="border-amber-500/50 text-amber-400">{stats.dataFormat.missingNames}</Badge>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="readiness" className="mt-4 space-y-3">
                  <ReadinessRow icon={Phone} label="SMS Ready" count={stats.campaignReadiness.smsReady} total={stats.total} color="sky" />
                  <ReadinessRow icon={Phone} label="Call Ready" count={stats.campaignReadiness.callReady} total={stats.total} color="emerald" />
                  <ReadinessRow icon={AtSign} label="Email Ready" count={stats.campaignReadiness.emailReady} total={stats.total} color="purple" />
                  {stats.campaignReadiness.notReady > 0 && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
                      <span className="text-amber-400 font-medium">{stats.campaignReadiness.notReady} records</span>
                      <span className="text-slate-500"> not ready for any channel</span>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <Button onClick={handleReset} className="w-full mt-6 bg-gradient-to-r from-sky-500 to-orange-400 text-slate-950 font-semibold hover:opacity-90">
                Run Another Assessment
              </Button>
            </div>
          </div>
        ) : (
          /* Upload Form */
          <div className="w-full max-w-2xl">
            <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-8 md:p-10 shadow-xl">
              <h2 className="text-xl font-semibold mb-6">Lead Lab Upload</h2>

              {/* Email Input */}
              <div className="mb-6">
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email for report delivery
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
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
                  isDragging && "border-sky-500 bg-sky-500/5",
                  file && "border-emerald-500 bg-emerald-500/5",
                  !isDragging && !file && "border-slate-600 hover:border-sky-500 hover:bg-slate-900/60",
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
                  title="Upload CSV file"
                />

                {file ? (
                  <div className="flex items-center gap-4">
                    <FileSpreadsheet className="h-10 w-10 text-emerald-500" />
                    <div className="text-left">
                      <p className="font-medium text-slate-100">{file.name}</p>
                      <p className="text-sm text-slate-400">
                        {recordCount.toLocaleString()} records • {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    {status === "idle" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-slate-100"
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
                    <Upload className="h-10 w-10 text-slate-500 mb-3" />
                    <span className="text-lg font-medium mb-1">Drag & drop your CSV here</span>
                    <span className="text-sm text-slate-400 mb-4">or click to browse files</span>
                    <span className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-sky-500 text-sm font-semibold text-slate-950">
                      Browse Files
                    </span>
                    <p className="mt-4 text-xs text-slate-500">
                      CSV · up to {FREE_TIER_LIMIT.toLocaleString()} rows in Free Lab
                    </p>
                  </>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="mt-4 flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              {/* Progress */}
              {(status === "uploading" || status === "processing") && (
                <div className="mt-6 space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-slate-500 text-center">
                    {status === "uploading" ? "Uploading..." : "Processing records..."}
                  </p>
                </div>
              )}

              {/* Payment Required Notice */}
              {requiresPayment && recordCount > FREE_TIER_LIMIT && status === "idle" && (
                <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-sm text-amber-300 mb-2">
                    Your file has {recordCount.toLocaleString()} records (free tier: {FREE_TIER_LIMIT.toLocaleString()})
                  </p>
                  <p className="text-xs text-slate-400">
                    Upgrade to Pro for ${estimatedCost.toFixed(2)} to process all records with per-lead results
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              {status === "idle" && (
                <div className="mt-6 space-y-3">
                  {recordCount <= FREE_TIER_LIMIT ? (
                    <Button
                      onClick={() => handleSubmit("free")}
                      disabled={!email || !file}
                      className="w-full bg-gradient-to-r from-sky-500 to-orange-400 text-slate-950 font-semibold hover:opacity-90 py-6 text-base"
                    >
                      Run Free Lead Lab Report
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => handleSubmit("paid")}
                        disabled={!email || !file}
                        className="w-full bg-gradient-to-r from-sky-500 to-orange-400 text-slate-950 font-semibold hover:opacity-90 py-6 text-base"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay ${estimatedCost.toFixed(2)} & Run Full Report
                      </Button>
                      <p className="text-xs text-slate-500 text-center">
                        Includes per-lead results, geocoding, and CSV export
                      </p>
                    </>
                  )}
                </div>
              )}

              {status === "processing" && (
                <Button disabled className="w-full mt-6 py-6">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 3-step explainer */}
        {!stats && (
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl text-sm text-slate-300">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <p><span className="font-semibold text-sky-400">1.</span> Upload your lead list with names, phones, and emails.</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <p><span className="font-semibold text-sky-400">2.</span> Lead Lab runs Real Contact + Tracerfy scoring on each record.</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <p><span className="font-semibold text-sky-400">3.</span> Get a clear report of good vs junk leads and next actions.</p>
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500">
          <p>Powered by Trestle Real Contact API • Data deleted after processing</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link href="/terms" className="hover:text-slate-300">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-300">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
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
  color: "sky" | "emerald" | "purple";
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  const colorClasses = {
    sky: "bg-sky-500/20 text-sky-400",
    emerald: "bg-emerald-500/20 text-emerald-400",
    purple: "bg-purple-500/20 text-purple-400",
  };

  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", colorClasses[color])}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="font-medium">{label}</span>
      </div>
      <div className="text-right">
        <p className="font-bold">{count.toLocaleString()}</p>
        <p className="text-xs text-slate-500">{percentage}%</p>
      </div>
    </div>
  );
}
