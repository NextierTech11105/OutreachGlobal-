"use client";

import { CreateWorkflowDto, createWorkflowSchema } from "@nextier/dto";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { zodResolver } from "@/lib/hook-form/resolvers/zod";
import { useForm } from "@/lib/hook-form/hooks/use-form";
import { FormItem } from "@/components/ui/form/form-item";
import { Label } from "@/components/ui/label";
import { FieldErrors } from "@/components/errors/field-errors";
import { Controller, useWatch } from "react-hook-form";
import { FormDescription } from "@/components/ui/form/form-description";

// Define trigger events
const triggerEvents = [
  { label: "Lead Created", value: "lead_created" },
  { label: "Lead Updated", value: "lead_updated" },
  { label: "Campaign Started", value: "campaign_started" },
  { label: "Skip Trace Complete (Has Mobile)", value: "skip_trace_complete" },
  { label: "Lead Has Mobile", value: "lead_has_mobile" },
  { label: "Response Received", value: "response_received" },
  { label: "Hot Lead Detected", value: "hot_lead_detected" },
];

// Define action types
const actionTypes = [
  { label: "Update Lead Status", value: "lead_update_status" },
  { label: "Add Notes", value: "lead_add_notes" },
  { label: "Add Tag", value: "add_tag" },
  { label: "Remove Tag", value: "remove_tag" },
  { label: "Send SMS (Initial Library)", value: "send_sms_initial" },
  { label: "Add to SMS Queue (Batch 250)", value: "add_to_sms_queue" },
  { label: "Schedule Call", value: "schedule_call" },
  { label: "Assign AI SDR (Gianna)", value: "assign_ai_sdr" },
  { label: "Move to Bucket", value: "move_to_bucket" },
];

// SMS Template categories
const smsTemplateCategories = [
  { label: "Medium Article Invite", value: "sms_initial_medium_article" },
  { label: "Strategy Session", value: "strategy_session_sms" },
  { label: "Gianna Nielsen Loop", value: "gianna_nielsen_loop" },
  { label: "Initial Outreach", value: "sms_initial" },
];

// Response buckets
const responseBuckets = [
  { label: "Hot Leads", value: "hot" },
  { label: "Warm Leads", value: "warm" },
  { label: "Cold Leads", value: "cold" },
  { label: "Not Interested", value: "not_interested" },
  { label: "Bad Data", value: "bad_data" },
];

