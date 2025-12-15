"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Search,
  Plus,
  Copy,
  Star,
  StarOff,
  MoreHorizontal,
  Sparkles,
  FileText,
  Code,
  Database,
  Mail,
  MessageSquare,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Filter,
  Grid3X3,
  List,
  Loader2,
  Eye,
  Edit,
  Trash2,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCurrentTeam } from "@/features/team/team.context";
import { gql, useQuery, useMutation } from "@apollo/client";

// GraphQL Queries
const CONTENT_CATEGORIES_QUERY = gql`
  query ContentCategories($teamId: ID) {
    contentCategories(teamId: $teamId, includeSystem: true) {
      id
      name
      slug
      description
      icon
      color
      parentId
      isSystem
      itemCount
    }
  }
`;

const CONTENT_ITEMS_QUERY = gql`
  query ContentItems(
    $teamId: ID!
    $categoryId: ID
    $searchQuery: String
    $contentType: ContentItemType
    $favoritesOnly: Boolean
    $first: Int
  ) {
    contentItems(
      teamId: $teamId
      categoryId: $categoryId
      searchQuery: $searchQuery
      contentType: $contentType
      favoritesOnly: $favoritesOnly
      first: $first
    ) {
      edges {
        node {
          id
          title
          content
          description
          contentType
          tags
          usageCount
          lastUsedAt
          isFavorite
          isActive
          category {
            id
            name
            icon
            color
          }
          createdAt
          updatedAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const USE_CONTENT_ITEM_MUTATION = gql`
  mutation UseContentItem($teamId: ID!, $id: ID!, $usedIn: ContentUsedIn!) {
    useContentItem(teamId: $teamId, id: $id, usedIn: $usedIn) {
      success
      newUsageCount
    }
  }
`;

const TOGGLE_FAVORITE_MUTATION = gql`
  mutation ToggleFavorite($id: ID!) {
    toggleContentItemFavorite(id: $id) {
      contentItem {
        id
        isFavorite
      }
    }
  }
`;

const CREATE_CONTENT_ITEM_MUTATION = gql`
  mutation CreateContentItem($teamId: ID!, $input: CreateContentItemInput!) {
    createContentItem(teamId: $teamId, input: $input) {
      contentItem {
        id
        title
        content
        description
        contentType
        tags
        categoryId
      }
    }
  }
