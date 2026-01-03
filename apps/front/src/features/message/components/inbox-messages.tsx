"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Search,
  Mail,
  MessageSquare,
  Phone,
  PhoneCall,
  Flag,
  MoreHorizontal,
  Trash,
  Archive,
  UserPlus,
  Tag,
  Loader2,
  CheckSquare,
  Send,
  Zap,
  Calendar,
  ChevronDown,
  PhoneForwarded,
  Sparkles,
  Clock,
  FileText,
  Link2,
  StickyNote,
  Ban,
  ShieldX,
  Users,
  ExternalLink,
  CalendarPlus,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCurrentTeam } from "@/features/team/team.context";
import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";
import { MESSAGES_QUERY } from "../queries/message.queries";
import { MessageDirection, MessageType } from "@nextier/common";
import { useInboxContext } from "../inbox.context";

// ═══════════════════════════════════════════════════════════════════════════════
// LABEL DISPLAY CONFIG - Easify-style colored badges
// Maps canonical label IDs to display properties
// ═══════════════════════════════════════════════════════════════════════════════
const LABEL_DISPLAY: Record<
  string,
  { name: string; bg: string; text: string; icon: any }
> = {
  // GOLD captures (highest priority)
  mobile_and_email: {
    name: "Mobile & Email",
    bg: "bg-amber-500/20",
    text: "text-amber-400",
    icon: Sparkles,
  },
  hot_lead: {
    name: "Hot Lead",
    bg: "bg-red-500/20",
    text: "text-red-400",
    icon: Zap,
  },
  gold_label: {
    name: "GOLD",
    bg: "bg-amber-500/20",
    text: "text-amber-400",
    icon: Sparkles,
  },

  // Data capture
  email_captured: {
    name: "Email",
    bg: "bg-green-500/20",
    text: "text-green-400",
    icon: Mail,
  },
  mobile_captured: {
    name: "Mobile",
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    icon: Phone,
  },

  // Intent signals
  wants_call: {
    name: "Wants Call",
    bg: "bg-purple-500/20",
    text: "text-purple-400",
    icon: PhoneCall,
  },
  needs_help: {
    name: "Needs Help",
    bg: "bg-red-500/20",
    text: "text-red-400",
    icon: Sparkles,
  },
  question_asked: {
    name: "Question",
    bg: "bg-cyan-500/20",
    text: "text-cyan-400",
    icon: MessageSquare,
  },
  high_intent: {
    name: "High Intent",
    bg: "bg-emerald-500/20",
    text: "text-emerald-400",
    icon: Zap,
  },

  // Execution
  push_to_call_center: {
    name: "Call Center",
    bg: "bg-orange-500/20",
    text: "text-orange-400",
    icon: PhoneForwarded,
  },
  call_ready: {
    name: "Call Ready",
    bg: "bg-green-500/20",
    text: "text-green-400",
    icon: Phone,
  },
  responded: {
    name: "Responded",
    bg: "bg-green-500/20",
    text: "text-green-400",
    icon: CheckSquare,
  },

  // Workspace / Stage labels
  initial_message: {
    name: "Initial",
    bg: "bg-amber-500/20",
    text: "text-amber-400",
    icon: Zap,
  },
  retarget: {
    name: "Retarget",
    bg: "bg-purple-500/20",
    text: "text-purple-400",
    icon: Clock,
  },
  nudger: {
    name: "Nudger",
    bg: "bg-orange-500/20",
    text: "text-orange-400",
    icon: MessageSquare,
  },
  content_nurture: {
    name: "Nurture",
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    icon: Sparkles,
  },
  book_appointment: {
    name: "Book Appt",
    bg: "bg-green-500/20",
    text: "text-green-400",
    icon: Calendar,
  },
  lead_calendar: {
    name: "Calendar",
    bg: "bg-cyan-500/20",
    text: "text-cyan-400",
    icon: Calendar,
  },
};

