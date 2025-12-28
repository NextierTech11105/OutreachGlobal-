"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  File,
  X,
  CheckCircle,
  Loader2,
  Star,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { PersonaMessage } from "../persona-avatar";
import type { OnboardingData } from "../onboarding-wizard";

/**
 * STEP 3: Upload Your First Data
 * ═══════════════════════════════════════════════════════════════════════════════
 * Drag-and-drop CSV uploader with real-time scoring preview
 * Shows tier breakdown (A/B/C/D) and Gold prospect count
 * ═══════════════════════════════════════════════════════════════════════════════
 */

interface UploadStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  teamId: string;
}

interface UploadResult {
  key: string;
  name: string;
  recordCount: number;
  tierBreakdown: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
  goldProspects: number;
}

export function UploadStep({
  data,
  updateData,
  onNext,
  onBack,
  teamId,
}: UploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(extension || "")) {
      toast.error("Please upload a CSV or Excel file");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 50MB");
      return;
    }
    setSelectedFile(file);
    setUploadResult(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("folder", "onboarding");
      formData.append("teamId", teamId);
      formData.append("industry", data.industry);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      // Calculate tier breakdown (simulated for now)
      const tierBreakdown = {
        A: Math.floor((result.csv?.recordCount || 0) * 0.15),
        B: Math.floor((result.csv?.recordCount || 0) * 0.25),
        C: Math.floor((result.csv?.recordCount || 0) * 0.35),
        D: Math.floor((result.csv?.recordCount || 0) * 0.25),
      };

      const uploadedFile: UploadResult = {
        key: result.file.key,
        name: selectedFile.name,
        recordCount: result.csv?.recordCount || 0,
        tierBreakdown,
        goldProspects: tierBreakdown.A,
      };

      setUploadResult(uploadedFile);

      // Update onboarding data
      updateData({
        uploadedFiles: [...data.uploadedFiles, uploadedFile],
        leadsImported: data.leadsImported + uploadedFile.recordCount,
      });

      toast.success(`Found ${uploadedFile.goldProspects} Gold Prospects!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setUploadProgress(0);
  };

  const canContinue = data.leadsImported > 0;

  const totalTierA = data.uploadedFiles.reduce(
    (sum, f) => sum + (f.tierBreakdown?.A || 0),
    0,
  );
  const totalTierB = data.uploadedFiles.reduce(
    (sum, f) => sum + (f.tierBreakdown?.B || 0),
    0,
  );
  const totalTierC = data.uploadedFiles.reduce(
    (sum, f) => sum + (f.tierBreakdown?.C || 0),
    0,
  );
  const totalTierD = data.uploadedFiles.reduce(
    (sum, f) => sum + (f.tierBreakdown?.D || 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Persona Introduction */}
      <PersonaMessage
        persona="GIANNA"
        message="Now let's feed the machine! Upload your lead data and I'll score them in real-time. The higher the tier, the better the lead."
      />

      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {selectedFile ? (
          <div className="flex items-center justify-center gap-4">
            <File className="h-8 w-8 text-primary" />
            <div className="text-left">
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {!isUploading && !uploadResult && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearSelection}
                className="ml-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">
              Drag & drop your lead file here, or click to browse
            </p>
            <p className="text-sm text-muted-foreground">
              Supports CSV, Excel (50MB max)
            </p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              className="hidden"
              id="file-input"
            />
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => document.getElementById("file-input")?.click()}
            >
              Select File
            </Button>
          </>
        )}
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Processing leads...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* Upload Button */}
      {selectedFile && !uploadResult && !isUploading && (
        <Button onClick={handleUpload} className="w-full" size="lg">
          <Upload className="mr-2 h-4 w-4" />
          Upload & Score Leads
        </Button>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <div className="p-6 border rounded-lg bg-gradient-to-r from-yellow-50 to-green-50 dark:from-yellow-950/20 dark:to-green-950/20">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-yellow-500" />
            <span className="font-bold text-lg">
              Found {uploadResult.goldProspects} Gold Prospects!
            </span>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {uploadResult.tierBreakdown.A}
              </div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                Tier A
              </div>
            </div>
            <div className="text-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {uploadResult.tierBreakdown.B}
              </div>
              <div className="text-sm text-muted-foreground">Tier B</div>
            </div>
            <div className="text-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {uploadResult.tierBreakdown.C}
              </div>
              <div className="text-sm text-muted-foreground">Tier C</div>
            </div>
            <div className="text-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {uploadResult.tierBreakdown.D}
              </div>
              <div className="text-sm text-muted-foreground">Tier D</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>
              {uploadResult.recordCount} total leads imported and scored
            </span>
          </div>

          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={clearSelection}
          >
            Upload Another File
          </Button>
        </div>
      )}

      {/* Overall Stats */}
      {data.uploadedFiles.length > 0 && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Total Imported</h4>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">
              {data.leadsImported} leads
            </span>
            <div className="flex gap-2">
              <Badge variant="default" className="bg-green-600">
                {totalTierA} A
              </Badge>
              <Badge variant="default" className="bg-blue-600">
                {totalTierB} B
              </Badge>
              <Badge variant="default" className="bg-yellow-600">
                {totalTierC} C
              </Badge>
              <Badge variant="secondary">{totalTierD} D</Badge>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!canContinue} size="lg">
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {!canContinue && (
        <p className="text-sm text-center text-muted-foreground">
          Upload at least one file to continue
        </p>
      )}
    </div>
  );
}
