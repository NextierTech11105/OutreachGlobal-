"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Zap,
  Bell,
  Calendar,
  Check,
  Copy,
  Pencil,
  Trash2,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Tag,
  Sparkles,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type SmsTemplate,
  type TemplateCategory,
  type WorkerType,
  type VerticalType,
  ALL_EXAMPLE_TEMPLATES,
  TEMPLATE_VARIABLES,
  WORKER_META,
  COMPLIANCE_RULES,
} from "@/lib/templates/nextier-defaults";

// Extended templates with CATHY retarget from user input
const EXTENDED_CATHY_TEMPLATES: SmsTemplate[] = [
  // Quick Check-In
  {
    id: "cathy-retarget-check-1",
    name: "Quick Check-In",
    content:
      "Hey {firstName}! Just checking in — still interested in chatting? Let me know if now works better!",
    category: "retarget",
    worker: "cathy",
    vertical: "universal",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 104,
  },
  // Busy Week
  {
    id: "cathy-retarget-busy-1",
    name: "Busy Week",
    content:
      "Hey {firstName}, I know things get busy. Still interested in that valuation? Just reply and we can set up a quick call.",
    category: "retarget",
    worker: "cathy",
    vertical: "business-broker",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 133,
  },
  // Making Sure
  {
    id: "cathy-retarget-making-sure-1",
    name: "Making Sure",
    content:
      "Hey {firstName}! Making sure my messages are getting through. If you're still interested, I'm here!",
    category: "retarget",
    worker: "cathy",
    vertical: "universal",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 104,
  },
  // Different Angle
  {
    id: "cathy-retarget-angle-1",
    name: "Different Angle",
    content:
      "{firstName}, maybe timing wasn't right before. Still curious about what your business could sell for?",
    category: "retarget",
    worker: "cathy",
    vertical: "business-broker",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 104,
  },
  // No Pressure
  {
    id: "cathy-retarget-no-pressure-1",
    name: "No Pressure",
    content:
      "Hey {firstName}, no pressure at all — just wanted to see if you're still thinking about getting a valuation. Thoughts?",
    category: "retarget",
    worker: "cathy",
    vertical: "business-broker",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 125,
  },
  // Circle Back
  {
    id: "cathy-retarget-circle-1",
    name: "Circle Back",
    content:
      "Gianna here again. Wanted to circle back — still interested in knowing what your business is worth?",
    category: "retarget",
    worker: "cathy",
    vertical: "business-broker",
    variables: [],
    complianceApproved: true,
    characterCount: 102,
  },
  // Quick Question
  {
    id: "cathy-retarget-quick-q-1",
    name: "Quick Question",
    content:
      "Hey {firstName}, quick question — is now a better time to chat about that valuation? Just say the word.",
    category: "retarget",
    worker: "cathy",
    vertical: "business-broker",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 112,
  },
  // Still Here
  {
    id: "cathy-retarget-still-here-1",
    name: "Still Here",
    content:
      "Hey {firstName}! Still here if you want that valuation. No rush — just let me know when you're ready.",
    category: "retarget",
    worker: "cathy",
    vertical: "business-broker",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 106,
  },
  // Last Check
  {
    id: "cathy-retarget-last-1",
    name: "Last Check",
    content:
      "{firstName}, last check-in — still interested in finding out what your business could sell for? Either way, let me know!",
    category: "retarget",
    worker: "cathy",
    vertical: "business-broker",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 127,
  },
  // Timing Better
  {
    id: "cathy-retarget-timing-1",
    name: "Timing Better",
    content:
      "Hey {firstName}, maybe the timing wasn't great before. Would a quick call work better now?",
    category: "retarget",
    worker: "cathy",
    vertical: "universal",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 96,
  },
  // Market Update
  {
    id: "cathy-retarget-market-1",
    name: "Market Update",
    content:
      "{firstName}, quick market update — valuations in {industry} are shifting. Want to know where you stand?",
    category: "retarget",
    worker: "cathy",
    vertical: "business-broker",
    variables: ["firstName", "industry"],
    complianceApproved: true,
    characterCount: 108,
  },
  // Simple Reply
  {
    id: "cathy-retarget-simple-1",
    name: "Simple Reply",
    content:
      "Hey {firstName}! Just reply YES if you still want that valuation. No if not. Either works!",
    category: "retarget",
    worker: "cathy",
    vertical: "business-broker",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 96,
  },
  // Free Reminder
  {
    id: "cathy-retarget-free-1",
    name: "Free Reminder",
    content:
      "Quick reminder — that free valuation I mentioned is still available. Worth 5 mins? Let me know!",
    category: "retarget",
    worker: "cathy",
    vertical: "business-broker",
    variables: [],
    complianceApproved: true,
    characterCount: 103,
  },
];

// Combine all templates
const COMBINED_TEMPLATES = [
  ...ALL_EXAMPLE_TEMPLATES,
  ...EXTENDED_CATHY_TEMPLATES,
];

