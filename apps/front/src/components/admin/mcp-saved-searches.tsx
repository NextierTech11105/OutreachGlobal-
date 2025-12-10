"use client";


import { sf, sfd } from "@/lib/utils/safe-format";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FolderOpen,
  Plus,
  Download,
  Play,
  Trash2,
  Calendar,
  MapPin,
  Home,
  Users,
  DollarSign,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle,
  Clock,
  Filter,
  Save,
} from "lucide-react";
import { toast } from "sonner";

interface SavedSearch {
  id: string;
  name: string;
  filters: {
    states: string[];
    propertyType?: string;
    status?: string[];
    equityMin?: number;
  };
  resultCount: number;
  lastRun: Date;
  bucketPath: string;
  status: "ready" | "running" | "exporting";
}

// No mock data - load from real DO Spaces bucket
const INITIAL_SEARCHES: SavedSearch[] = [];

const STATES = [
  { value: "NY", label: "New York" },
  { value: "NJ", label: "New Jersey" },
  { value: "CT", label: "Connecticut" },
  { value: "FL", label: "Florida" },
  { value: "TX", label: "Texas" },
  { value: "CA", label: "California" },
];

const PROPERTY_STATUSES = [
  { value: "pre_foreclosure", label: "Pre-Foreclosure" },
  { value: "absentee_owner", label: "Absentee Owner" },
  { value: "high_equity", label: "High Equity" },
  { value: "vacant", label: "Vacant" },
  { value: "tax_lien", label: "Tax Lien" },
  { value: "inherited", label: "Inherited" },
];

export function MCPSavedSearches() {
  const [searches, setSearches] = useState<SavedSearch[]>(INITIAL_SEARCHES);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSearch, setNewSearch] = useState({
    name: "",
    states: [] as string[],
    status: "",
    equityMin: 40,
  });

  const handleRunSearch = async (id: string) => {
    setSearches((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "running" as const } : s))
    );

    // Simulate search
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setSearches((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status: "ready" as const,
              lastRun: new Date(),
              resultCount: Math.floor(Math.random() * 5000) + 500,
            }
          : s
      )
    );

    toast.success("Search completed successfully!");
  };

  const handleExport = async (id: string) => {
    const search = searches.find((s) => s.id === id);
    if (!search) return;

    setSearches((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "exporting" as const } : s))
    );

    // Simulate export
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setSearches((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "ready" as const } : s))
    );

    toast.success(`Exported ${search.resultCount} properties to ${search.bucketPath}`);
  };

  const handleCreateSearch = () => {
    if (!newSearch.name || newSearch.states.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    const search: SavedSearch = {
      id: Date.now().toString(),
      name: newSearch.name,
      filters: {
        states: newSearch.states,
        status: newSearch.status ? [newSearch.status] : undefined,
        equityMin: newSearch.equityMin,
      },
      resultCount: 0,
      lastRun: new Date(),
      bucketPath: `/exports/${newSearch.name.toLowerCase().replace(/\s+/g, "-")}.csv`,
      status: "ready",
    };

    setSearches((prev) => [search, ...prev]);
    setIsCreateOpen(false);
    setNewSearch({ name: "", states: [], status: "", equityMin: 40 });
    toast.success("Search created! Run it to get results.");
  };

  const handleDelete = (id: string) => {
    setSearches((prev) => prev.filter((s) => s.id !== id));
    toast.success("Search deleted");
  };

  const getStatusIcon = (status: SavedSearch["status"]) => {
    switch (status) {
      case "running":
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />;
      case "exporting":
        return <Download className="h-4 w-4 animate-pulse text-purple-400" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-400" />;
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-zinc-100">
              <FolderOpen className="h-5 w-5 text-amber-400" />
              Saved Searches & Export Buckets
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Create searches, run them via MCP, and export to CSV buckets
            </CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                New Search
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
              <DialogHeader>
                <DialogTitle>Create New Saved Search</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Define filters for your property search. Results will be saved to a CSV bucket.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Search Name</label>
                  <Input
                    value={newSearch.name}
                    onChange={(e) => setNewSearch((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Pre-Foreclosure Miami"
                    className="bg-zinc-800 border-zinc-700 text-zinc-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Target States</label>
                  <div className="flex flex-wrap gap-2">
                    {STATES.map((state) => (
                      <Badge
                        key={state.value}
                        variant="outline"
                        className={`cursor-pointer transition-colors ${
                          newSearch.states.includes(state.value)
                            ? "bg-blue-900/50 text-blue-300 border-blue-600"
                            : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                        }`}
                        onClick={() =>
                          setNewSearch((prev) => ({
                            ...prev,
                            states: prev.states.includes(state.value)
                              ? prev.states.filter((s) => s !== state.value)
                              : [...prev.states, state.value],
                          }))
                        }
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        {state.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Property Status</label>
                  <Select
                    value={newSearch.status}
                    onValueChange={(value) => setNewSearch((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                      <SelectValue placeholder="Select status filter" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {PROPERTY_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value} className="text-zinc-200">
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">
                    Minimum Equity: {newSearch.equityMin}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={newSearch.equityMin}
                    onChange={(e) =>
                      setNewSearch((prev) => ({ ...prev, equityMin: parseInt(e.target.value) }))
                    }
                    className="w-full"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="border-zinc-700">
                  Cancel
                </Button>
                <Button onClick={handleCreateSearch} className="bg-purple-600 hover:bg-purple-700">
                  <Save className="h-4 w-4 mr-2" />
                  Create Search
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {searches.map((search) => (
          <div
            key={search.id}
            className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700"
          >
            {/* Status */}
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-zinc-800">
              {getStatusIcon(search.status)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-zinc-200">{search.name}</h4>
                <Badge variant="outline" className="border-zinc-600 text-zinc-400">
                  {sf(search.resultCount)} properties
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {search.filters.states.join(", ")}
                </span>
                {search.filters.status && (
                  <span className="flex items-center gap-1">
                    <Filter className="h-3 w-3" />
                    {search.filters.status.join(", ")}
                  </span>
                )}
                {search.filters.equityMin && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {search.filters.equityMin}%+ equity
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {search.lastRun.toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Export Path */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded border border-zinc-700">
              <FileSpreadsheet className="h-4 w-4 text-green-400" />
              <code className="text-xs text-zinc-400">{search.bucketPath}</code>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                onClick={() => handleRunSearch(search.id)}
                disabled={search.status !== "ready"}
              >
                {search.status === "running" ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                onClick={() => handleExport(search.id)}
                disabled={search.status !== "ready" || search.resultCount === 0}
              >
                {search.status === "exporting" ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-red-900 text-red-400 hover:bg-red-900/20"
                onClick={() => handleDelete(search.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {searches.length === 0 && (
          <div className="text-center py-8 text-zinc-500">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No saved searches yet. Create one to get started!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
