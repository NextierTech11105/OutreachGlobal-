"use client";

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
import { useCurrentTeam } from "@/features/team/team.context";
import { useApiError } from "@/hooks/use-api-error";
import { useApolloClient, useMutation } from "@apollo/client";
import { useState } from "react";
import { CREATE_POWER_DIALER_MUTATION } from "../mutations/power-dialer.mutations";
import { useForm } from "@/lib/hook-form/hooks/use-form";
import { zodResolver } from "@/lib/hook-form/resolvers/zod";
import { CreatePowerDialerDto, createPowerDialerSchema } from "@nextier/dto";
import { useRouter } from "next/navigation";
import { POWER_DIALERS_EVICT } from "../queries/power-dialer.queries";
import { FieldErrors } from "@/components/errors/field-errors";
import { Button } from "@/components/ui/button";

export const PowerDialerModal: React.FC<ModalProps> = (props) => {
  const { team, teamId, isTeamReady } = useCurrentTeam();
  const [loading, setLoading] = useState(false);
  const { showError } = useApiError();
  const { cache } = useApolloClient();
  const [createPowerDialer] = useMutation(CREATE_POWER_DIALER_MUTATION);
  const router = useRouter();

  const { handleSubmit, register, registerError } = useForm({
    resolver: zodResolver(createPowerDialerSchema),
    defaultValues: { title: "" },
  });

  const save = async (input: CreatePowerDialerDto) => {
    if (!isTeamReady) return;
    setLoading(true);
    try {
      const { data } = await createPowerDialer({
        variables: { teamId, input },
      });
      cache.evict(POWER_DIALERS_EVICT);
      if (data?.createPowerDialer.powerDialer) {
        router.push(
          `/t/${team.slug}/power-dialers/${data.createPowerDialer.powerDialer.id}`,
        );
      }
    } catch (error) {
      showError(error, { gql: true });
      setLoading(false);
    }
  };

  return (
    <Modal {...props}>
      <ModalContent>
        <ModalHeader className="flex justify-between items-center">
          <ModalTitle>Create Power Dialer</ModalTitle>
          <ModalCloseX />
        </ModalHeader>

        <form onSubmit={handleSubmit(save)}>
          <ModalBody className="space-y-6">
            <FormItem>
              <Label htmlFor="title">Title</Label>
              <Input {...register("title")} id="title" />
              <FieldErrors {...registerError("title")} />
            </FormItem>
          </ModalBody>

          <ModalFooter>
            <ModalClose asChild>
              <Button variant="outline">Cancel</Button>
            </ModalClose>

            <Button type="submit" loading={loading}>
              Save
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};
