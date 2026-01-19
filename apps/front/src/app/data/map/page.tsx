"use client";

import { useState, useEffect } from "react";
import {
  Database,
  ArrowRight,
  Phone,
  CheckCircle2,
  Send,
  Layers,
  Target,
  Zap,
  RefreshCw,
} from "lucide-react";

interface DataMapState {
  pipeline: {
    stages: Array<{
      name: string;
      desc: string;
      count: number;
      status: string;
    }>;
  };
  blocks: {
    current: number;
    size: number;
    ready: number;
    nextBlockIn: number;
  };
  campaign: {
    goal: number;
    current: number;
    remaining: number;
    percentComplete: number;
  };
  gradeDistribution: Record<string, number>;
}

const STAGES = [
  { key: "RAW", name: "Data Lake", icon: Database, color: "bg-zinc-600" },
  { key: "TRACED", name: "Tracerfy", icon: Phone, color: "bg-blue-600" },
  { key: "SCORED", name: "Trestle", icon: Target, color: "bg-purple-600" },
  { key: "READY", name: "Campaign Ready", icon: CheckCircle2, color: "bg-emerald-600" },
  { key: "CAMPAIGN", name: "SignalHouse", icon: Send, color: "bg-orange-500" },
];

export default function DataMapPage() {
  const [data, setData] = useState<DataMapState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDataMap();
  }, []);

  const fetchDataMap = async () => {
    try {
      const res = await fetch("/api/luci/datamap");
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      // Mock data for display
      setData({
        pipeline: {
          stages: [
            { name: "RAW", desc: "Data Lake", count: 45000, status: "active" },
            { name: "TRACED", desc: "Tracerfy", count: 32000, status: "active" },
            { name: "SCORED", desc: "Trestle", count: 28000, status: "active" },
            { name: "READY", desc: "Campaign Ready", count: 18500, status: "active" },
          ],
        },
        blocks: {
          current: 9,
          size: 2000,
          ready: 18500,
          nextBlockIn: 500,
        },
        campaign: {
          goal: 20000,
          current: 18500,
          remaining: 1500,
          percentComplete: 92,
        },
        gradeDistribution: { A: 8200, B: 10300, C: 5500, D: 2800, F: 1200 },
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Layers className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Data Map</h1>
                <p className="text-zinc-400">LUCI Engine Pipeline</p>
              </div>
            </div>
            <button
              onClick={fetchDataMap}
              className="flex items-center gap-2 px-4 py-2 border border-zinc-700 rounded-lg hover:bg-zinc-800"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Pipeline Flow */}
        <div className="bg-zinc-900 rounded-xl p-8 mb-8 border border-zinc-800">
          <h2 className="text-lg font-bold mb-6">Pipeline Flow</h2>

          <div className="flex items-center justify-between">
            {STAGES.map((stage, idx) => {
              const stageData = data.pipeline.stages.find((s) => s.name === stage.key);
              const Icon = stage.icon;

              return (
                <div key={stage.key} className="flex items-center">
                  <div className="text-center">
                    <div
                      className={`w-16 h-16 ${stage.color} rounded-xl flex items-center justify-center mx-auto mb-3`}
                    >
                      <Icon className="w-8 h-8" />
                    </div>
                    <p className="font-bold">{stage.name}</p>
                    <p className="text-2xl font-mono mt-1">
                      {stageData ? stageData.count.toLocaleString() : "-"}
                    </p>
                  </div>
                  {idx < STAGES.length - 1 && (
                    <ArrowRight className="w-8 h-8 mx-6 text-zinc-600" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Blocks & Campaign Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Campaign Blocks */}
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <div className="flex items-center gap-2 mb-6">
              <Zap className="w-5 h-5" />
              <h3 className="text-lg font-bold">Campaign Blocks</h3>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-zinc-800 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold">{data.blocks.current}</p>
                <p className="text-sm text-zinc-400">Blocks Filled</p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold">{data.blocks.size.toLocaleString()}</p>
                <p className="text-sm text-zinc-400">Block Size</p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-emerald-500">
                  {data.blocks.ready.toLocaleString()}
                </p>
                <p className="text-sm text-zinc-400">Ready</p>
              </div>
            </div>

            {/* Next block progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Next Block</span>
                <span>
                  {data.blocks.size - data.blocks.nextBlockIn} / {data.blocks.size}
                </span>
              </div>
              <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{
                    width: `${((data.blocks.size - data.blocks.nextBlockIn) / data.blocks.size) * 100}%`,
                  }}
                />
              </div>
              <p className="text-sm text-zinc-400 mt-2">
                {data.blocks.nextBlockIn.toLocaleString()} more leads to trigger next campaign
              </p>
            </div>

            {/* Block visualization */}
            <div className="mt-6 pt-4 border-t border-zinc-800">
              <p className="text-sm text-zinc-400 mb-3">Block Status</p>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold ${
                      i < data.blocks.current
                        ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500"
                        : i === data.blocks.current
                          ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500 animate-pulse"
                          : "bg-zinc-800 text-zinc-600"
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Campaign Goal */}
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <div className="flex items-center gap-2 mb-6">
              <Target className="w-5 h-5" />
              <h3 className="text-lg font-bold">Campaign Goal</h3>
            </div>

            <div className="text-center mb-6">
              <p className="text-6xl font-bold">{data.campaign.percentComplete}%</p>
              <p className="text-zinc-400 mt-2">
                {data.campaign.current.toLocaleString()} / {data.campaign.goal.toLocaleString()}
              </p>
            </div>

            {/* Progress bar */}
            <div className="h-6 bg-zinc-800 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all"
                style={{ width: `${data.campaign.percentComplete}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{data.campaign.remaining.toLocaleString()}</p>
                <p className="text-sm text-zinc-400">Remaining</p>
              </div>
              <div>
                <p className="text-2xl font-bold">2,000</p>
                <p className="text-sm text-zinc-400">Daily Max</p>
              </div>
            </div>
          </div>
        </div>

        {/* Grade Distribution */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <h3 className="text-lg font-bold mb-6">Trestle Grade Distribution</h3>

          <div className="grid grid-cols-5 gap-4">
            {Object.entries(data.gradeDistribution).map(([grade, count]) => {
              const colors: Record<string, string> = {
                A: "bg-emerald-500",
                B: "bg-green-500",
                C: "bg-yellow-500",
                D: "bg-orange-500",
                F: "bg-red-500",
              };
              const total = Object.values(data.gradeDistribution).reduce((a, b) => a + b, 0);
              const percent = Math.round((count / total) * 100);

              return (
                <div key={grade} className="text-center">
                  <div
                    className={`w-16 h-16 ${colors[grade]} rounded-xl flex items-center justify-center mx-auto mb-3`}
                  >
                    <span className="text-2xl font-bold text-white">{grade}</span>
                  </div>
                  <p className="text-xl font-bold">{count.toLocaleString()}</p>
                  <p className="text-sm text-zinc-400">{percent}%</p>
                </div>
              );
            })}
          </div>

          {/* Bar chart */}
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <div className="flex h-32 items-end gap-2">
              {Object.entries(data.gradeDistribution).map(([grade, count]) => {
                const colors: Record<string, string> = {
                  A: "bg-emerald-500",
                  B: "bg-green-500",
                  C: "bg-yellow-500",
                  D: "bg-orange-500",
                  F: "bg-red-500",
                };
                const maxCount = Math.max(...Object.values(data.gradeDistribution));
                const height = (count / maxCount) * 100;

                return (
                  <div key={grade} className="flex-1 flex flex-col items-center">
                    <div
                      className={`w-full ${colors[grade]} rounded-t-lg transition-all`}
                      style={{ height: `${height}%` }}
                    />
                    <span className="mt-2 text-sm font-bold">{grade}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pipeline Rules */}
        <div className="mt-8 bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
          <h3 className="font-bold mb-4">Pipeline Rules</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="text-zinc-400 mb-2">Ready Criteria</p>
              <code className="text-emerald-400">
                grade IN (A, B) AND activity_score &gt;= 70
              </code>
            </div>
            <div>
              <p className="text-zinc-400 mb-2">Block Trigger</p>
              <code className="text-yellow-400">
                ready_count &gt;= block_size (2,000 max/day)
              </code>
            </div>
            <div>
              <p className="text-zinc-400 mb-2">Lead ID Format</p>
              <code className="text-blue-400">NXT-{"{sic_code}"}-{"{uuid6}"}</code>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
