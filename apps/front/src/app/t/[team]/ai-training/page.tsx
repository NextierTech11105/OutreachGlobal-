"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Brain,
  Plus,
  Trash2,
  Save,
  TestTube,
  Settings,
  Sparkles,
  MessageSquare,
  User,
  Clock,
  Zap,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Check,
  X,
  Edit3,
  Upload,
  Download,
  Copy,
  Loader2,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GiannaPhonePool } from "@/components/gianna-phone-pool";

// Training data types
interface TrainingExample {
  id: string;
  category: string;
  incomingMessage: string;
  idealResponse: string;
  intent: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface GiannaSettings {
  mode: "human-in-loop" | "full-auto";
  autoReplyDelay: number; // in minutes
  minConfidence: number;
  defaultTone: "friendly" | "professional" | "casual" | "urgent";
  enabledCategories: string[];
  businessHoursOnly: boolean;
  businessHoursStart: string;
  businessHoursEnd: string;
  maxAutoRepliesPerDay: number;
  notifyOnAutoReply: boolean;
}

// Categories for training data
const CATEGORIES = [
  {
    value: "interested",
    label: "Interested / Hot Lead",
    color: "bg-green-500",
  },
  { value: "question", label: "Has Questions", color: "bg-blue-500" },
  { value: "objection", label: "Objection / Pushback", color: "bg-yellow-500" },
  {
    value: "pricing",
    label: "Price / Money Questions",
    color: "bg-purple-500",
  },
  { value: "scheduling", label: "Scheduling / Timing", color: "bg-indigo-500" },
  { value: "not_interested", label: "Not Interested", color: "bg-gray-500" },
  { value: "opt_out", label: "Opt-Out / DNC", color: "bg-red-500" },
  { value: "general", label: "General Conversation", color: "bg-cyan-500" },
];

const INTENTS = [
  "interested",
  "question",
  "objection",
  "opt_out",
  "not_interested",
  "wants_call",
  "scheduling",
  "pricing",
  "general",
];

// Starter training data for Nextier business broker deal sourcing - Tommy Borruso's scripts
// Gianna AI trained to be conversational, firm, likable - Stratton Oakmont methodologies
const STARTER_TRAINING_DATA: Omit<
  TrainingExample,
  "id" | "createdAt" | "updatedAt"
>[] = [
  // Interested / Hot Leads
  {
    category: "interested",
    incomingMessage: "Yeah I might be interested",
    idealResponse:
      "Perfect! Most owners I talk to don't know what they're sitting on. I can get you a valuation this week. What's the best email?",
    intent: "interested",
    notes: "Hot lead - get email, schedule valuation call",
  },
  {
    category: "interested",
    incomingMessage: "Yes tell me more",
    idealResponse:
      "Great! I help owners understand what their business could actually sell for - no pressure, no commitment. Quick 15 min call work? What time's good?",
    intent: "interested",
  },
  {
    category: "interested",
    incomingMessage: "I've been thinking about selling",
    idealResponse:
      "Perfect timing! I can get you a full valuation so you know your real number. Most owners are surprised. Best email to send the details?",
    intent: "interested",
  },
  {
    category: "interested",
    incomingMessage: "What's the process?",
    idealResponse:
      "Simple - quick call to understand your business, I run a valuation, then we talk through what buyers would actually pay. No pressure. When works?",
    intent: "interested",
  },
  {
    category: "interested",
    incomingMessage: "I want to know what my business is worth",
    idealResponse:
      "That's exactly what I do! I can run your valuation this week - takes 15 mins. What's the best email to send you the details?",
    intent: "interested",
  },
  // Questions
  {
    category: "question",
    incomingMessage: "How much is my business worth?",
    idealResponse:
      "Depends on revenue, EBITDA, and your industry. I can get you a real number - free valuation takes 15 mins. Want me to run one?",
    intent: "pricing",
  },
  {
    category: "question",
    incomingMessage: "Is this legit?",
    idealResponse:
      "100% - I'm Tommy with Nextier. We help owners understand their exit value. No pressure, just clarity on what you're sitting on. Worth a quick chat?",
    intent: "question",
  },
  {
    category: "question",
    incomingMessage: "How did you find me?",
    idealResponse:
      "I research growing businesses in your industry - yours stood out. I have buyers looking for exactly this. Curious what your number would be?",
    intent: "question",
  },
  {
    category: "question",
    incomingMessage: "Are you a broker?",
    idealResponse:
      "I originate sellers - help owners figure out what they're really worth. No upfront cost, we only get paid when you do. Worth a quick chat?",
    intent: "question",
  },
  {
    category: "question",
    incomingMessage: "Do you have buyers?",
    idealResponse:
      "Yes - PE firms, family offices, and strategic acquirers actively looking. What's your revenue range? I can tell you if there's a fit",
    intent: "interested",
  },
  {
    category: "question",
    incomingMessage: "Who is this?",
    idealResponse:
      "Hey! Tommy with Nextier - I help business owners understand what they could actually sell for. Ever wondered what your number would be?",
    intent: "question",
  },
  // Pricing
  {
    category: "pricing",
    incomingMessage: "What's your fee?",
    idealResponse:
      "Success-based only - no upfront cost. We get paid when you get paid. Want me to walk you through it on a quick call?",
    intent: "pricing",
  },
  {
    category: "pricing",
    incomingMessage: "What multiple can I expect?",
    idealResponse:
      "Depends on your industry and margins - typically 3-6x EBITDA. I can get you a real number. Want me to run a valuation?",
    intent: "pricing",
  },
  {
    category: "pricing",
    incomingMessage: "What would buyers pay?",
    idealResponse:
      "Depends on a few things - revenue, EBITDA, growth. I can get you a snapshot of what buyers would actually offer. Best email?",
    intent: "pricing",
  },
  // Scheduling
  {
    category: "scheduling",
    incomingMessage: "Can you call me?",
    idealResponse: "Absolutely! Calling you now",
    intent: "wants_call",
    notes: "CALL IMMEDIATELY",
  },
  {
    category: "scheduling",
    incomingMessage: "Call me",
    idealResponse: "On it - calling you now!",
    intent: "wants_call",
    notes: "CALL IMMEDIATELY",
  },
  {
    category: "scheduling",
    incomingMessage: "Let's talk next week",
    idealResponse:
      "Perfect! Early or late in the week work better? I'll send a calendar invite",
    intent: "scheduling",
  },
  {
    category: "scheduling",
    incomingMessage: "I'm busy right now",
    idealResponse:
      "No problem! When's better - this week or next? I'm flexible",
    intent: "scheduling",
  },
  {
    category: "scheduling",
    incomingMessage: "Send me more info",
    idealResponse:
      "For sure! What's the best email? I'll send our overview and some recent deal examples",
    intent: "scheduling",
  },
  {
    category: "scheduling",
    incomingMessage: "What's your email?",
    idealResponse:
      "tommy@nextierllc.com - send me yours too and I'll shoot over the valuation details",
    intent: "scheduling",
  },
  // Objections
  {
    category: "objection",
    incomingMessage: "I'm not ready to sell yet",
    idealResponse:
      "Totally get it - most owners plan 2-3 years ahead. Want me to send market insights so you know what you're sitting on when the time comes?",
    intent: "not_interested",
  },
  {
    category: "objection",
    incomingMessage: "I'm already working with someone",
    idealResponse:
      "Nice! If you ever want a second opinion or that doesn't work out, keep my number. Good luck with the process!",
    intent: "not_interested",
  },
  {
    category: "objection",
    incomingMessage: "I don't think I can get what I want",
    idealResponse:
      "You might be surprised - market's strong for good businesses. Free valuation takes 15 mins, no obligation. Worth checking?",
    intent: "objection",
  },
  {
    category: "objection",
    incomingMessage: "I don't want my employees to know",
    idealResponse:
      "Totally understand - confidentiality is #1 for us. We use NDAs and only share with vetted, serious buyers. Want to discuss how we handle it?",
    intent: "objection",
  },
  {
    category: "objection",
    incomingMessage: "I need to think about it",
    idealResponse:
      "For sure! No pressure at all. If it helps, I can send you some info to review. Best email?",
    intent: "objection",
  },
  // Not Interested
  {
    category: "not_interested",
    incomingMessage: "Not interested",
    idealResponse:
      "No problem! If anything changes down the road, you have my number. Best of luck!",
    intent: "not_interested",
  },
  {
    category: "not_interested",
    incomingMessage: "No thanks",
    idealResponse: "Got it! Wishing you continued success",
    intent: "not_interested",
  },
  {
    category: "not_interested",
    incomingMessage: "I'm never selling",
    idealResponse:
      "Respect that! If you ever want a valuation just for planning, we're here. Take care!",
    intent: "not_interested",
  },
  {
    category: "not_interested",
    incomingMessage: "Not at this time",
    idealResponse:
      "All good! Mind if I check back in 6 months? Markets change, might be worth knowing your number then",
    intent: "not_interested",
  },
  // Opt-Out / DNC
  {
    category: "opt_out",
    incomingMessage: "Stop texting me",
    idealResponse: "Done - removing you now. Take care!",
    intent: "opt_out",
    notes: "Add to DNC immediately",
  },
  {
    category: "opt_out",
    incomingMessage: "Remove me from your list",
    idealResponse: "You're removed. Apologies for the outreach, take care!",
    intent: "opt_out",
    notes: "Add to DNC immediately",
  },
  {
    category: "opt_out",
    incomingMessage: "STOP",
    idealResponse: "Removed. Take care!",
    intent: "opt_out",
    notes: "Add to DNC immediately",
  },
  {
    category: "opt_out",
    incomingMessage: "Unsubscribe",
    idealResponse: "Done - you're off the list. Take care!",
    intent: "opt_out",
    notes: "Add to DNC immediately",
  },
  // General / Clarifying
  {
    category: "general",
    incomingMessage: "What company is this?",
    idealResponse:
      "Nextier - I'm Tommy. I help business owners understand what they could sell for. Your company caught my attention. Any interest in a quick valuation?",
    intent: "question",
  },
  {
    category: "general",
    incomingMessage: "How do you know about my business?",
    idealResponse:
      "I research growing companies in your industry - yours stood out. I have buyers actively looking. Curious what your number would be?",
    intent: "question",
  },
  {
    category: "general",
    incomingMessage: "What do you want?",
    idealResponse:
      "Just wanted to see if you've ever wondered what your business could sell for. I can get you a valuation - no pressure. Worth a chat?",
    intent: "question",
  },
  {
    category: "general",
    incomingMessage: "?",
    idealResponse:
      "Hey! Tommy with Nextier here. I help owners get valuations on their business. Curious if selling is something you've ever considered?",
    intent: "question",
  },
];

export default function AITrainingHubPage() {
  const [activeTab, setActiveTab] = useState("training");
  const [trainingData, setTrainingData] = useState<TrainingExample[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingExample, setEditingExample] = useState<TrainingExample | null>(
    null,
  );
  const [testMessage, setTestMessage] = useState("");
  const [testResult, setTestResult] = useState<{
    reply: string;
    confidence: number;
    matchedExample?: TrainingExample;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Form state for new/edit example
  const [formData, setFormData] = useState({
    category: "general",
    incomingMessage: "",
    idealResponse: "",
    intent: "general",
    notes: "",
  });

  // Gianna settings
  const [settings, setSettings] = useState<GiannaSettings>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("gianna_settings");
      if (saved) return JSON.parse(saved);
    }
    return {
      mode: "human-in-loop",
      autoReplyDelay: 5, // 5 minutes default
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

  // Load training data
  useEffect(() => {
    loadTrainingData();
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem("gianna_settings", JSON.stringify(settings));
  }, [settings]);

  const loadTrainingData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ai/training");
      if (response.ok) {
        const data = await response.json();
        setTrainingData(data.examples || []);
      }
    } catch (error) {
      console.error("Failed to load training data:", error);
      // Load from localStorage as fallback
      const saved = localStorage.getItem("gianna_training_data");
      if (saved) {
        setTrainingData(JSON.parse(saved));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveTrainingData = async (examples: TrainingExample[]) => {
    setIsSaving(true);
    try {
      // Save to API
      await fetch("/api/ai/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examples }),
      });

      // Also save to localStorage as backup
      localStorage.setItem("gianna_training_data", JSON.stringify(examples));

      setTrainingData(examples);
      toast.success("Training data saved!");
    } catch (error) {
      console.error("Failed to save training data:", error);
      // Still save to localStorage
      localStorage.setItem("gianna_training_data", JSON.stringify(examples));
      setTrainingData(examples);
      toast.success("Training data saved locally");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddExample = () => {
    if (!formData.incomingMessage || !formData.idealResponse) {
      toast.error("Both incoming message and ideal response are required");
      return;
    }

    const newExample: TrainingExample = {
      id:
        editingExample?.id ||
        `train-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category: formData.category,
      incomingMessage: formData.incomingMessage,
      idealResponse: formData.idealResponse,
      intent: formData.intent,
      notes: formData.notes,
      createdAt: editingExample?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let updated: TrainingExample[];
    if (editingExample) {
      updated = trainingData.map((ex) =>
        ex.id === editingExample.id ? newExample : ex,
      );
    } else {
      updated = [...trainingData, newExample];
    }

    saveTrainingData(updated);
    setShowAddDialog(false);
    setEditingExample(null);
    setFormData({
      category: "general",
      incomingMessage: "",
      idealResponse: "",
      intent: "general",
      notes: "",
    });
  };

  const handleDeleteExample = (id: string) => {
    const updated = trainingData.filter((ex) => ex.id !== id);
    saveTrainingData(updated);
    toast.success("Example deleted");
  };

  // Load starter pack with Tommy's Nextier scripts
  const handleLoadStarterPack = () => {
    const starterExamples: TrainingExample[] = STARTER_TRAINING_DATA.map(
      (item, index) => ({
        ...item,
        id: `starter-${Date.now()}-${index}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );

    // Merge with existing (don't duplicate)
    const existingMessages = new Set(
      trainingData.map((ex) => ex.incomingMessage.toLowerCase()),
    );
    const newExamples = starterExamples.filter(
      (ex) => !existingMessages.has(ex.incomingMessage.toLowerCase()),
    );

    if (newExamples.length === 0) {
      toast.info("All starter examples already loaded!");
      return;
    }

    const updated = [...trainingData, ...newExamples];
    saveTrainingData(updated);
    toast.success(`Loaded ${newExamples.length} Nextier scripts!`);
  };

  const handleEditExample = (example: TrainingExample) => {
    setEditingExample(example);
    setFormData({
      category: example.category,
      incomingMessage: example.incomingMessage,
      idealResponse: example.idealResponse,
      intent: example.intent,
      notes: example.notes || "",
    });
    setShowAddDialog(true);
  };

  const handleTestAI = async () => {
    if (!testMessage) {
      toast.error("Enter a test message");
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch("/api/ai/suggest-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incomingMessage: testMessage,
          campaignType: "real_estate",
          tone: settings.defaultTone,
          trainingData: trainingData, // Send training data for context
        }),
      });

      const data = await response.json();

      // Find closest matching training example
      const matchedExample = trainingData.find(
        (ex) =>
          testMessage
            .toLowerCase()
            .includes(ex.incomingMessage.toLowerCase().slice(0, 20)) ||
          ex.incomingMessage
            .toLowerCase()
            .includes(testMessage.toLowerCase().slice(0, 20)),
      );

      setTestResult({
        reply: data.suggestedReply || "No reply generated",
        confidence: data.confidence || 0,
        matchedExample,
      });
    } catch (error) {
      console.error("Test failed:", error);
      toast.error("Failed to test AI response");
    } finally {
      setIsTesting(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    if (!cat) return null;
    return (
      <Badge className={cn("text-white text-xs", cat.color)}>{cat.label}</Badge>
    );
  };

  const stats = {
    total: trainingData.length,
    byCategory: CATEGORIES.map((cat) => ({
      ...cat,
      count: trainingData.filter((ex) => ex.category === cat.value).length,
    })),
  };

  return (
    <>
      <TeamHeader title="Gianna AI Training Hub" />

      <div className="p-6">
        {/* Hero Section */}
        <Card className="mb-6 bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-purple-500/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center"
                >
                  <Brain className="w-8 h-8 text-white" />
                </motion.div>
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    Gianna
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </CardTitle>
                  <CardDescription className="text-base">
                    AI Response Handler • Your niece oversees the handling
                  </CardDescription>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-3">
                  <Label className="text-sm">
                    {settings.mode === "human-in-loop"
                      ? "Human-in-Loop"
                      : "Full Auto (5m delay)"}
                  </Label>
                  <Switch
                    checked={settings.mode === "full-auto"}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        mode: checked ? "full-auto" : "human-in-loop",
                      })
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {settings.mode === "human-in-loop"
                    ? "Gianna suggests, you approve"
                    : `Gianna auto-sends after ${settings.autoReplyDelay}min`}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <span className="text-sm">{stats.total} Training Examples</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm">
                  {settings.minConfidence}% Min Confidence
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-sm">
                  {settings.businessHoursOnly
                    ? `${settings.businessHoursStart} - ${settings.businessHoursEnd}`
                    : "24/7 Active"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="training" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Training Data
            </TabsTrigger>
            <TabsTrigger value="test" className="flex items-center gap-2">
              <TestTube className="w-4 h-4" />
              Test AI
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="phone-pool" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone Pool
            </TabsTrigger>
          </TabsList>

          {/* Training Data Tab */}
          <TabsContent value="training">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-medium">Training Examples</h3>
                <div className="flex gap-2 flex-wrap">
                  {stats.byCategory
                    .filter((c) => c.count > 0)
                    .map((cat) => (
                      <Badge
                        key={cat.value}
                        variant="outline"
                        className="text-xs"
                      >
                        {cat.label}: {cat.count}
                      </Badge>
                    ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Load Starter Pack Button */}
                <Button
                  variant="outline"
                  onClick={handleLoadStarterPack}
                  className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Load Nextier Scripts
                </Button>

                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => {
                        setEditingExample(null);
                        setFormData({
                          category: "general",
                          incomingMessage: "",
                          idealResponse: "",
                          intent: "general",
                          notes: "",
                        });
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Training Data
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingExample
                          ? "Edit Training Example"
                          : "Add Training Example"}
                      </DialogTitle>
                      <DialogDescription>
                        Teach Gianna how to respond to specific types of
                        messages.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select
                            value={formData.category}
                            onValueChange={(v) =>
                              setFormData({ ...formData, category: v })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Intent</Label>
                          <Select
                            value={formData.intent}
                            onValueChange={(v) =>
                              setFormData({ ...formData, intent: v })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {INTENTS.map((intent) => (
                                <SelectItem key={intent} value={intent}>
                                  {intent.replace("_", " ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Incoming Message (What the lead says)</Label>
                        <Textarea
                          placeholder="e.g., 'How much are you offering for my house?'"
                          value={formData.incomingMessage}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              incomingMessage: e.target.value,
                            })
                          }
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Ideal Response (What Gianna should reply)</Label>
                        <Textarea
                          placeholder="e.g., 'Great question! Every property is different - can we hop on a quick call so I can give you an accurate number?'"
                          value={formData.idealResponse}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              idealResponse: e.target.value,
                            })
                          }
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                          {formData.idealResponse.length}/160 characters (SMS
                          limit)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Notes (Optional)</Label>
                        <Input
                          placeholder="Any context or notes about this response"
                          value={formData.notes}
                          onChange={(e) =>
                            setFormData({ ...formData, notes: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowAddDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleAddExample}>
                        <Save className="w-4 h-4 mr-2" />
                        {editingExample ? "Update" : "Add"} Example
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : trainingData.length === 0 ? (
              <Card className="py-12">
                <div className="text-center">
                  <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Training Data Yet
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Start teaching Gianna how to respond to different messages.
                  </p>
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Example
                  </Button>
                </div>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Category</TableHead>
                      <TableHead>Incoming Message</TableHead>
                      <TableHead>Ideal Response</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trainingData.map((example) => (
                      <TableRow key={example.id}>
                        <TableCell>
                          {getCategoryBadge(example.category)}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="truncate">{example.incomingMessage}</p>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <p className="truncate">{example.idealResponse}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditExample(example)}
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteExample(example.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Test AI Tab */}
          <TabsContent value="test">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TestTube className="w-5 h-5" />
                    Test Gianna's Responses
                  </CardTitle>
                  <CardDescription>
                    Enter a sample message to see how Gianna would respond
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Simulate Incoming Message</Label>
                    <Textarea
                      placeholder="e.g., 'Yeah I might be interested. What's the process look like?'"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <Button
                    onClick={handleTestAI}
                    disabled={isTesting || !testMessage}
                    className="w-full"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Test AI Response
                      </>
                    )}
                  </Button>

                  {/* Quick test presets */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Quick Tests:
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Yeah I'm interested",
                        "How much?",
                        "Can you call me?",
                        "Not interested",
                        "Stop texting me",
                      ].map((preset) => (
                        <Button
                          key={preset}
                          variant="outline"
                          size="sm"
                          onClick={() => setTestMessage(preset)}
                        >
                          {preset}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5" />
                    Gianna's Response
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {testResult ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-lg">{testResult.reply}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        <Badge
                          className={cn(
                            testResult.confidence >= 85
                              ? "bg-green-500/20 text-green-400"
                              : testResult.confidence >= 70
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-red-500/20 text-red-400",
                          )}
                        >
                          {testResult.confidence}% confidence
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {testResult.reply.length}/160 chars
                        </span>
                      </div>

                      {testResult.matchedExample && (
                        <div className="p-3 border rounded-lg bg-purple-500/10 border-purple-500/30">
                          <p className="text-xs text-purple-400 mb-1">
                            Matched Training Example:
                          </p>
                          <p className="text-sm">
                            {testResult.matchedExample.idealResponse}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(testResult.reply);
                            toast.success("Copied to clipboard");
                          }}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Add to training data
                            setFormData({
                              category: "general",
                              incomingMessage: testMessage,
                              idealResponse: testResult.reply,
                              intent: "general",
                              notes: "Added from test",
                            });
                            setShowAddDialog(true);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add to Training
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Enter a test message to see Gianna's response</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Mode Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Response Mode</CardTitle>
                  <CardDescription>
                    Choose how Gianna handles incoming messages
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      className={cn(
                        "p-4 rounded-lg border-2 cursor-pointer transition-all",
                        settings.mode === "human-in-loop"
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-muted hover:border-muted-foreground",
                      )}
                      onClick={() =>
                        setSettings({ ...settings, mode: "human-in-loop" })
                      }
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-5 h-5" />
                        <span className="font-medium">Human-in-Loop</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Gianna suggests replies, you approve before sending
                      </p>
                    </div>

                    <div
                      className={cn(
                        "p-4 rounded-lg border-2 cursor-pointer transition-all",
                        settings.mode === "full-auto"
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-muted hover:border-muted-foreground",
                      )}
                      onClick={() =>
                        setSettings({ ...settings, mode: "full-auto" })
                      }
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-5 h-5" />
                        <span className="font-medium">Full Auto</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Gianna auto-sends after {settings.autoReplyDelay}min
                        delay
                      </p>
                    </div>
                  </div>

                  {settings.mode === "full-auto" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-4 p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="space-y-2">
                        <Label>Auto-Reply Delay (minutes)</Label>
                        <Select
                          value={String(settings.autoReplyDelay)}
                          onValueChange={(v) =>
                            setSettings({
                              ...settings,
                              autoReplyDelay: parseInt(v),
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 minute</SelectItem>
                            <SelectItem value="2">2 minutes</SelectItem>
                            <SelectItem value="5">5 minutes</SelectItem>
                            <SelectItem value="10">10 minutes</SelectItem>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Gianna waits this long before auto-sending, giving you
                          time to review
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Minimum Confidence for Auto-Reply</Label>
                        <Select
                          value={String(settings.minConfidence)}
                          onValueChange={(v) =>
                            setSettings({
                              ...settings,
                              minConfidence: parseInt(v),
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="70">
                              70% (More aggressive)
                            </SelectItem>
                            <SelectItem value="80">80% (Balanced)</SelectItem>
                            <SelectItem value="85">
                              85% (Recommended)
                            </SelectItem>
                            <SelectItem value="90">
                              90% (Conservative)
                            </SelectItem>
                            <SelectItem value="95">
                              95% (Very conservative)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Notify on Auto-Reply</Label>
                          <p className="text-xs text-muted-foreground">
                            Get notified when Gianna sends an auto-reply
                          </p>
                        </div>
                        <Switch
                          checked={settings.notifyOnAutoReply}
                          onCheckedChange={(checked) =>
                            setSettings({
                              ...settings,
                              notifyOnAutoReply: checked,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Max Auto-Replies Per Day</Label>
                        <Input
                          type="number"
                          value={settings.maxAutoRepliesPerDay}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              maxAutoRepliesPerDay:
                                parseInt(e.target.value) || 100,
                            })
                          }
                        />
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>

              {/* Business Hours & Tone */}
              <Card>
                <CardHeader>
                  <CardTitle>Business Hours & Tone</CardTitle>
                  <CardDescription>
                    Configure when and how Gianna responds
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Business Hours Only</Label>
                      <p className="text-xs text-muted-foreground">
                        Only auto-reply during business hours
                      </p>
                    </div>
                    <Switch
                      checked={settings.businessHoursOnly}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, businessHoursOnly: checked })
                      }
                    />
                  </div>

                  {settings.businessHoursOnly && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Input
                          type="time"
                          value={settings.businessHoursStart}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              businessHoursStart: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Time</Label>
                        <Input
                          type="time"
                          value={settings.businessHoursEnd}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              businessHoursEnd: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Default Tone</Label>
                    <Select
                      value={settings.defaultTone}
                      onValueChange={(v: typeof settings.defaultTone) =>
                        setSettings({ ...settings, defaultTone: v })
                      }
                    >
                      <SelectTrigger>
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

                  <div className="space-y-2">
                    <Label>Auto-Reply Categories</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Only auto-reply to these message types
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORIES.map((cat) => (
                        <div
                          key={cat.value}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded border cursor-pointer",
                            settings.enabledCategories.includes(cat.value)
                              ? "bg-muted border-primary"
                              : "border-muted",
                          )}
                          onClick={() => {
                            const enabled = settings.enabledCategories.includes(
                              cat.value,
                            );
                            setSettings({
                              ...settings,
                              enabledCategories: enabled
                                ? settings.enabledCategories.filter(
                                    (c) => c !== cat.value,
                                  )
                                : [...settings.enabledCategories, cat.value],
                            });
                          }}
                        >
                          <div
                            className={cn("w-3 h-3 rounded-full", cat.color)}
                          />
                          <span className="text-sm">{cat.label}</span>
                          {settings.enabledCategories.includes(cat.value) && (
                            <Check className="w-4 h-4 ml-auto text-primary" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Save indicator */}
            <div className="mt-6 flex items-center justify-end text-sm text-muted-foreground">
              <Check className="w-4 h-4 mr-2 text-green-500" />
              Settings auto-saved to your browser
            </div>
          </TabsContent>

          {/* Phone Pool Tab */}
          <TabsContent value="phone-pool">
            <GiannaPhonePool />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
