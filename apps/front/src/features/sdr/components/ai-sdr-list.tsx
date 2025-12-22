"use client";

import { useQuery, gql, TypedDocumentNode } from "@apollo/client";
import { useCurrentTeam } from "@/features/team/team.context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TeamLink } from "@/features/team/components/team-link";
import { Plus, Edit, Bot } from "lucide-react";

interface AiSdrNode {
  id: string;
  name: string;
  avatarUri?: string | null;
  personality?: string | null;
  active?: boolean | null;
}

interface AiSdrListQuery {
  aiSdrAvatars: {
    edges: {
      node: AiSdrNode;
    }[];
  };
}

const AI_SDR_LIST_QUERY: TypedDocumentNode<AiSdrListQuery> = gql`
  query AiSdrList($teamId: ID!) {
    aiSdrAvatars(teamId: $teamId, first: 50) {
      edges {
        node {
          id
          name
          avatarUri
          personality
          active
        }
      }
    }
  }
`;

export function AiSdrList() {
  const { teamId, isTeamReady } = useCurrentTeam();
  const { data, loading } = useQuery(AI_SDR_LIST_QUERY, {
    variables: { teamId },
    skip: !isTeamReady,
  });

  const sdrs = data?.aiSdrAvatars?.edges?.map((edge) => edge.node) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (sdrs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Bot className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No AI SDRs configured</h3>
          <p className="text-muted-foreground mb-4">
            Create your first AI SDR to automate outreach
          </p>
          <TeamLink href="/ai-sdr/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create AI SDR
            </Button>
          </TeamLink>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sdrs.map((sdr) => (
        <Card key={sdr.id} className="hover:bg-muted/50 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={sdr.avatarUri || undefined} />
                <AvatarFallback>
                  {sdr.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{sdr.name}</h3>
                {sdr.active !== undefined && (
                  <Badge variant={sdr.active ? "default" : "secondary"} className="mt-1">
                    {sdr.active ? "Active" : "Inactive"}
                  </Badge>
                )}
                {sdr.personality && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {sdr.personality}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <TeamLink href={`/ai-sdr/${sdr.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </TeamLink>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