`;

// Icon mapping for categories
const iconMap: Record<string, React.ReactNode> = {
  mail: <Mail className="h-4 w-4" />,
  "message-square": <MessageSquare className="h-4 w-4" />,
  "file-text": <FileText className="h-4 w-4" />,
  code: <Code className="h-4 w-4" />,
  database: <Database className="h-4 w-4" />,
  sparkles: <Sparkles className="h-4 w-4" />,
  default: <FolderOpen className="h-4 w-4" />,
};

const getIcon = (iconName?: string | null) => {
  if (!iconName) return iconMap.default;
  return iconMap[iconName] || iconMap.default;
};

// Content type icons
const contentTypeIcons: Record<string, React.ReactNode> = {
  PROMPT: <Sparkles className="h-4 w-4" />,
  TEMPLATE: <FileText className="h-4 w-4" />,
  SCRIPT: <Code className="h-4 w-4" />,
  SQL_QUERY: <Database className="h-4 w-4" />,
  CODE_SNIPPET: <Code className="h-4 w-4" />,
  DOCUMENTATION: <FileText className="h-4 w-4" />,
};

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  parentId?: string;
  isSystem?: boolean;
  itemCount?: number;
}

interface ContentItem {
  id: string;
  title: string;
  content: string;
  description?: string;
  contentType: string;
  tags?: string[];
  usageCount?: number;
  lastUsedAt?: string;
  isFavorite?: boolean;
  isActive?: boolean;
  category?: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function LibraryPage() {
  const { teamId, isTeamReady } = useCurrentTeam();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

  // Create form state
  const [newItem, setNewItem] = useState({
    title: "",
    content: "",
    description: "",
    contentType: "PROMPT",
    categoryId: "",
    tags: "",
  });

  // Queries
  const { data: categoriesData, loading: categoriesLoading } = useQuery(
    CONTENT_CATEGORIES_QUERY,
    {
      variables: { teamId },
      skip: !isTeamReady,
    },
  );

  const {
    data: itemsData,
    loading: itemsLoading,
    refetch: refetchItems,
  } = useQuery(CONTENT_ITEMS_QUERY, {
    variables: {
      teamId,
      categoryId: selectedCategory,
      searchQuery: searchQuery || undefined,
      contentType: selectedType || undefined,
      favoritesOnly: showFavoritesOnly || undefined,
      first: 50,
    },
    skip: !isTeamReady,
  });

  // Mutations
  const [useContentItem] = useMutation(USE_CONTENT_ITEM_MUTATION);
  const [toggleFavorite] = useMutation(TOGGLE_FAVORITE_MUTATION);
  const [createContentItem] = useMutation(CREATE_CONTENT_ITEM_MUTATION);

  const categories: Category[] = categoriesData?.contentCategories || [];
  const items: ContentItem[] =
    itemsData?.contentItems?.edges?.map((e: any) => e.node) || [];

  // Build category tree
  const categoryTree = useMemo(() => {
    const rootCategories = categories.filter((c) => !c.parentId);
    const childrenMap = new Map<string, Category[]>();

    categories.forEach((c) => {
      if (c.parentId) {
        const children = childrenMap.get(c.parentId) || [];
        children.push(c);
        childrenMap.set(c.parentId, children);
      }
    });

    return { rootCategories, childrenMap };
  }, [categories]);

  const handleCopyContent = async (item: ContentItem) => {
    try {
      await navigator.clipboard.writeText(item.content);
      toast.success("Content copied to clipboard!");

      // Log usage
      await useContentItem({
        variables: { teamId, id: item.id, usedIn: "MANUAL" },
      });
    } catch (err) {
      toast.error("Failed to copy content");
    }
  };

  const handleToggleFavorite = async (item: ContentItem) => {
    try {
      await toggleFavorite({
        variables: { id: item.id },
      });
      refetchItems();
      toast.success(
        item.isFavorite ? "Removed from favorites" : "Added to favorites",
      );
    } catch (err) {
      toast.error("Failed to update favorite");
    }
  };

  const handleUseInAI = async (item: ContentItem) => {
    try {
      await useContentItem({
        variables: { teamId, id: item.id, usedIn: "AI" },
      });
      toast.success("Opening in AI assistant...");
      // TODO: Integrate with AI chat
    } catch (err) {
      toast.error("Failed to use content");
    }
  };

  const handleCreateItem = async () => {
    if (!newItem.title || !newItem.content) {
      toast.error("Title and content are required");
      return;
    }

    try {
      await createContentItem({
        variables: {
          teamId,
          input: {
            title: newItem.title,
            content: newItem.content,
            description: newItem.description || undefined,
            contentType: newItem.contentType,
            categoryId: newItem.categoryId || undefined,
            tags: newItem.tags
              ? newItem.tags.split(",").map((t) => t.trim())
              : [],
          },
        },
      });

      toast.success("Content created successfully!");
      setShowCreateDialog(false);
      setNewItem({
        title: "",
        content: "",
        description: "",
        contentType: "PROMPT",
        categoryId: "",
        tags: "",
      });
      refetchItems();
    } catch (err) {
      toast.error("Failed to create content");
    }
  };

  const toggleCategoryExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const renderCategoryTree = (category: Category, depth = 0) => {
    const children = categoryTree.childrenMap.get(category.id) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const isSelected = selectedCategory === category.id;

    return (
      <div key={category.id}>
        <button
          onClick={() => {
            setSelectedCategory(isSelected ? null : category.id);
            if (hasChildren) toggleCategoryExpand(category.id);
          }}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
            isSelected
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted text-muted-foreground hover:text-foreground",
          )}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0" />
            )
          ) : (
            <span className="w-4" />
          )}
          <span
            className="w-5 h-5 rounded flex items-center justify-center shrink-0"
            style={{ backgroundColor: category.color || "#6366f1" }}
          >
            {getIcon(category.icon)}
          </span>
          <span className="truncate flex-1 text-left">{category.name}</span>
          {category.itemCount !== undefined && category.itemCount > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {category.itemCount}
            </Badge>
          )}
        </button>

        {hasChildren && isExpanded && (
          <div className="mt-1">
            {children.map((child) => renderCategoryTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderContentCard = (item: ContentItem) => (
    <Card
      key={item.id}
      className={cn(
        "group cursor-pointer hover:shadow-md transition-all",
        viewMode === "list" && "flex items-start",
      )}
      onClick={() => {
        setSelectedItem(item);
        setShowPreviewDialog(true);
      }}
    >
      <CardHeader className={cn(viewMode === "list" && "flex-1")}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              {contentTypeIcons[item.contentType] || contentTypeIcons.PROMPT}
            </span>
            <CardTitle className="text-base line-clamp-1">
              {item.title}
            </CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyContent(item);
                }}
              >
                <Copy className="h-4 w-4 mr-2" /> Copy Content
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleUseInAI(item);
                }}
              >
                <Sparkles className="h-4 w-4 mr-2" /> Use in AI
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite(item);
                }}
              >
                {item.isFavorite ? (
                  <>
                    <StarOff className="h-4 w-4 mr-2" /> Remove Favorite
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4 mr-2" /> Add to Favorites
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedItem(item);
                  setShowPreviewDialog(true);
                }}
              >
                <Eye className="h-4 w-4 mr-2" /> Preview
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {item.description && (
          <CardDescription className="line-clamp-2 mt-1">
            {item.description}
          </CardDescription>
        )}
      </CardHeader>

      {viewMode === "grid" && (
        <CardContent>
          <pre className="text-xs text-muted-foreground bg-muted p-2 rounded-md line-clamp-3 overflow-hidden whitespace-pre-wrap font-mono">
            {item.content}
          </pre>
        </CardContent>
      )}

      <CardFooter
        className={cn("pt-0", viewMode === "list" && "flex-shrink-0")}
      >
        <div className="flex items-center gap-2 w-full">
          {item.category && (
            <Badge
              variant="outline"
              className="text-xs"
              style={{ borderColor: item.category.color }}
            >
              {item.category.name}
            </Badge>
          )}
          {item.tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            {item.isFavorite && (
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            )}
            {item.usageCount && item.usageCount > 0 && (
              <span>{item.usageCount} uses</span>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Content Library</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Prompts, templates & scripts
          </p>
        </div>

        <ScrollArea className="flex-1 p-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md mb-2",
              !selectedCategory
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            <FolderOpen className="h-4 w-4" />
            All Content
          </button>

          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md mb-4",
              showFavoritesOnly
                ? "bg-yellow-500/20 text-yellow-600"
                : "hover:bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            <Star
              className={cn("h-4 w-4", showFavoritesOnly && "fill-yellow-400")}
            />
            Favorites
          </button>

          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">
            Categories
          </div>

          {categoriesLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            categoryTree.rootCategories.map((category) =>
              renderCategoryTree(category),
            )
          )}
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={selectedType || ""}
              onValueChange={(v) => setSelectedType(v || null)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="PROMPT">Prompts</SelectItem>
                <SelectItem value="TEMPLATE">Templates</SelectItem>
                <SelectItem value="SCRIPT">Scripts</SelectItem>
                <SelectItem value="SQL_QUERY">SQL Queries</SelectItem>
                <SelectItem value="CODE_SNIPPET">Code Snippets</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Content
            </Button>
          </div>
        </div>

        {/* Content Grid */}
        <ScrollArea className="flex-1 p-4">
          {itemsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg">No content found</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {searchQuery
                  ? "Try adjusting your search or filters"
                  : "Create your first content item to get started"}
              </p>
              <Button
                className="mt-4"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Content
              </Button>
            </div>
          ) : (
            <div
              className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  : "space-y-3",
              )}
            >
              {items.map(renderContentCard)}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Content</DialogTitle>
            <DialogDescription>
              Add a new prompt, template, or script to your library.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={newItem.title}
                  onChange={(e) =>
                    setNewItem({ ...newItem, title: e.target.value })
                  }
                  placeholder="Enter title..."
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newItem.contentType}
                  onValueChange={(v) =>
                    setNewItem({ ...newItem, contentType: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROMPT">Prompt</SelectItem>
                    <SelectItem value="TEMPLATE">Template</SelectItem>
                    <SelectItem value="SCRIPT">Script</SelectItem>
                    <SelectItem value="SQL_QUERY">SQL Query</SelectItem>
                    <SelectItem value="CODE_SNIPPET">Code Snippet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={newItem.categoryId}
                onValueChange={(v) => setNewItem({ ...newItem, categoryId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={newItem.description}
                onChange={(e) =>
                  setNewItem({ ...newItem, description: e.target.value })
                }
                placeholder="Brief description..."
              />
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={newItem.content}
                onChange={(e) =>
                  setNewItem({ ...newItem, content: e.target.value })
                }
                placeholder="Enter your prompt, template, or script..."
                className="min-h-[200px] font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Tags (comma separated)</Label>
              <Input
                value={newItem.tags}
                onChange={(e) =>
                  setNewItem({ ...newItem, tags: e.target.value })
                }
                placeholder="outreach, email, cold..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateItem}>Create Content</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {selectedItem && contentTypeIcons[selectedItem.contentType]}
              <DialogTitle>{selectedItem?.title}</DialogTitle>
            </div>
            {selectedItem?.description && (
              <DialogDescription>{selectedItem.description}</DialogDescription>
            )}
          </DialogHeader>

          <ScrollArea className="flex-1 py-4">
            <pre className="text-sm bg-muted p-4 rounded-md whitespace-pre-wrap font-mono">
              {selectedItem?.content}
            </pre>
          </ScrollArea>

          <div className="flex items-center gap-2 pt-4 border-t">
            {selectedItem?.category && (
              <Badge
                variant="outline"
                style={{ borderColor: selectedItem.category.color }}
              >
                {selectedItem.category.name}
              </Badge>
            )}
            {selectedItem?.tags?.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => selectedItem && handleToggleFavorite(selectedItem)}
            >
              {selectedItem?.isFavorite ? (
                <>
                  <StarOff className="h-4 w-4 mr-2" /> Remove Favorite
                </>
              ) : (
                <>
                  <Star className="h-4 w-4 mr-2" /> Add to Favorites
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => selectedItem && handleUseInAI(selectedItem)}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Use in AI
            </Button>
            <Button
              onClick={() => selectedItem && handleCopyContent(selectedItem)}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Content
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
