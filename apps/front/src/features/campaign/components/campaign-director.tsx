"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  MoreHorizontal,
  Calendar,
  List,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MessageCircle,
  CheckCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createDefaultCursor } from "@/graphql/graphql-utils";
import { useCurrentTeam } from "@/features/team/team.context";
import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";
import { CAMPAIGNS_QUERY } from "../queries/campaign.queries";
import { useDebounceValue } from "usehooks-ts";
import { CursorPagination } from "@/components/pagination/cursor-pagination";
import { LoadingOverlay } from "@/components/ui/loading/loading-overlay";
import { TeamLink } from "@/features/team/components/team-link";
import { useModalAlert } from "@/components/ui/modal";
import { useMutation } from "@apollo/client";
import { DELETE_CAMPAIGN_MUTATION } from "../mutations/campaign.mutations";
import { toast } from "sonner";
import { useApiError } from "@/hooks/use-api-error";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LIMIT = 10;

// Worker colors for calendar events
const WORKER_COLORS = {
  gianna: { bg: "bg-purple-500", text: "text-purple-100", border: "border-purple-600" },
  cathy: { bg: "bg-orange-500", text: "text-orange-100", border: "border-orange-600" },
  sabrina: { bg: "bg-emerald-500", text: "text-emerald-100", border: "border-emerald-600" },
  default: { bg: "bg-blue-500", text: "text-blue-100", border: "border-blue-600" },
};

// Calendar helper functions
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const defaultCursor = createDefaultCursor({
  first: LIMIT,
});

