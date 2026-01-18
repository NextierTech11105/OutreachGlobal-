"use client";

import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, ExternalLink } from "lucide-react";

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
          <div className="max-w-2xl mx-auto">
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
          </div>
        </DashboardShell>
      </div>
    </div>
  );
}
