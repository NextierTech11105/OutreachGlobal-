"use client";

import { forwardRef } from "react";
import { useQuery, gql, TypedDocumentNode } from "@apollo/client";
import { useCurrentTeam } from "@/features/team/team.context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AiSdrAvatarsQuery {
  aiSdrAvatars: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  }[];
}

const AI_SDR_AVATARS_QUERY: TypedDocumentNode<AiSdrAvatarsQuery> = gql`
  query AiSdrAvatars($teamId: ID!) {
    aiSdrAvatars(teamId: $teamId) {
      id
      name
      avatarUrl
    }
  }
`;

interface AiSdrSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
}

export const AiSdrSelector = forwardRef<HTMLButtonElement, AiSdrSelectorProps>(
  ({ value, onChange }, ref) => {
    const { teamId, isTeamReady } = useCurrentTeam();
    const { data, loading } = useQuery(AI_SDR_AVATARS_QUERY, {
      variables: { teamId },
      skip: !isTeamReady,
    });

    const avatars = data?.aiSdrAvatars || [];

    return (
      <div className="space-y-2">
        <Label>AI SDR Avatar</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger ref={ref}>
            <SelectValue placeholder="Select an AI SDR" />
          </SelectTrigger>
          <SelectContent>
            {loading ? (
              <SelectItem value="" disabled>
                Loading...
              </SelectItem>
            ) : avatars.length === 0 ? (
              <SelectItem value="" disabled>
                No AI SDRs configured
              </SelectItem>
            ) : (
              avatars.map((avatar) => (
                <SelectItem key={avatar.id} value={avatar.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={avatar.avatarUrl || undefined} />
                      <AvatarFallback>
                        {avatar.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{avatar.name}</span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    );
  }
);

AiSdrSelector.displayName = "AiSdrSelector";
