"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createDefaultCursor } from "@/graphql/graphql-utils";
import { useCurrentTeam } from "@/features/team/team.context";
import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";
import { CAMPAIGNS_QUERY } from "../queries/campaign.queries";
import { useDebounceValue } from "usehooks-ts";
import { CursorPagination } from "@/components/pagination/cursor-pagination";
import { LoadingOverlay } from "@/components/ui/loading/loading-overlay";
import { TeamLink } from "@/features/team/components/team-link";
import { useModalAlert } from "@/components/ui/modal";
import { useMutation } from "@apollo/client";
import { DELETE_CAMPAIGN_MUTATION } from "../mutations/campaign.mutations";
import { toast } from "sonner";
import { useApiError } from "@/hooks/use-api-error";

const LIMIT = 10;
const defaultCursor = createDefaultCursor({
  first: LIMIT,
});

export function CampaignDirector() {
  const { team } = useCurrentTeam();
  const [cursor, setCursor] = useState(defaultCursor);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery] = useDebounceValue(searchQuery, 350);

  const [campaigns, pageInfo, { loading, refetch }] = useConnectionQuery(
    CAMPAIGNS_QUERY,
    {
      pick: "campaigns",
      variables: {
        ...cursor,
        teamId: team.id,
        searchQuery: debouncedQuery || undefined,
      },
    },
  );

  const [deleteCampaign] = useMutation(DELETE_CAMPAIGN_MUTATION);
  const { showError } = useApiError();
  const { showAlert } = useModalAlert();

  const confirmDelete = (id: string) => {
    showAlert({
      title: "Delete Campaign",
      description: "Are you sure you want to delete this campaign?",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          await deleteCampaign({ variables: { id, teamId: team.id } });
          toast.success("Campaign deleted");
          await refetch();
        } catch (error) {
          showError(error, { gql: true });
        }
      },
    });
  };

  return (
    <Card className="relative overflow-hidden">
      {loading && <LoadingOverlay />}
      <div className="flex justify-between items-center px-3 py-4 gap-x-3">
        <div className="relative w-full">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

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
                    <DropdownMenuItem asChild>
                      <TeamLink href={`/campaigns/${campaign.id}/edit`}>
                        Edit Campaign
                      </TeamLink>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => confirmDelete(campaign.id)}
                      className="cursor-pointer"
                    >
                      Delete Campaign
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {!!pageInfo && (
        <CursorPagination
          data={pageInfo}
          onPageChange={setCursor}
          limit={LIMIT}
          variant="table-footer"
          className="border-t"
          hideResult
        />
      )}
    </Card>
  );
}
