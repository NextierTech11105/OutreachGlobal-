"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2,
  Send,
  Loader2,
  MessageCircle,
  Smile,
  Flame,
  Target,
  Calendar,
  Phone,
  HelpCircle,
  DollarSign,
  Hand,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  Settings,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CampaignSmsConfiguratorProps {
  recipientCount: number;
  campaignType?: "real_estate" | "b2b" | "financial" | "default";
  leadType?: string;
  onSendSms: (message: string) => Promise<void>;
  onClose: () => void;
  sendProgress?: { sent: number; failed: number; total: number } | null;
  isSending?: boolean;
}

// Tone sliders
interface ToneSliders {
  conversational: number;
  humor: number;
  urgency: number;
  directness: number;
}

// Intent options
type IntentType = "book_appointment" | "get_callback" | "qualify_lead" | "make_offer" | "soft_intro";

const INTENT_OPTIONS: Array<{
  id: IntentType;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    id: "book_appointment",
    label: "Book Appointment",
    description: "Schedule a meeting",
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    id: "get_callback",
    label: "Get Callback",
    description: "They call you",
    icon: <Phone className="h-4 w-4" />,
  },
  {
    id: "qualify_lead",
    label: "Qualify Lead",
    description: "Gauge interest",
    icon: <HelpCircle className="h-4 w-4" />,
  },
  {
    id: "make_offer",
    label: "Make Offer",
    description: "Cash offer inquiry",
    icon: <DollarSign className="h-4 w-4" />,
  },
  {
    id: "soft_intro",
    label: "Soft Intro",
    description: "Just say hello",
    icon: <Hand className="h-4 w-4" />,
  },
];

// Quick template presets
const TONE_PRESETS: Array<{
  name: string;
  sliders: ToneSliders;
  intent: IntentType;
}> = [
  {
    name: "Friendly Pro",
    sliders: { conversational: 60, humor: 20, urgency: 40, directness: 50 },
    intent: "book_appointment",
  },
  {
    name: "Urgent Cash",
    sliders: { conversational: 40, humor: 0, urgency: 80, directness: 80 },
    intent: "make_offer",
  },
  {
    name: "Casual Chat",
    sliders: { conversational: 90, humor: 40, urgency: 20, directness: 30 },
    intent: "soft_intro",
  },
  {
    name: "Business Direct",
    sliders: { conversational: 30, humor: 0, urgency: 50, directness: 90 },
    intent: "qualify_lead",
  },
];

interface GeneratedMessage {
  id: number;
  message: string;
  characterCount: number;
  isShortEnough: boolean;
  toneMatch: number;
}

