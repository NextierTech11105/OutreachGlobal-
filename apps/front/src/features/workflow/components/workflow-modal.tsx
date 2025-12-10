"use client";

import { toast } from "sonner";
import { WorkflowForm } from "./workflow-form";
import {
  Modal,
  ModalBody,
  ModalCloseX,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalProps,
  ModalTitle,
} from "@/components/ui/modal";
import { useState } from "react";
import { useCurrentTeam } from "@/features/team/team.context";
import { useApiError } from "@/hooks/use-api-error";
import { useApolloClient, useMutation } from "@apollo/client";
import { CREATE_WORKFLOW_MUTATION } from "../mutations/workflow.mutations";
import { CreateWorkflowDto } from "@nextier/dto";
import { WORKFLOWS_EVICT } from "../queries/workflow.queries";

interface Props extends ModalProps {}

export function WorkflowModal({ open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const { teamId, isTeamReady } = useCurrentTeam();
  const { showError } = useApiError();
  const { cache } = useApolloClient();
  const [createWorkflow] = useMutation(CREATE_WORKFLOW_MUTATION);

  const handleSubmit = async (input: CreateWorkflowDto) => {
    if (!isTeamReady) return;
    setLoading(true);
    try {
      await createWorkflow({
        variables: {
          teamId,
          input,
        },
      });
      cache.evict(WORKFLOWS_EVICT);
      toast.success("Automation rule created");
      closeModal();
    } catch (error) {
      showError(error, { gql: true });
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => onOpenChange?.(false);

  return (
    <Modal open={open} onOpenChange={closeModal}>
      <ModalContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <ModalHeader className="border-b">
          <div className="flex flex-col">
            <ModalTitle>Create Automation Rule</ModalTitle>
            <ModalDescription>
              Define the trigger, conditions, and actions for your automation
              rule.
            </ModalDescription>
          </div>
          <ModalCloseX />
        </ModalHeader>
        <ModalBody>
          <WorkflowForm
            onSubmit={handleSubmit}
            onCancel={closeModal}
            loading={loading}
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
