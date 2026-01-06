import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ plan?: string }>;
}

export default async function SignupPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const planParam = params.plan ? `?plan=${params.plan}` : "";

  // Redirect to auth with plan preserved
  redirect(`/auth${planParam}`);
}
