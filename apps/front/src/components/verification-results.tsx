"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export function VerificationResults() {
  return (
    <Card className="p-8">
      <div className="text-center space-y-4">
        <AlertCircle className="h-12 w-12 mx-auto text-zinc-500" />
        <h3 className="text-lg font-medium">No Verification Results</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Upload a CSV file or import from your CRM to verify addresses. Results
          will appear here after processing.
        </p>
      </div>
    </Card>
  );
}
