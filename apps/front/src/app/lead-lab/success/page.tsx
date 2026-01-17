"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Loader2,
  BarChart3,
  Mail,
  Download,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface AssessmentStatus {
  assessmentId: string;
  status: "pending" | "awaiting_payment" | "processing" | "complete" | "error";
  tier: "free" | "paid";
  recordCount: number;
  createdAt: string;
  completedAt?: string;
  stats?: {
    total: number;
    averageScore: number;
    contactableRate: number;
  };
  error?: string;
}

export default function LeadLabSuccessPage() {
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get("assessment_id");
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState<AssessmentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!assessmentId) return;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/lead-lab/status/${assessmentId}`);
        const data = await response.json();
        setStatus(data);

        if (data.status === "processing") {
          setProgress((prev) => Math.min(prev + 10, 90));
        } else if (data.status === "complete") {
          setProgress(100);
          setLoading(false);
        } else if (data.status === "error") {
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    };

    // Initial check
    checkStatus();

    // Poll every 3 seconds while processing
    const interval = setInterval(() => {
      if (status?.status === "complete" || status?.status === "error") {
        clearInterval(interval);
        return;
      }
      checkStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [assessmentId, status?.status]);

  if (!assessmentId) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <Card className="max-w-md w-full bg-slate-900 border-slate-700">
          <CardContent className="p-6 text-center">
            <p className="text-slate-400">Invalid assessment link</p>
            <Link href="/lead-lab">
              <Button className="mt-4" variant="outline">
                Start New Assessment
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Header */}
      <header className="w-full flex justify-center pt-10">
        <Link href="/lead-lab" className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-sky-500 to-orange-400 flex items-center justify-center">
            <BarChart3 className="h-8 w-8 text-slate-950" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm uppercase tracking-[0.25em] text-slate-400">
              Nextier
            </span>
            <span className="text-lg font-semibold text-slate-100">
              Lead Lab
            </span>
          </div>
        </Link>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
        <Card className="max-w-lg w-full bg-slate-900/70 border-slate-700">
          <CardHeader className="text-center">
            {status?.status === "complete" ? (
              <>
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <CardTitle className="text-2xl">Assessment Complete!</CardTitle>
                <CardDescription className="text-slate-400">
                  Your Lead Lab report is ready
                </CardDescription>
              </>
            ) : status?.status === "error" ? (
              <>
                <CardTitle className="text-2xl text-red-400">Assessment Failed</CardTitle>
                <CardDescription className="text-slate-400">
                  {status.error || "An error occurred during processing"}
                </CardDescription>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4">
                  <Loader2 className="h-12 w-12 text-sky-500 animate-spin" />
                </div>
                <CardTitle className="text-2xl">Processing Your Assessment</CardTitle>
                <CardDescription className="text-slate-400">
                  Analyzing {status?.recordCount?.toLocaleString() || "your"} records...
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Progress */}
            {status?.status !== "complete" && status?.status !== "error" && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-slate-500 text-center">
                  This may take a few minutes for large files
                </p>
              </div>
            )}

            {/* Success Content */}
            {status?.status === "complete" && (
              <>
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-2xl font-bold text-slate-100">
                      {status.stats?.total.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">Records</p>
                  </div>
                  <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-2xl font-bold text-emerald-400">
                      {Math.round(status.stats?.contactableRate || 0)}%
                    </p>
                    <p className="text-xs text-slate-500">Contactable</p>
                  </div>
                  <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-2xl font-bold text-slate-100">
                      {status.stats?.averageScore}
                    </p>
                    <p className="text-xs text-slate-500">Avg Score</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg">
                    <Mail className="h-5 w-5 text-sky-400" />
                    <span className="text-sm text-slate-300">
                      Full report sent to your email
                    </span>
                  </div>

                  {status.tier === "paid" && (
                    <Button className="w-full bg-gradient-to-r from-sky-500 to-orange-400 text-slate-950 font-semibold">
                      <Download className="h-4 w-4 mr-2" />
                      Download Full Report
                    </Button>
                  )}

                  <Link href={`/lead-lab/report/${assessmentId}`} className="block">
                    <Button variant="outline" className="w-full border-slate-700 text-slate-300">
                      View Detailed Report
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </>
            )}

            {/* Error Actions */}
            {status?.status === "error" && (
              <div className="space-y-3">
                <Link href="/lead-lab">
                  <Button className="w-full">Try Again</Button>
                </Link>
                <p className="text-xs text-slate-500 text-center">
                  If the problem persists, please contact support
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session ID for reference */}
        {sessionId && (
          <p className="mt-4 text-xs text-slate-600">
            Payment ref: {sessionId.slice(0, 20)}...
          </p>
        )}
      </section>
    </div>
  );
}
