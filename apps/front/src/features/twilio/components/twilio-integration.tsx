"use client";

import { useState } from "react";
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
import { toast } from "sonner";
import { CheckCircle, XCircle, RefreshCw, Phone } from "lucide-react";

export function TwilioIntegration() {
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (!accountSid || !authToken) {
      toast.error("Please fill in Account SID and Auth Token");
      return;
    }

    setLoading(true);
    try {
      // In production, this would validate credentials with Twilio API
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsConnected(true);
      toast.success("Connected to Twilio");
    } catch (error) {
      toast.error("Failed to connect to Twilio");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsConnected(false);
      setAccountSid("");
      setAuthToken("");
      setPhoneNumber("");
      toast.success("Disconnected from Twilio");
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
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Phone className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <CardTitle>Twilio Integration</CardTitle>
              <CardDescription>
                Connect Twilio for SMS and voice calling
              </CardDescription>
            </div>
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
              <Label htmlFor="accountSid">Account SID</Label>
              <Input
                id="accountSid"
                value={accountSid}
                onChange={(e) => setAccountSid(e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="authToken">Auth Token</Label>
              <Input
                id="authToken"
                type="password"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="Enter your Auth Token"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phoneNumber">Phone Number (optional)</Label>
              <Input
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
              />
            </div>
            <Button
              onClick={handleConnect}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect to Twilio"
              )}
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 rounded-md">
              <p className="text-sm text-green-600">
                Twilio is connected. You can now send SMS and make calls.
              </p>
            </div>
            {phoneNumber && (
              <div className="p-3 border rounded-md">
                <p className="text-sm text-muted-foreground">Phone Number</p>
                <p className="font-medium">{phoneNumber}</p>
              </div>
            )}
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
