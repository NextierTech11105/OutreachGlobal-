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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  MessageSquare,
  Phone,
  Search,
  Calendar,
  Zap,
  Settings,
  Copy,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Import REAL personality DNA - NO MOCK DATA
import {
  DIGITAL_WORKERS,
  GIANNA,
  CATHY,
  SABRINA,
  NEVA,
  type DigitalWorkerId,
  type DigitalWorkerProfile,
} from "@/lib/ai-workers/digital-workers";

// Worker icons mapping
const WORKER_ICONS: Record<DigitalWorkerId, React.ReactNode> = {
  gianna: <MessageSquare className="h-5 w-5" />,
  cathy: <Phone className="h-5 w-5" />,
  sabrina: <Calendar className="h-5 w-5" />,
  neva: <Search className="h-5 w-5" />,
};

// Worker colors
const WORKER_COLORS: Record<DigitalWorkerId, string> = {
  gianna: "bg-blue-500",
  cathy: "bg-purple-500",
  sabrina: "bg-green-500",
  neva: "bg-orange-500",
};

interface WorkerState {
  isActive: boolean;
  autoResponse: boolean;
  humorLevel?: "mild" | "medium" | "spicy";
  customGreeting?: string;
}

export function DigitalWorkersManager() {
  const [selectedWorker, setSelectedWorker] = useState<DigitalWorkerId>("gianna");
  const [workerStates, setWorkerStates] = useState<Record<DigitalWorkerId, WorkerState>>({
    gianna: { isActive: true, autoResponse: true },
    cathy: { isActive: true, autoResponse: true, humorLevel: "medium" },
    sabrina: { isActive: true, autoResponse: false },
    neva: { isActive: true, autoResponse: false },
  });
  const { toast } = useToast();

  const worker = DIGITAL_WORKERS[selectedWorker];
  const state = workerStates[selectedWorker];

  const updateWorkerState = (updates: Partial<WorkerState>) => {
    setWorkerStates((prev) => ({
      ...prev,
      [selectedWorker]: { ...prev[selectedWorker], ...updates },
    }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Worker Selection Tabs */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {(Object.keys(DIGITAL_WORKERS) as DigitalWorkerId[]).map((id) => {
          const w = DIGITAL_WORKERS[id];
          const isSelected = selectedWorker === id;
          const isActive = workerStates[id].isActive;

          return (
            <button
              key={id}
              onClick={() => setSelectedWorker(id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all min-w-[180px] ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50"
              }`}
            >
              <div
                className={`p-2 rounded-full text-white ${WORKER_COLORS[id]} ${
                  !isActive ? "opacity-50" : ""
                }`}
              >
                {WORKER_ICONS[id]}
              </div>
              <div className="text-left">
                <p className={`font-medium ${!isActive ? "text-muted-foreground" : ""}`}>
                  {w.name}
                </p>
                <p className="text-xs text-muted-foreground capitalize">{w.role}</p>
              </div>
              {isActive && (
                <Badge variant="outline" className="ml-auto bg-green-50 text-green-700 border-green-200">
                  Active
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Worker Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full text-white ${WORKER_COLORS[selectedWorker]}`}>
                {WORKER_ICONS[selectedWorker]}
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {worker.name}
                  <Badge variant="secondary" className="capitalize">
                    {worker.role}
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  {worker.tagline}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="worker-active">Active</Label>
              <Switch
                id="worker-active"
                checked={state.isActive}
                onCheckedChange={(checked) => updateWorkerState({ isActive: checked })}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="personality">
            <TabsList className="mb-4">
              <TabsTrigger value="personality">Personality</TabsTrigger>
              <TabsTrigger value="linguistic">Linguistic DNA</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="system-prompt">System Prompt</TabsTrigger>
            </TabsList>

            {/* Personality Tab */}
            <TabsContent value="personality" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">
                    {worker.personality.description}
                  </p>
                </div>

                {/* Backstory */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Backstory</Label>
                  <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">
                    {worker.personality.backstory}
                  </p>
                </div>

                {/* Strengths */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Strengths</Label>
                  <ul className="space-y-1">
                    {worker.personality.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Quirks */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Personality Quirks</Label>
                  <ul className="space-y-1">
                    {worker.personality.quirks.map((q, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Zap className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Goals */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Primary Goals</Label>
                <div className="flex flex-wrap gap-2">
                  {worker.goals.map((goal, i) => (
                    <Badge key={i} variant="outline" className="text-sm">
                      {goal}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Trigger Conditions */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Trigger Conditions</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  {worker.name} is automatically deployed when:
                </p>
                <div className="flex flex-wrap gap-2">
                  {worker.triggerConditions.map((condition, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {condition}
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Linguistic DNA Tab */}
            <TabsContent value="linguistic" className="space-y-6">
              {/* Greetings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Greetings</Label>
                  <p className="text-xs text-muted-foreground">Click to copy</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {worker.linguistic.greetings.map((g, i) => (
                    <button
                      key={i}
                      onClick={() => copyToClipboard(g, "Greeting")}
                      className="text-left p-2 text-sm bg-muted/50 rounded hover:bg-muted transition-colors flex items-center justify-between group"
                    >
                      <code className="text-xs">{g}</code>
                      <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Signature Phrases */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Signature Phrases</Label>
                <div className="flex flex-wrap gap-2">
                  {worker.linguistic.signaturePhrases.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => copyToClipboard(p, "Phrase")}
                      className="px-3 py-1 text-sm bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Closings */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Closings</Label>
                <div className="grid grid-cols-2 gap-2">
                  {worker.linguistic.closings.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => copyToClipboard(c, "Closing")}
                      className="text-left p-2 text-sm bg-muted/50 rounded hover:bg-muted transition-colors flex items-center justify-between group"
                    >
                      <code className="text-xs">{c}</code>
                      <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Avoids */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-red-600">Words/Phrases to Avoid</Label>
                <div className="flex flex-wrap gap-2">
                  {worker.linguistic.avoids.map((a, i) => (
                    <Badge key={i} variant="destructive" className="text-xs">
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              {/* Auto Response */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Auto-Response</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Allow {worker.name} to automatically respond to inbound messages
                  </p>
                </div>
                <Switch
                  checked={state.autoResponse}
                  onCheckedChange={(checked) => updateWorkerState({ autoResponse: checked })}
                />
              </div>

              {/* CATHY-specific: Humor Level */}
              {selectedWorker === "cathy" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Humor Level</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Controls the intensity of CATHY&apos;s Leslie Nielsen/Henny Youngman style humor
                  </p>
                  <Select
                    value={state.humorLevel || "medium"}
                    onValueChange={(value) =>
                      updateWorkerState({ humorLevel: value as "mild" | "medium" | "spicy" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mild">
                        Mild - Light wit, professional with a hint of humor
                      </SelectItem>
                      <SelectItem value="medium">
                        Medium - Classic sitcom humor level
                      </SelectItem>
                      <SelectItem value="spicy">
                        Spicy - Full Leslie Nielsen absurdist comedy
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Custom Greeting Override */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Custom Greeting (Optional)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Override the default greeting. Leave empty to use {worker.name}&apos;s DNA.
                </p>
                <Input
                  placeholder={worker.linguistic.greetings[0]}
                  value={state.customGreeting || ""}
                  onChange={(e) => updateWorkerState({ customGreeting: e.target.value })}
                />
              </div>

              {/* Voice Profile (Future) */}
              <div className="space-y-2 opacity-50">
                <Label className="text-sm font-medium">Voice Profile</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Voice integration coming soon - after SMS is complete
                </p>
                <div className="p-4 border rounded-lg bg-muted/30">
                  <p className="text-sm">
                    <strong>Pace:</strong> {worker.voice.pace} |{" "}
                    <strong>Pitch:</strong> {worker.voice.pitch} |{" "}
                    <strong>Accent:</strong> {worker.voice.accent}
                  </p>
                  <p className="text-sm mt-1">
                    <strong>Emotion:</strong> {worker.voice.emotion} |{" "}
                    <strong>Pauses:</strong> {worker.voice.pauseStyle}
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* System Prompt Tab */}
            <TabsContent value="system-prompt" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">OpenAI System Prompt</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    This prompt is sent to OpenAI when generating AI-assisted messages for {worker.name}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(worker.systemPrompt, "System Prompt")}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              <Textarea
                className="font-mono text-xs min-h-[400px]"
                value={worker.systemPrompt}
                readOnly
              />
              <p className="text-xs text-muted-foreground italic">
                This system prompt is read-only. {worker.name}&apos;s personality is hardcoded and proprietary.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">Digital Workers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {Object.values(workerStates).filter((s) => s.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">Active Workers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {Object.values(workerStates).filter((s) => s.autoResponse).length}
            </div>
            <p className="text-xs text-muted-foreground">Auto-Response Enabled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">Ready</div>
            <p className="text-xs text-muted-foreground">System Status</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
