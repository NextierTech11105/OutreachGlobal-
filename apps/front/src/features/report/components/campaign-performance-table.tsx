"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentTeam } from "@/features/team/team.context";
import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";
import { TeamLink } from "@/features/team/components/team-link";
import { CAMPAIGNS_QUERY } from "@/features/campaign/queries/campaign.queries";

export function CampaignPerformanceTable() {
  const { team } = useCurrentTeam();

  const [campaigns, pageInfo, { loading }] = useConnectionQuery(
    CAMPAIGNS_QUERY,
    {
      pick: "campaigns",
      variables: {
        teamId: team.id,
      },
    },
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Campaign</TableHead>
          <TableHead>AI SDR Avatar</TableHead>
          <TableHead>Leads</TableHead>
          <TableHead>Engagement</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[70px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {!loading && !campaigns?.length && (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center">
              No campaigns found
            </TableCell>
          </TableRow>
        )}
        {campaigns?.map((campaign) => (
          <TableRow key={campaign.id}>
            <TableCell className="font-medium">{campaign.name}</TableCell>
            <TableCell>
              {!campaign.aiSdrAvatar ? (
                "No AI SDR Avatar"
              ) : (
                <TeamLink
                  href={`/ai-sdr/${campaign.aiSdrAvatar.id}`}
                  className="underline underline-offset-2"
                >
                  {campaign.aiSdrAvatar.name}
                </TeamLink>
              )}
            </TableCell>
            <TableCell>{campaign.estimatedLeadsCount}</TableCell>
            <TableCell>0%</TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
              >
                {campaign.status}
              </Badge>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <TeamLink href={`/campaigns/${campaign.id}`}>
                      View Campaign
                    </TeamLink>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
