"use client";

import { useState } from "react";
import {
  Workflow,
  Plus,
  Play,
  Pause,
  Settings,
  ArrowRight,
  Zap,
  Mail,
  MessageSquare,
  Clock,
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

interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  trigger: string;
  status: "active" | "paused" | "draft";
  steps: number;
  executed: number;
  lastRun?: string;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([
    {
      id: "1",
      name: "New Lead Nurture",
      description: "Auto-sequence for new inbound leads",
      trigger: "New lead created",
      status: "active",
      steps: 5,
      executed: 342,
      lastRun: "2 minutes ago",
    },
    {
      id: "2",
      name: "Appointment Booked",
      description: "Confirmation and reminder sequence",
      trigger: "Appointment scheduled",
      status: "active",
      steps: 3,
      executed: 156,
      lastRun: "15 minutes ago",
    },
    {
      id: "3",
      name: "Deal Won Onboarding",
      description: "Welcome sequence for new customers",
      trigger: "Deal marked as won",
      status: "paused",
      steps: 7,
      executed: 45,
      lastRun: "2 days ago",
    },
    {
      id: "4",
      name: "Re-Engagement",
      description: "Wake up dormant leads",
      trigger: "No activity for 30 days",
      status: "active",
      steps: 4,
      executed: 89,
      lastRun: "1 hour ago",
    },
  ]);

  const toggleWorkflow = (id: string) => {
    setWorkflows(
      workflows.map((w) =>
        w.id === id
          ? {
              ...w,
              status: w.status === "active" ? "paused" : ("active" as const),
            }
          : w,
      ),
    );
  };

  const getStatusColor = (status: WorkflowItem["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "paused":
        return "bg-yellow-500";
      case "draft":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground">
            Automated multi-step sequences
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Workflow
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Workflows
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workflows.filter((w) => w.status === "active").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Executions
            </CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workflows.reduce((sum, w) => sum + w.executed, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Steps</CardTitle>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workflows.reduce((sum, w) => sum + w.steps, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflows */}
      <div className="grid gap-4">
        {workflows.map((workflow) => (
          <Card
            key={workflow.id}
            className={`transition-all ${workflow.status === "paused" ? "opacity-70" : ""}`}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${getStatusColor(workflow.status)} bg-opacity-20`}
                  >
                    <Workflow className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {workflow.name}
                      <Badge
                        className={
                          getStatusColor(workflow.status) + " text-white"
                        }
                      >
                        {workflow.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{workflow.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Switch
                    checked={workflow.status === "active"}
                    onCheckedChange={() => toggleWorkflow(workflow.id)}
                  />
                  <Button variant="outline" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Zap className="h-3 w-3" />
                    Trigger
                  </div>
                  <p className="font-medium">{workflow.trigger}</p>
                </div>
                <div>
                  <div className="text-muted-foreground">Steps</div>
                  <p className="font-medium">{workflow.steps}</p>
                </div>
                <div>
                  <div className="text-muted-foreground">Executions</div>
                  <p className="font-medium">{workflow.executed}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Last Run
                  </div>
                  <p className="font-medium">{workflow.lastRun || "Never"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
