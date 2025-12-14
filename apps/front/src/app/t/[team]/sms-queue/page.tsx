"use client";

import { sf, sfd } from "@/lib/utils/safe-format";
import * as React from "react";
import { useState, useMemo } from "react";
import {
  Send,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  Play,
  Pause,
  Search,
  Filter,
  MoreHorizontal,
  Calendar,
  User,
  MessageSquare,
  Sparkles,
  Plus,
  ChevronLeft,
  ChevronRight,
  Zap,
  Mail,
  PhoneCall,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useGlobalActions } from "@/lib/providers/global-actions-provider";
import {
  SMSCampaignSetup,
  SMSCampaignConfig,
} from "@/components/sms-campaign-setup";

// Schedule timeline item type
interface ScheduleItem {
  id: string;
  type: "sms" | "call" | "blast" | "sequence";
  time: Date;
  name: string;
  count?: number;
  status: "pending" | "active" | "completed";
}

export default function SMSQueuePage() {
  const {
    smsCampaignQueue,
    removeFromSMSQueue,
    scheduledCalls,
    removeScheduledCall,
    openSMSDialog,
    openScheduleCallDialog,
  } = useGlobalActions();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"sms" | "calls" | "schedule">(
    "schedule",
  );
  const [isCampaignSetupOpen, setIsCampaignSetupOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date());

  // Generate mock schedule for the week
  const weekSchedule = useMemo(() => {
    const items: ScheduleItem[] = [];
    const today = new Date();

    // Generate sample schedule items
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      // Morning SMS blast
      if (i % 2 === 0) {
        items.push({
          id: `blast-${i}`,
          type: "blast",
          time: new Date(date.setHours(9, 0, 0, 0)),
          name: "Morning SMS Blast",
          count: 150 + Math.floor(Math.random() * 100),
          status: i === 0 ? "active" : "pending",
        });
      }

      // Scheduled calls
      items.push({
        id: `call-${i}-1`,
        type: "call",
        time: new Date(date.setHours(10, 30, 0, 0)),
        name: "Priority Callbacks",
        count: 12 + Math.floor(Math.random() * 8),
        status: "pending",
      });

      // Sequence
      if (i % 3 === 0) {
        items.push({
          id: `seq-${i}`,
          type: "sequence",
          time: new Date(date.setHours(14, 0, 0, 0)),
          name: "NC Retarget Sequence",
          count: 75 + Math.floor(Math.random() * 50),
          status: "pending",
        });
      }

      // Afternoon calls
      items.push({
        id: `call-${i}-2`,
        type: "call",
        time: new Date(date.setHours(15, 0, 0, 0)),
        name: "New Lead Follow-ups",
        count: 8 + Math.floor(Math.random() * 6),
        status: "pending",
      });
    }

    return items;
  }, []);

  // Get items for selected day
  const selectedDayItems = useMemo(() => {
    return weekSchedule
      .filter((item) => item.time.toDateString() === selectedDay.toDateString())
      .sort((a, b) => a.time.getTime() - b.time.getTime());
  }, [weekSchedule, selectedDay]);

  // Get week days for navigation
  const weekDays = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  }, []);

  // Handle campaign setup submission
  const handleCampaignSubmit = (config: SMSCampaignConfig) => {
    console.log("Campaign created:", config);
    // Here you would typically create the campaign via API
    // For now, we just close the dialog
    setIsCampaignSetupOpen(false);
  };

  // Filter SMS queue
  const filteredSMSQueue = useMemo(() => {
    return smsCampaignQueue.filter((entry) => {
      const matchesSearch =
        !searchQuery ||
        entry.leadName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.leadPhone.includes(searchQuery);

      const matchesStatus =
        statusFilter === "all" || entry.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [smsCampaignQueue, searchQuery, statusFilter]);

  // Filter scheduled calls
  const filteredCalls = useMemo(() => {
    return scheduledCalls.filter((call) => {
      const matchesSearch =
        !searchQuery ||
        call.leadName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        call.leadPhone.includes(searchQuery);

      const matchesStatus =
        statusFilter === "all" || call.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [scheduledCalls, searchQuery, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "queued":
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
          >
            Pending
          </Badge>
        );
      case "sent":
      case "completed":
        return (
          <Badge
            variant="outline"
            className="bg-green-500/10 text-green-600 border-green-500/20"
          >
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge
            variant="outline"
            className="bg-red-500/10 text-red-600 border-red-500/20"
          >
            Failed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge
            variant="outline"
            className="bg-gray-500/10 text-gray-600 border-gray-500/20"
          >
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: Date) => {
    return sfd(date, "en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const stats = useMemo(() => {
    const smsStats = {
      total: smsCampaignQueue.length,
      queued: smsCampaignQueue.filter((s) => s.status === "queued").length,
      sent: smsCampaignQueue.filter((s) => s.status === "sent").length,
      failed: smsCampaignQueue.filter((s) => s.status === "failed").length,
    };
    const callStats = {
      total: scheduledCalls.length,
      pending: scheduledCalls.filter((c) => c.status === "pending").length,
      completed: scheduledCalls.filter((c) => c.status === "completed").length,
      cancelled: scheduledCalls.filter((c) => c.status === "cancelled").length,
    };
    return { sms: smsStats, calls: callStats };
  }, [smsCampaignQueue, scheduledCalls]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Send className="h-6 w-6" />
              Outreach Queue
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your SMS campaigns and scheduled calls
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openScheduleCallDialog()}
            >
              <Phone className="h-4 w-4 mr-2" />
              Schedule Call
            </Button>
            <Button variant="outline" size="sm" onClick={() => openSMSDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Quick Add
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCampaignSetupOpen(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-6 border-b">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Send className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.sms.queued}</p>
                  <p className="text-xs text-muted-foreground">SMS Queued</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.sms.sent}</p>
                  <p className="text-xs text-muted-foreground">SMS Sent</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Phone className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.calls.pending}</p>
                  <p className="text-xs text-muted-foreground">
                    Calls Scheduled
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.calls.completed}</p>
                  <p className="text-xs text-muted-foreground">
                    Calls Completed
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Tabs */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex bg-muted rounded-lg p-1">
            <Button
              variant={activeTab === "schedule" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("schedule")}
              className="gap-2"
            >
              <CalendarDays className="h-4 w-4" />
              Schedule
            </Button>
            <Button
              variant={activeTab === "sms" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("sms")}
              className="gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              SMS Queue ({stats.sms.total})
            </Button>
            <Button
              variant={activeTab === "calls" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("calls")}
              className="gap-2"
            >
              <Phone className="h-4 w-4" />
              Scheduled Calls ({stats.calls.total})
            </Button>
          </div>

          <div className="flex-1" />

          {/* Search and Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Schedule Timeline View */}
        {activeTab === "schedule" && (
          <div className="space-y-4">
            {/* Week Day Selector */}
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 grid grid-cols-7 gap-1">
                {weekDays.map((day) => {
                  const isSelected =
                    day.toDateString() === selectedDay.toDateString();
                  const isToday =
                    day.toDateString() === new Date().toDateString();
                  const dayItems = weekSchedule.filter(
                    (item) => item.time.toDateString() === day.toDateString(),
                  );
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        "p-2 rounded-lg text-center transition-all",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : isToday
                            ? "bg-primary/10"
                            : "hover:bg-muted-foreground/10",
                      )}
                    >
                      <p className="text-xs font-medium">
                        {day.toLocaleDateString("en-US", { weekday: "short" })}
                      </p>
                      <p
                        className={cn(
                          "text-lg font-bold",
                          isToday && !isSelected && "text-primary",
                        )}
                      >
                        {day.getDate()}
                      </p>
                      <div className="flex justify-center gap-0.5 mt-1">
                        {dayItems.slice(0, 4).map((item, i) => (
                          <div
                            key={i}
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              item.type === "blast" && "bg-purple-500",
                              item.type === "call" && "bg-green-500",
                              item.type === "sequence" && "bg-blue-500",
                              item.type === "sms" && "bg-orange-500",
                            )}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Day Schedule */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {selectedDay.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </CardTitle>
                  <Badge variant="outline">
                    {selectedDayItems.length} scheduled items
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {selectedDayItems.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No scheduled items</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setIsCampaignSetupOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Schedule Campaign
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDayItems.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-lg border",
                          item.status === "active" &&
                            "bg-primary/5 border-primary",
                        )}
                      >
                        {/* Time */}
                        <div className="text-center min-w-[60px]">
                          <p className="font-mono text-sm font-medium">
                            {item.time.toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </p>
                        </div>

                        {/* Icon */}
                        <div
                          className={cn(
                            "h-10 w-10 rounded-lg flex items-center justify-center",
                            item.type === "blast" &&
                              "bg-purple-500/10 text-purple-500",
                            item.type === "call" &&
                              "bg-green-500/10 text-green-500",
                            item.type === "sequence" &&
                              "bg-blue-500/10 text-blue-500",
                            item.type === "sms" &&
                              "bg-orange-500/10 text-orange-500",
                          )}
                        >
                          {item.type === "blast" && <Zap className="h-5 w-5" />}
                          {item.type === "call" && (
                            <PhoneCall className="h-5 w-5" />
                          )}
                          {item.type === "sequence" && (
                            <Send className="h-5 w-5" />
                          )}
                          {item.type === "sms" && (
                            <MessageSquare className="h-5 w-5" />
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.count}{" "}
                            {item.type === "call" ? "calls" : "recipients"}
                          </p>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              item.status === "active" ? "default" : "outline"
                            }
                            className={cn(
                              item.status === "active" && "bg-green-500",
                              item.status === "completed" && "bg-gray-500",
                            )}
                          >
                            {item.status === "active" && (
                              <Play className="h-3 w-3 mr-1 fill-current" />
                            )}
                            {item.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Zap className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {weekSchedule.filter((i) => i.type === "blast").length}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Blasts This Week
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <PhoneCall className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {weekSchedule
                          .filter((i) => i.type === "call")
                          .reduce((sum, i) => sum + (i.count || 0), 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Scheduled Calls
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Send className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {
                          weekSchedule.filter((i) => i.type === "sequence")
                            .length
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Active Sequences
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <Mail className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {weekSchedule.reduce(
                          (sum, i) => sum + (i.count || 0),
                          0,
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total Outreach
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* SMS Queue Table */}
        {activeTab === "sms" && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSMSQueue.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">
                        No messages in queue
                      </p>
                      <div className="flex items-center justify-center gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openSMSDialog()}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Quick Add
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => setIsCampaignSetupOpen(true)}
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          New Campaign
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSMSQueue.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4" />
                          </div>
                          <span className="font-medium">
                            {entry.leadName || "Unknown"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {entry.leadPhone}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="truncate text-sm text-muted-foreground">
                          {entry.message ||
                            `Template: ${entry.templateId || "Default"}`}
                        </p>
                      </TableCell>
                      <TableCell>
                        {entry.scheduledAt ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {formatDate(entry.scheduledAt)}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            ASAP
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">P{entry.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => removeFromSMSQueue(entry.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Scheduled Calls Table */}
        {activeTab === "calls" && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Phone className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">
                        No calls scheduled
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => openScheduleCallDialog()}
                      >
                        Schedule Call
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCalls.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4" />
                          </div>
                          <span className="font-medium">
                            {call.leadName || "Unknown"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {call.leadPhone}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3" />
                          {formatDate(call.scheduledAt)}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="truncate text-sm text-muted-foreground">
                          {call.notes || "No notes"}
                        </p>
                      </TableCell>
                      <TableCell>{getStatusBadge(call.status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">P{call.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => removeScheduledCall(call.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* SMS Campaign Setup Dialog */}
      <SMSCampaignSetup
        isOpen={isCampaignSetupOpen}
        onClose={() => setIsCampaignSetupOpen(false)}
        selectedCount={0}
        dataType="property"
        onSubmit={handleCampaignSubmit}
      />
    </div>
  );
}
