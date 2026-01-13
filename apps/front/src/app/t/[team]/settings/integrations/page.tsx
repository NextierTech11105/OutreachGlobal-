"use client";

import { useState, useEffect } from "react";
import { useCurrentTeam } from "@/features/team/team.context";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Loader2,
  Settings,
  Link2,
  Webhook,
} from "lucide-react";
import type { CRMProvider } from "@/lib/crm/unified-crm-service";

/**
 * CRM INTEGRATIONS SETTINGS PAGE
 * ═══════════════════════════════════════════════════════════════════════════════
 * Connect ANY CRM to NEXTIER:
 * - Zoho CRM
 * - Salesforce
 * - HubSpot
 * - Pipedrive
 * - Monday.com
 * - Custom Webhooks (Zapier, Make, n8n)
 *
 * We make your CRM BETTER by adding:
 * - Relentless, systematic lead generation
 * - Creative outbound that manufactures inbound responses
 * - Intentional, compounding engagement loops
 * ═══════════════════════════════════════════════════════════════════════════════
 */

interface CRMProviderConfig {
  id: CRMProvider;
  name: string;
  description: string;
  color: string;
  logo: string;
  authType: "oauth" | "apikey" | "webhook";
  docsUrl: string;
}

const CRM_PROVIDERS: CRMProviderConfig[] = [
  {
    id: "zoho",
    name: "Zoho CRM",
    description: "Full bi-directional sync with Zoho CRM modules",
    color: "#E42527",
    logo: "Z",
    authType: "oauth",
    docsUrl: "https://www.zoho.com/crm/developer/docs/api/v3/",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Sync leads, contacts, and activities with Salesforce",
    color: "#00A1E0",
    logo: "SF",
    authType: "oauth",
    docsUrl: "https://developer.salesforce.com/docs/apis",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Connect HubSpot CRM for seamless lead management",
    color: "#FF7A59",
    logo: "HS",
    authType: "oauth",
    docsUrl: "https://developers.hubspot.com/docs/api/overview",
  },
  {
    id: "gohighlevel",
    name: "GoHighLevel",
    description: "Agency favorite - full contact & pipeline sync with GHL",
    color: "#4CAF50",
    logo: "GHL",
    authType: "apikey",
    docsUrl: "https://highlevel.stoplight.io/docs/integrations",
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    description: "Sync deals and contacts with Pipedrive",
    color: "#1A1F36",
    logo: "PD",
    authType: "apikey",
    docsUrl: "https://developers.pipedrive.com/docs/api/v1",
  },
  {
    id: "monday",
    name: "Monday.com",
    description: "Connect Monday.com boards for lead tracking",
    color: "#FF3D57",
    logo: "M",
    authType: "apikey",
    docsUrl: "https://developer.monday.com/api-reference/docs",
  },
  {
    id: "custom_webhook",
    name: "Custom Webhook",
    description: "Connect any CRM via webhooks (Zapier, Make, n8n)",
    color: "#6366F1",
    logo: "⚡",
    authType: "webhook",
    docsUrl: "",
  },
];

interface IntegrationState {
  provider: CRMProvider | null;
  enabled: boolean;
  hasCredentials: boolean;
  lastSynced?: string;
  syncSettings: {
    syncOnSmsReceived: boolean;
    syncOnSmsSent: boolean;
    syncOnCallCompleted: boolean;
    syncOnStatusChange: boolean;
  };
}

