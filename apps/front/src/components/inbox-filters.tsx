"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { MessageFilter, MessageStatus } from "@/types/message";

interface InboxFiltersProps {
  filters: MessageFilter;
  onFilterChange: (filters: MessageFilter) => void;
}

export function InboxFilters({ filters, onFilterChange }: InboxFiltersProps) {
  const [localFilters, setLocalFilters] = useState<MessageFilter>(filters);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: filters.dateRange?.from || undefined,
    to: filters.dateRange?.to || undefined,
  });

  useEffect(() => {
    setLocalFilters(filters);
    setDateRange({
      from: filters.dateRange?.from || undefined,
      to: filters.dateRange?.to || undefined,
    });
  }, [filters]);

  const handleFilterChange = (key: keyof MessageFilter, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleDateRangeChange = (range: any) => {
    setDateRange(range);
    handleFilterChange("dateRange", range);
  };

  const handleStatusChange = (status: MessageStatus, checked: boolean) => {
    const currentStatuses = localFilters.status || [];
    let newStatuses: MessageStatus[];

    if (checked) {
      newStatuses = [...currentStatuses, status];
    } else {
      newStatuses = currentStatuses.filter((s) => s !== status);
    }

    handleFilterChange("status", newStatuses);
  };

  const handleClearFilters = () => {
    const clearedFilters: MessageFilter = {
      search: "",
      status: [],
      dateRange: { from: null, to: null },
      campaigns: [],
      assignedTo: [],
    };
    setLocalFilters(clearedFilters);
    setDateRange({ from: null, to: null });
    onFilterChange(clearedFilters);
  };

  const statusOptions: { value: MessageStatus; label: string }[] = [
    { value: "new", label: "New" },
    { value: "read", label: "Read" },
    { value: "replied", label: "Replied" },
    { value: "unsubscribed", label: "Unsubscribed" },
    { value: "flagged", label: "Flagged" },
    { value: "archived", label: "Archived" },
    { value: "spam", label: "Spam" },
  ];

  // Sample data - in a real app, these would be fetched from the backend
  const campaigns = [
    { id: "campaign1", name: "Q2 Tech Outreach" },
    { id: "campaign2", name: "Healthcare Professionals" },
    { id: "campaign3", name: "Financial Services" },
    { id: "campaign4", name: "Retail Stores NYC" },
    { id: "campaign5", name: "Education Institutions" },
  ];

  const teamMembers = [
    { id: "user1", name: "John Doe" },
    { id: "user2", name: "Jane Smith" },
    { id: "user3", name: "Robert Johnson" },
    { id: "user4", name: "Emily Davis" },
    { id: "user5", name: "Michael Brown" },
  ];

  return (
    <div className="bg-muted/40 p-4 rounded-md space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  {localFilters.status && localFilters.status.length > 0
                    ? `${localFilters.status.length} selected`
                    : "Select status"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                  <CommandList>
                    <CommandGroup>
                      {statusOptions.map((status) => (
                        <CommandItem
                          key={status.value}
                          onSelect={() =>
                            handleStatusChange(
                              status.value,
                              !(localFilters.status || []).includes(
                                status.value,
                              ),
                            )
                          }
                        >
                          <div
                            className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              (localFilters.status || []).includes(status.value)
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50 [&_svg]:invisible",
                            )}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                          <span>{status.label}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange.from && !dateRange.to && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    "Select date range"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from || undefined}
                  selected={dateRange}
                  onSelect={handleDateRangeChange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign">Campaign</Label>
            <Select
              value={localFilters.campaigns?.[0] || ""}
              onValueChange={(value) =>
                handleFilterChange("campaigns", value ? [value] : [])
              }
            >
              <SelectTrigger id="campaign">
                <SelectValue placeholder="Select campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns
                  .filter((c) => c.id)
                  .map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col justify-end">
          <Button
            variant="ghost"
            onClick={handleClearFilters}
            className="self-end"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {(localFilters.status && localFilters.status.length > 0) ||
      (localFilters.dateRange &&
        (localFilters.dateRange.from || localFilters.dateRange.to)) ||
      (localFilters.campaigns && localFilters.campaigns.length > 0) ? (
        <div className="flex flex-wrap gap-2">
          {localFilters.status &&
            localFilters.status.map((status) => (
              <Badge
                key={status}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {statusOptions.find((s) => s.value === status)?.label}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleStatusChange(status, false)}
                />
              </Badge>
            ))}

          {localFilters.dateRange &&
            (localFilters.dateRange.from || localFilters.dateRange.to) && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Date:{" "}
                {localFilters.dateRange.from
                  ? format(localFilters.dateRange.from, "LLL dd, y")
                  : "Any"}{" "}
                -{" "}
                {localFilters.dateRange.to
                  ? format(localFilters.dateRange.to, "LLL dd, y")
                  : "Any"}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() =>
                    handleDateRangeChange({ from: undefined, to: undefined })
                  }
                />
              </Badge>
            )}

          {localFilters.campaigns && localFilters.campaigns.length > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Campaign:{" "}
              {
                campaigns.find((c) => c.id === localFilters.campaigns?.[0])
                  ?.name
              }
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleFilterChange("campaigns", [])}
              />
            </Badge>
          )}
        </div>
      ) : null}
    </div>
  );
}
