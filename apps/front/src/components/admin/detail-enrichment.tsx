"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Database,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  Upload,
  Trash2,
  Users,
  Phone,
  Building2,
  FileSpreadsheet,
  Box,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";

interface EnrichmentResult {
  id: string;
  success: boolean;
  type: "property" | "people" | "skip";
  data?: Record<string, unknown>;
  error?: string;
}

interface SavedBucket {
  name: string;
  date: string;
  results: EnrichmentResult[];
}

export function DetailEnrichment() {
  const [ids, setIds] = useState("");
  const [bucketName, setBucketName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<EnrichmentResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [activeTab, setActiveTab] = useState<"property" | "people" | "skip">(
    "property",
  );
  const [savedBuckets, setSavedBuckets] = useState<SavedBucket[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load saved buckets on mount
  useEffect(() => {
    loadBuckets();
  }, []);

  const loadBuckets = () => {
    const buckets: SavedBucket[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("bucket_")) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || "{}");
          if (data.name) buckets.push(data);
        } catch {}
      }
    }
    setSavedBuckets(
      buckets.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    );
  };

  const parseIds = (input: string) =>
    input
      .split(/[\n,\s]+/)
      .map((id) => id.trim())
      .filter(Boolean);

  const idCount = parseIds(ids).length;

  const runEnrichment = async () => {
    const idList = parseIds(ids);
    if (!idList.length) return toast.error("Enter IDs");
    if (!bucketName.trim()) return toast.error("Enter bucket name");

    setIsProcessing(true);
    setResults([]);
    setProgress({ current: 0, total: idList.length });

    const allResults: EnrichmentResult[] = [];

    for (let i = 0; i < idList.length; i += 10) {
      const batch = idList.slice(i, i + 10);
      const batchResults = await Promise.all(
        batch.map(async (id) => {
          try {
            let endpoint = "/api/property/detail";
            if (activeTab === "people") endpoint = "/api/people/search";
            if (activeTab === "skip") endpoint = "/api/skip-trace";

            const res = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id }),
            });
            const data = await res.json();
            return {
              id,
              success: res.ok,
              type: activeTab,
              data: res.ok ? data : undefined,
              error: !res.ok ? data.error || "Failed" : undefined,
            } as EnrichmentResult;
          } catch (err) {
            return {
              id,
              success: false,
              type: activeTab,
              error: err instanceof Error ? err.message : "Error",
            } as EnrichmentResult;
          }
        }),
      );
      allResults.push(...batchResults);
      setResults([...allResults]);
      setProgress({ current: i + batch.length, total: idList.length });
      if (i + 10 < idList.length) await new Promise((r) => setTimeout(r, 150));
    }

    setIsProcessing(false);
    const ok = allResults.filter((r) => r.success).length;
    toast.success(`Done: ${ok}/${allResults.length} enriched`);

    // Save bucket
    localStorage.setItem(
      `bucket_${bucketName.replace(/\s+/g, "_")}`,
      JSON.stringify({
        name: bucketName,
        date: new Date().toISOString(),
        results: allResults,
      }),
    );
    loadBuckets();
  };

  const deleteBucket = (name: string) => {
    localStorage.removeItem(`bucket_${name.replace(/\s+/g, "_")}`);
    loadBuckets();
    toast.success("Bucket deleted");
  };

  const exportCSV = () => {
    if (!results.length) return;
    const rows = results.map((r) => [
      r.id,
      r.success ? "OK" : "FAIL",
      r.error || "",
      JSON.stringify(r.data || {}).slice(0, 200),
    ]);
    const csv = [
      ["ID", "Status", "Error", "Data"].join(","),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${bucketName || "export"}.csv`;
    a.click();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = (ev.target?.result as string).split("\n").slice(1);
      const extracted = lines
        .map((l) => l.split(",")[0]?.replace(/"/g, "").trim())
        .filter(Boolean);
      setIds(extracted.join("\n"));
      toast.success(`Loaded ${extracted.length} IDs`);
    };
    reader.readAsText(file);
  };

  const successCount = results.filter((r) => r.success).length;

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileRef}
        onChange={handleFile}
        accept=".csv"
        className="hidden"
        aria-label="Import CSV file"
      />

      {/* Header Row */}
      <div className="flex items-center justify-between">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        >
          <TabsList className="bg-zinc-800">
            <TabsTrigger
              value="property"
              className="data-[state=active]:bg-cyan-600"
            >
              <Building2 className="h-4 w-4 mr-1" /> Property
            </TabsTrigger>
            <TabsTrigger
              value="people"
              className="data-[state=active]:bg-purple-600"
            >
              <Users className="h-4 w-4 mr-1" /> People
            </TabsTrigger>
            <TabsTrigger
              value="skip"
              className="data-[state=active]:bg-orange-600"
            >
              <Phone className="h-4 w-4 mr-1" /> Skip Trace
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            className="border-cyan-600 text-cyan-400 hover:bg-cyan-600/20"
          >
            <Upload className="h-4 w-4 mr-2" /> Import CSV
          </Button>
          <Badge className="bg-zinc-800 text-zinc-400">
            250/batch • 5K/day
          </Badge>
        </div>
      </div>

      {/* Main Grid - 3 columns */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left: Input (3 cols) */}
        <Card className="col-span-3 bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 space-y-3">
            <Input
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              placeholder="Bucket name..."
              className="bg-zinc-800 border-zinc-700 text-white h-9"
            />

            <Textarea
              value={ids}
              onChange={(e) => setIds(e.target.value)}
              placeholder="Property IDs&#10;(one per line)"
              className="bg-zinc-800 border-zinc-700 text-white font-mono text-xs h-[160px] resize-none"
            />

            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">{idCount} IDs</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIds("");
                    setResults([]);
                  }}
                  className="h-8 px-2 text-zinc-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={runEnrichment}
                  disabled={isProcessing || !idCount}
                  className={`h-8 ${
                    activeTab === "property"
                      ? "bg-cyan-600"
                      : activeTab === "people"
                        ? "bg-purple-600"
                        : "bg-orange-600"
                  }`}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-1" /> Run
                    </>
                  )}
                </Button>
              </div>
            </div>

            {isProcessing && (
              <div className="w-full bg-zinc-700 rounded-full h-1.5">
                <div
                  className="bg-cyan-500 h-1.5 rounded-full transition-all"
                  style={{
                    width: `${Math.round((progress.current / progress.total) * 100)}%`,
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Middle: Results (5 cols) */}
        <Card className="col-span-5 bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            {!results.length ? (
              <div className="h-[220px] flex items-center justify-center text-zinc-600">
                <div className="text-center">
                  <Database className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Run enrichment to see results</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-2">
                    <Badge className="bg-green-600 text-xs">
                      {successCount} OK
                    </Badge>
                    <Badge className="bg-red-600 text-xs">
                      {results.length - successCount} Fail
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportCSV}
                    className="h-6 text-xs border-zinc-700"
                  >
                    <FileSpreadsheet className="h-3 w-3 mr-1" /> CSV
                  </Button>
                </div>
                <ScrollArea className="h-[180px]">
                  <div className="space-y-1">
                    {results.map((r, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between p-1.5 rounded text-xs ${
                          r.success ? "bg-green-900/20" : "bg-red-900/20"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {r.success ? (
                            <CheckCircle className="h-3 w-3 text-green-400" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-400" />
                          )}
                          <span className="font-mono text-zinc-300">
                            {r.id}
                          </span>
                        </div>
                        {r.error && (
                          <span className="text-red-400 text-[10px]">
                            {r.error}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right: Saved Buckets (4 cols) */}
        <Card className="col-span-4 bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Box className="h-5 w-5 text-purple-400" />
              <span className="font-medium text-white">Saved Buckets</span>
              <Badge className="bg-purple-600 text-xs ml-auto">
                {savedBuckets.length}
              </Badge>
            </div>

            {savedBuckets.length === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-zinc-600">
                <div className="text-center">
                  <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No saved buckets yet</p>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-[180px]">
                <div className="space-y-2">
                  {savedBuckets.map((bucket, i) => {
                    const okCount = bucket.results.filter(
                      (r) => r.success,
                    ).length;
                    return (
                      <div
                        key={i}
                        className="p-2 bg-zinc-800 rounded-lg border border-zinc-700 hover:border-purple-600 transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-cyan-600 rounded flex items-center justify-center">
                              <Box className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">
                                {bucket.name}
                              </p>
                              <p className="text-[10px] text-zinc-500">
                                {new Date(bucket.date).toLocaleDateString()} •{" "}
                                {bucket.results.length} IDs
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge className="bg-green-600/20 text-green-400 text-[10px]">
                              {okCount}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteBucket(bucket.name)}
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-400"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
