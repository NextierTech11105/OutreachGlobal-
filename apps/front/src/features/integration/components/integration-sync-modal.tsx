"use client";

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
import { useApiError } from "@/hooks/use-api-error";
import { useForm } from "@/lib/hook-form/hooks/use-form";
import { zodResolver } from "@/lib/hook-form/resolvers/zod";
import { useApolloClient, useMutation } from "@apollo/client";
import { z } from "@nextier/dto";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { SYNC_INTEGRATION_LEAD_MUTATION } from "../mutations/integration.mutations";
import { Button } from "@/components/ui/button";
import { FormItem } from "@/components/ui/form/form-item";
import { FieldErrors } from "@/components/errors/field-errors";
import { INTEGRATION_TASKS_EVICT } from "../queries/integration-task.queries";
import { toast } from "sonner";
import { useCurrentTeam } from "@/features/team/team.context";

interface Props extends ModalProps {
  integrationId: string;
}

const schema = z.object({
  moduleName: z.string().nonempty(),
});

const availableModules = ["Leads", "Contacts", "Accounts", "Comm_Logs"];

export const IntegrationSyncModal: React.FC<Props> = ({
  onOpenChange,
  integrationId,
  ...props
}) => {
  const { team } = useCurrentTeam();
  const { handleSubmit, registerError, control } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      moduleName: "",
    },
  });

  const { showError } = useApiError();
  const [loading, setLoading] = useState(false);
  const [syncIntegration] = useMutation(SYNC_INTEGRATION_LEAD_MUTATION);
  const { cache } = useApolloClient();

  const save = async (input: z.infer<typeof schema>) => {
    setLoading(true);

    try {
      await syncIntegration({
        variables: {
          teamId: team.id,
          id: integrationId,
          moduleName: input.moduleName,
        },
      });
      cache.evict(INTEGRATION_TASKS_EVICT);
      toast.success(`Sync module ${input.moduleName} started`);
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
        <ModalHeader className="flex justify-between items-center">
          <ModalTitle>Sync Module</ModalTitle>
          <ModalCloseX />
        </ModalHeader>

        <form onSubmit={handleSubmit(save)}>
          <ModalBody className="space-y-4">
            <FormItem>
              <Label>Module Name</Label>
              <Controller
                control={control}
                name="moduleName"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select module" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModules.map((module) => (
                        <SelectItem key={module} value={module}>
                          {module}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldErrors {...registerError("moduleName")} />
            </FormItem>
          </ModalBody>

          <ModalFooter className="flex justify-end items-center gap-x-3">
            <ModalClose asChild>
              <Button variant="outline">Cancel</Button>
            </ModalClose>

            <Button type="submit" loading={loading}>
              Sync Module
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};
