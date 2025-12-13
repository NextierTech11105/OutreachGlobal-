import { sf, sfd } from "@/lib/utils/safe-format";
import { Metadata } from "next";
import { ReportView } from "./report-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Generate dynamic metadata for Open Graph (link previews)
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;

  // Fetch report data for metadata
  let title = "Property Valuation Report";
  let description = "Your free professional property valuation";
  let address = "";
  let estimatedValue = "";

  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://monkfish-app-mb7h3.ondigitalocean.app";
    const res = await fetch(`${baseUrl}/api/report/${id}`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.report) {
        address =
          data.report.property?.address?.address || data.report.name || "";
        estimatedValue = data.report.valuation?.estimatedValue
          ? `$${sf(data.report.valuation.estimatedValue)}`
          : "";

        title = address ? `Valuation: ${address}` : "Property Valuation Report";
        description = estimatedValue
          ? `Estimated Value: ${estimatedValue} - Professional property analysis with comparables and market insights`
          : "Professional property valuation with market analysis, comparables, and investment metrics";
      }
    }
  } catch (e) {
    console.log("Metadata fetch error:", e);
  }

  // OG image URL - requires NEXT_PUBLIC_APP_URL to be set for proper social sharing
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const ogImageUrl = appUrl ? `${appUrl}/api/og/report?address=${encodeURIComponent(address)}&value=${encodeURIComponent(estimatedValue)}` : "";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function ReportPage({ params }: PageProps) {
  const { id } = await params;
  return <ReportView reportId={id} />;
}
