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

  // Fetch current settings
  const { data, loading, refetch } = useQuery(SIGNALHOUSE_SETTINGS_QUERY, {
    variables: { teamId: teamId },
    fetchPolicy: "cache-and-network",
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
    } catch (error) {
      toast.error("Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedConfig(config);
    setIsEditing(false);
  };

  const addCampaignId = () => {
    if (newCampaignId && !editedConfig.campaignIds.includes(newCampaignId)) {
      setEditedConfig({
        ...editedConfig,
        campaignIds: [...editedConfig.campaignIds, newCampaignId],
      });
      setNewCampaignId("");
    }
  };

  const removeCampaignId = (id: string) => {
    setEditedConfig({
      ...editedConfig,
      campaignIds: editedConfig.campaignIds.filter((c) => c !== id),
    });
  };

  const addPhone = () => {
    if (newPhone && !editedConfig.phonePool.includes(newPhone)) {
      const cleaned = newPhone.replace(/\D/g, "");
      if (cleaned.length >= 10) {
        setEditedConfig({
          ...editedConfig,
          phonePool: [...editedConfig.phonePool, `+1${cleaned.slice(-10)}`],
        });
        setNewPhone("");
      } else {
        toast.error("Please enter a valid phone number");
      }
    }
  };

  const removePhone = (phone: string) => {
    setEditedConfig({
      ...editedConfig,
      phonePool: editedConfig.phonePool.filter((p) => p !== phone),
    });
  };

  if (loading && !data) {
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

        {/* Campaign IDs Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Registered Campaigns</CardTitle>
            </div>
            <CardDescription>
              TCR Campaign IDs registered for this brand (for compliance)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isEditing && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Add campaign ID (e.g., CAMP_12345)"
                    value={newCampaignId}
                    onChange={(e) => setNewCampaignId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCampaignId()}
                  />
                  <Button onClick={addCampaignId} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {(isEditing ? editedConfig : config).campaignIds.length ===
                0 ? (
                  <p className="text-sm text-muted-foreground">
                    No campaigns registered
                  </p>
                ) : (
                  (isEditing ? editedConfig : config).campaignIds.map((id) => (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="font-mono text-xs py-1 px-2"
                    >
                      {id}
                      {isEditing && (
                        <button
                          onClick={() => removeCampaignId(id)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Phone Pool Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Phone Pool</CardTitle>
            </div>
            <CardDescription>
              Available phone numbers for sending SMS (
              {(isEditing ? editedConfig : config).phonePool.length} numbers)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isEditing && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Add phone number (e.g., 555-123-4567)"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addPhone()}
                  />
                  <Button onClick={addPhone} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {(isEditing ? editedConfig : config).phonePool.length === 0 ? (
                  <p className="text-sm text-muted-foreground col-span-full">
                    No phone numbers in pool
                  </p>
                ) : (
                  (isEditing ? editedConfig : config).phonePool.map((phone) => (
                    <div
                      key={phone}
                      className="flex items-center justify-between p-2 bg-muted rounded-md"
                    >
                      <span className="font-mono text-sm">{phone}</span>
                      {isEditing && (
                        <button
                          onClick={() => removePhone(phone)}
                          className="hover:text-destructive"
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

        {/* Help Section */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>SubGroup ID:</strong> Contact SignalHouse support to get
              your team's SubGroup ID. This is automatically created when your
              organization onboards.
            </p>
            <p>
              <strong>Brand ID:</strong> This is your TCR (The Campaign
              Registry) brand registration. Required for 10DLC SMS sending in
              the US.
            </p>
            <p>
              <strong>Campaign IDs:</strong> Each use case (marketing, alerts,
              etc.) requires a separate TCR campaign registration.
            </p>
            <p>
              <strong>Phone Pool:</strong> Phone numbers provisioned through
              SignalHouse for sending. Numbers rotate automatically during
              campaigns.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
