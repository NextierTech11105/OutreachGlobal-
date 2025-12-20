"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Link2,
  Newspaper,
  BookOpen,
  Video,
  Search,
  X,
  Plus,
  ExternalLink,
  Loader2,
  Star,
  Clock,
  Copy,
  Check,
  FileType,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

// Content item types that can be inserted as links
const LINK_TYPES = [
  "MEDIUM_ARTICLE",
  "NEWSLETTER",
  "EXTERNAL_LINK",
  "EBOOK",
  "ONE_PAGER",
  "CASE_STUDY",
  "VIDEO",
  "SMS_CONTENT_LINK",
];

interface ContentItem {
  id: string;
  title: string;
  content: string;
  description?: string;
  contentType: string;
  externalUrl?: string;
  tags: string[];
  usageCount: number;
  lastUsedAt?: Date;
  isFavorite: boolean;
  category?: {
    id: string;
    name: string;
    icon?: string;
  };
}

interface ContentInsertionPickerProps {
  teamId: string;
  onInsert: (content: { text: string; url?: string; item: ContentItem }) => void;
  triggerClassName?: string;
  disabled?: boolean;
}

const CONTENT_TYPE_ICONS: Record<string, React.ElementType> = {
  MEDIUM_ARTICLE: FileText,
  NEWSLETTER: Newspaper,
  EXTERNAL_LINK: Link2,
  EBOOK: BookOpen,
  ONE_PAGER: FileType,
  CASE_STUDY: FileText,
  VIDEO: Video,
  SMS_CONTENT_LINK: Link2,
  PROMPT: Sparkles,
  TEMPLATE: FileText,
  SCRIPT: FileText,
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  MEDIUM_ARTICLE: "Article",
  NEWSLETTER: "Newsletter",
  EXTERNAL_LINK: "Link",
  EBOOK: "eBook",
  ONE_PAGER: "One-Pager",
  CASE_STUDY: "Case Study",
  VIDEO: "Video",
  SMS_CONTENT_LINK: "SMS Link",
  PROMPT: "Prompt",
  TEMPLATE: "Template",
  SCRIPT: "Script",
};

export function ContentInsertionPicker({
  teamId,
  onInsert,
  triggerClassName,
  disabled = false,
}: ContentInsertionPickerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "links" | "favorites">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch content items
  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/content-library/items?teamId=${teamId}&search=${searchQuery}`
      );
      const data = await response.json();

      if (data.success || data.items) {
        setItems(
          (data.items || []).map((item: any) => ({
            ...item,
            lastUsedAt: item.lastUsedAt ? new Date(item.lastUsedAt) : undefined,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch content:", error);
    } finally {
      setLoading(false);
    }
  }, [teamId, searchQuery]);

  useEffect(() => {
    if (open) {
      fetchContent();
    }
  }, [open, fetchContent]);

  // Filter items based on tab
  const filteredItems = items.filter((item) => {
    if (activeTab === "links") {
      return LINK_TYPES.includes(item.contentType);
    }
    if (activeTab === "favorites") {
      return item.isFavorite;
    }
    return true;
  });

  // Handle content insertion
  const handleInsert = (item: ContentItem) => {
    const insertContent = {
      text: item.externalUrl || item.content,
      url: item.externalUrl,
      item,
    };

    onInsert(insertContent);

    // Log usage
    fetch(`/api/content-library/log-usage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentItemId: item.id,
        teamId,
        usedIn: "CAMPAIGN",
      }),
    }).catch(console.error);

    toast.success(`Inserted: ${item.title}`);
    setOpen(false);
  };

  // Copy URL to clipboard
  const handleCopy = async (item: ContentItem) => {
    const textToCopy = item.externalUrl || item.content;
    await navigator.clipboard.writeText(textToCopy);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn("gap-2", triggerClassName)}
        >
          <Plus className="w-4 h-4" />
          Insert Content
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Insert Content
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery("")}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="all">All Content</TabsTrigger>
            <TabsTrigger value="links">Links Only</TabsTrigger>
            <TabsTrigger value="favorites">
              <Star className="w-3 h-3 mr-1" />
              Favorites
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4 flex-1">
            <ScrollArea className="h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                  <FileText className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-sm">No content found</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    {activeTab === "links"
                      ? "Add articles, ebooks, or links to your content library"
                      : "Create content in the Content Library"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map((item) => {
                    const Icon =
                      CONTENT_TYPE_ICONS[item.contentType] || FileText;
                    const label =
                      CONTENT_TYPE_LABELS[item.contentType] || item.contentType;
                    const isLink = LINK_TYPES.includes(item.contentType);

                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 group transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div
                            className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                              isLink
                                ? "bg-blue-500/20"
                                : "bg-purple-500/20"
                            )}
                          >
                            <Icon
                              className={cn(
                                "w-5 h-5",
                                isLink ? "text-blue-400" : "text-purple-400"
                              )}
                            />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-zinc-100 truncate">
                                {item.title}
                              </h4>
                              {item.isFavorite && (
                                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                              )}
                            </div>

                            {item.description && (
                              <p className="text-sm text-zinc-400 line-clamp-1 mb-2">
                                {item.description}
                              </p>
                            )}

                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className="text-xs"
                              >
                                {label}
                              </Badge>

                              {item.category && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {item.category.name}
                                </Badge>
                              )}

                              {item.usageCount > 0 && (
                                <span className="text-xs text-zinc-500">
                                  Used {item.usageCount}x
                                </span>
                              )}

                              {item.lastUsedAt && (
                                <span className="text-xs text-zinc-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDistanceToNow(item.lastUsedAt, {
                                    addSuffix: true,
                                  })}
                                </span>
                              )}
                            </div>

                            {/* External URL preview */}
                            {item.externalUrl && (
                              <div className="mt-2 flex items-center gap-2 text-xs text-blue-400">
                                <ExternalLink className="w-3 h-3" />
                                <span className="truncate">
                                  {item.externalUrl}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleCopy(item)}
                                  >
                                    {copiedId === item.id ? (
                                      <Check className="w-4 h-4 text-green-400" />
                                    ) : (
                                      <Copy className="w-4 h-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <Button
                              size="sm"
                              onClick={() => handleInsert(item)}
                              className="h-8"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Insert
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          <span className="text-xs text-zinc-500">
            {filteredItems.length} items
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              window.open("/t/content-library", "_blank");
            }}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Manage Library
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ContentInsertionPicker;
