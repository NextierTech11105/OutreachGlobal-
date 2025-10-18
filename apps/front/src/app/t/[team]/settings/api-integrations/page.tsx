import { ApiIntegrationSettings } from "@/components/api-integration-settings";

export default function ApiIntegrationsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            API Integrations
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure and manage API integrations for data ingestion and
            verification
          </p>
        </div>
      </div>

      <ApiIntegrationSettings />
    </div>
  );
}