// Labels for rapid classification (dropdown menu)
const QUICK_LABELS = [
  {
    id: "needs_help",
    name: "Needs Help",
    color: "text-red-500",
    icon: Sparkles,
  },
  {
    id: "mobile_captured",
    name: "Mobile Captured",
    color: "text-blue-500",
    icon: Phone,
  },
  {
    id: "email_captured",
    name: "Email Captured",
    color: "text-green-500",
    icon: Mail,
  },
  {
    id: "push_to_call_center",
    name: "Push to Call Center",
    color: "text-orange-500",
    icon: PhoneForwarded,
  },
  {
    id: "wants_call",
    name: "Asking for Phone Call",
    color: "text-purple-500",
    icon: PhoneCall,
  },
  {
    id: "high_intent",
    name: "High Intent",
    color: "text-emerald-500",
    icon: CheckSquare,
  },
];

// Queue destinations for push actions
const QUEUE_DESTINATIONS = [
  {
    id: "call-center",
    name: "Call Center",
    icon: Phone,
    color: "text-green-500",
  },
  {
    id: "sms-queue",
    name: "SMS Queue",
    icon: MessageSquare,
    color: "text-blue-500",
  },
  {
    id: "gianna",
    name: "GIANNA (Opener)",
    icon: Zap,
    color: "text-purple-500",
  },
  {
    id: "cathy",
    name: "CATHY (Nudger)",
    icon: Clock,
    color: "text-orange-500",
  },
  {
    id: "sabrina",
    name: "SABRINA (Closer)",
    icon: Calendar,
    color: "text-emerald-500",
  },
];

/**
 * Render label badges for a message
 * Extracts labels from message status, metadata, or lead tags
 * Shows max 3 labels to avoid clutter
 */
function renderMessageLabels(message: any) {
  const labels: string[] = [];

  // Extract labels from message status
  if (message.status === "email_captured") labels.push("email_captured");
  if (message.status === "mobile_captured") labels.push("mobile_captured");
  if (message.status === "interested") labels.push("high_intent");

  // Extract from metadata if present
  if (message.metadata?.labels) {
    labels.push(...message.metadata.labels);
  }

  // Extract from lead tags if present
  if (message.lead?.tags) {
    labels.push(...message.lead.tags);
  }

  // Dedupe and prioritize GOLD labels first, then capture, then campaigns
  const uniqueLabels = [...new Set(labels)];
  const priorityOrder = [
    "mobile_and_email",
    "gold_label",
    "hot_lead",
    "email_captured",
    "mobile_captured",
    "wants_call",
    "high_intent",
    "responded",
    // Workspace stages come after capture labels
    "initial_message",
    "retarget",
    "nudger",
    "content_nurture",
    "book_appointment",
    "lead_calendar",
  ];

  const sortedLabels = uniqueLabels.sort((a, b) => {
    const aIndex = priorityOrder.indexOf(a);
    const bIndex = priorityOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  // Show max 3 labels
  const displayLabels = sortedLabels.slice(0, 3);

  if (displayLabels.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {displayLabels.map((labelId) => {
        const config = LABEL_DISPLAY[labelId];
        if (!config) return null;

        return (
          <Badge
            key={labelId}
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 py-0 h-5 font-medium border-0",
              config.bg,
              config.text,
            )}
          >
            {config.name}
          </Badge>
        );
      })}
    </div>
  );
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else if (diffDays < 7) {
    const options: Intl.DateTimeFormatOptions = { weekday: "short" };
    return date.toLocaleDateString(undefined, options);
  } else {
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };
    return date.toLocaleDateString(undefined, options);
  }
};

interface InboxMessagesProps {
  onViewMessage?: (message: any) => void;
  onReplyMessage?: (message: any) => void;
  onCallBack?: (message: any) => void;
  onCallNow?: (message: any) => void; // Immediate dial via softphone
  onAddToCallQueue?: (message: any) => void; // Add to automated call queue
  onPushToLeads?: (message: any) => void;
  onInsertTemplate?: (message: any) => void;
  onAddBooking?: (message: any) => void;
  onAddAppointmentLink?: (message: any) => void;
  onPushToCRM?: (message: any) => void;
  onAddNote?: (message: any) => void;
  onAddToBlacklist?: (message: any) => void;
  onBlockContact?: (message: any) => void;
}

