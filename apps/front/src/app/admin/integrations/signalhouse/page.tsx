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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle,
  AlertCircle,
  Phone,
  MessageSquare,
  Shield,
  Activity,
  Save,
  TestTube,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SignalHousePage() {
  const [apiKey, setApiKey] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    messagesThisMonth: number;
    deliveryRate: number;
    avgResponseTime: number;
    phoneVerifications: number;
  } | null>(null);
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: number;
    type: string;
    phone: string;
    status: string;
    time: string;
  }>>([]);

  const testConnection = async () => {
    if (!apiKey.trim()) {
      setError("Please enter an API key first");
      return;
    }

    setIsTestingConnection(true);
    setError(null);

    try {
      const response = await fetch("/api/signalhouse/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Connection test failed");
      }

      setIsConnected(true);
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

    try {
      const response = await fetch("/api/signalhouse/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save settings");
      }

      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            SignalHouse SMS
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure SignalHouse SMS and phone verification integration
          </p>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isConnected && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Not Configured</AlertTitle>
          <AlertDescription>
            Enter your SignalHouse API key below to enable SMS and phone verification features.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Messages This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats ? stats.messagesThisMonth.toLocaleString() : "—"}</div>
            <p className="text-xs text-muted-foreground">{isConnected ? "Real-time data" : "Not connected"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats ? `${stats.deliveryRate}%` : "—"}</div>
            <p className="text-xs text-muted-foreground">{isConnected ? "Industry avg: 95%" : "Not connected"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats ? `${stats.avgResponseTime}s` : "—"}</div>
            <p className="text-xs text-muted-foreground">{isConnected ? "Message delivery" : "Not connected"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Phone Verifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats ? stats.phoneVerifications.toLocaleString() : "—"}</div>
            <p className="text-xs text-muted-foreground">{isConnected ? "This month" : "Not connected"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription>
              Enter your SignalHouse API credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sh_live_xxxxxxxxxxxxxxxxxx"
              />
              <p className="text-xs text-muted-foreground">
                Find your API key in the SignalHouse dashboard
              </p>
            </div>

            <div className="space-y-2">
              <Label>Webhook URL (for incoming messages)</Label>
              <Input
                readOnly
                value="https://api.outreach.app/webhooks/signalhouse"
              />
              <p className="text-xs text-muted-foreground">
                Configure this URL in your SignalHouse settings
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={testConnection} disabled={isTestingConnection || !apiKey.trim()} variant="outline">
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
            <CardTitle>Features</CardTitle>
            <CardDescription>
              Enable/disable SignalHouse features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>SMS Messaging</Label>
                <p className="text-xs text-muted-foreground">Send SMS to leads</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Phone Verification</Label>
                <p className="text-xs text-muted-foreground">Verify phone numbers before sending</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Delivery Receipts</Label>
                <p className="text-xs text-muted-foreground">Track message delivery status</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Two-Way Messaging</Label>
                <p className="text-xs text-muted-foreground">Receive and process replies</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest SignalHouse API activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected || recentActivity.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No Activity Yet</p>
              <p className="text-sm">
                {isConnected
                  ? "Activity will appear here once you start sending messages."
                  : "Configure your API key to start tracking activity."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.type === "SMS" ? (
                          <MessageSquare className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Shield className="h-4 w-4 text-purple-500" />
                        )}
                        {item.type}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{item.phone}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          item.status === "delivered" || item.status === "valid"
                            ? "bg-green-500/10 text-green-500"
                            : item.status === "invalid" || item.status === "failed"
                            ? "bg-red-500/10 text-red-500"
                            : ""
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.time}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
