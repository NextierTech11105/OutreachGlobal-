"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Target,
  Plus,
  Zap,
  MessageSquare,
  Clock,
  UserCheck,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  Ghost,
  Settings,
  Trash2,
  ToggleLeft,
  History,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AUTO_TRIGGERS_QUERY,
  TRIGGER_EXECUTIONS_QUERY,
  type AutoTrigger,
  type TriggerExecution,
} from "@/features/triggers/queries/auto-trigger.queries";
import {
  CREATE_AUTO_TRIGGER_MUTATION,
  TOGGLE_AUTO_TRIGGER_MUTATION,
  DELETE_AUTO_TRIGGER_MUTATION,
} from "@/features/triggers/mutations/auto-trigger.mutations";

/**
 * Auto-Trigger Configuration UI
 *
 * Manages event-driven SMS triggers that fire automatically based on lead behavior.
 * Supports: lead_responded, no_response, stage_changed, meeting_booked, etc.
 */

type TriggerType =
  | "lead_responded"
  | "no_response"
  | "stage_changed"
  | "meeting_booked"
  | "positive_sentiment"
  | "negative_sentiment";

const TRIGGER_TYPES: Record<TriggerType, {
  name: string;
  description: string;
  icon: typeof MessageSquare;
  color: string;
  configFields: Array<{
    key: string;
    label: string;
    type: "number" | "select";
    default?: number;
    options?: string[];
  }>;
}> = {
  lead_responded: {
    name: "Lead Responded",
    description: "Triggers when a lead replies to any message",
    icon: MessageSquare,
    color: "text-blue-500",
    configFields: [],
  },
  no_response: {
    name: "No Response",
    description: "Triggers after N days of no response",
    icon: Ghost,
    color: "text-orange-500",
    configFields: [
      { key: "daysWithoutResponse", label: "Days without response", type: "number", default: 3 },
    ],
  },
  stage_changed: {
    name: "Stage Changed",
    description: "Triggers when lead moves to specific stage",
    icon: UserCheck,
    color: "text-purple-500",
    configFields: [
      { key: "targetStage", label: "Target stage", type: "select", options: ["interested", "qualified", "demo_scheduled", "negotiating"] },
    ],
  },
  meeting_booked: {
    name: "Meeting Booked",
    description: "Triggers when a meeting is scheduled",
    icon: Calendar,
    color: "text-green-500",
    configFields: [],
  },
  positive_sentiment: {
    name: "Positive Sentiment",
    description: "Triggers on positive response detection",
    icon: ThumbsUp,
    color: "text-emerald-500",
    configFields: [
      { key: "minConfidence", label: "Min confidence %", type: "number", default: 80 },
    ],
  },
  negative_sentiment: {
    name: "Negative Sentiment",
    description: "Triggers on negative/objection detection",
    icon: ThumbsDown,
    color: "text-red-500",
    configFields: [
      { key: "minConfidence", label: "Min confidence %", type: "number", default: 80 },
    ],
  },
};

const MOCK_TEMPLATES = [
  { id: "tpl_001", name: "Follow-up (Friendly)" },
  { id: "tpl_002", name: "Re-engagement (Humor)" },
  { id: "tpl_003", name: "Objection Handler" },
  { id: "tpl_004", name: "Meeting Confirmation" },
  { id: "tpl_005", name: "Interest Capture" },
];

