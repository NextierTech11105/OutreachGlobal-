"use client";


import { sf, sfd } from "@/lib/utils/safe-format";
import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Terminal,
  Loader2,
  CheckCircle,
  Clock,
  User,
  DollarSign,
  Building,
  AlertCircle,
  Search,
  Filter,
  MapPin,
  RotateCcw,
  Download,
} from "lucide-react";

interface Message {
  id: string;
  type: "user" | "system" | "result" | "error";
  content: string;
  timestamp: Date;
  data?: any;
  params?: any;
}

const STATES = [
  { value: "NY", label: "New York" },
  { value: "NJ", label: "New Jersey" },
  { value: "CT", label: "Connecticut" },
  { value: "FL", label: "Florida" },
  { value: "TX", label: "Texas" },
  { value: "CA", label: "California" },
  { value: "PA", label: "Pennsylvania" },
  { value: "GA", label: "Georgia" },
  { value: "OH", label: "Ohio" },
  { value: "IL", label: "Illinois" },
  { value: "MI", label: "Michigan" },
  { value: "NC", label: "North Carolina" },
  { value: "AZ", label: "Arizona" },
  { value: "MA", label: "Massachusetts" },
  { value: "MD", label: "Maryland" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "CO", label: "Colorado" },
  { value: "TN", label: "Tennessee" },
  { value: "IN", label: "Indiana" },
];

