"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Sparkles, RotateCcw, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ModelTestProps = {
  providerId: string;
  providerName: string;
  models: {
    id: string;
    name: string;
  }[];
  onClose: () => void;
};

export function LlmModelTester({
  providerId,
  providerName,
  models,
  onClose,
}: ModelTestProps) {
  const [prompt, setPrompt] = useState(
    "Write a brief introduction for a real estate company that specializes in luxury properties.",
  );
  const [response, setResponse] = useState("");
  const [selectedModel, setSelectedModel] = useState(models[0]?.id || "");
  const [temperature, setTemperature] = useState(0.7);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("prompt");
  const [tokenCount, setTokenCount] = useState({
    prompt: 0,
    response: 0,
    total: 0,
  });
  const [estimatedCost, setEstimatedCost] = useState(0);

  // Sample prompt templates
  const promptTemplates = [
    {
      name: "Company Introduction",
      text: "Write a brief introduction for a real estate company that specializes in luxury properties.",
    },
    {
      name: "Property Description",
      text: "Create a compelling property description for a 4-bedroom waterfront home with a private dock and panoramic views.",
    },
    {
      name: "Email Follow-up",
      text: "Write a follow-up email to a lead who viewed a property last week but hasn't responded to initial outreach.",
    },
    {
      name: "Market Analysis",
      text: "Provide a short market analysis of the current real estate trends in urban areas post-pandemic.",
    },
  ];

  const handleSelectTemplate = (templateText: string) => {
    setPrompt(templateText);
    // Rough token estimation (very approximate)
    setTokenCount((prev) => ({
      ...prev,
      prompt: Math.round(templateText.length / 4),
      total: Math.round(templateText.length / 4) + prev.response,
    }));
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setResponse("");
    setActiveTab("response");

    const startTime = Date.now();

    try {
      // Simulate API call to LLM service
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock response based on provider and model
      let mockResponse = "";
      if (providerId === "openai") {
        mockResponse =
          "Welcome to Elite Estates, where luxury living meets unparalleled service. As specialists in premium properties, we curate an exclusive portfolio of the world's most desirable residences. Our team of dedicated experts brings decades of experience in the luxury market, ensuring that each client receives personalized attention and access to exceptional opportunities. Whether you're seeking a waterfront mansion, a penthouse with panoramic views, or a historic estate, Elite Estates transforms your vision of luxury living into reality.";
      } else if (providerId === "anthropic") {
        mockResponse =
          "Introducing Prestige Properties, your gateway to extraordinary living. We specialize in curating a collection of the world's most exceptional luxury residences, each selected for its unique character and uncompromising quality. Our boutique approach ensures that every client relationship is built on understanding your distinct preferences and lifestyle aspirations. With Prestige Properties, you're not just acquiring real estate—you're embracing a legacy of excellence and sophistication in the most coveted locations globally.";
      } else {
        mockResponse =
          "Discover Sovereign Luxury Real Estate, where exceptional properties meet discerning clients. We've established ourselves as the premier destination for those seeking residences that transcend the ordinary. Our portfolio showcases architectural masterpieces and landmark properties that represent the pinnacle of luxury living. With our white-glove service approach and unrivaled market expertise, we guide you through every step of your luxury real estate journey, ensuring a seamless experience from initial consultation to final acquisition.";
      }

      setResponse(mockResponse);

      // Calculate response time
      const endTime = Date.now();
      setResponseTime((endTime - startTime) / 1000);

      // Estimate token count and cost
      const responseTokens = Math.round(mockResponse.length / 4);
      setTokenCount({
        prompt: Math.round(prompt.length / 4),
        response: responseTokens,
        total: Math.round(prompt.length / 4) + responseTokens,
      });

      // Estimate cost (very rough approximation)
      let costPerToken = 0.00001;
      if (selectedModel.includes("gpt-4")) {
        costPerToken = 0.00003;
      } else if (selectedModel.includes("claude-3-opus")) {
        costPerToken = 0.000025;
      }

      setEstimatedCost(tokenCount.total * costPerToken);
    } catch (err) {
      setError(
        "An error occurred while generating the response. Please try again.",
      );
      console.error("Error testing model:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setPrompt("");
    setResponse("");
    setError(null);
    setResponseTime(null);
    setTokenCount({ prompt: 0, response: 0, total: 0 });
    setEstimatedCost(0);
    setActiveTab("prompt");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Test {providerName} Model</span>
          <Badge variant="outline">
            {models.find((m) => m.id === selectedModel)?.name || selectedModel}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-3">
            <Label htmlFor="model-select">Model</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger id="model-select">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="temperature-slider">
              Temperature: {temperature.toFixed(1)}
            </Label>
            <Slider
              id="temperature-slider"
              min={0}
              max={1}
              step={0.1}
              value={[temperature]}
              onValueChange={(values) => setTemperature(values[0])}
              className="mt-2"
            />
          </div>
        </div>

        <div>
          <Label>Prompt Templates</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {promptTemplates.map((template, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleSelectTemplate(template.text)}
              >
                {template.name}
              </Button>
            ))}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="prompt">Prompt</TabsTrigger>
            <TabsTrigger value="response">Response</TabsTrigger>
          </TabsList>
          <TabsContent value="prompt" className="space-y-4">
            <Textarea
              placeholder="Enter your prompt here..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[200px]"
            />
            <div className="text-xs text-muted-foreground">
              Estimated tokens: {tokenCount.prompt}
            </div>
          </TabsContent>
          <TabsContent value="response" className="space-y-4">
            {isGenerating ? (
              <div className="min-h-[200px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Sparkles className="h-8 w-8 animate-pulse text-primary" />
                  <p>Generating response...</p>
                </div>
              </div>
            ) : response ? (
              <div className="space-y-4">
                <div className="rounded-md border p-4 min-h-[200px]">
                  <pre className="whitespace-pre-wrap font-sans">
                    {response}
                  </pre>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center">
                    <Clock className="mr-1 h-3 w-3" />
                    Response time: {responseTime?.toFixed(2)}s
                  </div>
                  <div>
                    Tokens: {tokenCount.response} (response) /{" "}
                    {tokenCount.total} (total)
                  </div>
                  <div>Estimated cost: ${estimatedCost.toFixed(6)}</div>
                </div>
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <div className="min-h-[200px] flex items-center justify-center text-muted-foreground">
                <p>Response will appear here</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