interface Props {
  onSubmit: (input: CreateWorkflowDto) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function WorkflowForm({ onSubmit, onCancel, loading = false }: Props) {
  // Initialize form
  const { handleSubmit, register, registerError, control, setValue } = useForm({
    resolver: zodResolver(createWorkflowSchema),
    defaultValues: {
      name: "",
      description: "",
      trigger: "",
      active: true,
      priority: 5,
      actions: [
        {
          name: "",
          value: "",
        },
      ],
    },
  });
  const [currentActions] = useWatch({ control, name: ["actions"] });
  // Add action
  const addAction = () => {
    setValue("actions", [...currentActions, { name: "", value: "" }]);
  };

  // Remove action
  const removeAction = (index: number) => {
    if (currentActions.length > 1) {
      setValue(
        "actions",
        currentActions.filter((_, i) => i !== index),
      );
    }
  };

  // Handle form submission
  const onFormSubmit = (input: CreateWorkflowDto) => {
    onSubmit(input);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormItem>
          <Label htmlFor="name">Rule Name</Label>
          <Input id="name" {...register("name")} />
          <FieldErrors {...registerError("name")} />
        </FormItem>

        <FormItem>
          <Label htmlFor="triggerEvent">Trigger Event</Label>
          <Controller
            control={control}
            name="trigger"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id="triggerEvent">
                  <SelectValue placeholder="Select a trigger event" />
                </SelectTrigger>
                <SelectContent>
                  {triggerEvents.map((event) => (
                    <SelectItem key={event.value} value={event.value}>
                      {event.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldErrors {...registerError("trigger")} />
        </FormItem>
      </div>

      <FormItem>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Enter a description for this rule"
          {...register("description")}
        />
        <FieldErrors {...registerError("description")} />
      </FormItem>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="isActive" className="text-base">
              Active Status
            </Label>
            <FormDescription>
              Enable or disable this automation rule
            </FormDescription>
          </div>
          <Controller
            control={control}
            name="active"
            render={({ field }) => (
              <Switch
                id="isActive"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </FormItem>

        <FormItem>
          <Label htmlFor="priority">Priority (1-10)</Label>
          <Input
            id="priority"
            type="number"
            min={1}
            max={10}
            {...register("priority", {
              valueAsNumber: true,
              onChange: (e) => {
                const value = Number.parseInt(e.target.value);
                return value;
              },
            })}
          />
          <FormDescription>
            Higher priority rules run first (10 is highest)
          </FormDescription>
          <FieldErrors {...registerError("priority")} />
        </FormItem>
      </div>

      {/* Actions Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Actions</h3>
          <Button type="button" variant="outline" size="sm" onClick={addAction}>
            <Plus className="h-4 w-4 mr-1" /> Add Action
          </Button>
        </div>

        <div className="space-y-4">
          {currentActions.map((action, index) => (
            <Card key={index}>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between">
                  <Label>Action Type</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAction(index)}
                    disabled={currentActions.length === 1}
                  >
                    <X className="size-4" />
                    <span className="sr-only">Remove action</span>
                  </Button>
                </div>

                <FormItem>
                  <Controller
                    control={control}
                    name={`actions.${index}.name`}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) =>
                          setValue(`actions.${index}.name`, value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select action type" />
                        </SelectTrigger>
                        <SelectContent>
                          {actionTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldErrors {...registerError(`actions.${index}.name`)} />
                </FormItem>

                {action.name === "lead_update_status" && (
                  <FormItem>
                    <Label>New Status</Label>
                    <Controller
                      control={control}
                      name={`actions.${index}.value`}
                      render={({ field }) => (
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select new status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="qualified">Qualified</SelectItem>
                            <SelectItem value="proposal">Proposal</SelectItem>
                            <SelectItem value="won">Won</SelectItem>
                            <SelectItem value="lost">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormItem>
                )}

                {action.name === "add_tag" && (
                  <FormItem>
                    <Label>Tag</Label>
                    <Input
                      placeholder="Enter tag name"
                      {...register(`actions.${index}.value`)}
                    />
                  </FormItem>
                )}

                {action.name === "lead_add_notes" && (
                  <FormItem>
                    <Label>Notes</Label>
                    <Textarea
                      placeholder="Enter notes"
                      {...register(`actions.${index}.value`)}
                      required
                    />
                    <FieldErrors {...registerError(`actions.${index}.value`)} />
                  </FormItem>
                )}

                {action.name === "send_sms_initial" && (
                  <FormItem>
                    <Label>SMS Template Category</Label>
                    <Controller
                      control={control}
                      name={`actions.${index}.value`}
                      render={({ field }) => (
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select template category" />
                          </SelectTrigger>
                          <SelectContent>
                            {smsTemplateCategories.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FormDescription>
                      Templates from this category will be used for initial
                      outreach
                    </FormDescription>
                  </FormItem>
                )}

                {action.name === "add_to_sms_queue" && (
                  <div className="space-y-4">
                    <FormItem>
                      <Label>Batch Size</Label>
                      <Input
                        type="number"
                        placeholder="250"
                        defaultValue={250}
                        {...register(`actions.${index}.value`)}
                      />
                      <FormDescription>
                        Number of SMS to send per batch (max 250 recommended)
                      </FormDescription>
                    </FormItem>
                    <FormItem>
                      <Label>Max SMS Per Day</Label>
                      <Input
                        type="number"
                        placeholder="2000"
                        defaultValue={2000}
                        {...register(`actions.${index}.extra`)}
                      />
                      <FormDescription>
                        Daily limit for SMS sends (compliance: 2000 max)
                      </FormDescription>
                    </FormItem>
                  </div>
                )}

                {action.name === "move_to_bucket" && (
                  <FormItem>
                    <Label>Destination Bucket</Label>
                    <Controller
                      control={control}
                      name={`actions.${index}.value`}
                      render={({ field }) => (
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select bucket" />
                          </SelectTrigger>
                          <SelectContent>
                            {responseBuckets.map((bucket) => (
                              <SelectItem
                                key={bucket.value}
                                value={bucket.value}
                              >
                                {bucket.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormItem>
                )}

                {action.name === "remove_tag" && (
                  <FormItem>
                    <Label>Tag to Remove</Label>
                    <Input
                      placeholder="Enter tag name"
                      {...register(`actions.${index}.value`)}
                    />
                  </FormItem>
                )}

                {action.name === "schedule_call" && (
                  <FormItem>
                    <Label>Call Delay (minutes)</Label>
                    <Input
                      type="number"
                      placeholder="30"
                      defaultValue={30}
                      {...register(`actions.${index}.value`)}
                    />
                    <FormDescription>
                      Schedule call after this many minutes
                    </FormDescription>
                  </FormItem>
                )}

                {action.name === "assign_ai_sdr" && (
                  <FormItem>
                    <Label>AI SDR Personality</Label>
                    <Controller
                      control={control}
                      name={`actions.${index}.value`}
                      render={({ field }) => (
                        <Select
                          value={field.value || "brooklyn_bestie"}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Gianna personality" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="brooklyn_bestie">
                              Brooklyn Bestie 🗽
                            </SelectItem>
                            <SelectItem value="sharp_professional">
                              Sharp Professional 💼
                            </SelectItem>
                            <SelectItem value="hustler_heart">
                              Hustler Heart 🔥
                            </SelectItem>
                            <SelectItem value="wise_mentor">
                              Wise Mentor 🦉
                            </SelectItem>
                            <SelectItem value="playful_closer">
                              Playful Closer 😄
                            </SelectItem>
                            <SelectItem value="empathetic_advisor">
                              Empathetic Advisor 💚
                            </SelectItem>
                            <SelectItem value="straight_shooter">
                              Straight Shooter 🎯
                            </SelectItem>
                            <SelectItem value="charming_connector">
                              Charming Connector 🤝
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FormDescription>
                      Gianna&apos;s personality for handling this lead
                    </FormDescription>
                  </FormItem>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          Save Automation Rule
        </Button>
      </div>
    </form>
  );
}
