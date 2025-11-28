import { gql, TypedDocumentNode } from "@apollo/client";
import type {
  CreateImportLeadPresetMutation,
  CreateImportLeadPresetMutationVariables,
} from "@/graphql/types";

export const CREATE_IMPORT_LEAD_PRESET_MUTATION: TypedDocumentNode<
  CreateImportLeadPresetMutation,
  CreateImportLeadPresetMutationVariables
> = gql`
  mutation CreateImportLeadPreset(
    $teamId: ID!
    $input: ImportLeadPresetInput!
  ) {
    createImportLeadPreset(teamId: $teamId, input: $input) {
      preset {
        id
        name
        config
      }
    }
  }
`;

export type CreateImportLeadPreset =
  CreateImportLeadPresetMutation["createImportLeadPreset"]["preset"];
