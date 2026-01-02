"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Inbox,
  Send,
  Archive,
  Flag,
  Trash,
  Tag,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useInboxContext } from "../inbox.context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CustomLabel {
  id: string;
  name: string;
  color: string;
}

const LABEL_COLORS = [
  { name: "Red", value: "text-red-500" },
  { name: "Yellow", value: "text-yellow-500" },
  { name: "Green", value: "text-green-500" },
  { name: "Blue", value: "text-blue-500" },
  { name: "Purple", value: "text-purple-500" },
  { name: "Pink", value: "text-pink-500" },
  { name: "Orange", value: "text-orange-500" },
  { name: "Cyan", value: "text-cyan-500" },
  { name: "Gold", value: "text-amber-500" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT LABELS - Easify-style capture indicators
// These match CANONICAL_LABELS from canonical-labels.ts for backend consistency
// ═══════════════════════════════════════════════════════════════════════════════
const DEFAULT_LABELS: CustomLabel[] = [
  // === GOLD CAPTURES (Highest Priority) ===
  {
    id: "mobile_and_email",
    name: "Mobile & Email",
    color: "text-amber-500", // GOLD - both captured
  },
  {
    id: "hot_lead",
    name: "Hot Lead",
    color: "text-red-500",
  },

  // === DATA CAPTURE ===
  {
    id: "email_captured",
    name: "Email Captured",
    color: "text-green-500",
  },
  {
    id: "mobile_captured",
    name: "Mobile Captured",
    color: "text-blue-500",
  },

  // === INTENT SIGNALS ===
  {
    id: "wants_call",
    name: "Wants Call",
    color: "text-purple-500",
  },
  {
    id: "needs_help",
    name: "Needs Help",
    color: "text-red-500",
  },
  {
    id: "question_asked",
    name: "Has Question",
    color: "text-cyan-500",
  },
  {
    id: "high_intent",
    name: "High Intent",
    color: "text-emerald-500",
  },

  // === EXECUTION ===
  {
    id: "push_to_call_center",
    name: "Push to Call Center",
    color: "text-orange-500",
  },
  {
    id: "call_ready",
    name: "Call Ready",
    color: "text-green-500",
  },
  {
    id: "responded",
    name: "Responded",
    color: "text-green-500",
  },

  // === WORKSPACES / STAGES ===
  {
    id: "initial_message",
    name: "Initial Message",
    color: "text-amber-500",
  },
  {
    id: "retarget",
    name: "Retarget",
    color: "text-purple-500",
  },
  {
    id: "nudger",
    name: "Nudger",
    color: "text-orange-500",
  },
  {
    id: "content_nurture",
    name: "Content Nurture",
    color: "text-blue-500",
  },
  {
    id: "book_appointment",
    name: "Book Appointment",
    color: "text-green-500",
  },
  {
    id: "lead_calendar",
    name: "Lead Calendar",
    color: "text-cyan-500",
  },
];

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
  const [{ activeItem }, dispatch] = useInboxContext();
  const [labels, setLabels] = useState<CustomLabel[]>(DEFAULT_LABELS);
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [editingLabel, setEditingLabel] = useState<CustomLabel | null>(null);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("text-blue-500");

  // Load labels from localStorage with version check
  // Version 2 = Easify-style canonical labels
  const LABELS_VERSION = "v2";
  const STORAGE_KEY = `inbox-labels-${LABELS_VERSION}`;

  useEffect(() => {
    const savedLabels = localStorage.getItem(STORAGE_KEY);
    if (savedLabels) {
      try {
        setLabels(JSON.parse(savedLabels));
      } catch {
        setLabels(DEFAULT_LABELS);
      }
    } else {
      // Clear old version and set new defaults
      localStorage.removeItem("inbox-labels");
      localStorage.removeItem("inbox-labels-v1");
      setLabels(DEFAULT_LABELS);
    }
  }, []);

  // Save labels to localStorage
  const saveLabels = (newLabels: CustomLabel[]) => {
    setLabels(newLabels);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newLabels));
  };

  const setActiveItem = (item: string) => {
    dispatch({
      activeItem: item,
    });
  };

  const openAddLabel = () => {
    setEditingLabel(null);
    setNewLabelName("");
    setNewLabelColor("text-blue-500");
    setShowLabelDialog(true);
  };

  const openEditLabel = (label: CustomLabel, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLabel(label);
    setNewLabelName(label.name);
    setNewLabelColor(label.color);
    setShowLabelDialog(true);
  };

  const handleSaveLabel = () => {
    if (!newLabelName.trim()) return;

    if (editingLabel) {
      // Update existing label
      const updatedLabels = labels.map((l) =>
        l.id === editingLabel.id
          ? { ...l, name: newLabelName.trim(), color: newLabelColor }
          : l,
      );
      saveLabels(updatedLabels);
    } else {
      // Add new label
      const newLabel: CustomLabel = {
        id: `label-${Date.now()}`,
        name: newLabelName.trim(),
        color: newLabelColor,
      };
      saveLabels([...labels, newLabel]);
    }
    setShowLabelDialog(false);
  };

  const handleDeleteLabel = () => {
    if (!editingLabel) return;
    const updatedLabels = labels.filter((l) => l.id !== editingLabel.id);
    saveLabels(updatedLabels);
    setShowLabelDialog(false);
  };

  return (
    <>
      <ScrollArea className="h-full">
        <div className="space-y-1 pr-2">
          <div className="space-y-1">
            <SidebarItem
              icon={<Inbox className="h-4 w-4" />}
              label="Inbox"
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

          <SidebarSection title="Labels">
            {labels.map((label) => (
              <div key={label.id} className="group flex items-center">
                <Button
                  variant="ghost"
                  className={cn(
                    "flex-1 justify-start gap-2 font-normal text-sm h-8 px-2",
                    activeItem === label.id && "bg-muted",
                  )}
                  onClick={() => setActiveItem(label.id)}
                >
                  <Tag className={cn("h-4 w-4", label.color)} />
                  <span className="flex-1 text-left truncate">
                    {label.name}
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => openEditLabel(label, e)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              className="w-full justify-start gap-1 text-xs text-muted-foreground h-7 px-2"
              onClick={openAddLabel}
            >
              <Plus className="h-3 w-3" />
              <span>Add Label</span>
            </Button>
          </SidebarSection>
        </div>
      </ScrollArea>

      <Dialog open={showLabelDialog} onOpenChange={setShowLabelDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editingLabel ? "Edit Label" : "Add Label"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="label-name">Label Name</Label>
              <Input
                id="label-name"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="Enter label name..."
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {LABEL_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center border-2",
                      newLabelColor === color.value
                        ? "border-primary"
                        : "border-transparent",
                    )}
                    onClick={() => setNewLabelColor(color.value)}
                  >
                    <Tag className={cn("h-5 w-5", color.value)} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            {editingLabel && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteLabel}
              >
                <X className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                onClick={() => setShowLabelDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveLabel} disabled={!newLabelName.trim()}>
                {editingLabel ? "Save" : "Add"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
