import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ team: string }>;
}

export default async function Page({ params }: PageProps) {
  const { team } = await params;
  // Calendar is the main command center - redirect there
  redirect(`/t/${team}/calendar`);
}
