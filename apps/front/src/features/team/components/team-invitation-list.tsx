"use client";

import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";
import { useCurrentTeam } from "../team.context";
import { TEAM_INVITATIONS_QUERY } from "../queries/team-member.queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontalIcon } from "lucide-react";
import { useModalAlert } from "@/components/ui/modal";
import {
  REMOVE_TEAM_INVITATION_MUTATION,
  RESEND_TEAM_INVITATION_MUTATION,
} from "../mutations/team-member.mutations";
import { useMutation } from "@apollo/client";
import { useApiError } from "@/hooks/use-api-error";
import { toast } from "sonner";

export const TeamInvitationList = () => {
  const { team } = useCurrentTeam();
  const [invitations, pageInfo, { refetch }] = useConnectionQuery(
    TEAM_INVITATIONS_QUERY,
    {
      pick: "teamInvitations",
      variables: { teamId: team.id },
    },
  );

  const { showAlert } = useModalAlert();
  const { showError } = useApiError();
  const [resendTeamInvitation] = useMutation(RESEND_TEAM_INVITATION_MUTATION);
  const [removeTeamInvitation] = useMutation(REMOVE_TEAM_INVITATION_MUTATION);

  const confirmResend = (id: string) => {
    showAlert({
      title: "Resend Invitation",
      description: "Are you sure you want to resend this invitation?",
      onConfirm: async () => {
        try {
          await resendTeamInvitation({
            variables: {
              teamId: team.id,
              id,
            },
          });
          toast.success("Invitation resent");
        } catch (error) {
          showError(error, { gql: true });
        }
      },
    });
  };

  const confirmRemove = (id: string) => {
    showAlert({
      title: "Remove Invitation",
      description: "Are you sure you want to remove this invitation?",
      onConfirm: async () => {
        try {
          await removeTeamInvitation({
            variables: {
              teamId: team.id,
              id,
            },
          });
          await refetch();
          toast.success("Invitation removed");
        } catch (error) {
          showError(error, { gql: true });
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Pending Invitations</h3>
        <p className="text-sm text-muted-foreground">
          Manage invitations that have been sent but not yet accepted.
        </p>
      </div>

      {invitations?.length > 0 ? (
        <Card className="relative overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Invited By</TableHead>
                <TableHead>Invited At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell>{invite.email}</TableCell>
                  <TableCell>{invite.role}</TableCell>
                  <TableCell>{invite.invitedBy?.name}</TableCell>
                  <TableCell>{formatDate(invite.createdAt, "PPp")}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontalIcon className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          variant="default"
                          onClick={() => confirmResend(invite.id)}
                        >
                          Resend Invitation
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => confirmRemove(invite.id)}
                        >
                          Cancel Invitation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="flex h-[100px] items-center justify-center rounded-md border border-dashed">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              No pending invitations
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
