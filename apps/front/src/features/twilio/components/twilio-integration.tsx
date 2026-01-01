"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  TestTube,
  Phone,
  Key,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  defaultFromNumber: string;
  isConfigured: boolean;
  isEnabled: boolean;
}

interface TwilioNumber {
  phoneNumber: string;
  friendlyName: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
}

export function TwilioIntegration() {
  const [config, setConfig] = useState<TwilioConfig>({
    accountSid: "",
    authToken: "",
    defaultFromNumber: "",
    isConfigured: false,
    isEnabled: false,
  });
  const [numbers, setNumbers] = useState<TwilioNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/settings");
      const data = await response.json();

      if (data.success) {
        const twilioStatus = data.status?.find(
          (s: { provider: string }) => s.provider === "twilio"
        );
        setConfig((prev) => ({
          ...prev,
          isConfigured: twilioStatus?.configured || false,
          isEnabled: twilioStatus?.configured || false,
        }));
      }
    } catch (error) {
      console.error("Error fetching Twilio config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "twilio" }),
      });
      const data = await response.json();

      if (data.success) {
        setTestResult({
          success: true,
          message: "Twilio connection successful!",
        });
        toast.success("Twilio connection verified");
      } else {
        setTestResult({
          success: false,
          message: data.message || "Connection failed",
        });
        toast.error(data.message || "Connection test failed");
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: "Failed to test connection",
      });
      toast.error("Failed to test Twilio connection");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      toast.success("Twilio settings saved");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="credentials" className="space-y-6">
        <TabsList>
          <TabsTrigger value="credentials" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Credentials
          </TabsTrigger>
          <TabsTrigger value="numbers" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Phone Numbers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="credentials">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Twilio API Credentials
                    {config.isConfigured ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Configured
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Not Configured
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Twilio credentials are configured via environment variables in DigitalOcean.
                    Test the connection below to verify.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="enabled">Enabled</Label>
                  <Switch
                    id="enabled"
                    checked={config.isEnabled}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({ ...prev, isEnabled: checked }))
                    }
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Environment Variables (DigitalOcean)</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      These should be configured in your DigitalOcean App Platform settings:
                    </p>
                    <ul className="text-xs text-muted-foreground mt-2 space-y-1 font-mono">
                      <li>TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</li>
                      <li>TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</li>
                      <li>TWILIO_PHONE_NUMBER=+1xxxxxxxxxx</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                >
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
              </div>

              {testResult && (
                <div
                  className={`p-4 rounded-lg flex items-center gap-2 ${
                    testResult.success
                      ? "bg-green-500/10 text-green-600"
                      : "bg-red-500/10 text-red-600"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                  {testResult.message}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="numbers">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Phone Numbers</CardTitle>
                  <CardDescription>
                    Manage your Twilio phone numbers for voice calls.
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={fetchConfig}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {numbers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No phone numbers loaded</p>
                  <p className="text-sm mt-1">
                    Configure and test your Twilio credentials first.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {numbers.map((number) => (
                    <div
                      key={number.phoneNumber}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{number.phoneNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {number.friendlyName}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {number.capabilities.voice && (
                          <Badge variant="outline">Voice</Badge>
                        )}
                        {number.capabilities.sms && (
                          <Badge variant="outline">SMS</Badge>
                        )}
                        {number.capabilities.mms && (
                          <Badge variant="outline">MMS</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