const WORKER_CONFIG = {
  gianna: {
    name: "GIANNA",
    icon: Zap,
    color: "text-purple-600 dark:text-purple-300",
    bgColor:
      "bg-purple-100 dark:bg-purple-900/50 border border-purple-300 dark:border-purple-500/30",
  },
  cathy: {
    name: "CATHY",
    icon: Bell,
    color: "text-orange-600 dark:text-orange-300",
    bgColor:
      "bg-orange-100 dark:bg-orange-900/50 border border-orange-300 dark:border-orange-500/30",
  },
  sabrina: {
    name: "SABRINA",
    icon: Calendar,
    color: "text-emerald-600 dark:text-emerald-300",
    bgColor:
      "bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-500/30",
  },
};

const CATEGORY_CONFIG: Record<
  TemplateCategory,
  { label: string; color: string }
> = {
  initial: {
    label: "Initial",
    color:
      "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30",
  },
  retarget: {
    label: "Retarget",
    color:
      "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-500/30",
  },
  nudge: {
    label: "Nudge",
    color:
      "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-500/30",
  },
  closer: {
    label: "Closer",
    color:
      "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30",
  },
  breakup: {
    label: "Breakup",
    color:
      "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-500/30",
  },
  "value-drop": {
    label: "Value Drop",
    color:
      "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30",
  },
  callback: {
    label: "Callback",
    color:
      "bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30",
  },
  "exit-expansion": {
    label: "Exit & Expansion",
    color:
      "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30",
  },
};

interface TemplateLibraryProps {
  onSelect?: (template: SmsTemplate) => void;
  selectedTemplateId?: string;
  inline?: boolean;
  allowEdit?: boolean;
}

