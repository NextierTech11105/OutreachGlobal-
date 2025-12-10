import { getAuthUser } from "@/features/auth/auth.data";
import Link from "next/link";
import { redirect } from "next/navigation";
import { InstantActionPanel } from "@/components/command-center/instant-action-panel";

export default async function Page() {
  const { team, user } = await getAuthUser();
  if (!user) {
    redirect("/auth/login");
  }
  if (team) {
    redirect(`/t/${team.slug}`);
  }

  return (
    <div className="flex min-h-[70vh] w-full flex-col gap-10 py-16 px-4 lg:px-8">
      <div className="max-w-3xl space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.5em] text-muted-foreground">
          Nextier
        </p>
        <h1 className="text-4xl font-semibold leading-tight text-white">
          Instant clarity for your CRM operations
        </h1>
        <p className="text-lg text-white/70">
          Push the actions that matter without scrolling through nested menus. Every interaction
          stays in dark mode, feels like a trading desk, and routes deep workflows (2K campaign
          blocks, research runs, routing) with one tap.
        </p>
        <Link
          href="/t/test"
          className="text-sm font-semibold uppercase tracking-[0.3em] text-primary underline-offset-4 transition hover:text-primary-foreground"
        >
          Go to dashboard
        </Link>
      </div>

      <InstantActionPanel />
    </div>
  );
}
