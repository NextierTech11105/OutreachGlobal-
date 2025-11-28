"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Inbox,
  Send,
  Archive,
  Flag,
  Trash,
  Folder,
  Tag,
  Users,
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}

function SidebarItem({
  icon,
  label,
  count,
  active,
  onClick,
}: SidebarItemProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start gap-2 font-normal text-sm h-8 px-2",
        active && "bg-muted",
      )}
      onClick={onClick}
    >
      {icon}
      <span className="flex-1 text-left truncate">{label}</span>
      {count !== undefined && (
        <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0 h-5">
          {count}
        </Badge>
      )}
    </Button>
  );
}

interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
}

function SidebarSection({
  title,
  children,
  collapsible = true,
}: SidebarSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="space-y-1 py-1">
      {collapsible ? (
        <Button
          variant="ghost"
          className="w-full justify-start gap-1 font-medium text-xs text-muted-foreground h-6 px-2"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          {title}
        </Button>
      ) : (
        <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
          {title}
        </div>
      )}
      {isOpen && <div className="space-y-1">{children}</div>}
    </div>
  );
}

export function InboxSidebar() {
  const [activeItem, setActiveItem] = useState("inbox");

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 pr-2">
        <div className="space-y-1">
          <SidebarItem
            icon={<Inbox className="h-4 w-4" />}
            label="Inbox"
            count={12}
            active={activeItem === "inbox"}
            onClick={() => setActiveItem("inbox")}
          />
          <SidebarItem
            icon={<Send className="h-4 w-4" />}
            label="Sent"
            active={activeItem === "sent"}
            onClick={() => setActiveItem("sent")}
          />
          <SidebarItem
            icon={<Archive className="h-4 w-4" />}
            label="Archived"
            active={activeItem === "archived"}
            onClick={() => setActiveItem("archived")}
          />
          <SidebarItem
            icon={<Flag className="h-4 w-4" />}
            label="Flagged"
            count={3}
            active={activeItem === "flagged"}
            onClick={() => setActiveItem("flagged")}
          />
          <SidebarItem
            icon={<Trash className="h-4 w-4" />}
            label="Trash"
            active={activeItem === "trash"}
            onClick={() => setActiveItem("trash")}
          />
        </div>

        <SidebarSection title="Campaigns">
          <SidebarItem
            icon={<Folder className="h-4 w-4" />}
            label="Q2 Tech Outreach"
            count={5}
            active={activeItem === "campaign-1"}
            onClick={() => setActiveItem("campaign-1")}
          />
          <SidebarItem
            icon={<Folder className="h-4 w-4" />}
            label="Healthcare Professionals"
            count={2}
            active={activeItem === "campaign-2"}
            onClick={() => setActiveItem("campaign-2")}
          />
          <SidebarItem
            icon={<Folder className="h-4 w-4" />}
            label="Financial Services"
            active={activeItem === "campaign-3"}
            onClick={() => setActiveItem("campaign-3")}
          />
          <SidebarItem
            icon={<Folder className="h-4 w-4" />}
            label="Retail Stores NYC"
            count={3}
            active={activeItem === "campaign-4"}
            onClick={() => setActiveItem("campaign-4")}
          />
          <Button
            variant="ghost"
            className="w-full justify-start gap-1 text-xs text-muted-foreground h-7 px-2"
          >
            <Plus className="h-3 w-3" />
            <span>Add Campaign</span>
          </Button>
        </SidebarSection>

        <SidebarSection title="Labels">
          <SidebarItem
            icon={<Tag className="h-4 w-4 text-red-500" />}
            label="Important"
            count={7}
            active={activeItem === "label-1"}
            onClick={() => setActiveItem("label-1")}
          />
          <SidebarItem
            icon={<Tag className="h-4 w-4 text-yellow-500" />}
            label="Follow-up"
            count={4}
            active={activeItem === "label-2"}
            onClick={() => setActiveItem("label-2")}
          />
          <SidebarItem
            icon={<Tag className="h-4 w-4 text-green-500" />}
            label="Leads"
            count={9}
            active={activeItem === "label-3"}
            onClick={() => setActiveItem("label-3")}
          />
          <SidebarItem
            icon={<Tag className="h-4 w-4 text-blue-500" />}
            label="Customers"
            active={activeItem === "label-4"}
            onClick={() => setActiveItem("label-4")}
          />
          <Button
            variant="ghost"
            className="w-full justify-start gap-1 text-xs text-muted-foreground h-7 px-2"
          >
            <Plus className="h-3 w-3" />
            <span>Add Label</span>
          </Button>
        </SidebarSection>

        <SidebarSection title="Team">
          <SidebarItem
            icon={<Users className="h-4 w-4" />}
            label="Assigned to Me"
            count={5}
            active={activeItem === "assigned"}
            onClick={() => setActiveItem("assigned")}
          />
          <SidebarItem
            icon={<Users className="h-4 w-4" />}
            label="Unassigned"
            count={3}
            active={activeItem === "unassigned"}
            onClick={() => setActiveItem("unassigned")}
          />
        </SidebarSection>

        <div className="space-y-1 pt-2 mt-2 border-t">
          <SidebarItem
            icon={<Settings className="h-4 w-4" />}
            label="Settings"
            active={activeItem === "settings"}
            onClick={() => setActiveItem("settings")}
          />
        </div>
      </div>
    </ScrollArea>
  );
}
