import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    gianna: 0,
    cathy: 0,
    sabrina: 0,
    unassigned: 0,
  });
}
