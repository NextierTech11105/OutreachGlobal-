"use client";

import { useCurrentTeam } from "../team.context";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createDefaultCursor } from "@/graphql/graphql-utils";
import { useState } from "react";
import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";
import { TEAM_MEMBERS_QUERY } from "../queries/team-member.queries";
import { TeamMemberRole } from "@nextier/common";
import { CursorPagination } from "@/components/pagination/cursor-pagination";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontalIcon } from "lucide-react";
import { useAuthState } from "@/hooks/use-auth";
import { LoadingOverlay } from "@/components/ui/loading/loading-overlay";
import { useModalAlert } from "@/components/ui/modal";
import { useApiError } from "@/hooks/use-api-error";
import { useMutation } from "@apollo/client";
import { REMOVE_TEAM_MEMBER_MUTATION } from "../mutations/team-member.mutations";
import { toast } from "sonner";

const LIMIT = 10;
const defaultCursor = createDefaultCursor({ first: LIMIT });

export const TeamMemberList: React.FC = () => {
  const { team } = useCurrentTeam();
  const user = useAuthState();
  const [cursor, setCursor] = useState(defaultCursor);
  const [teamMembers, pageInfo, { loading, refetch }] = useConnectionQuery(
    TEAM_MEMBERS_QUERY,
    {
      pick: "teamMembers",
      variables: { ...cursor, teamId: team.id },
    },
  );

  const { showAlert } = useModalAlert();
  const { showError } = useApiError();
  const [removeTeamMember] = useMutation(REMOVE_TEAM_MEMBER_MUTATION);

  const confirmRemove = (id: string) => {
    showAlert({
      title: "Remove Member",
      description: "Are you sure you want to remove this member?",
      onConfirm: async () => {
        try {
          await removeTeamMember({
            variables: {
              teamId: team.id,
              memberId: id,
            },
          });
          await refetch();
          toast.success("Member removed");
        } catch (error) {
          showError(error, { gql: true });
        }
      },
    });
  };

  return (
    <Card className="relative overflow-hidden">
      {loading && <LoadingOverlay />}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teamMembers.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium">{member.user?.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {member.user?.email}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>{member.role}</TableCell>
              <TableCell>
                <Badge>Active</Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontalIcon className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={
                        member.role === TeamMemberRole.OWNER ||
                        member.user?.id === user.id
                      }
                      onClick={() => confirmRemove(member.id)}
                    >
                      Remove Member
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
};
