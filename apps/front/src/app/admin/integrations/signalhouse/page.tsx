"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SMSOnboardingWizard } from "@/components/signalhouse/sms-onboarding-wizard";
import { SMSDashboard } from "@/components/signalhouse/sms-dashboard";
import {
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Settings,
  LayoutDashboard,
  Wand2,
  Save,
  TestTube,
  RefreshCw,
  ExternalLink,
  DollarSign,
  Phone,
  Building2,
  Megaphone,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SignalHouseAdminPage() {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [hasSetup, setHasSetup] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    brands: number;
    campaigns: number;
    numbers: number;
    balance: string;
  } | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      // Check if SignalHouse is configured
      const statusRes = await fetch("/api/signalhouse");
      const statusData = await statusRes.json();
      setIsConfigured(statusData.configured === true);

      if (statusData.configured) {
        // Check setup status and get counts
        const [brandsRes, campaignsRes, numbersRes, analyticsRes] = await Promise.all([
          fetch("/api/signalhouse/brand"),
          fetch("/api/signalhouse/campaign"),
          fetch("/api/signalhouse/numbers"),
          fetch("/api/signalhouse/analytics?type=wallet"),
        ]);

        const [brands, campaigns, numbers, analytics] = await Promise.all([
          brandsRes.json(),
          campaignsRes.json(),
          numbersRes.json(),
          analyticsRes.json(),
        ]);

        const brandCount = brands.brands?.length || 0;
        const campaignCount = campaigns.campaigns?.length || 0;
        const numberCount = numbers.numbers?.length || 0;

        setStats({
          brands: brandCount,
          campaigns: campaignCount,
          numbers: numberCount,
          balance: analytics.wallet?.balance ? `$${analytics.wallet.balance}` : "$0.00",
        });

        setHasSetup(brandCount > 0 && campaignCount > 0 && numberCount > 0);
      }
    } catch (error) {
      console.error("Failed to check status:", error);
      setIsConfigured(false);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    if (!apiKey.trim()) {
      setError("Please enter an API key first");
      return;
    }

    setIsTestingConnection(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/signalhouse/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, authToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Connection test failed");
      }

      setSuccessMessage("Connection successful! API credentials are valid.");
      setIsConfigured(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection test failed");
    } finally {
      setIsTestingConnection(false);
    }
  };

  const saveSettings = async () => {
    if (!apiKey.trim()) {
      setError("Please enter an API key");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/signalhouse/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, authToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      setSuccessMessage("Settings saved successfully!");
      setIsConfigured(true);
      checkStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            SignalHouse SMS
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete SMS platform with 10DLC compliance, phone numbers, and messaging
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConfigured ? (
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
              <CheckCircle className="mr-1 h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertCircle className="mr-1 h-3 w-3" />
              Not Configured
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      {isConfigured && stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-500" />
                Brands
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.brands}</div>
              <p className="text-xs text-muted-foreground">10DLC registered</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-purple-500" />
                Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.campaigns}</div>
              <p className="text-xs text-muted-foreground">Active campaigns</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4 text-green-500" />
                Phone Numbers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.numbers}</div>
              <p className="text-xs text-muted-foreground">Provisioned</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-yellow-500" />
                Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.balance}</div>
              <p className="text-xs text-muted-foreground">Wallet balance</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue={!isConfigured ? "config" : hasSetup ? "dashboard" : "wizard"}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard" className="gap-2" disabled={!isConfigured}>
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="wizard" className="gap-2" disabled={!isConfigured}>
            <Wand2 className="h-4 w-4" />
            Setup Wizard
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            Configuration
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          {isConfigured ? (
            <SMSDashboard />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Configure your API credentials first to view the dashboard.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Setup Wizard Tab */}
        <TabsContent value="wizard">
          {isConfigured ? (
            hasSetup ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Setup Complete
                    </CardTitle>
                    <CardDescription>
                      Your SMS messaging is fully configured and ready to use
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      You can run the setup wizard again to add more brands, campaigns, or phone numbers.
                    </p>
                    <Button variant="outline" onClick={() => setHasSetup(false)}>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Run Setup Wizard Again
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <SMSOnboardingWizard />
            )
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Configure your API credentials first to run the setup wizard.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>API Credentials</CardTitle>
                <CardDescription>
                  Enter your SignalHouse API credentials from{" "}
                  <a
                    href="https://app.signalhouse.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    app.signalhouse.io
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {successMessage && (
                  <Alert className="bg-green-500/10 border-green-500/20">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertTitle className="text-green-500">Success</AlertTitle>
                    <AlertDescription className="text-green-400">{successMessage}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Your SignalHouse API Key"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Auth Token</Label>
                  <Input
                    type="password"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    placeholder="Your SignalHouse Auth Token"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={testConnection}
                    disabled={isTestingConnection || !apiKey.trim()}
                    variant="outline"
                  >
                    {isTestingConnection ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <TestTube className="mr-2 h-4 w-4" />
                    )}
                    Test Connection
                  </Button>
                  <Button onClick={saveSettings} disabled={isSaving || !apiKey.trim()}>
                    {isSaving ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Settings
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
                <CardDescription>
                  How to set up SignalHouse SMS integration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Create SignalHouse Account</p>
                      <p className="text-sm text-muted-foreground">
                        Sign up at{" "}
                        <a
                          href="https://app.signalhouse.io"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          app.signalhouse.io
                        </a>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Get API Credentials</p>
                      <p className="text-sm text-muted-foreground">
                        Copy your API Key and Auth Token from the dashboard
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Run Setup Wizard</p>
                      <p className="text-sm text-muted-foreground">
                        Register your brand, create a campaign, and get a phone number
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      4
                    </div>
                    <div>
                      <p className="font-medium">Fund Your Account</p>
                      <p className="text-sm text-muted-foreground">
                        Add balance to start sending messages
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button asChild variant="outline" className="w-full">
                    <a
                      href="https://app.signalhouse.io"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open SignalHouse Dashboard
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Environment Variables Info */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Environment Variables</CardTitle>
              <CardDescription>
                For production, set these in your deployment environment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-zinc-900 p-4 rounded-lg text-sm overflow-x-auto">
{`SIGNALHOUSE_API_KEY=your-api-key
SIGNALHOUSE_AUTH_TOKEN=your-auth-token`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
