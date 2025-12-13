"use client";

import { useState, useEffect } from "react";

interface Lead {
  id: string;
  ownerName: string;
  propertyAddress: string;
  city: string;
  state: string;
  caseNumber: string;
  filedDate: string;
  estimatedValue: number | null;
  estimatedEquity: number | null;
  priority: "hot" | "warm" | "cold";
  tags: string[];
  phones: { number: string; type: string }[];
  emails: string[];
  skipTraced: boolean;
  campaignReady: boolean;
  status: string;
}

const PRIORITY_COLORS = {
  hot: { bg: "#dc2626", label: "HOT" },
  warm: { bg: "#f59e0b", label: "WARM" },
  cold: { bg: "#6b7280", label: "COLD" },
};

const TAG_COLORS: Record<string, string> = {
  lis_pendens: "#8b5cf6",
  high_equity: "#10b981",
  absentee_owner: "#3b82f6",
  pre_foreclosure_confirmed: "#ef4444",
  fresh_filing: "#f59e0b",
  high_value: "#ec4899",
  enriched: "#06b6d4",
  vacant: "#f97316",
};

export default function Home() {
  const [view, setView] = useState<"import" | "list">("import");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [batches, setBatches] = useState<string[]>([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState({ priority: "", tag: "", skipTraced: "" });

  // Load batch data
  useEffect(() => {
    if (selectedBatch) {
      loadBatch(selectedBatch);
    }
  }, [selectedBatch]);

  const loadBatch = async (batch: string) => {
    try {
      const res = await fetch(`/api/batch?name=${batch}`);
      const data = await res.json();
      setLeads(data.leads || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("enrich", "true");

    try {
      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = await res.json();
      setResult(data);
      if (data.batchName) {
        setBatches(prev => [...new Set([data.batchName, ...prev])]);
        setSelectedBatch(data.batchName);
        setView("list");
      }
    } catch (err: any) {
      setResult({ error: err.message });
    }
    setLoading(false);
  };

  const handleExport = (type: "agent-hq" | "zoho") => {
    if (!selectedBatch) return;
    window.open(`/api/export/${type}?batch=${selectedBatch}`, "_blank");
  };

  const updateLeadTag = async (leadId: string, tag: string, add: boolean) => {
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        const tags = add
          ? [...new Set([...l.tags, tag])]
          : l.tags.filter(t => t !== tag);
        return { ...l, tags };
      }
      return l;
    }));
    // Save to backend
    await fetch("/api/lead/tag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batch: selectedBatch, leadId, tag, add }),
    });
  };

  const updateLeadPriority = async (leadId: string, priority: "hot" | "warm" | "cold") => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, priority } : l));
    await fetch("/api/lead/priority", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batch: selectedBatch, leadId, priority }),
    });
  };

  // Filter leads
  const filteredLeads = leads.filter(l => {
    if (filter.priority && l.priority !== filter.priority) return false;
    if (filter.tag && !l.tags.includes(filter.tag)) return false;
    if (filter.skipTraced === "yes" && !l.skipTraced) return false;
    if (filter.skipTraced === "no" && l.skipTraced) return false;
    return true;
  });

  // Stats
  const stats = {
    total: leads.length,
    hot: leads.filter(l => l.priority === "hot").length,
    warm: leads.filter(l => l.priority === "warm").length,
    cold: leads.filter(l => l.priority === "cold").length,
    skipTraced: leads.filter(l => l.skipTraced).length,
    campaignReady: leads.filter(l => l.campaignReady).length,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a" }}>
      {/* Header */}
      <header style={{
        padding: "16px 40px",
        borderBottom: "1px solid #27272a",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <h1 style={{
          fontSize: "1.5rem",
          background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>
          FDAILY Pro
        </h1>
        <div>
          <button onClick={() => setView("import")} style={navBtn(view === "import")}>Import</button>
          <button onClick={() => setView("list")} style={navBtn(view === "list")}>Leads</button>
        </div>
      </header>

      <main style={{ padding: "24px 40px", maxWidth: "1400px", margin: "0 auto" }}>
        {view === "import" ? (
          /* IMPORT VIEW */
          <div style={{ maxWidth: "600px" }}>
            <div style={cardStyle}>
              <h2 style={stepStyle}>Import FDAILY CSV</h2>
              <p style={{ color: "#888", marginBottom: "16px" }}>
                Upload ForeclosuresDaily export. Auto-enriches with RealEstateAPI.
              </p>
              <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} style={inputStyle} />
              <button onClick={handleImport} disabled={!file || loading} style={{ ...buttonStyle, opacity: !file || loading ? 0.5 : 1 }}>
                {loading ? "Processing..." : "Import & Enrich"}
              </button>
              {result && <pre style={resultStyle}>{JSON.stringify(result, null, 2)}</pre>}
            </div>

            <div style={cardStyle}>
              <h2 style={stepStyle}>Import Skip Traced Data</h2>
              <SkipTraceImport
                originalBatch={selectedBatch}
                onComplete={(data) => {
                  setResult(data);
                  if (data.batchName) {
                    setBatches(prev => [...new Set([data.batchName, ...prev])]);
                    setSelectedBatch(data.batchName);
                  }
                  loadBatch(selectedBatch);
                }}
              />
            </div>

            <div style={cardStyle}>
              <h2 style={stepStyle}>API Status</h2>
              <StatusCheck />
            </div>
          </div>
        ) : (
          /* LIST VIEW */
          <div>
            {/* Batch Selector + Stats */}
            <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
              <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)} style={{ ...selectStyle, width: "300px" }}>
                <option value="">Select batch...</option>
                {batches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <div style={statBox}><span style={statNum}>{stats.total}</span> Total</div>
              <div style={{ ...statBox, borderColor: "#dc2626" }}><span style={{ ...statNum, color: "#dc2626" }}>{stats.hot}</span> Hot</div>
              <div style={{ ...statBox, borderColor: "#f59e0b" }}><span style={{ ...statNum, color: "#f59e0b" }}>{stats.warm}</span> Warm</div>
              <div style={{ ...statBox, borderColor: "#10b981" }}><span style={{ ...statNum, color: "#10b981" }}>{stats.skipTraced}</span> Skip Traced</div>
              <div style={{ ...statBox, borderColor: "#3b82f6" }}><span style={{ ...statNum, color: "#3b82f6" }}>{stats.campaignReady}</span> Ready</div>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
              <select value={filter.priority} onChange={(e) => setFilter(f => ({ ...f, priority: e.target.value }))} style={filterSelect}>
                <option value="">All Priority</option>
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
              </select>
              <select value={filter.skipTraced} onChange={(e) => setFilter(f => ({ ...f, skipTraced: e.target.value }))} style={filterSelect}>
                <option value="">All Status</option>
                <option value="yes">Skip Traced</option>
                <option value="no">Not Skip Traced</option>
              </select>
              <select value={filter.tag} onChange={(e) => setFilter(f => ({ ...f, tag: e.target.value }))} style={filterSelect}>
                <option value="">All Tags</option>
                {Object.keys(TAG_COLORS).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div style={{ flex: 1 }} />
              <button onClick={() => handleExport("agent-hq")} disabled={!selectedBatch} style={{ ...buttonStyle, background: "#059669" }}>
                Export Agent HQ
              </button>
              <button onClick={() => handleExport("zoho")} disabled={!selectedBatch} style={{ ...buttonStyle, background: "#dc2626" }}>
                Export Zoho CSV
              </button>
            </div>

            {/* Lead List */}
            <div style={{ background: "#18181b", borderRadius: "12px", border: "1px solid #27272a", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #27272a" }}>
                    <th style={thStyle}>Priority</th>
                    <th style={thStyle}>Owner</th>
                    <th style={thStyle}>Property</th>
                    <th style={thStyle}>Value</th>
                    <th style={thStyle}>Phones</th>
                    <th style={thStyle}>Tags</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.slice(0, 100).map(lead => (
                    <tr key={lead.id} style={{ borderBottom: "1px solid #27272a" }}>
                      <td style={tdStyle}>
                        <select
                          value={lead.priority}
                          onChange={(e) => updateLeadPriority(lead.id, e.target.value as any)}
                          style={{
                            ...priorityBadge,
                            background: PRIORITY_COLORS[lead.priority].bg,
                          }}
                        >
                          <option value="hot">HOT</option>
                          <option value="warm">WARM</option>
                          <option value="cold">COLD</option>
                        </select>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 500 }}>{lead.ownerName || "Unknown"}</div>
                        <div style={{ fontSize: "0.75rem", color: "#888" }}>{lead.caseNumber}</div>
                      </td>
                      <td style={tdStyle}>
                        <div>{lead.propertyAddress}</div>
                        <div style={{ fontSize: "0.75rem", color: "#888" }}>{lead.city}, {lead.state}</div>
                      </td>
                      <td style={tdStyle}>
                        {lead.estimatedValue ? `$${lead.estimatedValue.toLocaleString()}` : "-"}
                        {lead.estimatedEquity && (
                          <div style={{ fontSize: "0.75rem", color: "#10b981" }}>
                            ${lead.estimatedEquity.toLocaleString()} equity
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {lead.phones?.map((p, i) => (
                          <div key={i} style={{ fontSize: "0.875rem" }}>
                            {p.number}
                            <span style={{
                              marginLeft: "4px",
                              fontSize: "0.625rem",
                              padding: "2px 4px",
                              background: p.type === "mobile" ? "#10b981" : "#6b7280",
                              borderRadius: "4px"
                            }}>
                              {p.type}
                            </span>
                          </div>
                        ))}
                        {!lead.phones?.length && <span style={{ color: "#666" }}>-</span>}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {lead.tags?.map(tag => (
                            <span
                              key={tag}
                              onClick={() => updateLeadTag(lead.id, tag, false)}
                              style={{
                                ...tagBadge,
                                background: TAG_COLORS[tag] || "#374151",
                                cursor: "pointer"
                              }}
                            >
                              {tag} ×
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <select
                          onChange={(e) => {
                            if (e.target.value) updateLeadTag(lead.id, e.target.value, true);
                            e.target.value = "";
                          }}
                          style={{ ...filterSelect, width: "auto", padding: "4px 8px" }}
                        >
                          <option value="">+ Tag</option>
                          {Object.keys(TAG_COLORS).filter(t => !lead.tags?.includes(t)).map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLeads.length > 100 && (
                <div style={{ padding: "16px", textAlign: "center", color: "#888" }}>
                  Showing 100 of {filteredLeads.length} leads
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SkipTraceImport({ originalBatch, onComplete }: { originalBatch: string, onComplete: (data: any) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("originalBatch", originalBatch);
    try {
      const res = await fetch("/api/skip-trace/import", { method: "POST", body: formData });
      onComplete(await res.json());
    } catch (err: any) {
      onComplete({ error: err.message });
    }
    setLoading(false);
  };

  return (
    <>
      <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} style={inputStyle} />
      <button onClick={handleImport} disabled={!file || loading} style={{ ...buttonStyle, background: "#7c3aed", opacity: !file || loading ? 0.5 : 1 }}>
        {loading ? "Processing..." : "Import Skip Traced"}
      </button>
    </>
  );
}

function StatusCheck() {
  const [status, setStatus] = useState<any>(null);
  return (
    <>
      <button onClick={async () => setStatus(await (await fetch("/api/status")).json())} style={{ ...buttonStyle, background: "#374151" }}>
        Check API Status
      </button>
      {status && <pre style={resultStyle}>{JSON.stringify(status, null, 2)}</pre>}
    </>
  );
}

// Styles
const navBtn = (active: boolean): React.CSSProperties => ({
  padding: "8px 16px",
  background: active ? "#3b82f6" : "transparent",
  color: active ? "white" : "#888",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  marginLeft: "8px"
});
const cardStyle: React.CSSProperties = { background: "#18181b", borderRadius: "12px", padding: "24px", marginBottom: "24px", border: "1px solid #27272a" };
const stepStyle: React.CSSProperties = { fontSize: "1.25rem", marginBottom: "8px", color: "#fafafa" };
const inputStyle: React.CSSProperties = { display: "block", marginBottom: "12px", padding: "12px", background: "#27272a", border: "1px solid #3f3f46", borderRadius: "8px", color: "#fafafa", width: "100%" };
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };
const filterSelect: React.CSSProperties = { padding: "8px 12px", background: "#27272a", border: "1px solid #3f3f46", borderRadius: "6px", color: "#fafafa" };
const buttonStyle: React.CSSProperties = { padding: "12px 24px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "1rem", fontWeight: 500, marginRight: "8px" };
const resultStyle: React.CSSProperties = { background: "#09090b", padding: "16px", borderRadius: "8px", overflow: "auto", fontSize: "0.875rem", marginTop: "16px", maxHeight: "300px" };
const statBox: React.CSSProperties = { padding: "8px 16px", background: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "0.875rem" };
const statNum: React.CSSProperties = { fontWeight: 600, marginRight: "4px" };
const thStyle: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#888", textTransform: "uppercase" };
const tdStyle: React.CSSProperties = { padding: "12px 16px", verticalAlign: "top" };
const priorityBadge: React.CSSProperties = { padding: "4px 8px", borderRadius: "4px", color: "white", border: "none", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" };
const tagBadge: React.CSSProperties = { padding: "2px 6px", borderRadius: "4px", fontSize: "0.625rem", color: "white" };
