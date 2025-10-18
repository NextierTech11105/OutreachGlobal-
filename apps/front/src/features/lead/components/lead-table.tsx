"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentTeam } from "@/features/team/team.context";
import { createDefaultCursor } from "@/graphql/graphql-utils";
import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";
import { useState } from "react";
import { LEADS_QUERY } from "../queries/lead.queries";
import { Badge } from "@/components/ui/badge";
import { CursorPagination } from "@/components/pagination/cursor-pagination";
import { LoadingOverlay } from "@/components/ui/loading/loading-overlay";
import { Card, CardContent } from "@/components/ui/card";
import { useMultiSelection } from "@/hooks/use-multi-selection";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useApiError } from "@/hooks/use-api-error";
import { useModalAlert } from "@/components/ui/modal";
import { useMutation } from "@apollo/client";
import { BULK_DELETE_LEAD_MUTATION } from "../mutations/lead.mutations";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontalIcon } from "lucide-react";
import { TeamLink } from "@/features/team/components/team-link";
const LIMIT = 15;

const defaultCursor = createDefaultCursor({
  first: LIMIT,
});

export const LeadTable = () => {
  const { team } = useCurrentTeam();
  const [cursor, setCursor] = useState(defaultCursor);

  const [leads, pageInfo, { loading, refetch }] = useConnectionQuery(
    LEADS_QUERY,
    {
      pick: "leads",
      variables: {
        ...cursor,
        teamId: team.id,
      },
    },
  );

  const [
    selectedLeads,
    {
      checkedState,
      handleToggleSelectAll,
      toggleSelect,
      isChecked,
      setSelected,
    },
  ] = useMultiSelection<{ id: string }>({
    itemsTotal: leads?.length || 0,
  });

  const { showAlert } = useModalAlert();
  const { showError } = useApiError();
  const [bulkDelete] = useMutation(BULK_DELETE_LEAD_MUTATION);

  const confirmBulkDelete = () => {
    showAlert({
      title: `delete ${selectedLeads.length} lead(s)`,
      description:
        "Are you sure you want to delete these leads? This action cannot be undone.",
      onConfirm: async () => {
        try {
          await bulkDelete({
            variables: {
              teamId: team.id,
              leadIds: selectedLeads.map((lead) => lead.id),
            },
          });

          await refetch({ ...defaultCursor });
          setCursor(defaultCursor);

          toast.success(`deleted ${selectedLeads.length} lead(s)`);
          setSelected([]);
        } catch (error) {
          showError(error, { gql: true });
        }
      },
    });
  };

  return (
    <Card className="relative overflow-hidden">
      {loading && <LoadingOverlay />}
      {selectedLeads.length > 0 && (
        <CardContent
          variant="table-checkbox"
          className="flex justify-between items-center border-t bg-muted"
        >
          <div className="flex items-center gap-x-2">
            <Checkbox
              checked={checkedState}
              onCheckedChange={handleToggleSelectAll([])}
            />

            <span className="text-sm text-muted-foreground">
              {selectedLeads.length} lead(s) selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button size="xs" variant="destructive" onClick={confirmBulkDelete}>
              Delete {selectedLeads.length} Lead(s)
            </Button>
          </div>
        </CardContent>
      )}
      <Table>
        {!selectedLeads.length && (
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={checkedState}
                  onCheckedChange={handleToggleSelectAll(leads || [])}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
        )}
        <TableBody>
          {!loading && !leads?.length && (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                no leads found
              </TableCell>
            </TableRow>
          )}
          {leads?.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell className="w-10">
                <div className="flex">
                  <Checkbox
                    checked={isChecked(lead)}
                    onCheckedChange={toggleSelect(lead)}
                  />
                </div>
              </TableCell>
              <TableCell>{lead.name || "-"}</TableCell>
              <TableCell>{lead.email || "-"}</TableCell>
              <TableCell>{lead.address || "-"}</TableCell>
              <TableCell>{lead.phone || "-"}</TableCell>
              <TableCell>
                <Badge variant="secondary">{lead.status}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{lead.score}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <MoreHorizontalIcon className="size-5" />
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <TeamLink href={`/leads/${lead.id}`}>Details</TeamLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <TeamLink href={`/leads/${lead.id}/edit`}>Edit</TeamLink>
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
          variant="table-footer"
          className="border-t"
          limit={LIMIT}
        />
      )}
    </Card>
  );
};
