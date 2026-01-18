"use client";

import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  ExternalLink,
  CheckCircle2,
  FileSpreadsheet,
  ArrowRight,
  Shield,
  Zap,
  Calendar,
  Sparkles,
} from "lucide-react";

// Trestle FREE assessment portal
const TRESTLE_PORTAL = "https://portal.trestleiq.com/data-assessment";
const CALENDLY_LINK = "https://calendly.com/nextier/demo";

export default function TeamLeadLabPage() {
  const handleOpenTrestle = () => {
    window.open(TRESTLE_PORTAL, "_blank");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <div className="flex-1 space-y-6 p-8 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center border">
                <BarChart3 className="h-6 w-6 text-sky-500" />
              </div>
              <div>
                <h2 className="text-3xl font-bold tracking-tight">
                  Lead<span className="text-sky-500">Lab</span>
                </h2>
                <p className="text-sm text-muted-foreground">
                  Contactability assessment powered by Trestle
                </p>
              </div>
            </div>
          </div>
          <Badge className="bg-gradient-to-r from-sky-500 to-orange-400 text-white border-0">
            <Sparkles className="h-3 w-3 mr-1" />
            NEXTIER
          </Badge>
        </div>

        <DashboardShell>
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Hero Card */}
            <Card className="border-2 border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-orange-400/5">
              <CardContent className="p-8 text-center">
                <h3 className="text-2xl font-bold mb-2">
                  Is Your Data Stopping{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-orange-400">
                    Quality Engagement?
                  </span>
                </h3>
                <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                  Find out how your data scores on our Contactability Audit.
                  Upload your list and get a free report in minutes.
                </p>

                <Button
                  onClick={handleOpenTrestle}
                  size="lg"
                  className="bg-gradient-to-r from-sky-500 to-sky-600 hover:opacity-90"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Free Assessment (up to 10k records)
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>

                <p className="text-xs text-muted-foreground mt-4">
                  Opens Trestle Data Assessment portal in a new tab
                </p>
              </CardContent>
            </Card>

            {/* Comparison Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Free Tier */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-sky-500/10">
                      <BarChart3 className="h-5 w-5 text-sky-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Free Assessment</h3>
                      <Badge variant="outline" className="text-xs">via Trestle</Badge>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {[
                      "Up to 10,000 records",
                      "Aggregate statistics",
                      "Grade distribution (A-F)",
                      "Peer comparison",
                      "Report via email",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-sky-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <div className="text-center">
                    <p className="text-3xl font-bold text-sky-500">FREE</p>
                    <p className="text-xs text-muted-foreground">No credit card</p>
                  </div>
                </CardContent>
              </Card>

              {/* Paid Tier */}
              <Card className="border-orange-500/30 ring-1 ring-orange-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <Zap className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Full Enrichment</h3>
                      <Badge className="text-xs bg-orange-500/20 text-orange-500 border-orange-500/30">
                        NEXTIER Pipeline
                      </Badge>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {[
                      "Unlimited records",
                      "Per-lead results",
                      "Skip trace (find owner mobile)",
                      "Contactability scoring",
                      "Litigator risk check",
                      "CSV export with all data",
                      "Push to SMS campaign",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-orange-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <div className="text-center">
                    <p className="text-3xl font-bold text-orange-500">
                      $0.05<span className="text-lg">/lead</span>
                    </p>
                    <p className="text-xs text-muted-foreground">Tracerfy + Trestle</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Book Demo CTA */}
            <Card className="bg-gradient-to-r from-sky-500/10 to-orange-400/10 border-0">
              <CardContent className="p-6 text-center">
                <h4 className="text-lg font-semibold mb-2">
                  Ready for per-lead results?
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Talk to us about running your list through the full NEXTIER enrichment pipeline.
                </p>
                <a
                  href={CALENDLY_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" className="border-orange-500/50 text-orange-500 hover:bg-orange-500/10">
                    <Calendar className="h-4 w-4 mr-2" />
                    Book a Demo
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </a>
              </CardContent>
            </Card>

            {/* Trust Footer */}
            <div className="flex flex-wrap justify-center gap-8 text-muted-foreground text-sm py-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Data deleted after processing</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>TCPA compliant</span>
              </div>
            </div>
          </div>
        </DashboardShell>
      </div>
    </div>
  );
}
