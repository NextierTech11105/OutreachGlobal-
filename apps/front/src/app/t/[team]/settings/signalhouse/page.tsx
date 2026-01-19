"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Phone,
  Building2,
  Shield,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Loader2,
  MessageSquare,
  Megaphone,
  Users,
  Briefcase,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentTeam } from "@/features/team/team.context";
import {
  SIGNALHOUSE_SETTINGS_QUERY,
  type SignalHouseSettings,
} from "@/features/signalhouse/queries/signalhouse.queries";
import { UPDATE_SIGNALHOUSE_SETTINGS_MUTATION } from "@/features/signalhouse/mutations/signalhouse.mutations";

/**
 * SignalHouse Admin Panel
 *
 * Manages the SignalHouse integration settings for a team:
 * - SubGroup ID (maps 1:1 with Nextier Team)
 * - Brand ID (for compliance)
 * - Campaign IDs (registered campaigns)
 * - Phone Pool (available sending numbers)
 */

interface SignalHouseConfig {
  subGroupId: string | null;
  brandId: string | null;
  campaignIds: string[];
  phonePool: string[];
}

export default function SignalHouseSettingsPage() {
  const { team, teamId, isTeamReady } = useCurrentTeam();

  // Fetch current settings - skip if teamId not ready
  const { data, loading, refetch } = useQuery(SIGNALHOUSE_SETTINGS_QUERY, {
    variables: { teamId: teamId },
    fetchPolicy: "cache-and-network",
    skip: !isTeamReady,
  });

  // Update mutation
  const [updateSettings] = useMutation(UPDATE_SIGNALHOUSE_SETTINGS_MUTATION);

  // Local state
  const [config, setConfig] = useState<SignalHouseConfig>({
    subGroupId: null,
    brandId: null,
    campaignIds: [],
    phonePool: [],
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editedConfig, setEditedConfig] = useState<SignalHouseConfig>(config);
  const [newCampaignId, setNewCampaignId] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Sync with fetched data
  useEffect(() => {
    if (data?.signalHouseSettings) {
      const settings = data.signalHouseSettings;
      const newConfig: SignalHouseConfig = {
        subGroupId: settings.subGroupId,
        brandId: settings.brandId,
        campaignIds: settings.campaignIds ?? [],
        phonePool: settings.phonePool ?? [],
      };
      setConfig(newConfig);
      setEditedConfig(newConfig);
    }
  }, [data]);

  const isConfigured = config.subGroupId && config.brandId;

  const handleSave = async () => {
    if (!isTeamReady || !teamId) {
      toast.error("Team not loaded. Please refresh the page.");
      return;
    }

    setIsSaving(true);
    try {
      await updateSettings({
        variables: {
          teamId: teamId,
          input: {
            subGroupId: editedConfig.subGroupId,
            brandId: editedConfig.brandId,
            campaignIds: editedConfig.campaignIds,
            phonePool: editedConfig.phonePool,
          },
        },
      });
      setConfig(editedConfig);
      setIsEditing(false);
      toast.success("SignalHouse configuration saved");
      refetch();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save configuration";
      console.error("SignalHouse save error:", error);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedConfig(config);
    setIsEditing(false);
  };

  const addCampaignId = async () => {
    if (!newCampaignId || config.campaignIds.includes(newCampaignId)) return;
    if (!teamId) {
      toast.error("Team not loaded");
      return;
    }

    const newCampaignIds = [...config.campaignIds, newCampaignId];
    try {
      await updateSettings({
        variables: {
          teamId,
          input: { campaignIds: newCampaignIds },
        },
      });
      setConfig({ ...config, campaignIds: newCampaignIds });
      setEditedConfig({ ...editedConfig, campaignIds: newCampaignIds });
      setNewCampaignId("");
      toast.success("Campaign added");
      refetch();
    } catch (error) {
      toast.error("Failed to add campaign");
    }
  };

  const removeCampaignId = async (id: string) => {
    if (!teamId) return;
    const newCampaignIds = config.campaignIds.filter((c) => c !== id);
    try {
      await updateSettings({
        variables: {
          teamId,
          input: { campaignIds: newCampaignIds },
        },
      });
      setConfig({ ...config, campaignIds: newCampaignIds });
      setEditedConfig({ ...editedConfig, campaignIds: newCampaignIds });
      toast.success("Campaign removed");
      refetch();
    } catch (error) {
      toast.error("Failed to remove campaign");
    }
  };

  const addPhone = async () => {
    if (!newPhone) return;
    const cleaned = newPhone.replace(/\D/g, "");
    if (cleaned.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }
    if (!teamId) {
      toast.error("Team not loaded");
      return;
    }

    const formattedPhone = `+1${cleaned.slice(-10)}`;
    if (config.phonePool.includes(formattedPhone)) return;

    const newPhonePool = [...config.phonePool, formattedPhone];
    try {
      await updateSettings({
        variables: {
          teamId,
          input: { phonePool: newPhonePool },
        },
      });
      setConfig({ ...config, phonePool: newPhonePool });
      setEditedConfig({ ...editedConfig, phonePool: newPhonePool });
      setNewPhone("");
      toast.success("Phone added");
      refetch();
    } catch (error) {
      toast.error("Failed to add phone");
    }
  };

  const removePhone = async (phone: string) => {
    if (!teamId) return;
    const newPhonePool = config.phonePool.filter((p) => p !== phone);
    try {
      await updateSettings({
        variables: {
          teamId,
          input: { phonePool: newPhonePool },
        },
      });
      setConfig({ ...config, phonePool: newPhonePool });
      setEditedConfig({ ...editedConfig, phonePool: newPhonePool });
      toast.success("Phone removed");
      refetch();
    } catch (error) {
      toast.error("Failed to remove phone");
    }
  };

  if (!isTeamReady || (loading && !data)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 space-y-6 p-8 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              SignalHouse Integration
            </h2>
            <p className="text-muted-foreground">
              Configure your SMS sending infrastructure
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isConfigured ? (
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Configured
              </Badge>
            ) : (
              <Badge
                variant="destructive"
                className="bg-red-500/10 text-red-500 border-red-500/20"
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                Not Configured
              </Badge>
            )}
          </div>
        </div>

        {/* Main Config Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Configuration</CardTitle>
              </div>
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>
                  Edit Configuration
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
            <CardDescription>
              SignalHouse credentials and identifiers for this team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* SubGroup ID */}
            <div className="grid gap-2">
              <Label htmlFor="subGroupId" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                SubGroup ID
              </Label>
              <p className="text-sm text-muted-foreground">
                Your team's unique identifier in SignalHouse (1:1 mapping)
              </p>
              {isEditing ? (
                <Input
                  id="subGroupId"
                  placeholder="e.g., sg_abc123xyz"
                  value={editedConfig.subGroupId || ""}
                  onChange={(e) =>
                    setEditedConfig({
                      ...editedConfig,
                      subGroupId: e.target.value || null,
                    })
                  }
                />
              ) : (
                <div className="p-2 bg-muted rounded-md font-mono text-sm">
                  {config.subGroupId || (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </div>
              )}
            </div>

            {/* Brand ID */}
            <div className="grid gap-2">
              <Label htmlFor="brandId" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Brand ID
              </Label>
              <p className="text-sm text-muted-foreground">
                TCR Brand registration ID for 10DLC compliance
              </p>
              {isEditing ? (
                <Input
                  id="brandId"
                  placeholder="e.g., BRAND_12345"
                  value={editedConfig.brandId || ""}
                  onChange={(e) =>
                    setEditedConfig({
                      ...editedConfig,
                      brandId: e.target.value || null,
                    })
                  }
                />
              ) : (
                <div className="p-2 bg-muted rounded-md font-mono text-sm">
                  {config.brandId || (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Campaign IDs Card - Enhanced Multi-Campaign UI */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="bg-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                <CardTitle>10DLC Campaigns</CardTitle>
              </div>
              <Badge variant="outline" className="font-mono">
                {(isEditing ? editedConfig : config).campaignIds.length}{" "}
                registered
              </Badge>
            </div>
            <CardDescription>
              Each use case requires a separate TCR campaign registration. Add
              multiple campaigns for different outreach types.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Campaign Use Case Examples */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Real Estate</p>
                    <p className="text-xs text-muted-foreground">
                      Property outreach campaigns
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Briefcase className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Business Broker</p>
                    <p className="text-xs text-muted-foreground">
                      B2B acquisition outreach
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-purple-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Alerts & reminders
                    </p>
                  </div>
                </div>
              </div>

              {/* Add Campaign Input - Always visible */}
              <div className="flex gap-2">
                <Input
                  placeholder="Enter TCR Campaign ID (e.g., CJRCU60)"
                  value={newCampaignId}
                  onChange={(e) =>
                    setNewCampaignId(e.target.value.toUpperCase())
                  }
                  onKeyDown={(e) => e.key === "Enter" && addCampaignId()}
                  className="font-mono"
                />
                <Button onClick={addCampaignId}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Campaign
                </Button>
              </div>

              {/* Campaign List */}
              <div className="space-y-2">
                {(isEditing ? editedConfig : config).campaignIds.length ===
                0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <Megaphone className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-1">
                      No campaigns registered
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Register campaigns in SignalHouse, then add their IDs here
                    </p>
                  </div>
                ) : (
                  (isEditing ? editedConfig : config).campaignIds.map(
                    (id, index) => (
                      <div
                        key={id}
                        className="flex items-center justify-between p-3 bg-card border rounded-lg hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary">
                              {index + 1}
                            </span>
                          </div>
                          <div>
                            <p className="font-mono font-medium">{id}</p>
                            <p className="text-xs text-muted-foreground">
                              TCR Campaign{" "}
                              {index === 0 ? "(Primary)" : `#${index + 1}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                          {isEditing && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeCampaignId(id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ),
                  )
                )}
              </div>

              {/* Help Link */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                <HelpCircle className="h-4 w-4" />
                <span>Need a new campaign?</span>
                <a
                  href="https://app.signalhouse.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Register in SignalHouse
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Phone Pool Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Phone Pool</CardTitle>
              </div>
              <Badge variant="outline">
                {(isEditing ? editedConfig : config).phonePool.length} numbers
              </Badge>
            </div>
            <CardDescription>
              Phone numbers rotate automatically during campaigns to maximize
              deliverability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Phone Input - Always visible */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add phone number (e.g., 555-123-4567)"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPhone()}
                />
                <Button onClick={addPhone}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Number
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {(isEditing ? editedConfig : config).phonePool.length === 0 ? (
                  <div className="col-span-full text-center py-6 border-2 border-dashed rounded-lg">
                    <Phone className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No phone numbers in pool
                    </p>
                  </div>
                ) : (
                  (isEditing ? editedConfig : config).phonePool.map((phone) => (
                    <div
                      key={phone}
                      className="flex items-center justify-between p-2 bg-muted rounded-md border"
                    >
                      <span className="font-mono text-sm">{phone}</span>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => removePhone(phone)}
                          className="hover:text-destructive"
                          title="Remove phone number"
                          aria-label={`Remove ${phone}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How It Works Section */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              How Multi-Campaign Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Flow Diagram */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-background/50 rounded-lg">
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg font-bold text-blue-500">1</span>
                </div>
                <p className="text-sm font-medium">Register Campaign</p>
                <p className="text-xs text-muted-foreground">
                  In SignalHouse/TCR
                </p>
              </div>
              <div className="hidden md:block text-muted-foreground">→</div>
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg font-bold text-green-500">2</span>
                </div>
                <p className="text-sm font-medium">Add Campaign ID</p>
                <p className="text-xs text-muted-foreground">On this page</p>
              </div>
              <div className="hidden md:block text-muted-foreground">→</div>
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg font-bold text-purple-500">3</span>
                </div>
                <p className="text-sm font-medium">Select When Sending</p>
                <p className="text-xs text-muted-foreground">
                  Choose campaign per blast
                </p>
              </div>
            </div>

            {/* Details */}
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p>
                  <strong>SubGroup ID:</strong> Your team's unique SignalHouse
                  identifier (1:1 mapping with Nextier team)
                </p>
                <p>
                  <strong>Brand ID:</strong> TCR brand registration for 10DLC
                  compliance in the US
                </p>
              </div>
              <div className="space-y-2">
                <p>
                  <strong>Campaign IDs:</strong> Register separate campaigns for
                  each use case (Real Estate, Business Broker, etc.)
                </p>
                <p>
                  <strong>Phone Pool:</strong> Numbers auto-rotate during sends
                  to maximize deliverability
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
