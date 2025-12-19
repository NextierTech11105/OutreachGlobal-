"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Bell,
  Clock,
  MessageSquare,
  Settings,
  Play,
  Pause,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Users,
  Zap,
  Timer,
  Target,
  TrendingUp,
  Edit,
  Trash2,
  Plus,
  Save,
} from "lucide-react";
import { toast } from "sonner";

// Nudge template type
interface NudgeTemplate {
  id: string;
  name: string;
  message: string;
  delay: number; // hours after no response
  isActive: boolean;
  sendCount: number;
  responseRate: number;
}

// Nudge sequence
interface NudgeSequence {
  id: string;
  name: string;
  description: string;
  thresholdHours: number;
  maxNudges: number;
  templates: string[];
  isActive: boolean;
  leadsInQueue: number;
  nudgesSent: number;
  responses: number;
}

// API response type
interface CathyStats {
  leadsInQueue: number;
  totalNudgesSent: number;
  totalResponses: number;
  responseRate: number;
  todayNudges: number;
  sequenceStats: Array<{
    context: string;
    nudgesSent: number;
    responses: number;
    responseRate: string;
  }>;
}

export function CathyNudger() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isGlobalActive, setIsGlobalActive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [apiStats, setApiStats] = useState<CathyStats | null>(null);

  // Fetch real stats from PostgreSQL
  useEffect(() => {
    async function fetchCathyStats() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/cathy/stats");
        const data = await response.json();

        if (data.success) {
          setApiStats(data.stats);

          // Update sequences with real data from API
          if (data.stats.sequenceStats && data.stats.sequenceStats.length > 0) {
            setSequences((prev) =>
              prev.map((seq) => {
                // Map sequence to campaign context
                const contextMap: Record<string, string> = {
                  "1": "follow_up",
                  "2": "retarget",
                  "3": "nurture",
                };
                const context = contextMap[seq.id];
                const apiSeq = data.stats.sequenceStats.find(
                  (s: { context: string }) => s.context === context,
                );

                if (apiSeq) {
                  return {
                    ...seq,
                    nudgesSent: apiSeq.nudgesSent,
                    responses: apiSeq.responses,
                    leadsInQueue: Math.round(data.stats.leadsInQueue / 3), // Distribute across sequences
                  };
                }
                return seq;
              }),
            );
          }
        }
      } catch (error) {
        console.error("Failed to fetch Cathy stats:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCathyStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchCathyStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Template definitions (structure - stats come from API)
  const [templates, setTemplates] = useState<NudgeTemplate[]>([
    {
      id: "1",
      name: "Gentle Reminder",
      message:
        "Hey {firstName}, just circling back on my last message. Still interested in chatting about {topic}?",
      delay: 24,
      isActive: true,
      sendCount: 0,
      responseRate: 0,
    },
    {
      id: "2",
      name: "Value Add",
      message:
        "Hi {firstName}, I found some info that might be helpful for your {businessType}. Want me to share?",
      delay: 48,
      isActive: true,
      sendCount: 0,
      responseRate: 0,
    },
    {
      id: "3",
      name: "Final Check",
      message:
        "{firstName}, I don't want to be a pest! Should I close your file, or is there a better time to connect?",
      delay: 72,
      isActive: true,
      sendCount: 0,
      responseRate: 0,
    },
    {
      id: "4",
      name: "Breakup Message",
      message:
        "Hey {firstName}, I'll assume the timing isn't right. Feel free to reach out if things change. Best of luck!",
      delay: 120,
      isActive: false,
      sendCount: 0,
      responseRate: 0,
    },
  ]);

  // Sequence definitions (structure - stats updated from API)
  const [sequences, setSequences] = useState<NudgeSequence[]>([
    {
      id: "1",
      name: "Standard Follow-up",
      description: "3-touch sequence for initial non-responders",
      thresholdHours: 24,
      maxNudges: 3,
      templates: ["1", "2", "3"],
      isActive: true,
      leadsInQueue: 0,
      nudgesSent: 0,
      responses: 0,
    },
    {
      id: "2",
      name: "Hot Lead Revival",
      description: "Aggressive follow-up for qualified leads gone cold",
      thresholdHours: 12,
      maxNudges: 4,
      templates: ["1", "2", "3", "4"],
      isActive: true,
      leadsInQueue: 0,
      nudgesSent: 0,
      responses: 0,
    },
    {
      id: "3",
      name: "Nurture Drip",
      description: "Slow-burn for long-term prospects",
      thresholdHours: 168, // 7 days
      maxNudges: 6,
      templates: ["2", "1", "2", "1", "3", "4"],
      isActive: false,
      leadsInQueue: 0,
      nudgesSent: 0,
      responses: 0,
    },
  ]);

  // Settings state
  const [settings, setSettings] = useState({
    defaultThresholdHours: 24,
    quietHoursStart: "21:00",
    quietHoursEnd: "09:00",
    maxDailyNudges: 500,
    respectOptOut: true,
    pauseOnResponse: true,
    resumeAfterDays: 7,
  });

  // Edit state
  const [editingTemplate, setEditingTemplate] = useState<NudgeTemplate | null>(
    null,
  );

  const toggleSequence = (id: string) => {
    setSequences((prev) =>
      prev.map((seq) =>
        seq.id === id ? { ...seq, isActive: !seq.isActive } : seq,
      ),
    );
    toast.success("Sequence updated");
  };

  const toggleTemplate = (id: string) => {
    setTemplates((prev) =>
      prev.map((tpl) =>
        tpl.id === id ? { ...tpl, isActive: !tpl.isActive } : tpl,
      ),
    );
  };

  // Stats - use real API data when available, fall back to computed values
  const totalInQueue =
    apiStats?.leadsInQueue ??
    sequences.reduce((sum, s) => sum + s.leadsInQueue, 0);
  const totalNudgesSent =
    apiStats?.totalNudgesSent ??
    sequences.reduce((sum, s) => sum + s.nudgesSent, 0);
  const totalResponses =
    apiStats?.totalResponses ??
    sequences.reduce((sum, s) => sum + s.responses, 0);
  const avgResponseRate =
    apiStats?.responseRate ??
    (totalNudgesSent > 0 ? (totalResponses / totalNudgesSent) * 100 : 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
            <Bell className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              Cathy
              <Badge className="bg-amber-600">The Nudger</Badge>
            </h2>
            <p className="text-zinc-400">
              Automated Follow-up • No Response Detection • Smart Sequences
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-lg border border-zinc-800">
            <span className="text-sm text-zinc-400">Global Nudger</span>
            <Switch
              checked={isGlobalActive}
              onCheckedChange={setIsGlobalActive}
            />
            <Badge className={isGlobalActive ? "bg-green-600" : "bg-zinc-600"}>
              {isGlobalActive ? "Active" : "Paused"}
            </Badge>
          </div>
          <Button className="bg-amber-600 hover:bg-amber-700">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-5 gap-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {totalInQueue.toLocaleString()}
                </p>
                <p className="text-xs text-zinc-500">In Nudge Queue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-amber-400" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {totalNudgesSent.toLocaleString()}
                </p>
                <p className="text-xs text-zinc-500">Nudges Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {totalResponses.toLocaleString()}
                </p>
                <p className="text-xs text-zinc-500">Responses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {avgResponseRate.toFixed(1)}%
                </p>
                <p className="text-xs text-zinc-500">Response Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Timer className="h-5 w-5 text-cyan-400" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {settings.defaultThresholdHours}h
                </p>
                <p className="text-xs text-zinc-500">Default Threshold</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger
            value="dashboard"
            className="data-[state=active]:bg-amber-600"
          >
            <Target className="h-4 w-4 mr-2" />
            Sequences
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="data-[state=active]:bg-orange-600"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="data-[state=active]:bg-zinc-600"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Sequences Tab */}
        <TabsContent value="dashboard" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-400" />
                  Nudge Sequences
                </CardTitle>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="h-4 w-4 mr-2" />
                  New Sequence
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sequences.map((seq) => (
                  <div
                    key={seq.id}
                    className={`p-4 rounded-lg border ${
                      seq.isActive
                        ? "bg-zinc-800/50 border-amber-600/30"
                        : "bg-zinc-900 border-zinc-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            seq.isActive ? "bg-amber-600/20" : "bg-zinc-800"
                          }`}
                        >
                          {seq.isActive ? (
                            <Play className="h-4 w-4 text-amber-400" />
                          ) : (
                            <Pause className="h-4 w-4 text-zinc-500" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{seq.name}</h4>
                          <p className="text-sm text-zinc-500">
                            {seq.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-zinc-700 text-zinc-400"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {seq.thresholdHours}h threshold
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-zinc-700 text-zinc-400"
                        >
                          {seq.maxNudges} max nudges
                        </Badge>
                        <Switch
                          checked={seq.isActive}
                          onCheckedChange={() => toggleSequence(seq.id)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mt-3">
                      <div className="text-center p-2 bg-zinc-800 rounded">
                        <p className="text-lg font-semibold text-white">
                          {seq.leadsInQueue}
                        </p>
                        <p className="text-xs text-zinc-500">In Queue</p>
                      </div>
                      <div className="text-center p-2 bg-zinc-800 rounded">
                        <p className="text-lg font-semibold text-white">
                          {seq.nudgesSent}
                        </p>
                        <p className="text-xs text-zinc-500">Sent</p>
                      </div>
                      <div className="text-center p-2 bg-zinc-800 rounded">
                        <p className="text-lg font-semibold text-white">
                          {seq.responses}
                        </p>
                        <p className="text-xs text-zinc-500">Responses</p>
                      </div>
                      <div className="text-center p-2 bg-zinc-800 rounded">
                        <p className="text-lg font-semibold text-green-400">
                          {seq.nudgesSent > 0
                            ? ((seq.responses / seq.nudgesSent) * 100).toFixed(
                                1,
                              )
                            : 0}
                          %
                        </p>
                        <p className="text-xs text-zinc-500">Response Rate</p>
                      </div>
                    </div>

                    {/* Template sequence visualization */}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-zinc-500">Sequence:</span>
                      {seq.templates.map((tplId, idx) => {
                        const tpl = templates.find((t) => t.id === tplId);
                        return (
                          <div key={idx} className="flex items-center gap-1">
                            <Badge
                              variant="outline"
                              className="text-xs border-zinc-700 text-zinc-400"
                            >
                              {idx + 1}. {tpl?.name || "Unknown"}
                            </Badge>
                            {idx < seq.templates.length - 1 && (
                              <span className="text-zinc-600">→</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-orange-400" />
                  Nudge Templates
                </CardTitle>
                <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </div>
              <CardDescription className="text-zinc-500">
                Variables: {"{firstName}"}, {"{lastName}"}, {"{company}"},{" "}
                {"{topic}"}, {"{businessType}"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className={`p-4 rounded-lg border ${
                      tpl.isActive
                        ? "bg-zinc-800/50 border-orange-600/30"
                        : "bg-zinc-900 border-zinc-800 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium text-white">{tpl.name}</h4>
                        <Badge
                          variant="outline"
                          className="border-zinc-700 text-zinc-400"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          After {tpl.delay}h
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-zinc-400"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Switch
                          checked={tpl.isActive}
                          onCheckedChange={() => toggleTemplate(tpl.id)}
                        />
                      </div>
                    </div>

                    <p className="text-sm text-zinc-400 bg-zinc-800 p-3 rounded mb-3 font-mono">
                      {tpl.message}
                    </p>

                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-zinc-500">
                        <MessageSquare className="h-3 w-3 inline mr-1" />
                        {tpl.sendCount.toLocaleString()} sent
                      </span>
                      <span className="text-green-400">
                        <TrendingUp className="h-3 w-3 inline mr-1" />
                        {tpl.responseRate}% response rate
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">
                  Timing Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-zinc-400">
                    Default Threshold (hours)
                  </Label>
                  <Input
                    type="number"
                    value={settings.defaultThresholdHours}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        defaultThresholdHours: parseInt(e.target.value),
                      })
                    }
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Time to wait before sending first nudge
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-zinc-400">Quiet Hours Start</Label>
                    <Input
                      type="time"
                      value={settings.quietHoursStart}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          quietHoursStart: e.target.value,
                        })
                      }
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400">Quiet Hours End</Label>
                    <Input
                      type="time"
                      value={settings.quietHoursEnd}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          quietHoursEnd: e.target.value,
                        })
                      }
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-zinc-400">Max Daily Nudges</Label>
                  <Input
                    type="number"
                    value={settings.maxDailyNudges}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        maxDailyNudges: parseInt(e.target.value),
                      })
                    }
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">
                  Behavior Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Respect Opt-Outs</p>
                    <p className="text-xs text-zinc-500">
                      Never nudge opted-out contacts
                    </p>
                  </div>
                  <Switch
                    checked={settings.respectOptOut}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, respectOptOut: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Pause on Response</p>
                    <p className="text-xs text-zinc-500">
                      Stop sequence when contact replies
                    </p>
                  </div>
                  <Switch
                    checked={settings.pauseOnResponse}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, pauseOnResponse: checked })
                    }
                  />
                </div>

                <div>
                  <Label className="text-zinc-400">Resume After (days)</Label>
                  <Input
                    type="number"
                    value={settings.resumeAfterDays}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        resumeAfterDays: parseInt(e.target.value),
                      })
                    }
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Days to wait before restarting sequence after response
                  </p>
                </div>

                <Button className="w-full bg-amber-600 hover:bg-amber-700 mt-4">
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
