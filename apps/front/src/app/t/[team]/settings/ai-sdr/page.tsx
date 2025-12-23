import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ team: string }>;
}

export default async function Page({ params }: PageProps) {
  const { team } = await params;
  // Redirect to the actual ai-sdr page location
  redirect(`/t/${team}/ai-sdr`);
}
