"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Activity, ArrowRightUp, Zap } from "lucide-react";

type EnrichmentUsage = {
  count?: number;
  remaining?: number;
  limit?: number;
};

type ActionDefinition = {
  id: "queue" | "research";
  title: string;
  description: string;
  status: string;
  Icon: typeof Zap | typeof Activity;
  buttonLabel: string;
  buttonVariant: ButtonProps["variant"];
};

const actionDefinitions: ActionDefinition[] = [
  {
    id: "queue",
    title: "Retrieve 2K Leads",
    description: "Push the latest internal roster in one click and auto-tag them for the active effort.",
    status: "Live",
    Icon: Zap,
    buttonLabel: "Queue 2K Leads",
    buttonVariant: "secondary",
  },
  {
    id: "research",
    title: "Run Full Detail",
    description: "Drop a phone number or lead ID to trigger enrichment + research intelligence in the background.",
    status: "Ready",
    Icon: Activity,
    buttonLabel: "Run Research Report",
    buttonVariant: "outline-solid",
  },
];

export function InstantActionPanel() {
  const [usage, setUsage] = useState<EnrichmentUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<string | null>(null);
  const [researchStatus, setResearchStatus] = useState<string | null>(null);
  const [isQueueing, setIsQueueing] = useState(false);
  const [isResearching, setIsResearching] = useState(false);

  const refreshUsage = useCallback(async () => {
    setUsageLoading(true);
    setUsageError(null);
    try {
      const res = await fetch("/api/enrichment/usage", { cache: "no-store" });
      if (!res.ok) {
        const payload = await res.text();
        throw new Error(payload || "Unable to load enrichment usage");
      }
      const data = (await res.json()) as EnrichmentUsage;
      setUsage(data);
    } catch (error) {
      setUsageError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setUsageLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUsage();
    const interval = setInterval(refreshUsage, 60_000);
    return () => clearInterval(interval);
  }, [refreshUsage]);

  const usagePercent = useMemo(() => {
    const limit = usage?.limit ?? 0;
    const processed = usage?.count ?? 0;
    return limit > 0 ? Math.min(100, Math.round((processed / limit) * 100)) : 0;
  }, [usage]);

  const metrics = useMemo(() => {
    if (!usage) {
      const placeholder = usageLoading ? "Loading..." : "—";
      return [
        { label: "Enrichments", value: placeholder, detail: "Processed today" },
        { label: "Remaining Quota", value: placeholder, detail: "Available now" },
        { label: "Utilization", value: placeholder, detail: "Of daily budget" },
      ];
    }

    const processed = usage.count ?? 0;
    const remaining = usage.remaining ?? 0;
    const limit = usage.limit ?? 0;
    const utilization = limit > 0 ? Math.min(100, Math.round((processed / limit) * 100)) : 0;

    return [
      {
        label: "Enrichments",
        value: processed.toLocaleString(),
        detail: limit ? `of ${limit.toLocaleString()} limit` : "count today",
      },
      {
        label: "Remaining Quota",
        value: remaining.toLocaleString(),
        detail: "today",
      },
      {
        label: "Utilization",
        value: `${utilization}%`,
        detail: limit ? "of daily budget" : "awaiting limit",
      },
    ];
  }, [usage, usageLoading]);

  const handleQueueLeads = async () => {
    setIsQueueing(true);
    setQueueStatus("Queueing 2K leads…");
    try {
      const res = await fetch("/api/buckets/upload-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: "decision-makers", limit: 2000 }),
      });
      if (!res.ok) {
        const payload = await res.text();
        throw new Error(payload || "Queue request failed");
      }
      const data = await res.json().catch(() => null);
      const message = data?.message || data?.status || "2K leads queued";
      setQueueStatus(message);
      refreshUsage();
    } catch (error) {
      setQueueStatus(`Queue failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsQueueing(false);
    }
  };

  const handleRunResearch = async () => {
    setIsResearching(true);
    setResearchStatus("Running research report…");
    try {
      const res = await fetch("/api/copilot/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "instant-action", scope: "lead", limit: 1 }),
      });
      if (!res.ok) {
        const payload = await res.text();
        throw new Error(payload || "Research request failed");
      }
      const data = await res.json().catch(() => null);
      const message = data?.message || data?.status || "Research queued";
      setResearchStatus(message);
      refreshUsage();
    } catch (error) {
      setResearchStatus(`Research failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsResearching(false);
    }
  };

  return (
    <section className="w-full max-w-5xl rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-950/80 to-slate-900/60 p-6 text-white shadow-[0_30px_120px_rgba(2,6,23,0.75)] backdrop-blur">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.5em] text-primary-foreground/70">
              Command Center
            </p>
            <h2 className="text-3xl font-semibold text-white">Push-button velocity</h2>
            <p className="max-w-2xl text-sm text-white/70">
              Every control is dark-mode ready, lightning fast, and tuned for revenue ops. Hit a
              button and see 2K leads, research, or routing updates react instantly.
            </p>
          </div>
          <Badge variant="outline" className="text-xs uppercase tracking-[0.3em]">
            Day Trading
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/30"
            >
              <p className="text-xs uppercase text-white/60">{metric.label}</p>
              <p className="text-3xl font-semibold text-white">{metric.value}</p>
              <p className="text-sm text-white/60">{metric.detail}</p>
            </div>
          ))}
        </div>

        {usageError && (
          <p className="text-xs text-destructive/80">
            Unable to refresh metrics: {usageError}
          </p>
        )}

        <div className="flex flex-col gap-4">
          {actionDefinitions.map((action) => {
            const isLoading = action.id === "queue" ? isQueueing : isResearching;
            const feedback = action.id === "queue" ? queueStatus : researchStatus;
            const handleClick = action.id === "queue" ? handleQueueLeads : handleRunResearch;

            return (
              <div
                key={action.id}
                className="rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900/80 to-slate-900/40 p-5 shadow-2xl shadow-black/30"
              >
                <div className="flex items-center justify-between gap-3 text-white">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <action.Icon className="h-5 w-5 text-secondary-foreground" />
                    {action.title}
                  </div>
                  <Badge variant="outline" className="text-[0.6rem] uppercase tracking-[0.3em]">
                    {action.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{action.description}</p>

                <p className="mt-3 text-xs text-white/60" role="status" aria-live="polite">
                  {feedback ?? "Idle and ready for launch"}
                </p>

                <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/70">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/60">
                    <span className="inline-flex h-1 w-10 rounded-full bg-slate-600" />
                    Instant Execution
                  </div>
                  <div className="flex flex-1 items-center gap-2">
                    <div className="h-1 w-full rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-secondary transition-all"
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    onClick={handleClick}
                    loading={isLoading}
                    variant={action.buttonVariant}
                    size="lg"
                    className="flex-1 justify-between rounded-2xl text-sm font-semibold tracking-wide"
                  >
                    <span>{action.buttonLabel}</span>
                    {action.id === "queue" && <ArrowRightUp className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
