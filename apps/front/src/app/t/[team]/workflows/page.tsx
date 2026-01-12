"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Workflow,
  Plus,
  Zap,
  CheckCircle,
  Clock,
  Play,
  Pause,
  RefreshCw,
  MessageSquare,
  Mail,
  Phone,
  Tag,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

interface WorkflowStep {
  action: string;
  value?: string;
}

interface WorkflowData {
  id: string;
  name: string;
  trigger: string;
  active: boolean;
  stepsCount: number;
}

// Action icons map
const actionIcons: Record<string, React.ElementType> = {
  send_sms: MessageSquare,
  send_email: Mail,
  send_voice: Phone,
  add_tag: Tag,
  remove_tag: Tag,
  update_status: CheckCircle,
  push_to_call_queue: Phone,
  add_notes: MessageSquare,
};

// Trigger display names
const triggerLabels: Record<string, string> = {
  "message.received": "Inbound SMS Received",
  "lead.created": "New Lead Created",
  "lead.updated": "Lead Updated",
  "campaign.started": "Campaign Started",
};

export default function WorkflowsPage() {
  const params = useParams();
  const { toast } = useToast();
  const teamSlug = params.team as string;

  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch workflows from API
  useEffect(() => {
    async function fetchWorkflows() {
      try {
        const response = await fetch("/api/workflows/execute");
        if (response.ok) {
          const data = await response.json();
          setWorkflows(data.workflows || []);
          setTriggers(data.triggers || []);
          setActions(data.actions || []);
        }
      } catch (error) {
        console.error("Failed to fetch workflows:", error);
        toast({
          title: "Error",
          description: "Failed to load workflows",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchWorkflows();
  }, [toast]);

  // Toggle workflow active state
  const toggleWorkflow = async (workflowId: string, currentActive: boolean) => {
    // TODO: Implement toggle API
    toast({
      title: currentActive ? "Workflow Paused" : "Workflow Activated",
      description: `Workflow ${currentActive ? "paused" : "activated"} successfully`,
    });

    // Optimistic update
    setWorkflows((prev) =>
      prev.map((wf) =>
        wf.id === workflowId ? { ...wf, active: !wf.active } : wf
      )
    );
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground">
            Automated multi-step sequences triggered by events
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Workflow
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflows.length}</div>
            <p className="text-xs text-muted-foreground">
              {workflows.filter((w) => w.active).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Triggers</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{triggers.length}</div>
            <p className="text-xs text-muted-foreground">Event types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Actions</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actions.length}</div>
            <p className="text-xs text-muted-foreground">Action types</p>
          </CardContent>
        </Card>
      </div>

      {/* Workflows List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Active Workflows</h2>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : workflows.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Workflow className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No workflows configured</h3>
              <p className="text-muted-foreground text-center mt-1 max-w-md">
                Create workflows to automate your outreach sequences with
                triggers and actions.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {workflows.map((workflow) => (
              <Card key={workflow.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2 rounded-lg ${
                          workflow.active
                            ? "bg-green-100 dark:bg-green-900"
                            : "bg-gray-100 dark:bg-gray-800"
                        }`}
                      >
                        {workflow.active ? (
                          <Play className="h-5 w-5 text-green-600" />
                        ) : (
                          <Pause className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{workflow.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {triggerLabels[workflow.trigger] || workflow.trigger}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">
                        {workflow.stepsCount} step{workflow.stepsCount !== 1 ? "s" : ""}
                      </Badge>
                      <Badge
                        variant={workflow.active ? "default" : "outline"}
                        className={
                          workflow.active
                            ? "bg-green-500 hover:bg-green-600"
                            : ""
                        }
                      >
                        {workflow.active ? "Active" : "Paused"}
                      </Badge>
                      <Switch
                        checked={workflow.active}
                        onCheckedChange={() =>
                          toggleWorkflow(workflow.id, workflow.active)
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Available Triggers & Actions Reference */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Available Triggers</CardTitle>
            <CardDescription>Events that can start a workflow</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {triggers.map((trigger) => (
                <div
                  key={trigger}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                >
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">
                    {triggerLabels[trigger] || trigger}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Available Actions</CardTitle>
            <CardDescription>Steps that can be executed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {actions.map((action) => {
                const Icon = actionIcons[action] || CheckCircle;
                return (
                  <div
                    key={action}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                  >
                    <Icon className="h-4 w-4 text-blue-500" />
                    <span className="text-sm capitalize">
                      {action.replace(/_/g, " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
