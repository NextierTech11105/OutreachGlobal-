"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle } from "lucide-react";
import { AiSdrForm } from "@/components/ai-sdr-form";
import { AiSdrList } from "@/components/ai-sdr-list";
import { AiSdrDetail } from "@/components/ai-sdr-detail";
import { useToast } from "@/hooks/use-toast";
import { AI_ASSISTANT_NAME, APP_NAME } from "@/config/branding";
import { useQuery, useMutation, gql } from "@apollo/client";
import { useCurrentTeam } from "@/features/team/team.context";

// GraphQL Queries
const AI_SDR_AVATARS_QUERY = gql`
  query AiSdrAvatarsManager($teamId: ID!, $first: Int) {
    aiSdrAvatars(teamId: $teamId, first: $first) {
      edges {
        node {
          id
          name
          description
          personality
          voiceType
          avatarUri
          active
          industry
          mission
          goal
          roles
          faqs {
            question
            answer
            category
          }
          tags
          createdAt
          updatedAt
        }
      }
    }
  }
`;

const CREATE_AI_SDR_AVATAR = gql`
  mutation CreateAiSdrAvatar($teamId: ID!, $input: CreateAiSdrAvatarInput!) {
    createAiSdrAvatar(teamId: $teamId, input: $input) {
      id
      name
    }
  }
`;

const UPDATE_AI_SDR_AVATAR = gql`
  mutation UpdateAiSdrAvatar($teamId: ID!, $id: ID!, $input: UpdateAiSdrAvatarInput!) {
    updateAiSdrAvatar(teamId: $teamId, id: $id, input: $input) {
      id
      name
    }
  }
`;

const DELETE_AI_SDR_AVATAR = gql`
  mutation DeleteAiSdrAvatar($teamId: ID!, $id: ID!) {
    deleteAiSdrAvatar(teamId: $teamId, id: $id)
  }
`;

export type AiSdr = {
  id: string;
  name: string;
  description: string;
  personality: string;
  voiceType: string;
  avatarUrl: string;
  isActive: boolean;
  industry: string;
  mission: string;
  goal: string;
  role: string[];
  faqs: Array<{
    question: string;
    answer: string;
    category?: string;
  }>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export function AiSdrManager() {
  const [activeTab, setActiveTab] = useState("list");
  const [selectedSdr, setSelectedSdr] = useState<AiSdr | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const { teamId, isTeamReady } = useCurrentTeam();

  // GraphQL Query
  const { data, loading, refetch } = useQuery(AI_SDR_AVATARS_QUERY, {
    variables: { teamId, first: 50 },
    skip: !isTeamReady,
  });

  // GraphQL Mutations
  const [createAvatar] = useMutation(CREATE_AI_SDR_AVATAR, {
    onCompleted: () => refetch(),
  });
  const [updateAvatar] = useMutation(UPDATE_AI_SDR_AVATAR, {
    onCompleted: () => refetch(),
  });
  const [deleteAvatar] = useMutation(DELETE_AI_SDR_AVATAR, {
    onCompleted: () => refetch(),
  });

  // Transform GraphQL data to component format
  const sdrs: AiSdr[] = (data?.aiSdrAvatars?.edges || []).map((edge: { node: any }) => ({
    id: edge.node.id,
    name: edge.node.name || "",
    description: edge.node.description || "",
    personality: edge.node.personality || "",
    voiceType: edge.node.voiceType || "",
    avatarUrl: edge.node.avatarUri || "",
    isActive: edge.node.active ?? true,
    industry: edge.node.industry || "",
    mission: edge.node.mission || "",
    goal: edge.node.goal || "",
    role: edge.node.roles || [],
    faqs: edge.node.faqs || [],
    tags: edge.node.tags || [],
    createdAt: edge.node.createdAt || "",
    updatedAt: edge.node.updatedAt || "",
  }));

  const handleAddNew = () => {
    setSelectedSdr(null);
    setIsEditing(false);
    setActiveTab("form");
  };

  const handleEdit = (sdr: AiSdr) => {
    setSelectedSdr(sdr);
    setIsEditing(true);
    setActiveTab("form");
  };

  const handleView = (sdr: AiSdr) => {
    setSelectedSdr(sdr);
    setActiveTab("detail");
  };

  const handleDuplicate = async (sdr: AiSdr) => {
    try {
      await createAvatar({
        variables: {
          teamId,
          input: {
            name: `${sdr.name} (Copy)`,
            description: sdr.description,
            personality: sdr.personality,
            voiceType: sdr.voiceType,
            avatarUri: sdr.avatarUrl,
            active: sdr.isActive,
            industry: sdr.industry,
            mission: sdr.mission,
            goal: sdr.goal,
            roles: sdr.role,
            faqs: sdr.faqs,
            tags: sdr.tags,
          },
        },
      });
      toast({
        title: "Avatar Duplicated",
        description: `${sdr.name} has been duplicated successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to duplicate avatar.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await deleteAvatar({
        variables: { teamId, id: String(id) },
      });
      toast({
        title: "Avatar Deleted",
        description: "The AI SDR avatar has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete avatar.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async (sdr: Omit<AiSdr, "id" | "createdAt" | "updatedAt">) => {
    try {
      const input = {
        name: sdr.name,
        description: sdr.description,
        personality: sdr.personality,
        voiceType: sdr.voiceType,
        avatarUri: sdr.avatarUrl,
        active: sdr.isActive,
        industry: sdr.industry,
        mission: sdr.mission,
        goal: sdr.goal,
        roles: sdr.role,
        faqs: sdr.faqs,
        tags: sdr.tags,
      };

      if (isEditing && selectedSdr) {
        await updateAvatar({
          variables: { teamId, id: selectedSdr.id, input },
        });
        toast({
          title: "Avatar Updated",
          description: `${sdr.name} has been updated successfully.`,
        });
      } else {
        await createAvatar({
          variables: { teamId, input },
        });
        toast({
          title: "Avatar Created",
          description: `${sdr.name} has been created successfully.`,
        });
      }
      setActiveTab("list");
    } catch (error) {
      toast({
        title: "Error",
        description: isEditing ? "Failed to update avatar." : "Failed to create avatar.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setActiveTab("list");
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>AI SDR Avatar Management</CardTitle>
        <CardDescription>
          Create and manage AI SDR avatars for your campaigns. These avatars can
          be used to automate outreach and follow-ups.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="list">All Avatars</TabsTrigger>
              <TabsTrigger value="form" disabled={activeTab !== "form"}>
                {isEditing ? "Edit Avatar" : "New Avatar"}
              </TabsTrigger>
              <TabsTrigger value="detail" disabled={activeTab !== "detail"}>
                Avatar Details
              </TabsTrigger>
            </TabsList>
            {activeTab === "list" && (
              <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Avatar
              </Button>
            )}
          </div>

          <TabsContent value="list" className="mt-0">
            <AiSdrList
              sdrs={sdrs}
              onView={handleView}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          </TabsContent>

          <TabsContent value="form" className="mt-0">
            <AiSdrForm
              initialData={isEditing ? selectedSdr : undefined}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </TabsContent>

          <TabsContent value="detail" className="mt-0">
            {selectedSdr && (
              <AiSdrDetail
                sdr={selectedSdr}
                onEdit={() => handleEdit(selectedSdr)}
                onBack={() => setActiveTab("list")}
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
