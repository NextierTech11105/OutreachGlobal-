import "./globals.css";
import type React from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as ToasterProvider } from "@/components/ui/sonner";
import { CallStateProvider } from "@/lib/providers/call-state-provider";
import { CallStateBridge } from "@/components/call-state-bridge";
import { CallModal } from "@/components/call-modal";
import { getTitle } from "@/config/title";
import { AppProviders } from "@/providers/app-providers";
import { getAuthUser } from "@/features/auth/auth.data";

export const metadata = {
  title: getTitle("Home"),
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getAuthUser();
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body
        className="antialiased font-sans bg-background h-full"
      >
        <AppProviders user={user || undefined}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            storageKey="nextier-theme"
          >
            <CallStateProvider>
              <CallStateBridge />
              {children}
              <CallModal />
            </CallStateProvider>
            {/* @deprecated */}
            <Toaster />
            <ToasterProvider />
          </ThemeProvider>
        </AppProviders>
      </body>
    </html>
  );
}
