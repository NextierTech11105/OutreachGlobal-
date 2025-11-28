"use client";

import { FormItem } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROMPTS_QUERY } from "@/features/prompt/queries/prompt.queries";
import { useCurrentTeam } from "@/features/team/team.context";
import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";
import { ExtractNode, PromptsQuery } from "@/graphql/types";
import { useMutation } from "@apollo/client";
import { useEffect, useState } from "react";
import { GENERATE_MESSAGE_TEMPLATE_MUTATION } from "../mutations/message-template.mutations";
import { Button } from "@/components/ui/button";
import { SparkleIcon } from "lucide-react";
import { useApiError } from "@/hooks/use-api-error";
import { toast } from "sonner";

interface Props {
  type: string;
  onGenerate?: (content: string) => void;
}

type Prompt = ExtractNode<PromptsQuery["prompts"]>;

export const GenerateMessageField: React.FC<Props> = ({ type, onGenerate }) => {
  const { team } = useCurrentTeam();
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [prompts] = useConnectionQuery(PROMPTS_QUERY, {
    pick: "prompts",
    variables: { teamId: team.id, type },
  });

  const [generateContent, { loading }] = useMutation(
    GENERATE_MESSAGE_TEMPLATE_MUTATION,
  );

  const { showError } = useApiError();

  const handlePromptChange = (id: string) => {
    const prompt = prompts?.find((prompt) => prompt.id === id);
    setSelectedPrompt(prompt || null);
  };

  const handleGenerate = async () => {
    if (selectedPrompt) {
      try {
        const { data } = await generateContent({
          variables: {
            teamId: team.id,
            prompt: selectedPrompt.content,
          },
        });

        if (data?.generateMessageTemplate) {
          onGenerate?.(data.generateMessageTemplate.content);
        }
      } catch (error) {
        showError(error, { gql: true });
      }
    } else {
      toast.error("Please select a prompt");
    }
  };

  useEffect(() => {
    setSelectedPrompt(null);
  }, [type]);

  return (
    <FormItem>
      <Label htmlFor="generate-content">Use Prompt</Label>
      <div className="flex items-center gap-2">
        <Select
          onValueChange={handlePromptChange}
          value={selectedPrompt?.id || undefined}
        >
          <SelectTrigger id="generate-content">
            <SelectValue placeholder="Choose prompt" />
          </SelectTrigger>
          <SelectContent>
            {prompts?.map((prompt) => (
              <SelectItem key={prompt.id} value={prompt.id}>
                {prompt.name}
              </SelectItem>
            ))}
            {!prompts?.length && (
              <SelectItem value="none" disabled>
                No prompts found
              </SelectItem>
            )}
          </SelectContent>
        </Select>

        <Button
          disabled={!selectedPrompt}
          onClick={handleGenerate}
          loading={loading}
          className="min-w-btn"
        >
          <SparkleIcon />
          Generate
        </Button>
      </div>
    </FormItem>
  );
};
