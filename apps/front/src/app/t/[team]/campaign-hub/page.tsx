"use client";

import { useState, useEffect } from "react";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useCurrentTeam } from "@/features/team/team.context";
import {
  Send,
  Loader2,
  Filter,
  DollarSign,
  Users,
  Building2,
  Phone,
  MapPin,
  ArrowUpDown,
  Zap,
  CheckCircle,
} from "lucide-react";

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  title: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  county: string | null;
  areaCode: string | null;
  source: string;
  revenue: number | null;
  employees: number | null;
  sicCode: string | null;
  sicDescription: string | null;
  naicsCode: string | null;
  industry: string | null;
  yearEstablished: number | null;
  website: string | null;
  listSource: string | null;
  originalData?: Record<string, unknown>;
}

const LIST_SOURCES = [
  { value: "all", label: "All" },
  { value: "usbizdata", label: "USBizData" },
  { value: "apollo", label: "Apollo" },
  { value: "tracerfy", label: "Tracerfy" },
  { value: "propwire", label: "PropWire" },
  { value: "csv", label: "CSV" },
];

const SORT_OPTIONS = [
  { value: "createdAt", label: "Newest" },
  { value: "company", label: "Company" },
  { value: "state", label: "State" },
  { value: "revenue", label: "Revenue" },
  { value: "employees", label: "Employees" },
];

function formatRevenue(rev: number | null): string {
  if (!rev) return "-";
  if (rev >= 1000000) return `$${(rev / 1000000).toFixed(1)}M`;
  if (rev >= 1000) return `$${(rev / 1000).toFixed(0)}K`;
  return `$${rev}`;
}

function formatEmployees(emp: number | null): string {
  if (!emp) return "-";
  if (emp >= 1000) return `${(emp / 1000).toFixed(1)}K`;
  return emp.toString();
}

