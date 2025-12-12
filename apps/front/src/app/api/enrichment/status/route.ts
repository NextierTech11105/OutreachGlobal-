import { NextResponse } from "next/server";

const API_KEY =
  process.env.REALESTATE_API_KEY || process.env.REAL_ESTATE_API_KEY || "";

export async function GET() {
  const configured = !!API_KEY;

  return NextResponse.json({
    configured,
    usage: {
      searchesThisMonth: 0,
      enrichmentsThisMonth: 0,
    },
  });
}
