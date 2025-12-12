"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Send,
  RefreshCw,
  Phone,
  CheckCircle2,
  Loader2,
  Sparkles,
  Clock,
  Ban,
  ThumbsUp,
  ThumbsDown,
  Settings,
  Zap,
  Wand2,
  MessageCircle,
  Smile,
  Flame,
  Target,
  Calendar,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AiCopilotReplyProps {
  incomingMessage: string;
  leadName?: string;
  leadPhone: string;
  propertyAddress?: string;
  campaignType?: "real_estate" | "b2b" | "financial" | "default";
  previousMessages?: Array<{ role: "user" | "assistant"; content: string }>;
  onSendReply: (message: string) => Promise<void>;
  onPushToCallCenter: () => void;
  onAddToDnc: () => void;
  onMarkCold: () => void;
}

interface AiSuggestion {
  suggestedReply: string;
  confidence: number;
  provider: string;
  classification: {
    intent: string;
    sentiment: string;
    action: string;
  };
  characterCount: number;
  isShortEnough: boolean;
}

interface AutoReplySettings {
  enabled: boolean;
  delaySeconds: number;
  minConfidence: number;
  provider: "openai" | "anthropic";
  tone: "friendly" | "professional" | "urgent" | "casual";
}

// Remix sliders for magic generation
interface RemixSliders {
  conversational: number; // 0-100: Formal ↔ Casual
  humor: number; // 0-100: None ↔ Playful
  urgency: number; // 0-100: Relaxed ↔ Urgent
  directness: number; // 0-100: Soft ↔ Direct
}

