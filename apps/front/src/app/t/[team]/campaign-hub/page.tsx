"use client";

import { useState, useEffect } from "react";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useCurrentTeam } from "@/features/team/team.context";
import { Send, Loader2, Filter, DollarSign, Users, Building2, Phone } from "lucide-react";

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
  source: string;
  // USBIZDATA FIELDS
  revenue: number | null;
  employees: number | null;
  sicCode: string | null;
  sicDescription: string | null;
  naicsCode: string | null;
  industry: string | null;
  yearEstablished: number | null;
  website: string | null;
  listSource: string | null;
}

const LIST_SOURCES = [
  { value: "all", label: "All Lists" },
  { value: "usbizdata", label: "USBizData" },
  { value: "apollo", label: "Apollo" },
  { value: "tracerfy", label: "Tracerfy" },
  { value: "propwire", label: "PropWire" },
  { value: "csv", label: "CSV Import" },
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
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(
    "Hey {firstName}, I wanted to reach out about your business {company}. Quick question - are you open to a brief conversation this week?"
  );

  useEffect(() => {
    if (!team?.id) return;
    setLoading(true);
    const params = new URLSearchParams({ limit: "500" });
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
  }, [team?.id, listFilter]);

  const withPhone = leads.filter((l) => l.phone);

  const selectBatch = () => {
    setSelected(new Set(withPhone.slice(0, 2000).map((l) => l.id)));
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
        body: JSON.stringify({
          to: phones,
          message,
          teamId: team?.id,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(
          `✅ SUCCESS!\n\nSent: ${data.sent}\nFailed: ${data.failed}\nDaily remaining: ${data.dailyRemaining}`
        );
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

      {/* LIST FILTER */}
      <div className="px-6 pt-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium mr-2">Filter by List:</span>
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
      </div>

      {/* BIG STATS */}
      <div className="p-6 grid grid-cols-4 gap-4">
        <div className="bg-muted rounded-xl p-4 text-center">
          <div className="text-4xl font-bold">{total.toLocaleString()}</div>
          <div className="text-muted-foreground text-sm mt-1">Total Leads</div>
        </div>
        <div className="bg-muted rounded-xl p-4 text-center">
          <div className="text-4xl font-bold text-green-500">
            {withPhone.length.toLocaleString()}
          </div>
          <div className="text-muted-foreground text-sm mt-1">Have Phone</div>
        </div>
        <div className="bg-muted rounded-xl p-4 text-center">
          <div className="text-4xl font-bold text-blue-500">
            {selected.size.toLocaleString()}
          </div>
          <div className="text-muted-foreground text-sm mt-1">Selected</div>
        </div>
        <div className="bg-muted rounded-xl p-4 text-center">
          <div className="text-4xl font-bold text-purple-500">
            {leads.filter((l) => l.revenue).length.toLocaleString()}
          </div>
          <div className="text-muted-foreground text-sm mt-1">Have Revenue</div>
        </div>
      </div>

      {/* MESSAGE + BUTTONS */}
      <div className="px-6 space-y-4">
        {/* Message Templates */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setMessage(
                "Hey {firstName}, I wanted to reach out about your business {company}. Quick question - are you open to a brief conversation this week?"
              )
            }
          >
            Intro
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setMessage(
                "Hi {firstName}! Following up on my last message. Would love to chat about {company} when you have a moment."
              )
            }
          >
            Follow Up
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setMessage(
                "{firstName}, quick question about {company} - is now a good time to discuss business growth opportunities?"
              )
            }
          >
            Direct
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setMessage(
                "Hey {firstName}, I work with {industry} businesses like {company} in {city}. Would you be open to a quick call about scaling your operations?"
              )
            }
          >
            Industry
          </Button>
        </div>

        {/* Message Input */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full h-24 p-4 border rounded-lg bg-background text-lg"
          placeholder="Enter your message... Use {firstName}, {company}, {city}, {industry}, etc."
        />
        <div className="text-sm text-muted-foreground">
          {message.length}/480 characters • Variables: {"{firstName}"}, {"{lastName}"},{" "}
          {"{company}"}, {"{city}"}, {"{state}"}, {"{industry}"}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            size="lg"
            variant="outline"
            className="text-lg py-6 px-8"
            onClick={selectBatch}
          >
            📋 Select 2,000 Leads
          </Button>
          <Button
            size="lg"
            className="text-lg py-6 px-8 bg-green-600 hover:bg-green-700 flex-1"
            onClick={sendCampaign}
            disabled={selected.size === 0 || sending || !message.trim()}
          >
            {sending ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Send className="w-5 h-5 mr-2" />
            )}
            {sending ? "SENDING..." : `SEND TO ${selected.size} LEADS`}
          </Button>
        </div>
      </div>

      {/* FULL DATA TABLE */}
      <div className="p-6">
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0 z-10">
                <tr>
                  <th className="p-3 text-left w-10">
                    <Checkbox
                      checked={selected.size === leads.length && leads.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelected(new Set(leads.map((l) => l.id)));
                        } else {
                          setSelected(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="p-3 text-left font-semibold">Name</th>
                  <th className="p-3 text-left font-semibold">Company</th>
                  <th className="p-3 text-left font-semibold">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Phone
                  </th>
                  <th className="p-3 text-left font-semibold">Location</th>
                  <th className="p-3 text-left font-semibold">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Revenue
                  </th>
                  <th className="p-3 text-left font-semibold">
                    <Users className="w-4 h-4 inline mr-1" />
                    Employees
                  </th>
                  <th className="p-3 text-left font-semibold">
                    <Building2 className="w-4 h-4 inline mr-1" />
                    Industry
                  </th>
                  <th className="p-3 text-left font-semibold">SIC</th>
                  <th className="p-3 text-left font-semibold">List</th>
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
                    className={`border-t cursor-pointer hover:bg-muted/50 ${
                      selected.has(lead.id) ? "bg-green-500/20" : ""
                    }`}
                  >
                    <td className="p-3">
                      <Checkbox checked={selected.has(lead.id)} />
                    </td>
                    <td className="p-3">
                      <div className="font-medium">
                        {lead.firstName} {lead.lastName}
                      </div>
                      {lead.title && (
                        <div className="text-xs text-muted-foreground">{lead.title}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{lead.company || "-"}</div>
                      {lead.website && (
                        <div className="text-xs text-blue-500">{lead.website}</div>
                      )}
                    </td>
                    <td className="p-3">
                      {lead.phone ? (
                        <span className="font-mono text-green-600">{lead.phone}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div>
                        {lead.city}, {lead.state}
                      </div>
                      {lead.zipCode && (
                        <div className="text-xs text-muted-foreground">{lead.zipCode}</div>
                      )}
                    </td>
                    <td className="p-3">
                      {lead.revenue ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600">
                          {formatRevenue(lead.revenue)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      {lead.employees ? (
                        <Badge variant="outline">{formatEmployees(lead.employees)}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      {lead.industry ? (
                        <Badge variant="secondary" className="text-xs">
                          {lead.industry}
                        </Badge>
                      ) : lead.sicDescription ? (
                        <span className="text-xs">{lead.sicDescription}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      {lead.sicCode ? (
                        <span className="font-mono text-xs">{lead.sicCode}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      {lead.listSource || lead.source ? (
                        <Badge variant="outline" className="text-xs">
                          {lead.listSource || lead.source}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {leads.length > 200 && (
          <p className="text-center text-muted-foreground mt-4">
            Showing 200 of {leads.length} leads. Use "Select 2,000" to batch select.
          </p>
        )}
      </div>
    </TeamSection>
  );
}
