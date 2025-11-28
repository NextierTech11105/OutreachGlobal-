"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentTeam } from "@/features/team/team.context";
import { useSingleQuery } from "@/graphql/hooks/use-single-query";
import { CAMPAIGN_LEADS_QUERY } from "../queries/campaign-lead.queries";
import { formatDate } from "date-fns";

interface Props {
  campaignId: string;
}

export function CampaignLeadList({ campaignId }: Props) {
  const { team } = useCurrentTeam();

  const [campaign] = useSingleQuery(CAMPAIGN_LEADS_QUERY, {
    pick: "campaign",
    variables: {
      teamId: team.id,
      id: campaignId,
    },
  });

  const filteredLeads = useMemo(() => {
    if (!campaign?.campaignLeads) return [];

    return campaign.campaignLeads.edges.map((edge) => edge.node);
  }, [campaign?.campaignLeads]);

  return (
    <Card className="relative overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>
              <div className="flex items-center">
                Status
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center">
                Score
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Last Activity</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredLeads.map(({ lead, ...campaignLead }) => (
            <TableRow key={lead.id}>
              <TableCell className="font-medium">{lead.name}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  <p className="text-sm">{lead.email || "no email"}</p>
                  <p className="text-xs text-muted-foreground">
                    {lead.phone || "-"}
                  </p>
                </div>
              </TableCell>
              <TableCell>{lead.address || "-"}</TableCell>
              <TableCell>
                <Badge>{lead.status || "No Status"}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={lead.score >= 30 ? "default" : "outline"}>
                  {lead.score}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {lead.tags?.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {!campaignLead.lastSequenceExecutedAt
                  ? "-"
                  : formatDate(campaignLead.lastSequenceExecutedAt, "PPp")}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    <DropdownMenuItem>Send Message</DropdownMenuItem>
                    <DropdownMenuItem>Update Status</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600">
                      Remove from Campaign
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
