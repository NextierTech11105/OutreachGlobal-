"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Import REAL GIANNA personality - NO MOCK DATA
import { GIANNA } from "@/lib/ai-workers/digital-workers";

export function GiannaAgentConfig() {
  const { toast } = useToast();

  // Pre-populated with GIANNA's REAL personality DNA
  const [agentName, setAgentName] = useState(GIANNA.name);
  const [description, setDescription] = useState(
    "AI-Powered Initial Outreach Specialist - Captures emails for Value X delivery"
  );
  const [personalityRole, setPersonalityRole] = useState(
    `${GIANNA.personality.description}

BACKSTORY:
${GIANNA.personality.backstory}

STRENGTHS:
${GIANNA.personality.strengths.map((s) => `• ${s}`).join("\n")}

QUIRKS:
${GIANNA.personality.quirks.map((q) => `• ${q}`).join("\n")}

GOALS:
${GIANNA.goals.map((g) => `• ${g}`).join("\n")}

SIGNATURE PHRASES:
${GIANNA.linguistic.signaturePhrases.map((p) => `"${p}"`).join(", ")}

GREETINGS:
${GIANNA.linguistic.greetings.map((g) => `"${g}"`).join(", ")}

CLOSINGS:
${GIANNA.linguistic.closings.map((c) => `"${c}"`).join(", ")}

WORDS TO AVOID:
${GIANNA.linguistic.avoids.join(", ")}`
  );
  const [replyDelay, setReplyDelay] = useState("no-delay");

  const handleSave = () => {
    toast({
      title: "Agent Configuration Saved",
      description: `${agentName} has been configured successfully.`,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Configuration</CardTitle>
          <CardDescription>
            Configure GIANNA - your AI-powered initial outreach specialist
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Agent Name */}
          <div className="space-y-2">
            <Label htmlFor="agent-name">Agent Name</Label>
            <Input
              id="agent-name"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Enter agent name"
            />
            <p className="text-xs text-muted-foreground">
              Choose a friendly name for your AI assistant that users will recognize and connect with.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview of what your AI assistant does"
            />
            <p className="text-xs text-muted-foreground">
              Provide a brief overview of what your AI assistant does and how it helps users.
            </p>
          </div>

          {/* Personality & Role Description */}
          <div className="space-y-2">
            <Label htmlFor="personality-role">Personality & Role Description</Label>
            <Textarea
              id="personality-role"
              value={personalityRole}
              onChange={(e) => setPersonalityRole(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              placeholder="Define your agent's personality, expertise, communication style..."
            />
            <p className="text-xs text-muted-foreground">
              Define your agent&apos;s personality, expertise, communication style, and how they should interact with users. Be specific about their role and approach.
            </p>
          </div>

          {/* Reply Delay */}
          <div className="space-y-2">
            <Label htmlFor="reply-delay">Reply Delay</Label>
            <Select value={replyDelay} onValueChange={setReplyDelay}>
              <SelectTrigger id="reply-delay">
                <SelectValue placeholder="Select reply delay" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-delay">No delay</SelectItem>
                <SelectItem value="30-seconds">30 seconds</SelectItem>
                <SelectItem value="1-minute">1 minute</SelectItem>
                <SelectItem value="2-minutes">2 minutes</SelectItem>
                <SelectItem value="5-minutes">5 minutes</SelectItem>
                <SelectItem value="random">Random (1-5 min)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} className="flex-1">
              Save & Continue
            </Button>
            <Button variant="outline" className="flex-1">
              Skip for Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">AI Assistant Setup</CardTitle>
          <CardDescription>
            Let&apos;s set up an AI assistant to reply to messages on your behalf, here&apos;s some tips
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Be specific about your agent&apos;s role and expertise area
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Include company information and context when relevant
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Define clear boundaries for what the agent should and shouldn&apos;t do
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Use a conversational tone that matches your brand voice
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
