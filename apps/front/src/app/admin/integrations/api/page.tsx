import { ApiIntegrationDashboard } from "@/components/api-integration-dashboard";

export default function ApiIntegrationsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      
      <div className="flex-1 p-6 pt-6">
        <h2 className="text-2xl font-semibold mb-6">API Integrations</h2>
        <ApiIntegrationDashboard />
      </div>
    </div>
  );
}