export function AiCopilotReply({
  incomingMessage,
  leadName,
  leadPhone,
  propertyAddress,
  campaignType = "default",
  previousMessages = [],
  onSendReply,
  onPushToCallCenter,
  onAddToDnc,
  onMarkCold,
}: AiCopilotReplyProps) {
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRemix, setShowRemix] = useState(false);
  const [autoReplyCountdown, setAutoReplyCountdown] = useState<number | null>(
    null,
  );
  const [remixCount, setRemixCount] = useState(0);

  // Magic Remix sliders
  const [remixSliders, setRemixSliders] = useState<RemixSliders>({
    conversational: 60, // Slightly casual
    humor: 20, // Light humor
    urgency: 40, // Relaxed but purposeful
    directness: 50, // Balanced
  });

  // Auto-reply settings (persisted in localStorage)
  const [settings, setSettings] = useState<AutoReplySettings>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ai_copilot_settings");
      if (saved) return JSON.parse(saved);
    }
    return {
      enabled: false,
      delaySeconds: 30,
      minConfidence: 85,
      provider: "openai",
      tone: "friendly",
    };
  });

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem("ai_copilot_settings", JSON.stringify(settings));
  }, [settings]);

  // Convert slider values to tone description
  const getSliderToneDescription = () => {
    const parts = [];

    if (remixSliders.conversational > 70)
      parts.push("very casual and conversational");
    else if (remixSliders.conversational > 40)
      parts.push("friendly and personable");
    else parts.push("professional and formal");

    if (remixSliders.humor > 60) parts.push("with playful humor");
    else if (remixSliders.humor > 30) parts.push("with light wit");

    if (remixSliders.urgency > 70) parts.push("conveying urgency");
    else if (remixSliders.urgency > 40) parts.push("with purposeful energy");

    if (remixSliders.directness > 70)
      parts.push("being very direct and to the point");
    else if (remixSliders.directness < 30)
      parts.push("using a soft, gentle approach");

    return parts.join(", ");
  };

  // Generate AI suggestion
  const generateSuggestion = useCallback(async () => {
    setIsLoading(true);
    try {
      const toneDescription = getSliderToneDescription();

      const response = await fetch("/api/ai/suggest-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incomingMessage,
          leadName,
          propertyAddress,
          campaignType,
          previousMessages,
          provider: settings.provider,
          tone: settings.tone,
          // Include remix slider context
          remixContext: `Style: ${toneDescription}. Goal: Book an appointment or get them on a call.`,
          sliders: remixSliders,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setSuggestion(data);
      setRemixCount((prev) => prev + 1);

      // Start auto-reply countdown if enabled and confidence is high enough
      if (settings.enabled && data.confidence >= settings.minConfidence) {
        setAutoReplyCountdown(settings.delaySeconds);
      }
    } catch (error) {
      console.error("Failed to generate suggestion:", error);
      toast.error("Failed to generate AI suggestion");
    } finally {
      setIsLoading(false);
    }
  }, [
    incomingMessage,
    leadName,
    propertyAddress,
    campaignType,
    previousMessages,
    settings,
    remixSliders,
  ]);

  // Auto-generate on mount
  useEffect(() => {
    if (incomingMessage) {
      generateSuggestion();
    }
  }, [incomingMessage]);

  // Auto-reply countdown timer
  useEffect(() => {
    if (autoReplyCountdown === null || autoReplyCountdown <= 0) return;

    const timer = setTimeout(() => {
      if (autoReplyCountdown === 1) {
        // Send the reply
        handleSendReply();
        setAutoReplyCountdown(null);
      } else {
        setAutoReplyCountdown(autoReplyCountdown - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoReplyCountdown]);

  // Cancel auto-reply
  const cancelAutoReply = () => {
    setAutoReplyCountdown(null);
    toast.info("Auto-reply cancelled");
  };

  // Send the reply
  const handleSendReply = async () => {
    if (!suggestion?.suggestedReply) return;

    setIsSending(true);
    try {
      await onSendReply(suggestion.suggestedReply);
      toast.success("Reply sent!");
    } catch (error) {
      console.error("Failed to send reply:", error);
      toast.error("Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  // Magic Remix - regenerate with current slider values
  const handleRemix = () => {
    generateSuggestion();
    toast.info("Remixing with new style...");
  };

  // Get action button based on classification
  const getActionButton = () => {
    if (!suggestion) return null;

    switch (suggestion.classification.action) {
      case "escalate_to_call":
        return (
          <Button
            onClick={onPushToCallCenter}
            className="bg-green-600 hover:bg-green-700"
          >
            <Phone className="w-4 h-4 mr-2" />
            Push to Call Center
          </Button>
        );
      case "add_to_dnc":
        return (
          <Button variant="destructive" onClick={onAddToDnc}>
            <Ban className="w-4 h-4 mr-2" />
            Add to DNC
          </Button>
        );
      case "mark_cold":
        return (
          <Button variant="outline" onClick={onMarkCold}>
            <ThumbsDown className="w-4 h-4 mr-2" />
            Mark Cold
          </Button>
        );
      default:
        return null;
    }
  };

  // Intent and sentiment badges
  const getIntentBadge = () => {
    if (!suggestion) return null;

    const intentColors: Record<string, string> = {
      interested: "bg-green-500/20 text-green-400",
      question: "bg-blue-500/20 text-blue-400",
      opt_out: "bg-red-500/20 text-red-400",
      not_interested: "bg-gray-500/20 text-gray-400",
      wants_call: "bg-purple-500/20 text-purple-400",
      unknown: "bg-zinc-500/20 text-zinc-400",
    };

    return (
      <Badge
        className={cn(
          "text-xs",
          intentColors[suggestion.classification.intent] ||
            intentColors.unknown,
        )}
      >
        {suggestion.classification.intent.replace("_", " ")}
      </Badge>
    );
  };

  const getSentimentBadge = () => {
    if (!suggestion) return null;

    const sentimentColors: Record<string, string> = {
      positive: "bg-green-500/20 text-green-400",
      neutral: "bg-yellow-500/20 text-yellow-400",
      negative: "bg-red-500/20 text-red-400",
    };

    return (
      <Badge
        className={cn(
          "text-xs",
          sentimentColors[suggestion.classification.sentiment],
        )}
      >
        {suggestion.classification.sentiment}
      </Badge>
    );
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center"
          >
            <Bot className="w-4 h-4 text-indigo-400" />
          </motion.div>
          <div>
            <h3 className="font-medium text-zinc-100">AI Co-Pilot</h3>
            <p className="text-xs text-zinc-500">
              {suggestion?.provider
                ? `Powered by ${suggestion.provider}`
                : "Generating..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Classification badges */}
          {getIntentBadge()}
          {getSentimentBadge()}

          {/* Settings toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className={cn(showSettings && "bg-zinc-800")}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-zinc-800 overflow-hidden"
          >
            <div className="p-4 space-y-4 bg-zinc-800/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <Label>Auto-Reply Mode</Label>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(enabled) =>
                    setSettings({ ...settings, enabled })
                  }
                />
              </div>

              {settings.enabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-zinc-400">
                        Delay (seconds)
                      </Label>
                      <Select
                        value={String(settings.delaySeconds)}
                        onValueChange={(v) =>
                          setSettings({
                            ...settings,
                            delaySeconds: parseInt(v),
                          })
                        }
                      >
                        <SelectTrigger className="bg-zinc-900 border-zinc-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 sec</SelectItem>
                          <SelectItem value="30">30 sec</SelectItem>
                          <SelectItem value="60">1 min</SelectItem>
                          <SelectItem value="120">2 min</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-zinc-400">
                        Min Confidence
                      </Label>
                      <Select
                        value={String(settings.minConfidence)}
                        onValueChange={(v) =>
                          setSettings({
                            ...settings,
                            minConfidence: parseInt(v),
                          })
                        }
                      >
                        <SelectTrigger className="bg-zinc-900 border-zinc-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="70">70%</SelectItem>
                          <SelectItem value="80">80%</SelectItem>
                          <SelectItem value="85">85%</SelectItem>
                          <SelectItem value="90">90%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-zinc-400">
                        AI Provider
                      </Label>
                      <Select
                        value={settings.provider}
                        onValueChange={(v: "openai" | "anthropic") =>
                          setSettings({ ...settings, provider: v })
                        }
                      >
                        <SelectTrigger className="bg-zinc-900 border-zinc-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI GPT-4</SelectItem>
                          <SelectItem value="anthropic">Claude</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-zinc-400">Tone</Label>
                      <Select
                        value={settings.tone}
                        onValueChange={(
                          v: "friendly" | "professional" | "urgent" | "casual",
                        ) => setSettings({ ...settings, tone: v })}
                      >
                        <SelectTrigger className="bg-zinc-900 border-zinc-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="professional">
                            Professional
                          </SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incoming Message */}
      <div className="p-4 border-b border-zinc-800">
        <p className="text-xs text-zinc-500 mb-1">
          Incoming from {leadName || leadPhone}
        </p>
        <p className="text-zinc-200">{incomingMessage}</p>
      </div>

      {/* AI Suggestion */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            <span className="ml-2 text-zinc-400">Generating suggestion...</span>
          </div>
        ) : suggestion ? (
          <div className="space-y-4">
            {/* Confidence indicator */}
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-sm text-zinc-400">Suggested Reply</span>
              <Badge
                className={cn(
                  "text-xs",
                  suggestion.confidence >= 85
                    ? "bg-green-500/20 text-green-400"
                    : suggestion.confidence >= 70
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-red-500/20 text-red-400",
                )}
              >
                {suggestion.confidence}% confident
              </Badge>
              <span className="text-xs text-zinc-500">
                {suggestion.characterCount}/160 chars
              </span>
            </div>

            {/* Message content */}
            <motion.div
              key={remixCount}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700"
            >
              <p className="text-zinc-100 text-lg">
                {suggestion.suggestedReply}
              </p>
            </motion.div>

            {/* Magic Remix Panel */}
            <AnimatePresence>
              {showRemix && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-4 p-4 bg-gradient-to-br from-purple-900/20 to-indigo-900/20 rounded-lg border border-purple-500/30"
                >
                  <div className="flex items-center gap-2 text-purple-400">
                    <Wand2 className="w-4 h-4" />
                    <span className="font-medium">Magic Remix</span>
                  </div>

                  {/* Conversational Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-zinc-400" />
                        <span className="text-zinc-400">Formal</span>
                      </div>
                      <span className="text-zinc-400">Casual</span>
                    </div>
                    <Slider
                      value={[remixSliders.conversational]}
                      onValueChange={([v]) =>
                        setRemixSliders({ ...remixSliders, conversational: v })
                      }
                      max={100}
                      step={10}
                      className="[&_[role=slider]]:bg-purple-500"
                    />
                  </div>

                  {/* Humor Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Smile className="w-4 h-4 text-zinc-400" />
                        <span className="text-zinc-400">Serious</span>
                      </div>
                      <span className="text-zinc-400">Playful</span>
                    </div>
                    <Slider
                      value={[remixSliders.humor]}
                      onValueChange={([v]) =>
                        setRemixSliders({ ...remixSliders, humor: v })
                      }
                      max={100}
                      step={10}
                      className="[&_[role=slider]]:bg-yellow-500"
                    />
                  </div>

                  {/* Urgency Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-zinc-400" />
                        <span className="text-zinc-400">Relaxed</span>
                      </div>
                      <span className="text-zinc-400">Urgent</span>
                    </div>
                    <Slider
                      value={[remixSliders.urgency]}
                      onValueChange={([v]) =>
                        setRemixSliders({ ...remixSliders, urgency: v })
                      }
                      max={100}
                      step={10}
                      className="[&_[role=slider]]:bg-orange-500"
                    />
                  </div>

                  {/* Directness Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-zinc-400" />
                        <span className="text-zinc-400">Soft</span>
                      </div>
                      <span className="text-zinc-400">Direct</span>
                    </div>
                    <Slider
                      value={[remixSliders.directness]}
                      onValueChange={([v]) =>
                        setRemixSliders({ ...remixSliders, directness: v })
                      }
                      max={100}
                      step={10}
                      className="[&_[role=slider]]:bg-green-500"
                    />
                  </div>

                  <Button
                    onClick={handleRemix}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4 mr-2" />
                    )}
                    Remix with These Settings
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Auto-reply countdown */}
            <AnimatePresence>
              {autoReplyCountdown !== null && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span className="text-amber-400">
                      Auto-sending in {autoReplyCountdown}s...
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelAutoReply}
                    className="text-amber-400 hover:text-amber-300"
                  >
                    Cancel
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={handleSendReply}
                disabled={isSending}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send Reply
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowRemix(!showRemix)}
                className={cn(
                  showRemix && "bg-purple-500/20 border-purple-500",
                )}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                {showRemix ? "Hide Remix" : "Magic Remix"}
              </Button>

              <Button
                variant="outline"
                onClick={handleRemix}
                disabled={isLoading}
              >
                <RefreshCw
                  className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")}
                />
                Quick Remix
              </Button>

              {/* Dynamic action button based on classification */}
              {getActionButton()}
            </div>

            {/* Quick feedback */}
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
              <span className="text-xs text-zinc-500">Was this helpful?</span>
              <Button variant="ghost" size="sm" className="h-7 px-2">
                <ThumbsUp className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2">
                <ThumbsDown className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-zinc-500">
            No suggestion available
          </div>
        )}
      </div>
    </div>
  );
}

export default AiCopilotReply;
