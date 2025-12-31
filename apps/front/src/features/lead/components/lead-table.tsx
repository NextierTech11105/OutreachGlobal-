"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentTeam } from "@/features/team/team.context";
import { createDefaultCursor } from "@/graphql/graphql-utils";
import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";
import { useState } from "react";
import { LEADS_QUERY } from "../queries/lead.queries";
import { Badge } from "@/components/ui/badge";
import { CursorPagination } from "@/components/pagination/cursor-pagination";
import { LoadingOverlay } from "@/components/ui/loading/loading-overlay";
import { Card, CardContent } from "@/components/ui/card";
import { useMultiSelection } from "@/hooks/use-multi-selection";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useApiError } from "@/hooks/use-api-error";
import { useModalAlert } from "@/components/ui/modal";
import { useMutation } from "@apollo/client";
import { BULK_DELETE_LEAD_MUTATION } from "../mutations/lead.mutations";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontalIcon,
  Send,
  Clock,
  Mail,
  Phone,
  PhoneCall,
  MessageSquare,
  Loader2,
  CalendarPlus,
} from "lucide-react";
import { TeamLink } from "@/features/team/components/team-link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LIMIT = 15;

// Bulk outreach types
type OutreachType = "sms" | "email" | "call";
type OutreachTiming = "now" | "scheduled";

const defaultCursor = createDefaultCursor({
  first: LIMIT,
});

