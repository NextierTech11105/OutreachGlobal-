"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, gql } from "@apollo/client";
import { useCurrentTeam } from "@/features/team/team.context";
import { toast } from "sonner";

const CREATE_WORKFLOW_MUTATION = gql`
  mutation CreateWorkflow($teamId: ID!, $input: CreateWorkflowInput!) {
    createWorkflow(teamId: $teamId, input: $input) {
      id
      name
    }
  }
`;

interface WorkflowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TRIGGER_OPTIONS = [
  { value: "lead_created", label: "Lead Created" },
  { value: "lead_status_changed", label: "Lead Status Changed" },
  { value: "message_received", label: "Message Received" },
  { value: "no_response", label: "No Response (After X Days)" },
];

export function WorkflowModal({ open, onOpenChange }: WorkflowModalProps) {
  const { teamId } = useCurrentTeam();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState("");
  const [loading, setLoading] = useState(false);

  const [createWorkflow] = useMutation(CREATE_WORKFLOW_MUTATION);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !trigger) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      await createWorkflow({
        variables: {
          teamId,
          input: {
            name,
            description,
            trigger,
          },
        },
      });
      toast.success("Workflow created");
      onOpenChange(false);
      setName("");
      setDescription("");
      setTrigger("");
    } catch (error) {
      toast.error("Failed to create workflow");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Automation Rule</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Rule Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter rule name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Trigger Event</Label>
            <Select value={trigger} onValueChange={setTrigger}>
              <SelectTrigger>
                <SelectValue placeholder="Select a trigger" />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Rule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
