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
} from "lucide-react";

export default function SMSSettingsPage() {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [hasSetup, setHasSetup] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

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

        const hasBrands = (brands.brands?.length || 0) > 0;
        const hasCampaigns = (campaigns.campaigns?.length || 0) > 0;
        const hasNumbers = (numbers.numbers?.length || 0) > 0;

        setHasSetup(hasBrands && hasCampaigns && hasNumbers);
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
                <li>Get your API Key and Auth Token from the SMS provider dashboard</li>
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
              <Button variant="outline" onClick={checkStatus} className="flex-1">
                Refresh Status
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <MessageSquare className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">SMS Settings</h1>
          <Badge variant="outline" className="ml-2">
            <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
            Connected
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Manage your SMS messaging setup, phone numbers, and campaigns
        </p>
      </div>

      <Tabs defaultValue={hasSetup ? "dashboard" : "setup"}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard" className="gap-2">
            <Zap className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="setup" className="gap-2">
            <Settings className="h-4 w-4" />
            {hasSetup ? "Manage Setup" : "Setup Wizard"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <SMSDashboard />
        </TabsContent>

        <TabsContent value="setup">
          {hasSetup ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Setup Complete
                  </CardTitle>
                  <CardDescription>
                    Your SMS messaging is fully configured and ready to use
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    You can run the setup wizard again to add more brands,
                    campaigns, or phone numbers.
                  </p>
                  <Button variant="outline" onClick={() => setHasSetup(false)}>
                    Run Setup Wizard Again
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <SMSOnboardingWizard />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
