"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Loader2 } from "lucide-react";
import { AiSdrForm } from "@/components/ai-sdr-form";
import { AiSdrList } from "@/components/ai-sdr-list";
import { AiSdrDetail } from "@/components/ai-sdr-detail";
import { useToast } from "@/hooks/use-toast";
import { useCurrentTeam } from "@/features/team/team.context";
import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";
import {
  AI_SDR_AVATARS_QUERY,
  AI_SDR_AVATARS_EVICT,
} from "@/features/sdr/queries/sdr.queries";
import {
  CREATE_AI_SDR_AVATAR_MUTATION,
  UPDATE_AI_SDR_AVATAR_MUTATION,
  DELETE_AI_SDR_AVATAR_MUTATION,
} from "@/features/sdr/mutations/sdr.mutations";

// Type aligned with API response
export type AiSdr = {
  id: string;
  name: string;
  description: string | null;
  personality: string | null;
  voiceType?: string | null;
  avatarUri: string | null;
  active: boolean;
  industry: string | null;
  mission?: string | null;
  goal?: string | null;
  roles?: string[];
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
};

export function AiSdrManager() {
  const [activeTab, setActiveTab] = useState("list");
  const [selectedSdr, setSelectedSdr] = useState<AiSdr | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const { teamId, isTeamReady } = useCurrentTeam();

  // Fetch AI SDR avatars from API
  const [sdrs, pageInfo, { loading, error, refetch }] = useConnectionQuery(
    AI_SDR_AVATARS_QUERY,
    {
      pick: "aiSdrAvatars",
      variables: { teamId, first: 50 },
      skip: !isTeamReady,
    },
  );

  // Mutations
  const [createAvatar, { loading: creating }] = useMutation(
    CREATE_AI_SDR_AVATAR_MUTATION,
    {
      onCompleted: () => {
        refetch();
      },
      update: (cache) => {
        cache.evict(AI_SDR_AVATARS_EVICT);
      },
    },
  );

  const [updateAvatar, { loading: updating }] = useMutation(
    UPDATE_AI_SDR_AVATAR_MUTATION,
    {
      onCompleted: () => {
        refetch();
      },
    },
  );

  const [deleteAvatar, { loading: deleting }] = useMutation(
    DELETE_AI_SDR_AVATAR_MUTATION,
    {
      onCompleted: () => {
        refetch();
      },
      update: (cache) => {
        cache.evict(AI_SDR_AVATARS_EVICT);
      },
    },
  );

  const isMutating = creating || updating || deleting;

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
            avatarUri: sdr.avatarUri,
            active: sdr.active,
            industry: sdr.industry,
            mission: sdr.mission,
            goal: sdr.goal,
            roles: sdr.roles,
            faqs: sdr.faqs,
            tags: sdr.tags,
          },
        },
      });
      toast({
        title: "Avatar Duplicated",
        description: `${sdr.name} has been duplicated successfully.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to duplicate avatar.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAvatar({
        variables: { teamId, id },
      });
      toast({
        title: "Avatar Deleted",
        description: "The AI SDR avatar has been deleted successfully.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete avatar.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async (sdr: Omit<AiSdr, "id" | "createdAt" | "updatedAt">) => {
    try {
      if (isEditing && selectedSdr) {
        // Update existing SDR
        await updateAvatar({
          variables: {
            teamId,
            id: selectedSdr.id,
            input: {
              name: sdr.name,
              description: sdr.description,
              personality: sdr.personality,
              voiceType: sdr.voiceType,
              avatarUri: sdr.avatarUri,
              active: sdr.active,
              industry: sdr.industry,
              mission: sdr.mission,
              goal: sdr.goal,
              roles: sdr.roles,
              faqs: sdr.faqs,
              tags: sdr.tags,
            },
          },
        });
        toast({
          title: "Avatar Updated",
          description: `${sdr.name} has been updated successfully.`,
        });
      } else {
        // Create new SDR
        await createAvatar({
          variables: {
            teamId,
            input: {
              name: sdr.name,
              description: sdr.description,
              personality: sdr.personality,
              voiceType: sdr.voiceType,
              avatarUri: sdr.avatarUri,
              active: sdr.active,
              industry: sdr.industry,
              mission: sdr.mission,
              goal: sdr.goal,
              roles: sdr.roles,
              faqs: sdr.faqs,
              tags: sdr.tags,
            },
          },
        });
        toast({
          title: "Avatar Created",
          description: `${sdr.name} has been created successfully.`,
        });
      }
      setActiveTab("list");
    } catch (err) {
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

  // Show loading state while team is loading or fetching avatars
  if (!isTeamReady || loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>AI SDR Avatar Management</CardTitle>
          <CardDescription>
            Create and manage AI SDR avatars for your campaigns.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>AI SDR Avatar Management</CardTitle>
          <CardDescription>
            Create and manage AI SDR avatars for your campaigns.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <p className="text-destructive mb-4">Failed to load avatars</p>
          <Button variant="outline" onClick={() => refetch()}>
            Try Again
          </Button>
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
              <Button onClick={handleAddNew} disabled={isMutating}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Avatar
              </Button>
            )}
          </div>

          <TabsContent value="list" className="mt-0">
            <AiSdrList
              sdrs={sdrs as AiSdr[]}
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