export function CampaignDirector() {
  const { team } = useCurrentTeam();
  const router = useRouter();
  const [cursor, setCursor] = useState(defaultCursor);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery] = useDebounceValue(searchQuery, 350);
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [currentDate, setCurrentDate] = useState(new Date());

  const [campaigns, pageInfo, { loading, refetch }] = useConnectionQuery(
    CAMPAIGNS_QUERY,
    {
      pick: "campaigns",
      variables: {
        ...cursor,
        teamId: team.id,
        searchQuery: debouncedQuery || undefined,
      },
    },
  );

  const [deleteCampaign] = useMutation(DELETE_CAMPAIGN_MUTATION);
  const { showError } = useApiError();
  const { showAlert } = useModalAlert();

  const confirmDelete = (id: string) => {
    showAlert({
      title: "Delete Campaign",
      description: "Are you sure you want to delete this campaign?",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          await deleteCampaign({ variables: { id, teamId: team.id } });
          toast.success("Campaign deleted");
          await refetch();
        } catch (error) {
          showError(error, { gql: true });
        }
      },
    });
  };

  // Calendar navigation
  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfWeek = getFirstDayOfMonth(year, month);

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Add days from previous month
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(prevYear, prevMonth, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }

    // Add days from current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Add days from next month to complete the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;

    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(nextYear, nextMonth, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentDate]);

  // Get campaigns for a specific date
  const getCampaignsForDate = (date: Date) => {
    if (!campaigns) return [];

    return campaigns.filter((campaign) => {
      // Check if campaign has a scheduled date (using createdAt for now)
      const campaignDate = campaign.scheduledAt
        ? new Date(campaign.scheduledAt)
        : new Date(campaign.createdAt);

      return (
        campaignDate.getDate() === date.getDate() &&
        campaignDate.getMonth() === date.getMonth() &&
        campaignDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Get worker color based on AI SDR avatar name
  const getWorkerColor = (avatarName?: string) => {
    if (!avatarName) return WORKER_COLORS.default;
    const lowerName = avatarName.toLowerCase();
    if (lowerName.includes("gianna")) return WORKER_COLORS.gianna;
    if (lowerName.includes("cathy")) return WORKER_COLORS.cathy;
    if (lowerName.includes("sabrina")) return WORKER_COLORS.sabrina;
    return WORKER_COLORS.default;
  };

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <Card className="relative overflow-hidden">
      {loading && <LoadingOverlay />}
      <div className="flex justify-between items-center px-3 py-4 gap-x-3">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* View Toggle */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "table" | "calendar")}>
          <TabsList className="bg-zinc-800">
            <TabsTrigger value="table" className="gap-1.5">
              <List className="h-4 w-4" />
              Table
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <div className="p-4">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateMonth("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigateMonth("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold ml-2">
                {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
            </div>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
          </div>

          {/* Worker Legend */}
          <div className="flex gap-4 mb-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className={cn("w-3 h-3 rounded", WORKER_COLORS.gianna.bg)} />
              <span className="text-zinc-400">GIANNA</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={cn("w-3 h-3 rounded", WORKER_COLORS.cathy.bg)} />
              <span className="text-zinc-400">CATHY</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={cn("w-3 h-3 rounded", WORKER_COLORS.sabrina.bg)} />
              <span className="text-zinc-400">SABRINA</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={cn("w-3 h-3 rounded", WORKER_COLORS.default.bg)} />
              <span className="text-zinc-400">Other</span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="border border-zinc-700 rounded-lg overflow-hidden">
            {/* Day Headers */}
            <div className="grid grid-cols-7 bg-zinc-800">
              {DAY_NAMES.map((day) => (
                <div
                  key={day}
                  className="px-2 py-2 text-center text-xs font-medium text-zinc-400 border-b border-zinc-700"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, index) => {
                const dayCampaigns = getCampaignsForDate(day.date);
                const todayClass = isToday(day.date);

                return (
                  <div
                    key={index}
                    className={cn(
                      "min-h-[100px] p-1 border-b border-r border-zinc-700 last:border-r-0",
                      !day.isCurrentMonth && "bg-zinc-900/50",
                      todayClass && "bg-blue-950/30"
                    )}
                  >
                    <div
                      className={cn(
                        "text-xs mb-1 px-1",
                        !day.isCurrentMonth && "text-zinc-600",
                        day.isCurrentMonth && "text-zinc-300",
                        todayClass && "font-bold text-blue-400"
                      )}
                    >
                      {day.date.getDate()}
                    </div>

                    {/* Campaign Events */}
                    <div className="space-y-1">
                      {dayCampaigns.slice(0, 3).map((campaign) => {
                        const colors = getWorkerColor(campaign.aiSdrAvatar?.name);
                        return (
                          <TeamLink
                            key={campaign.id}
                            href={`/campaigns/${campaign.id}`}
                            className={cn(
                              "block px-1.5 py-0.5 rounded text-xs truncate cursor-pointer hover:opacity-80 transition-opacity",
                              colors.bg,
                              colors.text
                            )}
                          >
                            {campaign.name}
                          </TeamLink>
                        );
                      })}
                      {dayCampaigns.length > 3 && (
                        <div className="text-xs text-zinc-500 px-1">
                          +{dayCampaigns.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaign</TableHead>
            <TableHead>AI SDR Avatar</TableHead>
            <TableHead>Leads</TableHead>
            <TableHead>Engagement</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!loading && !campaigns?.length && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No campaigns found
              </TableCell>
            </TableRow>
          )}
          {campaigns?.map((campaign) => (
            <TableRow key={campaign.id}>
              <TableCell className="font-medium">{campaign.name}</TableCell>
              <TableCell>
                {!campaign.aiSdrAvatar ? (
                  "No AI SDR Avatar"
                ) : (
                  <TeamLink
                    href={`/ai-sdr/${campaign.aiSdrAvatar.id}`}
                    className="underline underline-offset-2"
                  >
                    {campaign.aiSdrAvatar.name}
                  </TeamLink>
                )}
              </TableCell>
              <TableCell>{campaign.estimatedLeadsCount}</TableCell>
              <TableCell>0%</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                >
                  {campaign.status}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <TeamLink href={`/campaigns/${campaign.id}`}>
                        View Campaign
                      </TeamLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <TeamLink href={`/campaigns/${campaign.id}/edit`}>
                        Edit Campaign
                      </TeamLink>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => confirmDelete(campaign.id)}
                      className="cursor-pointer"
                    >
                      Delete Campaign
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      )}

      {viewMode === "table" && !!pageInfo && (
        <CursorPagination
          data={pageInfo}
          onPageChange={setCursor}
          limit={LIMIT}
          variant="table-footer"
          className="border-t"
          hideResult
        />
      )}
    </Card>
  );
}
