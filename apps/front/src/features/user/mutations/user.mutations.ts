import type {
  LoginMutation,
  LoginMutationVariables,
  UpdateProfileMutation,
  UpdateProfileMutationVariables,
} from "@/graphql/types";
import { gql, type TypedDocumentNode } from "@apollo/client";

export const LOGIN_MUTATION: TypedDocumentNode<
  LoginMutation,
  LoginMutationVariables
> = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        id
        email
        name
        role
      }
    }
  }
`;

export const UPDATE_PROFILE_MUTATION: TypedDocumentNode<
  UpdateProfileMutation,
  UpdateProfileMutationVariables
> = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      user {
        id
        name
      }
    }
  }
`;
