"use client";

import { useState } from "react";
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
import { ExtractNode, PromptsQuery } from "@/graphql/types";
import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";
import { PROMPTS_EVICT, PROMPTS_QUERY } from "../queries/prompt.queries";
import { useCurrentTeam } from "@/features/team/team.context";
import { PromptType, PromptCategory } from "@nextier/common";
import { useForm } from "@/lib/hook-form/hooks/use-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreatePromptDto, createPromptSchema } from "@nextier/dto";
import { FieldErrors } from "@/components/errors/field-errors";
import { FormItem } from "@/components/ui/form/form-item";
import { Controller, useWatch } from "react-hook-form";
import { useApolloClient, useMutation } from "@apollo/client";
import {
  CREATE_PROMPT_MUTATION,
  DELETE_PROMPT_MUTATION,
  UPDATE_PROMPT_MUTATION,
} from "../mutations/prompt.mutations";
import { useApiError } from "@/hooks/use-api-error";
import { toast } from "sonner";
import { useModalAlert } from "@/components/ui/modal";

type Prompt = ExtractNode<PromptsQuery["prompts"]>;

const defaultValues = {
  name: "",
  description: "",
  type: PromptType.EMAIL,
  content: "",
  category: PromptCategory.OUTREACH,
  tags: [],
};

export function PromptList() {
  const { teamId, isTeamReady } = useCurrentTeam();
  const [activeTab, setActiveTab] = useState<string>(PromptType.EMAIL);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<Prompt>();
  const [formLoading, setFormLoading] = useState(false);

  const { handleSubmit, register, registerError, control, reset, setValue } =
    useForm({
      resolver: zodResolver(createPromptSchema),
      defaultValues,
    });

  const [createPrompt] = useMutation(CREATE_PROMPT_MUTATION);
  const [updatePrompt] = useMutation(UPDATE_PROMPT_MUTATION);
  const [deletePrompt] = useMutation(DELETE_PROMPT_MUTATION);
  const { showError } = useApiError();
  const { showAlert } = useModalAlert();
  const { cache } = useApolloClient();

  const [filteredPrompts = [], pageInfo, { loading: isLoading, refetch }] =
    useConnectionQuery(PROMPTS_QUERY, {
      pick: "prompts",
      variables: {
        teamId,
        type: activeTab,
      },
      skip: !isTeamReady,
    });

  const handleDeletePrompt = (id: string) => {
    showAlert({
      title: "Delete Prompt",
      description: "Are you sure you want to delete this prompt?",
      onConfirm: async () => {
        if (!isTeamReady) return;
        try {
          await deletePrompt({ variables: { id, teamId } });
          await refetch();
          toast.success("Prompt deleted");
        } catch (error) {
          showError(error, { gql: true });
        }
      },
    });
  };

  const handleSavePrompt = async (input: CreatePromptDto) => {
    if (!isTeamReady) return;
    input.type = activeTab as PromptType;
    setFormLoading(true);
    try {
      if (!currentPrompt) {
        await createPrompt({ variables: { input, teamId } });
        await refetch();
      } else {
        await updatePrompt({
          variables: { id: currentPrompt.id, input, teamId },
        });
      }

      toast.success("Prompt saved");
      setIsDialogOpen(false);
      setIsEditing(false);
      setCurrentPrompt(undefined);
      reset();
      cache.evict(PROMPTS_EVICT);
    } catch (error) {
      showError(error, { gql: true });
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditPrompt = (prompt: Prompt) => {
    setCurrentPrompt(prompt);
    setValue("name", prompt.name);
    setValue("description", prompt.description);
    setValue("type", prompt.type as PromptType);
    setValue("category", prompt.category as PromptCategory);
    setValue("content", prompt.content);
    setValue("tags", prompt.tags || []);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleAddPrompt = () => {
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger
              value={PromptType.EMAIL}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Email Prompts
            </TabsTrigger>
            <TabsTrigger
              value={PromptType.SMS}
              className="flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              SMS Prompts
            </TabsTrigger>
            <TabsTrigger
              value={PromptType.VOICE}
              className="flex items-center gap-2"
            >
              <Phone className="h-4 w-4" />
              Voice Prompts
            </TabsTrigger>
          </TabsList>

          <Button onClick={handleAddPrompt} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Prompt
          </Button>
        </div>

        <TabsContent value={PromptType.EMAIL} className="space-y-4">
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

        <TabsContent value={PromptType.SMS} className="space-y-4">
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

        <TabsContent value={PromptType.VOICE} className="space-y-4">
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

          <form onSubmit={handleSubmit(handleSavePrompt)}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 items-start">
                <FormItem>
                  <Label htmlFor="prompt-name">Name</Label>
                  <Input {...register("name")} id="prompt-name" />
                  <FieldErrors {...registerError("name")} />
                </FormItem>

                <FormItem>
                  <Label htmlFor="prompt-category">Category</Label>
                  <Controller
                    control={control}
                    name="category"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={PromptCategory.OUTREACH}>
                            Outreach
                          </SelectItem>
                          <SelectItem value={PromptCategory.FOLLOW_UP}>
                            Follow-up
                          </SelectItem>
                          <SelectItem value={PromptCategory.NURTURE}>
                            Nurture
                          </SelectItem>
                          <SelectItem value={PromptCategory.CONVERSION}>
                            Conversion
                          </SelectItem>
                          <SelectItem value={PromptCategory.RE_ENGAGEMENT}>
                            Re-engagement
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldErrors {...registerError("category")} />
                </FormItem>
              </div>

              <FormItem>
                <Label htmlFor="prompt-description">Description</Label>
                <Input {...register("description")} id="prompt-description" />
                <FieldErrors {...registerError("description")} />
              </FormItem>

              <FormItem>
                <Label htmlFor="prompt-text">Prompt Text</Label>
                <Textarea
                  {...register("content")}
                  id="prompt-text"
                  placeholder="Write your prompt instructions here..."
                  rows={6}
                />
                <FieldErrors {...registerError("content")} />
                <p className="text-xs text-muted-foreground">
                  Use variables like {"{property_type}"}, {"{owner_name}"}, etc.
                  for personalization
                </p>
              </FormItem>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={formLoading}>
                <Save className="mr-2 h-4 w-4" />
                {isEditing ? "Update" : "Create"} Prompt
              </Button>
            </DialogFooter>
          </form>
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
          {prompt.content}
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
