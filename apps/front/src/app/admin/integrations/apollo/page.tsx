"use client";

import { useState, useEffect } from "react";
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
import {
  CheckCircle,
  AlertCircle,
  Save,
  TestTube,
  RefreshCw,
  AlertTriangle,
  Globe,
  ArrowLeft,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

export default function ApolloIntegrationPage() {
  const [apiKey, setApiKey] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    creditsUsed: number;
    creditsRemaining: number;
  } | null>(null);

  // Check connection status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/apollo/test");
        if (res.ok) {
          const data = await res.json();
          setIsConnected(data.configured === true);
          if (data.usage) {
            setStats({
              creditsUsed: data.usage.credits_used || 0,
              creditsRemaining: data.usage.credits_remaining || 0,
            });
          }
        }
      } catch {
        setIsConnected(false);
      }
    };
    checkStatus();
  }, []);

  const testConnection = async () => {
    if (!apiKey.trim()) {
      setError("Please enter an API key first");
      return;
    }

    setIsTestingConnection(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/apollo/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Connection test failed");
      }

      setIsConnected(true);
      setSuccessMessage("Successfully connected to Apollo.io!");
      if (data.usage) {
        setStats({
          creditsUsed: data.usage.credits_used || 0,
          creditsRemaining: data.usage.credits_remaining || 0,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection test failed");
      setIsConnected(false);
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
      const response = await fetch("/api/apollo/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save settings");
      }

      setIsConnected(true);
      setSuccessMessage("Apollo.io API key saved successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-2xl">
      {/* Back button */}
      <Link href="/admin/integrations" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Integrations
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-amber-500/10">
            <Globe className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Apollo.io</h1>
            <p className="text-muted-foreground">Lead enrichment and prospecting</p>
          </div>
        </div>
        {isConnected ? (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle className="mr-1 h-3 w-3" />
            Connected
          </Badge>
        ) : (
          <Badge variant="destructive">
            <AlertCircle className="mr-1 h-3 w-3" />
            Disconnected
          </Badge>
        )}
      </div>

      {/* Alerts */}
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

      {!isConnected && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Not Configured</AlertTitle>
          <AlertDescription>
            Enter your Apollo.io API key to enable lead enrichment.
          </AlertDescription>
        </Alert>
      )}

      {/* Usage Stats */}
      {isConnected && stats && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.creditsUsed.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">This billing cycle</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Credits Remaining</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.creditsRemaining.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Available</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* API Key Form */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>Enter your Apollo.io API key</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Apollo.io API key"
            />
            <p className="text-xs text-muted-foreground">
              Find your API key in Apollo.io Settings → Integrations → API
            </p>
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
            <Button
              onClick={saveSettings}
              disabled={isSaving || !apiKey.trim()}
            >
              {isSaving ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Apollo.io enrichment is available in the <strong>Leads</strong> page.
            Select leads and click <strong>Enrich</strong> to add contact information.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
