"use client";

import { KeyboardEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { useForm } from "@/lib/hook-form/hooks/use-form";
import { zodResolver } from "@/lib/hook-form/resolvers/zod";
import { CreateLeadDto, createLeadSchema } from "@nextier/dto";
import { useWatch } from "react-hook-form";
import { FieldErrors } from "@/components/errors/field-errors";
import { useApiError } from "@/hooks/use-api-error";
import { useApolloClient, useMutation } from "@apollo/client";
import {
  CREATE_LEAD_MUTATION,
  UPDATE_LEAD_MUTATION,
} from "../mutations/lead.mutations";
import { useCurrentTeam } from "@/features/team/team.context";
import { toast } from "sonner";
import { LeadFormQuery } from "@/graphql/types";
import { useRouter } from "next/navigation";
import { FormItem } from "@/components/ui/form/form-item";
import { LEADS_EVICT } from "../queries/lead.queries";

interface Props {
  lead?: LeadFormQuery["lead"];
}

export const LeadForm: React.FC<Props> = ({ lead }) => {
  const { team } = useCurrentTeam();
  const { handleSubmit, register, registerError, control, setValue } = useForm({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      firstName: lead?.firstName || "",
      lastName: lead?.lastName || "",
      email: lead?.email || "",
      phone: lead?.phone || "",
      title: lead?.title || "",
      company: lead?.company || "",
      zipCode: lead?.zipCode || "",
      country: lead?.country || "",
      state: lead?.state || "",
      city: lead?.city || "",
      address: lead?.address || "",
      source: lead?.source || "",
      notes: lead?.notes || "",
      status: lead?.status || "",
      tags: lead?.tags || [],
      score: lead?.score || 0,
    },
  });

  const [newTag, setNewTag] = useState("");
  const [tags] = useWatch({
    control,
    name: ["tags"],
  });
  const [loading, setLoading] = useState(false);
  const { showError } = useApiError();
  const { cache } = useApolloClient();
  const [createLead] = useMutation(CREATE_LEAD_MUTATION);
  const [updateLead] = useMutation(UPDATE_LEAD_MUTATION);
  const router = useRouter();

  const appendTags = () => {
    if (newTag.trim()) {
      setValue("tags", [...(tags || []), newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (index: number) => {
    setValue(
      "tags",
      (tags || []).filter((_, i) => i !== index),
    );
  };

  const handleOnTagEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      appendTags();
    }
  };

  const save = async (input: CreateLeadDto) => {
    setLoading(true);

    try {
      if (lead) {
        await updateLead({
          variables: { id: lead.id, input, teamId: team.id },
        });
      } else {
        await createLead({ variables: { input, teamId: team.id } });
        cache.evict(LEADS_EVICT);
      }
      toast.success("Lead saved successfully");
      router.replace(`/t/${team.id}/leads`);
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
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      {...register("firstName")}
                      id="firstName"
                      placeholder="e.g., John"
                    />
                    <FieldErrors {...registerError("firstName")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      {...register("lastName")}
                      id="lastName"
                      placeholder="e.g., Doe"
                    />
                    <FieldErrors {...registerError("lastName")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      {...register("email")}
                      id="email"
                      type="email"
                      placeholder="e.g., john.doe@example.com"
                    />
                    <FieldErrors {...registerError("email")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      {...register("phone")}
                      id="phone"
                      placeholder="e.g., +1 (555) 123-4567"
                    />
                    <FieldErrors {...registerError("phone")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Job Title</Label>
                    <Input
                      {...register("title")}
                      id="title"
                      placeholder="e.g., Marketing Manager"
                    />
                    <FieldErrors {...registerError("title")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      {...register("company")}
                      id="company"
                      placeholder="e.g., Acme Corp"
                    />
                    <FieldErrors {...registerError("company")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="source">Source</Label>
                    <Input
                      {...register("source")}
                      id="source"
                      placeholder="e.g., LinkedIn, Website, Referral"
                    />
                    <FieldErrors {...registerError("source")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Input
                      {...register("status")}
                      id="status"
                      placeholder="e.g., New, Qualified, Contacted"
                    />
                    <FieldErrors {...registerError("status")} />
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h2 className="text-lg font-semibold mb-4">
                Address Information
              </h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    {...register("address")}
                    id="address"
                    placeholder="e.g., 123 Main Street"
                  />
                  <FieldErrors {...registerError("address")} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      {...register("city")}
                      id="city"
                      placeholder="e.g., New York"
                    />
                    <FieldErrors {...registerError("city")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      {...register("state")}
                      id="state"
                      placeholder="e.g., NY"
                    />
                    <FieldErrors {...registerError("state")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zipCode">Zip Code</Label>
                    <Input
                      {...register("zipCode")}
                      id="zipCode"
                      placeholder="e.g., 10001"
                    />
                    <FieldErrors {...registerError("zipCode")} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    {...register("country")}
                    id="country"
                    placeholder="e.g., United States"
                  />
                  <FieldErrors {...registerError("country")} />
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <h2 className="text-lg font-semibold mb-2">Tags</h2>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={handleOnTagEnter}
                    placeholder="Add a tag..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={appendTags}
                    disabled={!newTag.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {tags && tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(index)}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <FormItem>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                {...register("notes")}
                id="notes"
                placeholder="Any additional information about this lead..."
                rows={4}
              />
              <FieldErrors {...registerError("notes")} />
            </FormItem>

            <FormItem>
              <Label htmlFor="score">Score</Label>
              <Input
                {...register("score", { valueAsNumber: true })}
                id="score"
                type="number"
                min={0}
                max={100}
              />
              <FieldErrors {...registerError("score")} />
            </FormItem>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : lead ? "Update Lead" : "Create Lead"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
