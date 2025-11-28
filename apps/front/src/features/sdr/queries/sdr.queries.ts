import { PAGE_INFO_FRAGMENT } from "@/graphql/fragments/page-info.fragment";
import type {
  AiSdrAvatarDetailsQuery,
  AiSdrAvatarDetailsQueryVariables,
  AiSdrAvatarsQuery,
  AiSdrAvatarsQueryVariables,
  AiSdrSelectorQuery,
  AiSdrSelectorQueryVariables,
  ExtractNode,
} from "@/graphql/types";
import { Cache, gql, TypedDocumentNode } from "@apollo/client";

export const AI_SDR_AVATARS_EVICT: Cache.EvictOptions = {
  id: "ROOT_QUERY",
  fieldName: "aiSdrAvatars",
};

export type AiSdrNode = ExtractNode<AiSdrAvatarsQuery["aiSdrAvatars"]>;

export const AI_SDR_AVATARS_QUERY: TypedDocumentNode<
  AiSdrAvatarsQuery,
  AiSdrAvatarsQueryVariables
> = gql`
  ${PAGE_INFO_FRAGMENT}
  query AiSdrAvatars(
    $first: Int
    $after: String
    $last: Int
    $before: String
    $teamId: ID!
    $searchQuery: String
  ) {
    aiSdrAvatars(
      first: $first
      after: $after
      last: $last
      before: $before
      teamId: $teamId
      searchQuery: $searchQuery
    ) {
      edges {
        node {
          id
          name
          industry
          tags
          active
          avatarUri
          description
          personality
        }
      }
      pageInfo {
        ...PageInfo
      }
    }
  }
`;

export const AI_SDR_AVATAR_DETAILS_QUERY: TypedDocumentNode<
  AiSdrAvatarDetailsQuery,
  AiSdrAvatarDetailsQueryVariables
> = gql`
  query AiSdrAvatarDetails($teamId: ID!, $id: ID!) {
    aiSdrAvatar(teamId: $teamId, id: $id) {
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
    }
  }
`;

export const AI_SDR_SELECTOR_QUERY: TypedDocumentNode<
  AiSdrSelectorQuery,
  AiSdrSelectorQueryVariables
> = gql`
  query AiSdrSelector($teamId: ID!, $searchQuery: String) {
    aiSdrAvatars(teamId: $teamId, searchQuery: $searchQuery) {
      edges {
        node {
          id
          name
          description
          industry
          tags
          avatarUri
          mission
          goal
          roles
          faqs {
            question
            answer
          }
        }
      }
    }
  }
`;
