"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getAIAssistantItems,
  createAIAssistantItem,
  updateAIAssistantItem,
  deleteAIAssistantItem,
  type AIAssistantItem,
  type AIAssistantCategory,
} from "@/lib/services/ai-assistant-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Edit, Trash2, MoreVertical, Tag, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function AIAssistantManager() {
  const router = useRouter();
  const [items, setItems] = useState<AIAssistantItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<AIAssistantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<AIAssistantCategory | "all">(
    "all",
  );

  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AIAssistantItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<AIAssistantItem | null>(
    null,
  );

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "scripts" as AIAssistantCategory,
    tags: [] as string[],
    currentTag: "",
  });

  const [formErrors, setFormErrors] = useState({
    title: false,
    content: false,
    category: false,
  });

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [searchQuery, activeTab, items]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await getAIAssistantItems();
      setItems(data);
      setFilteredItems(data);
    } catch (error) {
      console.error("Error fetching AI assistant data:", error);
      toast({
        title: "Error",
        description: "Failed to load AI assistant data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = [...items];

    // Filter by category
    if (activeTab !== "all") {
      filtered = filtered.filter((item) => item.category === activeTab);
    }

    // Filter by search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.content.toLowerCase().includes(query) ||
          item.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    setFilteredItems(filtered);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      category: "scripts",
      tags: [],
      currentTag: "",
    });
    setFormErrors({
      title: false,
      content: false,
      category: false,
    });
    setEditingItem(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: AIAssistantItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      content: item.content,
      category: item.category,
      tags: [...item.tags],
      currentTag: "",
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (item: AIAssistantItem) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field if it exists
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: false }));
    }
  };

  const handleCategoryChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      category: value as AIAssistantCategory,
    }));

    // Clear error for category if it exists
    if (formErrors.category) {
      setFormErrors((prev) => ({ ...prev, category: false }));
    }
  };

  const handleAddTag = () => {
    if (formData.currentTag.trim() === "") return;

    if (!formData.tags.includes(formData.currentTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, prev.currentTag.trim()],
        currentTag: "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, currentTag: "" }));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const validateForm = () => {
    const errors = {
      title: formData.title.trim() === "",
      content: formData.content.trim() === "",
      category: !formData.category,
    };

    setFormErrors(errors);
    return !Object.values(errors).some(Boolean);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      if (editingItem) {
        // Update existing item
        await updateAIAssistantItem(editingItem.id, {
          title: formData.title,
          content: formData.content,
          category: formData.category,
          tags: formData.tags,
        });

        toast({
          title: "Success",
          description: "AI assistant item updated successfully",
          variant: "default",
        });
      } else {
        // Create new item
        await createAIAssistantItem({
          title: formData.title,
          content: formData.content,
          category: formData.category,
          tags: formData.tags,
        });

        toast({
          title: "Success",
          description: "AI assistant item created successfully",
          variant: "default",
        });
      }

      // Refresh data
      await fetchItems();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving AI assistant item:", error);
      toast({
        title: "Error",
        description: `Failed to ${editingItem ? "update" : "create"} AI assistant item`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    setLoading(true);

    try {
      await deleteAIAssistantItem(itemToDelete.id);

      toast({
        title: "Success",
        description: "AI assistant item deleted successfully",
        variant: "default",
      });

      // Refresh data
      await fetchItems();
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting AI assistant item:", error);
      toast({
        title: "Error",
        description: "Failed to delete AI assistant item",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category: AIAssistantCategory): string => {
    switch (category) {
      case "scripts":
        return "Scripts";
      case "objections":
        return "Objections";
      case "keyPoints":
        return "Key Points";
      default:
        return "Unknown";
    }
  };

  const getCategoryBadgeVariant = (
    category: AIAssistantCategory,
  ): "default" | "secondary" | "outline-solid" => {
    switch (category) {
      case "scripts":
        return "default";
      case "objections":
        return "secondary";
      case "keyPoints":
        return "outline-solid";
      default:
        return "default";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>AI Assistant Content</CardTitle>
            <CardDescription>
              Manage scripts, objection handlers, and key information for the AI
              assistant
            </CardDescription>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add New
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-6">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, content, or tags..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as AIAssistantCategory | "all")
            }
            className="ml-4"
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="scripts">Scripts</TabsTrigger>
              <TabsTrigger value="objections">Objections</TabsTrigger>
              <TabsTrigger value="keyPoints">Key Points</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No items found
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>
                      <Badge variant={getCategoryBadgeVariant(item.category)}>
                        {getCategoryLabel(item.category)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {item.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{item.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEditDialog(item)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(item)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem
                ? "Edit AI Assistant Item"
                : "Create New AI Assistant Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the details for this AI assistant item"
                : "Add a new item to the AI assistant database"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title
                {formErrors.title && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={formErrors.title ? "border-destructive" : ""}
              />
              {formErrors.title && (
                <p className="text-xs text-destructive">Title is required</p>
              )}
            </div>

            <div className="grid gap-2">
              <label htmlFor="category" className="text-sm font-medium">
                Category
                {formErrors.category && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </label>
              <Select
                value={formData.category}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger
                  className={formErrors.category ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scripts">Scripts</SelectItem>
                  <SelectItem value="objections">Objections</SelectItem>
                  <SelectItem value="keyPoints">Key Points</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.category && (
                <p className="text-xs text-destructive">Category is required</p>
              )}
            </div>

            <div className="grid gap-2">
              <label htmlFor="content" className="text-sm font-medium">
                Content
                {formErrors.content && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </label>
              <Textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                className={`min-h-[120px] ${formErrors.content ? "border-destructive" : ""}`}
              />
              {formErrors.content && (
                <p className="text-xs text-destructive">Content is required</p>
              )}
            </div>

            <div className="grid gap-2">
              <label htmlFor="tags" className="text-sm font-medium">
                Tags
              </label>
              <div className="flex gap-2">
                <Input
                  id="currentTag"
                  name="currentTag"
                  value={formData.currentTag}
                  onChange={handleInputChange}
                  placeholder="Add a tag"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleAddTag}
                  variant="secondary"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 rounded-full hover:bg-muted p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {formData.tags.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No tags added yet
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving..." : editingItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the AI assistant item
              <span className="font-medium"> "{itemToDelete?.title}"</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
