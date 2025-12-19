"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Bot,
  Send,
  Loader2,
  Database,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Download,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Tag,
} from "lucide-react";

// Sector configuration for the copilot
const SECTORS = {
  "hotel-motel": {
    label: "Hotel & Motel",
    keywords: ["hotel", "motel", "lodging", "inn"],
  },
  "campgrounds-rv": {
    label: "Campgrounds & RV",
    keywords: ["campground", "rv", "camping", "trailer"],
  },
  restaurants: {
    label: "Restaurants",
    keywords: ["restaurant", "food", "dining", "cafe", "bar"],
  },
  trucking: {
    label: "Trucking",
    keywords: ["trucking", "truck", "freight", "hauling", "transport"],
  },
  logistics: {
    label: "Logistics",
    keywords: ["logistics", "warehouse", "shipping", "distribution"],
  },
  "aircraft-parts": {
    label: "Aircraft Parts",
    keywords: ["aircraft", "aviation", "airplane", "plane", "jet"],
  },
  "auto-parts": {
    label: "Auto Parts",
    keywords: ["auto parts", "car parts", "automotive parts"],
  },
  "auto-dealers": {
    label: "Auto Dealers",
    keywords: ["dealer", "dealership", "car dealer", "auto dealer"],
  },
  "auto-repair": {
    label: "Auto Repair",
    keywords: ["repair", "mechanic", "auto shop", "garage", "service"],
  },
  medical: {
    label: "Medical",
    keywords: ["medical", "doctor", "physician", "clinic", "healthcare"],
  },
  dental: { label: "Dental", keywords: ["dental", "dentist", "orthodontist"] },
  "nursing-homes": {
    label: "Nursing Homes",
    keywords: ["nursing", "care facility", "senior", "elderly"],
  },
  construction: {
    label: "Construction",
    keywords: ["construction", "contractor", "builder", "building"],
  },
  "plumbing-hvac": {
    label: "Plumbing/HVAC",
    keywords: ["plumbing", "hvac", "heating", "cooling", "plumber"],
  },
  electrical: {
    label: "Electrical",
    keywords: ["electrical", "electrician", "wiring"],
  },
  roofing: {
    label: "Roofing",
    keywords: ["roofing", "roofer", "shingles", "roof"],
  },
  legal: { label: "Legal", keywords: ["law", "lawyer", "attorney", "legal"] },
  accounting: {
    label: "Accounting",
    keywords: ["accounting", "accountant", "cpa", "tax", "bookkeeping"],
  },
  insurance: { label: "Insurance", keywords: ["insurance", "agent", "broker"] },
  "real-estate": {
    label: "Real Estate",
    keywords: ["real estate", "realtor", "property", "realty"],
  },
  "ny-business": {
    label: "NY Business",
    keywords: ["new york", "ny", "nyc", "manhattan", "brooklyn"],
  },
};

// States mapping
const STATES: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  ny: "NY",
  nj: "NJ",
  ct: "CT",
  fl: "FL",
  tx: "TX",
  ca: "CA",
};

interface Lead {
  id: number;
  name: string;
  contact_name?: string;
  contact_title?: string;
  address?: string;
  phone?: string;
  email?: string;
  sector?: string;
  sector_label?: string;
  industry?: string;
  size?: string;
  revenue_range?: string;
  county?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  leads?: Lead[];
  query?: ParsedQuery;
  timestamp: Date;
}

interface ParsedQuery {
  sector?: string;
  state?: string;
  limit?: number;
  keywords: string[];
}

// Parse natural language query
function parseQuery(input: string): ParsedQuery {
  const lower = input.toLowerCase();
  const result: ParsedQuery = { keywords: [] };

  // Detect sector
  for (const [sectorKey, config] of Object.entries(SECTORS)) {
    for (const keyword of config.keywords) {
      if (lower.includes(keyword)) {
        result.sector = sectorKey;
        break;
      }
    }
    if (result.sector) break;
  }

  // Detect state
  for (const [stateName, stateCode] of Object.entries(STATES)) {
    if (lower.includes(stateName.toLowerCase())) {
      result.state = stateCode;
      break;
    }
  }

  // Detect limit/count
  const countMatch = lower.match(
    /(\d+)\s*(leads?|contacts?|businesses?|companies?|records?)?/,
  );
  if (countMatch) {
    result.limit = Math.min(parseInt(countMatch[1]), 100);
  } else {
    result.limit = 25; // Default
  }

  // Extract remaining keywords
  const words = lower
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 2 &&
        ![
          "the",
          "and",
          "for",
          "get",
          "me",
          "find",
          "show",
          "from",
          "with",
          "in",
        ].includes(w),
    );
  result.keywords = words;

  return result;
}

