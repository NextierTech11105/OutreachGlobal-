"use client";

/**
 * SignalHouse Campaign Dashboard
 * Displays campaign status, carrier approvals, TPM limits, and analytics
 * Wraps SignalHouse API data in NEXTIER UI
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Settings,
  BarChart3,
  Users,
  Zap,
} from "lucide-react";

// Types matching SignalHouse API response
interface CarrierStatus {
  carrier: string;
  qualify: boolean;
  mnoReview: boolean;
  tpmScope?: string;
  smsTpm?: number;
  mmsTpm?: number;
  messageClass?: string;
  status: "REGISTERED" | "PENDING" | "REJECTED";
  brandTier?: string;
  brandDailyCap?: boolean;
}

interface CampaignAttributes {
  subscriberOptin: boolean;
  subscriberOptout: boolean;
  subscriberHelp: boolean;
  numberPooling: boolean;
  embeddedLink: boolean;
  embeddedPhone: boolean;
  ageGated: boolean;
  affiliateMarketing: boolean;
}

interface PhoneNumber {
  number: string;
  status: "Ready" | "Active" | "Inactive";
  tag?: string;
  assignedWorker?: string;
}

interface CampaignAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  avgMessagesPerDay: number;
  totalSegments: number;
  uniqueClicks: number;
  clickthroughRate: number;
  byCarrier: {
    carrier: string;
    sent: number;
    delivered: number;
    failed: number;
  }[];
}

interface SignalHouseCampaign {
  campaignId: string;
  brandId: string;
  brandName: string;
  status: "Active" | "Pending" | "Expired" | "Rejected";
  tcrStatus: string;
  useCase: string;
  registeredOn: string;
  expirationDate: string;
  groupId: string;
  subgroups: { id: string; name: string }[];
  phoneNumbers: PhoneNumber[];
  carrierStatus: CarrierStatus[];
  attributes: CampaignAttributes;
  description: string;
  callToAction: string;
  sampleMessages: string[];
  privacyPolicyUrl: string;
  termsUrl: string;
  websiteUrl: string;
  analytics?: CampaignAnalytics;
}

interface CampaignDashboardProps {
  campaignId: string;
  teamId?: string;
  onRefresh?: () => void;
}

const CARRIER_LOGOS: Record<string, string> = {
  "AT&T": "🔵",
  "T-Mobile": "🟣",
  "Verizon Wireless": "🔴",
  "US Cellular": "🟢",
  "ClearSky": "⚪",
  "Interop": "🟡",
};

export function SignalHouseCampaignDashboard({
  campaignId,
  teamId,
  onRefresh,
}: CampaignDashboardProps) {
  const [campaign, setCampaign] = useState<SignalHouseCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaignData();
  }, [campaignId]);

  async function fetchCampaignData() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/signalhouse/campaign?campaignId=${campaignId}${teamId ? `&teamId=${teamId}` : ""}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch campaign data");
      }

      const data = await response.json();
      setCampaign(data.campaign);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span>{error || "Campaign not found"}</span>
          </div>
          <Button variant="outline" className="mt-4" onClick={fetchCampaignData}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const registeredCarriers = campaign.carrierStatus.filter(
    (c) => c.status === "REGISTERED"
  ).length;
  const totalCarriers = campaign.carrierStatus.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{campaign.campaignId}</h2>
            <Badge
              variant={campaign.status === "Active" ? "default" : "secondary"}
              className={
                campaign.status === "Active"
                  ? "bg-green-500 hover:bg-green-600"
                  : ""
              }
            >
              {campaign.status}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Brand: {campaign.brandName} ({campaign.brandId})
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchCampaignData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Carrier Status</p>
                <p className="text-xl font-bold">
                  {registeredCarriers}/{totalCarriers} Registered
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Phone Numbers</p>
                <p className="text-xl font-bold">{campaign.phoneNumbers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">AT&T TPM Limit</p>
                <p className="text-xl font-bold">
                  {campaign.carrierStatus.find((c) => c.carrier === "AT&T")?.smsTpm || "N/A"}/min
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Expires</p>
                <p className="text-xl font-bold">
                  {new Date(campaign.expirationDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="carriers" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="carriers">Carrier Status</TabsTrigger>
          <TabsTrigger value="numbers">Phone Numbers</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="attributes">Attributes</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* Carrier Status Tab */}
        <TabsContent value="carriers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Carrier Registration Status</CardTitle>
              <CardDescription>
                10DLC registration status and throughput limits by carrier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaign.carrierStatus.map((carrier) => (
                  <div
                    key={carrier.carrier}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {CARRIER_LOGOS[carrier.carrier] || "📱"}
                      </span>
                      <div>
                        <p className="font-medium">{carrier.carrier}</p>
                        <div className="flex gap-2 text-sm text-muted-foreground">
                          {carrier.smsTpm && (
                            <span>SMS: {carrier.smsTpm} TPM</span>
                          )}
                          {carrier.mmsTpm && (
                            <span>MMS: {carrier.mmsTpm} TPM</span>
                          )}
                          {carrier.brandTier && (
                            <span>Tier: {carrier.brandTier}</span>
                          )}
                          {carrier.brandDailyCap && (
                            <Badge variant="outline" className="text-xs">
                              Daily Cap
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge
                          variant={
                            carrier.status === "REGISTERED"
                              ? "default"
                              : carrier.status === "PENDING"
                                ? "secondary"
                                : "destructive"
                          }
                          className={
                            carrier.status === "REGISTERED"
                              ? "bg-green-500"
                              : ""
                          }
                        >
                          {carrier.status}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        {carrier.qualify ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Phone Numbers Tab */}
        <TabsContent value="numbers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Phone Numbers</CardTitle>
              <CardDescription>
                Phone numbers registered to this campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {campaign.phoneNumbers.map((phone) => (
                  <div
                    key={phone.number}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-mono font-medium">
                          +1 {phone.number.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")}
                        </p>
                        {phone.tag && (
                          <Badge variant="outline" className="text-xs">
                            {phone.tag}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {phone.assignedWorker && (
                        <Badge variant="secondary">{phone.assignedWorker}</Badge>
                      )}
                      <Badge
                        variant={phone.status === "Ready" ? "default" : "secondary"}
                        className={phone.status === "Ready" ? "bg-green-500" : ""}
                      >
                        {phone.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {campaign.phoneNumbers.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    No phone numbers assigned to this campaign
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Sent</p>
                    <p className="text-3xl font-bold">
                      {campaign.analytics?.totalSent?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Delivery Rate</p>
                    <p className="text-3xl font-bold">
                      {campaign.analytics?.deliveryRate?.toFixed(1) || 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Avg/Day</p>
                    <p className="text-3xl font-bold">
                      {campaign.analytics?.avgMessagesPerDay?.toFixed(0) || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Delivery by Carrier</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaign.analytics?.byCarrier?.map((carrier) => {
                  const rate = carrier.sent > 0
                    ? (carrier.delivered / carrier.sent) * 100
                    : 0;
                  return (
                    <div key={carrier.carrier} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          {CARRIER_LOGOS[carrier.carrier] || "📱"}
                          {carrier.carrier}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {carrier.delivered}/{carrier.sent} ({rate.toFixed(1)}%)
                        </span>
                      </div>
                      <Progress value={rate} className="h-2" />
                    </div>
                  );
                }) || (
                  <p className="text-muted-foreground text-center py-4">
                    No analytics data available yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attributes Tab */}
        <TabsContent value="attributes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Attributes</CardTitle>
              <CardDescription>
                10DLC compliance attributes for this campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries({
                  "Subscriber Opt-in": campaign.attributes.subscriberOptin,
                  "Subscriber Opt-out": campaign.attributes.subscriberOptout,
                  "Subscriber Help": campaign.attributes.subscriberHelp,
                  "Number Pooling": campaign.attributes.numberPooling,
                  "Embedded Link": campaign.attributes.embeddedLink,
                  "Embedded Phone": campaign.attributes.embeddedPhone,
                  "Age Gated": campaign.attributes.ageGated,
                  "Affiliate Marketing": campaign.attributes.affiliateMarketing,
                }).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <span>{key}</span>
                    {value ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-muted-foreground">{campaign.description}</p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Call-to-Action / Message Flow</h4>
                <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                  {campaign.callToAction}
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Sample Messages</h4>
                <div className="space-y-2">
                  {campaign.sampleMessages.map((msg, i) => (
                    <div key={i} className="p-3 bg-muted rounded-lg text-sm">
                      {msg}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <h4 className="font-medium mb-2">Website</h4>
                  <a
                    href={campaign.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline text-sm"
                  >
                    {campaign.websiteUrl}
                  </a>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Privacy Policy</h4>
                  <a
                    href={campaign.privacyPolicyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline text-sm"
                  >
                    View Policy
                  </a>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Terms & Conditions</h4>
                  <a
                    href={campaign.termsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline text-sm"
                  >
                    View Terms
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SignalHouseCampaignDashboard;