export function CampaignSmsConfigurator({
  recipientCount,
  campaignType = "real_estate",
  leadType,
  onSendSms,
  onClose,
  sendProgress,
  isSending = false,
}: CampaignSmsConfiguratorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState("");
  const [generatedMessages, setGeneratedMessages] = useState<GeneratedMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [provider, setProvider] = useState<"openai" | "anthropic">("openai");

  // Tone configuration
  const [sliders, setSliders] = useState<ToneSliders>({
    conversational: 60,
    humor: 20,
    urgency: 40,
    directness: 50,
  });

  // Intent selection
  const [intent, setIntent] = useState<IntentType>("book_appointment");

  // Load saved settings
  useEffect(() => {
    const saved = localStorage.getItem("campaign_sms_settings");
    if (saved) {
      try {
        const { sliders: s, intent: i, provider: p } = JSON.parse(saved);
        if (s) setSliders(s);
        if (i) setIntent(i);
        if (p) setProvider(p);
      } catch {}
    }
  }, []);

  // Save settings
  useEffect(() => {
    localStorage.setItem(
      "campaign_sms_settings",
      JSON.stringify({ sliders, intent, provider })
    );
  }, [sliders, intent, provider]);

  // Generate AI messages
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-campaign-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sliders,
          intent,
          campaignType,
          leadType,
          provider,
          variations: 3,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setGeneratedMessages(data.messages);
      if (data.messages.length > 0) {
        setSelectedMessage(data.messages[0].message);
      }

      toast.success(`Generated ${data.messages.length} message variations`);
    } catch (error) {
      console.error("Generation failed:", error);
      toast.error("Failed to generate messages");
    } finally {
      setIsGenerating(false);
    }
  };

  // Apply preset
  const applyPreset = (preset: typeof TONE_PRESETS[0]) => {
    setSliders(preset.sliders);
    setIntent(preset.intent);
    toast.info(`Applied "${preset.name}" preset`);
  };

  // Handle send
  const handleSend = async () => {
    if (!selectedMessage.trim()) {
      toast.error("Enter or generate a message first");
      return;
    }
    await onSendSms(selectedMessage);
  };

  // Get slider label
  const getSliderLabel = (value: number, low: string, high: string): string => {
    if (value < 30) return low;
    if (value > 70) return high;
    return "Balanced";
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-purple-500" />
          <span className="font-medium">AI Campaign SMS</span>
        </div>
        <Badge variant="outline">
          {recipientCount} recipient{recipientCount !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Quick Presets */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Quick Presets</Label>
        <div className="flex flex-wrap gap-2">
          {TONE_PRESETS.map((preset) => (
            <Button
              key={preset.name}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset)}
              className="text-xs"
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Intent Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4" />
          Primary Goal
        </Label>
        <RadioGroup
          value={intent}
          onValueChange={(v) => setIntent(v as IntentType)}
          className="grid grid-cols-2 sm:grid-cols-3 gap-2"
        >
          {INTENT_OPTIONS.map((option) => (
            <div key={option.id}>
              <RadioGroupItem
                value={option.id}
                id={option.id}
                className="peer sr-only"
              />
              <Label
                htmlFor={option.id}
                className={cn(
                  "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-all",
                  intent === option.id && "border-primary bg-primary/5"
                )}
              >
                <div className={cn("mb-1", intent === option.id ? "text-primary" : "text-muted-foreground")}>
                  {option.icon}
                </div>
                <span className="text-xs font-medium">{option.label}</span>
                <span className="text-[10px] text-muted-foreground">
                  {option.description}
                </span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Advanced Settings Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full justify-between"
      >
        <span className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Tone Settings
        </span>
        {showAdvanced ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>

      {/* Tone Sliders - Collapsible */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <div className="p-4 rounded-lg border bg-muted/30 space-y-5">
              {/* Conversational Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-purple-500" />
                    <span>Formal</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {getSliderLabel(sliders.conversational, "Formal", "Casual")}
                  </Badge>
                  <span>Casual</span>
                </div>
                <Slider
                  value={[sliders.conversational]}
                  onValueChange={([v]) => setSliders({ ...sliders, conversational: v })}
                  max={100}
                  step={10}
                  className="[&_[role=slider]]:bg-purple-500"
                />
              </div>

              {/* Humor Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Smile className="h-4 w-4 text-yellow-500" />
                    <span>Serious</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {getSliderLabel(sliders.humor, "Serious", "Playful")}
                  </Badge>
                  <span>Playful</span>
                </div>
                <Slider
                  value={[sliders.humor]}
                  onValueChange={([v]) => setSliders({ ...sliders, humor: v })}
                  max={100}
                  step={10}
                  className="[&_[role=slider]]:bg-yellow-500"
                />
              </div>

              {/* Urgency Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span>Relaxed</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {getSliderLabel(sliders.urgency, "Relaxed", "Urgent")}
                  </Badge>
                  <span>Urgent</span>
                </div>
                <Slider
                  value={[sliders.urgency]}
                  onValueChange={([v]) => setSliders({ ...sliders, urgency: v })}
                  max={100}
                  step={10}
                  className="[&_[role=slider]]:bg-orange-500"
                />
              </div>

              {/* Directness Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-500" />
                    <span>Soft</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {getSliderLabel(sliders.directness, "Soft", "Direct")}
                  </Badge>
                  <span>Direct</span>
                </div>
                <Slider
                  value={[sliders.directness]}
                  onValueChange={([v]) => setSliders({ ...sliders, directness: v })}
                  max={100}
                  step={10}
                  className="[&_[role=slider]]:bg-green-500"
                />
              </div>

              {/* Provider Selection */}
              <div className="flex items-center justify-between pt-2 border-t">
                <Label className="text-sm">AI Provider</Label>
                <Select value={provider} onValueChange={(v: "openai" | "anthropic") => setProvider(v)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">GPT-4</SelectItem>
                    <SelectItem value="anthropic">Claude</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate AI Messages
          </>
        )}
      </Button>

      {/* Generated Messages */}
      {generatedMessages.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Select a Message</Label>
          <div className="space-y-2">
            {generatedMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: msg.id * 0.1 }}
                onClick={() => setSelectedMessage(msg.message)}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-all",
                  selectedMessage === msg.message
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-muted hover:border-primary/50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm flex-1">{msg.message}</p>
                  {selectedMessage === msg.message && (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    variant={msg.isShortEnough ? "secondary" : "destructive"}
                    className="text-xs"
                  >
                    {msg.characterCount}/160
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {msg.toneMatch}% match
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Regenerate button */}
          <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isGenerating && "animate-spin")} />
            Regenerate
          </Button>
        </div>
      )}

      {/* Manual Message Input */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Your Message</Label>
        <Textarea
          value={selectedMessage}
          onChange={(e) => setSelectedMessage(e.target.value)}
          placeholder="Type your message or generate one above..."
          className="min-h-[100px]"
          maxLength={160}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{selectedMessage.length}/160 characters</span>
          <span className="text-amber-600">Reply STOP added automatically</span>
        </div>
      </div>

      {/* Send Progress */}
      {sendProgress && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Sending Progress</span>
            {sendProgress.sent === sendProgress.total && (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            )}
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{sendProgress.sent}</div>
              <div className="text-xs text-muted-foreground">Sent</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{sendProgress.failed}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{sendProgress.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose} disabled={isSending} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          disabled={isSending || !selectedMessage.trim()}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send to {recipientCount}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default CampaignSmsConfigurator;
