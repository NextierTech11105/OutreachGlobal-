"use client";

import { useState } from "react";
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
import { Plus, Pause, Play, Archive, Edit, Trash2 } from "lucide-react";
import { WorkflowModal } from "@/components/workflow-modal";
import type { Workflow } from "@/types/workflow";
import { useToast } from "@/hooks/use-toast";

export default function WorkflowsPage() {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | undefined>(
    undefined,
  );

  // Mock data for workflows
  const [workflows, setWorkflows] = useState<Workflow[]>([
    {
      id: "1",
      name: "Lead Response Follow-up",
      description: "Automatically follow up when a lead responds to an email",
      trigger: "email_received",
      actions: [
        {
          type: "create_task",
          config: {
            taskType: "follow_up",
            assignTo: "lead_owner",
            dueIn: 24,
          },
        },
      ],
      status: "active",
      createdAt: "2025-04-10T12:00:00Z",
      lastRunAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "2",
      name: "New Lead Assignment",
      description: "Assign new leads to team members based on territory",
      trigger: "lead_created",
      actions: [
        {
          type: "assign_lead",
          config: {
            assignmentRule: "territory_based",
          },
        },
      ],
      status: "active",
      createdAt: "2025-03-22T12:00:00Z",
      lastRunAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    {
      id: "3",
      name: "Campaign Completion Notification",
      description: "Send notifications when campaigns are completed",
      trigger: "campaign_completed",
      actions: [
        {
          type: "send_notification",
          config: {
            notificationType: "email",
            recipients: ["campaign_owner", "marketing_team"],
          },
        },
      ],
      status: "active",
      createdAt: "2025-02-15T12:00:00Z",
      lastRunAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]);

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

  const handleSaveWorkflow = (workflowData: any) => {
    if (currentWorkflow) {
      // Update existing workflow
      const updatedWorkflows = workflows.map((w) =>
        w.id === currentWorkflow.id
          ? { ...w, ...workflowData, updatedAt: new Date().toISOString() }
          : w,
      );
      setWorkflows(updatedWorkflows);
      toast({
        title: "Workflow updated",
        description: `${workflowData.name} has been updated successfully.`,
      });
    } else {
      // Create new workflow
      const newWorkflow: Workflow = {
        id: `workflow-${Date.now()}`,
        ...workflowData,
        createdAt: new Date().toISOString(),
      };
      setWorkflows([...workflows, newWorkflow]);
      toast({
        title: "Workflow created",
        description: `${workflowData.name} has been created successfully.`,
      });
    }
  };

  const handleToggleStatus = (workflow: Workflow) => {
    const newStatus = workflow.status === "active" ? "draft" : "active";
    const updatedWorkflows = workflows.map((w) =>
      w.id === workflow.id ? { ...w, status: newStatus } : w,
    );
    setWorkflows(updatedWorkflows);

    toast({
      title:
        workflow.status === "active" ? "Workflow paused" : "Workflow activated",
      description: `${workflow.name} has been ${workflow.status === "active" ? "paused" : "activated"}.`,
    });
  };

  const handleArchiveWorkflow = (workflow: Workflow) => {
    const updatedWorkflows = workflows.map((w) =>
      w.id === workflow.id ? { ...w, status: "archived" } : w,
    );
    setWorkflows(updatedWorkflows);

    toast({
      title: "Workflow archived",
      description: `${workflow.name} has been archived.`,
    });
  };

  const handleDeleteWorkflow = (workflowId: string) => {
    const updatedWorkflows = workflows.filter((w) => w.id !== workflowId);
    setWorkflows(updatedWorkflows);

    toast({
      title: "Workflow deleted",
      description: "The workflow has been permanently deleted.",
    });
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
                  ? new Date(workflow.lastRunAt).toLocaleString(undefined, {
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
