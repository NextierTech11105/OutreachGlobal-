"use client";

import { useState } from "react";
import type {
  LeadFilter,
  LeadStatus,
  LeadSource,
  LeadPriority,
} from "@/types/lead";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { formatCurrency } from "@/lib/utils";

interface LeadsFilterProps {
  filters: LeadFilter;
  setFilters: (filters: LeadFilter) => void;
}

export function LeadsFilter({ filters, setFilters }: LeadsFilterProps) {
  const [open, setOpen] = useState(false);
  const [minValue, setMinValue] = useState<number>(
    filters.minPropertyValue || 0,
  );
  const [maxValue, setMaxValue] = useState<number>(
    filters.maxPropertyValue || 2000000,
  );

  const statuses: LeadStatus[] = [
    "New",
    "Contacted",
    "Qualified",
    "Proposal",
    "Negotiation",
    "Closed Won",
    "Closed Lost",
  ];

  const sources: LeadSource[] = [
    "Website",
    "Referral",
    "Campaign",
    "Cold Call",
    "Social Media",
    "Event",
    "Other",
  ];

  const priorities: LeadPriority[] = ["Low", "Medium", "High", "Urgent"];

  const propertyTypes = [
    "Single Family",
    "Multi-Family",
    "Condo",
    "Townhouse",
    "Commercial",
    "Land",
    "Industrial",
  ];

  const handleStatusToggle = (status: LeadStatus) => {
    const currentStatuses = filters.status || [];
    if (currentStatuses.includes(status)) {
      setFilters({
        ...filters,
        status: currentStatuses.filter((s) => s !== status),
      });
    } else {
      setFilters({
        ...filters,
        status: [...currentStatuses, status],
      });
    }
  };

  const handleSourceToggle = (source: LeadSource) => {
    const currentSources = filters.source || [];
    if (currentSources.includes(source)) {
      setFilters({
        ...filters,
        source: currentSources.filter((s) => s !== source),
      });
    } else {
      setFilters({
        ...filters,
        source: [...currentSources, source],
      });
    }
  };

  const handlePriorityToggle = (priority: LeadPriority) => {
    const currentPriorities = filters.priority || [];
    if (currentPriorities.includes(priority)) {
      setFilters({
        ...filters,
        priority: currentPriorities.filter((p) => p !== priority),
      });
    } else {
      setFilters({
        ...filters,
        priority: [...currentPriorities, priority],
      });
    }
  };

  const handlePropertyTypeToggle = (type: string) => {
    const currentTypes = filters.propertyType || [];
    if (currentTypes.includes(type)) {
      setFilters({
        ...filters,
        propertyType: currentTypes.filter((t) => t !== type),
      });
    } else {
      setFilters({
        ...filters,
        propertyType: [...currentTypes, type],
      });
    }
  };

  const handleValueRangeChange = (values: number[]) => {
    setMinValue(values[0]);
    setMaxValue(values[1]);
  };

  const applyValueRange = () => {
    setFilters({
      ...filters,
      minPropertyValue: minValue,
      maxPropertyValue: maxValue,
    });
  };

  const clearFilters = () => {
    setFilters({});
    setMinValue(0);
    setMaxValue(2000000);
  };

  const activeFilterCount =
    (filters.status?.length || 0) +
    (filters.source?.length || 0) +
    (filters.priority?.length || 0) +
    (filters.propertyType?.length || 0) +
    (filters.minPropertyValue !== undefined ||
    filters.maxPropertyValue !== undefined
      ? 1
      : 0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 rounded-full px-1 py-0 text-xs"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[340px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search filters..." />
            <CommandList>
              <CommandGroup heading="Status">
                <div className="flex flex-wrap gap-1 p-2">
                  {statuses.map((status) => (
                    <Badge
                      key={status}
                      variant={
                        filters.status?.includes(status)
                          ? "default"
                          : "outline-solid"
                      }
                      className="cursor-pointer"
                      onClick={() => handleStatusToggle(status)}
                    >
                      {status}
                      {filters.status?.includes(status) && (
                        <X
                          className="ml-1 h-3 w-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusToggle(status);
                          }}
                        />
                      )}
                    </Badge>
                  ))}
                </div>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Source">
                <div className="flex flex-wrap gap-1 p-2">
                  {sources.map((source) => (
                    <Badge
                      key={source}
                      variant={
                        filters.source?.includes(source)
                          ? "default"
                          : "outline-solid"
                      }
                      className="cursor-pointer"
                      onClick={() => handleSourceToggle(source)}
                    >
                      {source}
                      {filters.source?.includes(source) && (
                        <X
                          className="ml-1 h-3 w-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSourceToggle(source);
                          }}
                        />
                      )}
                    </Badge>
                  ))}
                </div>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Priority">
                <div className="flex flex-wrap gap-1 p-2">
                  {priorities.map((priority) => (
                    <Badge
                      key={priority}
                      variant={
                        filters.priority?.includes(priority)
                          ? "default"
                          : "outline-solid"
                      }
                      className={`cursor-pointer ${
                        filters.priority?.includes(priority)
                          ? ""
                          : priority === "Low"
                            ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                            : priority === "Medium"
                              ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                              : priority === "High"
                                ? "bg-orange-100 text-orange-800 hover:bg-orange-200"
                                : priority === "Urgent"
                                  ? "bg-red-100 text-red-800 hover:bg-red-200"
                                  : ""
                      }`}
                      onClick={() => handlePriorityToggle(priority)}
                    >
                      {priority}
                      {filters.priority?.includes(priority) && (
                        <X
                          className="ml-1 h-3 w-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePriorityToggle(priority);
                          }}
                        />
                      )}
                    </Badge>
                  ))}
                </div>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Property Type">
                <div className="flex flex-wrap gap-1 p-2">
                  {propertyTypes.map((type) => (
                    <Badge
                      key={type}
                      variant={
                        filters.propertyType?.includes(type)
                          ? "default"
                          : "outline-solid"
                      }
                      className="cursor-pointer"
                      onClick={() => handlePropertyTypeToggle(type)}
                    >
                      {type}
                      {filters.propertyType?.includes(type) && (
                        <X
                          className="ml-1 h-3 w-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePropertyTypeToggle(type);
                          }}
                        />
                      )}
                    </Badge>
                  ))}
                </div>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Property Value Range">
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">
                        {formatCurrency(minValue)}
                      </span>
                      <span className="text-sm">
                        {formatCurrency(maxValue)}
                      </span>
                    </div>
                    <Slider
                      defaultValue={[minValue, maxValue]}
                      min={0}
                      max={2000000}
                      step={50000}
                      value={[minValue, maxValue]}
                      onValueChange={handleValueRangeChange}
                      onValueCommit={applyValueRange}
                      className="my-2"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={applyValueRange}
                    className="w-full"
                  >
                    Apply Range
                  </Button>
                </div>
              </CommandGroup>
              <CommandSeparator />
              <div className="p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="w-full"
                >
                  Clear All Filters
                </Button>
              </div>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Display active filters */}
      <div className="flex flex-wrap gap-1">
        {filters.status?.map((status) => (
          <Badge
            key={status}
            variant="secondary"
            className="flex items-center gap-1"
          >
            {status}
            <X
              className="h-3 w-3 cursor-pointer"
              onClick={() => handleStatusToggle(status)}
            />
          </Badge>
        ))}
        {filters.source?.map((source) => (
          <Badge
            key={source}
            variant="secondary"
            className="flex items-center gap-1"
          >
            {source}
            <X
              className="h-3 w-3 cursor-pointer"
              onClick={() => handleSourceToggle(source)}
            />
          </Badge>
        ))}
        {filters.priority?.map((priority) => (
          <Badge
            key={priority}
            variant="secondary"
            className="flex items-center gap-1"
          >
            {priority}
            <X
              className="h-3 w-3 cursor-pointer"
              onClick={() => handlePriorityToggle(priority)}
            />
          </Badge>
        ))}
        {filters.propertyType?.map((type) => (
          <Badge
            key={type}
            variant="secondary"
            className="flex items-center gap-1"
          >
            {type}
            <X
              className="h-3 w-3 cursor-pointer"
              onClick={() => handlePropertyTypeToggle(type)}
            />
          </Badge>
        ))}
        {(filters.minPropertyValue !== undefined ||
          filters.maxPropertyValue !== undefined) && (
          <Badge variant="secondary" className="flex items-center gap-1">
            {formatCurrency(filters.minPropertyValue || 0)} -{" "}
            {formatCurrency(filters.maxPropertyValue || 2000000)}
            <X
              className="h-3 w-3 cursor-pointer"
              onClick={() =>
                setFilters({
                  ...filters,
                  minPropertyValue: undefined,
                  maxPropertyValue: undefined,
                })
              }
            />
          </Badge>
        )}
      </div>
    </div>
  );
}
