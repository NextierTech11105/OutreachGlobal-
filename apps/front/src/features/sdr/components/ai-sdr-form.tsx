"use client";

import { KeyboardEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Trash2 } from "lucide-react";
import { AI_SDR_AVATARS_EVICT } from "../queries/sdr.queries";
import { useForm } from "@/lib/hook-form/hooks/use-form";
import { zodResolver } from "@/lib/hook-form/resolvers/zod";
import { AiSdrAvatarDto, aiSdrAvatarSchema } from "@nextier/dto";
import { Controller, useWatch } from "react-hook-form";
import { FieldErrors } from "@/components/errors/field-errors";
import { useApiError } from "@/hooks/use-api-error";
import { useApolloClient, useMutation } from "@apollo/client";
import {
  CREATE_AI_SDR_AVATAR_MUTATION,
  UPDATE_AI_SDR_AVATAR_MUTATION,
} from "../mutations/sdr.mutations";
import { useCurrentTeam } from "@/features/team/team.context";
import { toast } from "sonner";
import { AiSdrAvatarDetailsQuery } from "@/graphql/types";
import { useRouter } from "next/navigation";

interface Props {
  avatar?: AiSdrAvatarDetailsQuery["aiSdrAvatar"];
}

export function AiSdrForm({ avatar }: Props) {
  const { team } = useCurrentTeam();
  const { handleSubmit, register, registerError, control, setValue } = useForm({
    resolver: zodResolver(aiSdrAvatarSchema),
    defaultValues: {
      name: avatar?.name || "",
      description: avatar?.description || "",
      industry: avatar?.industry || "",
      personality: avatar?.personality || "",
      avatarUri: avatar?.avatarUri || "",
      mission: avatar?.mission || "",
      goal: avatar?.goal || "",
      tags: avatar?.tags || [],
      roles: avatar?.roles || [""],
      faqs: avatar?.faqs || [{ question: "", answer: "" }],
      active: avatar?.active || true,
      voiceType: avatar?.voiceType || "",
    },
  });

  const [newTag, setNewTag] = useState("");
  const [tags, roles, faqs, isActive] = useWatch({
    control,
    name: ["tags", "roles", "faqs", "active"],
  });
  const [loading, setLoading] = useState(false);
  const { showError } = useApiError();
  const { cache } = useApolloClient();
  const [createAvatar] = useMutation(CREATE_AI_SDR_AVATAR_MUTATION);
  const [updateAvatar] = useMutation(UPDATE_AI_SDR_AVATAR_MUTATION);
  const router = useRouter();

  const appendTags = () => {
    setValue("tags", [...tags, newTag]);
    setNewTag("");
  };

  const removeTag = (index: number) => {
    setValue(
      "tags",
      tags.filter((_, i) => i !== index),
    );
  };

  const appendRoles = () => {
    setValue("roles", [...roles, ""]);
  };

  const removeRole = (index: number) => {
    setValue(
      "roles",
      roles.filter((_, i) => i !== index),
    );
  };

  const appendFaqs = () => {
    setValue("faqs", [...faqs, { question: "", answer: "" }]);
  };

  const removeFaq = (index: number) => {
    setValue(
      "faqs",
      faqs.filter((_, i) => i !== index),
    );
  };

  const handleOnTagEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      appendTags();
    }
  };

  const save = async (input: AiSdrAvatarDto) => {
    setLoading(true);

    try {
      if (avatar) {
        await updateAvatar({
          variables: { id: avatar.id, input, teamId: team.id },
        });
      } else {
        await createAvatar({ variables: { input, teamId: team.id } });
        cache.evict(AI_SDR_AVATARS_EVICT);
      }
      toast.success("AI SDR avatar saved");
      router.replace(`/t/${team.id}/ai-sdr`);
    } catch (error) {
      showError(error, { gql: true });
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(save)} className="space-y-8">
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Avatar Name</Label>
                    <Input
                      {...register("name")}
                      id="name"
                      placeholder="e.g., Sabrina for Elite Homeowner Advisors"
                    />
                    <FieldErrors {...registerError("name")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Input
                      {...register("industry")}
                      id="industry"
                      placeholder="e.g., Real Estate - Foreclosure"
                    />
                    <FieldErrors {...registerError("industry")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Short Description</Label>
                    <Input
                      {...register("description")}
                      id="description"
                      placeholder="e.g., AI-Powered Foreclosure Strategist & Homeowner Advocate"
                    />
                    <FieldErrors {...registerError("description")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="voiceType">Voice Type</Label>
                    <Controller
                      control={control}
                      name="voiceType"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger id="voiceType">
                            <SelectValue placeholder="Select a voice type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Professional Female">
                              Professional Female
                            </SelectItem>
                            <SelectItem value="Professional Male">
                              Professional Male
                            </SelectItem>
                            <SelectItem value="Casual Female">
                              Casual Female
                            </SelectItem>
                            <SelectItem value="Casual Male">
                              Casual Male
                            </SelectItem>
                            <SelectItem value="Energetic Female">
                              Energetic Female
                            </SelectItem>
                            <SelectItem value="Energetic Male">
                              Energetic Male
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldErrors {...registerError("voiceType")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="personality">Personality</Label>
                    <Input
                      {...register("personality")}
                      id="personality"
                      placeholder="e.g., Empathetic, knowledgeable, and solution-oriented"
                    />
                    <FieldErrors {...registerError("personality")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avatarUrl">Avatar Image URL</Label>
                    <Input
                      {...register("avatarUri")}
                      id="avatarUrl"
                      placeholder="https://example.com/avatar.png"
                    />
                    <FieldErrors {...registerError("avatarUri")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="newTag"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Add a tag"
                        onKeyDown={handleOnTagEnter}
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={!newTag.trim()}
                        onClick={appendTags}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {tag}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => removeTag(index)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="isActive">Status</Label>
                    <div className="flex items-center space-x-2">
                      <Controller
                        control={control}
                        name="active"
                        render={({ field }) => (
                          <Switch
                            id="isActive"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <Label htmlFor="isActive">
                        {isActive ? "Active" : "Inactive"}
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h2 className="text-lg font-semibold mb-4">Details & Mission</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mission">Mission</Label>
                  <Textarea
                    {...register("mission")}
                    id="mission"
                    placeholder="e.g., Guide homeowners through foreclosure, auction delays, loan modifications, and equity recovery."
                    rows={3}
                  />
                  <FieldErrors {...registerError("mission")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal">Goal</Label>
                  <Textarea
                    {...register("goal")}
                    id="goal"
                    placeholder="e.g., Help clients navigate legal, financial, and strategic options at zero cost while leading them to a consultation."
                    rows={3}
                  />
                  <FieldErrors {...registerError("goal")} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Role & Responsibilities</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={appendRoles}
                    >
                      <Plus className="size-4 mr-1" />
                      Add Item
                    </Button>
                  </div>

                  {roles.map((_, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        {...register(`roles.${index}`)}
                        placeholder="e.g., Engage personally (mentions the homeowner's name)."
                        required
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={roles.length <= 1}
                        onClick={() => removeRole(index)}
                      >
                        <Trash2 className="size-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h2 className="text-lg font-semibold mb-4">FAQs & Knowledge</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Frequently Asked Questions</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={appendFaqs}
                  >
                    <Plus className="size-4 mr-1" />
                    Add FAQ
                  </Button>
                </div>

                {faqs.map((faq, index) => (
                  <Card key={index} className="relative">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      disabled={faqs.length <= 1}
                      onClick={() => removeFaq(index)}
                    >
                      <Trash2 className="size-4 text-red-500" />
                    </Button>

                    <CardContent className="pt-6 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`faq-question-${index}`}>
                          Question
                        </Label>
                        <Input
                          id={`faq-question-${index}`}
                          {...register(`faqs.${index}.question`)}
                          placeholder="e.g., How is Elite Homeowner Advisor different from an attorney?"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`faq-answer-${index}`}>Answer</Label>
                        <Textarea
                          id={`faq-answer-${index}`}
                          {...register(`faqs.${index}.answer`)}
                          placeholder="e.g., We provide free advisory services to help homeowners understand their situation, while attorneys charge substantial legal fees."
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <Button type="submit" loading={loading}>
              {avatar ? "Update Avatar" : "Create Avatar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
