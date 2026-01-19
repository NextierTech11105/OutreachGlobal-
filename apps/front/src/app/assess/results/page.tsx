"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Share2,
  TrendingUp,
  TrendingDown,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
} from "lucide-react";

// Mock data - will be replaced with actual Trestle API response
const mockAssessmentResults = {
  totalRecords: 12238,
  processedAt: new Date().toISOString(),
  fileName: "leads_export.csv",

  // Lead Quality Score
  leadQuality: {
    score: 72,
    benchmark: 65,
    trend: "above", // above | below | at
  },

  // Phone Grade Distribution
  phoneGrades: {
    A: { count: 3671, percentage: 30, benchmark: 25 },
    B: { count: 2447, percentage: 20, benchmark: 22 },
    C: { count: 2447, percentage: 20, benchmark: 20 },
    D: { count: 1835, percentage: 15, benchmark: 18 },
    F: { count: 1838, percentage: 15, benchmark: 15 },
  },

  // Phone Types
  phoneTypes: {
    landline: { count: 7468, percentage: 61 },
    mobile: { count: 1221, percentage: 10 },
    fixedVoIP: { count: 1832, percentage: 15 },
    nonFixedVoIP: { count: 1717, percentage: 14 },
  },

  // Insights
  insights: {
    leadQuality: {
      title: "Lead Quality",
      value: "Above Average",
      description: "Your leads score 7% higher than industry benchmark",
      positive: true,
    },
    mobilePhones: {
      title: "Mobile Phones",
      value: "10%",
      description: "Consider enriching for higher mobile reach",
      positive: false,
    },
    emailValidation: {
      title: "Email Validation",
      value: "68% Valid",
      description: "32% of emails need verification",
      positive: true,
    },
    addressMatch: {
      title: "Address Match",
      value: "85%",
      description: "High address accuracy for direct mail",
      positive: true,
    },
  },
};

const gradeColors = {
  A: { bg: "bg-emerald-500", text: "text-emerald-500", light: "bg-emerald-500/20" },
  B: { bg: "bg-green-500", text: "text-green-500", light: "bg-green-500/20" },
  C: { bg: "bg-yellow-500", text: "text-yellow-500", light: "bg-yellow-500/20" },
  D: { bg: "bg-orange-500", text: "text-orange-500", light: "bg-orange-500/20" },
  F: { bg: "bg-red-500", text: "text-red-500", light: "bg-red-500/20" },
};

const phoneTypeColors = {
  landline: "#6366f1",
  mobile: "#22c55e",
  fixedVoIP: "#f59e0b",
  nonFixedVoIP: "#ef4444",
};

