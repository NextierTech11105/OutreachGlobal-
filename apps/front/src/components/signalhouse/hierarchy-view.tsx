"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Building2,
  Megaphone,
  Phone,
  Users,
  ChevronRight,
  ChevronDown,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Bot,
  Wallet,
  Network,
} from "lucide-react";

/**
 * SIGNALHOUSE HIERARCHY ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * SIGNALHOUSE ACCOUNT (API Key, Balance)
 *     │
 *     ▼
 * GROUP (GM7CEB) ─────────────────────────────────────────────────────────────────
 *     │   SignalHouse organizational unit
 *     │   Contains all SubGroups for this API key
 *     │
 *     ├── SUB GROUP (S7ZI7S) = NEXTIER Team ──────────────────────────────────────
 *     │       │   Maps 1:1 to NEXTIER Teams
 *     │       │   Isolated billing & compliance
 *     │       │
 *     │       ▼
 *     │   BRAND (BZOYPIH - NEXTIER) ──────────────────────────────────────────────
 *     │       │   10DLC Brand Registration
 *     │       │   EIN, Legal Name, Website, Compliance URLs
 *     │       │
 *     │       ▼
 *     │   CAMPAIGN (CJRCU60) ─────────────────────────────────────────────────────
 *     │       │   10DLC Campaign (MARKETING, LOW_VOLUME, MIXED)
 *     │       │   Carrier Status: AT&T 75 TPM, T-Mobile Daily Cap
 *     │       │   Sample Messages, Opt-in/Opt-out
 *     │       │
 *     │       ▼
 *     │   PHONE NUMBER (+15164079249) ────────────────────────────────────────────
 *     │       │   Assigned to Campaign
 *     │       │   Inbound Webhook Configured
 *     │       │
 *     │       └── AI WORKER ASSIGNMENT
 *     │               └── GIANNA (Opener)
 *     │               └── CATHY (Nudger)
 *     │               └── SABRINA (Closer)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

interface PhoneNumber {
  number: string;
  friendlyName?: string;
  campaignId?: string;
  status: string;
  aiWorker?: "GIANNA" | "CATHY" | "SABRINA" | null;
}

interface Campaign {
  campaignId: string;
  brandId: string;
  usecase: string;
  status: string;
  description?: string;
  phoneNumbers?: PhoneNumber[];
  carrierStatus?: {
    att?: { status: string; tpm?: number };
    tmobile?: { status: string; dailyCap?: number };
    verizon?: { status: string };
  };
}

interface Brand {
  brandId: string;
  displayName: string;
  entityType: string;
  status: string;
  campaigns?: Campaign[];
}

interface SubGroup {
  subGroupId: string;
  name: string;
  teamId?: string;
  brands?: Brand[];
}

interface SignalHouseGroup {
  groupId: string;
  balance: number;
  currency: string;
  subGroups?: SubGroup[];
}

interface HierarchyViewProps {
  onSelectPhone?: (phone: PhoneNumber, campaign: Campaign) => void;
  onSelectCampaign?: (campaign: Campaign) => void;
  onSelectBrand?: (brand: Brand) => void;
}

export function SignalHouseHierarchyView({
  onSelectPhone,
  onSelectCampaign,
  onSelectBrand,
}: HierarchyViewProps) {
  const [hierarchy, setHierarchy] = useState<SignalHouseGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const fetchHierarchy = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all data and build hierarchy
      const [statusRes, brandsRes, campaignsRes, numbersRes] = await Promise.all([
        fetch("/api/signalhouse"),
        fetch("/api/signalhouse/brand"),
        fetch("/api/signalhouse/campaign"),
        fetch("/api/signalhouse/numbers"),
      ]);

      const [status, brandsData, campaignsData, numbersData] = await Promise.all([
        statusRes.json(),
        brandsRes.json(),
        campaignsRes.json(),
        numbersRes.json(),
      ]);

      // Build the hierarchy structure
      const brands = brandsData.brands || [];
      const campaigns = campaignsData.campaigns || [];
      const numbers = numbersData.numbers || [];

      // Group numbers by campaign
      const numbersByCampaign: Record<string, PhoneNumber[]> = {};
      numbers.forEach((num: any) => {
        const campaignId = num.campaignId || "unassigned";
        if (!numbersByCampaign[campaignId]) {
          numbersByCampaign[campaignId] = [];
        }
        numbersByCampaign[campaignId].push(num);
      });

      // Attach numbers to campaigns
      const campaignsWithNumbers = campaigns.map((c: Campaign) => ({
        ...c,
        phoneNumbers: numbersByCampaign[c.campaignId] || [],
      }));

      // Group campaigns by brand
      const campaignsByBrand: Record<string, Campaign[]> = {};
      campaignsWithNumbers.forEach((c: Campaign) => {
        if (!campaignsByBrand[c.brandId]) {
          campaignsByBrand[c.brandId] = [];
        }
        campaignsByBrand[c.brandId].push(c);
      });

      // Attach campaigns to brands
      const brandsWithCampaigns = brands.map((b: Brand) => ({
        ...b,
        campaigns: campaignsByBrand[b.brandId] || [],
      }));

      // Build final hierarchy
      const hierarchyData: SignalHouseGroup = {
        groupId: status.groupId || "GM7CEB",
        balance: status.balance || 0,
        currency: "USD",
        subGroups: [
          {
            subGroupId: status.subGroupId || "S7ZI7S",
            name: "NEXTIER",
            brands: brandsWithCampaigns,
          },
        ],
      };

      setHierarchy(hierarchyData);
      // Auto-expand first level
      setExpandedItems(new Set([hierarchyData.groupId]));
    } catch (err) {
      console.error("Failed to fetch hierarchy:", err);
      setError("Failed to load SignalHouse hierarchy");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getStatusIcon = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "active" || s === "approved" || s === "registered") {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    if (s === "pending" || s === "under_review" || s === "pending_dca") {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    }
    if (s === "rejected" || s === "failed" || s === "inactive") {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    return <AlertCircle className="h-4 w-4 text-gray-500" />;
  };

  const getAIWorkerBadge = (worker?: string | null) => {
    if (!worker) return null;
    const colors: Record<string, string> = {
      GIANNA: "bg-purple-100 text-purple-800",
      CATHY: "bg-blue-100 text-blue-800",
      SABRINA: "bg-pink-100 text-pink-800",
    };
    return (
      <Badge className={colors[worker] || "bg-gray-100 text-gray-800"}>
        <Bot className="h-3 w-3 mr-1" />
        {worker}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">
              Loading SignalHouse hierarchy...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="font-medium mb-2">Failed to Load Hierarchy</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchHierarchy}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hierarchy) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              SignalHouse Architecture
            </CardTitle>
            <CardDescription>
              Hierarchical view of your SMS infrastructure
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchHierarchy}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Account Level */}
        <div className="border rounded-lg">
          <Collapsible
            open={expandedItems.has(hierarchy.groupId)}
            onOpenChange={() => toggleExpanded(hierarchy.groupId)}
          >
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer">
                <div className="flex items-center gap-3">
                  {expandedItems.has(hierarchy.groupId) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">SignalHouse Account</p>
                    <p className="text-sm text-muted-foreground">
                      Group: {hierarchy.groupId}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono">
                    ${hierarchy.balance.toFixed(2)} {hierarchy.currency}
                  </Badge>
                  <Badge className="bg-green-600">Connected</Badge>
                </div>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              {/* SubGroups */}
              {hierarchy.subGroups?.map((subGroup) => (
                <div key={subGroup.subGroupId} className="ml-8 border-l">
                  <Collapsible
                    open={expandedItems.has(subGroup.subGroupId)}
                    onOpenChange={() => toggleExpanded(subGroup.subGroupId)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer">
                        <div className="flex items-center gap-3">
                          {expandedItems.has(subGroup.subGroupId) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold">
                              SubGroup: {subGroup.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              ID: {subGroup.subGroupId}
                              {subGroup.teamId && ` • Team: ${subGroup.teamId}`}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {subGroup.brands?.length || 0} Brands
                        </Badge>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      {/* Brands */}
                      {subGroup.brands?.map((brand) => (
                        <div key={brand.brandId} className="ml-8 border-l">
                          <Collapsible
                            open={expandedItems.has(brand.brandId)}
                            onOpenChange={() => toggleExpanded(brand.brandId)}
                          >
                            <CollapsibleTrigger asChild>
                              <div
                                className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
                                onClick={(e) => {
                                  if (onSelectBrand) {
                                    e.stopPropagation();
                                    onSelectBrand(brand);
                                  }
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  {expandedItems.has(brand.brandId) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                  <div className="p-2 bg-green-100 rounded-lg">
                                    <Building2 className="h-5 w-5 text-green-600" />
                                  </div>
                                  <div>
                                    <p className="font-semibold">
                                      {brand.displayName}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      Brand ID: {brand.brandId} •{" "}
                                      {brand.entityType}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(brand.status)}
                                  <Badge variant="outline">
                                    {brand.campaigns?.length || 0} Campaigns
                                  </Badge>
                                </div>
                              </div>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              {/* Campaigns */}
                              {brand.campaigns?.map((campaign) => (
                                <div
                                  key={campaign.campaignId}
                                  className="ml-8 border-l"
                                >
                                  <Collapsible
                                    open={expandedItems.has(campaign.campaignId)}
                                    onOpenChange={() =>
                                      toggleExpanded(campaign.campaignId)
                                    }
                                  >
                                    <CollapsibleTrigger asChild>
                                      <div
                                        className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
                                        onClick={(e) => {
                                          if (onSelectCampaign) {
                                            e.stopPropagation();
                                            onSelectCampaign(campaign);
                                          }
                                        }}
                                      >
                                        <div className="flex items-center gap-3">
                                          {expandedItems.has(
                                            campaign.campaignId
                                          ) ? (
                                            <ChevronDown className="h-4 w-4" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4" />
                                          )}
                                          <div className="p-2 bg-purple-100 rounded-lg">
                                            <Megaphone className="h-5 w-5 text-purple-600" />
                                          </div>
                                          <div>
                                            <p className="font-semibold">
                                              Campaign: {campaign.campaignId}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                              {campaign.usecase}
                                              {campaign.description &&
                                                ` • ${campaign.description.slice(0, 50)}...`}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {getStatusIcon(campaign.status)}
                                          <Badge variant="outline">
                                            {campaign.phoneNumbers?.length || 0}{" "}
                                            Numbers
                                          </Badge>
                                        </div>
                                      </div>
                                    </CollapsibleTrigger>

                                    <CollapsibleContent>
                                      {/* Carrier Status */}
                                      {campaign.carrierStatus && (
                                        <div className="ml-8 p-3 border-l bg-muted/30">
                                          <p className="text-xs font-medium text-muted-foreground mb-2">
                                            CARRIER STATUS
                                          </p>
                                          <div className="flex gap-4 text-sm">
                                            {campaign.carrierStatus.att && (
                                              <div className="flex items-center gap-1">
                                                {getStatusIcon(
                                                  campaign.carrierStatus.att
                                                    .status
                                                )}
                                                <span>
                                                  AT&T{" "}
                                                  {campaign.carrierStatus.att
                                                    .tpm &&
                                                    `(${campaign.carrierStatus.att.tpm} TPM)`}
                                                </span>
                                              </div>
                                            )}
                                            {campaign.carrierStatus.tmobile && (
                                              <div className="flex items-center gap-1">
                                                {getStatusIcon(
                                                  campaign.carrierStatus.tmobile
                                                    .status
                                                )}
                                                <span>
                                                  T-Mobile{" "}
                                                  {campaign.carrierStatus
                                                    .tmobile.dailyCap &&
                                                    `(${campaign.carrierStatus.tmobile.dailyCap}/day)`}
                                                </span>
                                              </div>
                                            )}
                                            {campaign.carrierStatus.verizon && (
                                              <div className="flex items-center gap-1">
                                                {getStatusIcon(
                                                  campaign.carrierStatus.verizon
                                                    .status
                                                )}
                                                <span>Verizon</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Phone Numbers */}
                                      {campaign.phoneNumbers?.map((phone) => (
                                        <div
                                          key={phone.number}
                                          className="ml-8 border-l"
                                        >
                                          <div
                                            className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
                                            onClick={() => {
                                              if (onSelectPhone) {
                                                onSelectPhone(phone, campaign);
                                              }
                                            }}
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className="w-4" />
                                              <div className="p-2 bg-orange-100 rounded-lg">
                                                <Phone className="h-5 w-5 text-orange-600" />
                                              </div>
                                              <div>
                                                <p className="font-mono font-semibold">
                                                  {phone.number}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                  {phone.friendlyName ||
                                                    "Phone Number"}
                                                </p>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              {getAIWorkerBadge(phone.aiWorker)}
                                              {getStatusIcon(phone.status)}
                                            </div>
                                          </div>
                                        </div>
                                      ))}

                                      {/* No numbers message */}
                                      {(!campaign.phoneNumbers ||
                                        campaign.phoneNumbers.length === 0) && (
                                        <div className="ml-8 p-4 border-l text-sm text-muted-foreground">
                                          No phone numbers assigned
                                        </div>
                                      )}
                                    </CollapsibleContent>
                                  </Collapsible>
                                </div>
                              ))}

                              {/* No campaigns message */}
                              {(!brand.campaigns ||
                                brand.campaigns.length === 0) && (
                                <div className="ml-8 p-4 border-l text-sm text-muted-foreground">
                                  No campaigns registered
                                </div>
                              )}
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      ))}

                      {/* No brands message */}
                      {(!subGroup.brands || subGroup.brands.length === 0) && (
                        <div className="ml-8 p-4 border-l text-sm text-muted-foreground">
                          No brands registered
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Legend */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium mb-3">Architecture Legend</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              <span>Account</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <span>SubGroup (Team)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-100 rounded">
                <Building2 className="h-4 w-4 text-green-600" />
              </div>
              <span>Brand (10DLC)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-100 rounded">
                <Megaphone className="h-4 w-4 text-purple-600" />
              </div>
              <span>Campaign</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-orange-100 rounded">
                <Phone className="h-4 w-4 text-orange-600" />
              </div>
              <span>Phone Number</span>
            </div>
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-purple-600" />
              <span>AI Worker</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Active/Approved</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span>Pending</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
