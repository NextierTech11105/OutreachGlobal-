"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

const TRESTLE_PORTAL = "https://portal.trestleiq.com/data-assessment";

export default function LeadLabPage() {
  const handleOpenTrestle = () => {
    window.open(TRESTLE_PORTAL, "_blank");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* Header */}
      <header className="w-full flex justify-between items-center px-6 py-4 border-b border-slate-800">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold">
            NEX<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-orange-400">TIER</span>
          </span>
        </Link>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold">
            Real Contact Data Assessment
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Real Contact Data Assessment—the ultimate free tool for fast and reliable lead assessment. Easily upload up to 10,000 records in a single batch, and we'll handle the verification for free.
          </p>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Powered by our advanced Real Contact API, this tool summarizes your contact data into aggregate statistics to understand the health of your contact or lead data and compares how your data is doing compared to your peers.
          </p>

          <Button
            onClick={handleOpenTrestle}
            size="lg"
            className="mt-6 bg-gradient-to-r from-sky-500 to-sky-600 hover:opacity-90"
          >
            Run Assessment
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Sample Report Preview */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-0">
            <div className="bg-slate-800/50 p-4 border-b border-slate-700">
              <p className="text-sm font-medium">Sample Report Preview</p>
            </div>
            <div className="p-6 space-y-6">
              {/* Insights */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300">The lead quality of this file is on the lower side as against the Trestle benchmark.</p>
                </div>
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300">Number of mobile phones is lower, impacting contactability.</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300">Email validation rate is higher than your peers.</p>
                </div>
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300">Address to name match is slightly lower than what we typically see.</p>
                </div>
              </div>

              {/* Charts Preview */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Phone Type Breakdown */}
                <div className="space-y-3">
                  <p className="text-sm font-medium">Phone Type Breakdown</p>
                  <div className="flex items-center gap-4">
                    <div className="h-32 w-32 rounded-full border-8 border-sky-500 relative">
                      <div className="absolute inset-2 rounded-full border-8 border-teal-400"></div>
                      <div className="absolute inset-4 rounded-full border-8 border-orange-400"></div>
                    </div>
                    <div className="space-y-2 text-sm text-slate-300">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-teal-400"></div>
                        <span>Mobile</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-sky-500"></div>
                        <span>Landline</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-orange-400"></div>
                        <span>FixedVoIP</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grade Distribution */}
                <div className="space-y-3">
                  <p className="text-sm font-medium">Lead Quality by Grade</p>
                  <div className="flex items-end gap-2 h-32">
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-slate-700 rounded-t h-8"></div>
                      <span className="text-xs text-slate-400">F</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-slate-700 rounded-t h-12"></div>
                      <span className="text-xs text-slate-400">D</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-slate-700 rounded-t h-20"></div>
                      <span className="text-xs text-slate-400">C</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-sky-500 rounded-t h-24"></div>
                      <span className="text-xs text-slate-400">B</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-sky-500 rounded-t h-32"></div>
                      <span className="text-xs text-slate-400">A</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 bg-slate-700 rounded"></div>
                      <span>Your Data</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 bg-sky-500 rounded"></div>
                      <span>Trestle Benchmark</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Table Preview */}
              <div className="border border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800">
                    <tr>
                      <th className="text-left p-3 font-medium text-slate-300">Details</th>
                      <th className="text-center p-3 font-medium text-slate-300">Your Data</th>
                      <th className="text-center p-3 font-medium text-slate-300">Benchmark</th>
                      <th className="text-center p-3 font-medium text-slate-300">Difference</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    <tr className="border-t border-slate-700">
                      <td className="p-3">Records with phone grade A</td>
                      <td className="text-center p-3">40.28%</td>
                      <td className="text-center p-3">45.67%</td>
                      <td className="text-center p-3 text-red-400">-5.39%</td>
                    </tr>
                    <tr className="border-t border-slate-700">
                      <td className="p-3">Records with phone grade B</td>
                      <td className="text-center p-3">20.87%</td>
                      <td className="text-center p-3">18.32%</td>
                      <td className="text-center p-3 text-green-400">+2.55%</td>
                    </tr>
                    <tr className="border-t border-slate-700">
                      <td className="p-3">Records with phone grade C</td>
                      <td className="text-center p-3">10.98%</td>
                      <td className="text-center p-3">12.32%</td>
                      <td className="text-center p-3 text-green-400">+1.34%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500">
          <p>NEXTIER</p>
        </div>
      </footer>
    </main>
  );
}
