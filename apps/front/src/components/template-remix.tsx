"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Shuffle,
  Zap,
  Flame,
  Shield,
  Target,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Crown,
  Laugh,
  Megaphone,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  SmsTemplate,
  TemplateCategory,
  WorkerType,
} from "@/lib/templates/nextier-defaults";

/**
 * TEMPLATE REMIX ENGINE
 *
 * Tonality Framework:
 * - Stratton Oakmont: Aggressive confidence, urgency, FOMO
 * - Glengarry Glen Ross: "Coffee is for closers", direct pressure
 * - Mr. Wonderful: Blunt, money-focused, "here's the deal"
 *
 * Temperature Controls:
 * - Humor: 0 = Professional → 100 = Naked Gun absurdist
 * - Directness: 0 = Polite → 100 = Brutally honest
 * - Authority: 0 = Humble → 100 = Supreme confidence
 * - Urgency: 0 = Relaxed → 100 = Now or never
 */

interface RemixSettings {
  humor: number; // 0-100: Professional to Naked Gun
  directness: number; // 0-100: Polite to Brutally honest
  authority: number; // 0-100: Humble to Supreme confidence
  urgency: number; // 0-100: Relaxed to Now or never
}

interface RemixVariation {
  id: string;
  content: string;
  characterCount: number;
  settings: RemixSettings;
  approved?: boolean;
  rejected?: boolean;
  timestamp: Date;
}

interface TemplateRemixProps {
  template: SmsTemplate;
  onSave?: (variation: RemixVariation) => void;
  onClose?: () => void;
  open?: boolean;
}

// Sample remix transformations based on settings
const REMIX_PHRASES = {
  openers: {
    low: ["Hi", "Hey", "Hello"],
    medium: ["Look,", "Real talk,", "Between us,"],
    high: ["Listen up,", "Here's the deal,", "Let me be direct -"],
    max: ["ATTENTION:", "No BS -", "Stop what you're doing."],
  },
  closers: {
    low: [
      "Let me know if you're interested.",
      "Thoughts?",
      "Would love to hear from you.",
    ],
    medium: [
      "Are you in or out?",
      "Ready to talk?",
      "What's holding you back?",
    ],
    high: ["The clock's ticking.", "Don't miss this.", "Your move."],
    max: ["Now or never.", "Last chance.", "Fortune favors the bold."],
  },
  urgency: {
    low: ["when you get a chance", "no rush", "at your convenience"],
    medium: ["this week", "soon", "before the opportunity passes"],
    high: ["today", "right now", "immediately"],
    max: ["THIS SECOND", "before I hang up", "while you still can"],
  },
  humor: {
    low: [],
    medium: ["(I promise I'm not a robot)", "Did my last message get lost?"],
    high: [
      "I'm starting to think you're playing hard to get...",
      "Should I send a carrier pigeon instead?",
    ],
    max: [
      "I checked - your phone works. I called NASA.",
      "Plot twist: this is actually a reality show and you're winning.",
    ],
  },
  authority: {
    low: ["I think", "maybe", "possibly"],
    medium: ["I've seen", "in my experience", "typically"],
    high: ["I know", "the data shows", "here's the truth"],
    max: ["Listen to me.", "This is non-negotiable.", "Trust the process."],
  },
};

// Mr. Wonderful style phrases
const MR_WONDERFUL = [
  "Here's what you don't understand...",
  "Let me tell you why you're wrong.",
  "Money doesn't care about your feelings.",
  "You know what's great about this? Nothing. Until you respond.",
  "I'm going to give you some free advice - take the meeting.",
];

// Glengarry Glen Ross style
const GLENGARRY = [
  "Coffee is for closers.",
  "A-B-C. Always. Be. Closing.",
  "First prize is a meeting. Second prize is nothing.",
  "You want the leads? Prove you deserve them.",
  "Put. That coffee. Down.",
];

// Stratton Oakmont style
const STRATTON = [
  "The only thing standing between you and success is this reply.",
  "Winners take action. Losers make excuses.",
  "I'm not here to waste your time. Are you going to waste mine?",
  "Every day you wait is money you lose.",
  "This is how millionaires are made.",
];

