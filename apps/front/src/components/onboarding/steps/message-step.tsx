"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Send,
  Check,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PersonaMessage } from "../persona-avatar";
import type { OnboardingData } from "../onboarding-wizard";

/**
 * STEP 6: Create Your First Message
 * ═══════════════════════════════════════════════════════════════════════════════
 * Template library with industry-specific options
 * Live preview and test send capability
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const MESSAGE_TEMPLATES = [
  {
    id: "system-own",
    name: "System Ownership",
    message:
      "Most professionals keep renting their lead generation and never control the system. Nextier changes that. Open to 15 min talk ?",
    industry: "general",
  },
  {
    id: "system-build",
    name: "System Builder",
    message:
      "The best professionals don't chase leads — their system does. That's what we build at Nextier. best email ?",
    industry: "general",
  },
  {
    id: "valuation",
    name: "Business Valuation",
    message:
      "Ever wonder what your business could sell for? I can get you a valuation. Best email ?",
    industry: "blue_collar_exits",
  },
  {
    id: "pipeline",
    name: "Client Pipeline",
    message:
      "Most solo practitioners rely on referrals and hope. Nextier builds you a predictable client pipeline. Open to 15 min talk ?",
    industry: "solopreneurs",
  },
];

interface MessageStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip?: () => void;
  skipLabel?: string;
}

export function MessageStep({
  data,
  updateData,
  onNext,
  onBack,
  onSkip,
  skipLabel = "Use default",
}: MessageStepProps) {
  const [testPhone, setTestPhone] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const message = data.firstMessageTemplate;
  const charCount = message.length;
  const segmentCount = Math.ceil(charCount / 160);

  // Filter templates relevant to user's industry
  const relevantTemplates = MESSAGE_TEMPLATES.filter(
    (t) => t.industry === "general" || t.industry === data.industry,
  );

  const handleTemplateSelect = (template: (typeof MESSAGE_TEMPLATES)[0]) => {
    updateData({ firstMessageTemplate: template.message });
  };

  const handleTestSend = async () => {
    if (!testPhone || testPhone.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setIsSendingTest(true);
    try {
      const response = await fetch("/api/signalhouse/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testPhone.replace(/\D/g, ""),
          message: message,
          test: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send test message");
      }

      setTestSent(true);
      updateData({ testSentTo: testPhone });
      toast.success("Test message sent!");
    } catch (error) {
      toast.error("Failed to send test message");
    } finally {
      setIsSendingTest(false);
    }
  };

  const canContinue = message.length >= 10;

  return (
    <div className="space-y-6">
      {/* Persona Introduction */}
      <PersonaMessage
        persona="GIANNA"
        message="Time to craft your opening message! I've prepared some templates based on your industry, or you can write your own. Keep it short and end with a question."
      />

      {/* Template Library */}
      <div className="space-y-2">
        <Label>Quick Templates</Label>
        <div className="grid gap-2 md:grid-cols-2">
          {relevantTemplates.map((template) => (
            <Card
              key={template.id}
              className={cn(
                "p-3 cursor-pointer transition-all hover:shadow-md",
                message === template.message && "ring-2 ring-primary",
              )}
              onClick={() => handleTemplateSelect(template)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{template.name}</span>
                {message === template.message && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {template.message}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* Message Editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Your Message</Label>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{charCount} characters</span>
            <Badge variant="outline">{segmentCount} segment(s)</Badge>
          </div>
        </div>
        <Textarea
          value={message}
          onChange={(e) => updateData({ firstMessageTemplate: e.target.value })}
          placeholder="Write your opening message..."
          className="min-h-[120px]"
        />
        <p className="text-xs text-muted-foreground">
          Tip: Keep it under 160 characters for a single SMS segment. End with a
          question to encourage response.
        </p>
      </div>

      {/* Live Preview */}
      <div className="space-y-2">
        <Label>Live Preview</Label>
        <div className="p-4 bg-muted rounded-lg">
          <div className="max-w-[280px] mx-auto">
            <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm p-3 text-sm">
              {message || "Your message will appear here..."}
            </div>
          </div>
        </div>
      </div>

      {/* Test Send */}
      <div className="p-4 border rounded-lg">
        <Label className="flex items-center gap-2 mb-2">
          <MessageSquare className="h-4 w-4" />
          Send a Test Message
        </Label>
        <div className="flex gap-2">
          <Input
            type="tel"
            placeholder="Your phone number"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={handleTestSend}
            disabled={isSendingTest || !message}
          >
            {isSendingTest ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : testSent ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {testSent && (
          <p className="text-xs text-green-600 mt-2">
            Test message sent to {testPhone}
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          {onSkip && (
            <Button
              variant="ghost"
              onClick={() => {
                // Set a default message if skipping
                if (!message) {
                  updateData({ firstMessageTemplate: MESSAGE_TEMPLATES[0].message });
                }
                onSkip();
              }}
              className="text-muted-foreground"
            >
              {skipLabel}
            </Button>
          )}
          <Button onClick={onNext} disabled={!canContinue} size="lg">
            Continue to Launch
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
