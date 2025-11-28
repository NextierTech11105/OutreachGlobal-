"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Trash2,
  Pencil,
  Save,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Prompt {
  id: string;
  name: string;
  description: string;
  type: "email" | "sms" | "voice";
  prompt: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export function PromptLibraryManager() {
  const [activeTab, setActiveTab] = useState<string>("email");
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<Partial<Prompt>>({
    name: "",
    description: "",
    type: "email",
    prompt: "",
    category: "outreach",
    tags: [],
  });
  const [isEditing, setIsEditing] = useState(false);
  const [newTag, setNewTag] = useState("");
  const { toast } = useToast();

  // Fetch prompts
  const fetchPrompts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/prompt-library");
      if (response.ok) {
        const data = await response.json();
        setPrompts(data.prompts);
      }
    } catch (error) {
      console.error("Error fetching prompts:", error);
      toast({
        title: "Error",
        description: "Failed to load prompts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const handleSavePrompt = async () => {
    if (!currentPrompt.name || !currentPrompt.prompt) {
      toast({
        title: "Missing fields",
        description: "Name and prompt text are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const url =
        isEditing && currentPrompt.id
          ? `/api/admin/prompt-library/${currentPrompt.id}`
          : "/api/admin/prompt-library";

      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(currentPrompt),
      });

      if (!response.ok) {
        throw new Error("Failed to save prompt");
      }

      toast({
        title: isEditing ? "Prompt updated" : "Prompt created",
        description: `Successfully ${isEditing ? "updated" : "created"} the prompt template`,
      });

      setIsDialogOpen(false);
      fetchPrompts();
    } catch (error) {
      console.error("Error saving prompt:", error);
      toast({
        title: "Error",
        description: "Failed to save prompt",
        variant: "destructive",
      });
    }
  };

  const handleDeletePrompt = async (id: string) => {
    if (!confirm("Are you sure you want to delete this prompt?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/prompt-library/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete prompt");
      }

      toast({
        title: "Prompt deleted",
        description: "Successfully deleted the prompt template",
      });

      fetchPrompts();
    } catch (error) {
      console.error("Error deleting prompt:", error);
      toast({
        title: "Error",
        description: "Failed to delete prompt",
        variant: "destructive",
      });
    }
  };

  const handleEditPrompt = (prompt: Prompt) => {
    setCurrentPrompt(prompt);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleAddPrompt = () => {
    setCurrentPrompt({
      name: "",
      description: "",
      type: activeTab as "email" | "sms" | "voice",
      prompt: "",
      category: "outreach",
      tags: [],
    });
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const handleAddTag = () => {
    if (newTag && !currentPrompt.tags?.includes(newTag)) {
      setCurrentPrompt((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), newTag],
      }));
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setCurrentPrompt((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tag) || [],
    }));
  };

  const filteredPrompts = prompts.filter((prompt) => prompt.type === activeTab);

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Prompts
            </TabsTrigger>
            <TabsTrigger value="sms" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              SMS Prompts
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Voice Prompts
            </TabsTrigger>
          </TabsList>

          <Button onClick={handleAddPrompt} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Prompt
          </Button>
        </div>

        <TabsContent value="email" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <p>Loading prompts...</p>
            ) : filteredPrompts.length === 0 ? (
              <p>No email prompts found. Create your first one!</p>
            ) : (
              filteredPrompts.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  onEdit={() => handleEditPrompt(prompt)}
                  onDelete={() => handleDeletePrompt(prompt.id)}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="sms" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <p>Loading prompts...</p>
            ) : filteredPrompts.length === 0 ? (
              <p>No SMS prompts found. Create your first one!</p>
            ) : (
              filteredPrompts.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  onEdit={() => handleEditPrompt(prompt)}
                  onDelete={() => handleDeletePrompt(prompt.id)}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="voice" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <p>Loading prompts...</p>
            ) : filteredPrompts.length === 0 ? (
              <p>No voice prompts found. Create your first one!</p>
            ) : (
              filteredPrompts.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  onEdit={() => handleEditPrompt(prompt)}
                  onDelete={() => handleDeletePrompt(prompt.id)}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Prompt" : "Create New Prompt"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update this prompt template for AI message generation"
                : "Create a new prompt template for AI message generation"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prompt-name">Name</Label>
                <Input
                  id="prompt-name"
                  value={currentPrompt.name}
                  onChange={(e) =>
                    setCurrentPrompt((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="E.g., Professional Follow-up"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt-category">Category</Label>
                <Select
                  value={currentPrompt.category}
                  onValueChange={(value) =>
                    setCurrentPrompt((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outreach">Outreach</SelectItem>
                    <SelectItem value="followup">Follow-up</SelectItem>
                    <SelectItem value="nurture">Nurture</SelectItem>
                    <SelectItem value="conversion">Conversion</SelectItem>
                    <SelectItem value="reengagement">Re-engagement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt-description">Description</Label>
              <Input
                id="prompt-description"
                value={currentPrompt.description}
                onChange={(e) =>
                  setCurrentPrompt((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Brief description of when to use this prompt"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt-text">Prompt Text</Label>
              <Textarea
                id="prompt-text"
                value={currentPrompt.prompt}
                onChange={(e) =>
                  setCurrentPrompt((prev) => ({
                    ...prev,
                    prompt: e.target.value,
                  }))
                }
                placeholder="Write your prompt instructions here..."
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Use variables like {"{property_type}"}, {"{owner_name}"}, etc.
                for personalization
              </p>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {currentPrompt.tags?.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 rounded-full hover:bg-secondary-foreground/10"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="sr-only">Remove {tag} tag</span>
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  Add
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePrompt}>
              <Save className="mr-2 h-4 w-4" />
              {isEditing ? "Update" : "Create"} Prompt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface PromptCardProps {
  prompt: Prompt;
  onEdit: () => void;
  onDelete: () => void;
}

function PromptCard({ prompt, onEdit, onDelete }: PromptCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {prompt.name}
            </CardTitle>
            <CardDescription>{prompt.description}</CardDescription>
          </div>
          <Badge variant="outline" className="capitalize">
            {prompt.category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="text-sm text-muted-foreground line-clamp-3">
          {prompt.prompt}
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {prompt.tags?.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <div className="text-xs text-muted-foreground">
          Updated {new Date(prompt.updatedAt).toLocaleDateString()}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