export default function IntegrationsPage() {
  const { teamId, isTeamReady } = useCurrentTeam();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [integration, setIntegration] = useState<IntegrationState>({
    provider: null,
    enabled: false,
    hasCredentials: false,
    syncSettings: {
      syncOnSmsReceived: true,
      syncOnSmsSent: true,
      syncOnCallCompleted: true,
      syncOnStatusChange: true,
    },
  });
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<CRMProvider | null>(
    null,
  );

  // Form state for credentials
  const [credentials, setCredentials] = useState({
    clientId: "",
    clientSecret: "",
    apiKey: "",
    webhookUrl: "",
    instanceUrl: "",
  });

  // Fetch current integration status
  useEffect(() => {
    if (!teamId || !isTeamReady) return;

    const fetchIntegration = async () => {
      try {
        const response = await fetch(`/api/integrations/crm?teamId=${teamId}`);
        if (response.ok) {
          const data = await response.json();
          setIntegration({
            provider: data.provider,
            enabled: data.enabled,
            hasCredentials: data.hasCredentials,
            syncSettings: data.syncSettings || {
              syncOnSmsReceived: true,
              syncOnSmsSent: true,
              syncOnCallCompleted: true,
              syncOnStatusChange: true,
            },
          });
        }
      } catch (error) {
        console.error("Error fetching integration:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchIntegration();
  }, [teamId, isTeamReady]);

  const handleConnect = async (provider: CRMProvider) => {
    const providerConfig = CRM_PROVIDERS.find((p) => p.id === provider);
    if (!providerConfig) return;

    if (providerConfig.authType === "oauth") {
      // Redirect to OAuth flow
      const redirectUrl = `/api/integrations/oauth/${provider}?teamId=${teamId}`;
      window.location.href = redirectUrl;
    } else {
      // Show config dialog for API key or webhook
      setSelectedProvider(provider);
      setConfigOpen(true);
    }
  };

  const handleSaveCredentials = async () => {
    if (!selectedProvider || !teamId) return;

    setSaving(true);
    try {
      const providerConfig = CRM_PROVIDERS.find(
        (p) => p.id === selectedProvider,
      );
      const creds: Record<string, string> = {};

      if (providerConfig?.authType === "apikey") {
        creds.apiKey = credentials.apiKey;
        if (selectedProvider === "salesforce") {
          creds.instanceUrl = credentials.instanceUrl;
        }
      } else if (providerConfig?.authType === "webhook") {
        creds.webhookUrl = credentials.webhookUrl;
      }

      const response = await fetch("/api/integrations/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          provider: selectedProvider,
          credentials: creds,
          enabled: true,
          syncSettings: integration.syncSettings,
        }),
      });

      if (response.ok) {
        setIntegration((prev) => ({
          ...prev,
          provider: selectedProvider,
          enabled: true,
          hasCredentials: true,
        }));
        toast.success(`Connected to ${providerConfig?.name}`);
        setConfigOpen(false);
        setCredentials({
          clientId: "",
          clientSecret: "",
          apiKey: "",
          webhookUrl: "",
          instanceUrl: "",
        });
      } else {
        toast.error("Failed to save credentials");
      }
    } catch (error) {
      toast.error("Connection failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!teamId) return;

    setSaving(true);
    try {
      const response = await fetch("/api/integrations/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          enabled: false,
          provider: null,
          credentials: {},
        }),
      });

      if (response.ok) {
        setIntegration({
          provider: null,
          enabled: false,
          hasCredentials: false,
          syncSettings: {
            syncOnSmsReceived: true,
            syncOnSmsSent: true,
            syncOnCallCompleted: true,
            syncOnStatusChange: true,
          },
        });
        toast.success("CRM disconnected");
      }
    } catch (error) {
      toast.error("Failed to disconnect");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSync = async (
    key: keyof IntegrationState["syncSettings"],
  ) => {
    const newSettings = {
      ...integration.syncSettings,
      [key]: !integration.syncSettings[key],
    };

    setIntegration((prev) => ({
      ...prev,
      syncSettings: newSettings,
    }));

    // Save to backend
    if (teamId && integration.provider) {
      await fetch("/api/integrations/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          provider: integration.provider,
          syncSettings: newSettings,
          enabled: integration.enabled,
        }),
      });
    }
  };

  if (!isTeamReady || loading) {
    return (
      <TeamSection>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </TeamSection>
    );
  }

  const connectedProvider = integration.provider
    ? CRM_PROVIDERS.find((p) => p.id === integration.provider)
    : null;

  return (
    <TeamSection>
      <TeamHeader
        title="CRM Integrations"
        links={[{ title: "Settings", href: "/settings" }]}
      />

      <div className="container max-w-4xl py-6 space-y-6">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">
            Make Your CRM <span className="text-primary">Better</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            NEXTIER doesn't replace your CRM — we supercharge it with relentless
            lead generation, creative outbound, and compounding engagement
            loops.
          </p>
        </div>

        {/* Current Connection Status */}
        {integration.enabled && connectedProvider && (
          <Card
            className="border-2"
            style={{ borderColor: connectedProvider.color }}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: connectedProvider.color }}
                  >
                    {connectedProvider.logo}
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {connectedProvider.name}
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      SMS and call activities automatically sync to your CRM
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Disconnect"
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <h4 className="font-medium text-sm">Sync Settings</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sync-sms-sent">Sync outbound SMS</Label>
                    <Switch
                      id="sync-sms-sent"
                      checked={integration.syncSettings.syncOnSmsSent}
                      onCheckedChange={() => handleToggleSync("syncOnSmsSent")}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sync-sms-received">Sync inbound SMS</Label>
                    <Switch
                      id="sync-sms-received"
                      checked={integration.syncSettings.syncOnSmsReceived}
                      onCheckedChange={() =>
                        handleToggleSync("syncOnSmsReceived")
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sync-calls">Sync call activities</Label>
                    <Switch
                      id="sync-calls"
                      checked={integration.syncSettings.syncOnCallCompleted}
                      onCheckedChange={() =>
                        handleToggleSync("syncOnCallCompleted")
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sync-status">Sync status changes</Label>
                    <Switch
                      id="sync-status"
                      checked={integration.syncSettings.syncOnStatusChange}
                      onCheckedChange={() =>
                        handleToggleSync("syncOnStatusChange")
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Integrations */}
        <div>
          <h2 className="text-lg font-semibold mb-4">
            {integration.enabled ? "Switch to Another CRM" : "Connect Your CRM"}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {CRM_PROVIDERS.map((provider) => {
              const isConnected =
                integration.enabled && integration.provider === provider.id;

              return (
                <Card
                  key={provider.id}
                  className={`transition-all ${isConnected ? "opacity-50" : "hover:shadow-md cursor-pointer"}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: provider.color }}
                      >
                        {provider.logo}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {provider.name}
                          {isConnected && (
                            <Badge variant="secondary" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {provider.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {provider.authType === "oauth" && "OAuth 2.0"}
                        {provider.authType === "apikey" && "API Key"}
                        {provider.authType === "webhook" && "Webhook"}
                      </Badge>
                      <Button
                        size="sm"
                        variant={isConnected ? "outline" : "default"}
                        onClick={() => handleConnect(provider.id)}
                        disabled={isConnected}
                      >
                        {isConnected ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Connected
                          </>
                        ) : (
                          <>
                            <Link2 className="h-3 w-3 mr-1" />
                            Connect
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Config Dialog */}
        <Dialog open={configOpen} onOpenChange={setConfigOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                Connect{" "}
                {selectedProvider
                  ? CRM_PROVIDERS.find((p) => p.id === selectedProvider)?.name
                  : "CRM"}
              </DialogTitle>
              <DialogDescription>
                Enter your credentials to connect your CRM.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {selectedProvider &&
                CRM_PROVIDERS.find((p) => p.id === selectedProvider)
                  ?.authType === "apikey" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="apiKey">API Key</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        value={credentials.apiKey}
                        onChange={(e) =>
                          setCredentials((prev) => ({
                            ...prev,
                            apiKey: e.target.value,
                          }))
                        }
                        placeholder="Enter your API key"
                      />
                    </div>
                    {selectedProvider === "salesforce" && (
                      <div className="space-y-2">
                        <Label htmlFor="instanceUrl">Instance URL</Label>
                        <Input
                          id="instanceUrl"
                          value={credentials.instanceUrl}
                          onChange={(e) =>
                            setCredentials((prev) => ({
                              ...prev,
                              instanceUrl: e.target.value,
                            }))
                          }
                          placeholder="https://yourcompany.salesforce.com"
                        />
                      </div>
                    )}
                  </>
                )}

              {selectedProvider === "custom_webhook" && (
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <Input
                    id="webhookUrl"
                    value={credentials.webhookUrl}
                    onChange={(e) =>
                      setCredentials((prev) => ({
                        ...prev,
                        webhookUrl: e.target.value,
                      }))
                    }
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    NEXTIER will POST activity data to this URL
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfigOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCredentials} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Connect"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Info Card */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Webhook className="h-8 w-8 text-primary shrink-0" />
              <div>
                <h3 className="font-medium mb-1">How CRM Sync Works</h3>
                <p className="text-sm text-muted-foreground">
                  When GIANNA, CATHY, or SABRINA send SMS messages or complete
                  calls, activities are automatically logged to your CRM. This
                  keeps your sales team informed without any manual data entry.
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• Outbound SMS → CRM Note/Task</li>
                  <li>• Inbound Response → CRM Activity + Lead Update</li>
                  <li>• Call Completed → CRM Call Log</li>
                  <li>• Status Change → CRM Field Update</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TeamSection>
  );
}
