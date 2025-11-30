"use client";

import { useState } from "react";
import { gql, useMutation, useQuery, TypedDocumentNode } from "@apollo/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MoreHorizontal,
  Phone,
  MessageSquare,
  Ban,
  MoveRight,
  Calendar,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useCurrentTeam } from "@/features/team/team.context";
import { toast } from "sonner";
import {
  LeadKanbanQuery,
  LeadKanbanQueryVariables,
  UpdateLeadMutation,
  UpdateLeadMutationVariables,
} from "@/graphql/types";

// Query for lead statuses
const LEAD_STATUSES_QUERY = gql`
  query LeadStatusesForActions($teamId: ID!) {
    leadStatuses(teamId: $teamId) {
      id
    }
  }
`;

// Mutation for updating lead status
const UPDATE_LEAD_STATUS_MUTATION: TypedDocumentNode<
  UpdateLeadMutation,
  UpdateLeadMutationVariables
> = gql`
  mutation UpdateLeadStatus($teamId: ID!, $id: ID!, $input: UpdateLeadInput!) {
    updateLead(teamId: $teamId, id: $id, input: $input) {
      lead {
        id
        status
      }
    }
  }
`;

// Mutation for adding to suppression list (blacklist)
const ADD_TO_SUPPRESSION_MUTATION = gql`
  mutation AddToSuppression($teamId: ID!, $input: CreateSuppressionInput!) {
    createSuppression(teamId: $teamId, input: $input) {
      id
    }
  }
`;

// Mutation for scheduling a call
const SCHEDULE_CALL_MUTATION = gql`
  mutation ScheduleCall($teamId: ID!, $input: ScheduleCallInput!) {
    scheduleCall(teamId: $teamId, input: $input) {
      id
    }
  }
`;

// Mutation for scheduling an SMS
const SCHEDULE_SMS_MUTATION = gql`
  mutation ScheduleSms($teamId: ID!, $input: ScheduleSmsInput!) {
    scheduleSms(teamId: $teamId, input: $input) {
      id
    }
  }
`;

interface LeadActionsProps {
  lead: {
    id: string;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    status?: string | null;
  };
  variant?: "icon" | "button";
  onStatusChange?: (newStatus: string) => void;
  onEnrichComplete?: () => void;
}

