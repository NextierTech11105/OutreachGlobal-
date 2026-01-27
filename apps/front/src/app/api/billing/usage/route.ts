import { NextResponse } from "next/server";
import { getSubscriptionSummary } from "@/lib/billing";
import { getAuthUser } from "@/features/auth/auth.data";

export async function GET() {
  try {
    const { user } = await getAuthUser();

    if (!user) {
      // Return default usage for unauthenticated users instead of error
      return NextResponse.json({
        credits: 0,
        skipTraceCredits: 0,
        subscription: null,
        usage: null,
        features: {
          powerDialer: false,
          apiAccess: false,
          whiteLabel: false,
        },
      });
    }

    const summary = await getSubscriptionSummary(user.id);

    if (!summary) {
      // Return default usage instead of 404 error
      return NextResponse.json({
        credits: 2000, // Default free tier
        skipTraceCredits: 100,
        subscription: {
          plan: "Free Tier",
          status: "active",
        },
        usage: {
          sms: { used: 0, limit: 2000, remaining: 2000 },
          skipTraces: { used: 0, limit: 100, remaining: 100 },
        },
        features: {
          powerDialer: true,
          apiAccess: true,
          whiteLabel: false,
        },
      });
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error("[Billing] Get usage error:", error);
    // Return default values instead of 500 error
    return NextResponse.json({
      credits: 2000,
      skipTraceCredits: 100,
      subscription: { plan: "Free Tier", status: "active" },
      usage: null,
      features: { powerDialer: true, apiAccess: true, whiteLabel: false },
    });
  }
}
