"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Users,
  ArrowRight,
  Loader2,
  FileSpreadsheet,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function DataHubPage() {
  const params = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
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

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Data Hub</h1>
        <p className="text-zinc-400">Upload, search, enrich, and execute - all in one place</p>
      </div>

      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Database className="h-8 w-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalRecords.toLocaleString()}</p>
                  <p className="text-sm text-zinc-400">Total Records</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.enriched.toLocaleString()}</p>
                  <p className="text-sm text-zinc-400">Enriched</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Phone className="h-8 w-8 text-purple-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.withPhone.toLocaleString()}</p>
                  <p className="text-sm text-zinc-400">With Phone</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Mail className="h-8 w-8 text-orange-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.withEmail.toLocaleString()}</p>
                  <p className="text-sm text-zinc-400">With Email</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Workflow - 3 Simple Steps */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Step 1: Get Data */}
          <Card className="bg-zinc-900 border-zinc-800 hover:border-blue-500 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-900 flex items-center justify-center text-blue-400 font-bold">
                  1
                </div>
                <CardTitle className="text-lg text-white">Get Data</CardTitle>
              </div>
              <CardDescription className="text-zinc-400">
                Upload a CSV or search Apollo for contacts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                className="w-full h-20 flex flex-col gap-2 bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                onClick={handleFileUpload}
              >
                <Upload className="h-6 w-6" />
                <span>Upload CSV</span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="flex gap-2">
                <Input
                  placeholder="Search Apollo (e.g., 'hotels NYC')"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleQuickSearch()}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
                <Button
                  onClick={handleQuickSearch}
                  disabled={isSearching}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <Link href={`/t/${params.team}/leads/import-companies`}>
                <Button variant="link" className="w-full text-blue-400 hover:text-blue-300">
                  Go to B2B Contact Search <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Step 2: Enrich */}
          <Card className="bg-zinc-900 border-zinc-800 hover:border-amber-500 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-amber-900 flex items-center justify-center text-amber-400 font-bold">
                  2
                </div>
                <CardTitle className="text-lg text-white">Enrich (Skip Trace)</CardTitle>
              </div>
              <CardDescription className="text-zinc-400">
                Get personal cell phones & emails at $0.05/record
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-zinc-800 p-4 rounded-lg space-y-2 border border-amber-900">
                <div className="flex items-center gap-2 text-amber-400">
                  <Sparkles className="h-5 w-5" />
                  <span className="font-medium">Skip Trace Returns:</span>
                </div>
                <ul className="text-sm text-zinc-300 space-y-1 ml-7">
                  <li>Personal cell phone</li>
                  <li>Personal email</li>
                  <li>Property portfolio</li>
                  <li>Address history</li>
                </ul>
              </div>

              <Button
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleTestSkipTrace}
                disabled={isEnriching}
              >
                {isEnriching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Test Skip Trace API
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-zinc-500">
                Uses RealEstateAPI - $0.05 per successful match
              </p>
            </CardContent>
          </Card>

          {/* Step 3: Execute */}
          <Card className="bg-zinc-900 border-zinc-800 hover:border-green-500 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-green-900 flex items-center justify-center text-green-400 font-bold">
                  3
                </div>
                <CardTitle className="text-lg text-white">Execute</CardTitle>
              </div>
              <CardDescription className="text-zinc-400">
                SMS, Call, or Email your enriched contacts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <Link href={`/t/${params.team}/sms-queue`}>
                  <Button variant="outline" className="w-full h-16 flex flex-col gap-1 bg-zinc-800 border-zinc-700 hover:bg-zinc-700">
                    <Phone className="h-5 w-5 text-blue-400" />
                    <span className="text-xs text-white">SMS</span>
                  </Button>
                </Link>
                <Link href={`/t/${params.team}/call-center`}>
                  <Button variant="outline" className="w-full h-16 flex flex-col gap-1 bg-zinc-800 border-zinc-700 hover:bg-zinc-700">
                    <Phone className="h-5 w-5 text-green-400" />
                    <span className="text-xs text-white">Call</span>
                  </Button>
                </Link>
                <Link href={`/t/${params.team}/campaigns`}>
                  <Button variant="outline" className="w-full h-16 flex flex-col gap-1 bg-zinc-800 border-zinc-700 hover:bg-zinc-700">
                    <Mail className="h-5 w-5 text-purple-400" />
                    <span className="text-xs text-white">Email</span>
                  </Button>
                </Link>
              </div>

              <div className="bg-zinc-800 p-4 rounded-lg border border-green-900">
                <p className="text-sm text-zinc-300">
                  <strong className="text-green-400">Tip:</strong> After enriching, use the action buttons on each record to SMS, Call, or Email directly.
                </p>
              </div>

              <Link href={`/t/${params.team}/leads`}>
                <Button variant="link" className="w-full text-green-400 hover:text-green-300">
                  View All Leads <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <FileSpreadsheet className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href={`/t/${params.team}/leads/import-companies`}>
                <Button variant="outline" className="w-full bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
                  <Search className="h-4 w-4 mr-2" />
                  B2B Search
                </Button>
              </Link>
              <Link href={`/t/${params.team}/leads`}>
                <Button variant="outline" className="w-full bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
                  <Users className="h-4 w-4 mr-2" />
                  All Leads
                </Button>
              </Link>
              <Link href={`/t/${params.team}/sms-queue`}>
                <Button variant="outline" className="w-full bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
                  <Phone className="h-4 w-4 mr-2" />
                  SMS Queue
                </Button>
              </Link>
              <Link href={`/admin/integrations/apollo`}>
                <Button variant="outline" className="w-full bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
                  <Sparkles className="h-4 w-4 mr-2" />
                  API Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* The Flow Diagram */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg text-white">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center">
              <div className="flex flex-col items-center p-4">
                <div className="h-12 w-12 rounded-full bg-blue-900 flex items-center justify-center mb-2">
                  <Upload className="h-6 w-6 text-blue-400" />
                </div>
                <p className="font-medium text-white">Upload CSV</p>
                <p className="text-xs text-zinc-500">USBizData, etc.</p>
              </div>

              <ArrowRight className="h-6 w-6 text-zinc-600 hidden md:block" />

              <div className="flex flex-col items-center p-4">
                <div className="h-12 w-12 rounded-full bg-amber-900 flex items-center justify-center mb-2">
                  <Sparkles className="h-6 w-6 text-amber-400" />
                </div>
                <p className="font-medium text-white">Skip Trace</p>
                <p className="text-xs text-zinc-500">$0.05/record</p>
              </div>

              <ArrowRight className="h-6 w-6 text-zinc-600 hidden md:block" />

              <div className="flex flex-col items-center p-4">
                <div className="h-12 w-12 rounded-full bg-purple-900 flex items-center justify-center mb-2">
                  <Phone className="h-6 w-6 text-purple-400" />
                </div>
                <p className="font-medium text-white">Get Cell + Email</p>
                <p className="text-xs text-zinc-500">Personal contact info</p>
              </div>

              <ArrowRight className="h-6 w-6 text-zinc-600 hidden md:block" />

              <div className="flex flex-col items-center p-4">
                <div className="h-12 w-12 rounded-full bg-green-900 flex items-center justify-center mb-2">
                  <Zap className="h-6 w-6 text-green-400" />
                </div>
                <p className="font-medium text-white">Execute</p>
                <p className="text-xs text-zinc-500">SMS / Call / Email</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
