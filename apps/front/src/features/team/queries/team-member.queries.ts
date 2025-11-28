import { PAGE_INFO_FRAGMENT } from "@/graphql/fragments/page-info.fragment";
import type {
  TeamMembersQuery,
  TeamMembersQueryVariables,
  TeamInvitationsQuery,
  TeamInvitationsQueryVariables,
  TeamInvitationByCodeQuery,
  TeamInvitationByCodeQueryVariables,
} from "@/graphql/types";
import { Cache, gql, TypedDocumentNode } from "@apollo/client";

export const TEAM_INVITATIONS_EVICT: Cache.EvictOptions = {
  id: "ROOT_QUERY",
  fieldName: "teamInvitations",
};

export const TEAM_MEMBERS_EVICT: Cache.EvictOptions = {
  id: "ROOT_QUERY",
  fieldName: "teamMembers",
};

export const TEAM_MEMBERS_QUERY: TypedDocumentNode<
  TeamMembersQuery,
  TeamMembersQueryVariables
> = gql`
  ${PAGE_INFO_FRAGMENT}
  query TeamMembers(
    $first: Int
    $last: Int
    $after: String
    $before: String
    $teamId: ID!
  ) {
    teamMembers(
      first: $first
      last: $last
      after: $after
      before: $before
      teamId: $teamId
    ) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          id
          role
          status
          user {
            id
            name
            email
          }
        }
      }
    }
  }
`;

export const TEAM_INVITATIONS_QUERY: TypedDocumentNode<
  TeamInvitationsQuery,
  TeamInvitationsQueryVariables
> = gql`
  ${PAGE_INFO_FRAGMENT}
  query TeamInvitations(
    $first: Int
    $last: Int
    $after: String
    $before: String
    $teamId: ID!
  ) {
    teamInvitations(
      first: $first
      last: $last
      after: $after
      before: $before
      teamId: $teamId
    ) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          id
          role
          email
          createdAt
          invitedBy {
            id
            email
            name
          }
        }
      }
    }
  }
`;

export const TEAM_INVITATION_BY_CODE_QUERY: TypedDocumentNode<
  TeamInvitationByCodeQuery,
  TeamInvitationByCodeQueryVariables
> = gql`
  query TeamInvitationByCode($code: String!) {
    teamInvitationByCode(code: $code) {
      id
      role
      email
      createdAt
      invitedBy {
        id
        email
        name
      }
    }
  }
`;
