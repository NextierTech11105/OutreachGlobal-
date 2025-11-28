"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, Save } from "lucide-react";

interface ApiProvider {
  id: string;
  name: string;
}

interface ApiSetting {
  apiKey: string;
  enabled: boolean;
}

export function ApiIntegrationSettings() {
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

  const providers: ApiProvider[] = [
    { id: "smartystreets", name: "SmartyStreets" },
    { id: "google", name: "Google Maps" },
    { id: "mapbox", name: "Mapbox" },
  ];

  const [apiSettings, setApiSettings] = useState<Record<string, ApiSetting>>(
    () => {
      const initialSettings: Record<string, ApiSetting> = {};
      providers.forEach((provider) => {
        initialSettings[provider.id] = {
          apiKey: "••••••••••••••••••••••••••••••",
          enabled: true,
        };
      });
      return initialSettings;
    },
  );

  const handleSettingChange = (
    providerId: string,
    field: keyof ApiSetting,
    value: any,
  ) => {
    setApiSettings((prev) => ({
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
        <CardTitle>Data Verification APIs</CardTitle>
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
                    checked={apiSettings[provider.id].enabled}
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
                      value={apiSettings[provider.id].apiKey}
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
