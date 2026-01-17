/**
 * AI Health Check Endpoint
 *
 * Returns the status of all AI provider circuit breakers
 * Used for monitoring and observability
 */

import { NextResponse } from "next/server";
import { CircuitBreaker, CircuitState } from "@/lib/ai/circuit-breaker";

export async function GET() {
  try {
    const stats = CircuitBreaker.getAllStats();

    // Check if any circuit is open (unhealthy)
    const allHealthy = Object.values(stats).every(
      (s) => s.state !== CircuitState.OPEN
    );

    return NextResponse.json({
      healthy: allHealthy,
      timestamp: new Date().toISOString(),
      circuits: stats,
      summary: {
        total: Object.keys(stats).length,
        open: Object.values(stats).filter((s) => s.state === CircuitState.OPEN).length,
        halfOpen: Object.values(stats).filter((s) => s.state === CircuitState.HALF_OPEN).length,
        closed: Object.values(stats).filter((s) => s.state === CircuitState.CLOSED).length,
      },
    }, { status: allHealthy ? 200 : 503 });
  } catch (error) {
    return NextResponse.json(
      {
        healthy: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
