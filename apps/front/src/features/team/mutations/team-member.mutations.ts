import {
  CreateTeamAccountMutation,
  CreateTeamAccountMutationVariables,
  InviteTeamMemberMutation,
  InviteTeamMemberMutationVariables,
  RemoveTeamMemberMutation,
  RemoveTeamMemberMutationVariables,
  RemoveTeamInvitationMutation,
  RemoveTeamInvitationMutationVariables,
  ResendTeamInvitationMutation,
  ResendTeamInvitationMutationVariables,
} from "@/graphql/types";
import { gql, TypedDocumentNode } from "@apollo/client";

export const INVITE_TEAM_MEMBER_MUTATION: TypedDocumentNode<
  InviteTeamMemberMutation,
  InviteTeamMemberMutationVariables
> = gql`
  mutation InviteTeamMember($teamId: ID!, $input: InviteTeamMemberInput!) {
    inviteTeamMember(teamId: $teamId, input: $input) {
      teamInvitation {
        id
      }
    }
  }
`;

export const CREATE_TEAM_ACCOUNT_MUTATION: TypedDocumentNode<
  CreateTeamAccountMutation,
  CreateTeamAccountMutationVariables
> = gql`
  mutation CreateTeamAccount($code: String!, $input: CreateTeamAccountInput!) {
    createTeamAccount(code: $code, input: $input) {
      team {
        id
        slug
      }
      token
    }
  }
`;

export const REMOVE_TEAM_MEMBER_MUTATION: TypedDocumentNode<
  RemoveTeamMemberMutation,
  RemoveTeamMemberMutationVariables
> = gql`
  mutation RemoveTeamMember($teamId: ID!, $memberId: ID!) {
    removeTeamMember(teamId: $teamId, memberId: $memberId)
  }
`;

export const REMOVE_TEAM_INVITATION_MUTATION: TypedDocumentNode<
  RemoveTeamInvitationMutation,
  RemoveTeamInvitationMutationVariables
> = gql`
  mutation RemoveTeamInvitation($teamId: ID!, $id: ID!) {
    removeTeamInvitation(teamId: $teamId, id: $id) {
      removedId
    }
  }
`;

export const RESEND_TEAM_INVITATION_MUTATION: TypedDocumentNode<
  ResendTeamInvitationMutation,
  ResendTeamInvitationMutationVariables
> = gql`
  mutation ResendTeamInvitation($teamId: ID!, $id: ID!) {
    resendTeamInvitation(teamId: $teamId, id: $id) {
      teamInvitation {
        id
        createdAt
      }
    }
  }
`;
