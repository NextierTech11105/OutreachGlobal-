"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Pause, Play, Trash } from "lucide-react";
import { CampaignDetailsQuery, MessageTemplateType } from "@/graphql/types";
import { TeamLink } from "@/features/team/components/team-link";
import { CampaignStatus } from "@nextier/common";
import { useSingleQuery } from "@/graphql/hooks/use-single-query";
import { CAMPAIGN_EXECUTIONS_QUERY } from "@/features/campaign/queries/campaign-exec.queries";
import { useCurrentTeam } from "@/features/team/team.context";
import { formatDate } from "date-fns";
import { CampaignLeadList } from "@/features/campaign/components/campaign-lead-list";
import { useModalAlert } from "./ui/modal";
import { useMutation } from "@apollo/client";
import { TOGGLE_CAMPAIGN_STATUS_MUTATION } from "@/features/campaign/mutations/campaign.mutations";

interface CampaignDetailsProps {
  campaign: CampaignDetailsQuery["campaign"];
}

export function CampaignDetails({ campaign }: CampaignDetailsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const { team } = useCurrentTeam();
  const router = useRouter();

  const [data] = useSingleQuery(CAMPAIGN_EXECUTIONS_QUERY, {
    pick: "campaign",
    variables: {
      id: campaign.id,
      teamId: team.id,
    },
  });

  const [toggleStatus] = useMutation(TOGGLE_CAMPAIGN_STATUS_MUTATION);
  const { showAlert } = useModalAlert();

  const executions = data?.executions?.edges?.map((edge) => edge.node);

  const handleStatusToggle = () => {
    const newStatus =
      campaign.status === CampaignStatus.ACTIVE ? "pause" : "activate";

    showAlert({
      title: "Toggle Campaign Status",
      description: `Are you sure you want to ${newStatus} this campaign?`,
      onConfirm: async () => {
        await toggleStatus({
          variables: {
            teamId: team.id,
            id: campaign.id,
          },
        });

        router.refresh();
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold">{campaign.name}</h2>
            <Badge
              variant={campaign.status === "active" ? "default" : "secondary"}
              className="capitalize"
            >
              {campaign.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">{campaign.description}</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={
              campaign.status === CampaignStatus.ACTIVE ? "outline" : "default"
            }
            size="sm"
            onClick={handleStatusToggle}
          >
            {campaign.status === CampaignStatus.ACTIVE ? (
              <>
                <Pause />
                Pause
              </>
            ) : (
              <>
                <Play />
                Resume
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <TeamLink href={`/campaigns/${campaign.id}/edit`}>
              <Edit />
              Edit
            </TeamLink>
          </Button>
        </div>
      </div>

      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaign.estimatedLeadsCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total leads in campaign
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Engagement Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0%</div>
                <p className="text-xs text-muted-foreground">
                  Leads who engaged
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Conversion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0%</div>
                <p className="text-xs text-muted-foreground">
                  Leads who converted
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaign.sequences.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Message templates
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions?.map((execution) => (
                  <TableRow key={execution.id}>
                    <TableCell>
                      {formatDate(execution.createdAt, "PPp")}
                    </TableCell>

                    <TableCell>{execution.status}</TableCell>
                    <TableCell>{execution.failedReason || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="mt-6">
          <CampaignLeadList campaignId={campaign.id} />
        </TabsContent>

        <TabsContent value="messages" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Campaign Messages</h3>
          </div>

          <div className="space-y-4">
            {campaign.sequences.map((sequence) => (
              <Card key={sequence.id}>
                <CardContent>
                  <div className="space-y-2">
                    {sequence.type === MessageTemplateType.EMAIL && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Subject</p>
                        <p className="text-sm">
                          Property opportunity in Queens
                        </p>
                      </div>
                    )}

                    <div className="space-y-1">
                      <p className="text-sm font-medium">Message</p>
                      <div className="whitespace-pre-line rounded-md border p-3 text-sm">
                        {sequence.content}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
