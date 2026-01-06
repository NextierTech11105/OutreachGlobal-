import type { Metadata } from "next";
import { ZohoIntegration } from "@/components/zoho-integration";
import { ZohoSyncButton } from "./zoho-sync-button";

export const metadata: Metadata = {
  title: "Zoho CRM Integration",
  description: "Configure and manage your Zoho CRM integration",
};

export default function ZohoIntegrationPage() {
  // In a real implementation, this would fetch the current configuration from the database
  const initialConfig = {
    clientId: process.env.ZOHO_CLIENT_ID || "",
    clientSecret: process.env.ZOHO_CLIENT_SECRET || "",
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/zoho/callback`,
    refreshToken: process.env.ZOHO_REFRESH_TOKEN || "",
    syncFrequency: "daily",
    lastSync: null,
    nextSync: null,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Zoho CRM Integration
          </h1>
          <p className="text-muted-foreground mt-2">
            Connect your OutreachGlobal data engine with Zoho CRM for seamless
            data synchronization
          </p>
        </div>
        <ZohoSyncButton />
      </div>

      <ZohoIntegration initialConfig={initialConfig} />
    </div>
  );
}