// Generate response based on query
function generateResponse(query: ParsedQuery, leads: Lead[]): string {
  const parts: string[] = [];

  if (leads.length === 0) {
    return `No leads found matching your criteria. Try a different sector or location.`;
  }

  parts.push(`Found **${leads.length} leads**`);

  if (query.sector) {
    const sectorLabel =
      SECTORS[query.sector as keyof typeof SECTORS]?.label || query.sector;
    parts.push(`in the **${sectorLabel}** sector`);
  }

  if (query.state) {
    parts.push(`in **${query.state}**`);
  }

  return parts.join(" ") + ".";
}

export function DatalakeCopilot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        'Hey! I\'m your Datalake Copilot. Ask me to fetch leads from your uploaded databases.\n\n**Try:**\n- "Get me 50 hotel owners in Florida"\n- "Find trucking companies in New Jersey"\n- "Show auto dealers in NY"',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch leads from datalake - CONNECTED TO POSTGRESQL
  const fetchLeads = useCallback(
    async (query: ParsedQuery): Promise<Lead[]> => {
      try {
        const params = new URLSearchParams({ action: "search" });
        if (query.sector) params.append("sector", query.sector);
        if (query.limit) params.append("limit", query.limit.toString());
        // Pass keywords as natural language query for server-side search
        if (query.keywords.length > 0) {
          params.append("q", query.keywords.join(" "));
        }

        const response = await fetch(`/api/airflow/datalake?${params}`);
        if (!response.ok) throw new Error("Failed to fetch from PostgreSQL");

        const data = await response.json();
        let leads = data.businesses || [];

        // Filter by state client-side if needed (state not in server query yet)
        if (query.state) {
          leads = leads.filter(
            (l: Lead) =>
              l.address?.toUpperCase().includes(query.state!) ||
              (l as any).state?.toUpperCase() === query.state,
          );
        }

        console.log(
          `[Datalake Copilot] Fetched ${leads.length} leads from PostgreSQL (total: ${data.total})`,
        );
        return leads.slice(0, query.limit || 25);
      } catch (error) {
        console.error("[Datalake Copilot] Fetch error:", error);
        return [];
      }
    },
    [],
  );

  // Handle send message
  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Parse the query
    const query = parseQuery(input);

    // Fetch leads
    const leads = await fetchLeads(query);

    // Generate response
    const responseContent = generateResponse(query, leads);

    const assistantMessage: Message = {
      id: `assistant_${Date.now()}`,
      role: "assistant",
      content: responseContent,
      leads: leads.length > 0 ? leads : undefined,
      query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setLoading(false);
  }, [input, loading, fetchLeads]);

  // Toggle lead selection
  const toggleLead = (id: number) => {
    setSelectedLeads((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Export selected leads
  const exportLeads = (leads: Lead[]) => {
    const selected = leads.filter((l) => selectedLeads.has(l.id));
    const toExport = selected.length > 0 ? selected : leads;

    const csv = [
      ["Name", "Contact", "Title", "Phone", "Email", "Address", "Sector"].join(
        ",",
      ),
      ...toExport.map((l) =>
        [
          l.name,
          l.contact_name || "",
          l.contact_title || "",
          l.phone || "",
          l.email || "",
          l.address || "",
          l.sector_label || "",
        ]
          .map((v) => `"${v}"`)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Quick sector buttons
  const quickSectors = [
    { sector: "hotel-motel", label: "🏨 Hotels" },
    { sector: "trucking", label: "🚛 Trucking" },
    { sector: "auto-dealers", label: "🚙 Auto Dealers" },
    { sector: "construction", label: "🏗️ Construction" },
    { sector: "restaurants", label: "🍕 Restaurants" },
  ];

  return (
    <Card className="bg-zinc-900 border-zinc-800 h-[700px] flex flex-col">
      <CardHeader className="pb-3 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-lg">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                Datalake Copilot
                <Badge className="bg-cyan-600 text-xs">AI Agent</Badge>
              </CardTitle>
              <p className="text-zinc-400 text-sm">
                Natural language lead fetching
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-zinc-700 text-zinc-400">
              <Database className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          </div>
        </div>

        {/* Quick sector buttons */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {quickSectors.map(({ sector, label }) => (
            <Button
              key={sector}
              size="sm"
              variant="outline"
              onClick={() =>
                setInput(`Get me 25 ${label.split(" ")[1]} owners`)
              }
              className="text-xs border-zinc-700 text-zinc-400 hover:border-cyan-600 hover:text-cyan-400"
            >
              {label}
            </Button>
          ))}
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "assistant" && (
              <div className="p-2 bg-cyan-600 rounded-lg h-fit">
                <Bot className="h-4 w-4 text-white" />
              </div>
            )}

            <div
              className={`max-w-[80%] ${
                message.role === "user"
                  ? "bg-purple-600 text-white rounded-lg p-3"
                  : "bg-zinc-800 text-zinc-100 rounded-lg p-3"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>

              {/* Query tags */}
              {message.query && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {message.query.sector && (
                    <Badge className="bg-cyan-600/30 text-cyan-400 text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      {
                        SECTORS[message.query.sector as keyof typeof SECTORS]
                          ?.label
                      }
                    </Badge>
                  )}
                  {message.query.state && (
                    <Badge className="bg-green-600/30 text-green-400 text-xs">
                      <MapPin className="h-3 w-3 mr-1" />
                      {message.query.state}
                    </Badge>
                  )}
                  {message.query.limit && (
                    <Badge className="bg-orange-600/30 text-orange-400 text-xs">
                      Limit: {message.query.limit}
                    </Badge>
                  )}
                </div>
              )}

              {/* Lead results */}
              {message.leads && message.leads.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      {selectedLeads.size > 0
                        ? `${selectedLeads.size} selected`
                        : `${message.leads.length} leads`}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportLeads(message.leads!)}
                      className="h-7 text-xs border-zinc-700 text-zinc-400 hover:text-white"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Export CSV
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {message.leads.slice(0, 10).map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => toggleLead(lead.id)}
                        className={`p-2 rounded border cursor-pointer transition-colors ${
                          selectedLeads.has(lead.id)
                            ? "bg-cyan-600/20 border-cyan-600"
                            : "bg-zinc-900 border-zinc-700 hover:border-zinc-600"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-white flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-zinc-500" />
                              {lead.name}
                            </p>
                            {lead.contact_name && (
                              <p className="text-xs text-zinc-400 flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {lead.contact_name}
                                {lead.contact_title &&
                                  ` - ${lead.contact_title}`}
                              </p>
                            )}
                          </div>
                          {lead.sector_label && (
                            <Badge className="bg-zinc-700 text-zinc-300 text-xs">
                              {lead.sector_label}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-zinc-500">
                          {lead.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {lead.phone}
                            </span>
                          )}
                          {lead.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {lead.email}
                            </span>
                          )}
                        </div>
                        {lead.address && (
                          <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {lead.address}
                          </p>
                        )}
                      </div>
                    ))}
                    {message.leads.length > 10 && (
                      <p className="text-xs text-zinc-500 text-center py-2">
                        + {message.leads.length - 10} more leads (export to see
                        all)
                      </p>
                    )}
                  </div>
                </div>
              )}

              <p className="text-xs text-zinc-500 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>

            {message.role === "user" && (
              <div className="p-2 bg-purple-600 rounded-lg h-fit">
                <User className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="p-2 bg-cyan-600 rounded-lg h-fit">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Searching datalake...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      {/* Input */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask for leads... (e.g., 'Get me 50 trucking companies in Texas')"
            className="flex-1 bg-zinc-800 border-zinc-700 text-white"
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          <Sparkles className="h-3 w-3 inline mr-1" />
          Natural language queries supported • Sectors auto-detected from your
          uploads
        </p>
      </div>
    </Card>
  );
}
