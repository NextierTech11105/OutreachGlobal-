/**
 * Airflow Metrics API Routes
 * Called by DAGs for logging and monitoring
 */

import { NextRequest, NextResponse } from "next/server";

interface MetricEntry {
  id: string;
  dag_id: string;
  run_id: string;
  execution_date: string;
  metrics: Record<string, any>;
  logged_at: string;
}

const metricsLog: MetricEntry[] = [];

// POST /api/airflow/metrics
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "log";
    const body = await request.json();

    switch (action) {
      case "log":
        return handleLog(body);
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[Airflow Metrics] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET /api/airflow/metrics
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const dagId = url.searchParams.get("dag_id");
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const sinceHours = parseInt(url.searchParams.get("since_hours") || "24");

    const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);

    let results = metricsLog.filter((m) => new Date(m.logged_at) >= since);

    if (dagId) {
      results = results.filter((m) => m.dag_id === dagId);
    }

    // Sort by logged_at descending
    results.sort(
      (a, b) =>
        new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime(),
    );

    // Aggregate stats by DAG
    const dagStats: Record<string, any> = {};
    results.forEach((m) => {
      if (!dagStats[m.dag_id]) {
        dagStats[m.dag_id] = {
          runs: 0,
          last_run: m.execution_date,
          total_processed: 0,
        };
      }
      dagStats[m.dag_id].runs++;
      if (m.metrics.leads_processed) {
        dagStats[m.dag_id].total_processed += m.metrics.leads_processed;
      }
      if (m.metrics.total_records) {
        dagStats[m.dag_id].total_processed += m.metrics.total_records;
      }
    });

    return NextResponse.json({
      metrics: results.slice(0, limit),
      dag_stats: dagStats,
      total_entries: results.length,
    });
  } catch (error) {
    console.error("[Airflow Metrics] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function handleLog(body: Record<string, any>) {
  const entry: MetricEntry = {
    id: `metric_${Date.now()}`,
    dag_id: body.dag_id || "unknown",
    run_id: body.run_id || "unknown",
    execution_date: body.execution_date || new Date().toISOString(),
    metrics: body,
    logged_at: new Date().toISOString(),
  };

  metricsLog.push(entry);

  // Keep only last 1000 entries
  if (metricsLog.length > 1000) {
    metricsLog.shift();
  }

  console.log(
    `[Airflow Metrics] Logged: ${entry.dag_id} - ${JSON.stringify(body)}`,
  );

  return NextResponse.json({
    success: true,
    entry_id: entry.id,
  });
}
