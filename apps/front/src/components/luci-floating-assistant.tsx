"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Database,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle,
  Building2,
  MapPin,
  Phone,
  Mail,
  Users,
  Globe,
  Zap,
  Target,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import Image from "next/image";

interface FetchedLead {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  sector?: string;
}

// Luci's avatar - using a placeholder for now
const LUCI_AVATAR = "/luci-avatar.png";

export function LuciFloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeMode, setActiveMode] = useState<"search" | "results">("search");
  const [isLoading, setIsLoading] = useState(false);
  const [fetchedLeads, setFetchedLeads] = useState<FetchedLead[]>([]);

  // Search state
  const [sector, setSector] = useState("");
  const [state, setState] = useState("NY");
  const [limit, setLimit] = useState(100);

  const SECTORS = [
    { value: "hotel-motel", label: "Hotels/Motels" },
    { value: "restaurants", label: "Restaurants" },
    { value: "auto-dealers", label: "Auto Dealers" },
    { value: "auto-repair", label: "Auto Repair" },
    { value: "trucking", label: "Trucking" },
    { value: "construction", label: "Construction" },
    { value: "medical", label: "Medical" },
    { value: "dental", label: "Dental" },
    { value: "plumbing-hvac", label: "Plumbing/HVAC" },
    { value: "electrical", label: "Electrical" },
  ];

  const STATES = [
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DE",
    "FL",
    "GA",
    "HI",
    "ID",
    "IL",
    "IN",
    "IA",
    "KS",
    "KY",
    "LA",
    "ME",
    "MD",
    "MA",
    "MI",
    "MN",
    "MS",
    "MO",
    "MT",
    "NE",
    "NV",
    "NH",
    "NJ",
    "NM",
    "NY",
    "NC",
    "ND",
    "OH",
    "OK",
    "OR",
    "PA",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VT",
    "VA",
    "WA",
    "WV",
    "WI",
    "WY",
  ];

  const handleFetchLeads = useCallback(async () => {
    if (!sector) {
      toast.error("Please select a sector");
      return;
    }

    setIsLoading(true);
    setActiveMode("results");

    try {
      const response = await fetch("/api/business-list/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sector,
          state,
          limit,
          decisionMakersOnly: true,
        }),
      });

      const data = await response.json();

      if (data.success && data.leads) {
        setFetchedLeads(
          data.leads.map((lead: Record<string, unknown>) => ({
            id:
              lead.id ||
              `lead-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name:
              `${lead.first_name || ""} ${lead.last_name || ""}`.trim() ||
              "Unknown",
            company: lead.company as string,
            phone: lead.phone as string,
            email: lead.email as string,
            city: lead.city as string,
            state: lead.state as string,
            sector: sector,
          })),
        );
        toast.success(`Found ${data.leads.length} leads`, {
          description: "Ready to push to campaigns",
        });
      } else {
        toast.error("No leads found", {
          description: "Try different filters",
        });
        setFetchedLeads([]);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Fetch failed - check your connection");
      setFetchedLeads([]);
    } finally {
      setIsLoading(false);
    }
  }, [sector, state, limit]);

  const handlePushToCalendar = useCallback(() => {
    if (fetchedLeads.length === 0) return;

    toast.success(`Pushed ${fetchedLeads.length} leads to Calendar`, {
      description: "Leads are now available in Calendar Workspace",
    });

    // In real implementation, this would call an API to add leads to calendar
    setFetchedLeads([]);
    setActiveMode("search");
  }, [fetchedLeads]);

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="h-14 w-14 rounded-full bg-gradient-to-br from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 shadow-lg shadow-red-500/25"
            >
              <div className="relative">
                <Globe className="h-6 w-6 text-white" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-400 rounded-full animate-pulse" />
              </div>
            </Button>
            <div className="absolute -top-8 right-0 bg-zinc-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              Luci Data Agent
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: isMinimized ? "auto" : "500px",
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 w-[380px] bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-orange-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 rounded-full bg-zinc-900 overflow-hidden border-2 border-white/20">
                  {/* Placeholder for Luci avatar - using emoji for now */}
                  <div className="h-full w-full flex items-center justify-center text-2xl">
                    👩‍💻
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-white flex items-center gap-2">
                    Luci
                    <Badge className="bg-white/20 text-white text-[10px]">
                      DATA ENGINEER
                    </Badge>
                  </h3>
                  <p className="text-white/70 text-xs">
                    Your lead sourcing specialist
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  {isMinimized ? (
                    <Zap className="h-4 w-4" />
                  ) : (
                    <span className="text-lg">−</span>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Content */}
                <div className="flex-1 p-4 overflow-hidden">
                  {activeMode === "search" ? (
                    <div className="space-y-4">
                      <div className="text-center mb-4">
                        <p className="text-zinc-400 text-sm">
                          Tell me what leads you need
                        </p>
                        <p className="text-zinc-500 text-xs">
                          Select sector, state, and quantity
                        </p>
                      </div>

                      {/* Sector Select */}
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block">
                          SECTOR
                        </label>
                        <Select value={sector} onValueChange={setSector}>
                          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                            <SelectValue placeholder="Select sector..." />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-700">
                            {SECTORS.map((s) => (
                              <SelectItem
                                key={s.value}
                                value={s.value}
                                className="text-white"
                              >
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* State Select */}
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block">
                          STATE
                        </label>
                        <Select value={state} onValueChange={setState}>
                          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-700 max-h-[200px]">
                            {STATES.map((s) => (
                              <SelectItem
                                key={s}
                                value={s}
                                className="text-white"
                              >
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Limit */}
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block">
                          QUANTITY
                        </label>
                        <Select
                          value={String(limit)}
                          onValueChange={(v) => setLimit(parseInt(v))}
                        >
                          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-700">
                            <SelectItem value="50" className="text-white">
                              50 leads
                            </SelectItem>
                            <SelectItem value="100" className="text-white">
                              100 leads
                            </SelectItem>
                            <SelectItem value="250" className="text-white">
                              250 leads
                            </SelectItem>
                            <SelectItem value="500" className="text-white">
                              500 leads
                            </SelectItem>
                            <SelectItem value="1000" className="text-white">
                              1,000 leads
                            </SelectItem>
                            <SelectItem value="2000" className="text-white">
                              2,000 leads (MAX)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        onClick={handleFetchLeads}
                        disabled={isLoading || !sector}
                        className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4 mr-2" />
                            FETCH LEADS
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col">
                      {/* Results Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                          <span className="text-sm text-white font-medium">
                            Found {fetchedLeads.length} leads
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveMode("search")}
                          className="text-zinc-400 hover:text-white"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          NEW SEARCH
                        </Button>
                      </div>

                      {/* Results List */}
                      <ScrollArea className="flex-1 -mx-4 px-4">
                        <div className="space-y-2">
                          {fetchedLeads.slice(0, 10).map((lead) => (
                            <Card
                              key={lead.id}
                              className="bg-zinc-900 border-zinc-800"
                            >
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between">
                                  <div className="min-w-0">
                                    <p className="font-medium text-white text-sm truncate">
                                      {lead.name}
                                    </p>
                                    {lead.company && (
                                      <p className="text-xs text-zinc-400 flex items-center gap-1 truncate">
                                        <Building2 className="h-3 w-3" />
                                        {lead.company}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-1">
                                      {lead.phone && (
                                        <span className="text-[10px] text-green-400 flex items-center gap-0.5">
                                          <Phone className="h-2.5 w-2.5" />
                                          PHONE
                                        </span>
                                      )}
                                      {lead.email && (
                                        <span className="text-[10px] text-blue-400 flex items-center gap-0.5">
                                          <Mail className="h-2.5 w-2.5" />
                                          EMAIL
                                        </span>
                                      )}
                                      {lead.city && (
                                        <span className="text-[10px] text-zinc-500 flex items-center gap-0.5">
                                          <MapPin className="h-2.5 w-2.5" />
                                          {lead.city}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          {fetchedLeads.length > 10 && (
                            <p className="text-center text-zinc-500 text-xs py-2">
                              +{fetchedLeads.length - 10} more leads...
                            </p>
                          )}
                        </div>
                      </ScrollArea>

                      {/* Push Button */}
                      <div className="pt-3 border-t border-zinc-800 mt-3">
                        <Button
                          onClick={handlePushToCalendar}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          <Target className="h-4 w-4 mr-2" />
                          PUSH TO CALENDAR
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 bg-zinc-900/50 border-t border-zinc-800">
                  <p className="text-[10px] text-zinc-500 text-center">
                    DATA IS POWER • 2.8M+ B2B Records
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
