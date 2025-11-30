"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Download, Save, Trash2, Tag, Loader2, Plus, X } from "lucide-react";

// States with counties
const STATES: Record<string, string[]> = {
  NY: ["Queens", "Kings", "Bronx", "New York", "Richmond", "Nassau", "Suffolk", "Westchester", "Erie", "Monroe"],
  NJ: ["Bergen", "Essex", "Hudson", "Middlesex", "Monmouth", "Morris", "Passaic", "Union", "Camden", "Burlington"],
  CA: ["Los Angeles", "San Diego", "Orange", "Riverside", "San Bernardino", "Santa Clara", "Alameda", "Sacramento"],
  TX: ["Harris", "Dallas", "Tarrant", "Bexar", "Travis", "Collin", "Denton", "Fort Bend", "Hidalgo", "El Paso"],
  FL: ["Miami-Dade", "Broward", "Palm Beach", "Hillsborough", "Orange", "Pinellas", "Duval", "Lee", "Polk"],
  PA: ["Philadelphia", "Allegheny", "Montgomery", "Bucks", "Delaware", "Chester", "Lancaster", "Berks"],
  IL: ["Cook", "DuPage", "Lake", "Will", "Kane", "McHenry", "Winnebago", "Madison"],
  OH: ["Cuyahoga", "Franklin", "Hamilton", "Summit", "Montgomery", "Lucas", "Butler", "Stark"],
  GA: ["Fulton", "Gwinnett", "Cobb", "DeKalb", "Chatham", "Cherokee", "Clayton", "Forsyth"],
  NC: ["Mecklenburg", "Wake", "Guilford", "Forsyth", "Cumberland", "Durham", "Buncombe", "Union"],
};

// Default tags with colors
const DEFAULT_TAGS = [
  { name: "Hot", color: "bg-red-600" },
  { name: "High Equity", color: "bg-green-600" },
  { name: "Long Ownership", color: "bg-cyan-600" },
  { name: "Pre-Foreclosure", color: "bg-orange-600" },
  { name: "Reverse MTG", color: "bg-pink-600" },
  { name: "Follow Up", color: "bg-yellow-600" },
  { name: "Cold", color: "bg-blue-600" },
  { name: "Skip Traced", color: "bg-purple-600" },
];

interface SavedSearch {
  id: string;
  label: string;           // User-defined label
  tags: string[];          // Tags applied to this search
  state: string;
  county: string;
  propertyType: string;
  totalCount: number;      // Total from count query
  propertyIds: string[];   // Saved IDs (up to 10K)
  createdAt: Date;
  notes: string;           // User notes
}

