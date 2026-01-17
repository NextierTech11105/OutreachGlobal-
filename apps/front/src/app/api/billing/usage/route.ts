import { NextResponse } from "next/server";
import { getSubscriptionSummary } from "@/lib/billing";
import { getAuthUser } from "@/features/auth/auth.data";

export async function GET() {
  try {
    const { user } = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const summary = await getSubscriptionSummary(user.id);

    if (!summary) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error("[Billing] Get usage error:", error);
    return NextResponse.json(
      { error: "Failed to get usage data" },
      { status: 500 }
    );
  }
}
