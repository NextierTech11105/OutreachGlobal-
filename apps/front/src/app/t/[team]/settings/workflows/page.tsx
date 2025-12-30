"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pause,
  Play,
  Archive,
  Edit,
  Trash2,
  MessageSquare,
  RefreshCw,
  Bell,
  BookOpen,
  Calendar,
  Zap,
  ArrowRight,
  Loader2
} from "lucide-react";
import { WorkflowModal } from "@/components/workflow-modal";
import type { Workflow } from "@/types/workflow";
import { useToast } from "@/hooks/use-toast";
import { useCurrentTeam } from "@/features/team/team.context";

// Outreach workflow stage types with agent assignments
const OUTREACH_STAGES = [
  {
    id: "initial_message",
    name: "Initial Message",
    description: "First contact with the lead",
    icon: MessageSquare,
    color: "bg-blue-500",
    agent: "GIANNA",
    timing: "Day 0",
  },
  {
    id: "retarget",
    name: "Retarget",
    description: "Follow-up for non-responders",
    icon: RefreshCw,
    color: "bg-orange-500",
    agent: "GIANNA",
    timing: "Day 3-5",
  },
  {
    id: "nudger",
    name: "Nudger",
    description: "Re-engagement with different number",
    icon: Bell,
    color: "bg-yellow-500",
    agent: "CATHY",
    timing: "Day 14+",
  },
  {
    id: "content_nurture",
    name: "Content Nurture",
    description: "Educational content sequence",
    icon: BookOpen,
    color: "bg-purple-500",
    agent: "GIANNA",
    timing: "Ongoing",
  },
  {
    id: "book_appt",
    name: "Book Appointment",
    description: "Appointment scheduling flow",
    icon: Calendar,
    color: "bg-green-500",
    agent: "SABRINA",
    timing: "On response",
  },
];

