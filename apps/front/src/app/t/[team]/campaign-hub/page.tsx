"use client";

import { useState, useEffect } from "react";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useCurrentTeam } from "@/features/team/team.context";
import { Send, Loader2 } from "lucide-react";

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  city: string;
  state: string;
}

export default function CampaignHubPage() {
  const { team } = useCurrentTeam();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!team?.id) return;
    fetch(`/api/leads?limit=500`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setLeads(d.leads || []);
        setTotal(d.pagination?.total || 0);
      })
      .finally(() => setLoading(false));
  }, [team?.id]);

  const withPhone = leads.filter((l) => l.phone);

  const selectBatch = () => {
    setSelected(new Set(withPhone.slice(0, 2000).map((l) => l.id)));
  };

  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("Hey {firstName}, I wanted to reach out about your business {company}. Quick question - are you open to a brief conversation this week?");

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
      const selectedList = leads.filter(l => selected.has(l.id) && l.phone);
      const phones = selectedList.map(l => ({
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

      {/* BIG STATS */}
      <div className="p-6 grid grid-cols-3 gap-6">
        <div className="bg-muted rounded-xl p-6 text-center">
          <div className="text-5xl font-bold">{total.toLocaleString()}</div>
          <div className="text-muted-foreground mt-2">Total Leads</div>
        </div>
        <div className="bg-muted rounded-xl p-6 text-center">
          <div className="text-5xl font-bold text-green-500">{withPhone.length.toLocaleString()}</div>
          <div className="text-muted-foreground mt-2">Have Phone</div>
        </div>
        <div className="bg-muted rounded-xl p-6 text-center">
          <div className="text-5xl font-bold text-blue-500">{selected.size.toLocaleString()}</div>
          <div className="text-muted-foreground mt-2">Selected</div>
        </div>
      </div>

      {/* MESSAGE + BUTTONS */}
      <div className="px-6 space-y-4">
        {/* Message Templates */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setMessage("Hey {firstName}, I wanted to reach out about your business {company}. Quick question - are you open to a brief conversation this week?")}>
            Intro
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMessage("Hi {firstName}! Following up on my last message. Would love to chat about {company} when you have a moment.")}>
            Follow Up
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMessage("{firstName}, quick question about {company} - is now a good time to discuss business growth opportunities?")}>
            Direct
          </Button>
        </div>

        {/* Message Input */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full h-24 p-4 border rounded-lg bg-background text-lg"
          placeholder="Enter your message... Use {firstName}, {company}, {city}, etc."
        />
        <div className="text-sm text-muted-foreground">{message.length}/480 characters</div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button size="lg" variant="outline" className="text-xl py-8 px-12" onClick={selectBatch}>
            📋 Select 2,000 Leads
          </Button>
          <Button
            size="lg"
            className="text-xl py-8 px-12 bg-green-600 hover:bg-green-700 flex-1"
            onClick={sendCampaign}
            disabled={selected.size === 0 || sending || !message.trim()}
          >
            {sending ? <Loader2 className="w-6 h-6 mr-3 animate-spin" /> : <Send className="w-6 h-6 mr-3" />}
            {sending ? "SENDING..." : `SEND TO ${selected.size} LEADS`}
          </Button>
        </div>
      </div>

      {/* SIMPLE LIST */}
      <div className="p-6">
        <div className="border rounded-lg max-h-[400px] overflow-auto">
          {leads.slice(0, 100).map((lead) => (
            <div
              key={lead.id}
              onClick={() => {
                const next = new Set(selected);
                if (next.has(lead.id)) next.delete(lead.id);
                else next.add(lead.id);
                setSelected(next);
              }}
              className={`flex items-center gap-4 p-4 border-b cursor-pointer hover:bg-muted/50 ${
                selected.has(lead.id) ? "bg-green-500/20" : ""
              }`}
            >
              <Checkbox checked={selected.has(lead.id)} />
              <div className="flex-1">
                <div className="font-bold">{lead.firstName} {lead.lastName}</div>
                <div className="text-sm text-muted-foreground">{lead.company}</div>
              </div>
              <div className="text-right">
                <div className="font-mono">{lead.phone || "No phone"}</div>
                <div className="text-sm text-muted-foreground">{lead.city}, {lead.state}</div>
              </div>
              {selected.has(lead.id) && <Badge className="bg-green-600">✓</Badge>}
            </div>
          ))}
        </div>
        {leads.length > 100 && (
          <p className="text-center text-muted-foreground mt-4">
            Showing 100 of {leads.length} leads. Use "Select 2,000" to batch select.
          </p>
        )}
      </div>
    </TeamSection>
  );
}
