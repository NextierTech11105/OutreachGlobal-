import type {
  ModuleMetadataQuery,
  ModuleMetadataQueryVariables,
} from "@/graphql/types";
import { gql, TypedDocumentNode } from "@apollo/client";

export const MODULE_METADATA_QUERY: TypedDocumentNode<
  ModuleMetadataQuery,
  ModuleMetadataQueryVariables
> = gql`
  query ModuleMetadata($teamId: ID!, $provider: String!, $name: String!) {
    moduleMetadata(teamId: $teamId, provider: $provider, name: $name) {
      name
      fields
    }
  }
`;
