"use client";


import { sf, sfd } from "@/lib/utils/safe-format";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search,
  Building2,
  MapPin,
  Phone,
  Mail,
  Loader2,
  Zap,
  CheckCircle,
  AlertCircle,
  Database,
  RefreshCw,
} from "lucide-react";

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  property_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface EnrichedProperty {
  id: string;
  owner_first_name: string;
  owner_last_name: string;
  estimated_value: number;
  equity_amount: number;
  equity_percent: number;
  type: string;
}

// US States
const US_STATES = [
  { code: "NY", name: "New York" },
  { code: "NJ", name: "New Jersey" },
  { code: "CT", name: "Connecticut" },
  { code: "FL", name: "Florida" },
  { code: "CA", name: "California" },
  { code: "TX", name: "Texas" },
  { code: "PA", name: "Pennsylvania" },
  { code: "IL", name: "Illinois" },
  { code: "OH", name: "Ohio" },
  { code: "GA", name: "Georgia" },
];

export default function B2BPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [enrichedProperties, setEnrichedProperties] = useState<Record<string, EnrichedProperty>>({});

  // Filters
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [company, setCompany] = useState("");

  const searchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/b2b/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, city, company, limit: 50 }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setLeads(data.leads);
      setTotal(data.total);
      toast.success(`Found ${data.total} B2B leads`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const enrichLead = async (lead: Lead) => {
    if (!lead.address || !lead.state) {
      toast.error("Lead missing address or state");
      return;
    }

    setEnrichingId(lead.id);
    try {
      const res = await fetch("/api/b2b/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          address: lead.address,
          city: lead.city,
          state: lead.state,
          zip: lead.zip_code,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      // Update lead with property_id
      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id ? { ...l, property_id: data.property.id } : l
        )
      );

      // Store enriched property
      setEnrichedProperties((prev) => ({
        ...prev,
        [lead.id]: data.property,
      }));

      toast.success(
        `Enriched! Value: $${sf(data.property.estimated_value) || "N/A"}, Equity: ${data.property.equity_percent || 0}%`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enrichment failed");
    } finally {
      setEnrichingId(null);
    }
  };

  const enrichAll = async () => {
    const unenrichedLeads = leads.filter((l) => !l.property_id && l.address && l.state);

    if (unenrichedLeads.length === 0) {
      toast.info("All leads with addresses are already enriched");
      return;
    }

    toast.info(`Enriching ${unenrichedLeads.length} leads...`);

    for (const lead of unenrichedLeads) {
      await enrichLead(lead);
      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 500));
    }

    toast.success("Batch enrichment complete!");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">B2B Lead Enrichment</h1>
              <p className="text-zinc-400 text-sm">
                Search B2B leads → Enrich with RealEstateAPI → Get property details
              </p>
            </div>
          </div>
          <Badge className="bg-green-600 text-white px-4 py-2 text-lg">
            {sf(total)} Total Leads
          </Badge>
        </div>

        {/* Search Filters */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search B2B Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label className="text-zinc-400 text-xs">State</Label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full h-10 px-3 rounded bg-zinc-800 border border-zinc-700 text-white"
                >
                  <option value="">All States</option>
                  {US_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">City</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City name..."
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Company</Label>
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company name..."
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={searchLeads}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
                <Button
                  onClick={enrichAll}
                  disabled={loading || leads.length === 0}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Enrich All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Database className="h-5 w-5" />
              B2B Leads ({leads.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Search for B2B leads to enrich with property data</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-4 bg-zinc-800 rounded-lg border border-zinc-700 hover:border-zinc-600 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-white text-lg">
                            {lead.company || "No Company"}
                          </h3>
                          {lead.property_id ? (
                            <Badge className="bg-green-600 text-white">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Enriched
                            </Badge>
                          ) : lead.address ? (
                            <Badge className="bg-yellow-600 text-white">
                              Ready to Enrich
                            </Badge>
                          ) : (
                            <Badge className="bg-zinc-600 text-white">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              No Address
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-zinc-300">
                              {lead.first_name} {lead.last_name}
                            </p>
                            {lead.email && (
                              <p className="text-zinc-500 flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {lead.email}
                              </p>
                            )}
                            {lead.phone && (
                              <p className="text-zinc-500 flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {lead.phone}
                              </p>
                            )}
                          </div>
                          <div>
                            {lead.address && (
                              <p className="text-zinc-400 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {lead.address}
                              </p>
                            )}
                            <p className="text-zinc-500">
                              {lead.city}, {lead.state} {lead.zip_code}
                            </p>
                          </div>
                        </div>

                        {/* Show enriched property data */}
                        {enrichedProperties[lead.id] && (
                          <div className="mt-3 p-3 bg-zinc-700/50 rounded-lg">
                            <p className="text-xs text-zinc-400 mb-2">Property Details:</p>
                            <div className="flex gap-4 text-sm">
                              <span className="text-green-400">
                                Value: ${sf(enrichedProperties[lead.id].estimated_value) || "N/A"}
                              </span>
                              <span className="text-cyan-400">
                                Equity: {enrichedProperties[lead.id].equity_percent || 0}%
                              </span>
                              <span className="text-purple-400">
                                ${sf(enrichedProperties[lead.id].equity_amount) || "N/A"}
                              </span>
                              <span className="text-zinc-400">
                                Owner: {enrichedProperties[lead.id].owner_first_name}{" "}
                                {enrichedProperties[lead.id].owner_last_name}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => enrichLead(lead)}
                          disabled={enrichingId === lead.id || !lead.address}
                          size="sm"
                          className={
                            lead.property_id
                              ? "bg-zinc-700 hover:bg-zinc-600"
                              : "bg-purple-600 hover:bg-purple-700"
                          }
                        >
                          {enrichingId === lead.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : lead.property_id ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Re-Enrich
                            </>
                          ) : (
                            <>
                              <Zap className="h-4 w-4 mr-1" />
                              Enrich
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
