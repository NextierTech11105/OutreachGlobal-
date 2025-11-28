"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Sparkles, Save, Check, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type LlmProvider = {
  id: string;
  name: string;
  logo: string;
  description: string;
  models: {
    id: string;
    name: string;
    description: string;
    capabilities: string[];
    recommended?: boolean;
  }[];
  apiKeyName: string;
  organizationIdRequired?: boolean;
  baseUrlConfigurable?: boolean;
  defaultBaseUrl?: string;
};

export function LlmSettingsManager() {
  const [activeProvider, setActiveProvider] = useState("openai");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const providers: LlmProvider[] = [
    {
      id: "openai",
      name: "OpenAI",
      logo: "/openai-logo-inspired-abstract.png",
      description:
        "Access GPT models like GPT-4o, GPT-4 Turbo, and GPT-3.5 Turbo.",
      models: [
        {
          id: "gpt-4o",
          name: "GPT-4o",
          description:
            "Most capable multimodal model for text, vision, and audio tasks.",
          capabilities: [
            "Text generation",
            "Image understanding",
            "Audio processing",
          ],
          recommended: true,
        },
        {
          id: "gpt-4-turbo",
          name: "GPT-4 Turbo",
          description: "Powerful model with strong reasoning capabilities.",
          capabilities: [
            "Text generation",
            "Complex reasoning",
            "Code generation",
          ],
        },
        {
          id: "gpt-3.5-turbo",
          name: "GPT-3.5 Turbo",
          description: "Fast and cost-effective for most text tasks.",
          capabilities: [
            "Text generation",
            "Basic reasoning",
            "Cost-effective",
          ],
        },
      ],
      apiKeyName: "OPENAI_API_KEY",
      organizationIdRequired: true,
    },
    {
      id: "anthropic",
      name: "Anthropic",
      logo: "/anthropic-logo-abstract.png",
      description:
        "Access Claude models known for their helpfulness and harmlessness.",
      models: [
        {
          id: "claude-3-opus",
          name: "Claude 3 Opus",
          description: "Most powerful Claude model with exceptional reasoning.",
          capabilities: [
            "Text generation",
            "Complex reasoning",
            "Nuanced understanding",
          ],
          recommended: true,
        },
        {
          id: "claude-3-sonnet",
          name: "Claude 3 Sonnet",
          description: "Balanced performance and cost for most use cases.",
          capabilities: ["Text generation", "Good reasoning", "Cost-effective"],
        },
        {
          id: "claude-3-haiku",
          name: "Claude 3 Haiku",
          description: "Fastest Claude model for quick responses.",
          capabilities: ["Text generation", "Fast responses", "Low cost"],
        },
      ],
      apiKeyName: "ANTHROPIC_API_KEY",
    },
    {
      id: "google",
      name: "Google Gemini",
      logo: "/google-gemini-logo.png",
      description:
        "Access Google's Gemini models with strong multimodal capabilities.",
      models: [
        {
          id: "gemini-1.5-pro",
          name: "Gemini 1.5 Pro",
          description: "Versatile model with strong multimodal capabilities.",
          capabilities: [
            "Text generation",
            "Image understanding",
            "Long context",
          ],
          recommended: true,
        },
        {
          id: "gemini-1.5-flash",
          name: "Gemini 1.5 Flash",
          description: "Fast and efficient for most tasks.",
          capabilities: ["Text generation", "Fast responses", "Cost-effective"],
        },
        {
          id: "gemini-1.0-pro",
          name: "Gemini 1.0 Pro",
          description: "Previous generation model for general use.",
          capabilities: ["Text generation", "Basic reasoning"],
        },
      ],
      apiKeyName: "GOOGLE_API_KEY",
    },
    {
      id: "grok",
      name: "Grok",
      logo: "/grok-ai-logo.png",
      description: "Access Grok models from xAI with real-time knowledge.",
      models: [
        {
          id: "grok-2",
          name: "Grok-2",
          description: "Latest Grok model with enhanced capabilities.",
          capabilities: [
            "Text generation",
            "Real-time knowledge",
            "Conversational",
          ],
          recommended: true,
        },
        {
          id: "grok-1.5",
          name: "Grok-1.5",
          description: "Balanced performance for most use cases.",
          capabilities: ["Text generation", "Up-to-date information"],
        },
        {
          id: "grok-1",
          name: "Grok-1",
          description: "First generation Grok model.",
          capabilities: ["Text generation", "Basic reasoning"],
        },
      ],
      apiKeyName: "GROK_API_KEY",
      baseUrlConfigurable: true,
    },
    {
      id: "langchain",
      name: "LangChain",
      logo: "/langchain-logo.png",
      description:
        "Configure LangChain for orchestrating multiple AI models and tools.",
      models: [
        {
          id: "langchain-orchestration",
          name: "LangChain Orchestration",
          description: "Configure LangChain for complex AI workflows.",
          capabilities: [
            "Model orchestration",
            "Tool integration",
            "Advanced workflows",
          ],
          recommended: true,
        },
      ],
      apiKeyName: "LANGCHAIN_API_KEY",
      baseUrlConfigurable: true,
      defaultBaseUrl: "https://api.langchain.com",
    },
  ];

  const [settings, setSettings] = useState<Record<string, any>>(() => {
    // Initialize settings for each provider
    const initialSettings: Record<string, any> = {};
    providers.forEach((provider) => {
      initialSettings[provider.id] = {
        enabled: provider.id === "openai", // Enable OpenAI by default
        apiKey: "",
        organizationId: provider.organizationIdRequired ? "" : undefined,
        baseUrl: provider.defaultBaseUrl || "",
        selectedModel:
          provider.models.find((m) => m.recommended)?.id ||
          provider.models[0]?.id ||
          "",
      };
    });
    return initialSettings;
  });

  const handleSettingChange = (
    providerId: string,
    field: string,
    value: any,
  ) => {
    setSettings((prev) => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        [field]: value,
      },
    }));
  };

  const handleSaveSettings = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1000);
  };

  const currentProvider =
    providers.find((p) => p.id === activeProvider) || providers[0];

  return (
    <div className="space-y-6">
      <Tabs
        defaultValue={activeProvider}
        onValueChange={setActiveProvider}
        className="w-full"
      >
        <TabsList className="grid grid-cols-5 w-full">
          {providers.map((provider) => (
            <TabsTrigger
              key={provider.id}
              value={provider.id}
              className="flex items-center gap-2"
            >
              <span>{provider.name}</span>
              {settings[provider.id]?.enabled && (
                <Check className="h-3 w-3 text-green-500" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {providers.map((provider) => (
          <TabsContent
            key={provider.id}
            value={provider.id}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl flex items-center gap-3">
                      <img
                        src={provider.logo || "/placeholder.svg"}
                        alt={`${provider.name} logo`}
                        className="h-8 w-8 rounded-md"
                        width={32}
                        height={32}
                      />
                      {provider.name}
                    </CardTitle>
                    <CardDescription>{provider.description}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`${provider.id}-enabled`}
                      checked={settings[provider.id]?.enabled}
                      onCheckedChange={(checked) =>
                        handleSettingChange(provider.id, "enabled", checked)
                      }
                    />
                    <Label htmlFor={`${provider.id}-enabled`}>Enabled</Label>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${provider.id}-api-key`}>API Key</Label>
                    <Input
                      id={`${provider.id}-api-key`}
                      type="password"
                      placeholder={`Enter your ${provider.name} API key`}
                      value={settings[provider.id]?.apiKey}
                      onChange={(e) =>
                        handleSettingChange(
                          provider.id,
                          "apiKey",
                          e.target.value,
                        )
                      }
                      disabled={!settings[provider.id]?.enabled}
                    />
                    <p className="text-sm text-muted-foreground">
                      Environment variable: <code>{provider.apiKeyName}</code>
                    </p>
                  </div>

                  {provider.organizationIdRequired && (
                    <div className="space-y-2">
                      <Label htmlFor={`${provider.id}-org-id`}>
                        Organization ID
                      </Label>
                      <Input
                        id={`${provider.id}-org-id`}
                        placeholder="Enter your organization ID (optional)"
                        value={settings[provider.id]?.organizationId}
                        onChange={(e) =>
                          handleSettingChange(
                            provider.id,
                            "organizationId",
                            e.target.value,
                          )
                        }
                        disabled={!settings[provider.id]?.enabled}
                      />
                    </div>
                  )}

                  {provider.baseUrlConfigurable && (
                    <div className="space-y-2">
                      <Label htmlFor={`${provider.id}-base-url`}>
                        Base URL
                      </Label>
                      <Input
                        id={`${provider.id}-base-url`}
                        placeholder={
                          provider.defaultBaseUrl || "Enter base URL (optional)"
                        }
                        value={settings[provider.id]?.baseUrl}
                        onChange={(e) =>
                          handleSettingChange(
                            provider.id,
                            "baseUrl",
                            e.target.value,
                          )
                        }
                        disabled={!settings[provider.id]?.enabled}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor={`${provider.id}-model`}>
                      Default Model
                    </Label>
                    <Select
                      value={settings[provider.id]?.selectedModel}
                      onValueChange={(value) =>
                        handleSettingChange(provider.id, "selectedModel", value)
                      }
                      disabled={!settings[provider.id]?.enabled}
                    >
                      <SelectTrigger id={`${provider.id}-model`}>
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {provider.models.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center">
                              <span>{model.name}</span>
                              {model.recommended && (
                                <span className="ml-2 rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
                                  Recommended
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">
                    Selected Model Information
                  </h3>
                  {settings[provider.id]?.enabled &&
                    settings[provider.id]?.selectedModel && (
                      <div className="rounded-md border p-4">
                        {(() => {
                          const selectedModel = provider.models.find(
                            (m) =>
                              m.id === settings[provider.id]?.selectedModel,
                          );
                          if (!selectedModel) return null;
                          return (
                            <div className="space-y-3">
                              <div>
                                <h4 className="font-medium">
                                  {selectedModel.name}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {selectedModel.description}
                                </p>
                              </div>
                              <div>
                                <h5 className="text-sm font-medium">
                                  Capabilities:
                                </h5>
                                <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1">
                                  {selectedModel.capabilities.map(
                                    (capability, i) => (
                                      <li
                                        key={i}
                                        className="text-sm flex items-center"
                                      >
                                        <Check className="mr-1 h-3 w-3 text-green-500" />
                                        {capability}
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                  {!settings[provider.id]?.enabled && (
                    <Alert variant="default" className="bg-muted/50">
                      <Info className="h-4 w-4" />
                      <AlertTitle>Provider disabled</AlertTitle>
                      <AlertDescription>
                        Enable this provider to configure and use{" "}
                        {provider.name} models in your application.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="flex items-center">
                  {saveSuccess && (
                    <span className="text-sm text-green-500 flex items-center">
                      <Check className="mr-1 h-4 w-4" /> Settings saved
                      successfully
                    </span>
                  )}
                </div>
                <Button onClick={handleSaveSettings} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Settings"}
                </Button>
              </CardFooter>
            </Card>

            {provider.id === "langchain" && settings[provider.id]?.enabled && (
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertTitle>LangChain Integration</AlertTitle>
                <AlertDescription>
                  LangChain allows you to orchestrate multiple AI models and
                  tools. Configure additional settings in the LangChain
                  dashboard.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Global AI Settings</CardTitle>
          <CardDescription>
            Configure settings that apply to all AI providers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content-filtering">Content Filtering</Label>
              <Switch id="content-filtering" defaultChecked />
            </div>
            <p className="text-sm text-muted-foreground">
              Enable content filtering to prevent generation of harmful or
              inappropriate content.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="usage-tracking">Usage Tracking</Label>
              <Switch id="usage-tracking" defaultChecked />
            </div>
            <p className="text-sm text-muted-foreground">
              Track AI usage across the platform for billing and analytics.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-provider">Default Provider</Label>
            <Select defaultValue="openai">
              <SelectTrigger id="default-provider">
                <SelectValue placeholder="Select default provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              The default provider will be used when no specific provider is
              requested.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