export function TemplateLibrary({
  onSelect,
  selectedTemplateId,
  inline = false,
  allowEdit = false,
}: TemplateLibraryProps) {
  const [search, setSearch] = useState("");
  const [activeWorker, setActiveWorker] = useState<WorkerType | "all">("all");
  const [activeCategory, setActiveCategory] = useState<
    TemplateCategory | "all"
  >("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editTemplate, setEditTemplate] = useState<SmsTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<SmsTemplate | null>(
    null,
  );
  const [remixingId, setRemixingId] = useState<string | null>(null);
  const [remixedContent, setRemixedContent] = useState<string | null>(null);

  // Remix template to 160 chars using AI
  const remixTo160 = async (template: SmsTemplate) => {
    setRemixingId(template.id);
    setRemixedContent(null);

    try {
      const response = await fetch("/api/ai/remix-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: template.content,
          targetLength: 160,
          preserveVariables: true,
          worker: template.worker,
          category: template.category,
        }),
      });

      if (!response.ok) {
        // Fallback: simple truncation with ellipsis
        const truncated = template.content.substring(0, 157) + "...";
        setRemixedContent(truncated);
        return;
      }

      const data = await response.json();
      setRemixedContent(
        data.remixedContent || template.content.substring(0, 157) + "...",
      );
    } catch (error) {
      // Fallback: intelligent truncation
      const words = template.content.split(" ");
      let result = "";
      for (const word of words) {
        if ((result + " " + word).length <= 157) {
          result = result ? result + " " + word : word;
        } else break;
      }
      setRemixedContent(result + "...");
    } finally {
      setRemixingId(null);
    }
  };

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return COMBINED_TEMPLATES.filter((t) => {
      const matchesSearch =
        search === "" ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.content.toLowerCase().includes(search.toLowerCase());
      const matchesWorker = activeWorker === "all" || t.worker === activeWorker;
      const matchesCategory =
        activeCategory === "all" || t.category === activeCategory;
      return matchesSearch && matchesWorker && matchesCategory;
    });
  }, [search, activeWorker, activeCategory]);

  // Group by category
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, SmsTemplate[]> = {};
    filteredTemplates.forEach((t) => {
      if (!groups[t.category]) groups[t.category] = [];
      groups[t.category].push(t);
    });
    return groups;
  }, [filteredTemplates]);

  // Preview with sample data
  const getPreviewContent = (content: string) => {
    return content
      .replace(/{firstName}/g, "John")
      .replace(/{lastName}/g, "Smith")
      .replace(/{companyName}/g, "Smith Auto Repair")
      .replace(/{industry}/g, "auto repair")
      .replace(/{city}/g, "Brooklyn")
      .replace(/{state}/g, "NY")
      .replace(/{revenueRange}/g, "$1-5M")
      .replace(/{calendarLink}/g, "calendly.com/tb-outreachglobal/15min");
  };

  const renderTemplate = (template: SmsTemplate) => {
    const workerConfig = WORKER_CONFIG[template.worker];
    const categoryConfig = CATEGORY_CONFIG[template.category];
    const isSelected = selectedTemplateId === template.id;
    const isCompliant = template.characterCount <= 160;

    return (
      <Card
        key={template.id}
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          isSelected && "ring-2 ring-primary",
          !isCompliant && "border-orange-300",
        )}
        onClick={() => onSelect?.(template)}
      >
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded", workerConfig.bgColor)}>
                <workerConfig.icon
                  className={cn("h-3.5 w-3.5", workerConfig.color)}
                />
              </div>
              <span className="font-medium text-sm">{template.name}</span>
            </div>
            <Badge className={cn("text-xs", categoryConfig.color)}>
              {categoryConfig.label}
            </Badge>
          </div>

          {/* Content */}
          <p className="text-sm text-white">{template.content}</p>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex items-center gap-1",
                  isCompliant ? "text-emerald-400" : "text-orange-400",
                )}
              >
                {isCompliant ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <AlertTriangle className="h-3 w-3" />
                )}
                {template.characterCount} chars
              </span>
              {template.variables.length > 0 && (
                <span className="text-zinc-400 flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {template.variables.length} vars
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Remix to 160 button - only show for long templates */}
              {!isCompliant && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    remixTo160(template);
                    setPreviewTemplate(template);
                  }}
                  disabled={remixingId === template.id}
                >
                  {remixingId === template.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 mr-1" />
                      160
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewTemplate(template);
                }}
              >
                <MessageSquare className="h-3 w-3" />
              </Button>
              {isSelected && <Check className="h-4 w-4 text-primary" />}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={cn("space-y-4", !inline && "p-6")}>
      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Template
        </Button>
      </div>

      {/* Worker Tabs */}
      <Tabs
        value={activeWorker}
        onValueChange={(v) => setActiveWorker(v as WorkerType | "all")}
      >
        <TabsList>
          <TabsTrigger value="all">All Workers</TabsTrigger>
          {(Object.keys(WORKER_CONFIG) as WorkerType[]).map((worker) => {
            const config = WORKER_CONFIG[worker];
            return (
              <TabsTrigger key={worker} value={worker} className="gap-1.5">
                <config.icon className="h-3.5 w-3.5" />
                {config.name}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeCategory === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveCategory("all")}
        >
          All Categories
        </Button>
        {(Object.keys(CATEGORY_CONFIG) as TemplateCategory[]).map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(cat)}
            className={cn(activeCategory === cat && CATEGORY_CONFIG[cat].color)}
          >
            {CATEGORY_CONFIG[cat].label}
          </Button>
        ))}
      </div>

      {/* Templates Grid */}
      <ScrollArea className={cn(inline ? "h-[400px]" : "h-[500px]")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
          {Object.entries(groupedTemplates).map(([category, templates]) => (
            <div key={category} className="col-span-full space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2 sticky top-0 bg-background py-2">
                <Badge
                  className={
                    CATEGORY_CONFIG[category as TemplateCategory]?.color
                  }
                >
                  {CATEGORY_CONFIG[category as TemplateCategory]?.label ||
                    category}
                </Badge>
                <span className="text-muted-foreground font-normal">
                  ({templates.length} templates)
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {templates.map(renderTemplate)}
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No templates found matching your criteria</p>
          </div>
        )}
      </ScrollArea>

      {/* Add Template Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Template Name</Label>
                <Input placeholder="e.g., Warm Intro" className="mt-1" />
              </div>
              <div>
                <Label>Worker</Label>
                <Select defaultValue="gianna">
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gianna">
                      GIANNA - Initial Outreach
                    </SelectItem>
                    <SelectItem value="cathy">
                      CATHY - Follow-up & Nudge
                    </SelectItem>
                    <SelectItem value="sabrina">SABRINA - Booking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Select defaultValue="initial">
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="initial">Initial</SelectItem>
                  <SelectItem value="retarget">Retarget</SelectItem>
                  <SelectItem value="nudge">Nudge</SelectItem>
                  <SelectItem value="closer">Closer</SelectItem>
                  <SelectItem value="breakup">Breakup</SelectItem>
                  <SelectItem value="value-drop">Value Drop</SelectItem>
                  <SelectItem value="callback">Callback</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Message Content</Label>
                <span className="text-xs text-muted-foreground">
                  0 / 160 chars
                </span>
              </div>
              <Textarea
                placeholder="Hey {firstName}, ..."
                className="mt-1 h-24 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Variables: {"{firstName}"}, {"{lastName}"}, {"{companyName}"},{" "}
                {"{industry}"}, {"{city}"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowAddDialog(false)}>
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      {previewTemplate && (
        <Dialog open onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Template Preview</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">
                  Template
                </Label>
                <p className="text-sm mt-1">{previewTemplate.content}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Preview (with sample data)
                </Label>
                <Card className="mt-2 bg-muted/50">
                  <CardContent className="p-3">
                    <p className="text-sm">
                      {getPreviewContent(previewTemplate.content)}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span
                  className={cn(
                    "flex items-center gap-1",
                    previewTemplate.characterCount <= 160
                      ? "text-green-600"
                      : "text-orange-600",
                  )}
                >
                  {previewTemplate.characterCount <= 160 ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  {previewTemplate.characterCount} / 160 characters
                </span>
                {previewTemplate.variables.length > 0 && (
                  <span className="text-muted-foreground">
                    Variables: {previewTemplate.variables.join(", ")}
                  </span>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPreviewTemplate(null)}
              >
                Close
              </Button>
              {onSelect && (
                <Button
                  onClick={() => {
                    onSelect(previewTemplate);
                    setPreviewTemplate(null);
                  }}
                >
                  Use Template
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default TemplateLibrary;