export default function CampaignHubPage() {
  const { team } = useCurrentTeam();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [listFilter, setListFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sending, setSending] = useState(false);
  const [skipTracing, setSkipTracing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [message, setMessage] = useState(
    "Hey {firstName}, I wanted to reach out about your business {company}. Quick question - are you open to a brief conversation this week?"
  );

  useEffect(() => {
    if (!team?.id) return;
    setLoading(true);
    const params = new URLSearchParams({ limit: "500", sortBy });
    if (listFilter !== "all") {
      params.set("source", listFilter);
    }
    fetch(`/api/leads?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setLeads(d.leads || []);
        setTotal(d.pagination?.total || 0);
      })
      .finally(() => setLoading(false));
  }, [team?.id, listFilter, sortBy]);

  const withPhone = leads.filter((l) => l.phone);

  const selectBatch = () => {
    setSelected(new Set(withPhone.slice(0, 2000).map((l) => l.id)));
  };

  const skipTraceSelected = async () => {
    if (selected.size === 0) {
      alert("Select leads first!");
      return;
    }
    setSkipTracing(true);
    try {
      const ids = Array.from(selected);
      const res = await fetch("/api/luci/skip-trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ leadIds: ids, teamId: team?.id }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ Skip Trace Started!\n\nQueued: ${data.queued || ids.length}\nCost: ~$${((data.queued || ids.length) * 0.02).toFixed(2)}`);
      } else {
        alert(`❌ ERROR: ${data.error}`);
      }
    } catch (err) {
      alert(`Failed: ${err}`);
    } finally {
      setSkipTracing(false);
    }
  };

  const validateSelected = async () => {
    if (selected.size === 0) {
      alert("Select leads first!");
      return;
    }
    setValidating(true);
    try {
      const ids = Array.from(selected);
      const res = await fetch("/api/luci/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ leadIds: ids, teamId: team?.id }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ Validation Started!\n\nQueued: ${data.queued || ids.length}\nCost: ~$${((data.queued || ids.length) * 0.015).toFixed(2)}`);
      } else {
        alert(`❌ ERROR: ${data.error}`);
      }
    } catch (err) {
      alert(`Failed: ${err}`);
    } finally {
      setValidating(false);
    }
  };

  const sendCampaign = async () => {
    if (selected.size === 0) {
      alert("Select leads first!");
      return;
    }
    if (!message.trim()) {
      alert("Enter a message first!");
      return;
    }
    setSending(true);
    try {
      const selectedList = leads.filter((l) => selected.has(l.id) && l.phone);
      const phones = selectedList.map((l) => ({
        number: l.phone,
        leadId: l.id,
      }));
      const res = await fetch("/api/signalhouse/bulk-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ to: phones, message, teamId: team?.id }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ SUCCESS!\n\nSent: ${data.sent}\nFailed: ${data.failed}\nDaily remaining: ${data.dailyRemaining}`);
        setSelected(new Set());
      } else {
        alert(`❌ ERROR: ${data.error}`);
      }
    } catch (err) {
      alert(`Failed: ${err}`);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <TeamSection>
        <TeamHeader title="Campaign Hub" />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </TeamSection>
    );
  }

  return (
    <TeamSection>
      <TeamHeader title="Campaign Hub" />

      {/* FILTERS + SORT */}
      <div className="px-6 pt-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">List:</span>
          {LIST_SOURCES.map((src) => (
            <Button
              key={src.value}
              variant={listFilter === src.value ? "default" : "outline"}
              size="sm"
              onClick={() => setListFilter(src.value)}
            >
              {src.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <ArrowUpDown className="w-4 h-4" />
          <span className="text-sm font-medium">Sort:</span>
          {SORT_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={sortBy === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* STATS */}
      <div className="p-6 grid grid-cols-5 gap-3">
        <div className="bg-muted rounded-xl p-3 text-center">
          <div className="text-3xl font-bold">{total.toLocaleString()}</div>
          <div className="text-muted-foreground text-xs">Total</div>
        </div>
        <div className="bg-muted rounded-xl p-3 text-center">
          <div className="text-3xl font-bold text-green-500">{withPhone.length.toLocaleString()}</div>
          <div className="text-muted-foreground text-xs">Have Phone</div>
        </div>
        <div className="bg-muted rounded-xl p-3 text-center">
          <div className="text-3xl font-bold text-blue-500">{selected.size.toLocaleString()}</div>
          <div className="text-muted-foreground text-xs">Selected</div>
        </div>
        <div className="bg-muted rounded-xl p-3 text-center">
          <div className="text-3xl font-bold text-purple-500">{leads.filter((l) => l.revenue).length}</div>
          <div className="text-muted-foreground text-xs">W/ Revenue</div>
        </div>
        <div className="bg-muted rounded-xl p-3 text-center">
          <div className="text-3xl font-bold text-orange-500">{leads.filter((l) => l.address).length}</div>
          <div className="text-muted-foreground text-xs">W/ Address</div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="px-6 flex flex-wrap gap-3">
        <Button size="lg" variant="outline" onClick={selectBatch}>
          📋 Select 2,000
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="bg-purple-600 hover:bg-purple-700 text-white"
          onClick={skipTraceSelected}
          disabled={selected.size === 0 || skipTracing}
        >
          {skipTracing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
          Skip Trace ({selected.size}) - $0.02/ea
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={validateSelected}
          disabled={selected.size === 0 || validating}
        >
          {validating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
          Trestle Validate ({selected.size}) - $0.015/ea
        </Button>
      </div>

      {/* MESSAGE */}
      <div className="px-6 py-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setMessage("Hey {firstName}, I wanted to reach out about your business {company}. Quick question - are you open to a brief conversation this week?")}>
            Intro
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMessage("Hi {firstName}! Following up on my last message. Would love to chat about {company} when you have a moment.")}>
            Follow Up
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMessage("{firstName}, quick question about {company} - is now a good time to discuss business growth opportunities?")}>
            Direct
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMessage("Hey {firstName}, I work with {industry} businesses like {company} in {city}. Would you be open to a quick call?")}>
            Industry
          </Button>
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full h-20 p-3 border rounded-lg bg-background"
          placeholder="Enter message... {firstName}, {company}, {city}, {industry}, {address}"
        />
        <div className="flex gap-3">
          <Button
            size="lg"
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={sendCampaign}
            disabled={selected.size === 0 || sending || !message.trim()}
          >
            {sending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Send className="w-5 h-5 mr-2" />}
            {sending ? "SENDING..." : `SEND SMS TO ${selected.size} LEADS`}
          </Button>
        </div>
      </div>

      {/* FULL DATA TABLE */}
      <div className="px-6 pb-6">
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0 z-10">
                <tr>
                  <th className="p-2 text-left w-8">
                    <Checkbox
                      checked={selected.size === leads.length && leads.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) setSelected(new Set(leads.map((l) => l.id)));
                        else setSelected(new Set());
                      }}
                    />
                  </th>
                  <th className="p-2 text-left font-semibold">Name / Title</th>
                  <th className="p-2 text-left font-semibold">Company</th>
                  <th className="p-2 text-left font-semibold"><Phone className="w-3 h-3 inline" /> Phone</th>
                  <th className="p-2 text-left font-semibold"><MapPin className="w-3 h-3 inline" /> Full Address</th>
                  <th className="p-2 text-left font-semibold"><DollarSign className="w-3 h-3 inline" /> Rev</th>
                  <th className="p-2 text-left font-semibold"><Users className="w-3 h-3 inline" /> Emp</th>
                  <th className="p-2 text-left font-semibold"><Building2 className="w-3 h-3 inline" /> Industry</th>
                  <th className="p-2 text-left font-semibold">SIC</th>
                  <th className="p-2 text-left font-semibold">List</th>
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 200).map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => {
                      const next = new Set(selected);
                      if (next.has(lead.id)) next.delete(lead.id);
                      else next.add(lead.id);
                      setSelected(next);
                    }}
                    className={`border-t cursor-pointer hover:bg-muted/50 ${selected.has(lead.id) ? "bg-green-500/20" : ""}`}
                  >
                    <td className="p-2"><Checkbox checked={selected.has(lead.id)} /></td>
                    <td className="p-2">
                      <div className="font-medium">{lead.firstName} {lead.lastName}</div>
                      {lead.title && <div className="text-xs text-muted-foreground">{lead.title}</div>}
                    </td>
                    <td className="p-2">
                      <div className="font-medium">{lead.company || "-"}</div>
                      {lead.website && <div className="text-xs text-blue-500 truncate max-w-[150px]">{lead.website}</div>}
                    </td>
                    <td className="p-2">
                      {lead.phone ? (
                        <span className="font-mono text-green-600 text-xs">{lead.phone}</span>
                      ) : (
                        <span className="text-red-400">NO PHONE</span>
                      )}
                    </td>
                    <td className="p-2">
                      <div className="text-xs">
                        {lead.address && <div className="font-medium">{lead.address}</div>}
                        <div>{lead.city}, {lead.state} {lead.zipCode}</div>
                        {lead.county && <div className="text-muted-foreground">{lead.county} County</div>}
                      </div>
                    </td>
                    <td className="p-2">
                      {lead.revenue ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 text-xs">
                          {formatRevenue(lead.revenue)}
                        </Badge>
                      ) : "-"}
                    </td>
                    <td className="p-2">
                      {lead.employees ? <Badge variant="outline" className="text-xs">{formatEmployees(lead.employees)}</Badge> : "-"}
                    </td>
                    <td className="p-2">
                      {lead.industry ? (
                        <Badge variant="secondary" className="text-xs truncate max-w-[100px]">{lead.industry}</Badge>
                      ) : lead.sicDescription ? (
                        <span className="text-xs truncate max-w-[100px] block">{lead.sicDescription}</span>
                      ) : "-"}
                    </td>
                    <td className="p-2 font-mono text-xs">{lead.sicCode || "-"}</td>
                    <td className="p-2">
                      <Badge variant="outline" className="text-xs">{lead.listSource || lead.source || "-"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {leads.length > 200 && (
          <p className="text-center text-muted-foreground mt-3 text-sm">
            Showing 200 of {leads.length}. Use "Select 2,000" to batch.
          </p>
        )}
      </div>
    </TeamSection>
  );
}
