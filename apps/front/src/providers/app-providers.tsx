"use client";

import { ModalProvider } from "@/components/ui/modal";
import { AuthProvider } from "@/features/auth/auth-provider";
import type { UserState } from "@/stores/auth.store";
import { CFC } from "@/types/element.type";
import dynamic from "next/dynamic";
import { ReactNode, Suspense } from "react";

// Dynamically import ApolloWrapper with SSR disabled to prevent bundling issues
const ApolloWrapper = dynamic(
  () => import("./apollo-wrapper").then((mod) => mod.ApolloWrapper),
  { ssr: false }
);

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
