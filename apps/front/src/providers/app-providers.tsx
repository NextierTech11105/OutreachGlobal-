"use client";

import { ModalProvider } from "@/components/ui/modal";
import { AuthProvider } from "@/features/auth/auth-provider";
import type { UserState } from "@/stores/auth.store";
import { CFC } from "@/types/element.type";
import { ApolloWrapper } from "./apollo-wrapper";

interface Props {
  user?: UserState;
}

export const AppProviders: CFC<Props> = ({ user, children }) => {
  return (
    <AuthProvider user={user}>
      <ApolloWrapper>
        <ModalProvider>{children}</ModalProvider>
      </ApolloWrapper>
    </AuthProvider>
  );
};