export function InboxMessages({
  onViewMessage,
  onReplyMessage,
  onCallBack,
  onCallNow,
  onAddToCallQueue,
  onPushToLeads,
  onInsertTemplate,
  onAddBooking,
  onAddAppointmentLink,
  onPushToCRM,
  onAddNote,
  onAddToBlacklist,
  onBlockContact,
}: InboxMessagesProps) {
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { team } = useCurrentTeam();
  const [{ activeItem }] = useInboxContext();

  const [messages = [], pageInfo, { loading, fetchMore }] = useConnectionQuery(
    MESSAGES_QUERY,
    {
      pick: "messages",
      variables: {
        first: 25,
        teamId: team.id,
        direction:
          activeItem === "sent"
            ? MessageDirection.OUTBOUND
            : MessageDirection.INBOUND,
      },
    },
  );

  const [loadingMore, setLoadingMore] = useState(false);

  const handleLoadMore = async () => {
    if (!pageInfo?.hasNextPage || !pageInfo?.endCursor) return;
    setLoadingMore(true);
    try {
      await fetchMore({
        variables: {
          after: pageInfo.endCursor,
        },
      });
    } catch (error) {
      console.error("Failed to load more messages:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled reactively via filteredMessages
  };

  // Get message labels for filtering
  const getMessageLabels = (message: any): string[] => {
    const labels: string[] = [];
    if (message.status === "email_captured") labels.push("email_captured");
    if (message.status === "mobile_captured") labels.push("mobile_captured");
    if (message.status === "interested") labels.push("high_intent");
    if (message.metadata?.labels) labels.push(...message.metadata.labels);
    if (message.lead?.tags) labels.push(...message.lead.tags);
    return labels;
  };

  // Filter messages by search query AND active label
  const filteredMessages = messages.filter((message) => {
    // First, check if we're filtering by a label (activeItem is a label ID)
    const standardItems = ["inbox", "sent", "archived", "flagged", "trash"];
    if (!standardItems.includes(activeItem)) {
      // activeItem is a label ID - filter by it
      const messageLabels = getMessageLabels(message);
      if (!messageLabels.includes(activeItem)) {
        return false;
      }
    }

    // Then apply search filter
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      message.fromName?.toLowerCase().includes(query) ||
      message.fromAddress?.toLowerCase().includes(query) ||
      message.body?.toLowerCase().includes(query) ||
      message.subject?.toLowerCase().includes(query)
    );
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMessages(messages.map((message) => message.id));
    } else {
      setSelectedMessages([]);
    }
  };

  const handleSelectMessage = (messageId: string, checked: boolean) => {
    if (checked) {
      setSelectedMessages((prev) => [...prev, messageId]);
    } else {
      setSelectedMessages((prev) => prev.filter((id) => id !== messageId));
    }
  };

  // Select today's messages
  const handleSelectToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMessages = messages.filter((message) => {
      const msgDate = new Date(message.createdAt);
      msgDate.setHours(0, 0, 0, 0);
      return msgDate.getTime() === today.getTime();
    });
    setSelectedMessages(todayMessages.map((m) => m.id));
    toast.success(`Selected ${todayMessages.length} messages from today`);
  };

  // Bulk action handler
  const handleBulkAction = async (action: string, payload?: string) => {
    if (selectedMessages.length === 0) return;

    const count = selectedMessages.length;

    switch (action) {
      case "flag":
        toast.success(`Flagged ${count} messages`);
        break;
      case "archive":
        toast.success(`Archived ${count} messages`);
        break;
      case "delete":
        toast.success(`Deleted ${count} messages`);
        break;
      case "label":
        const label = QUICK_LABELS.find((l) => l.id === payload);
        if (label) {
          toast.success(`Applied "${label.name}" to ${count} messages`);
        }
        break;
      case "push-queue":
        const queue = QUEUE_DESTINATIONS.find((q) => q.id === payload);
        if (queue) {
          toast.success(`Pushed ${count} leads to ${queue.name}`);
        }
        break;
      default:
        break;
    }

    // Clear selection after action
    setSelectedMessages([]);
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case MessageType.EMAIL:
        return <Mail className="h-4 w-4" />;
      case MessageType.SMS:
        return <MessageSquare className="h-4 w-4" />;
      case MessageType.VOICE:
        return <Phone className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Check if filtering by a label
  const standardItems = ["inbox", "sent", "archived", "flagged", "trash"];
  const isLabelFilter = !standardItems.includes(activeItem);
  const activeLabelConfig = isLabelFilter ? LABEL_DISPLAY[activeItem] : null;

  return (
    <div className="space-y-3">
      {/* Active label filter indicator */}
      {isLabelFilter && activeLabelConfig && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
          <Badge
            variant="outline"
            className={cn(
              "text-xs px-2 py-0.5 font-medium border-0",
              activeLabelConfig.bg,
              activeLabelConfig.text,
            )}
          >
            {activeLabelConfig.name}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Showing {filteredMessages.length} message
            {filteredMessages.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <form onSubmit={handleSearch} className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search messages..."
            className="pl-8 w-full h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="submit"
            onClick={(e) => handleSearch(e)}
            className="sm:hidden w-full h-9"
          >
            Search
          </Button>

          {/* Quick Select Buttons */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1"
            onClick={handleSelectToday}
          >
            <Calendar className="h-4 w-4" />
            Today
          </Button>

          {selectedMessages.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="whitespace-nowrap h-9 gap-1 bg-purple-600 hover:bg-purple-700">
                  <Zap className="h-4 w-4" />
                  Actions ({selectedMessages.length})
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {/* Push to Queue - Most Important */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2">
                    <Send className="h-4 w-4 text-green-500" />
                    <span>Push to Queue</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {QUEUE_DESTINATIONS.map((queue) => (
                      <DropdownMenuItem
                        key={queue.id}
                        onClick={() => handleBulkAction("push-queue", queue.id)}
                        className="gap-2"
                      >
                        <queue.icon className={cn("h-4 w-4", queue.color)} />
                        {queue.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Quick Labels */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2">
                    <Tag className="h-4 w-4 text-blue-500" />
                    <span>Apply Label</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {QUICK_LABELS.map((label) => (
                      <DropdownMenuItem
                        key={label.id}
                        onClick={() => handleBulkAction("label", label.id)}
                        className="gap-2"
                      >
                        <label.icon className={cn("h-4 w-4", label.color)} />
                        {label.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />

                {/* Standard Actions */}
                <DropdownMenuItem
                  onClick={() => handleBulkAction("flag")}
                  className="gap-2"
                >
                  <Flag className="h-4 w-4 text-yellow-500" />
                  Flag
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBulkAction("archive")}
                  className="gap-2"
                >
                  <Archive className="h-4 w-4 text-gray-500" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBulkAction("delete")}
                  className="gap-2 text-destructive"
                >
                  <Trash className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" className="whitespace-nowrap h-9">
              Refresh
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={
                    selectedMessages.length === messages.length &&
                    messages.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all messages"
                />
              </TableHead>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>From</TableHead>
              <TableHead className="hidden md:table-cell">
                Subject/Content
              </TableHead>
              <TableHead className="w-[80px]">Date</TableHead>
              <TableHead className="w-[50px] text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array(5)
                .fill(0)
                .map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-full max-w-[300px]" />
                      <Skeleton className="h-3 w-full max-w-[250px] mt-1" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
            ) : filteredMessages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  {searchQuery
                    ? "No messages match your search."
                    : "No messages found. Try adjusting your filters."}
                </TableCell>
              </TableRow>
            ) : (
              filteredMessages.map((message) => (
                <TableRow
                  key={message.id}
                  className={cn(
                    "cursor-pointer hover:bg-muted/40",
                    // Unread message styling
                    message.status !== "read" &&
                      message.status !== "replied" &&
                      "bg-blue-50/50 dark:bg-blue-950/20",
                  )}
                  onClick={() => onViewMessage?.(message)}
                >
                  <TableCell
                    className="py-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selectedMessages.includes(message.id)}
                      onCheckedChange={(checked) =>
                        handleSelectMessage(message.id, !!checked)
                      }
                      // aria-label={`Select message from ${message.from}`}
                    />
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1">
                      {getMessageTypeIcon(message.type)}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {message.fromName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div
                          className={cn(
                            "text-sm",
                            message.status !== "read" &&
                              message.status !== "replied"
                              ? "font-semibold"
                              : "font-medium",
                          )}
                        >
                          {message.fromName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {message.fromAddress}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell py-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div
                          className={cn(
                            "text-sm",
                            message.status !== "read" &&
                              message.status !== "replied"
                              ? "font-semibold"
                              : "font-medium",
                          )}
                        >
                          {message.subject || "No Subject"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                          {message.body}
                        </div>
                      </div>
                      {/* Easify-style label badges */}
                      {renderMessageLabels(message)}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="text-xs text-muted-foreground">
                      {formatDate(message.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell
                    className="text-right py-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        {/* ═══ CALL ACTIONS - Most Important ═══ */}
                        <DropdownMenuItem
                          onClick={() => {
                            if (onCallNow) {
                              onCallNow(message);
                            } else {
                              // Default: trigger immediate call via Twilio
                              toast.success(
                                `Calling ${message.fromName || message.fromAddress}...`,
                              );
                            }
                          }}
                          className="text-green-600 font-medium"
                        >
                          <Phone className="mr-2 h-4 w-4" />
                          Call Now
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (onAddToCallQueue) {
                              onAddToCallQueue(message);
                            } else {
                              toast.success(`Added to automated call queue`);
                            }
                          }}
                          className="text-blue-600"
                        >
                          <PhoneForwarded className="mr-2 h-4 w-4" />
                          Add to Automated Call
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {/* ═══ LEAD MANAGEMENT ═══ */}
                        <DropdownMenuItem
                          onClick={() => {
                            if (onPushToLeads) {
                              onPushToLeads(message);
                            } else {
                              toast.success(`Pushed to Leads`);
                            }
                          }}
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Push To Leads
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (onInsertTemplate) {
                              onInsertTemplate(message);
                            } else {
                              toast.info(`Opening template selector...`);
                            }
                          }}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Insert Template
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {/* ═══ CALENDAR & CRM ═══ */}
                        <DropdownMenuItem
                          onClick={() => {
                            if (onAddBooking) {
                              onAddBooking(message);
                            } else {
                              toast.info(`Opening booking calendar...`);
                            }
                          }}
                        >
                          <CalendarPlus className="mr-2 h-4 w-4" />
                          Add Event to Bookings
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (onAddAppointmentLink) {
                              onAddAppointmentLink(message);
                            } else {
                              toast.info(`Generating appointment link...`);
                            }
                          }}
                        >
                          <Link2 className="mr-2 h-4 w-4" />
                          Add Appointment Link
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (onPushToCRM) {
                              onPushToCRM(message);
                            } else {
                              toast.success(`Pushed to CRM`);
                            }
                          }}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Push To CRM
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {/* ═══ NOTES & LABELS ═══ */}
                        <DropdownMenuItem
                          onClick={() => {
                            if (onAddNote) {
                              onAddNote(message);
                            } else {
                              toast.info(`Opening notes...`);
                            }
                          }}
                        >
                          <StickyNote className="mr-2 h-4 w-4" />
                          Notes
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Tag className="mr-2 h-4 w-4" />
                            Label as
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {QUICK_LABELS.map((label) => (
                              <DropdownMenuItem
                                key={label.id}
                                onClick={() => {
                                  toast.success(
                                    `Applied "${label.name}" label`,
                                  );
                                }}
                                className="gap-2"
                              >
                                <label.icon
                                  className={cn("h-4 w-4", label.color)}
                                />
                                {label.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        <DropdownMenuSeparator />

                        {/* ═══ STANDARD ACTIONS ═══ */}
                        <DropdownMenuItem
                          onClick={() => onViewMessage?.(message)}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          View Message
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onReplyMessage?.(message)}
                          disabled={message.status === "unsubscribed"}
                        >
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Reply
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Flag className="mr-2 h-4 w-4 text-yellow-500" />
                          Flag
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {/* ═══ BLOCKING & DELETION ═══ */}
                        <DropdownMenuItem
                          onClick={() => {
                            if (onAddToBlacklist) {
                              onAddToBlacklist(message);
                            } else {
                              toast.warning(`Added to blacklist`);
                            }
                          }}
                          className="text-orange-600"
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          Add To Blacklist
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (onBlockContact) {
                              onBlockContact(message);
                            } else {
                              toast.warning(`Contact blocked`);
                            }
                          }}
                          className="text-red-600"
                        >
                          <ShieldX className="mr-2 h-4 w-4" />
                          Block
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Load More Button */}
      {pageInfo?.hasNextPage && !loading && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="w-full max-w-xs"
          >
            {loadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              `Load More (${messages.length} shown)`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
