import type {
  CreateAiSdrAvatarMutation,
  CreateAiSdrAvatarMutationVariables,
  DeleteAiSdrAvatarMutation,
  DeleteAiSdrAvatarMutationVariables,
  UpdateAiSdrAvatarMutation,
  UpdateAiSdrAvatarMutationVariables,
} from "@/graphql/types";
import { gql, TypedDocumentNode } from "@apollo/client";

export const CREATE_AI_SDR_AVATAR_MUTATION: TypedDocumentNode<
  CreateAiSdrAvatarMutation,
  CreateAiSdrAvatarMutationVariables
> = gql`
  mutation CreateAiSdrAvatar($teamId: ID!, $input: CreateAiSdrAvatarInput!) {
    createAiSdrAvatar(teamId: $teamId, input: $input) {
      avatar {
        id
      }
    }
  }
`;

export const UPDATE_AI_SDR_AVATAR_MUTATION: TypedDocumentNode<
  UpdateAiSdrAvatarMutation,
  UpdateAiSdrAvatarMutationVariables
> = gql`
  mutation UpdateAiSdrAvatar(
    $id: ID!
    $teamId: ID!
    $input: UpdateAiSdrAvatarInput!
  ) {
    updateAiSdrAvatar(teamId: $teamId, id: $id, input: $input) {
      avatar {
        id
        name
        description
        personality
        voiceType
        avatarUri
        active
        industry
        mission
        goal
        roles
        faqs {
          question
          answer
        }
        tags
        createdAt
        updatedAt
      }
    }
  }
`;

export const DELETE_AI_SDR_AVATAR_MUTATION: TypedDocumentNode<
  DeleteAiSdrAvatarMutation,
  DeleteAiSdrAvatarMutationVariables
> = gql`
  mutation DeleteAiSdrAvatar($teamId: ID!, $id: ID!) {
    deleteAiSdrAvatar(teamId: $teamId, id: $id) {
      id
    }
  }
`;
