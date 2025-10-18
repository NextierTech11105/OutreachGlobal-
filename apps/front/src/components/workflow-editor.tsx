"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, ArrowDown, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WorkflowAction } from "@/types/workflow";

interface WorkflowEditorProps {
  actions: WorkflowAction[];
  onChange: (actions: WorkflowAction[]) => void;
}

export function WorkflowEditor({ actions, onChange }: WorkflowEditorProps) {
  const actionTypes = [
    { value: "send_email", label: "Send Email" },
    { value: "send_sms", label: "Send SMS" },
    { value: "create_task", label: "Create Task" },
    { value: "update_lead", label: "Update Lead" },
    { value: "assign_lead", label: "Assign Lead" },
    { value: "add_tag", label: "Add Tag" },
    { value: "remove_tag", label: "Remove Tag" },
    { value: "wait", label: "Wait" },
    { value: "condition", label: "Condition" },
    { value: "webhook", label: "Webhook" },
  ];

  const addAction = () => {
    const newAction: WorkflowAction = {
      type: "send_email",
      config: {},
    };
    onChange([...actions, newAction]);
  };

  const updateAction = (index: number, action: WorkflowAction) => {
    const newActions = [...actions];
    newActions[index] = action;
    onChange(newActions);
  };

  const removeAction = (index: number) => {
    const newActions = [...actions];
    newActions.splice(index, 1);
    onChange(newActions);
  };

  const renderActionConfig = (action: WorkflowAction, index: number) => {
    switch (action.type) {
      case "send_email":
        return (
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Template</label>
                <Select
                  value={action.config.templateId || ""}
                  onValueChange={(value) =>
                    updateAction(index, {
                      ...action,
                      config: { ...action.config, templateId: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="template1">Welcome Email</SelectItem>
                    <SelectItem value="template2">Follow-up Email</SelectItem>
                    <SelectItem value="template3">Thank You Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Sender</label>
                <Select
                  value={action.config.sender || ""}
                  onValueChange={(value) =>
                    updateAction(index, {
                      ...action,
                      config: { ...action.config, sender: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current_user">Current User</SelectItem>
                    <SelectItem value="lead_owner">Lead Owner</SelectItem>
                    <SelectItem value="team_email">Team Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case "send_sms":
        return (
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Template</label>
              <Select
                value={action.config.templateId || ""}
                onValueChange={(value) =>
                  updateAction(index, {
                    ...action,
                    config: { ...action.config, templateId: value },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms1">Welcome SMS</SelectItem>
                  <SelectItem value="sms2">Appointment Reminder</SelectItem>
                  <SelectItem value="sms3">Follow-up SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "create_task":
        return (
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Task Type</label>
                <Select
                  value={action.config.taskType || ""}
                  onValueChange={(value) =>
                    updateAction(index, {
                      ...action,
                      config: { ...action.config, taskType: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Schedule Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Assign To</label>
                <Select
                  value={action.config.assignTo || ""}
                  onValueChange={(value) =>
                    updateAction(index, {
                      ...action,
                      config: { ...action.config, assignTo: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current_user">Current User</SelectItem>
                    <SelectItem value="lead_owner">Lead Owner</SelectItem>
                    <SelectItem value="team_lead">Team Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      // Add more action type configurations as needed

      default:
        return (
          <div className="text-sm text-muted-foreground mt-4">
            Configure this action in the advanced editor
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {actions.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">No actions added yet</p>
          <Button variant="outline" className="mt-4" onClick={addAction}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add First Action
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {actions.map((action, index) => (
            <div key={index} className="relative">
              {index > 0 && (
                <div className="absolute left-1/2 -top-4 -translate-x-1/2">
                  <ArrowDown className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">
                    {actionTypes.find((t) => t.value === action.type)?.label ||
                      "Action"}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Select
                      value={action.type}
                      onValueChange={(value) =>
                        updateAction(index, {
                          ...action,
                          type: value,
                          config: {},
                        })
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {actionTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAction(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>{renderActionConfig(action, index)}</CardContent>
              </Card>
            </div>
          ))}
          <div className="text-center">
            <Button variant="outline" onClick={addAction}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Action
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