export const LeadTable = () => {
  const { teamId, isTeamReady } = useCurrentTeam();
  const [cursor, setCursor] = useState(defaultCursor);

  // Bulk outreach state
  const [outreachDialog, setOutreachDialog] = useState<{
    open: boolean;
    type: OutreachType;
    timing: OutreachTiming;
  }>({ open: false, type: "sms", timing: "now" });
  const [outreachMessage, setOutreachMessage] = useState("");
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("9:00");

  // Calendar scheduling state
  const [calendarDialog, setCalendarDialog] = useState(false);
  const [calendarDate, setCalendarDate] = useState("");
  const [calendarLoading, setCalendarLoading] = useState(false);

  const [leads, pageInfo, { loading, refetch }] = useConnectionQuery(
    LEADS_QUERY,
    {
      pick: "leads",
      skip: !isTeamReady,
      variables: {
        ...cursor,
        teamId,
      },
    },
  );

  const [
    selectedLeads,
    {
      checkedState,
      handleToggleSelectAll,
      toggleSelect,
      isChecked,
      setSelected,
    },
  ] = useMultiSelection<{ id: string }>({
    itemsTotal: leads?.length || 0,
  });

  const { showAlert } = useModalAlert();
  const { showError } = useApiError();
  const [bulkDelete] = useMutation(BULK_DELETE_LEAD_MUTATION);

  // Early return AFTER all hooks
  if (!isTeamReady) {
    return null;
  }

  const confirmBulkDelete = () => {
    showAlert({
      title: `delete ${selectedLeads.length} lead(s)`,
      description:
        "Are you sure you want to delete these leads? This action cannot be undone.",
      onConfirm: async () => {
        try {
          await bulkDelete({
            variables: {
              teamId,
              leadIds: selectedLeads.map((lead) => lead.id),
            },
          });

          await refetch({ ...defaultCursor });
          setCursor(defaultCursor);

          toast.success(`deleted ${selectedLeads.length} lead(s)`);
          setSelected([]);
        } catch (error) {
          showError(error, { gql: true });
        }
      },
    });
  };

  // Schedule leads to calendar
  const scheduleToCalendar = async () => {
    if (selectedLeads.length === 0 || !calendarDate) return;

    setCalendarLoading(true);
    try {
      const selectedLeadDetails =
        leads?.filter((lead: { id: string }) =>
          selectedLeads.some((s) => s.id === lead.id),
        ) || [];

      const response = await fetch("/api/calendar/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule_to_calendar",
          leads: selectedLeadDetails.map(
            (lead: {
              id: string;
              firstName?: string;
              lastName?: string;
              phone?: string;
              email?: string;
              propertyAddress?: string;
              propertyCity?: string;
              propertyState?: string;
            }) => ({
              id: lead.id,
              name:
                [lead.firstName, lead.lastName].filter(Boolean).join(" ") ||
                "Unknown",
              phone: lead.phone,
              email: lead.email,
              address: lead.propertyAddress,
              city: lead.propertyCity,
              state: lead.propertyState,
            }),
          ),
          scheduledDate: calendarDate,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(
          `${data.scheduled} leads scheduled for ${new Date(calendarDate).toLocaleDateString()}`,
          {
            description: "View them in the Calendar workspace",
          },
        );
        setCalendarDialog(false);
        setCalendarDate("");
        setSelected([]);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Calendar scheduling error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to schedule leads",
      );
    } finally {
      setCalendarLoading(false);
    }
  };

  // Open bulk outreach dialog
  const openOutreachDialog = (type: OutreachType, timing: OutreachTiming) => {
    setOutreachDialog({ open: true, type, timing });
    // Set default message based on type
    if (type === "sms") {
      setOutreachMessage(
        "Hi {name}, this is {agent} from NexTier. I wanted to reach out about your property at {address}. Do you have a few minutes to chat?",
      );
    } else if (type === "email") {
      setOutreachMessage(
        "Hi {name},\n\nI hope this message finds you well. I'm reaching out regarding your property at {address}.\n\nI'd love to discuss some opportunities with you.\n\nBest regards",
      );
    }
  };

  // Execute bulk outreach
  const executeBulkOutreach = async () => {
    if (selectedLeads.length === 0) return;

    setOutreachLoading(true);
    try {
      // Get lead details from the current leads list
      const selectedLeadDetails =
        leads?.filter((lead: { id: string }) =>
          selectedLeads.some((s) => s.id === lead.id),
        ) || [];

      const leadsWithContact = selectedLeadDetails.filter(
        (lead: { phone?: string; email?: string }) => {
          if (outreachDialog.type === "sms" || outreachDialog.type === "call") {
            return lead.phone;
          }
          return lead.email;
        },
      );

      if (leadsWithContact.length === 0) {
        toast.error(
          `No leads with ${outreachDialog.type === "email" ? "email" : "phone"} found`,
        );
        setOutreachLoading(false);
        return;
      }

      // Calculate scheduled time if needed
      let scheduledAt: string | undefined;
      if (outreachDialog.timing === "scheduled") {
        const now = new Date();
        const [hours] = scheduleTime.split(":").map(Number);
        const schedDate = new Date(now);
        schedDate.setHours(hours, 0, 0, 0);
        // If time is past today, schedule for tomorrow
        if (schedDate <= now) {
          schedDate.setDate(schedDate.getDate() + 1);
        }
        scheduledAt = schedDate.toISOString();
      }

      if (outreachDialog.type === "sms") {
        // Use existing SMS Queue API
        const response = await fetch("/api/sms/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add_batch",
            leads: leadsWithContact.map(
              (lead: {
                id: string;
                name?: string;
                phone?: string;
                address?: string;
              }) => ({
                id: lead.id,
                name: lead.name || "Friend",
                phone: lead.phone,
                address: lead.address,
              }),
            ),
            templateMessage: outreachMessage,
            templateCategory: "sms_initial",
            priority: 5,
            scheduledAt,
          }),
        });

        const data = await response.json();
        if (data.success) {
          toast.success(
            `${data.added} leads added to SMS queue${data.skipped > 0 ? ` (${data.skipped} skipped - opted out)` : ""}`,
          );
        } else {
          throw new Error(data.error);
        }
      } else if (outreachDialog.type === "email") {
        // Use email batch API
        const response = await fetch("/api/email/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leads: leadsWithContact.map(
              (lead: {
                id: string;
                name?: string;
                email?: string;
                address?: string;
              }) => ({
                id: lead.id,
                name: lead.name || "Friend",
                email: lead.email,
                address: lead.address,
              }),
            ),
            subject: "Regarding your property",
            body: outreachMessage,
            scheduledAt,
          }),
        });

        const data = await response.json();
        if (data.success || response.ok) {
          toast.success(
            `${leadsWithContact.length} emails ${scheduledAt ? "scheduled" : "queued"}`,
          );
        } else {
          throw new Error(data.error || "Failed to send emails");
        }
      } else if (outreachDialog.type === "call") {
        // Add to call queue/dialer
        const response = await fetch("/api/call-center/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add_batch",
            leads: leadsWithContact.map(
              (lead: {
                id: string;
                name?: string;
                phone?: string;
                address?: string;
              }) => ({
                id: lead.id,
                name: lead.name,
                phone: lead.phone,
                address: lead.address,
              }),
            ),
            scheduledAt,
            priority: 5,
          }),
        });

        const data = await response.json();
        if (data.success || response.ok) {
          toast.success(
            `${leadsWithContact.length} leads added to ${scheduledAt ? "scheduled calls" : "dialer queue"}`,
          );
        } else {
          throw new Error(data.error || "Failed to add to call queue");
        }
      }

      setOutreachDialog({ open: false, type: "sms", timing: "now" });
      setSelected([]);
    } catch (error) {
      console.error("Bulk outreach error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send outreach",
      );
    } finally {
      setOutreachLoading(false);
    }
  };

  return (
    <Card className="relative overflow-hidden">
      {loading && <LoadingOverlay />}
      {selectedLeads.length > 0 && (
        <CardContent
          variant="table-checkbox"
          className="flex justify-between items-center border-t bg-muted py-3"
        >
          <div className="flex items-center gap-x-2">
            <Checkbox
              checked={checkedState}
              onCheckedChange={handleToggleSelectAll([])}
            />

            <span className="text-sm text-muted-foreground font-medium">
              {selectedLeads.length} lead(s) selected
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* SMS Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="xs"
                  variant="default"
                  className="gap-1 bg-blue-600 hover:bg-blue-700"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  SMS
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => openOutreachDialog("sms", "now")}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Now
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => openOutreachDialog("sms", "scheduled")}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Schedule
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Email Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="xs"
                  variant="default"
                  className="gap-1 bg-green-600 hover:bg-green-700"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => openOutreachDialog("email", "now")}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Now
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => openOutreachDialog("email", "scheduled")}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Schedule
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Call Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="xs"
                  variant="default"
                  className="gap-1 bg-purple-600 hover:bg-purple-700"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Call
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => openOutreachDialog("call", "now")}
                >
                  <PhoneCall className="h-4 w-4 mr-2" />
                  Add to Dialer
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => openOutreachDialog("call", "scheduled")}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Schedule Calls
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Calendar Actions */}
            <Button
              size="xs"
              variant="default"
              className="gap-1 bg-orange-600 hover:bg-orange-700"
              onClick={() => setCalendarDialog(true)}
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              Calendar
            </Button>

            <DropdownMenuSeparator className="h-6 w-px bg-border mx-1" />

            <Button size="xs" variant="destructive" onClick={confirmBulkDelete}>
              Delete
            </Button>
          </div>
        </CardContent>
      )}

      {/* Bulk Outreach Dialog */}
      <Dialog
        open={outreachDialog.open}
        onOpenChange={(open) =>
          setOutreachDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {outreachDialog.type === "sms" && (
                <MessageSquare className="h-5 w-5 text-blue-500" />
              )}
              {outreachDialog.type === "email" && (
                <Mail className="h-5 w-5 text-green-500" />
              )}
              {outreachDialog.type === "call" && (
                <Phone className="h-5 w-5 text-purple-500" />
              )}
              {outreachDialog.timing === "now" ? "Send" : "Schedule"}{" "}
              {outreachDialog.type.toUpperCase()} to {selectedLeads.length}{" "}
              Leads
            </DialogTitle>
            <DialogDescription>
              {outreachDialog.type === "call"
                ? outreachDialog.timing === "now"
                  ? "Add these leads to your power dialer queue"
                  : "Schedule calls for these leads"
                : outreachDialog.timing === "now"
                  ? `Send ${outreachDialog.type.toUpperCase()} immediately to selected leads`
                  : `Schedule ${outreachDialog.type.toUpperCase()} for selected leads`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {outreachDialog.timing === "scheduled" && (
              <div className="space-y-2">
                <Label>Schedule Time</Label>
                <Select value={scheduleTime} onValueChange={setScheduleTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9:00">9:00 AM</SelectItem>
                    <SelectItem value="10:00">10:00 AM</SelectItem>
                    <SelectItem value="11:00">11:00 AM</SelectItem>
                    <SelectItem value="12:00">12:00 PM</SelectItem>
                    <SelectItem value="13:00">1:00 PM</SelectItem>
                    <SelectItem value="14:00">2:00 PM</SelectItem>
                    <SelectItem value="15:00">3:00 PM</SelectItem>
                    <SelectItem value="16:00">4:00 PM</SelectItem>
                    <SelectItem value="17:00">5:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {outreachDialog.type !== "call" && (
              <div className="space-y-2">
                <Label>
                  {outreachDialog.type === "sms" ? "Message" : "Email Body"}
                </Label>
                <Textarea
                  value={outreachMessage}
                  onChange={(e) => setOutreachMessage(e.target.value)}
                  rows={outreachDialog.type === "email" ? 6 : 3}
                  placeholder={
                    outreachDialog.type === "sms"
                      ? "Enter SMS message..."
                      : "Enter email content..."
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Variables: {"{name}"}, {"{address}"}, {"{agent}"}
                </p>
              </div>
            )}

            {outreachDialog.type === "call" && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm">
                  <strong>{selectedLeads.length}</strong> leads will be added to
                  your{" "}
                  {outreachDialog.timing === "now"
                    ? "power dialer queue"
                    : "scheduled call list"}
                  .
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setOutreachDialog({ open: false, type: "sms", timing: "now" })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={executeBulkOutreach}
              disabled={outreachLoading}
              className={
                outreachDialog.type === "sms"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : outreachDialog.type === "email"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-purple-600 hover:bg-purple-700"
              }
            >
              {outreachLoading && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {outreachDialog.timing === "now"
                ? outreachDialog.type === "call"
                  ? "Add to Dialer"
                  : "Send Now"
                : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Calendar Schedule Dialog */}
      <Dialog open={calendarDialog} onOpenChange={setCalendarDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-orange-500" />
              Schedule to Calendar
            </DialogTitle>
            <DialogDescription>
              Schedule {selectedLeads.length} leads for follow-up on a specific
              date
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Follow-up Date</Label>
              <input
                type="date"
                value={calendarDate}
                onChange={(e) => setCalendarDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                title="Select follow-up date"
                aria-label="Follow-up date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm">
                <strong>{selectedLeads.length}</strong> leads will be scheduled
                for follow-up. You can view and work them from the Calendar
                workspace.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCalendarDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={scheduleToCalendar}
              disabled={calendarLoading || !calendarDate}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {calendarLoading && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Table>
        {!selectedLeads.length && (
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={checkedState}
                  onCheckedChange={handleToggleSelectAll(leads || [])}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
        )}
        <TableBody>
          {!loading && !leads?.length && (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                no leads found
              </TableCell>
            </TableRow>
          )}
          {leads?.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell className="w-10">
                <div className="flex">
                  <Checkbox
                    checked={isChecked(lead)}
                    onCheckedChange={toggleSelect(lead)}
                  />
                </div>
              </TableCell>
              <TableCell>{lead.name || "-"}</TableCell>
              <TableCell>{lead.email || "-"}</TableCell>
              <TableCell>{lead.address || "-"}</TableCell>
              <TableCell>{lead.phone || "-"}</TableCell>
              <TableCell>
                <Badge variant="secondary">{lead.status}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{lead.score}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <MoreHorizontalIcon className="size-5" />
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <TeamLink href={`/leads/${lead.id}`}>Details</TeamLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <TeamLink href={`/leads/${lead.id}/edit`}>Edit</TeamLink>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {!!pageInfo && (
        <CursorPagination
          data={pageInfo}
          onPageChange={setCursor}
          variant="table-footer"
          className="border-t"
          limit={LIMIT}
        />
      )}
    </Card>
  );
};
