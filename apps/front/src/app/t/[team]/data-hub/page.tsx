"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Upload,
  Search,
  Sparkles,
  Database,
  CheckCircle2,
  Phone,
  Mail,
  Loader2,
  Zap,
  MessageSquare,
  LayoutGrid,
  Terminal,
  RefreshCw,
  Filter,
  Download,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function DataHubPage() {
  const params = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [viewMode, setViewMode] = useState<"simple" | "pro">("simple");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = {
    totalRecords: 0,
    enriched: 0,
    withPhone: 0,
    withEmail: 0,
  };

  const handleQuickSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Enter a search term");
      return;
    }
    setIsSearching(true);
    window.location.href = `/t/${params.team}/leads/import-companies?q=${encodeURIComponent(searchQuery)}`;
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    toast.success(`File "${file.name}" selected. Redirecting to upload...`);
    window.location.href = `/t/${params.team}/leads/import-companies`;
  };

  const handleTestSkipTrace = async () => {
    setIsEnriching(true);
    try {
      const response = await fetch("/api/skip-trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "John",
          lastName: "Smith",
          address: "123 Main St",
          city: "Brooklyn",
          state: "NY",
          zip: "11201",
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          `Skip trace working! Found ${data.phones?.length || 0} phones, ${data.emails?.length || 0} emails`
        );
      } else if (data.error) {
        toast.error(`Skip trace error: ${data.error}`);
      } else {
        toast.info("Skip trace returned no results for test data");
      }
    } catch (error) {
      toast.error("Failed to test skip trace. Check API key.");
    } finally {
      setIsEnriching(false);
    }
  };

  // ========== SIMPLE MODE ==========
  const SimpleView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">Data Hub</h1>
        <p className="text-xl text-zinc-400">3 Simple Steps</p>
      </div>

      {/* Stats - Compact Row */}
      <div className="grid grid-cols-4 gap-3 max-w-4xl mx-auto">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
          <Database className="h-5 w-5 text-blue-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{stats.totalRecords.toLocaleString()}</p>
          <p className="text-xs text-zinc-500">Records</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
          <CheckCircle2 className="h-5 w-5 text-green-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{stats.enriched.toLocaleString()}</p>
          <p className="text-xs text-zinc-500">Enriched</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
          <Phone className="h-5 w-5 text-purple-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{stats.withPhone.toLocaleString()}</p>
          <p className="text-xs text-zinc-500">Phones</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
          <Mail className="h-5 w-5 text-orange-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{stats.withEmail.toLocaleString()}</p>
          <p className="text-xs text-zinc-500">Emails</p>
        </div>
      </div>

      {/* 3 BIG STEPS */}
      <div className="max-w-5xl mx-auto space-y-6">
        {/* STEP 1 */}
        <Card className="bg-zinc-900 border-2 border-blue-500">
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center text-3xl font-bold text-white">
                1
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">GET YOUR DATA</h2>
                <p className="text-zinc-400">Upload a CSV file or search Apollo</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Button
                className="h-24 text-lg bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleFileUpload}
              >
                <Upload className="h-8 w-8 mr-3" />
                UPLOAD CSV FILE
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
                aria-label="Upload CSV file"
              />

              <div className="flex gap-2">
                <Input
                  placeholder="Search (e.g., 'hotels NYC')"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleQuickSearch()}
                  className="h-24 text-lg bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
                <Button
                  onClick={handleQuickSearch}
                  disabled={isSearching}
                  className="h-24 w-24 bg-blue-600 hover:bg-blue-700"
                >
                  {isSearching ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <Search className="h-8 w-8" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* STEP 2 */}
        <Card className="bg-zinc-900 border-2 border-amber-500">
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-full bg-amber-600 flex items-center justify-center text-3xl font-bold text-white">
                2
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">ENRICH (SKIP TRACE)</h2>
                <p className="text-zinc-400">Get personal cell phones & emails - $0.05/record</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 items-center">
              <div className="bg-zinc-800 p-6 rounded-lg border border-amber-900">
                <div className="flex items-center gap-2 text-amber-400 mb-3">
                  <Sparkles className="h-6 w-6" />
                  <span className="text-lg font-bold">What You Get:</span>
                </div>
                <ul className="text-zinc-300 space-y-2 text-lg">
                  <li>Personal cell phone</li>
                  <li>Personal email</li>
                  <li>Property portfolio</li>
                </ul>
              </div>

              <Button
                className="h-32 text-xl bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleTestSkipTrace}
                disabled={isEnriching}
              >
                {isEnriching ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin mr-3" />
                    TESTING...
                  </>
                ) : (
                  <>
                    <Zap className="h-8 w-8 mr-3" />
                    TEST SKIP TRACE
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* STEP 3 */}
        <Card className="bg-zinc-900 border-2 border-green-500">
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-full bg-green-600 flex items-center justify-center text-3xl font-bold text-white">
                3
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">EXECUTE</h2>
                <p className="text-zinc-400">Reach out via SMS, Call, or Email</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Link href={`/t/${params.team}/sms-queue`} className="block">
                <Button className="w-full h-24 text-lg bg-green-600 hover:bg-green-700 text-white flex flex-col gap-2">
                  <MessageSquare className="h-8 w-8" />
                  SMS
                </Button>
              </Link>
              <Link href={`/t/${params.team}/call-center`} className="block">
                <Button className="w-full h-24 text-lg bg-green-600 hover:bg-green-700 text-white flex flex-col gap-2">
                  <Phone className="h-8 w-8" />
                  CALL
                </Button>
              </Link>
              <Link href={`/t/${params.team}/campaigns`} className="block">
                <Button className="w-full h-24 text-lg bg-green-600 hover:bg-green-700 text-white flex flex-col gap-2">
                  <Mail className="h-8 w-8" />
                  EMAIL
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // ========== PRO MODE (Trading Terminal Style) ==========
  const ProView = () => (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      {/* Top Toolbar */}
      <div className="bg-zinc-950 border-b border-zinc-800 p-2 flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          onClick={handleFileUpload}
        >
          <Upload className="h-4 w-4 mr-1" />
          Import
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
          aria-label="Upload CSV file"
        />
        <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
        <div className="h-4 w-px bg-zinc-700" />
        <Button
          size="sm"
          variant="ghost"
          className="text-amber-400 hover:text-amber-300 hover:bg-zinc-800"
          onClick={handleTestSkipTrace}
          disabled={isEnriching}
        >
          {isEnriching ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
          Enrich
        </Button>
        <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
          <Filter className="h-4 w-4 mr-1" />
          Filter
        </Button>
        <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
        <div className="flex-1" />
        <div className="flex gap-1">
          <Input
            placeholder="Quick search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleQuickSearch()}
            className="h-8 w-64 bg-zinc-900 border-zinc-700 text-white text-sm"
          />
          <Button
            size="sm"
            onClick={handleQuickSearch}
            disabled={isSearching}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Stats */}
        <div className="w-48 bg-zinc-950 border-r border-zinc-800 p-3 space-y-3">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Statistics</div>

          <div className="bg-zinc-900 rounded p-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-zinc-500">Records</span>
            </div>
            <p className="text-xl font-mono font-bold text-white">{stats.totalRecords.toLocaleString()}</p>
          </div>

          <div className="bg-zinc-900 rounded p-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-xs text-zinc-500">Enriched</span>
            </div>
            <p className="text-xl font-mono font-bold text-green-400">{stats.enriched.toLocaleString()}</p>
          </div>

          <div className="bg-zinc-900 rounded p-2">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-zinc-500">Phones</span>
            </div>
            <p className="text-xl font-mono font-bold text-purple-400">{stats.withPhone.toLocaleString()}</p>
          </div>

          <div className="bg-zinc-900 rounded p-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-orange-400" />
              <span className="text-xs text-zinc-500">Emails</span>
            </div>
            <p className="text-xl font-mono font-bold text-orange-400">{stats.withEmail.toLocaleString()}</p>
          </div>

          <div className="h-px bg-zinc-800 my-4" />

          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Quick Actions</div>

          <Link href={`/t/${params.team}/sms-queue`}>
            <Button size="sm" variant="ghost" className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800">
              <MessageSquare className="h-4 w-4 mr-2 text-blue-400" />
              SMS Queue
            </Button>
          </Link>
          <Link href={`/t/${params.team}/call-center`}>
            <Button size="sm" variant="ghost" className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800">
              <Phone className="h-4 w-4 mr-2 text-green-400" />
              Call Center
            </Button>
          </Link>
          <Link href={`/t/${params.team}/campaigns`}>
            <Button size="sm" variant="ghost" className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800">
              <Mail className="h-4 w-4 mr-2 text-purple-400" />
              Campaigns
            </Button>
          </Link>
          <Link href={`/t/${params.team}/leads`}>
            <Button size="sm" variant="ghost" className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800">
              <Database className="h-4 w-4 mr-2 text-amber-400" />
              All Leads
            </Button>
          </Link>
        </div>

        {/* Center - Data Grid Placeholder */}
        <div className="flex-1 bg-zinc-900 p-4">
          <div className="h-full border border-zinc-800 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Terminal className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500 text-lg mb-2">No data loaded</p>
              <p className="text-zinc-600 text-sm mb-4">Import a CSV or search Apollo to get started</p>
              <div className="flex gap-2 justify-center">
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleFileUpload}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
                <Link href={`/t/${params.team}/leads/import-companies`}>
                  <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                    <Search className="h-4 w-4 mr-2" />
                    Search Apollo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="bg-zinc-950 border-t border-zinc-800 px-3 py-1 flex items-center text-xs text-zinc-500">
        <span className="text-green-400 mr-2">●</span>
        <span>Connected</span>
        <span className="mx-2">|</span>
        <span>Skip Trace: $0.05/record</span>
        <span className="mx-2">|</span>
        <span>Daily Limit: 2,000</span>
        <div className="flex-1" />
        <span>Press ? for keyboard shortcuts</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* View Mode Toggle */}
      <div className="fixed top-4 right-4 z-50 flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
        <Button
          size="sm"
          variant={viewMode === "simple" ? "default" : "ghost"}
          onClick={() => setViewMode("simple")}
          className={viewMode === "simple" ? "bg-blue-600" : "text-zinc-400 hover:text-white"}
        >
          <LayoutGrid className="h-4 w-4 mr-1" />
          Simple
        </Button>
        <Button
          size="sm"
          variant={viewMode === "pro" ? "default" : "ghost"}
          onClick={() => setViewMode("pro")}
          className={viewMode === "pro" ? "bg-blue-600" : "text-zinc-400 hover:text-white"}
        >
          <Terminal className="h-4 w-4 mr-1" />
          Pro
        </Button>
      </div>

      {/* Render active view */}
      <div className={viewMode === "simple" ? "p-6" : ""}>
        {viewMode === "simple" ? <SimpleView /> : <ProView />}
      </div>
    </div>
  );
}
