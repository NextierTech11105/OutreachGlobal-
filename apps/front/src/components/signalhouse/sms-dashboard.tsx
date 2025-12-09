"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare,
  Phone,
  TrendingUp,
  DollarSign,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Settings,
  Plus
} from "lucide-react";

interface Analytics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  failureRate: number;
  uniqueClicks: number;
  clickthroughRate: number;
}

interface Wallet {
  balance: number;
  currency: string;
}

interface PhoneNumber {
  phoneNumber: string;
  friendlyName?: string;
  status?: string;
  campaignId?: string;
}

interface Brand {
  brandId: string;
  brandName: string;
  status?: string;
}

interface Campaign {
  campaignId: string;
  usecase: string;
  brandId: string;
  status?: string;
}

export function SMSDashboard() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [analyticsRes, numbersRes, brandsRes, campaignsRes] = await Promise.all([
        fetch("/api/signalhouse/analytics?type=dashboard"),
        fetch("/api/signalhouse/numbers"),
        fetch("/api/signalhouse/brand"),
        fetch("/api/signalhouse/campaign"),
      ]);

      const [analyticsData, numbersData, brandsData, campaignsData] = await Promise.all([
        analyticsRes.json(),
        numbersRes.json(),
        brandsRes.json(),
        campaignsRes.json(),
      ]);

      if (analyticsData.success) {
        setAnalytics(analyticsData.analytics);
        setWallet(analyticsData.wallet);
      }
      if (numbersData.success) setPhoneNumbers(numbersData.numbers || []);
      if (brandsData.success) setBrands(brandsData.brands || []);
      if (campaignsData.success) setCampaigns(campaignsData.campaigns || []);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const isSetupComplete = brands.length > 0 && campaigns.length > 0 && phoneNumbers.length > 0;

  if (!isSetupComplete && !loading) {
    return (
      <Card className="max-w-xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle>Set Up SMS Messaging</CardTitle>
          <CardDescription>
            Complete the onboarding wizard to start sending SMS messages
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button asChild size="lg">
            <a href="/t/default/settings/sms">
              <Plus className="h-4 w-4 mr-2" />
              Start Setup Wizard
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Messages Sent</p>
                <p className="text-2xl font-bold">{analytics?.totalSent || 0}</p>
              </div>
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Send className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold">{analytics?.totalDelivered || 0}</p>
                <p className="text-xs text-green-600">{analytics?.deliveryRate?.toFixed(1) || 0}% rate</p>
              </div>
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold">{analytics?.totalFailed || 0}</p>
                <p className="text-xs text-red-600">{analytics?.failureRate?.toFixed(1) || 0}% rate</p>
              </div>
              <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className="text-2xl font-bold">${wallet?.balance?.toFixed(2) || "0.00"}</p>
                <p className="text-xs text-muted-foreground">{wallet?.currency || "USD"}</p>
              </div>
              <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="numbers">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="numbers">Phone Numbers</TabsTrigger>
            <TabsTrigger value="brands">Brands</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={fetchDashboardData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <TabsContent value="numbers" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Phone Numbers</CardTitle>
                <CardDescription>Your SMS-enabled phone numbers</CardDescription>
              </div>
              <Button size="sm" asChild>
                <a href="/t/default/settings/sms?tab=numbers">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Number
                </a>
              </Button>
            </CardHeader>
            <CardContent>
              {phoneNumbers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No phone numbers yet</p>
              ) : (
                <div className="space-y-3">
                  {phoneNumbers.map((num) => (
                    <div key={num.phoneNumber} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Phone className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-mono font-medium">{num.phoneNumber}</p>
                          {num.friendlyName && (
                            <p className="text-sm text-muted-foreground">{num.friendlyName}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant={num.status === "active" ? "default" : "secondary"}>
                        {num.status || "Active"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brands" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Registered Brands</CardTitle>
                <CardDescription>Your 10DLC brand registrations</CardDescription>
              </div>
              <Button size="sm" asChild>
                <a href="/t/default/settings/sms">
                  <Plus className="h-4 w-4 mr-2" />
                  Register Brand
                </a>
              </Button>
            </CardHeader>
            <CardContent>
              {brands.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No brands registered</p>
              ) : (
                <div className="space-y-3">
                  {brands.map((brand) => (
                    <div key={brand.brandId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <MessageSquare className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium">{brand.brandName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{brand.brandId}</p>
                        </div>
                      </div>
                      <Badge variant={brand.status === "VERIFIED" ? "default" : "secondary"}>
                        {brand.status || "Pending"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>SMS Campaigns</CardTitle>
                <CardDescription>Your 10DLC campaign registrations</CardDescription>
              </div>
              <Button size="sm" asChild>
                <a href="/t/default/settings/sms">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </a>
              </Button>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No campaigns created</p>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((campaign) => (
                    <div key={campaign.campaignId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <TrendingUp className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium">{campaign.usecase}</p>
                          <p className="text-xs text-muted-foreground font-mono">{campaign.campaignId}</p>
                        </div>
                      </div>
                      <Badge variant={campaign.status === "ACTIVE" ? "default" : "secondary"}>
                        {campaign.status || "Pending"}
                      </Badge>
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
