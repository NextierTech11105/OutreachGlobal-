"use client";

import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, ExternalLink, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

const TRESTLE_PORTAL = "https://portal.trestleiq.com/data-assessment";

export default function TeamLeadLabPage() {
  const handleOpenTrestle = () => {
    window.open(TRESTLE_PORTAL, "_blank");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center border">
            <BarChart3 className="h-6 w-6 text-sky-500" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">
            Lead<span className="text-sky-500">Lab</span>
          </h2>
        </div>

        <DashboardShell>
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Main Copy */}
            <Card>
              <CardContent className="p-8 text-center">
                <h3 className="text-2xl font-bold mb-4">
                  Real Contact Data Assessment
                </h3>
                <p className="text-muted-foreground mb-6">
                  Real Contact Data Assessment—the ultimate free tool for fast and reliable lead assessment. Easily upload up to 10,000 records in a single batch, and we'll handle the verification for free.
                </p>
                <p className="text-muted-foreground mb-8">
                  Powered by our advanced Real Contact API, this tool summarizes your contact data into aggregate statistics to understand the health of your contact or lead data and compares how your data is doing compared to your peers.
                </p>

                <Button
                  onClick={handleOpenTrestle}
                  size="lg"
                  className="bg-sky-500 hover:bg-sky-600"
                >
                  Run Assessment
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Sample Report Preview */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-muted/50 p-4 border-b">
                  <p className="text-sm font-medium">Sample Report Preview</p>
                </div>
                <div className="p-6 space-y-6">
                  {/* Insights */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm">The lead quality of this file is on the lower side as against the Trestle benchmark.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm">Number of mobile phones is lower, impacting contactability.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <p className="text-sm">Email validation rate is higher than your peers.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-sm">Address to name match is slightly lower than what we typically see.</p>
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
                        <div className="space-y-2 text-sm">
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
                          <div className="w-full bg-muted rounded-t h-8"></div>
                          <span className="text-xs">F</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full bg-muted rounded-t h-12"></div>
                          <span className="text-xs">D</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full bg-muted rounded-t h-20"></div>
                          <span className="text-xs">C</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full bg-sky-500 rounded-t h-24"></div>
                          <span className="text-xs">B</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full bg-sky-500 rounded-t h-32"></div>
                          <span className="text-xs">A</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 bg-muted rounded"></div>
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
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-medium">Details</th>
                          <th className="text-center p-3 font-medium">Your Data</th>
                          <th className="text-center p-3 font-medium">Benchmark</th>
                          <th className="text-center p-3 font-medium">Difference</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t">
                          <td className="p-3">Records with phone grade A</td>
                          <td className="text-center p-3">40.28%</td>
                          <td className="text-center p-3">45.67%</td>
                          <td className="text-center p-3 text-red-500">-5.39%</td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-3">Records with phone grade B</td>
                          <td className="text-center p-3">20.87%</td>
                          <td className="text-center p-3">18.32%</td>
                          <td className="text-center p-3 text-green-500">+2.55%</td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-3">Records with phone grade C</td>
                          <td className="text-center p-3">10.98%</td>
                          <td className="text-center p-3">12.32%</td>
                          <td className="text-center p-3 text-green-500">+1.34%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DashboardShell>
      </div>
    </div>
  );
}
