import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "CRM Integration",
  description: "Configure and manage your CRM integrations",
};

export default function CRMIntegrationPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM Integration</h1>
          <p className="text-muted-foreground mt-2">
            Connect your Nextier data engine with your CRM for seamless data
            synchronization
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            Coming Soon
          </CardTitle>
          <CardDescription>
            CRM integrations are being developed. Stay tuned for HubSpot,
            Salesforce, and other CRM connections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Contact support if you need a specific CRM integration prioritized.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