export default function AssessmentResultsPage() {
  const searchParams = useSearchParams();
  const [results, setResults] = useState(mockAssessmentResults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch actual results from Trestle API using assessment ID
    const assessmentId = searchParams.get("id");

    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Analyzing your data...</p>
          <p className="text-zinc-400 mt-2">This may take a few moments</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/assess" className="text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Assessment Results</h1>
              <p className="text-sm text-zinc-400">{results.fileName} • {results.totalRecords.toLocaleString()} records</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors">
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors font-medium">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Lead Quality Score - Hero */}
        <div className="bg-zinc-900 rounded-2xl p-8 mb-8 border border-zinc-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-zinc-400 mb-2">Overall Lead Quality Score</p>
              <div className="flex items-baseline gap-4">
                <span className="text-6xl font-bold">{results.leadQuality.score}</span>
                <span className="text-2xl text-zinc-500">/ 100</span>
              </div>
              <div className="flex items-center gap-2 mt-4">
                {results.leadQuality.trend === "above" ? (
                  <>
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    <span className="text-emerald-500">
                      {results.leadQuality.score - results.leadQuality.benchmark}% above benchmark
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-5 h-5 text-red-500" />
                    <span className="text-red-500">
                      {results.leadQuality.benchmark - results.leadQuality.score}% below benchmark
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-500 rounded-full">
              <Sparkles className="w-4 h-4" />
              ML Ready
            </div>
          </div>

          {/* Progress bar comparison */}
          <div className="mt-8 space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Your Data</span>
                <span>{results.leadQuality.score}%</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-1000"
                  style={{ width: `${results.leadQuality.score}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2 text-zinc-400">
                <span>Trestle Benchmark</span>
                <span>{results.leadQuality.benchmark}%</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zinc-600 rounded-full transition-all duration-1000"
                  style={{ width: `${results.leadQuality.benchmark}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Insights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Object.values(results.insights).map((insight, idx) => (
            <div key={idx} className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2 rounded-lg ${insight.positive ? "bg-emerald-500/20" : "bg-yellow-500/20"}`}>
                  {insight.positive ? (
                    <CheckCircle2 className={`w-5 h-5 ${insight.positive ? "text-emerald-500" : "text-yellow-500"}`} />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  )}
                </div>
              </div>
              <p className="text-zinc-400 text-sm">{insight.title}</p>
              <p className="text-2xl font-bold mt-1">{insight.value}</p>
              <p className="text-sm text-zinc-500 mt-2">{insight.description}</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Phone Grade Distribution */}
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-zinc-400" />
              <h3 className="text-lg font-semibold">Phone Grade Distribution</h3>
            </div>

            {/* Bar Chart */}
            <div className="space-y-4">
              {(Object.entries(results.phoneGrades) as [keyof typeof gradeColors, { count: number; percentage: number; benchmark: number }][]).map(([grade, data]) => (
                <div key={grade}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg ${gradeColors[grade].light} ${gradeColors[grade].text} flex items-center justify-center font-bold`}>
                        {grade}
                      </span>
                      <span className="text-zinc-400">{data.count.toLocaleString()} records</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-medium">{data.percentage}%</span>
                      <span className={`${data.percentage >= data.benchmark ? "text-emerald-500" : "text-red-500"}`}>
                        {data.percentage >= data.benchmark ? "+" : ""}{data.percentage - data.benchmark}% vs benchmark
                      </span>
                    </div>
                  </div>
                  <div className="h-3 bg-zinc-800 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full ${gradeColors[grade].bg} rounded-full transition-all duration-700`}
                      style={{ width: `${data.percentage}%` }}
                    />
                    {/* Benchmark marker */}
                    <div
                      className="absolute top-0 h-full w-0.5 bg-white/50"
                      style={{ left: `${data.benchmark}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-zinc-800 text-sm text-zinc-400">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-white rounded-full" />
                <span>Your Data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-white/50" />
                <span>Benchmark</span>
              </div>
            </div>
          </div>

          {/* Phone Types Pie Chart */}
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <div className="flex items-center gap-2 mb-6">
              <Phone className="w-5 h-5 text-zinc-400" />
              <h3 className="text-lg font-semibold">Phone Types</h3>
            </div>

            {/* Simple visual representation */}
            <div className="relative w-48 h-48 mx-auto mb-6">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                {(() => {
                  const types = Object.entries(results.phoneTypes);
                  let cumulativePercentage = 0;

                  return types.map(([type, data], idx) => {
                    const startPercentage = cumulativePercentage;
                    cumulativePercentage += data.percentage;

                    const startAngle = (startPercentage / 100) * 360;
                    const endAngle = (cumulativePercentage / 100) * 360;

                    const startX = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
                    const startY = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
                    const endX = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
                    const endY = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);

                    const largeArcFlag = data.percentage > 50 ? 1 : 0;

                    return (
                      <path
                        key={type}
                        d={`M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArcFlag} 1 ${endX} ${endY} Z`}
                        fill={phoneTypeColors[type as keyof typeof phoneTypeColors]}
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    );
                  });
                })()}
                <circle cx="50" cy="50" r="20" fill="#18181b" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold">{results.totalRecords.toLocaleString()}</p>
                  <p className="text-xs text-zinc-400">Total</p>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(results.phoneTypes).map(([type, data]) => (
                <div key={type} className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: phoneTypeColors[type as keyof typeof phoneTypeColors] }}
                  />
                  <div>
                    <p className="text-sm capitalize">{type.replace(/([A-Z])/g, ' $1').trim()}</p>
                    <p className="text-xs text-zinc-400">{data.count.toLocaleString()} ({data.percentage}%)</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="p-6 border-b border-zinc-800">
            <h3 className="text-lg font-semibold">Detailed Breakdown</h3>
            <p className="text-sm text-zinc-400 mt-1">Records by grade with benchmark comparison</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Grade</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-zinc-400">Records</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-zinc-400">Percentage</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-zinc-400">Benchmark</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-zinc-400">Difference</th>
                </tr>
              </thead>
              <tbody>
                {(Object.entries(results.phoneGrades) as [keyof typeof gradeColors, { count: number; percentage: number; benchmark: number }][]).map(([grade, data]) => {
                  const diff = data.percentage - data.benchmark;
                  return (
                    <tr key={grade} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-6 py-4">
                        <span className={`w-8 h-8 rounded-lg ${gradeColors[grade].light} ${gradeColors[grade].text} inline-flex items-center justify-center font-bold`}>
                          {grade}
                        </span>
                      </td>
                      <td className="text-right px-6 py-4 font-mono">{data.count.toLocaleString()}</td>
                      <td className="text-right px-6 py-4 font-mono">{data.percentage}%</td>
                      <td className="text-right px-6 py-4 font-mono text-zinc-400">{data.benchmark}%</td>
                      <td className="text-right px-6 py-4">
                        <span className={`font-mono ${diff >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                          {diff >= 0 ? "+" : ""}{diff}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-zinc-800/30">
                  <td className="px-6 py-4 font-medium">Total</td>
                  <td className="text-right px-6 py-4 font-mono font-medium">{results.totalRecords.toLocaleString()}</td>
                  <td className="text-right px-6 py-4 font-mono font-medium">100%</td>
                  <td className="text-right px-6 py-4 font-mono text-zinc-400">100%</td>
                  <td className="text-right px-6 py-4">-</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-8 bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-xl p-8 border border-zinc-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Ready to improve your data?</h3>
              <p className="text-zinc-400">
                Upgrade to NEXTIER Pro for real-time enrichment, skip tracing, and AI-powered outreach.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/assess"
                className="px-6 py-3 border border-zinc-600 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Assess Another File
              </Link>
              <Link
                href="/signup"
                className="px-6 py-3 bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors font-medium"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-zinc-800 text-center text-zinc-500 text-sm">
          <p>NEXTIER powered by Trestle</p>
          <p className="mt-2">Assessment generated on {new Date(results.processedAt).toLocaleDateString()}</p>
        </footer>
      </main>
    </div>
  );
}
