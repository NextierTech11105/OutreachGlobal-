"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CampaignSequenceBuilder } from "./campaign-sequence-builder";
import { AiSdrSelector } from "@/features/sdr/components/ai-sdr-selector";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useForm } from "@/lib/hook-form/hooks/use-form";
import { zodResolver } from "@/lib/hook-form/resolvers/zod";
import { CampaignDto, campaignSchema } from "@nextier/dto";
import { FieldErrors } from "@/components/errors/field-errors";
import { Controller, useWatch } from "react-hook-form";
import { useCurrentTeam } from "@/features/team/team.context";
import { useSingleQuery } from "@/graphql/hooks/use-single-query";
import { LEADS_COUNT_QUERY } from "@/features/lead/queries/lead.queries";
import { useDebounceValue } from "usehooks-ts";
import { PlusIcon } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { MessageEditorModal } from "@/features/message-template/components/message-editor-modal";
import { toast } from "sonner";
import { MessageEditorDto } from "@/features/message-template/dto/message-editor.dto";
import { FormProvider } from "@/lib/hook-form/form-provider";
import { useApiError } from "@/hooks/use-api-error";
import { useApolloClient, useMutation } from "@apollo/client";
import {
  CREATE_CAMPAIGN_MUTATION,
  UPDATE_CAMPAIGN_MUTATION,
} from "../mutations/campaign.mutations";
import { CAMPAIGNS_EVICT } from "../queries/campaign.queries";
import { CampaignFormQuery, MessageTemplateType } from "@/graphql/types";

export function CampaignForm({
  campaign,
}: {
  campaign?: CampaignFormQuery["campaign"];
}) {
  const { team } = useCurrentTeam();
  const router = useRouter();

  const {
    handleSubmit,
    register,
    registerError,
    control,
    setValue,
    ...formContext
  } = useForm({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      sdrId: campaign?.aiSdrAvatar?.id || undefined,
      name: campaign?.name || "",
      description: campaign?.description || "",
      minScore: campaign?.minScore || 30,
      maxScore: campaign?.maxScore || 100,
      sequences:
        campaign?.sequences.map((seq) => ({
          ...seq,
          type: seq.type as unknown as MessageTemplateType,
        })) || [],
    },
  });

  const minScore = useWatch({ control, name: "minScore", defaultValue: 30 });
  const maxScore = useWatch({ control, name: "maxScore", defaultValue: 100 });
  const [sequences] = useWatch({ control, name: ["sequences"] });
  const [debounceMinScore] = useDebounceValue(minScore, 500);
  const [debounceMaxScore] = useDebounceValue(maxScore, 500);
  const [messageEditorOpen, setMessageEditorOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const { showError } = useApiError();
  const { cache } = useApolloClient();
  const [createCampaign] = useMutation(CREATE_CAMPAIGN_MUTATION);
  const [updateCampaign] = useMutation(UPDATE_CAMPAIGN_MUTATION);

  const [leadsCount] = useSingleQuery(LEADS_COUNT_QUERY, {
    pick: "leadsCount",
    variables: {
      teamId: team.id,
      minScore: debounceMinScore,
      maxScore: debounceMaxScore,
    },
  });

  const setScores = (value: [number, number]) => {
    setValue("minScore", value[0]);
    setValue("maxScore", value[1]);
  };

  const handleSaveMessage = (input: MessageEditorDto) => {
    const newSequence: CampaignDto["sequences"][number] = {
      ...input,
      position: sequences.length + 1,
      delayDays: 0,
      delayHours: 0,
    };

    if (sequences.length) {
      newSequence.delayDays = 1;
    }

    const newSequences = [...sequences, newSequence];
    setValue("sequences", newSequences);
  };

  const save = async (input: CampaignDto) => {
    setLoading(true);

    try {
      if (!campaign) {
        await createCampaign({
          variables: { teamId: team.id, input },
        });
        cache.evict(CAMPAIGNS_EVICT);
      } else {
        await updateCampaign({
          variables: { teamId: team.id, id: campaign.id, input },
        });
      }
      toast.success("Campaign saved");
      router.replace(`/t/${team.slug}/campaigns`);
    } catch (error) {
      setLoading(false);
      showError(error, { gql: true });
    }
  };

  return (
    <>
      <FormProvider
        {...formContext}
        handleSubmit={handleSubmit}
        register={register}
        registerError={registerError}
        control={control}
        setValue={setValue}
      >
        <form
          className="space-y-8"
          onSubmit={handleSubmit(save)}
          id="message-editor"
        >
          {/* Campaign Details Section */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-medium mb-4">Campaign Details</h2>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input
                    {...register("name")}
                    id="name"
                    placeholder="Enter campaign name"
                  />
                  <FieldErrors {...registerError("name")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    {...register("description")}
                    id="description"
                    placeholder="Enter campaign description"
                    rows={4}
                  />
                  <FieldErrors {...registerError("description")} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Targeting Section */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-medium mb-4">Targeting</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Lead Score Range</Label>
                    <span className="text-sm text-muted-foreground">
                      {minScore} - {maxScore}
                    </span>
                  </div>
                  <Slider
                    defaultValue={[30, 100]}
                    max={100}
                    step={1}
                    value={[minScore, maxScore]}
                    onValueChange={setScores}
                    onValueCommit={setScores}
                  />
                </div>

                <div className="rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-medium">
                        Estimated Lead Count
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Based on current database
                      </p>
                    </div>
                    <Badge className="text-lg py-1 px-3">{leadsCount}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignee Section */}
          <Card>
            <CardContent className="pt-6">
              <FieldErrors {...registerError("sdrId")} />
              <Controller
                control={control}
                name="sdrId"
                render={({ field }) => <AiSdrSelector {...field} />}
              />
            </CardContent>
          </Card>

          {/* Messages Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-medium">Messages</h2>

                <Button
                  variant="outline"
                  onClick={() => setMessageEditorOpen(true)}
                >
                  <PlusIcon />
                  Add Message
                </Button>
              </div>

              <Controller
                control={control}
                name="sequences"
                render={({ field }) => (
                  <CampaignSequenceBuilder
                    sequences={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <FieldErrors {...registerError("sequences")} className="mt-2" />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button type="submit" loading={loading}>
              {!campaign ? "Create Campaign" : "Update Campaign"}
            </Button>
          </div>
        </form>
      </FormProvider>

      <AnimatePresence>
        {messageEditorOpen && (
          <MessageEditorModal
            open={messageEditorOpen}
            onOpenChange={setMessageEditorOpen}
            onSaved={handleSaveMessage}
          />
        )}
      </AnimatePresence>
    </>
  );
}