export default function AutoTriggersPage() {
  const params = useParams();
  const teamId = params.team as string;

  const [isCreating, setIsCreating] = useState(false);

  // New trigger form state
  const [newTriggerName, setNewTriggerName] = useState("");
  const [newTriggerType, setNewTriggerType] = useState<TriggerType | "">("");
  const [newTriggerTemplate, setNewTriggerTemplate] = useState("");
  const [newTriggerConfig, setNewTriggerConfig] = useState<Record<string, unknown>>({});

  const { data: triggersData, loading: triggersLoading, error: triggersError, refetch: refetchTriggers } = useQuery(
    AUTO_TRIGGERS_QUERY,
    {
      variables: { teamId },
      skip: !teamId,
    }
  );

  const { data: executionsData, loading: executionsLoading, refetch: refetchExecutions } = useQuery(
    TRIGGER_EXECUTIONS_QUERY,
    {
      variables: { teamId, limit: 50 },
      skip: !teamId,
    }
  );

  const [createTrigger, { loading: creating }] = useMutation(CREATE_AUTO_TRIGGER_MUTATION, {
    onCompleted: () => {
      toast.success("Trigger created successfully");
      setIsCreating(false);
      resetForm();
      refetchTriggers();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create trigger");
    },
  });

  const [toggleTrigger] = useMutation(TOGGLE_AUTO_TRIGGER_MUTATION, {
    onCompleted: (data) => {
      toast.success(`Trigger ${data.toggleAutoTrigger.trigger.enabled ? "enabled" : "disabled"}`);
      refetchTriggers();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to toggle trigger");
    },
  });

  const [deleteTrigger] = useMutation(DELETE_AUTO_TRIGGER_MUTATION, {
    onCompleted: () => {
      toast.success("Trigger deleted");
      refetchTriggers();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete trigger");
    },
  });

  const triggers = triggersData?.autoTriggers?.nodes || [];
  const executions = executionsData?.triggerExecutions?.nodes || [];

  const resetForm = () => {
    setNewTriggerName("");
    setNewTriggerType("");
    setNewTriggerTemplate("");
    setNewTriggerConfig({});
  };

  const handleToggleTrigger = async (triggerId: string, currentEnabled: boolean) => {
    await toggleTrigger({
      variables: { teamId, id: triggerId, enabled: !currentEnabled },
    });
  };

  const handleDeleteTrigger = async (triggerId: string) => {
    await deleteTrigger({
      variables: { teamId, id: triggerId },
    });
  };

  const handleCreateTrigger = async () => {
    if (!newTriggerName || !newTriggerType || !newTriggerTemplate) {
      toast.error("Please fill in all required fields");
      return;
    }

    const template = MOCK_TEMPLATES.find((t) => t.id === newTriggerTemplate);
    await createTrigger({
      variables: {
        teamId,
        input: {
          name: newTriggerName,
          type: newTriggerType,
          templateId: newTriggerTemplate,
          templateName: template?.name || "",
          config: JSON.stringify(newTriggerConfig),
        },
      },
    });
  };

  const selectedTypeConfig = newTriggerType ? TRIGGER_TYPES[newTriggerType] : null;

  if (triggersLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (triggersError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-muted-foreground">Failed to load auto-triggers</p>
        <Button onClick={() => refetchTriggers()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 space-y-6 p-8 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Target className="h-8 w-8" />
              Auto-Triggers
            </h2>
            <p className="text-muted-foreground">
              Configure event-driven SMS automation
            </p>
          </div>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Trigger
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Auto-Trigger</DialogTitle>
                <DialogDescription>
                  Set up an event-driven SMS trigger
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Trigger Name</Label>
                  <Input
                    placeholder="e.g., Nudge Ghosted Leads"
                    value={newTriggerName}
                    onChange={(e) => setNewTriggerName(e.target.value)}
                    className="bg-zinc-800"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Trigger Type</Label>
                  <Select
                    value={newTriggerType}
                    onValueChange={(v) => {
                      setNewTriggerType(v as TriggerType);
                      setNewTriggerConfig({});
                    }}
                  >
                    <SelectTrigger className="bg-zinc-800">
                      <SelectValue placeholder="Select trigger type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TRIGGER_TYPES) as TriggerType[]).map((type) => {
                        const config = TRIGGER_TYPES[type];
                        const Icon = config.icon;
                        return (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              <Icon className={cn("w-4 h-4", config.color)} />
                              {config.name}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {selectedTypeConfig && (
                    <p className="text-xs text-zinc-500">
                      {selectedTypeConfig.description}
                    </p>
                  )}
                </div>

                {/* Dynamic config fields based on trigger type */}
                {selectedTypeConfig?.configFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label>{field.label}</Label>
                    {field.type === "number" && (
                      <Input
                        type="number"
                        value={(newTriggerConfig[field.key] as number) || field.default || ""}
                        onChange={(e) =>
                          setNewTriggerConfig((prev) => ({
                            ...prev,
                            [field.key]: parseInt(e.target.value),
                          }))
                        }
                        className="bg-zinc-800"
                      />
                    )}
                    {field.type === "select" && (
                      <Select
                        value={(newTriggerConfig[field.key] as string) || ""}
                        onValueChange={(v) =>
                          setNewTriggerConfig((prev) => ({
                            ...prev,
                            [field.key]: v,
                          }))
                        }
                      >
                        <SelectTrigger className="bg-zinc-800">
                          <SelectValue placeholder={`Select ${field.label}...`} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}

                <div className="space-y-2">
                  <Label>Template to Send</Label>
                  <Select value={newTriggerTemplate} onValueChange={setNewTriggerTemplate}>
                    <SelectTrigger className="bg-zinc-800">
                      <SelectValue placeholder="Select template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_TEMPLATES.map((tpl) => (
                        <SelectItem key={tpl.id} value={tpl.id}>
                          {tpl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTrigger} disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Trigger
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Target className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{triggers.length}</p>
                  <p className="text-xs text-zinc-500">Total Triggers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Zap className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {triggers.filter((t) => t.enabled).length}
                  </p>
                  <p className="text-xs text-zinc-500">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {triggers.reduce((sum, t) => sum + t.firedCount, 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-zinc-500">Total Fired</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{executions.length}</p>
                  <p className="text-xs text-zinc-500">Recent Executions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="triggers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="triggers">Active Triggers</TabsTrigger>
            <TabsTrigger value="history">Execution History</TabsTrigger>
          </TabsList>

          <TabsContent value="triggers" className="space-y-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead className="w-[50px]">Status</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead className="text-right">Fired</TableHead>
                      <TableHead>Last Fired</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {triggers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                          No triggers configured. Create one to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      triggers.map((trigger) => {
                        const typeConfig = TRIGGER_TYPES[trigger.type as TriggerType] || TRIGGER_TYPES.lead_responded;
                        const TypeIcon = typeConfig.icon;
                        return (
                          <TableRow key={trigger.id} className="border-zinc-800">
                            <TableCell>
                              <Switch
                                checked={trigger.enabled}
                                onCheckedChange={() => handleToggleTrigger(trigger.id, trigger.enabled)}
                              />
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{trigger.name}</p>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <TypeIcon className={cn("w-4 h-4", typeConfig.color)} />
                                <span className="text-sm">{typeConfig.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-xs">
                                {trigger.templateName}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {trigger.firedCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-sm text-zinc-400">
                              {trigger.lastFiredAt
                                ? new Date(trigger.lastFiredAt).toLocaleDateString()
                                : "Never"}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-400"
                                onClick={() => handleDeleteTrigger(trigger.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Executions
                </CardTitle>
                <CardDescription>
                  Last 50 trigger executions
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {executionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800">
                        <TableHead>Status</TableHead>
                        <TableHead>Trigger ID</TableHead>
                        <TableHead>Lead ID</TableHead>
                        <TableHead>Event Type</TableHead>
                        <TableHead>Created At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {executions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-zinc-500">
                            No executions yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        executions.map((exec) => (
                          <TableRow key={exec.id} className="border-zinc-800">
                            <TableCell>
                              {exec.status === "sent" && (
                                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Sent
                                </Badge>
                              )}
                              {exec.status === "failed" && (
                                <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Failed
                                </Badge>
                              )}
                              {exec.status === "pending" && (
                                <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {exec.triggerId}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {exec.leadId}
                            </TableCell>
                            <TableCell className="text-sm">
                              {exec.eventType || "-"}
                            </TableCell>
                            <TableCell className="text-sm text-zinc-400">
                              {new Date(exec.createdAt).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Help Section */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">How Auto-Triggers Work</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Event Detection:</strong> The system monitors lead activity and
              detects events like responses, stage changes, and sentiment.
            </p>
            <p>
              <strong>Trigger Matching:</strong> When an event occurs, active triggers
              are evaluated to find matches based on their configuration.
            </p>
            <p>
              <strong>Template Selection:</strong> Matched triggers send their
              configured template to the lead automatically.
            </p>
            <p>
              <strong>Compliance:</strong> All auto-triggered messages follow your
              team's sending limits and compliance rules.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
