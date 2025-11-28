"use client";

import { FieldErrors } from "@/components/errors/field-errors";
import { Button } from "@/components/ui/button";
import { FormItem } from "@/components/ui/form/form-item";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalCloseX,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalProps,
  ModalTitle,
} from "@/components/ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "@/lib/hook-form/hooks/use-form";
import { zodResolver } from "@/lib/hook-form/resolvers/zod";
import { useApolloClient, useMutation } from "@apollo/client";
import { TeamMemberRole } from "@nextier/common";
import { InviteTeamMemberDto, inviteTeamMemberSchema } from "@nextier/dto";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { INVITE_TEAM_MEMBER_MUTATION } from "../mutations/team-member.mutations";
import { useCurrentTeam } from "../team.context";
import { useApiError } from "@/hooks/use-api-error";
import { TEAM_INVITATIONS_EVICT } from "../queries/team-member.queries";
import { toast } from "sonner";

interface Props extends ModalProps {}

export const TeamInvitationModal = ({ onOpenChange, ...props }: Props) => {
  const { handleSubmit, register, registerError, control } = useForm({
    resolver: zodResolver(inviteTeamMemberSchema),
    defaultValues: {
      role: TeamMemberRole.MEMBER,
    },
  });

  const [loading, setLoading] = useState(false);
  const { team } = useCurrentTeam();
  const { cache } = useApolloClient();
  const { showError } = useApiError();
  const [inviteTeam] = useMutation(INVITE_TEAM_MEMBER_MUTATION);

  const invite = async (input: InviteTeamMemberDto) => {
    setLoading(true);
    try {
      await inviteTeam({
        variables: {
          teamId: team.id,
          input,
        },
      });

      cache.evict(TEAM_INVITATIONS_EVICT);
      toast.success("Invitation sent");
      onOpenChange?.(false);
    } catch (error) {
      showError(error, { gql: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal {...props} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Invite Team Member</ModalTitle>
          <ModalCloseX />
        </ModalHeader>
        <form onSubmit={handleSubmit(invite)}>
          <ModalBody className="space-y-4">
            <FormItem>
              <Label htmlFor="email">Email</Label>
              <Input {...register("email")} type="email" />
              <FieldErrors {...registerError("email")} />
            </FormItem>

            <FormItem>
              <Label>Role</Label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TeamMemberRole.MEMBER}>
                        Member
                      </SelectItem>
                      <SelectItem value={TeamMemberRole.ADMIN}>
                        Admin
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormItem>
          </ModalBody>
          <ModalFooter className="flex justify-end gap-2">
            <ModalClose asChild>
              <Button variant="outline">Cancel</Button>
            </ModalClose>
            <Button type="submit" disabled={loading}>
              Invite
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};
