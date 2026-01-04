"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search,
  MessageSquare,
  Copy,
  Check,
  Briefcase,
  Wrench,
  Building2,
  Home,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  CARTRIDGE_LIBRARY,
  type TemplateCartridge,
} from "@/lib/sms/template-cartridges";
import type { SMSTemplate } from "@/lib/sms/campaign-templates";

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE LIBRARY COMPONENT
// Browse and select templates from organized groups
// ═══════════════════════════════════════════════════════════════════════════════

interface TemplateLibraryProps {
  onSelectTemplate?: (template: SMSTemplate) => void;
  selectedTemplateId?: string;
  showGroupInfo?: boolean;
}

const GROUP_ICONS: Record<string, React.ReactNode> = {
  "business-brokering": <Briefcase className="h-4 w-4" />,
  "crm-consultants": <Building2 className="h-4 w-4" />,
  "blue-collar": <Wrench className="h-4 w-4" />,
  "real-estate": <Home className="h-4 w-4" />,
};

const GROUP_COLORS: Record<string, string> = {
  "business-brokering": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "crm-consultants": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "blue-collar": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "real-estate": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

export function TemplateLibrary({
  onSelectTemplate,
  selectedTemplateId,
  showGroupInfo = true,
}: TemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter templates based on search and active group
  const filteredTemplates = useMemo(() => {
    let templates: (SMSTemplate & { groupId: string; groupName: string })[] = [];

    const cartridges =
      activeGroup === "all"
        ? CARTRIDGE_LIBRARY
        : CARTRIDGE_LIBRARY.filter((c) => c.id === activeGroup);

    for (const cartridge of cartridges) {
      for (const template of cartridge.templates) {
        templates.push({
          ...template,
          groupId: cartridge.id,
          groupName: cartridge.name,
        });
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.message.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    return templates;
  }, [searchQuery, activeGroup]);

  const handleCopy = (template: SMSTemplate) => {
    navigator.clipboard.writeText(template.message);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSelect = (template: SMSTemplate) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Group Tabs */}
      <Tabs
        value={activeGroup}
        onValueChange={setActiveGroup}
        className="flex-1 flex flex-col"
      >
        <TabsList className="mx-4 mt-2 justify-start h-auto flex-wrap gap-1 bg-transparent p-0">
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs"
          >
            All Templates
          </TabsTrigger>
          {CARTRIDGE_LIBRARY.map((group) => (
            <TabsTrigger
              key={group.id}
              value={group.id}
              className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs"
            >
              {GROUP_ICONS[group.id]}
              {group.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Group Info */}
        {showGroupInfo && activeGroup !== "all" && (
          <div className="mx-4 mt-3">
            {CARTRIDGE_LIBRARY.filter((g) => g.id === activeGroup).map(
              (group) => (
                <div
                  key={group.id}
                  className={`p-3 rounded-lg border ${GROUP_COLORS[group.id] || "bg-muted"}`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {GROUP_ICONS[group.id]}
                    <span>{group.name}</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {group.templates.length} templates
                    </Badge>
                  </div>
                  <p className="text-xs mt-1 opacity-80">{group.description}</p>
                  <p className="text-xs mt-1 opacity-60">
                    Target: {group.audience}
                  </p>
                </div>
              )
            )}
          </div>
        )}

        {/* Template List */}
        <TabsContent value={activeGroup} className="flex-1 mt-0">
          <ScrollArea className="h-[calc(100vh-300px)] px-4 py-2">
            <div className="space-y-2">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No templates found</p>
                </div>
              ) : (
                filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    groupName={template.groupName}
                    showGroup={activeGroup === "all"}
                    isSelected={selectedTemplateId === template.id}
                    isCopied={copiedId === template.id}
                    onSelect={() => handleSelect(template)}
                    onCopy={() => handleCopy(template)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Stats Footer */}
      <div className="p-3 border-t bg-muted/50 text-xs text-muted-foreground flex justify-between">
        <span>{filteredTemplates.length} templates</span>
        <span>{CARTRIDGE_LIBRARY.length} groups available</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface TemplateCardProps {
  template: SMSTemplate;
  groupName?: string;
  showGroup?: boolean;
  isSelected?: boolean;
  isCopied?: boolean;
  onSelect?: () => void;
  onCopy?: () => void;
}

function TemplateCard({
  template,
  groupName,
  showGroup,
  isSelected,
  isCopied,
  onSelect,
  onCopy,
}: TemplateCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      onClick={onSelect}
    >
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium truncate">
              {template.name}
            </CardTitle>
            {showGroup && groupName && (
              <CardDescription className="text-xs flex items-center gap-1 mt-0.5">
                <Sparkles className="h-3 w-3" />
                {groupName}
              </CardDescription>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onCopy?.();
            }}
          >
            {isCopied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {template.message}
        </p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-1 flex-wrap">
            {template.tags.slice(0, 2).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[10px] px-1.5 py-0"
              >
                {tag}
              </Badge>
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {template.charCount} chars
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE LIBRARY DIALOG
// Use this to open the library as a modal from any campaign prep window
// ═══════════════════════════════════════════════════════════════════════════════

interface TemplateLibraryDialogProps {
  children: React.ReactNode;
  onSelectTemplate?: (template: SMSTemplate) => void;
  selectedTemplateId?: string;
}

export function TemplateLibraryDialog({
  children,
  onSelectTemplate,
  selectedTemplateId,
}: TemplateLibraryDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (template: SMSTemplate) => {
    onSelectTemplate?.(template);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Template Library
          </DialogTitle>
          <DialogDescription>
            Browse and select templates organized by audience group
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <TemplateLibrary
            onSelectTemplate={handleSelect}
            selectedTemplateId={selectedTemplateId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE PICKER BUTTON
// Simple button that opens the library - use in campaign prep forms
// ═══════════════════════════════════════════════════════════════════════════════

interface TemplatePickerProps {
  onSelectTemplate?: (template: SMSTemplate) => void;
  selectedTemplate?: SMSTemplate | null;
  className?: string;
}

export function TemplatePicker({
  onSelectTemplate,
  selectedTemplate,
  className,
}: TemplatePickerProps) {
  return (
    <TemplateLibraryDialog
      onSelectTemplate={onSelectTemplate}
      selectedTemplateId={selectedTemplate?.id}
    >
      <Button variant="outline" className={className}>
        <MessageSquare className="h-4 w-4 mr-2" />
        {selectedTemplate ? (
          <span className="truncate max-w-[200px]">{selectedTemplate.name}</span>
        ) : (
          "Choose from Library"
        )}
        <ChevronRight className="h-4 w-4 ml-auto" />
      </Button>
    </TemplateLibraryDialog>
  );
}

export default TemplateLibrary;
