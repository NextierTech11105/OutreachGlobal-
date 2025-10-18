"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import type { Lead } from "@/types/lead";
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
import { cn } from "@/lib/utils";

const statuses: string[] = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
];

interface LeadStatusSelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function LeadStatusSelect({
  value,
  onValueChange,
}: LeadStatusSelectProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn("w-full justify-between font-normal")}
        >
          {value}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search status..." />
          <CommandList>
            <CommandEmpty>No status found.</CommandEmpty>
            <CommandGroup>
              {statuses.map((status) => (
                <CommandItem
                  key={status}
                  value={status}
                  onSelect={() => onValueChange(status as Lead["status"])}
                  className={cn(
                    "flex items-center gap-2",
                    status === value && "font-medium",
                  )}
                >
                  <div className={cn("h-2 w-2 rounded-full")} />
                  {status}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      status === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
