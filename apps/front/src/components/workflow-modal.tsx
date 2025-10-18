"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import type { Workflow } from "@/types/workflow";
import { WorkflowTriggerSelector } from "./workflow-trigger-selector";

const workflowSchema = z.object({
  name: z.string().min(3, {
    message: "Workflow name must be at least 3 characters.",
  }),
  description: z.string().optional(),
  trigger: z.string({
    required_error: "Please select a trigger event.",
  }),
  actions: z
    .array(
      z.object({
        type: z.string(),
        config: z.record(z.any()),
      }),
    )
    .optional()
    .default([]),
  status: z.enum(["active", "draft", "archived"]).default("draft"),
});

type WorkflowFormValues = z.infer<typeof workflowSchema>;

interface WorkflowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow?: Workflow;
  onSave: (workflow: WorkflowFormValues) => void;
}

export function WorkflowModal({
  open,
  onOpenChange,
  workflow,
  onSave,
}: WorkflowModalProps) {
  const isEditing = !!workflow;

  const form = useForm<WorkflowFormValues>({
    resolver: zodResolver(workflowSchema),
    defaultValues: workflow || {
      name: "",
      description: "",
      trigger: "",
      actions: [],
      status: "draft",
    },
  });

  function onSubmit(data: WorkflowFormValues) {
    onSave(data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Workflow" : "Create Workflow"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your workflow settings and automation rules."
              : "Configure a new automated workflow to streamline your processes."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workflow Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter workflow name" {...field} />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for your workflow
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this workflow does"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trigger"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trigger Event</FormLabel>
                  <FormControl>
                    <WorkflowTriggerSelector
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={form.formState.isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    This event will trigger the workflow
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Only active workflows will run automatically
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions section would go here - this would be more complex and involve
                a dynamic form for adding multiple actions with different configurations */}

            <DialogFooter>
              <Button type="submit">
                {isEditing ? "Update Workflow" : "Create Workflow"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