export function LeadActions({
  lead,
  variant = "icon",
  onStatusChange,
  onEnrichComplete,
}: LeadActionsProps) {
  const { team } = useCurrentTeam();
  const [scheduleCallOpen, setScheduleCallOpen] = useState(false);
  const [scheduleSmsOpen, setScheduleSmsOpen] = useState(false);
  const [blacklistOpen, setBlacklistOpen] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichResultOpen, setEnrichResultOpen] = useState(false);
  const [enrichResult, setEnrichResult] = useState<{
    found: boolean;
    person?: {
      name: string;
      email: string;
      phone: string;
      title: string;
      company: string;
      linkedin: string;
    };
    message?: string;
  } | null>(null);

  // Schedule call state
  const [callDate, setCallDate] = useState("");
  const [callTime, setCallTime] = useState("");
  const [callNotes, setCallNotes] = useState("");

  // Schedule SMS state
  const [smsDate, setSmsDate] = useState("");
  const [smsTime, setSmsTime] = useState("");
  const [smsMessage, setSmsMessage] = useState("");

  // Blacklist state
  const [blacklistReason, setBlacklistReason] = useState("");

  // Query for statuses
  const { data: statusesData } = useQuery(LEAD_STATUSES_QUERY, {
    variables: { teamId: team.id },
  });

  // Mutations
  const [updateLeadStatus, { loading: updatingStatus }] = useMutation(
    UPDATE_LEAD_STATUS_MUTATION,
    {
      onCompleted: (data) => {
        toast.success("Lead status updated");
        onStatusChange?.(data.updateLead.lead.status || "");
      },
      onError: (error) => {
        toast.error("Failed to update status: " + error.message);
      },
    }
  );

  const [addToSuppression, { loading: blacklisting }] = useMutation(
    ADD_TO_SUPPRESSION_MUTATION,
    {
      onCompleted: () => {
        toast.success("Lead added to blacklist");
        setBlacklistOpen(false);
        setBlacklistReason("");
      },
      onError: (error) => {
        toast.error("Failed to blacklist: " + error.message);
      },
    }
  );

  const [scheduleCall, { loading: schedulingCall }] = useMutation(
    SCHEDULE_CALL_MUTATION,
    {
      onCompleted: () => {
        toast.success("Call scheduled successfully");
        setScheduleCallOpen(false);
        setCallDate("");
        setCallTime("");
        setCallNotes("");
      },
      onError: (error) => {
        toast.error("Failed to schedule call: " + error.message);
      },
    }
  );

  const [scheduleSms, { loading: schedulingSms }] = useMutation(
    SCHEDULE_SMS_MUTATION,
    {
      onCompleted: () => {
        toast.success("SMS scheduled successfully");
        setScheduleSmsOpen(false);
        setSmsDate("");
        setSmsTime("");
        setSmsMessage("");
      },
      onError: (error) => {
        toast.error("Failed to schedule SMS: " + error.message);
      },
    }
  );

  const handleStatusChange = (newStatus: string) => {
    updateLeadStatus({
      variables: {
        teamId: team.id,
        id: lead.id,
        input: { status: newStatus },
      },
    });
  };

  const handleScheduleCall = () => {
    if (!callDate || !callTime) {
      toast.error("Please select date and time");
      return;
    }
    const scheduledAt = new Date(`${callDate}T${callTime}`).toISOString();
    scheduleCall({
      variables: {
        teamId: team.id,
        input: {
          leadId: lead.id,
          scheduledAt,
          notes: callNotes || undefined,
        },
      },
    });
  };

  const handleScheduleSms = () => {
    if (!smsDate || !smsTime || !smsMessage) {
      toast.error("Please fill in all fields");
      return;
    }
    const scheduledAt = new Date(`${smsDate}T${smsTime}`).toISOString();
    scheduleSms({
      variables: {
        teamId: team.id,
        input: {
          leadId: lead.id,
          scheduledAt,
          message: smsMessage,
        },
      },
    });
  };

  const handleBlacklist = () => {
    if (!lead.phone) {
      toast.error("Lead has no phone number to blacklist");
      return;
    }
    addToSuppression({
      variables: {
        teamId: team.id,
        input: {
          phoneNumber: lead.phone,
          type: "BLACKLIST",
          reason: blacklistReason || "Manual blacklist",
        },
      },
    });
  };

  const statuses = statusesData?.leadStatuses?.map((s: { id: string }) => s.id) || [];

  // Apollo.io Enrichment
  const handleEnrich = async () => {
    if (!lead.name && !lead.email) {
      toast.error("Lead needs a name or email to enrich");
      return;
    }

    setEnriching(true);
    try {
      // Parse name into first/last
      const nameParts = (lead.name || "").split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const response = await fetch("/api/apollo-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enrich-person",
          email: lead.email || undefined,
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          reveal_phone_number: true,
        }),
      });

      const data = await response.json();

      if (data.person) {
        const phone = data.person.phone_numbers?.find(
          (p: { type: string }) => p.type === "mobile" || p.type === "work_direct"
        );

        setEnrichResult({
          found: true,
          person: {
            name: data.person.name,
            email: data.person.email,
            phone: phone?.sanitized_number || "",
            title: data.person.title,
            company: data.person.organization?.name || "",
            linkedin: data.person.linkedin_url,
          },
        });

        // Auto-update lead if we found new data
        const updates: Record<string, string> = {};
        if (!lead.email && data.person.email) {
          updates.email = data.person.email;
        }
        if (!lead.phone && phone?.sanitized_number) {
          updates.phone = phone.sanitized_number;
        }

        if (Object.keys(updates).length > 0) {
          await updateLeadStatus({
            variables: {
              teamId: team.id,
              id: lead.id,
              input: updates,
            },
          });
          toast.success("Lead enriched with new contact data!");
          onEnrichComplete?.();
        } else {
          toast.info("No new data found for this lead");
        }

        setEnrichResultOpen(true);
      } else {
        setEnrichResult({
          found: false,
          message: "No matching contact found in Apollo.io",
        });
        setEnrichResultOpen(true);
      }
    } catch (error) {
      console.error("Enrichment error:", error);
      toast.error("Failed to enrich lead");
    } finally {
      setEnriching(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {variant === "icon" ? (
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
            </Button>
          ) : (
            <Button variant="outline" size="sm">
              Actions
              <MoreHorizontal className="ml-2 size-4" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => setScheduleCallOpen(true)}
            className="cursor-pointer"
          >
            <Phone className="mr-2 size-4" />
            Schedule Call
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setScheduleSmsOpen(true)}
            className="cursor-pointer"
          >
            <MessageSquare className="mr-2 size-4" />
            Schedule SMS
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleEnrich}
            disabled={enriching}
            className="cursor-pointer text-blue-600 focus:text-blue-600"
          >
            {enriching ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 size-4" />
            )}
            {enriching ? "Enriching..." : "Enrich with Apollo.io"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
              <MoveRight className="mr-2 size-4" />
              Move to Status
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {statuses.map((status: string) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={status === lead.status || updatingStatus}
                  className="cursor-pointer"
                >
                  {status === lead.status && "✓ "}
                  {status}
                </DropdownMenuItem>
              ))}
              {statuses.length === 0 && (
                <DropdownMenuItem disabled>No statuses available</DropdownMenuItem>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setBlacklistOpen(true)}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <Ban className="mr-2 size-4" />
            Blacklist
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Schedule Call Dialog */}
      <Dialog open={scheduleCallOpen} onOpenChange={setScheduleCallOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Call</DialogTitle>
            <DialogDescription>
              Schedule a call with {lead.name || "this lead"}
              {lead.phone && ` at ${lead.phone}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="call-date">Date</Label>
                <Input
                  id="call-date"
                  type="date"
                  value={callDate}
                  onChange={(e) => setCallDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="call-time">Time</Label>
                <Input
                  id="call-time"
                  type="time"
                  value={callTime}
                  onChange={(e) => setCallTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="call-notes">Notes (optional)</Label>
              <Textarea
                id="call-notes"
                placeholder="Add any notes for this call..."
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleCallOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleCall} disabled={schedulingCall}>
              {schedulingCall && <Loader2 className="mr-2 size-4 animate-spin" />}
              <Calendar className="mr-2 size-4" />
              Schedule Call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule SMS Dialog */}
      <Dialog open={scheduleSmsOpen} onOpenChange={setScheduleSmsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule SMS</DialogTitle>
            <DialogDescription>
              Schedule an SMS to {lead.name || "this lead"}
              {lead.phone && ` at ${lead.phone}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sms-date">Date</Label>
                <Input
                  id="sms-date"
                  type="date"
                  value={smsDate}
                  onChange={(e) => setSmsDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sms-time">Time</Label>
                <Input
                  id="sms-time"
                  type="time"
                  value={smsTime}
                  onChange={(e) => setSmsTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sms-message">Message</Label>
              <Textarea
                id="sms-message"
                placeholder="Enter your SMS message..."
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                {smsMessage.length}/160 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleSmsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleSms} disabled={schedulingSms}>
              {schedulingSms && <Loader2 className="mr-2 size-4 animate-spin" />}
              <Calendar className="mr-2 size-4" />
              Schedule SMS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Blacklist Confirmation Dialog */}
      <Dialog open={blacklistOpen} onOpenChange={setBlacklistOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Blacklist Lead</DialogTitle>
            <DialogDescription>
              Are you sure you want to blacklist {lead.name || "this lead"}
              {lead.phone && ` (${lead.phone})`}? They will no longer receive any
              communications.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="blacklist-reason">Reason (optional)</Label>
              <Textarea
                id="blacklist-reason"
                placeholder="Enter reason for blacklisting..."
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlacklistOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBlacklist}
              disabled={blacklisting || !lead.phone}
            >
              {blacklisting && <Loader2 className="mr-2 size-4 animate-spin" />}
              <Ban className="mr-2 size-4" />
              Blacklist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enrichment Results Dialog */}
      <Dialog open={enrichResultOpen} onOpenChange={setEnrichResultOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-blue-500" />
              Apollo.io Enrichment Results
            </DialogTitle>
          </DialogHeader>
          {enrichResult?.found ? (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-medium">{enrichResult.person?.name || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Title</Label>
                  <p className="font-medium">{enrichResult.person?.title || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{enrichResult.person?.email || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{enrichResult.person?.phone || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Company</Label>
                  <p className="font-medium">{enrichResult.person?.company || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">LinkedIn</Label>
                  {enrichResult.person?.linkedin ? (
                    <a
                      href={enrichResult.person.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-500 hover:underline"
                    >
                      View Profile
                    </a>
                  ) : (
                    <p className="font-medium">-</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">
                {enrichResult?.message || "No results found"}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setEnrichResultOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
