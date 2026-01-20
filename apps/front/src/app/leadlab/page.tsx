"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  Phone,
  Send,
  Filter,
  RefreshCw,
  ChevronDown,
  Sparkles,
  Target,
  Users,
  X,
  Loader2,
} from "lucide-react";

interface Lead {
  id: string;
  leadId: string | null;
  name: string;
  company: string | null;
  phone: string | null;
  phoneGrade: string | null;
  contactScore: number | null;
  smsReady: boolean;
  priorityTier: number;
  status: string;
}

interface LeadLabData {
  leads: Lead[];
  total: number;
  stats: {
    gradeA: number;
    gradeB: number;
    gradeC: number;
    smsReady: number;
  };
}

interface EnrichmentJob {
  jobId: string;
  status: "pending" | "tracing" | "scoring" | "completed" | "failed";
  total: number;
  traced: number;
  scored: number;
  smsReady: number;
  error?: string | null;
}

const gradeColors: Record<string, { bg: string; text: string }> = {
  A: { bg: "bg-emerald-500/20", text: "text-emerald-500" },
  B: { bg: "bg-green-500/20", text: "text-green-500" },
  C: { bg: "bg-yellow-500/20", text: "text-yellow-500" },
  D: { bg: "bg-orange-500/20", text: "text-orange-500" },
  F: { bg: "bg-red-500/20", text: "text-red-500" },
};

const tierLabels: Record<number, string> = {
  1: "Tier 1 - Best",
  2: "Tier 2 - Great",
  3: "Tier 3 - Good",
  4: "Tier 4",
  5: "Tier 5",
  6: "Tier 6",
};

