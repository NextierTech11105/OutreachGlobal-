import { NextResponse } from "next/server";

// Simple 1x1 transparent PNG as favicon fallback
const TRANSPARENT_ICO = Buffer.from(
  "AAABAAEAAQEAAAEAGAAwAAAAFgAAACgAAAABAAAAAgAAAAEAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAAA=",
  "base64",
);

export async function GET() {
  return new NextResponse(TRANSPARENT_ICO, {
    headers: {
      "Content-Type": "image/x-icon",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
