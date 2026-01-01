"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  RefreshCw,
  Phone,
  Mail,
  Zap,
  Settings2,
} from "lucide-react";

interface SettingItem {
  key: string;
  label: string;
  description: string;
  valueType: "string" | "number" | "boolean";
  category: string;
  defaultValue: string;
  value: string;
  source: "database" | "environment" | "default";
  minValue?: number;
  maxValue?: number;
}

export default function InboundProcessingPage() {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<
    Record<string, string>
  >({});

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/inbound-config");
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
        const original: Record<string, string> = {};
        data.settings.forEach((s: SettingItem) => {
          original[s.key] = s.value;
        });
        setOriginalSettings(original);
        setHasChanges(false);
      } else {
        toast.error("Failed to load settings");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleValueChange = (key: string, value: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value } : s)),
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const changedSettings: Record<string, string> = {};
      settings.forEach((s) => {
        if (s.value !== originalSettings[s.key]) {
          changedSettings[s.key] = s.value;
        }
      });

      if (Object.keys(changedSettings).length === 0) {
        toast.info("No changes to save");
        setIsSaving(false);
        return;
      }

      const response = await fetch("/api/admin/inbound-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: changedSettings }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Saved ${data.updated.length} settings`);
        await fetchSettings();
      } else {
        toast.error(data.error || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "database":
        return (
          <Badge variant="default" className="ml-2 bg-green-600">
            DB
          </Badge>
        );
      case "environment":
        return (
          <Badge variant="secondary" className="ml-2">
            ENV
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="ml-2">
            Default
          </Badge>
        );
    }
  };

  const renderSetting = (setting: SettingItem) => {
    if (setting.valueType === "boolean") {
      return (
        <div
          key={setting.key}
          className="flex items-center justify-between py-4 border-b last:border-0"
        >
          <div className="space-y-1">
            <div className="flex items-center">
              <Label htmlFor={setting.key} className="font-medium">
                {setting.label}
              </Label>
              {getSourceBadge(setting.source)}
            </div>
            <p className="text-sm text-muted-foreground">
              {setting.description}
            </p>
          </div>
          <Switch
            id={setting.key}
            checked={setting.value === "true"}
            onCheckedChange={(checked) =>
              handleValueChange(setting.key, String(checked))
            }
          />
        </div>
      );
    }

    return (
      <div key={setting.key} className="space-y-2 py-4 border-b last:border-0">
        <div className="flex items-center">
          <Label htmlFor={setting.key} className="font-medium">
            {setting.label}
          </Label>
          {getSourceBadge(setting.source)}
        </div>
        <p className="text-sm text-muted-foreground">{setting.description}</p>
        <Input
          id={setting.key}
          type="number"
          value={setting.value}
          onChange={(e) => handleValueChange(setting.key, e.target.value)}
          min={setting.minValue}
          max={setting.maxValue}
          className="max-w-[200px]"
        />
        {setting.minValue !== undefined && setting.maxValue !== undefined && (
          <p className="text-xs text-muted-foreground">
            Range: {setting.minValue} - {setting.maxValue}
          </p>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group settings by category
  const callQueueSettings = settings.filter(
    (s) => s.key.includes("CALL_QUEUE") || s.key.includes("PRIORITY_THRESHOLD"),
  );
  const contactabilitySettings = settings.filter(
    (s) =>
      s.key.includes("WEIGHT_EMAIL") ||
      s.key.includes("WEIGHT_MOBILE") ||
      s.key.includes("WEIGHT_CONTACT"),
  );
  const responseBoostSettings = settings.filter(
    (s) =>
      s.key.includes("WEIGHT_INBOUND") ||
      s.key.includes("WEIGHT_HIGH") ||
      s.key.includes("WEIGHT_WANTS") ||
      s.key.includes("WEIGHT_QUESTION"),
  );
  const featureFlags = settings.filter((s) => s.valueType === "boolean");
  const batchSettings = settings.filter(
    (s) =>
      s.key.includes("BATCH") ||
      s.key.includes("RETRY") ||
      s.key.includes("COOLDOWN"),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Inbound Processing Config
          </h1>
          <p className="text-muted-foreground">
            Configure scoring weights, call queue routing, and processing
            behavior. Changes take effect immediately.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchSettings}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="priority" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="priority" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Call Queue
          </TabsTrigger>
          <TabsTrigger
            value="contactability"
            className="flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Contactability
          </TabsTrigger>
          <TabsTrigger value="response" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Response Boost
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="batch">Batch & Retry</TabsTrigger>
        </TabsList>

        <TabsContent value="priority">
          <Card>
            <CardHeader>
              <CardTitle>Call Queue Priority</CardTitle>
              <CardDescription>
                Configure priority scores for different lead types. GOLD = email
                + mobile verified. GREEN = positive SMS response.
              </CardDescription>
            </CardHeader>
            <CardContent>{callQueueSettings.map(renderSetting)}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contactability">
          <Card>
            <CardHeader>
              <CardTitle>Contactability Scoring</CardTitle>
              <CardDescription>
                Full contactability (email + mobile) = 100%. These weights are
                additive.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contactabilitySettings.map(renderSetting)}
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">Current Formula:</p>
                <p className="text-sm text-muted-foreground">
                  Email (
                  {contactabilitySettings.find(
                    (s) => s.key === "WEIGHT_EMAIL_CAPTURED",
                  )?.value || 50}
                  %) + Mobile (
                  {contactabilitySettings.find(
                    (s) => s.key === "WEIGHT_MOBILE_CAPTURED",
                  )?.value || 50}
                  %) = 100% Contactability
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="response">
          <Card>
            <CardHeader>
              <CardTitle>Inbound Response Priority Boost</CardTitle>
              <CardDescription>
                Positive inbound SMS responses INCREASE priority in call queue.
                These boost scores for leads who engage via SMS campaigns.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {responseBoostSettings.map(renderSetting)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>
                Enable or disable processing features. Changes take effect
                immediately.
              </CardDescription>
            </CardHeader>
            <CardContent>{featureFlags.map(renderSetting)}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch">
          <Card>
            <CardHeader>
              <CardTitle>Batch & Retry Settings</CardTitle>
              <CardDescription>
                Configure batch sizes and retry behavior for processing.
              </CardDescription>
            </CardHeader>
            <CardContent>{batchSettings.map(renderSetting)}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {hasChanges && (
        <div className="fixed bottom-4 right-4 bg-yellow-500 text-black px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <span className="font-medium">Unsaved changes</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save Now"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
