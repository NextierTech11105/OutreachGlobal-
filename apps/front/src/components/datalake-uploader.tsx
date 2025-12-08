"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileSpreadsheet, Building2, Users, Phone, Mail, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

// B2B Sectors for sector upload
const B2B_SECTORS = {
  "professional-services": { name: "Professional Services", description: "Law, accounting, consulting" },
  "healthcare-medical": { name: "Healthcare & Medical", description: "Doctors, dentists, clinics" },
  "restaurants-food": { name: "Restaurants & Food", description: "Restaurants, bars, catering" },
  "construction-contractors": { name: "Construction", description: "Plumbers, electricians, GCs" },
  "automotive": { name: "Automotive", description: "Dealers, repair shops" },
  "manufacturing": { name: "Manufacturing", description: "Factories, production" },
  "transportation-logistics": { name: "Transportation", description: "Trucking, freight" },
  "retail-stores": { name: "Retail", description: "Grocery, clothing, hardware" },
  "financial-services": { name: "Financial", description: "Banks, insurance, mortgage" },
  "real-estate": { name: "Real Estate", description: "Agents, property mgmt" },
  "hotels-hospitality": { name: "Hospitality", description: "Hotels, motels, venues" },
  "personal-services": { name: "Personal Services", description: "Salons, spas" },
  "business-services": { name: "Business Services", description: "IT, staffing, janitorial" },
  "education-training": { name: "Education", description: "Schools, training" },
  "recreation-entertainment": { name: "Recreation", description: "Gyms, theaters" },
};

// General data schemas
const DATA_SCHEMAS = {
  ny_residential: { name: "NY Residential", description: "15.8M residents - phone, email, demographics", icon: Users },
  ny_cell_phone: { name: "NY Cell Phones", description: "5.1M cell phones for SMS", icon: Phone },
  ny_optin_email: { name: "NY Opt-in Emails", description: "7.3M opt-in emails", icon: Mail },
  ny_business: { name: "NY Business", description: "5.5M businesses by SIC", icon: Building2 },
};

interface UploadResult {
  success: boolean;
  message?: string;
  error?: string;
  details?: {
    key?: string;
    sector?: string;
    schema?: string;
    fileSize?: number;
    fileSizeFormatted?: string;
  };
}

export function DatalakeUploader() {
  const [activeTab, setActiveTab] = useState("sector");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSector, setSelectedSector] = useState("");
  const [selectedSchema, setSelectedSchema] = useState("");
  const [notes, setNotes] = useState("");
  const [recordCount, setRecordCount] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [initResult, setInitResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      setUploadResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
  });

  const initializeBuckets = async () => {
    setIsInitializing(true);
    setInitResult(null);
    try {
      const res = await fetch("/api/buckets/init", { method: "POST" });
      const data = await res.json();
      setInitResult({
        success: data.success,
        message: data.success
          ? `Initialized ${data.stats?.created || 0} folders (${data.stats?.skipped || 0} already existed)`
          : data.error || "Initialization failed",
      });
    } catch (err) {
      setInitResult({ success: false, message: String(err) });
    }
    setIsInitializing(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    if (activeTab === "sector" && !selectedSector) {
      setUploadResult({ success: false, error: "Please select a sector" });
      return;
    }

    if (activeTab === "general" && !selectedSchema) {
      setUploadResult({ success: false, error: "Please select a schema" });
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("notes", notes);
      if (recordCount) formData.append("recordCount", recordCount);

      let endpoint = "/api/datalake/upload";
      if (activeTab === "sector") {
        endpoint = "/api/datalake/sector-upload";
        formData.append("sector", selectedSector);
      } else {
        formData.append("schemaId", selectedSchema);
      }

      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setUploadResult(data);

      if (data.success) {
        setSelectedFile(null);
        setNotes("");
        setRecordCount("");
      }
    } catch (err) {
      setUploadResult({ success: false, error: String(err) });
    }

    setIsUploading(false);
  };

  return (
    <div className="space-y-6">
      {/* Initialize Buckets Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Initialize Storage</CardTitle>
          <CardDescription>
            First-time setup: Create all folder structures in DigitalOcean Spaces
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Button onClick={initializeBuckets} disabled={isInitializing} variant="outline">
            {isInitializing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Initializing...</>
            ) : (
              "Initialize Buckets"
            )}
          </Button>
          {initResult && (
            <Alert className={`flex-1 ${initResult.success ? "border-green-500" : "border-red-500"}`}>
              <AlertDescription className="flex items-center gap-2">
                {initResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                {initResult.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Upload Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sector">
            <Building2 className="mr-2 h-4 w-4" />
            B2B Sector Upload
          </TabsTrigger>
          <TabsTrigger value="general">
            <Users className="mr-2 h-4 w-4" />
            General Data Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sector" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload to B2B Sector</CardTitle>
              <CardDescription>
                Upload CSV lists organized by industry sector (construction, restaurants, healthcare, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Sector</Label>
                <Select value={selectedSector} onValueChange={setSelectedSector}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a sector..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(B2B_SECTORS).map(([id, sector]) => (
                      <SelectItem key={id} value={id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{sector.name}</span>
                          <span className="text-muted-foreground text-xs">- {sector.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSector && (
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">
                    {B2B_SECTORS[selectedSector as keyof typeof B2B_SECTORS]?.name}
                  </Badge>
                  <Badge variant="secondary">
                    Path: datalake/business/ny/sectors/{selectedSector}/raw/
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload General Data</CardTitle>
              <CardDescription>
                Upload residential, phone, email, or business databases
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(DATA_SCHEMAS).map(([id, schema]) => {
                  const Icon = schema.icon;
                  return (
                    <div
                      key={id}
                      onClick={() => setSelectedSchema(id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedSchema === id
                          ? "border-primary bg-primary/5"
                          : "hover:border-muted-foreground/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{schema.name}</div>
                          <div className="text-xs text-muted-foreground">{schema.description}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
          >
            <input {...getInputProps()} />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-green-500" />
                <div className="text-left">
                  <div className="font-medium">{selectedFile.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                <div>
                  <span className="font-medium">Drop your CSV here</span> or click to browse
                </div>
                <div className="text-sm text-muted-foreground">CSV files only</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Record Count (optional)</Label>
              <Input
                type="number"
                placeholder="e.g., 15000"
                value={recordCount}
                onChange={(e) => setRecordCount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="e.g., NY Plumbers Q4 2024"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full"
            size="lg"
          >
            {isUploading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="mr-2 h-4 w-4" /> Upload to Datalake</>
            )}
          </Button>

          {uploadResult && (
            <Alert className={uploadResult.success ? "border-green-500" : "border-red-500"}>
              <AlertDescription>
                <div className="flex items-start gap-2">
                  {uploadResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  )}
                  <div>
                    <div className="font-medium">
                      {uploadResult.success ? "Upload Successful!" : "Upload Failed"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {uploadResult.message || uploadResult.error}
                    </div>
                    {uploadResult.details && (
                      <div className="mt-2 text-xs space-y-1">
                        {uploadResult.details.key && (
                          <div>Path: {uploadResult.details.key}</div>
                        )}
                        {uploadResult.details.fileSizeFormatted && (
                          <div>Size: {uploadResult.details.fileSizeFormatted}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default DatalakeUploader;
