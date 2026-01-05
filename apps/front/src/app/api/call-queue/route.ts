/**
 * /api/call-queue - Canonical Call Queue API
 *
 * Proxies to /api/call-center/queue for backwards compatibility.
 * This is the P0 audit-required endpoint path.
 */

import { NextRequest } from "next/server";
import { GET as queueGet, POST as queuePost, DELETE as queueDelete } from "../call-center/queue/route";

export async function GET(request: NextRequest) {
  return queueGet(request);
}

export async function POST(request: NextRequest) {
  return queuePost(request);
}

export async function DELETE(request: NextRequest) {
  return queueDelete(request);
}