export default function LeadLabPage() {
  const [data, setData] = useState<LeadLabData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "A" | "B" | "C">("all");
  const [pushing, setPushing] = useState(false);

  // Enrichment state
  const [enrichDropdownOpen, setEnrichDropdownOpen] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichmentJob, setEnrichmentJob] = useState<EnrichmentJob | null>(
    null,
  );
  const [showEnrichModal, setShowEnrichModal] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, [filter]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("minGrade", filter);
      params.set("limit", "100");

      const res = await fetch(`/api/luci/leadlab?${params}`);
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      // Mock data
      setData({
        leads: [
          {
            id: "1",
            leadId: "NXT-1711-a3f9b2",
            name: "John Smith",
            company: "ABC Plumbing",
            phone: "5125550100",
            phoneGrade: "A",
            contactScore: 95,
            smsReady: true,
            priorityTier: 1,
            status: "scored",
          },
          {
            id: "2",
            leadId: "NXT-1711-b4e8c1",
            name: "Jane Doe",
            company: "XYZ Services",
            phone: "5125550101",
            phoneGrade: "A",
            contactScore: 88,
            smsReady: true,
            priorityTier: 2,
            status: "scored",
          },
          {
            id: "3",
            leadId: "NXT-1711-c7d2a9",
            name: "Bob Wilson",
            company: "Wilson HVAC",
            phone: "5125550102",
            phoneGrade: "B",
            contactScore: 82,
            smsReady: true,
            priorityTier: 3,
            status: "scored",
          },
          {
            id: "4",
            leadId: "NXT-1711-d1f3b8",
            name: "Mary Johnson",
            company: "Johnson Heating",
            phone: "5125550103",
            phoneGrade: "B",
            contactScore: 75,
            smsReady: true,
            priorityTier: 3,
            status: "scored",
          },
          {
            id: "5",
            leadId: "NXT-1711-e5g4c7",
            name: "Tom Brown",
            company: "Brown Cooling",
            phone: "5125550104",
            phoneGrade: "A",
            contactScore: 65,
            smsReady: false,
            priorityTier: 4,
            status: "scored",
          },
        ],
        total: 5,
        stats: { gradeA: 3, gradeB: 2, gradeC: 0, smsReady: 4 },
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (!data) return;
    if (selectedIds.size === data.leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.leads.map((l) => l.id)));
    }
  };

  const selectByTier = (maxTier: number) => {
    if (!data) return;
    const ids = data.leads
      .filter((l) => l.priorityTier <= maxTier)
      .map((l) => l.id);
    setSelectedIds(new Set(ids));
  };

  const pushToCampaign = async () => {
    if (selectedIds.size === 0) return;

    setPushing(true);
    try {
      const res = await fetch("/api/luci/leadlab/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: Array.from(selectedIds),
          campaignId: "default", // TODO: Campaign selector
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert(`Pushed ${json.data.pushed} leads to campaign`);
        setSelectedIds(new Set());
        fetchLeads();
      }
    } catch (err) {
      alert("Failed to push leads");
    } finally {
      setPushing(false);
    }
  };

  // Start enrichment for selected leads
  const startEnrichment = async (mode: "full" | "score_only") => {
    if (selectedIds.size === 0) return;
    setEnrichDropdownOpen(false);
    setEnriching(true);
    setShowEnrichModal(true);

    try {
      const res = await fetch("/api/luci/enrich-selected", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: Array.from(selectedIds),
          mode,
        }),
      });

      const json = await res.json();
      if (json.success && json.data?.jobId) {
        setEnrichmentJob({
          jobId: json.data.jobId,
          status: "pending",
          total: selectedIds.size,
          traced: 0,
          scored: 0,
          smsReady: 0,
        });
        // Start polling
        pollJobStatus(json.data.jobId);
      } else {
        setEnrichmentJob({
          jobId: "",
          status: "failed",
          total: selectedIds.size,
          traced: 0,
          scored: 0,
          smsReady: 0,
          error: json.error || "Failed to start enrichment",
        });
      }
    } catch (err) {
      setEnrichmentJob({
        jobId: "",
        status: "failed",
        total: selectedIds.size,
        traced: 0,
        scored: 0,
        smsReady: 0,
        error: "Network error",
      });
    } finally {
      setEnriching(false);
    }
  };

  // Poll job status
  const pollJobStatus = useCallback(async (jobId: string) => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/luci/enrich-selected?jobId=${jobId}`);
        const json = await res.json();

        if (json.success && json.data) {
          const job = json.data;
          setEnrichmentJob({
            jobId: job.jobId,
            status: job.status,
            total: job.total,
            traced: job.traced,
            scored: job.scored,
            smsReady: job.smsReady,
            error: job.error,
          });

          // Continue polling if not complete
          if (job.status !== "completed" && job.status !== "failed") {
            setTimeout(poll, 2000);
          } else if (job.status === "completed") {
            // Refresh leads on completion
            fetchLeads();
            setSelectedIds(new Set());
          }
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    };

    poll();
  }, []);

  // Close enrichment modal
  const closeEnrichModal = () => {
    setShowEnrichModal(false);
    if (
      enrichmentJob?.status === "completed" ||
      enrichmentJob?.status === "failed"
    ) {
      setEnrichmentJob(null);
    }
  };

  // Calculate enrichment cost
  const getEnrichmentCost = (mode: "full" | "score_only") => {
    const count = selectedIds.size;
    if (mode === "full") {
      return (count * 0.05).toFixed(2); // $0.02 Tracerfy + $0.03 Trestle
    }
    return (count * 0.03).toFixed(2); // $0.03 Trestle only
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
      <header className="border-b border-zinc-800 sticky top-0 bg-black z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Lead Lab</h1>
                <p className="text-zinc-400">
                  {data.total} leads • Highest scored mobiles first
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Filter */}
              <div className="relative">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as typeof filter)}
                  className="appearance-none bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:border-white"
                >
                  <option value="all">All Grades</option>
                  <option value="A">Grade A Only</option>
                  <option value="B">Grade A & B</option>
                  <option value="C">Grade A, B & C</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              </div>

              {/* Refresh */}
              <button
                onClick={fetchLeads}
                className="p-2 border border-zinc-700 rounded-lg hover:bg-zinc-800"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <span className="font-bold text-emerald-500">A</span>
              </div>
              <span className="text-zinc-400">Grade A</span>
            </div>
            <p className="text-2xl font-bold">{data.stats.gradeA}</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <span className="font-bold text-green-500">B</span>
              </div>
              <span className="text-zinc-400">Grade B</span>
            </div>
            <p className="text-2xl font-bold">{data.stats.gradeB}</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-5 h-5 text-blue-500" />
              <span className="text-zinc-400">SMS Ready</span>
            </div>
            <p className="text-2xl font-bold">{data.stats.smsReady}</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-white" />
              <span className="text-zinc-400">Selected</span>
            </div>
            <p className="text-2xl font-bold">{selectedIds.size}</p>
          </div>
        </div>

        {/* Selection Actions */}
        <div className="bg-zinc-900 rounded-xl p-4 mb-6 border border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-zinc-400">Quick Select:</span>
            <button
              onClick={() => selectByTier(1)}
              className="px-3 py-1 bg-emerald-500/20 text-emerald-500 rounded-lg text-sm hover:bg-emerald-500/30"
            >
              Tier 1
            </button>
            <button
              onClick={() => selectByTier(2)}
              className="px-3 py-1 bg-green-500/20 text-green-500 rounded-lg text-sm hover:bg-green-500/30"
            >
              Tier 1-2
            </button>
            <button
              onClick={() => selectByTier(3)}
              className="px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded-lg text-sm hover:bg-yellow-500/30"
            >
              Tier 1-3
            </button>
            <button
              onClick={selectAll}
              className="px-3 py-1 border border-zinc-700 rounded-lg text-sm hover:bg-zinc-800"
            >
              {selectedIds.size === data.leads.length
                ? "Deselect All"
                : "Select All"}
            </button>
          </div>

          {/* Enrich Dropdown */}
          <div className="relative">
            <button
              onClick={() => setEnrichDropdownOpen(!enrichDropdownOpen)}
              disabled={selectedIds.size === 0 || enriching}
              className="flex items-center gap-2 px-4 py-2 border border-zinc-700 rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4 text-yellow-500" />
              Enrich
              <ChevronDown className="w-4 h-4" />
            </button>

            {enrichDropdownOpen && selectedIds.size > 0 && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-20">
                <div className="p-2">
                  <button
                    onClick={() => startEnrichment("full")}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Skip Trace + Score</span>
                      <span className="text-emerald-500 text-sm">
                        ${getEnrichmentCost("full")}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      Tracerfy + Trestle Real Contact
                    </p>
                  </button>
                  <button
                    onClick={() => startEnrichment("score_only")}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors mt-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Score Only</span>
                      <span className="text-emerald-500 text-sm">
                        ${getEnrichmentCost("score_only")}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      Trestle Real Contact only
                    </p>
                  </button>
                </div>
                <div className="border-t border-zinc-800 px-3 py-2 text-xs text-zinc-500">
                  {selectedIds.size} leads selected
                </div>
              </div>
            )}
          </div>

          <button
            onClick={pushToCampaign}
            disabled={selectedIds.size === 0 || pushing}
            className="flex items-center gap-2 px-6 py-2 bg-white text-black rounded-lg font-bold hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pushing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Push to Campaign ({selectedIds.size})
          </button>
        </div>

        {/* Leads Table */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.size === data.leads.length &&
                      data.leads.length > 0
                    }
                    onChange={selectAll}
                    className="w-4 h-4 rounded"
                  />
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">
                  Tier
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">
                  Lead ID
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">
                  Company
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">
                  Phone
                </th>
                <th className="text-center px-4 py-3 text-sm font-medium text-zinc-400">
                  Grade
                </th>
                <th className="text-center px-4 py-3 text-sm font-medium text-zinc-400">
                  Score
                </th>
                <th className="text-center px-4 py-3 text-sm font-medium text-zinc-400">
                  SMS
                </th>
              </tr>
            </thead>
            <tbody>
              {data.leads.map((lead) => {
                const isSelected = selectedIds.has(lead.id);
                const grade = lead.phoneGrade || "F";
                const colors = gradeColors[grade] || gradeColors.F;

                return (
                  <tr
                    key={lead.id}
                    onClick={() => toggleSelect(lead.id)}
                    className={`border-b border-zinc-800/50 cursor-pointer transition-colors ${
                      isSelected ? "bg-white/5" : "hover:bg-zinc-800/30"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(lead.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          lead.priorityTier <= 2
                            ? "bg-emerald-500/20 text-emerald-500"
                            : lead.priorityTier === 3
                              ? "bg-green-500/20 text-green-500"
                              : "bg-zinc-700 text-zinc-400"
                        }`}
                      >
                        {lead.priorityTier}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-zinc-400">
                      {lead.leadId || "-"}
                    </td>
                    <td className="px-4 py-3 font-medium">{lead.name}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {lead.company || "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">
                      {lead.phone || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex w-8 h-8 items-center justify-center rounded-lg font-bold ${colors.bg} ${colors.text}`}
                      >
                        {grade}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono">
                      {lead.contactScore ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {lead.smsReady ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {data.leads.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              No leads found. Import data to get started.
            </div>
          )}
        </div>

        {/* Priority Legend */}
        <div className="mt-6 bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
          <p className="text-sm text-zinc-400 mb-3">
            Priority Tiers (Highest Scored Mobiles First)
          </p>
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-emerald-500/20 text-emerald-500 rounded text-xs font-medium">
                1
              </span>
              <span>Grade A, Score 90+</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-emerald-500/20 text-emerald-500 rounded text-xs font-medium">
                2
              </span>
              <span>Grade A, Score 70+</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-green-500/20 text-green-500 rounded text-xs font-medium">
                3
              </span>
              <span>Grade B, Score 70+</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-zinc-700 text-zinc-400 rounded text-xs font-medium">
                4+
              </span>
              <span>Other qualified leads</span>
            </div>
          </div>
        </div>
      </main>

      {/* Enrichment Progress Modal */}
      {showEnrichModal && enrichmentJob && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                <h3 className="font-bold">Enrichment Progress</h3>
              </div>
              {(enrichmentJob.status === "completed" ||
                enrichmentJob.status === "failed") && (
                <button
                  type="button"
                  onClick={closeEnrichModal}
                  className="p-1 hover:bg-zinc-800 rounded"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Status */}
              <div className="text-center mb-6">
                {enrichmentJob.status === "pending" && (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
                    <span className="text-lg">Starting enrichment...</span>
                  </div>
                )}
                {enrichmentJob.status === "tracing" && (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    <span className="text-lg">
                      Skip tracing via Tracerfy...
                    </span>
                  </div>
                )}
                {enrichmentJob.status === "scoring" && (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                    <span className="text-lg">Scoring with Trestle...</span>
                  </div>
                )}
                {enrichmentJob.status === "completed" && (
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    <span className="text-lg text-emerald-500">
                      Enrichment Complete!
                    </span>
                  </div>
                )}
                {enrichmentJob.status === "failed" && (
                  <div className="flex items-center justify-center gap-2">
                    <X className="w-6 h-6 text-red-500" />
                    <span className="text-lg text-red-500">
                      Enrichment Failed
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Stats */}
              <div className="space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-400">Progress</span>
                    <span>
                      {enrichmentJob.scored}/{enrichmentJob.total}
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{
                        width: `${(enrichmentJob.scored / enrichmentJob.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{enrichmentJob.traced}</p>
                    <p className="text-xs text-zinc-500">Traced</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{enrichmentJob.scored}</p>
                    <p className="text-xs text-zinc-500">Scored</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-500">
                      {enrichmentJob.smsReady}
                    </p>
                    <p className="text-xs text-zinc-500">SMS Ready</p>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {enrichmentJob.error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-500">{enrichmentJob.error}</p>
                </div>
              )}

              {/* Close Button */}
              {(enrichmentJob.status === "completed" ||
                enrichmentJob.status === "failed") && (
                <button
                  type="button"
                  onClick={closeEnrichModal}
                  className="w-full mt-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {enrichDropdownOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setEnrichDropdownOpen(false)}
        />
      )}
    </div>
  );
}
