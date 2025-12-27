import "./globals.css";
import type React from "react";

// Force dynamic rendering to avoid static generation issues with auth
export const dynamic = "force-dynamic";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Geist, Geist_Mono } from "next/font/google";
import { CallStateProvider } from "@/lib/providers/call-state-provider";
import { GlobalActionsProvider } from "@/lib/providers/global-actions-provider";
import { CallStateBridge } from "@/components/call-state-bridge";
import { CallModal } from "@/components/call-modal";
import { GlobalQuickActions } from "@/components/global-quick-actions";
import { getTitle } from "@/config/title";
import { AppProviders } from "@/providers/app-providers";
import { getAuthUser } from "@/features/auth/auth.data";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans bg-background h-full`}
      >
        <AppProviders user={user || undefined}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            storageKey={process.env.NEXT_PUBLIC_THEME_KEY || "nextier-theme"}
          >
            <GlobalActionsProvider>
              <CallStateProvider>
                <ImpersonationBanner />
                <CallStateBridge />
                {children}
                <CallModal />
                <GlobalQuickActions />
              </CallStateProvider>
            </GlobalActionsProvider>
            <Toaster />
          </ThemeProvider>
        </AppProviders>
      </body>
    </html>
  );
}
