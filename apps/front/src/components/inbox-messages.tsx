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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Mail,
  MessageSquare,
  Phone,
  Flag,
  MoreHorizontal,
  Trash,
  Archive,
  UserPlus,
  Tag,
  AlertCircle,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type {
  Message,
  MessageFilter,
  MessageStatus,
  MessageType,
} from "@/types/message";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface InboxMessagesProps {
  messages: Message[];
  loading: boolean;
  onViewMessage: (message: Message) => void;
  onReplyMessage: (message: Message) => void;
  filters: MessageFilter;
  onFilterChange: (filters: MessageFilter) => void;
}

export function InboxMessages({
  messages,
  loading,
  onViewMessage,
  onReplyMessage,
  filters,
  onFilterChange,
}: InboxMessagesProps) {
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState(filters.search || "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ ...filters, search: searchQuery });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMessages(messages.map((m) => m.id));
    } else {
      setSelectedMessages([]);
    }
  };

  const handleSelectMessage = (messageId: string, checked: boolean) => {
    if (checked) {
      setSelectedMessages([...selectedMessages, messageId]);
    } else {
      setSelectedMessages(selectedMessages.filter((id) => id !== messageId));
    }
  };

  const handleBulkAction = (action: string) => {
    // In a real app, this would call an API to perform the action
    console.log(`Performing ${action} on messages:`, selectedMessages);

    // Update the UI based on the action
    if (action === "mark-read" || action === "mark-unread") {
      const newStatus: MessageStatus = action === "mark-read" ? "read" : "new";
      // Update messages status in parent component
    } else if (
      action === "archive" ||
      action === "delete" ||
      action === "flag"
    ) {
      // Handle other actions
    }

    // Clear selection after action
    setSelectedMessages([]);
  };

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

  const getMessageTypeIcon = (type: MessageType) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "sms":
        return <MessageSquare className="h-4 w-4" />;
      case "voice":
        return <Phone className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: MessageStatus) => {
    switch (status) {
      case "new":
        return (
          <Badge variant="default" className="text-xs px-1.5 py-0 h-5">
            New
          </Badge>
        );
      case "read":
        return (
          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
            Read
          </Badge>
        );
      case "replied":
        return (
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
            Replied
          </Badge>
        );
      case "unsubscribed":
        return (
          <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5">
            Unsubscribed
          </Badge>
        );
      case "flagged":
        return (
          <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5">
            Flagged
          </Badge>
        );
      case "archived":
        return (
          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
            Archived
          </Badge>
        );
      case "spam":
        return (
          <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5">
            Spam
          </Badge>
        );
      default:
        return null;
    }
  };

  const getPriorityIndicator = (priority?: string) => {
    if (!priority) return null;

    switch (priority) {
      case "urgent":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "high":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "medium":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
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

          {selectedMessages.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="whitespace-nowrap h-9">
                  Actions ({selectedMessages.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleBulkAction("mark-read")}>
                  Mark as Read
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBulkAction("mark-unread")}
                >
                  Mark as Unread
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("flag")}>
                  Flag
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("archive")}>
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("delete")}>
                  Delete
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("assign")}>
                  Assign To
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
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="hidden lg:table-cell">Campaign</TableHead>
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
            ) : messages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No messages found. Try adjusting your filters.
                </TableCell>
              </TableRow>
            ) : (
              messages.map((message) => (
                <TableRow
                  key={message.id}
                  className={cn(
                    message.status === "new" && "font-medium bg-muted/20",
                    "cursor-pointer hover:bg-muted/40",
                  )}
                  onClick={() => onViewMessage(message)}
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
                      aria-label={`Select message from ${message.from}`}
                    />
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1">
                      {getMessageTypeIcon(message.type)}
                      {getPriorityIndicator(message.priority)}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {message.from.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">
                          {message.from}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {message.email || message.phone}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell py-2">
                    <div className="font-medium text-sm">
                      {message.subject || "No Subject"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                      {message.preview}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell py-2">
                    {getStatusBadge(message.status)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell py-2 text-sm">
                    {message.campaign || "-"}
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="text-xs text-muted-foreground">
                      {formatDate(message.date)}
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
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onViewMessage(message)}
                        >
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onReplyMessage(message)}
                          disabled={message.status === "unsubscribed"}
                        >
                          Reply
                        </DropdownMenuItem>
                        <DropdownMenuItem>Forward</DropdownMenuItem>
                        <DropdownMenuItem>
                          <Flag className="mr-2 h-4 w-4" /> Flag
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Archive className="mr-2 h-4 w-4" /> Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Trash className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <UserPlus className="mr-2 h-4 w-4" /> Assign
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Tag className="mr-2 h-4 w-4" /> Add Label
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
    </div>
  );
}
