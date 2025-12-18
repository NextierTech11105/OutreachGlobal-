"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState("business");
  const [batchSize, setBatchSize] = useState("500");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", importType);
      formData.append("batchSize", batchSize);

      const response = await fetch("/api/datalake/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
        setFile(null);
      } else {
        setError(data.error || "Import failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Import USBizData CSV</CardTitle>
          <CardDescription>
            Upload CSV files from USBizData to import businesses or contacts directly into your database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Input */}
          <div className="space-y-2">
            <Label htmlFor="file">CSV File</Label>
            <Input
              id="file"
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={uploading}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Import Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Import Type</Label>
            <Select value={importType} onValueChange={setImportType} disabled={uploading}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="business">Business Records</SelectItem>
                <SelectItem value="contact">Contact Records</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Batch Size */}
          <div className="space-y-2">
            <Label htmlFor="batchSize">Batch Size</Label>
            <Input
              id="batchSize"
              type="number"
              value={batchSize}
              onChange={(e) => setBatchSize(e.target.value)}
              disabled={uploading}
              min="10"
              max="1000"
            />
            <p className="text-sm text-muted-foreground">
              Number of records to process at once (10-1000)
            </p>
          </div>

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full"
            size="lg"
          >
            {uploading ? "Uploading..." : "Import to Database"}
          </Button>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Display */}
          {result && (
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">{result.message}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Rows:</p>
                      <p className="font-mono">{result.stats.totalRows.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Imported:</p>
                      <p className="font-mono text-green-600">{result.stats.inserted.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Errors:</p>
                      <p className="font-mono text-red-600">{result.stats.errors.toLocaleString()}</p>
                    </div>
                  </div>
                  {result.errors && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground">First few errors:</p>
                      <ul className="list-disc list-inside text-xs font-mono space-y-1 mt-1">
                        {result.errors.map((err: string, i: number) => (
                          <li key={i} className="text-red-600">{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <div className="mt-8 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Supported Fields</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="font-medium">Business Data:</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  <li>Company Name*</li>
                  <li>Contact Name</li>
                  <li>Phone Number</li>
                  <li>Email Address</li>
                  <li>Street Address</li>
                  <li>City, State, Zip</li>
                  <li>County</li>
                </ul>
              </div>
              <div>
                <p className="font-medium">Additional:</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  <li>Website URL</li>
                  <li>Number of Employees</li>
                  <li>Annual Revenue</li>
                  <li>SIC Code</li>
                  <li>SIC Description</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              * Required field. Field names are case-insensitive and support multiple variations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
