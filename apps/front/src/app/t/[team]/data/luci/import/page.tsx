"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Zap,
  Target,
  Database,
} from "lucide-react";

type PipelineStage = "idle" | "uploading" | "tracing" | "scoring" | "qualifying" | "complete" | "error";

interface PipelineProgress {
  stage: PipelineStage;
  message: string;
  percent: number;
  stats?: {
    total: number;
    traced: number;
    scored: number;
    ready: number;
  };
}

const SECTOR_OPTIONS = [
  { value: "plumbing-hvac", label: "Plumbing & HVAC", sic: "1711" },
  { value: "business-management-consulting", label: "Business Consulting", sic: "8742" },
  { value: "realtors", label: "Real Estate", sic: "6531" },
  { value: "restaurants", label: "Restaurants", sic: "5812" },
  { value: "medical-offices", label: "Medical Offices", sic: "8011" },
  { value: "dental-offices", label: "Dental Offices", sic: "8021" },
  { value: "auto-repair-shops", label: "Auto Repair", sic: "7538" },
  { value: "beauty-salons", label: "Beauty Salons", sic: "7231" },
];

const DAILY_TARGETS = [
  { value: 500, label: "500/day", desc: "Conservative" },
  { value: 1000, label: "1,000/day", desc: "Standard" },
  { value: 2000, label: "2,000/day", desc: "Aggressive" },
];

