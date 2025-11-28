import { getAuthUser } from "@/features/auth/auth.data";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Page() {
  const { team, user } = await getAuthUser();
  if (!user) {
    redirect("/auth/login");
  }
  if (team) {
    redirect(`/t/${team.slug}`);
  }

  return (
    <div>
      <div className="flex flex-col gap-y-2">
        <p>Nothing Here</p>

        <Link href="/t/test">Go To dashboard</Link>
      </div>
    </div>
  );
}