export function MCPTerminal() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Search form state
  const [state, setState] = useState<string | undefined>(undefined);
  const [city, setCity] = useState("");
  const [county, setCounty] = useState("");
  const [zip, setZip] = useState("");
  const [resultSize, setResultSize] = useState("25");

  // Filters
  const [absenteeOwner, setAbsenteeOwner] = useState(false);
  const [preForeclosure, setPreForeclosure] = useState(false);
  const [highEquity, setHighEquity] = useState(false);
  const [vacant, setVacant] = useState(false);
  const [taxLien, setTaxLien] = useState(false);
  const [inherited, setInherited] = useState(false);
  const [corporateOwned, setCorporateOwned] = useState(false);
  const [ownerOccupied, setOwnerOccupied] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const resetFilters = () => {
    setState(undefined);
    setCity("");
    setCounty("");
    setZip("");
    setAbsenteeOwner(false);
    setPreForeclosure(false);
    setHighEquity(false);
    setVacant(false);
    setTaxLien(false);
    setInherited(false);
    setCorporateOwned(false);
    setOwnerOccupied(false);
  };

  const buildParams = () => {
    const params: any = {
      size: parseInt(resultSize) || 25,
    };

    if (state) params.state = state;
    if (city.trim()) params.city = city.trim();
    if (county.trim()) params.county = county.trim();
    if (zip.trim()) params.zip = zip.trim();

    if (absenteeOwner) params.absentee_owner = true;
    if (preForeclosure) params.pre_foreclosure = true;
    if (highEquity) params.equity_percent_min = 50;
    if (vacant) params.vacant = true;
    if (taxLien) params.tax_lien = true;
    if (inherited) params.inherited = true;
    if (corporateOwned) params.corporate_owned = true;
    if (ownerOccupied) params.owner_occupied = true;

    return params;
  };

  const getSearchDescription = (params: any) => {
    const parts: string[] = [];
    if (params.city) parts.push(params.city);
    if (params.county) parts.push(`${params.county} County`);
    if (params.state) parts.push(params.state);
    if (params.zip) parts.push(`ZIP ${params.zip}`);

    const filters: string[] = [];
    if (params.absentee_owner) filters.push("Absentee");
    if (params.pre_foreclosure) filters.push("Pre-Foreclosure");
    if (params.equity_percent_min) filters.push("High Equity");
    if (params.vacant) filters.push("Vacant");
    if (params.tax_lien) filters.push("Tax Lien");
    if (params.inherited) filters.push("Inherited");
    if (params.corporate_owned) filters.push("Corporate");
    if (params.owner_occupied) filters.push("Owner Occupied");

    let desc = parts.length > 0 ? parts.join(", ") : "All Locations";
    if (filters.length > 0) desc += ` | ${filters.join(", ")}`;
    return desc;
  };

  const callRealEstateAPI = async (params: any) => {
    const response = await fetch("/api/property/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.message || "API request failed");
    }

    return data;
  };

  const handleSearch = async () => {
    const params = buildParams();

    if (!params.state && !params.city && !params.county && !params.zip) {
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        type: "error",
        content: "Please select at least a state, city, county, or ZIP code",
        timestamp: new Date(),
      }]);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: getSearchDescription(params),
      timestamp: new Date(),
      params,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      const data = await callRealEstateAPI(params);

      const properties = data.data || data.properties || data.results || [];
      const totalCount = data.resultCount || data.total || properties.length;

      const resultMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "result",
        content: `Found ${sf(totalCount)} properties`,
        timestamp: new Date(),
        data: {
          type: "property_search",
          count: totalCount,
          properties: properties.slice(0, 10),
          raw: data,
        },
        params,
      };

      setMessages((prev) => [...prev, resultMessage]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: "error",
          content: `Error: ${error.message}`,
          timestamp: new Date(),
        },
      ]);
    }

    setIsProcessing(false);
  };

  const exportToCSV = (properties: any[], filename: string) => {
    if (!properties || properties.length === 0) return;

    const headers = [
      "Address",
      "City",
      "State",
      "ZIP",
      "Owner Name",
      "Owner Phone",
      "Owner Email",
      "Equity %",
      "Estimated Value",
      "Property Type",
      "Bedrooms",
      "Bathrooms",
      "Sqft",
      "Year Built",
      "Last Sale Date",
      "Last Sale Price"
    ];

    const rows = properties.map((prop: any) => {
      return [
        prop.address?.deliveryLine || prop.propertyAddress || prop.address || "",
        prop.address?.city || prop.city || "",
        prop.address?.state || prop.state || "",
        prop.address?.zip || prop.zip || "",
        prop.owner?.names?.[0] || prop.ownerName || prop.owner || "",
        prop.owner?.phones?.[0] || prop.ownerPhone || "",
        prop.owner?.emails?.[0] || prop.ownerEmail || "",
        prop.equity?.equityPercent || prop.equityPercent || "",
        prop.valuation?.estimatedValue || prop.estimatedValue || prop.value || "",
        prop.propertyType || prop.type || "",
        prop.bedrooms || prop.beds || "",
        prop.bathrooms || prop.baths || "",
        prop.squareFeet || prop.sqft || "",
        prop.yearBuilt || "",
        prop.lastSaleDate || "",
        prop.lastSalePrice || ""
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderResultData = (message: Message) => {
    if (!message.data) return null;

    if (message.data.type === "property_search") {
      const properties = message.data.properties || [];
      const allProperties = message.data.raw?.data || message.data.raw?.properties || properties;

      if (properties.length === 0) {
        return (
          <div className="mt-3 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 text-center">
            <p className="text-zinc-400">No properties found. Try adjusting your search criteria.</p>
          </div>
        );
      }

      return (
        <div className="mt-3 space-y-2">
          <div className="flex justify-end mb-2">
            <Button
              size="sm"
              onClick={() => exportToCSV(allProperties, "property_search")}
              className="bg-green-600 hover:bg-green-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export to CSV ({allProperties.length})
            </Button>
          </div>
          {properties.map((prop: any, i: number) => {
            // Handle address - can be object or string
            let address = "Unknown Address";
            if (typeof prop.address === "string") {
              address = prop.address;
            } else if (prop.address?.street) {
              address = prop.address.street;
            } else if (prop.address?.address) {
              address = prop.address.address;
            } else if (prop.address?.deliveryLine) {
              address = prop.address.deliveryLine;
            } else if (prop.propertyAddress) {
              address = prop.propertyAddress;
            }
            const city = prop.address?.city || prop.city || "";
            const stateVal = prop.address?.state || prop.state || "";
            // Handle owner - can be object or string
            let owner = "Unknown";
            if (typeof prop.owner === "string") {
              owner = prop.owner;
            } else if (prop.owner?.names?.[0]) {
              owner = prop.owner.names[0];
            } else if (prop.owner1FirstName || prop.owner1LastName) {
              owner = [prop.owner1FirstName, prop.owner1LastName].filter(Boolean).join(" ");
            } else if (prop.ownerName) {
              owner = prop.ownerName;
            }
            const equity = prop.equity?.equityPercent || prop.equityPercent || null;
            const value = prop.valuation?.estimatedValue || prop.estimatedValue || prop.value || null;

            return (
              <div key={i} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <Building className="h-5 w-5 text-orange-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">{address}</p>
                  <p className="text-xs text-zinc-400">{city}{city && stateVal ? ", " : ""}{stateVal}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {equity && (
                    <Badge className="bg-green-900/50 text-green-300 border-green-700">
                      <DollarSign className="h-3 w-3 mr-1" />
                      {typeof equity === 'number' ? `${equity}%` : equity}
                    </Badge>
                  )}
                  {value && (
                    <Badge className="bg-blue-900/50 text-blue-300 border-blue-700">
                      ${(value / 1000).toFixed(0)}K
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-zinc-400 shrink-0">
                  <User className="h-3 w-3" />
                  <span className="text-xs truncate max-w-[100px]">{owner}</span>
                </div>
              </div>
            );
          })}
          <p className="text-xs text-zinc-500 mt-2">
            Showing {properties.length} of {sf(message.data.count)} results
          </p>
        </div>
      );
    }

    return null;
  };

  const activeFiltersCount = [absenteeOwner, preForeclosure, highEquity, vacant, taxLien, inherited, corporateOwned, ownerOccupied].filter(Boolean).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Search Form */}
      <Card className="bg-zinc-900 border-zinc-800 lg:col-span-1">
        <CardHeader className="border-b border-zinc-800 py-3">
          <CardTitle className="flex items-center justify-between text-zinc-100 text-base">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-purple-400" />
              Property Search
            </div>
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-zinc-400 hover:text-zinc-200">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Location */}
          <div className="space-y-3">
            <Label className="text-zinc-300 text-xs uppercase tracking-wide flex items-center gap-2">
              <MapPin className="h-3 w-3" /> Location
            </Label>

            <select
              value={state || ""}
              onChange={(e) => setState(e.target.value || undefined)}
              className="w-full h-10 px-3 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200"
              aria-label="Select state"
            >
              <option value="">Select State</option>
              {STATES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City (e.g., Queens, Miami)"
              className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
            />

            <Input
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              placeholder="County (e.g., Bergen, Harris)"
              className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
            />

            <Input
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="ZIP Code"
              className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
            />
          </div>

          {/* Filters */}
          <div className="space-y-3">
            <Label className="text-zinc-300 text-xs uppercase tracking-wide flex items-center gap-2">
              <Filter className="h-3 w-3" /> Filters
              {activeFiltersCount > 0 && (
                <Badge className="bg-purple-900/50 text-purple-300 text-xs">{activeFiltersCount}</Badge>
              )}
            </Label>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded border border-zinc-700 cursor-pointer hover:bg-zinc-800">
                <Checkbox checked={absenteeOwner} onCheckedChange={(c) => setAbsenteeOwner(!!c)} />
                <span className="text-sm text-zinc-300">Absentee</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded border border-zinc-700 cursor-pointer hover:bg-zinc-800">
                <Checkbox checked={preForeclosure} onCheckedChange={(c) => setPreForeclosure(!!c)} />
                <span className="text-sm text-zinc-300">Pre-Foreclosure</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded border border-zinc-700 cursor-pointer hover:bg-zinc-800">
                <Checkbox checked={highEquity} onCheckedChange={(c) => setHighEquity(!!c)} />
                <span className="text-sm text-zinc-300">High Equity</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded border border-zinc-700 cursor-pointer hover:bg-zinc-800">
                <Checkbox checked={vacant} onCheckedChange={(c) => setVacant(!!c)} />
                <span className="text-sm text-zinc-300">Vacant</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded border border-zinc-700 cursor-pointer hover:bg-zinc-800">
                <Checkbox checked={taxLien} onCheckedChange={(c) => setTaxLien(!!c)} />
                <span className="text-sm text-zinc-300">Tax Lien</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded border border-zinc-700 cursor-pointer hover:bg-zinc-800">
                <Checkbox checked={inherited} onCheckedChange={(c) => setInherited(!!c)} />
                <span className="text-sm text-zinc-300">Inherited</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded border border-zinc-700 cursor-pointer hover:bg-zinc-800">
                <Checkbox checked={corporateOwned} onCheckedChange={(c) => setCorporateOwned(!!c)} />
                <span className="text-sm text-zinc-300">Corporate</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded border border-zinc-700 cursor-pointer hover:bg-zinc-800">
                <Checkbox checked={ownerOccupied} onCheckedChange={(c) => setOwnerOccupied(!!c)} />
                <span className="text-sm text-zinc-300">Owner Occupied</span>
              </label>
            </div>
          </div>

          {/* Result Size */}
          <div className="space-y-2">
            <Label className="text-zinc-300 text-xs uppercase tracking-wide">Results</Label>
            <select
              value={resultSize}
              onChange={(e) => setResultSize(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200"
              aria-label="Number of results"
            >
              <option value="10">10 results</option>
              <option value="25">25 results</option>
              <option value="50">50 results</option>
              <option value="100">100 results</option>
            </select>
          </div>

          {/* Search Button */}
          <Button
            onClick={handleSearch}
            disabled={isProcessing}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search Properties
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2 flex flex-col h-[700px]">
        <CardHeader className="border-b border-zinc-800 py-3">
          <CardTitle className="flex items-center justify-between text-zinc-100 text-base">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-green-400" />
              Results
              <Badge variant="outline" className="text-xs border-orange-700 text-orange-400 ml-2">
                LIVE API
              </Badge>
            </div>
            <Badge className="bg-green-900/50 text-green-300 border-green-700">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
              Connected
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <Search className="h-12 w-12 mb-4 opacity-50" />
              <p>Select filters and click Search to find properties</p>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className="space-y-1">
              {message.type === "user" && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-600 rounded-lg">
                    <Search className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-zinc-200">Search</span>
                      <span className="text-xs text-zinc-500">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-zinc-300">{message.content}</p>
                    {message.params && (
                      <code className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded mt-1 block">
                        {JSON.stringify(message.params)}
                      </code>
                    )}
                  </div>
                </div>
              )}

              {message.type === "result" && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-900/50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-zinc-200">Response</span>
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    </div>
                    <p className="text-zinc-300">{message.content}</p>
                    {renderResultData(message)}
                  </div>
                </div>
              )}

              {message.type === "error" && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-red-900/30">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-red-400">{message.content}</p>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </CardContent>
      </Card>
    </div>
  );
}