export function TemplateRemix({
  template,
  onSave,
  onClose,
  open = true,
}: TemplateRemixProps) {
  const [settings, setSettings] = useState<RemixSettings>({
    humor: 20,
    directness: 40,
    authority: 60,
    urgency: 30,
  });
  const [variations, setVariations] = useState<RemixVariation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedVariation, setSelectedVariation] =
    useState<RemixVariation | null>(null);
  const [customEdit, setCustomEdit] = useState("");

  // Generate remix variations based on settings
  const generateRemixes = useCallback(async () => {
    setIsGenerating(true);

    // Simulate AI generation (in production, this would call the API)
    await new Promise((r) => setTimeout(r, 1500));

    const newVariations: RemixVariation[] = [];
    const baseContent = template.content;

    // Generate 4 variations with slightly different settings
    for (let i = 0; i < 4; i++) {
      const varSettings = {
        humor: Math.min(
          100,
          Math.max(0, settings.humor + (Math.random() - 0.5) * 20),
        ),
        directness: Math.min(
          100,
          Math.max(0, settings.directness + (Math.random() - 0.5) * 20),
        ),
        authority: Math.min(
          100,
          Math.max(0, settings.authority + (Math.random() - 0.5) * 20),
        ),
        urgency: Math.min(
          100,
          Math.max(0, settings.urgency + (Math.random() - 0.5) * 20),
        ),
      };

      // Select phrase tiers based on settings
      const getLevel = (value: number): "low" | "medium" | "high" | "max" => {
        if (value < 25) return "low";
        if (value < 50) return "medium";
        if (value < 75) return "high";
        return "max";
      };

      const openerLevel = getLevel(varSettings.directness);
      const closerLevel = getLevel(varSettings.urgency);
      const authorityLevel = getLevel(varSettings.authority);
      const humorLevel = getLevel(varSettings.humor);

      // Pick random phrases from each category
      const opener =
        REMIX_PHRASES.openers[openerLevel][
          Math.floor(Math.random() * REMIX_PHRASES.openers[openerLevel].length)
        ] || "";
      const closer =
        REMIX_PHRASES.closers[closerLevel][
          Math.floor(Math.random() * REMIX_PHRASES.closers[closerLevel].length)
        ] || "";

      // Add humor if high enough
      let humorInsert = "";
      if (varSettings.humor > 50) {
        const humorPhrases = REMIX_PHRASES.humor[humorLevel];
        if (humorPhrases.length > 0) {
          humorInsert =
            humorPhrases[Math.floor(Math.random() * humorPhrases.length)];
        }
      }

      // Add authority phrase if high enough
      let authorityPhrase = "";
      if (varSettings.authority > 70) {
        if (Math.random() > 0.5) {
          authorityPhrase =
            MR_WONDERFUL[Math.floor(Math.random() * MR_WONDERFUL.length)];
        } else if (Math.random() > 0.5) {
          authorityPhrase =
            GLENGARRY[Math.floor(Math.random() * GLENGARRY.length)];
        } else {
          authorityPhrase =
            STRATTON[Math.floor(Math.random() * STRATTON.length)];
        }
      }

      // Build the remixed content
      let remixedContent = baseContent;

      // Replace generic opener if we have one
      if (opener && !baseContent.startsWith(opener)) {
        const firstPunctuation = remixedContent.search(/[,!.?]/);
        if (firstPunctuation > 0 && firstPunctuation < 30) {
          remixedContent =
            opener + " " + remixedContent.slice(firstPunctuation + 1).trim();
        }
      }

      // Add humor insert in middle if available
      if (humorInsert && varSettings.humor > 60) {
        const sentences = remixedContent.split(/[.!?]/);
        if (sentences.length > 2) {
          const insertPoint = Math.floor(sentences.length / 2);
          sentences.splice(insertPoint, 0, " " + humorInsert);
          remixedContent = sentences.join(". ").replace(/\.\s+\./g, ".");
        }
      }

      // Replace or append closer
      if (closer && varSettings.urgency > 40) {
        // Find and replace the last sentence
        const lastPeriod = remixedContent.lastIndexOf(".");
        if (lastPeriod > 0) {
          const beforeLast = remixedContent.slice(0, lastPeriod + 1);
          remixedContent = beforeLast + " " + closer;
        } else {
          remixedContent += " " + closer;
        }
      }

      // Truncate to 160 chars if needed
      if (remixedContent.length > 160) {
        remixedContent = remixedContent.slice(0, 157) + "...";
      }

      newVariations.push({
        id: `remix-${Date.now()}-${i}`,
        content: remixedContent.trim(),
        characterCount: remixedContent.length,
        settings: varSettings,
        timestamp: new Date(),
      });
    }

    setVariations(newVariations);
    setIsGenerating(false);
  }, [settings, template]);

  // Handle approval/rejection
  const handleApprove = (variation: RemixVariation) => {
    setVariations((prev) =>
      prev.map((v) =>
        v.id === variation.id ? { ...v, approved: true, rejected: false } : v,
      ),
    );
    // This approval would train the AI in production
    console.log("Training signal: APPROVED", {
      settings: variation.settings,
      content: variation.content,
    });
  };

  const handleReject = (variation: RemixVariation) => {
    setVariations((prev) =>
      prev.map((v) =>
        v.id === variation.id ? { ...v, rejected: true, approved: false } : v,
      ),
    );
    // This rejection would train the AI in production
    console.log("Training signal: REJECTED", {
      settings: variation.settings,
      content: variation.content,
    });
  };

  const handleSave = (variation: RemixVariation) => {
    onSave?.(variation);
    onClose?.();
  };

  const getTemperatureLabel = (value: number) => {
    if (value < 25) return "Low";
    if (value < 50) return "Medium";
    if (value < 75) return "High";
    return "Max";
  };

  const getTemperatureColor = (value: number) => {
    if (value < 25) return "text-blue-600";
    if (value < 50) return "text-green-600";
    if (value < 75) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shuffle className="h-5 w-5 text-purple-500" />
            Template Remix Engine
            <Badge variant="secondary" className="ml-2">
              Stratton × Glengarry × Mr. Wonderful
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 overflow-hidden">
          {/* Left: Settings */}
          <div className="space-y-6">
            {/* Original Template */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Original Template
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  {template.content}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <Badge variant="outline">
                    {template.characterCount} chars
                  </Badge>
                  <Badge variant="secondary">{template.category}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Temperature Controls */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  Tonality Temperature
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Humor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-sm">
                      <Laugh className="h-4 w-4" />
                      Humor
                    </Label>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        getTemperatureColor(settings.humor),
                      )}
                    >
                      {getTemperatureLabel(settings.humor)}
                    </span>
                  </div>
                  <Slider
                    value={[settings.humor]}
                    onValueChange={([v]) =>
                      setSettings((s) => ({ ...s, humor: v }))
                    }
                    max={100}
                    step={5}
                    className="py-1"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Professional</span>
                    <span>Naked Gun</span>
                  </div>
                </div>

                {/* Directness */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-sm">
                      <Megaphone className="h-4 w-4" />
                      Directness
                    </Label>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        getTemperatureColor(settings.directness),
                      )}
                    >
                      {getTemperatureLabel(settings.directness)}
                    </span>
                  </div>
                  <Slider
                    value={[settings.directness]}
                    onValueChange={([v]) =>
                      setSettings((s) => ({ ...s, directness: v }))
                    }
                    max={100}
                    step={5}
                    className="py-1"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Polite</span>
                    <span>Brutally Honest</span>
                  </div>
                </div>

                {/* Authority */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-sm">
                      <Crown className="h-4 w-4" />
                      Authority
                    </Label>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        getTemperatureColor(settings.authority),
                      )}
                    >
                      {getTemperatureLabel(settings.authority)}
                    </span>
                  </div>
                  <Slider
                    value={[settings.authority]}
                    onValueChange={([v]) =>
                      setSettings((s) => ({ ...s, authority: v }))
                    }
                    max={100}
                    step={5}
                    className="py-1"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Humble</span>
                    <span>Supreme Confidence</span>
                  </div>
                </div>

                {/* Urgency */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4" />
                      Urgency
                    </Label>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        getTemperatureColor(settings.urgency),
                      )}
                    >
                      {getTemperatureLabel(settings.urgency)}
                    </span>
                  </div>
                  <Slider
                    value={[settings.urgency]}
                    onValueChange={([v]) =>
                      setSettings((s) => ({ ...s, urgency: v }))
                    }
                    max={100}
                    step={5}
                    className="py-1"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Relaxed</span>
                    <span>Now or Never</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Generate Button */}
            <Button
              className="w-full"
              size="lg"
              onClick={generateRemixes}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating Variations...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Remix Variations
                </>
              )}
            </Button>
          </div>

          {/* Right: Variations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Variations</h4>
              <span className="text-xs text-muted-foreground">
                {variations.filter((v) => v.approved).length} approved
              </span>
            </div>

            <ScrollArea className="h-[450px] pr-4">
              {variations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shuffle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Adjust temperatures and click Generate</p>
                  <p className="text-xs mt-1">to create unlimited variations</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {variations.map((variation) => (
                    <Card
                      key={variation.id}
                      className={cn(
                        "transition-all",
                        variation.approved &&
                          "ring-2 ring-green-500 bg-green-50",
                        variation.rejected && "opacity-50 bg-red-50",
                      )}
                    >
                      <CardContent className="p-4 space-y-3">
                        <p className="text-sm">{variation.content}</p>

                        {/* Stats */}
                        <div className="flex items-center gap-2 text-xs">
                          <Badge
                            variant="outline"
                            className={cn(
                              variation.characterCount <= 160
                                ? "border-green-300 text-green-700"
                                : "border-orange-300 text-orange-700",
                            )}
                          >
                            {variation.characterCount}/160
                          </Badge>
                          <span className="text-muted-foreground">
                            H:{Math.round(variation.settings.humor)}
                            D:{Math.round(variation.settings.directness)}
                            A:{Math.round(variation.settings.authority)}
                            U:{Math.round(variation.settings.urgency)}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant={variation.approved ? "default" : "outline"}
                            size="sm"
                            className={cn(
                              "flex-1",
                              variation.approved &&
                                "bg-green-600 hover:bg-green-700",
                            )}
                            onClick={() => handleApprove(variation)}
                          >
                            <ThumbsUp className="h-3 w-3 mr-1" />
                            {variation.approved ? "Approved" : "Approve"}
                          </Button>
                          <Button
                            variant={
                              variation.rejected ? "destructive" : "outline"
                            }
                            size="sm"
                            className="flex-1"
                            onClick={() => handleReject(variation)}
                          >
                            <ThumbsDown className="h-3 w-3 mr-1" />
                            {variation.rejected ? "Rejected" : "Reject"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSave(variation)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mr-auto">
            <Sparkles className="h-3 w-3" />
            Your approvals train the AI to match your style
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TemplateRemix;
