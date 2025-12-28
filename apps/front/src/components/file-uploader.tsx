"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  File,
  X,
  CheckCircle,
  Loader2,
  Tag,
  Megaphone,
} from "lucide-react";
import { toast } from "sonner";

interface SignalHouseCampaign {
  campaignId: string;
  brandId: string;
  usecase: string;
  description?: string;
  status?: string;
}

interface UploadedFile {
  key: string;
  name: string;
  size: number;
  url: string;
}

interface CSVPreview {
  headers: string[];
  recordCount: number;
  preview: Record<string, string>[];
}

interface FileUploaderProps {
  folder?: string;
  onUploadComplete?: (file: UploadedFile, csv?: CSVPreview) => void;
  onFileSelect?: (file: File) => void;
  acceptedTypes?: string;
  maxSize?: number; // in MB
}

const SOURCE_OPTIONS = [
  { value: "propwire", label: "PropWire" },
  { value: "listsource", label: "ListSource" },
  { value: "propstream", label: "PropStream" },
  { value: "reiskip", label: "REI Skip" },
  { value: "manual", label: "Manual Entry" },
  { value: "other", label: "Other" },
];

const TAG_OPTIONS = [
  "high-equity",
  "pre-foreclosure",
  "absentee-owner",
  "vacant",
  "tax-lien",
  "probate",
  "divorce",
  "inherited",
  "free-clear",
  "cash-buyer",
];

export function FileUploader({
  folder = "uploads",
  onUploadComplete,
  onFileSelect,
  acceptedTypes = ".csv,.xlsx,.xls",
  maxSize = 50, // 50MB default
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    file: UploadedFile;
    csv?: CSVPreview;
  } | null>(null);
  const [source, setSource] = useState("propwire");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [campaigns, setCampaigns] = useState<SignalHouseCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  // Fetch SignalHouse campaigns on mount
  useEffect(() => {
    async function fetchCampaigns() {
      setLoadingCampaigns(true);
      try {
        const res = await fetch("/api/signalhouse/campaign");
        const data = await res.json();
        if (data.success && data.campaigns) {
          setCampaigns(data.campaigns);
          // Auto-select first campaign if available
          if (data.campaigns.length > 0) {
            setSelectedCampaign(data.campaigns[0].campaignId);
          }
        }
      } catch (err) {
        console.error("Failed to fetch campaigns:", err);
      } finally {
        setLoadingCampaigns(false);
      }
    }
    fetchCampaigns();
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File too large. Maximum size is ${maxSize}MB`);
      return;
    }

    // Validate file type
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!acceptedTypes.includes(`.${extension}`)) {
      toast.error(`Invalid file type. Accepted: ${acceptedTypes}`);
      return;
    }

    setSelectedFile(file);
    setUploadResult(null);
    onFileSelect?.(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("No file selected");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("folder", folder);
      formData.append("source", source);
      formData.append("tags", selectedTags.join(","));
      if (selectedCampaign) {
        formData.append("campaignId", selectedCampaign);
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setUploadResult({
        file: data.file,
        csv: data.csv,
      });

      toast.success(
        `Uploaded ${selectedFile.name} (${data.csv?.recordCount || 0} records)`,
      );

      onUploadComplete?.(data.file, data.csv);
    } catch (error: any) {
      toast.error(error.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const addCustomTag = () => {
    if (customTag && !selectedTags.includes(customTag)) {
      setSelectedTags((prev) => [...prev, customTag]);
      setCustomTag("");
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setUploadResult(null);
  };

  return (
    <div className="space-y-4">
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
            <Button
              variant="ghost"
              size="icon"
              onClick={clearSelection}
              className="ml-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">
              Drag & drop your file here, or click to browse
            </p>
            <p className="text-sm text-muted-foreground">
              Supports CSV, Excel ({maxSize}MB max)
            </p>
            <Input
              type="file"
              accept={acceptedTypes}
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

      {/* Source & Tags */}
      {selectedFile && !uploadResult && (
        <div className="space-y-4 p-4 border rounded-lg">
          {/* Campaign Selector */}
          <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Label className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-blue-600" />
              SignalHouse Campaign
            </Label>
            <Select
              value={selectedCampaign}
              onValueChange={setSelectedCampaign}
              disabled={loadingCampaigns}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingCampaigns
                      ? "Loading campaigns..."
                      : "Select campaign"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem
                    key={campaign.campaignId}
                    value={campaign.campaignId}
                  >
                    <div className="flex items-center gap-2">
                      <span>{campaign.campaignId}</span>
                      {campaign.status && (
                        <Badge
                          variant={
                            campaign.status === "ACTIVE"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {campaign.status}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
                {campaigns.length === 0 && !loadingCampaigns && (
                  <SelectItem value="none" disabled>
                    No campaigns found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Leads will be assigned to this SignalHouse campaign for messaging
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Custom Tag</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom tag"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomTag()}
                />
                <Button variant="outline" size="icon" onClick={addCustomTag}>
                  <Tag className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags (click to toggle)</Label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
              {selectedTags
                .filter((t) => !TAG_OPTIONS.includes(t))
                .map((tag) => (
                  <Badge
                    key={tag}
                    variant="default"
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
            </div>
          </div>

          <Button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading to DigitalOcean Spaces...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload to Data Lake
              </>
            )}
          </Button>
        </div>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-600">Upload Complete</span>
          </div>

          <div className="space-y-2 text-sm">
            <p>
              <strong>Records:</strong> {uploadResult.csv?.recordCount || 0}
            </p>
            <p>
              <strong>Source:</strong> {source}
            </p>
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <strong>Tags:</strong>
                {selectedTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* CSV Preview */}
          {uploadResult.csv && uploadResult.csv.preview.length > 0 && (
            <div className="mt-4">
              <p className="font-medium mb-2">Preview (first 5 rows):</p>
              <div className="overflow-auto max-h-40 border rounded">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      {uploadResult.csv.headers.slice(0, 6).map((h) => (
                        <th key={h} className="p-1 text-left">
                          {h}
                        </th>
                      ))}
                      {uploadResult.csv.headers.length > 6 && (
                        <th className="p-1">...</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {uploadResult.csv.preview.map((row, i) => (
                      <tr key={i} className="border-t">
                        {uploadResult.csv!.headers.slice(0, 6).map((h) => (
                          <td key={h} className="p-1 truncate max-w-[100px]">
                            {row[h] || "-"}
                          </td>
                        ))}
                        {uploadResult.csv!.headers.length > 6 && (
                          <td className="p-1">...</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={clearSelection}
          >
            Upload Another File
          </Button>
        </div>
      )}
    </div>
  );
}
