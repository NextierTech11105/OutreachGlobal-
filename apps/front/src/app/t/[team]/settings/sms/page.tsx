"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SMSOnboardingWizard } from "@/components/signalhouse/sms-onboarding-wizard";
import { SMSDashboard } from "@/components/signalhouse/sms-dashboard";
import {
  MessageSquare,
  Settings,
  Zap,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  Building2,
  Megaphone,
  Phone,
  BarChart3,
  Network,
} from "lucide-react";
import { SignalHouseDashboard } from "@/components/signalhouse/signalhouse-dashboard";
import { SignalHouseHierarchyView } from "@/components/signalhouse/hierarchy-view";

export default function SMSSettingsPage() {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [hasSetup, setHasSetup] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [brandCount, setBrandCount] = useState(0);
  const [campaignCount, setCampaignCount] = useState(0);
  const [numberCount, setNumberCount] = useState(0);

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
        // Check if setup is complete (has brands, campaigns, numbers)
        const [brandsRes, campaignsRes, numbersRes] = await Promise.all([
          fetch("/api/signalhouse/brand"),
          fetch("/api/signalhouse/campaign"),
          fetch("/api/signalhouse/numbers"),
        ]);

        const [brands, campaigns, numbers] = await Promise.all([
          brandsRes.json(),
          campaignsRes.json(),
          numbersRes.json(),
        ]);

        const brandsLen = brands.brands?.length || 0;
        const campaignsLen = campaigns.campaigns?.length || 0;
        const numbersLen = numbers.numbers?.length || 0;

        setBrandCount(brandsLen);
        setCampaignCount(campaignsLen);
        setNumberCount(numbersLen);

        setHasSetup(brandsLen > 0 && campaignsLen > 0 && numbersLen > 0);
      }
    } catch (error) {
      console.error("Failed to check status:", error);
      setIsConfigured(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // Not configured - show setup instructions
  if (!isConfigured) {
    return (
      <div className="container py-8 max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
            <CardTitle>SMS Not Configured</CardTitle>
            <CardDescription>
              SMS API credentials are not set up yet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">
                To enable SMS messaging:
              </p>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>
                  Contact your administrator to configure SMS API credentials
                </li>
                <li>
                  Get your API Key and Auth Token from the SMS provider
                  dashboard
                </li>
                <li>
                  Add them to your environment variables:
                  <pre className="mt-2 p-2 bg-background rounded text-xs overflow-x-auto">
                    {`SMS_API_KEY=your-api-key
SMS_AUTH_TOKEN=your-auth-token`}
                  </pre>
                </li>
                <li>Redeploy your application</li>
              </ol>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={checkStatus}
                className="flex-1"
              >
                Refresh Status
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show wizard mode
  if (showWizard) {
    return (
      <div className="container py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setShowWizard(false)}>
            ← Back to Dashboard
          </Button>
        </div>
        <SMSOnboardingWizard />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">SMS Settings</h1>
              <p className="text-muted-foreground">
                Manage your SMS messaging setup, phone numbers, and campaigns
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
              Connected
            </Badge>
            <Button onClick={() => setShowWizard(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Register New Brand
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{brandCount}</p>
                <p className="text-sm text-muted-foreground">Registered Brands</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Megaphone className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{campaignCount}</p>
                <p className="text-sm text-muted-foreground">10DLC Campaigns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Phone className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{numberCount}</p>
                <p className="text-sm text-muted-foreground">Phone Numbers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="analytics">
        <TabsList className="mb-6">
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="architecture" className="gap-2">
            <Network className="h-4 w-4" />
            Architecture
          </TabsTrigger>
          <TabsTrigger value="setup" className="gap-2">
            <Settings className="h-4 w-4" />
            Setup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <SignalHouseDashboard />
        </TabsContent>

        <TabsContent value="messages">
          <SMSDashboard />
        </TabsContent>

        <TabsContent value="architecture">
          <div className="space-y-6">
            <SignalHouseHierarchyView />

            {/* Architecture Documentation */}
            <Card>
              <CardHeader>
                <CardTitle>SignalHouse CPaaS Architecture</CardTitle>
                <CardDescription>
                  How NEXTIER integrates with SignalHouse for multi-tenant SMS
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Groups */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Groups</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Top-level customer or organization container. In NEXTIER, this maps to
                      your main account or agency.
                    </p>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Owns all SubGroups, numbers, and campaigns</li>
                      <li>• Billing and usage aggregation point</li>
                      <li>• API key scope boundary</li>
                    </ul>
                  </div>

                  {/* SubGroups */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Megaphone className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold">SubGroups = NEXTIER Teams</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Child containers that map 1:1 to NEXTIER Teams. Isolated for
                      compliance and analytics.
                    </p>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Each Team gets its own SubGroup</li>
                      <li>• Campaigns attach at SubGroup level</li>
                      <li>• Per-team messaging analytics</li>
                    </ul>
                  </div>

                  {/* Brands */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold">10DLC Brands</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Registered business entities for carrier compliance.
                      Required for A2P messaging.
                    </p>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• EIN, legal name, website verification</li>
                      <li>• TCR (Campaign Registry) registration</li>
                      <li>• Compliance URLs (opt-in, privacy, terms)</li>
                    </ul>
                  </div>

                  {/* Campaigns */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Megaphone className="h-5 w-5 text-purple-600" />
                      <h3 className="font-semibold">10DLC Campaigns</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Messaging use case registration. Determines carrier
                      throughput limits.
                    </p>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Use cases: MARKETING, LOW_VOLUME, MIXED</li>
                      <li>• AT&T: 75 TPM (texts per minute)</li>
                      <li>• T-Mobile: Daily message caps</li>
                    </ul>
                  </div>
                </div>

                {/* Data Flow */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold mb-3">Bidirectional SMS Flow</h3>
                  <div className="font-mono text-xs overflow-x-auto">
                    <pre>{`OUTBOUND:
  NEXTIER Campaign → SignalHouse API → Carrier Network → Lead Phone
                          ↓
                   [Rate Limited by TPM]

INBOUND:
  Lead Reply → Carrier → SignalHouse Webhook → NEXTIER /api/signalhouse/webhook
                                                    ↓
                                            AI Classification (GIANNA)
                                                    ↓
                                            Response Generation`}</pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="setup">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  SMS Infrastructure Ready
                </CardTitle>
                <CardDescription>
                  Your SMS messaging is fully configured
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Brands</span>
                      <Badge variant="secondary">{brandCount}</Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowWizard(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Brand
                    </Button>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Campaigns</span>
                      <Badge variant="secondary">{campaignCount}</Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowWizard(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Campaign
                    </Button>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Numbers</span>
                      <Badge variant="secondary">{numberCount}</Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowWizard(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Number
                    </Button>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <Button variant="secondary" onClick={() => setShowWizard(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Run Full Setup Wizard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
