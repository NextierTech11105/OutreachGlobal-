"use client";

import { sf, sfd } from "@/lib/utils/safe-format";
import { useState, useEffect } from "react";
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
import { Plus, Pause, Play, Archive, Edit, Trash2, Loader2 } from "lucide-react";
import { WorkflowModal } from "@/components/workflow-modal";
import type { Workflow } from "@/types/workflow";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_TEAM_ID = "admin";

export default function WorkflowsPage() {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | undefined>(
    undefined,
  );
  const [isLoading, setIsLoading] = useState(true);

  // Workflows state - fetched from API
  const [workflows, setWorkflows] = useState<Workflow[]>([]);

  // Fetch workflows on mount
  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/workflows?teamId=${DEFAULT_TEAM_ID}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setWorkflows(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch workflows:", error);
      toast({
        title: "Error",
        description: "Failed to load workflows",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter workflows by status
  const activeWorkflows = workflows.filter((w) => w.status === "active");
  const draftWorkflows = workflows.filter((w) => w.status === "draft");
  const archivedWorkflows = workflows.filter((w) => w.status === "archived");

  const handleCreateWorkflow = () => {
    setCurrentWorkflow(undefined);
    setIsModalOpen(true);
  };

  const handleEditWorkflow = (workflow: Workflow) => {
    setCurrentWorkflow(workflow);
    setIsModalOpen(true);
  };

  const handleSaveWorkflow = async (workflowData: any) => {
    try {
      if (currentWorkflow) {
        // Update existing workflow via API
        const response = await fetch("/api/workflows", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: currentWorkflow.id, ...workflowData }),
        });

        if (response.ok) {
          await fetchWorkflows();
          toast({
            title: "Workflow updated",
            description: `${workflowData.name} has been updated successfully.`,
          });
        } else {
          throw new Error("Failed to update");
        }
      } else {
        // Create new workflow via API
        const response = await fetch("/api/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamId: DEFAULT_TEAM_ID, ...workflowData }),
        });

        if (response.ok) {
          await fetchWorkflows();
          toast({
            title: "Workflow created",
            description: `${workflowData.name} has been created successfully.`,
          });
        } else {
          throw new Error("Failed to create");
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save workflow",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (workflow: Workflow) => {
    const newStatus: "active" | "draft" | "archived" =
      workflow.status === "active" ? "draft" : "active";

    try {
      const response = await fetch("/api/workflows", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: workflow.id, status: newStatus }),
      });

      if (response.ok) {
        await fetchWorkflows();
        toast({
          title: workflow.status === "active" ? "Workflow paused" : "Workflow activated",
          description: `${workflow.name} has been ${workflow.status === "active" ? "paused" : "activated"}.`,
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to update workflow status",
        variant: "destructive",
      });
    }
  };

  const handleArchiveWorkflow = async (workflow: Workflow) => {
    try {
      const response = await fetch("/api/workflows", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: workflow.id, status: "archived" }),
      });

      if (response.ok) {
        await fetchWorkflows();
        toast({
          title: "Workflow archived",
          description: `${workflow.name} has been archived.`,
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to archive workflow",
        variant: "destructive",
      });
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows?id=${workflowId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchWorkflows();
        toast({
          title: "Workflow deleted",
          description: "The workflow has been permanently deleted.",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete workflow",
        variant: "destructive",
      });
    }
  };

  const renderWorkflowTable = (workflowList: Workflow[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Trigger</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Last Run</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {workflowList.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={6}
              className="text-center py-6 text-muted-foreground"
            >
              No workflows found
            </TableCell>
          </TableRow>
        ) : (
          workflowList.map((workflow) => (
            <TableRow key={workflow.id}>
              <TableCell className="font-medium">{workflow.name}</TableCell>
              <TableCell>
                {workflow.trigger === "lead_created" &&
                  "When a new lead is created"}
                {workflow.trigger === "email_received" &&
                  "When a lead responds to an email"}
                {workflow.trigger === "campaign_completed" &&
                  "When a campaign is completed"}
                {workflow.trigger === "lead_updated" &&
                  "When a lead is updated"}
                {workflow.trigger === "lead_status_changed" &&
                  "When a lead's status changes"}
                {workflow.trigger === "email_opened" &&
                  "When an email is opened"}
                {workflow.trigger === "sms_received" &&
                  "When an SMS is received"}
                {workflow.trigger === "form_submitted" &&
                  "When a form is submitted"}
                {workflow.trigger === "scheduled" && "On a schedule"}
              </TableCell>
              <TableCell>
                {new Date(workflow.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {workflow.lastRunAt
                  ? sfd(workflow.lastRunAt, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })
                  : "Never"}
              </TableCell>
              <TableCell>
                <div
                  className={`px-2 py-1 rounded text-xs inline-block ${
                    workflow.status === "active"
                      ? "bg-black text-white"
                      : workflow.status === "draft"
                        ? "bg-gray-200 text-gray-800"
                        : "bg-gray-300 text-gray-700"
                  }`}
                >
                  {workflow.status.charAt(0).toUpperCase() +
                    workflow.status.slice(1)}
                </div>
              </TableCell>
              <TableCell className="text-right space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEditWorkflow(workflow)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                {workflow.status === "active" ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleStatus(workflow)}
                  >
                    <Pause className="h-4 w-4" />
                  </Button>
                ) : workflow.status === "draft" ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleStatus(workflow)}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                ) : null}
                {workflow.status !== "archived" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleArchiveWorkflow(workflow)}
                  >
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
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
            <p className="text-muted-foreground mt-2">
              Configure automated workflows and triggers for your outreach
              campaigns
            </p>
          </div>
          <Button onClick={handleCreateWorkflow}>
            <Plus className="mr-2 h-4 w-4" />
            Create Workflow
          </Button>
        </div>

        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">
              Active Workflows
              {activeWorkflows.length > 0 && (
                <span className="ml-2 bg-black text-white text-xs px-2 py-0.5 rounded-full">
                  {activeWorkflows.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="draft">
              Draft Workflows
              {draftWorkflows.length > 0 && (
                <span className="ml-2 bg-gray-200 text-gray-800 text-xs px-2 py-0.5 rounded-full">
                  {draftWorkflows.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived">
              Archived Workflows
              {archivedWorkflows.length > 0 && (
                <span className="ml-2 bg-gray-300 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                  {archivedWorkflows.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {renderWorkflowTable(activeWorkflows)}
          </TabsContent>

          <TabsContent value="draft">
            {renderWorkflowTable(draftWorkflows)}
          </TabsContent>

          <TabsContent value="archived">
            {renderWorkflowTable(archivedWorkflows)}
          </TabsContent>
        </Tabs>
      </div>

      <WorkflowModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        workflow={currentWorkflow}
        onSave={handleSaveWorkflow}
      />
    </div>
  );
}
