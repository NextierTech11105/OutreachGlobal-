"use client";

import { useState, useRef, useEffect } from "react";
import { PlusCircle, TagIcon, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Common tags that might be used for leads
const commonTags = [
  "Hot Lead",
  "Cold Lead",
  "Warm Lead",
  "Follow Up",
  "Interested",
  "Not Interested",
  "Callback",
  "Left Message",
  "No Answer",
  "Wrong Number",
  "Do Not Call",
  "VIP",
  "Cash Buyer",
  "Financing",
  "First-time Buyer",
  "Investor",
  "Relocation",
  "Downsizing",
  "Upsizing",
  "Vacation Home",
  "Rental Property",
  "Commercial",
  "Residential",
  "Expired Listing",
  "FSBO",
  "Referral",
];

interface LeadTagManagerProps {
  leadId: string;
  initialTags?: string[];
  onTagsChange?: (tags: string[]) => void;
  className?: string;
}

export function LeadTagManager({
  leadId,
  initialTags = [],
  onTagsChange,
  className,
}: LeadTagManagerProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter out tags that are already added
  const availableTags = commonTags.filter((tag) => !tags.includes(tag));

  const handleAddTag = (tag: string) => {
    if (!tag.trim()) return;

    // Don't add duplicate tags
    if (tags.includes(tag)) {
      toast.error("This tag already exists");
      return;
    }

    const newTags = [...tags, tag];
    setTags(newTags);
    onTagsChange?.(newTags);
    setInputValue("");
    setOpen(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(newTags);
    onTagsChange?.(newTags);

    // In a real app, you would save this to the backend
    toast.success(`Tag "${tagToRemove}" removed`);
  };

  const handleCreateTag = () => {
    if (inputValue) {
      handleAddTag(inputValue);
    }
  };

  // Focus the input when the popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="flex items-center gap-1 px-3 py-1.5"
          >
            <TagIcon className="h-3 w-3" />
            <span>{tag}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
              onClick={() => handleRemoveTag(tag)}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Remove {tag} tag</span>
            </Button>
          </Badge>
        ))}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <PlusCircle className="h-3.5 w-3.5" />
              Add Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[300px]" align="start">
            <Command>
              <CommandInput
                placeholder="Search or create tag..."
                value={inputValue}
                onValueChange={setInputValue}
                ref={inputRef}
              />
              <CommandList>
                <CommandEmpty>
                  {inputValue ? (
                    <div className="flex items-center justify-between px-2 py-1.5">
                      <span>Create "{inputValue}"</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1"
                        onClick={handleCreateTag}
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Create
                      </Button>
                    </div>
                  ) : (
                    <span>No tags found.</span>
                  )}
                </CommandEmpty>
                <CommandGroup heading="Common Tags">
                  {availableTags.map((tag) => (
                    <CommandItem
                      key={tag}
                      value={tag}
                      onSelect={() => handleAddTag(tag)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <TagIcon className="h-4 w-4" />
                        <span>{tag}</span>
                      </div>
                      <Check
                        className={cn(
                          "h-4 w-4",
                          tags.includes(tag) ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