export function LeadTrackerSimple() {
  // Search form
  const [state, setState] = useState("");
  const [county, setCounty] = useState("");
  const [propertyType, setPropertyType] = useState("SFR");

  // Save form
  const [label, setLabel] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // Results
  const [count, setCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Saved searches
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [filterTag, setFilterTag] = useState<string | null>(null);

  // Custom tags
  const [customTags, setCustomTags] = useState<{ name: string; color: string }[]>([]);
  const [newTagName, setNewTagName] = useState("");

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("leadBuckets");
    if (saved) {
      setSavedSearches(JSON.parse(saved).map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt),
      })));
    }
    const tags = localStorage.getItem("customTags");
    if (tags) {
      setCustomTags(JSON.parse(tags));
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("leadBuckets", JSON.stringify(savedSearches));
  }, [savedSearches]);

  useEffect(() => {
    localStorage.setItem("customTags", JSON.stringify(customTags));
  }, [customTags]);

  // All tags (default + custom)
  const allTags = [...DEFAULT_TAGS, ...customTags];

  // GET COUNT (FREE)
  const getCount = async () => {
    if (!state || !county) {
      toast.error("Select state and county");
      return;
    }

    setIsLoading(true);
    setCount(null);

    try {
      const res = await fetch("/api/property/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state,
          county,
          property_type: propertyType,
          absentee_owner: true,
          count: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");

      setCount(data.resultCount || 0);

      // Auto-generate label
      if (!label) {
        setLabel(`${county} ${propertyType}`);
      }

      toast.success(`Found ${(data.resultCount || 0).toLocaleString()} properties`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // SAVE SEARCH with Label + Tags
  const saveSearch = async () => {
    if (!state || !county || !count) {
      toast.error("Run count first");
      return;
    }
    if (!label.trim()) {
      toast.error("Enter a label");
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch("/api/property/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state,
          county,
          property_type: propertyType,
          absentee_owner: true,
          ids_only: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");

      const ids = (data.data || []).map((p: any) => String(p.id || p.propertyId || p));

      const newSearch: SavedSearch = {
        id: `${Date.now()}`,
        label: label.trim(),
        tags: selectedTags,
        state,
        county,
        propertyType,
        totalCount: count,
        propertyIds: ids.slice(0, 10000),
        createdAt: new Date(),
        notes: notes.trim(),
      };

      setSavedSearches((prev) => [newSearch, ...prev]);
      toast.success(`Saved "${label}" with ${ids.length.toLocaleString()} IDs`);

      // Reset form
      setCount(null);
      setLabel("");
      setSelectedTags([]);
      setNotes("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle tag on a saved search
  const toggleSearchTag = (searchId: string, tag: string) => {
    setSavedSearches((prev) =>
      prev.map((s) =>
        s.id === searchId
          ? { ...s, tags: s.tags.includes(tag) ? s.tags.filter((t) => t !== tag) : [...s.tags, tag] }
          : s
      )
    );
  };

  // Export to CSV
  const exportToCsv = (search: SavedSearch) => {
    const headers = ["property_id", "label", "tags", "state", "county", "property_type"];
    const rows = search.propertyIds.map((id) => [
      id,
      search.label,
      search.tags.join("; "),
      search.state,
      search.county,
      search.propertyType,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${search.label.replace(/[^a-zA-Z0-9]/g, "_")}_${search.propertyIds.length}_ids.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${search.propertyIds.length.toLocaleString()} IDs`);
  };

  // Add custom tag
  const addCustomTag = () => {
    if (!newTagName.trim()) return;
    if (allTags.some((t) => t.name.toLowerCase() === newTagName.trim().toLowerCase())) {
      toast.error("Tag already exists");
      return;
    }
    const colors = ["bg-indigo-600", "bg-teal-600", "bg-amber-600", "bg-rose-600", "bg-emerald-600"];
    setCustomTags((prev) => [...prev, { name: newTagName.trim(), color: colors[prev.length % colors.length] }]);
    setNewTagName("");
    toast.success(`Added tag "${newTagName}"`);
  };

  // Delete search
  const deleteSearch = (id: string) => {
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
    toast.success("Deleted");
  };

  // Filtered searches
  const filteredSearches = filterTag
    ? savedSearches.filter((s) => s.tags.includes(filterTag))
    : savedSearches;

  return (
    <div className="space-y-6 p-6">
      {/* SEARCH + LABEL */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Search className="h-5 w-5" />
            1. SEARCH & LABEL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Row */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label className="text-zinc-400 text-xs">State</Label>
              <select
                value={state}
                onChange={(e) => { setState(e.target.value); setCounty(""); setCount(null); }}
                aria-label="Select state"
                className="w-full h-9 px-2 rounded bg-zinc-800 border border-zinc-700 text-white text-sm"
              >
                <option value="">Select</option>
                {Object.keys(STATES).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">County</Label>
              <select
                value={county}
                onChange={(e) => { setCounty(e.target.value); setCount(null); }}
                disabled={!state}
                aria-label="Select county"
                className="w-full h-9 px-2 rounded bg-zinc-800 border border-zinc-700 text-white text-sm disabled:opacity-50"
              >
                <option value="">Select</option>
                {(STATES[state] || []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Type</Label>
              <select
                value={propertyType}
                onChange={(e) => { setPropertyType(e.target.value); setCount(null); }}
                aria-label="Select property type"
                className="w-full h-9 px-2 rounded bg-zinc-800 border border-zinc-700 text-white text-sm"
              >
                <option value="SFR">Single Family</option>
                <option value="MFR">Multi-Family</option>
                <option value="LAND">Land</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={getCount}
                disabled={isLoading || !state || !county}
                size="sm"
                className="w-full h-9 bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "COUNT"}
              </Button>
            </div>
          </div>

          {/* Count Result + Label/Tags */}
          {count !== null && (
            <div className="p-4 bg-zinc-800 rounded-lg space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-3xl font-bold text-green-400">{count.toLocaleString()}</span>
                <span className="text-zinc-400">absentee-owned {propertyType} in {county}, {state}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-zinc-400 text-xs">Label *</Label>
                  <Input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g., Queens SFR Hot Leads"
                    className="bg-zinc-700 border-zinc-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400 text-xs">Notes</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes..."
                    className="bg-zinc-700 border-zinc-600 text-white"
                  />
                </div>
              </div>

              {/* Tag Selection */}
              <div>
                <Label className="text-zinc-400 text-xs">Tags</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {allTags.map((tag) => (
                    <button
                      key={tag.name}
                      onClick={() =>
                        setSelectedTags((prev) =>
                          prev.includes(tag.name) ? prev.filter((t) => t !== tag.name) : [...prev, tag.name]
                        )
                      }
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        selectedTags.includes(tag.name)
                          ? `${tag.color} text-white ring-2 ring-white`
                          : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={saveSearch}
                disabled={isSaving || count === 0 || !label.trim()}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                SAVE BUCKET ({count > 10000 ? "10,000" : count.toLocaleString()} IDs)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SAVED BUCKETS */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Tag className="h-5 w-5" />
            2. SAVED BUCKETS
          </CardTitle>
          <div className="flex items-center gap-2">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="New tag..."
              className="w-32 h-8 text-sm bg-zinc-800 border-zinc-700"
              onKeyDown={(e) => e.key === "Enter" && addCustomTag()}
            />
            <Button size="sm" onClick={addCustomTag} variant="outline" className="h-8">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter by tag */}
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-zinc-800">
            <button
              onClick={() => setFilterTag(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                filterTag === null ? "bg-white text-black" : "bg-zinc-700 text-zinc-300"
              }`}
            >
              All ({savedSearches.length})
            </button>
            {allTags.map((tag) => {
              const tagCount = savedSearches.filter((s) => s.tags.includes(tag.name)).length;
              if (tagCount === 0) return null;
              return (
                <button
                  key={tag.name}
                  onClick={() => setFilterTag(filterTag === tag.name ? null : tag.name)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    filterTag === tag.name ? `${tag.color} text-white` : "bg-zinc-700 text-zinc-300"
                  }`}
                >
                  {tag.name} ({tagCount})
                </button>
              );
            })}
          </div>

          {/* Saved searches list */}
          {filteredSearches.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">No saved buckets</p>
          ) : (
            <div className="space-y-3">
              {filteredSearches.map((search) => (
                <div key={search.id} className="p-4 bg-zinc-800 rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-bold">{search.label}</h3>
                        <span className="text-zinc-500 text-sm">
                          {search.county}, {search.state}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 mt-1">
                        <span className="text-green-400 font-bold">{search.propertyIds.length.toLocaleString()}</span> IDs
                        {" • "}
                        {search.propertyType}
                        {" • "}
                        {search.createdAt.toLocaleDateString()}
                      </p>
                      {search.notes && (
                        <p className="text-xs text-zinc-500 mt-1 italic">{search.notes}</p>
                      )}
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {search.tags.map((tag) => {
                          const tagDef = allTags.find((t) => t.name === tag);
                          return (
                            <Badge
                              key={tag}
                              className={`${tagDef?.color || "bg-zinc-600"} text-white text-xs cursor-pointer`}
                              onClick={() => toggleSearchTag(search.id, tag)}
                            >
                              {tag} <X className="h-3 w-3 ml-1" />
                            </Badge>
                          );
                        })}
                        {/* Add tag dropdown */}
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) toggleSearchTag(search.id, e.target.value);
                          }}
                          aria-label="Add tag"
                          className="h-5 px-1 text-xs bg-zinc-700 border-none rounded text-zinc-300"
                        >
                          <option value="">+ Tag</option>
                          {allTags
                            .filter((t) => !search.tags.includes(t.name))
                            .map((t) => (
                              <option key={t.name} value={t.name}>{t.name}</option>
                            ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => exportToCsv(search)}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        CSV
                      </Button>
                      <Button
                        onClick={() => deleteSearch(search.id)}
                        size="sm"
                        variant="destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-white">{savedSearches.length}</p>
            <p className="text-xs text-zinc-400">Saved Buckets</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-green-400">
              {savedSearches.reduce((acc, s) => acc + s.propertyIds.length, 0).toLocaleString()}
            </p>
            <p className="text-xs text-zinc-400">Total IDs</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-cyan-400">{allTags.length}</p>
            <p className="text-xs text-zinc-400">Tags</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
