"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useMutation, gql } from "@apollo/client";
import { useCurrentTeam } from "@/features/team/team.context";
import { toast } from "sonner";

const CREATE_AI_SDR_MUTATION = gql`
  mutation CreateAiSdr($teamId: ID!, $input: CreateAiSdrInput!) {
    createAiSdrAvatar(teamId: $teamId, input: $input) {
      id
      name
    }
  }
`;

const UPDATE_AI_SDR_MUTATION = gql`
  mutation UpdateAiSdr($teamId: ID!, $id: ID!, $input: UpdateAiSdrInput!) {
    updateAiSdrAvatar(teamId: $teamId, id: $id, input: $input) {
      id
      name
    }
  }
`;

interface AiSdr {
  id: string;
  name: string;
  personality?: string | null;
  tone?: string | null;
  description?: string | null;
}

interface AiSdrFormProps {
  sdr?: AiSdr;
}

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "casual", label: "Casual" },
  { value: "formal", label: "Formal" },
];

export function AiSdrForm({ sdr }: AiSdrFormProps) {
  const { team, teamId } = useCurrentTeam();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(sdr?.name || "");
  const [personality, setPersonality] = useState(sdr?.personality || "");
  const [tone, setTone] = useState(sdr?.tone || "professional");
  const [description, setDescription] = useState(sdr?.description || "");

  const [createSdr] = useMutation(CREATE_AI_SDR_MUTATION);
  const [updateSdr] = useMutation(UPDATE_AI_SDR_MUTATION);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error("Name is required");
      return;
    }

    setLoading(true);
    try {
      const input = { name, personality, tone, description };

      if (sdr) {
        await updateSdr({
          variables: { teamId, id: sdr.id, input },
        });
        toast.success("AI SDR updated");
      } else {
        await createSdr({
          variables: { teamId, input },
        });
        toast.success("AI SDR created");
      }

      router.push(`/t/${team.slug}/ai-sdr`);
    } catch (error) {
      toast.error(sdr ? "Failed to update AI SDR" : "Failed to create AI SDR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter AI SDR name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tone">Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="personality">Personality</Label>
              <Textarea
                id="personality"
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                placeholder="Describe the AI's personality traits..."
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional notes about this AI SDR..."
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : sdr ? "Update AI SDR" : "Create AI SDR"}
        </Button>
      </div>
    </form>
  );
}
