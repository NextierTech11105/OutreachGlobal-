import { notFound } from "next/navigation";
import { Metadata } from "next";
import { LandingPageRenderer } from "@/components/landing/landing-page-renderer";

/**
 * PUBLIC LANDING PAGE ROUTE
 * ═══════════════════════════════════════════════════════════════════════════════
 * Serves published landing pages at /p/[slug]
 *
 * These are client-created landing pages from the Content Library
 * with full customization, branding, and conversion tracking.
 *
 * Mental Model for Visitors:
 * 1. ATTENTION - Hook them in first 3 seconds (headline, visual)
 * 2. INTEREST - What's in it for them? (benefits, social proof)
 * 3. DESIRE - Make them want it (urgency, scarcity, FOMO)
 * 4. ACTION - Clear, compelling CTA (one primary action)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

async function getLandingPage(slug: string, preview?: boolean) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/landing-pages?slug=${slug}`, {
      cache: preview ? "no-store" : "force-cache",
      next: { revalidate: preview ? 0 : 60 },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.page;
  } catch (error) {
    console.error("Failed to fetch landing page:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getLandingPage(slug);

  if (!page) {
    return {
      title: "Page Not Found",
    };
  }

  return {
    title: page.seo?.metaTitle || page.title,
    description: page.seo?.metaDescription || page.description,
    openGraph: {
      title: page.seo?.metaTitle || page.title,
      description: page.seo?.metaDescription || page.description,
      images: page.seo?.ogImage ? [page.seo.ogImage] : [],
    },
  };
}

export default async function PublicLandingPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === "true";

  const page = await getLandingPage(slug, isPreview);

  if (!page) {
    notFound();
  }

  // If page is draft and not preview mode, show 404
  if (page.status === "draft" && !isPreview) {
    notFound();
  }

  return (
    <>
      {/* Preview banner */}
      {isPreview && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-black text-center py-2 text-sm font-medium">
          Preview Mode - This page is not published yet
        </div>
      )}

      {/* Render the landing page */}
      <LandingPageRenderer page={page} />
    </>
  );
}