export default function WorkflowsPage() {
  const { toast } = useToast();
  const { teamId, isTeamReady } = useCurrentTeam();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | undefined>(undefined);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch workflows from API
  const fetchWorkflows = useCallback(async () => {
    if (!teamId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/t/${teamId}/workflows`);
      const result = await response.json();

      if (result.success) {
        setWorkflows(result.data || []);
      } else {
        console.error("Failed to fetch workflows:", result.error);
        toast({
          title: "Error",
          description: "Failed to load workflows",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Fetch workflows error:", error);
      toast({
        title: "Error",
        description: "Failed to load workflows",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [teamId, toast]);

  // Load workflows on mount
  useEffect(() => {
    if (isTeamReady) {
      fetchWorkflows();
    }
  }, [isTeamReady, fetchWorkflows]);

  // Filter workflows by status
  const activeWorkflows = workflows.filter((w) => w.status === "active");
  const draftWorkflows = workflows.filter((w) => w.status === "draft");
  const archivedWorkflows = workflows.filter((w) => w.status === "archived");

  const handleCreateWorkflow = (stageId?: string) => {
    setCurrentWorkflow(undefined);
    setSelectedStage(stageId || null);
    setIsModalOpen(true);
  };

  const handleEditWorkflow = (workflow: Workflow) => {
    setCurrentWorkflow(workflow);
    setIsModalOpen(true);
  };

  const handleSaveWorkflow = async (workflowData: Partial<Workflow>) => {
    if (!teamId) return;

    setIsSaving(true);
    try {
      if (currentWorkflow) {
        // Update existing workflow
        const response = await fetch(`/api/t/${teamId}/workflows/${currentWorkflow.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(workflowData),
        });
        const result = await response.json();

        if (result.success) {
          setWorkflows(workflows.map((w) =>
            w.id === currentWorkflow.id ? result.data : w
          ));
          toast({
            title: "Workflow updated",
            description: `${workflowData.name} has been updated successfully.`,
          });
        } else {
          throw new Error(result.error);
        }
      } else {
        // Create new workflow
        const response = await fetch(`/api/t/${teamId}/workflows`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...workflowData,
            stage: selectedStage,
          }),
        });
        const result = await response.json();

        if (result.success) {
          setWorkflows([...workflows, result.data]);
          toast({
            title: "Workflow created",
            description: `${workflowData.name} has been created successfully.`,
          });
        } else {
          throw new Error(result.error);
        }
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Save workflow error:", error);
      toast({
        title: "Error",
        description: "Failed to save workflow",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setSelectedStage(null);
    }
  };

  const handleToggleStatus = async (workflow: Workflow) => {
    if (!teamId) return;

    const newStatus = workflow.status === "active" ? "draft" : "active";

    try {
      const response = await fetch(`/api/t/${teamId}/workflows/${workflow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await response.json();

      if (result.success) {
        setWorkflows(workflows.map((w) =>
          w.id === workflow.id ? result.data : w
        ));
        toast({
          title: workflow.status === "active" ? "Workflow paused" : "Workflow activated",
          description: `${workflow.name} has been ${workflow.status === "active" ? "paused" : "activated"}.`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Toggle status error:", error);
      toast({
        title: "Error",
        description: "Failed to update workflow status",
        variant: "destructive",
      });
    }
  };

  const handleArchiveWorkflow = async (workflow: Workflow) => {
    if (!teamId) return;

    try {
      const response = await fetch(`/api/t/${teamId}/workflows/${workflow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      const result = await response.json();

      if (result.success) {
        setWorkflows(workflows.map((w) =>
          w.id === workflow.id ? result.data : w
        ));
        toast({
          title: "Workflow archived",
          description: `${workflow.name} has been archived.`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Archive workflow error:", error);
      toast({
        title: "Error",
        description: "Failed to archive workflow",
        variant: "destructive",
      });
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!teamId) return;

    try {
      const response = await fetch(`/api/t/${teamId}/workflows/${workflowId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        setWorkflows(workflows.filter((w) => w.id !== workflowId));
        toast({
          title: "Workflow deleted",
          description: "The workflow has been permanently deleted.",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Delete workflow error:", error);
      toast({
        title: "Error",
        description: "Failed to delete workflow",
        variant: "destructive",
      });
    }
  };

  const getStageWorkflows = (stageId: string) => {
    return workflows.filter((w) => w.stage === stageId);
  };

  const renderWorkflowTable = (workflowList: Workflow[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Trigger</TableHead>
          <TableHead>Stage</TableHead>
          <TableHead>Agent</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Last Run</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {workflowList.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
              No workflows found
            </TableCell>
          </TableRow>
        ) : (
          workflowList.map((workflow) => {
            const stage = OUTREACH_STAGES.find((s) => s.id === workflow.stage);
            return (
              <TableRow key={workflow.id}>
                <TableCell className="font-medium">{workflow.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {workflow.trigger === "lead_created" && "New lead created"}
                  {workflow.trigger === "email_received" && "Email received"}
                  {workflow.trigger === "sms_received" && "SMS received"}
                  {workflow.trigger === "inactivity_threshold" && "Inactivity detected"}
                  {workflow.trigger === "scheduled" && "Scheduled"}
                  {workflow.trigger === "email_opened" && "Email opened"}
                  {workflow.trigger === "email_clicked" && "Link clicked"}
                  {!workflow.trigger && "—"}
                </TableCell>
                <TableCell>
                  {stage ? (
                    <Badge variant="outline" className="gap-1">
                      <stage.icon className="h-3 w-3" />
                      {stage.name}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {stage?.agent ? (
                    <Badge variant="secondary" className="text-xs">
                      {stage.agent}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>{new Date(workflow.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  {workflow.lastRunAt
                    ? new Date(workflow.lastRunAt).toLocaleString()
                    : "Never"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      workflow.status === "active"
                        ? "default"
                        : workflow.status === "draft"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {workflow.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEditWorkflow(workflow)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  {workflow.status === "active" ? (
                    <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(workflow)}>
                      <Pause className="h-4 w-4" />
                    </Button>
                  ) : workflow.status === "draft" ? (
                    <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(workflow)}>
                      <Play className="h-4 w-4" />
                    </Button>
                  ) : null}
                  {workflow.status !== "archived" && (
                    <Button variant="ghost" size="icon" onClick={() => handleArchiveWorkflow(workflow)}>
                      <Archive className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteWorkflow(workflow.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
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
  );

  if (!isTeamReady) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground mt-2">
            Configure automated workflows and outreach sequences
          </p>
        </div>
        <Button onClick={() => handleCreateWorkflow()} disabled={isSaving}>
          <Plus className="mr-2 h-4 w-4" />
          Create Workflow
        </Button>
      </div>

      {/* Outreach Stage Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Outreach Pipeline
          </CardTitle>
          <CardDescription>
            Configure workflows for each stage of your outreach sequence. Click a stage to add a workflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 overflow-x-auto pb-4">
            {OUTREACH_STAGES.map((stage, index) => {
              const stageWorkflows = getStageWorkflows(stage.id);
              const activeCount = stageWorkflows.filter((w) => w.status === "active").length;
              const Icon = stage.icon;

              return (
                <div key={stage.id} className="flex items-center">
                  <Card
                    className="min-w-[220px] cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleCreateWorkflow(stage.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${stage.color}`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{stage.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {activeCount} active / {stageWorkflows.length} total
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{stage.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {stage.agent}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{stage.timing}</span>
                      </div>
                    </CardContent>
                  </Card>
                  {index < OUTREACH_STAGES.length - 1 && (
                    <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Workflow Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active
            {activeWorkflows.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeWorkflows.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="draft">
            Draft
            {draftWorkflows.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {draftWorkflows.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived
            {archivedWorkflows.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {archivedWorkflows.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                renderWorkflowTable(activeWorkflows)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="draft">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                renderWorkflowTable(draftWorkflows)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archived">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                renderWorkflowTable(archivedWorkflows)
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <WorkflowModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        workflow={currentWorkflow}
        onSave={handleSaveWorkflow}
      />
    </div>
  );
}
