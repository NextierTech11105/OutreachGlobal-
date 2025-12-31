import { Metadata } from "next";

export const metadata: Metadata = {
  title: "NEXTIER - AI-Powered Sales Intelligence Platform",
  description:
    "Close more deals with AI-powered research, power dialing, SMS campaigns, and skip tracing. The all-in-one platform for modern sales teams.",
  keywords: [
    "sales intelligence",
    "power dialer",
    "skip tracing",
    "SMS campaigns",
    "AI research",
    "lead generation",
    "real estate",
    "CRM",
  ],
  openGraph: {
    title: "NEXTIER - AI-Powered Sales Intelligence Platform",
    description:
      "Close more deals with AI-powered research, power dialing, SMS campaigns, and skip tracing.",
    type: "website",
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
