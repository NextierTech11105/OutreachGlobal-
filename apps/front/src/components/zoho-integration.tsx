"use client";


import { sf, sfd } from "@/lib/utils/safe-format";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  RefreshCw,
  Save,
  ExternalLink,
  Check,
  AlertTriangle,
} from "lucide-react";
import { ZohoFieldMapper } from "./zoho-field-mapper";
import { ZohoRecordMatcher } from "./zoho-record-matcher";

interface ZohoIntegrationProps {
  initialConfig?: any;
}

export function ZohoIntegration({ initialConfig }: ZohoIntegrationProps) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isConnected, setIsConnected] = useState(true); // Set to true by default to show mapping
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [activeTab, setActiveTab] = useState("field-mapping"); // Default to field-mapping tab
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [redirectUri, setRedirectUri] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [syncFrequency, setSyncFrequency] = useState("daily");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [nextSync, setNextSync] = useState<string | null>(null);
  const [availableModules, setAvailableModules] = useState<string[]>([]);
  const [selectedModule, setSelectedModule] = useState("Comm_Logs"); // Default to Comm_Logs
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [syncStats, setSyncStats] = useState<any>(null);

  // Load initial configuration
  useEffect(() => {
    if (initialConfig) {
      setClientId(initialConfig.clientId || "");
      setClientSecret(initialConfig.clientSecret || "");
      setRedirectUri(initialConfig.redirectUri || "");
      setRefreshToken(initialConfig.refreshToken || "");
      setSyncFrequency(initialConfig.syncFrequency || "daily");
      setLastSync(initialConfig.lastSync || null);
      setNextSync(initialConfig.nextSync || null);
      setIsConfigured(!!initialConfig.clientId && !!initialConfig.clientSecret);
      setIsConnected(!!initialConfig.refreshToken);
    }

    // For demo purposes, set some mock data
    setAvailableModules([
      "Leads",
      "Contacts",
      "Accounts",
      "Deals",
      "Tasks",
      "Comm_Logs",
    ]);
  }, [initialConfig]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Simulate API call to save settings
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setIsConfigured(!!clientId && !!clientSecret);
      setConnectionError(null);

      // Mock successful save
      console.log("Settings saved:", {
        clientId,
        clientSecret,
        redirectUri,
        refreshToken,
        syncFrequency,
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      setConnectionError("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionError(null);

    try {
      // Simulate API call to test connection
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock successful connection
      setIsConnected(true);
      // If Comm_Logs is selected, update the example data
      if (selectedModule === "Comm_Logs") {
        // This would be set from the API in a real implementation
        console.log("Connected to Comm_Logs module");
      }
      console.log("Connection tested successfully");
    } catch (error) {
      console.error("Connection test failed:", error);
      setConnectionError("Failed to connect to Zoho CRM");
      setIsConnected(false);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncInProgress(true);
    setSyncStats(null);

    try {
      // Simulate API call to trigger sync
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock successful sync
      setLastSync(new Date().toISOString());
      setSyncStats({
        records_processed: 156,
        created: 23,
        updated: 98,
        skipped: 35,
        errors: 0,
        duration_seconds: 45,
      });
      console.log("Sync completed");
    } catch (error) {
      console.error("Sync failed:", error);
      setConnectionError("Failed to sync with Zoho CRM");
    } finally {
      setSyncInProgress(false);
    }
  };

  const handleAuthorize = () => {
    // In a real implementation, this would redirect to Zoho OAuth
    window.open("https://accounts.zoho.com/oauth/v2/auth", "_blank");
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold">Zoho CRM Integration</h3>
          <p className="text-muted-foreground">
            Configure and manage your Zoho CRM integration
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
            id="zoho-enabled"
          />
          <Label htmlFor="zoho-enabled">Enabled</Label>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="field-mapping">Field Mapping</TabsTrigger>
          <TabsTrigger value="record-matching">Record Matching</TabsTrigger>
          <TabsTrigger value="sync-history">Sync History</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 pt-4">
          {connectionError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription>{connectionError}</AlertDescription>
            </Alert>
          )}

          {isConnected && (
            <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle>Connected to Zoho CRM</AlertTitle>
              <AlertDescription>
                Your integration is active and syncing data
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6">
            <div className="grid gap-3">
              <Label htmlFor="client-id">Client ID</Label>
              <Input
                id="client-id"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Enter your Zoho Client ID"
              />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="client-secret">Client Secret</Label>
              <Input
                id="client-secret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Enter your Zoho Client Secret"
              />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="redirect-uri">Redirect URI</Label>
              <Input
                id="redirect-uri"
                value={redirectUri}
                onChange={(e) => setRedirectUri(e.target.value)}
                placeholder="https://your-app.com/api/zoho/callback"
              />
              <p className="text-xs text-muted-foreground">
                This must match the redirect URI configured in your Zoho
                Developer Console
              </p>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="refresh-token">Refresh Token</Label>
              <div className="flex gap-2">
                <Input
                  id="refresh-token"
                  type="password"
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                  placeholder="Your refresh token will appear here after authorization"
                  readOnly={!isConfigured}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleAuthorize}
                  disabled={!isConfigured || isSaving}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Authorize
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sync-frequency">Sync Frequency</Label>
                <Select value={syncFrequency} onValueChange={setSyncFrequency}>
                  <SelectTrigger id="sync-frequency">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-module">Default Module</Label>
                <Select
                  value={selectedModule}
                  onValueChange={setSelectedModule}
                >
                  <SelectTrigger id="default-module">
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModules.map((module) => (
                      <SelectItem key={module} value={module}>
                        {module}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Last Sync</Label>
                <div className="flex items-center space-x-2 h-9 px-3 py-2 rounded-md border border-input bg-background text-sm">
                  {lastSync
                    ? new Datesf(lastSync)
                    : "Never synced"}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Next Scheduled Sync</Label>
                <div className="flex items-center space-x-2 h-9 px-3 py-2 rounded-md border border-input bg-background text-sm">
                  {nextSync
                    ? new Datesf(nextSync)
                    : "Not scheduled"}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="field-mapping" className="space-y-6 pt-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Selected Module</Label>
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  {availableModules.map((module) => (
                    <SelectItem key={module} value={module}>
                      {module}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ZohoFieldMapper
              module={selectedModule}
              isConnected={isConnected}
            />
          </div>
        </TabsContent>

        <TabsContent value="record-matching" className="space-y-6 pt-4">
          <ZohoRecordMatcher
            module={selectedModule}
            isConnected={isConnected}
          />
        </TabsContent>

        <TabsContent value="sync-history" className="space-y-6 pt-4">
          {syncStats && (
            <div className="rounded-md bg-muted p-4">
              <div className="font-medium">Last Sync Results</div>
              <div className="mt-2 grid grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">
                    Processed
                  </span>
                  <span className="text-2xl font-bold">
                    {syncStats.records_processed}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {syncStats.created}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Updated</span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {syncStats.updated}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Skipped</span>
                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {syncStats.skipped}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Errors</span>
                  <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {syncStats.errors}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">
                    Duration
                  </span>
                  <span className="text-2xl font-bold">
                    {syncStats.duration_seconds}s
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-md border">
            <div className="p-4 font-medium border-b">
              Recent Sync Operations
            </div>
            <div className="divide-y">
              <div className="p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium">Full Sync</div>
                  <div className="text-sm text-muted-foreground">
                    May 9, 2025 at 2:30 PM
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                >
                  Completed
                </Badge>
              </div>
              <div className="p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium">Incremental Sync</div>
                  <div className="text-sm text-muted-foreground">
                    May 8, 2025 at 2:30 PM
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                >
                  Completed
                </Badge>
              </div>
              <div className="p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium">Manual Sync</div>
                  <div className="text-sm text-muted-foreground">
                    May 7, 2025 at 11:15 AM
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                >
                  Partial
                </Badge>
              </div>
              <div className="p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium">Full Sync</div>
                  <div className="text-sm text-muted-foreground">
                    May 6, 2025 at 9:00 AM
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                >
                  Failed
                </Badge>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      <CardFooter className="flex justify-between mt-6 px-0">
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={!isConfigured || isTesting}
          >
            {isTesting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            {isTesting ? "Testing..." : "Test Connection"}
          </Button>

          <Button
            variant="outline"
            onClick={handleSyncNow}
            disabled={!isConnected || syncInProgress}
          >
            {syncInProgress ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {syncInProgress ? "Syncing..." : "Sync Now"}
          </Button>
        </div>

        <Button onClick={handleSaveSettings} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </CardFooter>
    </div>
  );
}
