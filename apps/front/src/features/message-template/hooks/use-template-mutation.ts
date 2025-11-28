import {
  CreateMessageTemplateMutationVariables,
  MessageTemplateType,
} from "@/graphql/types";
import { useApolloClient, useMutation } from "@apollo/client";
import {
  CREATE_MESSAGE_TEMPLATE_MUTATION,
  UPDATE_MESSAGE_TEMPLATE_MUTATION,
} from "../mutations/message-template.mutations";
import { useState } from "react";
import { useApiError } from "@/hooks/use-api-error";
import { toast } from "sonner";
import { MESSAGE_TEMPLATES_EVICT } from "../queries/message-template.queries";

export function useTemplateMutation(type: MessageTemplateType) {
  const [createTemplate] = useMutation(CREATE_MESSAGE_TEMPLATE_MUTATION);
  const [updateTemplate] = useMutation(UPDATE_MESSAGE_TEMPLATE_MUTATION);
  const [loading, setLoading] = useState(false);
  const { showError } = useApiError();
  const { cache } = useApolloClient();

  const handleSave = async ({
    id,
    ...variables
  }: Omit<CreateMessageTemplateMutationVariables, "type"> & {
    id?: string | null;
  }) => {
    setLoading(true);

    try {
      if (!id) {
        await createTemplate({
          variables: { ...variables, type },
        });
        cache.evict(MESSAGE_TEMPLATES_EVICT);
      } else {
        await updateTemplate({
          variables: { ...variables, id, type },
        });
      }
      toast.success("Message template saved");
    } catch (error) {
      showError(error, { gql: true });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return [handleSave, { loading }] as const;
}
