"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, RefreshCw } from "lucide-react";

export function ZohoIntegration() {
  const [apiKey, setApiKey] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (!apiKey || !clientId || !clientSecret) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      // In production, this would call an API to validate and store credentials
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsConnected(true);
      toast.success("Connected to Zoho CRM");
    } catch (error) {
      toast.error("Failed to connect to Zoho CRM");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsConnected(false);
      setApiKey("");
      setClientId("");
      setClientSecret("");
      toast.success("Disconnected from Zoho CRM");
    } catch (error) {
      toast.error("Failed to disconnect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Zoho CRM Integration</CardTitle>
            <CardDescription>
              Connect your Zoho CRM to sync leads and contacts
            </CardDescription>
          </div>
          <Badge
            variant={isConnected ? "default" : "secondary"}
            className="flex items-center gap-1"
          >
            {isConnected ? (
              <>
                <CheckCircle className="h-3 w-3" />
                Connected
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3" />
                Not Connected
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <>
            <div className="grid gap-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Enter Zoho Client ID"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="clientSecret">Client Secret</Label>
              <Input
                id="clientSecret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Enter Zoho Client Secret"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter Zoho API Key"
              />
            </div>
            <Button onClick={handleConnect} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect to Zoho CRM"
              )}
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 rounded-md">
              <p className="text-sm text-green-600">
                Your Zoho CRM is connected and syncing data.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Disconnecting..." : "Disconnect"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
