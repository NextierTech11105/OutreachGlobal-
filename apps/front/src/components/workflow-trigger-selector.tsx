"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TriggerOption {
  value: string;
  label: string;
  category: string;
}

interface WorkflowTriggerSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function WorkflowTriggerSelector({
  value,
  onValueChange,
  disabled,
}: WorkflowTriggerSelectorProps) {
  const [open, setOpen] = React.useState(false);

  const triggerOptions: TriggerOption[] = [
    // Lead Management Triggers
    {
      value: "lead_created",
      label: "When a new lead is created",
      category: "Lead Management",
    },
    {
      value: "lead_updated",
      label: "When a lead is updated",
      category: "Lead Management",
    },
    {
      value: "lead_status_changed",
      label: "When a lead's status changes",
      category: "Lead Management",
    },
    {
      value: "lead_source_changed",
      label: "When a lead's source changes",
      category: "Lead Management",
    },
    {
      value: "lead_assigned",
      label: "When a lead is assigned",
      category: "Lead Management",
    },
    {
      value: "lead_unassigned",
      label: "When a lead is unassigned",
      category: "Lead Management",
    },
    {
      value: "lead_score_changed",
      label: "When a lead's score changes",
      category: "Lead Management",
    },
    {
      value: "lead_tag_added",
      label: "When a tag is added to a lead",
      category: "Lead Management",
    },
    {
      value: "lead_tag_removed",
      label: "When a tag is removed from a lead",
      category: "Lead Management",
    },
    {
      value: "lead_property_updated",
      label: "When a lead's property details change",
      category: "Lead Management",
    },

    // Communication Triggers
    {
      value: "email_received",
      label: "When an email is received",
      category: "Communication",
    },
    {
      value: "email_opened",
      label: "When an email is opened",
      category: "Communication",
    },
    {
      value: "email_clicked",
      label: "When an email link is clicked",
      category: "Communication",
    },
    {
      value: "email_bounced",
      label: "When an email bounces",
      category: "Communication",
    },
    {
      value: "email_replied",
      label: "When an email is replied to",
      category: "Communication",
    },
    {
      value: "sms_received",
      label: "When an SMS is received",
      category: "Communication",
    },
    {
      value: "sms_delivered",
      label: "When an SMS is delivered",
      category: "Communication",
    },
    {
      value: "sms_failed",
      label: "When an SMS fails to deliver",
      category: "Communication",
    },
    {
      value: "voicemail_received",
      label: "When a voicemail is received",
      category: "Communication",
    },

    // Call Center Triggers
    {
      value: "call_received",
      label: "When a call is received",
      category: "Call Center",
    },
    {
      value: "call_completed",
      label: "When a call is completed",
      category: "Call Center",
    },
    {
      value: "call_missed",
      label: "When a call is missed",
      category: "Call Center",
    },
    {
      value: "call_duration_exceeded",
      label: "When a call exceeds duration threshold",
      category: "Call Center",
    },
    {
      value: "call_transferred",
      label: "When a call is transferred",
      category: "Call Center",
    },
    {
      value: "call_recording_available",
      label: "When a call recording is available",
      category: "Call Center",
    },

    // Campaign Triggers
    {
      value: "campaign_started",
      label: "When a campaign starts",
      category: "Campaigns",
    },
    {
      value: "campaign_completed",
      label: "When a campaign is completed",
      category: "Campaigns",
    },
    {
      value: "campaign_milestone_reached",
      label: "When a campaign reaches a milestone",
      category: "Campaigns",
    },
    {
      value: "campaign_performance_threshold",
      label: "When campaign performance hits threshold",
      category: "Campaigns",
    },
    {
      value: "campaign_budget_threshold",
      label: "When campaign budget reaches threshold",
      category: "Campaigns",
    },

    // Form & Website Triggers
    {
      value: "form_submitted",
      label: "When a form is submitted",
      category: "Forms & Website",
    },
    {
      value: "form_abandoned",
      label: "When a form is abandoned",
      category: "Forms & Website",
    },
    {
      value: "website_visited",
      label: "When website is visited",
      category: "Forms & Website",
    },
    {
      value: "specific_page_visited",
      label: "When a specific page is visited",
      category: "Forms & Website",
    },
    {
      value: "time_on_page_threshold",
      label: "When time on page exceeds threshold",
      category: "Forms & Website",
    },

    // CRM Integration Triggers
    {
      value: "zoho_record_created",
      label: "When a Zoho record is created",
      category: "CRM Integration",
    },
    {
      value: "zoho_record_updated",
      label: "When a Zoho record is updated",
      category: "CRM Integration",
    },
    {
      value: "zoho_deal_stage_changed",
      label: "When a Zoho deal stage changes",
      category: "CRM Integration",
    },
    {
      value: "zoho_deal_closed",
      label: "When a Zoho deal is closed",
      category: "CRM Integration",
    },

    // Data & System Triggers
    {
      value: "data_import_completed",
      label: "When a data import completes",
      category: "Data & System",
    },
    {
      value: "data_export_completed",
      label: "When a data export completes",
      category: "Data & System",
    },
    {
      value: "data_verification_completed",
      label: "When data verification completes",
      category: "Data & System",
    },
    {
      value: "system_error_occurred",
      label: "When a system error occurs",
      category: "Data & System",
    },
    {
      value: "api_rate_limit_approaching",
      label: "When API rate limit is approaching",
      category: "Data & System",
    },

    // Time-based Triggers
    { value: "scheduled", label: "On a schedule", category: "Time-based" },
    {
      value: "scheduled_daily",
      label: "Daily at specific time",
      category: "Time-based",
    },
    {
      value: "scheduled_weekly",
      label: "Weekly on specific day",
      category: "Time-based",
    },
    {
      value: "scheduled_monthly",
      label: "Monthly on specific date",
      category: "Time-based",
    },
    {
      value: "inactivity_threshold",
      label: "After period of inactivity",
      category: "Time-based",
    },
    {
      value: "follow_up_due",
      label: "When follow-up is due",
      category: "Time-based",
    },

    // User & Team Triggers
    {
      value: "user_logged_in",
      label: "When a user logs in",
      category: "Users & Teams",
    },
    {
      value: "user_role_changed",
      label: "When a user's role changes",
      category: "Users & Teams",
    },
    {
      value: "team_assignment_changed",
      label: "When team assignment changes",
      category: "Users & Teams",
    },
    {
      value: "quota_reached",
      label: "When a quota is reached",
      category: "Users & Teams",
    },

    // AI & Analytics Triggers
    {
      value: "ai_insight_generated",
      label: "When AI generates an insight",
      category: "AI & Analytics",
    },
    {
      value: "anomaly_detected",
      label: "When an anomaly is detected",
      category: "AI & Analytics",
    },
    {
      value: "conversion_rate_threshold",
      label: "When conversion rate hits threshold",
      category: "AI & Analytics",
    },
    {
      value: "roi_threshold",
      label: "When ROI hits threshold",
      category: "AI & Analytics",
    },
  ];

  // Group options by category
  const groupedOptions = triggerOptions.reduce(
    (acc, option) => {
      if (!acc[option.category]) {
        acc[option.category] = [];
      }
      acc[option.category].push(option);
      return acc;
    },
    {} as Record<string, TriggerOption[]>,
  );

  // Sort categories
  const sortedCategories = Object.keys(groupedOptions).sort();

  const selectedOption = triggerOptions.find(
    (option) => option.value === value,
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedOption ? selectedOption.label : "Select a trigger event"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search trigger events..." />
          <CommandEmpty>No trigger event found.</CommandEmpty>
          <CommandList>
            <ScrollArea className="h-[300px]">
              {sortedCategories.map((category) => (
                <CommandGroup key={category} heading={category}>
                  {groupedOptions[category].map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => {
                        onValueChange(option.value);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.value ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
