"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Brain,
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
  User,
  AlertCircle,
  X,
  Play,
  Pause,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface GiannaSettings {
  mode: "human-in-loop" | "full-auto";
  autoReplyDelay: number; // in minutes
  minConfidence: number;
  defaultTone: string;
  enabledCategories: string[];
  businessHoursOnly: boolean;
  businessHoursStart: string;
  businessHoursEnd: string;
  maxAutoRepliesPerDay: number;
  notifyOnAutoReply: boolean;
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

interface GiannaResponseHandlerProps {
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

export function GiannaResponseHandler({
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
}: GiannaResponseHandlerProps) {
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedReply, setEditedReply] = useState("");
  const [autoCountdown, setAutoCountdown] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Load Gianna settings
  const [settings, setSettings] = useState<GiannaSettings>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("gianna_settings");
      if (saved) return JSON.parse(saved);
    }
    return {
      mode: "human-in-loop",
      autoReplyDelay: 5,
      minConfidence: 85,
      defaultTone: "friendly",
      enabledCategories: ["interested", "question", "scheduling"],
      businessHoursOnly: true,
      businessHoursStart: "09:00",
      businessHoursEnd: "18:00",
      maxAutoRepliesPerDay: 100,
      notifyOnAutoReply: true,
    };
  });

  // Check if within business hours
  const isWithinBusinessHours = useCallback(() => {
    if (!settings.businessHoursOnly) return true;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMin] = settings.businessHoursStart.split(":").map(Number);
    const [endHour, endMin] = settings.businessHoursEnd.split(":").map(Number);
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    return currentTime >= startTime && currentTime <= endTime;
  }, [settings]);

  // Generate AI suggestion
  const generateSuggestion = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load training data
      let trainingData: Array<{ incomingMessage: string; idealResponse: string }> = [];
      const savedTraining = localStorage.getItem("gianna_training_data");
      if (savedTraining) {
        trainingData = JSON.parse(savedTraining);
      }

      const response = await fetch("/api/ai/suggest-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incomingMessage,
          leadName,
          propertyAddress,
          campaignType,
          previousMessages,
          tone: settings.defaultTone,
          trainingData, // Include training data for better responses
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setSuggestion(data);
      setEditedReply(data.suggestedReply);

      // Start auto-reply countdown if in full-auto mode
      if (
        settings.mode === "full-auto" &&
        data.confidence >= settings.minConfidence &&
        isWithinBusinessHours() &&
        settings.enabledCategories.includes(data.classification.intent)
      ) {
        startAutoCountdown();
      }
    } catch (error) {
      console.error("Failed to generate suggestion:", error);
      toast.error("Failed to generate AI suggestion");
    } finally {
      setIsLoading(false);
    }
  }, [incomingMessage, leadName, propertyAddress, campaignType, previousMessages, settings, isWithinBusinessHours]);

  // Auto-countdown management
  const startAutoCountdown = useCallback(() => {
    setAutoCountdown(settings.autoReplyDelay * 60); // Convert minutes to seconds
    setIsPaused(false);
  }, [settings.autoReplyDelay]);

  const pauseCountdown = () => {
    setIsPaused(true);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const resumeCountdown = () => {
    setIsPaused(false);
  };

  const cancelCountdown = () => {
    setAutoCountdown(null);
    setIsPaused(false);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    toast.info("Auto-reply cancelled");
  };

  // Handle countdown timer
  useEffect(() => {
    if (autoCountdown === null || isPaused) return;

    if (autoCountdown <= 0) {
      // Time's up - send the reply
      handleSendReply();
      setAutoCountdown(null);
      if (settings.notifyOnAutoReply) {
        toast.success(`Gianna auto-sent reply to ${leadName || leadPhone}`);
      }
      return;
    }

    countdownRef.current = setTimeout(() => {
      setAutoCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, [autoCountdown, isPaused]);

  // Auto-generate on mount
  useEffect(() => {
    if (incomingMessage) {
      generateSuggestion();
    }
  }, []);

  // Send the reply
  const handleSendReply = async () => {
    const messageToSend = isEditing ? editedReply : suggestion?.suggestedReply;
    if (!messageToSend) return;

    setIsSending(true);
    try {
      await onSendReply(messageToSend);
      setAutoCountdown(null);
      toast.success("Reply sent!");
    } catch (error) {
      console.error("Failed to send reply:", error);
      toast.error("Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  // Format countdown time
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get intent badge color
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
      <Badge className={cn("text-xs", intentColors[suggestion.classification.intent] || intentColors.unknown)}>
        {suggestion.classification.intent.replace("_", " ")}
      </Badge>
    );
  };

  // Toggle mode
  const toggleMode = () => {
    const newMode = settings.mode === "human-in-loop" ? "full-auto" : "human-in-loop";
    const newSettings = { ...settings, mode: newMode };
    setSettings(newSettings);
    localStorage.setItem("gianna_settings", JSON.stringify(newSettings));

    if (newMode === "full-auto" && suggestion && suggestion.confidence >= settings.minConfidence) {
      startAutoCountdown();
    } else {
      cancelCountdown();
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-purple-500/20">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center"
          >
            <Brain className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <h3 className="font-medium text-zinc-100 flex items-center gap-2">
              Gianna
              <Sparkles className="w-4 h-4 text-purple-400" />
            </h3>
            <p className="text-xs text-zinc-400">
              {settings.mode === "human-in-loop" ? "Suggests • You Approve" : "Auto-Reply Active"}
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-3">
          {getIntentBadge()}
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-zinc-400" />
            <Switch
              checked={settings.mode === "full-auto"}
              onCheckedChange={toggleMode}
            />
            <Zap className={cn("w-4 h-4", settings.mode === "full-auto" ? "text-yellow-400" : "text-zinc-400")} />
          </div>
        </div>
      </div>

      {/* Incoming Message */}
      <div className="p-4 border-b border-purple-500/20 bg-black/20">
        <p className="text-xs text-zinc-500 mb-1">From {leadName || leadPhone}</p>
        <p className="text-zinc-200">{incomingMessage}</p>
      </div>

      {/* Gianna's Suggestion */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            <span className="ml-2 text-zinc-400">Gianna is thinking...</span>
          </div>
        ) : suggestion ? (
          <div className="space-y-4">
            {/* Confidence & Stats */}
            <div className="flex items-center gap-3">
              <Badge
                className={cn(
                  "text-xs",
                  suggestion.confidence >= 85
                    ? "bg-green-500/20 text-green-400"
                    : suggestion.confidence >= 70
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-red-500/20 text-red-400"
                )}
              >
                {suggestion.confidence}% confident
              </Badge>
              <span className="text-xs text-zinc-500">
                {suggestion.characterCount}/160 chars
              </span>
              {!suggestion.isShortEnough && (
                <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400/50">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Too long for SMS
                </Badge>
              )}
            </div>

            {/* Reply Content */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative"
            >
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editedReply}
                    onChange={(e) => setEditedReply(e.target.value)}
                    rows={3}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      {editedReply.length}/160 chars
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setEditedReply(suggestion.suggestedReply);
                        }}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setIsEditing(false)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Done
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 group">
                  <p className="text-zinc-100 text-lg pr-8">
                    {editedReply || suggestion.suggestedReply}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </motion.div>

            {/* Auto-Reply Countdown */}
            <AnimatePresence>
              {autoCountdown !== null && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <Clock className="w-5 h-5 text-purple-400" />
                    </motion.div>
                    <div>
                      <p className="text-purple-400 font-medium">
                        Auto-sending in {formatCountdown(autoCountdown)}
                      </p>
                      <p className="text-xs text-purple-300/70">
                        Gianna will send this reply automatically
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={isPaused ? resumeCountdown : pauseCountdown}
                      className="text-purple-400 hover:text-purple-300"
                    >
                      {isPaused ? (
                        <>
                          <Play className="w-4 h-4 mr-1" />
                          Resume
                        </>
                      ) : (
                        <>
                          <Pause className="w-4 h-4 mr-1" />
                          Pause
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelCountdown}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Not in business hours warning */}
            {settings.mode === "full-auto" && !isWithinBusinessHours() && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <p className="text-sm text-yellow-400">
                  Outside business hours ({settings.businessHoursStart} - {settings.businessHoursEnd}).
                  Auto-reply paused.
                </p>
              </div>
            )}

            {/* Action Buttons */}
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
                {settings.mode === "human-in-loop" ? "Approve & Send" : "Send Now"}
              </Button>

              <Button
                variant="outline"
                onClick={generateSuggestion}
                disabled={isLoading}
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                Regenerate
              </Button>

              {/* Dynamic action based on classification */}
              {suggestion.classification.action === "escalate_to_call" && (
                <Button
                  onClick={onPushToCallCenter}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Push to Call
                </Button>
              )}

              {suggestion.classification.action === "add_to_dnc" && (
                <Button
                  variant="destructive"
                  onClick={onAddToDnc}
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Add to DNC
                </Button>
              )}

              {suggestion.classification.action === "mark_cold" && (
                <Button
                  variant="outline"
                  onClick={onMarkCold}
                >
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  Mark Cold
                </Button>
              )}
            </div>

            {/* Feedback */}
            <div className="flex items-center gap-2 pt-2 border-t border-purple-500/20">
              <span className="text-xs text-zinc-500">Rate Gianna's response:</span>
              <Button variant="ghost" size="sm" className="h-7 px-2 hover:bg-green-500/20">
                <ThumbsUp className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 hover:bg-red-500/20">
                <ThumbsDown className="w-3 h-3" />
              </Button>
              <a
                href="/t/thomas-borrusos-team-f43716/ai-training"
                className="text-xs text-purple-400 hover:text-purple-300 ml-auto"
              >
                Train Gianna →
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-zinc-500">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No suggestion available</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default GiannaResponseHandler;
