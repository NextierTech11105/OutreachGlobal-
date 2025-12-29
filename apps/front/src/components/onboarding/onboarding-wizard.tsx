"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Zap,
  Rocket,
  CheckCircle,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * BUILD YOUR MACHINE - 3 Simple Steps
 * ═══════════════════════════════════════════════════════════════════════════════
 * 1. Upload CSV → Drop your leads
 * 2. Set Capacity → Pick daily SMS limit
 * 3. Launch → Hit the button
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface OnboardingData {
  uploadedFile: {
    name: string;
    recordCount: number;
  } | null;
  dailyCapacity: number;
  launched: boolean;
}

const INITIAL_DATA: OnboardingData = {
  uploadedFile: null,
  dailyCapacity: 1000,
  launched: false,
};

const CAPACITY_OPTIONS = [
  { value: 500, label: "500/day", description: "Conservative start" },
  { value: 1000, label: "1,000/day", description: "Recommended" },
  { value: 2000, label: "2,000/day", description: "Maximum throughput" },
];

interface OnboardingWizardProps {
  teamId?: string;
  onComplete?: (data: OnboardingData) => void;
}

export function OnboardingWizard({
  teamId = "default_team",
  onComplete,
}: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [isUploading, setIsUploading] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const progress = ((currentStep + 1) / 3) * 100;

  const nextStep = () => {
    if (currentStep < 2) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("teamId", teamId);

      const response = await fetch("/api/buckets/upload-csv", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();

      setData((prev) => ({
        ...prev,
        uploadedFile: {
          name: file.name,
          recordCount: result.recordCount || 0,
        },
      }));

      toast.success(
        `Uploaded ${result.recordCount?.toLocaleString() || 0} leads`,
      );
      nextStep();
    } catch (error) {
      toast.error("Upload failed. Try again.");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Handle launch
  const handleLaunch = async () => {
    setIsLaunching(true);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          data: { ...data, launched: true },
          completed: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Launch failed");
      }

      setData((prev) => ({ ...prev, launched: true }));
      toast.success("Your machine is LIVE!");
      onComplete?.({ ...data, launched: true });
    } catch (error) {
      toast.error("Launch failed. Try again.");
      console.error(error);
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
      <div className="container max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3">Build Your Machine</h1>
          <p className="text-lg text-muted-foreground">
            3 steps. 2 minutes. Let's go.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Step {currentStep + 1} of 3</span>
            <span className="text-muted-foreground">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center gap-8 mb-10">
          {[
            { icon: Upload, label: "Upload" },
            { icon: Zap, label: "Capacity" },
            { icon: Rocket, label: "Launch" },
          ].map((step, i) => (
            <div
              key={i}
              className={cn(
                "flex flex-col items-center gap-2",
                i === currentStep && "text-primary",
                i < currentStep && "text-green-500",
                i > currentStep && "text-muted-foreground",
              )}
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all",
                  i === currentStep && "border-primary bg-primary/10",
                  i < currentStep && "border-green-500 bg-green-500/10",
                  i > currentStep && "border-muted",
                )}
              >
                {i < currentStep ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <step.icon className="h-6 w-6" />
                )}
              </div>
              <span className="text-sm font-medium">{step.label}</span>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="shadow-xl">
          <CardContent className="p-8">
            {/* Step 1: Upload */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">Drop Your Leads</h2>
                  <p className="text-muted-foreground">
                    Upload a CSV with your contact list
                  </p>
                </div>

                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer",
                    isDragging && "border-primary bg-primary/5",
                    !isDragging && "border-muted hover:border-primary/50",
                  )}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <p className="text-lg">Uploading...</p>
                    </div>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium mb-2">
                        Drag & drop your CSV here
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        or click to browse
                      </p>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                        className="hidden"
                        id="csv-upload"
                      />
                      <label htmlFor="csv-upload">
                        <Button variant="outline" asChild>
                          <span>Select File</span>
                        </Button>
                      </label>
                    </>
                  )}
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  CSV should have: Name, Phone, Email, Company (optional)
                </p>
              </div>
            )}

            {/* Step 2: Capacity */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">
                    Set Daily Capacity
                  </h2>
                  <p className="text-muted-foreground">
                    How many SMS should we send per day?
                  </p>
                </div>

                {data.uploadedFile && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-2" />
                    <p className="font-medium">{data.uploadedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {data.uploadedFile.recordCount.toLocaleString()} leads
                      ready
                    </p>
                  </div>
                )}

                <div className="grid gap-4">
                  {CAPACITY_OPTIONS.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() =>
                        setData((prev) => ({
                          ...prev,
                          dailyCapacity: option.value,
                        }))
                      }
                      className={cn(
                        "p-6 rounded-xl border-2 text-left transition-all",
                        data.dailyCapacity === option.value
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-primary/50",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xl font-bold">{option.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {option.description}
                          </p>
                        </div>
                        {data.dailyCapacity === option.value && (
                          <CheckCircle className="h-6 w-6 text-primary" />
                        )}
                        {option.value === 1000 && (
                          <Badge className="bg-primary">Recommended</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    className="flex-1"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={nextStep} className="flex-1">
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Launch */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">Ready to Launch</h2>
                  <p className="text-muted-foreground">
                    Review and hit the button
                  </p>
                </div>

                {/* Summary */}
                <div className="bg-muted/50 rounded-xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Leads</span>
                    <span className="font-bold">
                      {data.uploadedFile?.recordCount.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Daily SMS</span>
                    <span className="font-bold">
                      {data.dailyCapacity.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">
                      Days to complete
                    </span>
                    <span className="font-bold">
                      {data.uploadedFile
                        ? Math.ceil(
                            data.uploadedFile.recordCount / data.dailyCapacity,
                          )
                        : "-"}
                    </span>
                  </div>
                </div>

                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-6">
                    GIANNA, CATHY & SABRINA will handle all responses
                    automatically
                  </p>

                  <Button
                    size="lg"
                    onClick={handleLaunch}
                    disabled={isLaunching || !data.uploadedFile}
                    className="w-full py-6 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {isLaunching ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Launching...
                      </>
                    ) : (
                      <>
                        <Rocket className="h-5 w-5 mr-2" />
                        LAUNCH YOUR MACHINE
                      </>
                    )}
                  </Button>
                </div>

                <Button variant="ghost" onClick={prevStep} className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
