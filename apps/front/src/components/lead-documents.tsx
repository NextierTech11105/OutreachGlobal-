"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  FileText,
  Download,
  Eye,
  Plus,
  Upload,
  File,
  ImageIcon,
  FileSpreadsheet,
  FileIcon as FilePdf,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Document {
  id: string;
  name: string;
  type: "contract" | "image" | "spreadsheet" | "pdf" | "other";
  size: number; // in bytes
  uploadedAt: string;
  category?: string;
}

interface LeadDocumentsProps {
  leadId: string;
}

export function LeadDocuments({ leadId }: LeadDocumentsProps) {
  // In a real app, you would fetch this data from an API
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: "doc-1",
      name: "Property Listing Agreement.pdf",
      type: "pdf",
      size: 2457600, // 2.4 MB
      uploadedAt: "2025-05-03T15:45:00Z",
      category: "Contracts",
    },
    {
      id: "doc-2",
      name: "Property Photos.zip",
      type: "other",
      size: 15728640, // 15 MB
      uploadedAt: "2025-05-02T10:15:00Z",
      category: "Images",
    },
    {
      id: "doc-3",
      name: "Market Analysis.xlsx",
      type: "spreadsheet",
      size: 1048576, // 1 MB
      uploadedAt: "2025-04-30T14:20:00Z",
      category: "Analysis",
    },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getDocumentIcon = (type: Document["type"]) => {
    switch (type) {
      case "contract":
        return <FileText className="h-4 w-4" />;
      case "image":
        return <ImageIcon className="h-4 w-4" />;
      case "spreadsheet":
        return <FileSpreadsheet className="h-4 w-4" />;
      case "pdf":
        return <FilePdf className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
    else return (bytes / 1073741824).toFixed(1) + " GB";
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Documents</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Upload
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>
                Upload a document related to this lead.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="document-file">File</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">
                    Drag and drop your file here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports PDF, Word, Excel, Images, and more (up to 10MB)
                  </p>
                  <Input id="document-file" type="file" className="hidden" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="document-category">Category</Label>
                <Input
                  id="document-category"
                  placeholder="e.g., Contracts, Images, Analysis"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsDialogOpen(false)}>Upload</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="space-y-4 mt-4">
          {documents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No documents uploaded yet</p>
            </div>
          ) : (
            documents.map((document) => (
              <div
                key={document.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-md">
                    {getDocumentIcon(document.type)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{document.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(document.size)}</span>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(new Date(document.uploadedAt), {
                          addSuffix: true,
                        })}
                      </span>
                      {document.category && (
                        <>
                          <span>•</span>
                          <span>{document.category}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">View</span>
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                    <span className="sr-only">Download</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>
        <TabsContent value="contracts" className="space-y-4 mt-4">
          {documents.filter((d) => d.category === "Contracts").length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No contracts uploaded yet</p>
            </div>
          ) : (
            documents
              .filter((d) => d.category === "Contracts")
              .map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-md">
                      {getDocumentIcon(document.type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{document.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(document.size)}</span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(document.uploadedAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View</span>
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                      <span className="sr-only">Download</span>
                    </Button>
                  </div>
                </div>
              ))
          )}
        </TabsContent>
        <TabsContent value="images" className="space-y-4 mt-4">
          {documents.filter((d) => d.category === "Images").length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No images uploaded yet</p>
            </div>
          ) : (
            documents
              .filter((d) => d.category === "Images")
              .map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-md">
                      {getDocumentIcon(document.type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{document.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(document.size)}</span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(document.uploadedAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View</span>
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                      <span className="sr-only">Download</span>
                    </Button>
                  </div>
                </div>
              ))
          )}
        </TabsContent>
        <TabsContent value="analysis" className="space-y-4 mt-4">
          {documents.filter((d) => d.category === "Analysis").length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No analysis documents uploaded yet
              </p>
            </div>
          ) : (
            documents
              .filter((d) => d.category === "Analysis")
              .map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-md">
                      {getDocumentIcon(document.type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{document.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(document.size)}</span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(document.uploadedAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View</span>
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                      <span className="sr-only">Download</span>
                    </Button>
                  </div>
                </div>
              ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