export default function DataImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [sector, setSector] = useState("");
  const [dailyTarget, setDailyTarget] = useState(2000);
  const [progress, setProgress] = useState<PipelineProgress>({
    stage: "idle",
    message: "",
    percent: 0,
  });
  const [batchId, setBatchId] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const startPipeline = async () => {
    if (!file || !sector) return;

    setProgress({ stage: "uploading", message: "Uploading file...", percent: 5 });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sectorTag", sector);
      formData.append("dailyTarget", dailyTarget.toString());

      const res = await fetch("/api/luci/pipeline/start", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setBatchId(data.data.batchId);

      // Start polling for progress
      pollProgress(data.data.batchId);
    } catch (err) {
      setProgress({
        stage: "error",
        message: err instanceof Error ? err.message : "Pipeline failed",
        percent: 0,
      });
    }
  };

  const pollProgress = async (id: string) => {
    const stages: PipelineStage[] = ["tracing", "scoring", "qualifying"];
    let stageIndex = 0;

    const poll = async () => {
      try {
        const res = await fetch(`/api/luci/pipeline/batch/${id}`);
        const data = await res.json();

        if (data.data.status === "ready") {
          setProgress({
            stage: "complete",
            message: "Pipeline complete!",
            percent: 100,
            stats: data.data,
          });
          return;
        }

        if (data.data.status === "failed") {
          setProgress({
            stage: "error",
            message: data.data.errors?.[0] || "Pipeline failed",
            percent: 0,
          });
          return;
        }

        // Simulate stage progression
        const currentStage = stages[stageIndex % stages.length];
        const percent = 20 + stageIndex * 25;

        setProgress({
          stage: currentStage,
          message: getStageMessage(currentStage),
          percent: Math.min(percent, 95),
          stats: {
            total: data.data.totalRecords || 0,
            traced: data.data.tracedCount || 0,
            scored: data.data.scoredCount || 0,
            ready: data.data.smsReadyCount || 0,
          },
        });

        stageIndex++;
        setTimeout(poll, 3000);
      } catch {
        setTimeout(poll, 5000);
      }
    };

    poll();
  };

  const getStageMessage = (stage: PipelineStage): string => {
    switch (stage) {
      case "tracing":
        return "Running Tracerfy skip trace...";
      case "scoring":
        return "Scoring with Trestle Real Contact...";
      case "qualifying":
        return "Qualifying leads...";
      default:
        return "Processing...";
    }
  };

  const isRunning = ["uploading", "tracing", "scoring", "qualifying"].includes(progress.stage);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Data Import</h1>
              <p className="text-zinc-400">Upload → Trace → Score → Ready</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Pipeline Status */}
        {progress.stage !== "idle" && (
          <div className="mb-8 bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {progress.stage === "complete" ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                ) : progress.stage === "error" ? (
                  <AlertCircle className="w-6 h-6 text-red-500" />
                ) : (
                  <Loader2 className="w-6 h-6 animate-spin" />
                )}
                <span className="font-medium">{progress.message}</span>
              </div>
              <span className="text-zinc-400">{progress.percent}%</span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  progress.stage === "complete"
                    ? "bg-emerald-500"
                    : progress.stage === "error"
                      ? "bg-red-500"
                      : "bg-white"
                }`}
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            {/* Stats */}
            {progress.stats && (
              <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-zinc-800">
                <div>
                  <p className="text-2xl font-bold">{progress.stats.total.toLocaleString()}</p>
                  <p className="text-sm text-zinc-400">Total Records</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{progress.stats.traced.toLocaleString()}</p>
                  <p className="text-sm text-zinc-400">Traced</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{progress.stats.scored.toLocaleString()}</p>
                  <p className="text-sm text-zinc-400">Scored</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-500">
                    {progress.stats.ready.toLocaleString()}
                  </p>
                  <p className="text-sm text-zinc-400">SMS Ready</p>
                </div>
              </div>
            )}

            {progress.stage === "complete" && (
              <div className="mt-6 flex gap-3">
                <a
                  href="/leads"
                  className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200"
                >
                  View Leads
                </a>
                <button
                  onClick={() => {
                    setFile(null);
                    setProgress({ stage: "idle", message: "", percent: 0 });
                  }}
                  className="px-4 py-2 border border-zinc-700 rounded-lg hover:bg-zinc-800"
                >
                  Import Another
                </button>
              </div>
            )}
          </div>
        )}

        {/* Upload Form */}
        {progress.stage === "idle" && (
          <div className="space-y-6">
            {/* File Drop */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-white bg-zinc-900"
                  : file
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-zinc-700 hover:border-zinc-500"
              }`}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="w-10 h-10 text-emerald-500" />
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-zinc-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 mx-auto mb-4 text-zinc-500" />
                  <p className="text-lg mb-2">Drop your CSV here</p>
                  <p className="text-sm text-zinc-400">
                    USBizData, plumbing list, consultant list - any lead file
                  </p>
                </>
              )}
            </div>

            {/* Sector Select */}
            <div>
              <label className="block text-sm font-medium mb-2">Sector</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:border-white"
              >
                <option value="">Select sector...</option>
                {SECTOR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} (SIC {opt.sic})
                  </option>
                ))}
              </select>
            </div>

            {/* Daily Target */}
            <div>
              <label className="block text-sm font-medium mb-2">Daily Target</label>
              <div className="grid grid-cols-3 gap-3">
                {DAILY_TARGETS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDailyTarget(opt.value)}
                    className={`p-4 rounded-lg border text-left transition-colors ${
                      dailyTarget === opt.value
                        ? "border-white bg-white/10"
                        : "border-zinc-700 hover:border-zinc-500"
                    }`}
                  >
                    <p className="font-bold">{opt.label}</p>
                    <p className="text-sm text-zinc-400">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={startPipeline}
              disabled={!file || !sector || isRunning}
              className="w-full py-4 bg-white text-black rounded-lg font-bold text-lg flex items-center justify-center gap-2 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className="w-5 h-5" />
              Start Pipeline
              <ArrowRight className="w-5 h-5" />
            </button>

            {/* Pipeline Info */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-zinc-800">
              <div className="text-center">
                <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-xl font-bold">1</span>
                </div>
                <p className="font-medium">Tracerfy</p>
                <p className="text-sm text-zinc-400">Skip trace phones</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-xl font-bold">2</span>
                </div>
                <p className="font-medium">Trestle</p>
                <p className="text-sm text-zinc-400">Score & grade</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-xl font-bold">3</span>
                </div>
                <p className="font-medium">Ready</p>
                <p className="text-sm text-zinc-400">Campaign ready</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
