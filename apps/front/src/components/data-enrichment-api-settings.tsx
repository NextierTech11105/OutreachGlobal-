"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, Save } from "lucide-react";

interface DataEnrichmentApiSettingsProps {
  type: "skip-trace" | "data-append";
}

interface ProviderSetting {
  apiKey: string;
  enabled: boolean;
  rateLimit: string;
  username?: string;
}

export function DataEnrichmentApiSettings({
  type,
}: DataEnrichmentApiSettingsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

  // Simplified provider lists
  const skipTraceProviders = [
    { id: "realestateapi", name: "RealEstateAPI (Primary)" },
    { id: "tlo", name: "TLO" },
    { id: "lexisnexis", name: "LexisNexis" },
    { id: "melissa", name: "Melissa Data" },
  ];

  const dataAppendProviders = [
    { id: "attom", name: "ATTOM Data" },
    { id: "corelogic", name: "CoreLogic" },
    { id: "zillow", name: "Zillow API" },
  ];

  const providers =
    type === "skip-trace" ? skipTraceProviders : dataAppendProviders;
  const title = type === "skip-trace" ? "Skip Trace APIs" : "Data Append APIs";

  // Initialize state with all required fields
  const [providerSettings, setProviderSettings] = useState<
    Record<string, ProviderSetting>
  >(() => {
    const initialSettings: Record<string, ProviderSetting> = {};
    providers.forEach((provider) => {
      initialSettings[provider.id] = {
        apiKey: "••••••••••••••••••••••••••••••",
        enabled: true,
        rateLimit: "standard", // Initialize with a default value
        ...(provider.id === "tlo" && type === "skip-trace"
          ? { username: "" }
          : {}),
      };
    });
    return initialSettings;
  });

  const handleSettingChange = (
    providerId: string,
    field: keyof ProviderSetting,
    value: any,
  ) => {
    setProviderSettings((prev) => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        [field]: value,
      },
    }));
  };

  const toggleApiKeyVisibility = (providerId: string) => {
    setShowApiKey((prev) => ({
      ...prev,
      [providerId]: !prev[providerId],
    }));
  };

  const handleSaveSettings = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
    }, 1000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={providers[0].id}>
          <TabsList className="w-full">
            {providers.map((provider) => (
              <TabsTrigger
                key={provider.id}
                value={provider.id}
                className="flex-1"
              >
                {provider.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {providers.map((provider) => (
            <TabsContent key={provider.id} value={provider.id} className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">{provider.name}</h3>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={providerSettings[provider.id].enabled}
                    onCheckedChange={(checked) =>
                      handleSettingChange(provider.id, "enabled", checked)
                    }
                    id={`${provider.id}-enabled`}
                  />
                  <Label htmlFor={`${provider.id}-enabled`}>Enabled</Label>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`${provider.id}-api-key`}>API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`${provider.id}-api-key`}
                      type={showApiKey[provider.id] ? "text" : "password"}
                      value={providerSettings[provider.id].apiKey}
                      onChange={(e) =>
                        handleSettingChange(
                          provider.id,
                          "apiKey",
                          e.target.value,
                        )
                      }
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleApiKeyVisibility(provider.id)}
                      type="button"
                    >
                      {showApiKey[provider.id] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {provider.id === "tlo" && type === "skip-trace" && (
                  <div className="space-y-2">
                    <Label htmlFor="tlo-username">Username</Label>
                    <Input
                      id="tlo-username"
                      placeholder="TLO username"
                      value={providerSettings[provider.id].username || ""}
                      onChange={(e) =>
                        handleSettingChange(
                          provider.id,
                          "username",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor={`${provider.id}-rate-limit`}>
                    Rate Limit
                  </Label>
                  <Select
                    value={providerSettings[provider.id].rateLimit}
                    onValueChange={(value) =>
                      handleSettingChange(provider.id, "rateLimit", value)
                    }
                  >
                    <SelectTrigger id={`${provider.id}-rate-limit`}>
                      <SelectValue placeholder="Select rate limit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (5 req/sec)</SelectItem>
                      <SelectItem value="standard">
                        Standard (15 req/sec)
                      </SelectItem>
                      <SelectItem value="high">High (50 req/sec)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSaveSettings} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
