"use client";

import { useState } from "react";
import { Upload, Database, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { toast } from "sonner";

const VERTICALS = [
  { id: "PLUMBING", name: "Plumbing / HVAC", sic: "1711" },
  { id: "ELECTRICAL", name: "Electrical", sic: "1731" },
  { id: "TRUCKING", name: "Trucking", sic: "4213" },
  { id: "CPA", name: "CPAs & Accountants", sic: "8721" },
  { id: "CONSULTANT", name: "Consultants", sic: "8742" },
  { id: "REALTOR", name: "Real Estate", sic: "6531" },
  { id: "GENERAL", name: "General", sic: "" },
];

export default function LuciImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [vertical, setVertical] = useState("PLUMBING");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, processed: 0, total: 0 });
  const [result, setResult] = useState<{ success: boolean; inserted: number; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setError(null);
    setResult(null);
    setProgress({ percent: 0, processed: 0, total: 0 });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("vertical", vertical);
    formData.append("type", "business");
    formData.append("batchSize", "1000");

    let jobId: string | undefined;
    let offset = 0;
    let totalInserted = 0;

    try {
      // Loop for chunked processing
      while (true) {
        if (offset > 0) {
          formData.set("offset", String(offset));
          if (jobId) formData.set("jobId", jobId);
        }

        const res = await fetch("/api/datalake/import", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!data.success && data.error) {
          throw new Error(data.error);
        }

        jobId = data.jobId;
        totalInserted += data.stats?.inserted || 0;

        setProgress({
          percent: data.progress?.percentComplete || 100,
          processed: data.progress?.processed || data.stats?.totalRows || 0,
          total: data.progress?.total || data.stats?.totalRows || 0,
        });

        // Check if more chunks needed
        if (data.progress?.hasMore && data.progress?.nextOffset) {
          offset = data.progress.nextOffset;
          toast.info(`Processed ${offset.toLocaleString()} records...`);
        } else {
          // Done
          setResult({
            success: true,
            inserted: totalInserted,
            message: data.message || `Imported ${totalInserted.toLocaleString()} records`,
          });
          toast.success(`Imported ${totalInserted.toLocaleString()} records`);
          break;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <TeamSection className="h-full flex flex-col">
      <TeamHeader>
        <TeamTitle>
          <Database className="w-6 h-6 mr-2" />
          Import Data
        </TeamTitle>
      </TeamHeader>

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Upload CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Upload */}
            <div className="border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center hover:border-zinc-500 transition-colors">
              <input
                type="file"
                id="csv"
                accept=".csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setFile(f);
                    setResult(null);
                    setError(null);
                  }
                }}
                className="hidden"
              />
              <label htmlFor="csv" className="cursor-pointer flex flex-col items-center gap-2">
                <FileSpreadsheet className="w-10 h-10 text-zinc-500" />
                {file ? (
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-zinc-400">{formatSize(file.size)}</p>
                  </div>
                ) : (
                  <p className="text-zinc-400">Click to select CSV</p>
                )}
              </label>
            </div>

            {/* Vertical */}
            <Select value={vertical} onValueChange={setVertical}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VERTICALS.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Import Button */}
            <Button
              onClick={handleImport}
              disabled={!file || importing}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              size="lg"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing... {progress.percent}%
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </>
              )}
            </Button>

            {/* Progress */}
            {importing && (
              <div className="space-y-1">
                <Progress value={progress.percent} className="h-2" />
                <p className="text-xs text-zinc-400 text-center">
                  {progress.processed.toLocaleString()} / {progress.total.toLocaleString()}
                </p>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="flex items-center gap-2 p-3 bg-green-950 rounded-lg text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                <p>{result.message}</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-950 rounded-lg text-red-400">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TeamSection>
  );
}
