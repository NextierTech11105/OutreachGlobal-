"use client";

import { ModalProvider } from "@/components/ui/modal";
import { AuthProvider } from "@/features/auth/auth-provider";
import { getApolloClient } from "@/graphql/apollo-client";
import type { UserState } from "@/stores/auth.store";
import { CFC } from "@/types/element.type";
import { ApolloProvider } from "@apollo/client";

const client = getApolloClient();

interface Props {
  user?: UserState;
}

export const AppProviders: CFC<Props> = ({ user, children }) => {
  return (
    <AuthProvider user={user}>
      <ApolloProvider client={client}>
        <ModalProvider>{children}</ModalProvider>
      </ApolloProvider>
    </AuthProvider>
  );
};
