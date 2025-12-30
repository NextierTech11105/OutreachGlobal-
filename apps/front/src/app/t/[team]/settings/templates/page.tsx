"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  MessageSquare,
  RefreshCw,
  Bell,
  Calendar,
  Loader2,
  Upload,
  Download,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrentTeam } from "@/features/team/team.context";
import { ATLANTIC_COAST_LIBRARY, ATLANTIC_COAST_MERGE_FIELDS } from "@/lib/gianna/knowledge-base/atlantic-coast-library";

// Template categories
const CATEGORIES = [
  { id: "carrier_initial", name: "Carrier - Initial", stage: "initial", agent: "GIANNA" },
  { id: "carrier_nudge", name: "Carrier - Nudge", stage: "nudge", agent: "CATHY" },
  { id: "carrier_appointment", name: "Carrier - Appointment", stage: "appointment", agent: "SABRINA" },
  { id: "carrier_retarget", name: "Carrier - Retarget", stage: "retarget", agent: "GIANNA" },
  { id: "dealership_initial", name: "Dealership - Initial", stage: "initial", agent: "GIANNA" },
  { id: "moving_company_initial", name: "Moving Company - Initial", stage: "initial", agent: "GIANNA" },
  { id: "custom", name: "Custom", stage: null, agent: null },
];

// Stage info
const STAGES = {
  initial: { name: "Initial", icon: MessageSquare, color: "bg-blue-500" },
  nudge: { name: "Nudge", icon: Bell, color: "bg-yellow-500" },
  retarget: { name: "Retarget", icon: RefreshCw, color: "bg-orange-500" },
  appointment: { name: "Appointment", icon: Calendar, color: "bg-green-500" },
};

interface Template {
  id: string;
  teamId: string;
  name: string;
  content: string;
  category: string;
  stage: string | null;
  agent: string | null;
  mergeFields: string[];
  sendCount: number;
  responseCount: number;
  conversionCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function TemplatesPage() {
  const { toast } = useToast();
  const { teamId, isTeamReady } = useCurrentTeam();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    content: "",
    category: "",
    stage: "",
    agent: "",
  });

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    if (!teamId) return;

    try {
      setIsLoading(true);
      const url = selectedCategory
        ? `/api/t/${teamId}/template-library?category=${selectedCategory}`
        : `/api/t/${teamId}/template-library`;

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setTemplates(result.data || []);
      }
    } catch (error) {
      console.error("Fetch templates error:", error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [teamId, selectedCategory, toast]);

  useEffect(() => {
    if (isTeamReady) {
      fetchTemplates();
    }
  }, [isTeamReady, fetchTemplates]);

  // Filter templates
  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by category
  const groupedTemplates = filteredTemplates.reduce((acc, t) => {
    const cat = t.category || "custom";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {} as Record<string, Template[]>);

  // Handlers
  const handleCreateTemplate = () => {
    setCurrentTemplate(null);
    setFormData({ name: "", content: "", category: "", stage: "", agent: "" });
    setIsModalOpen(true);
  };

  const handleEditTemplate = (template: Template) => {
    setCurrentTemplate(template);
    setFormData({
      name: template.name,
      content: template.content,
      category: template.category,
      stage: template.stage || "",
      agent: template.agent || "",
    });
    setIsModalOpen(true);
  };

  const handlePreviewTemplate = (template: Template) => {
    setCurrentTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!teamId || !formData.name || !formData.content || !formData.category) {
      toast({
        title: "Error",
        description: "Name, content, and category are required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const mergeFields = extractMergeFields(formData.content);

      if (currentTemplate) {
        // Update
        const response = await fetch(`/api/t/${teamId}/template-library/${currentTemplate.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, mergeFields }),
        });
        const result = await response.json();

        if (result.success) {
          setTemplates(templates.map((t) =>
            t.id === currentTemplate.id ? result.data : t
          ));
          toast({ title: "Template updated" });
        }
      } else {
        // Create
        const response = await fetch(`/api/t/${teamId}/template-library`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, mergeFields }),
        });
        const result = await response.json();

        if (result.success) {
          setTemplates([...templates, result.data]);
          toast({ title: "Template created" });
        }
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Save template error:", error);
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!teamId) return;

    try {
      const response = await fetch(`/api/t/${teamId}/template-library/${templateId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        setTemplates(templates.filter((t) => t.id !== templateId));
        toast({ title: "Template deleted" });
      }
    } catch (error) {
      console.error("Delete template error:", error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const handleCopyTemplate = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: "Copied to clipboard" });
  };

  const handleImportAtlanticCoast = async () => {
    if (!teamId) return;

    setIsSaving(true);
    try {
      // Prepare templates from Atlantic Coast library
      const templatesData: Array<{
        name: string;
        content: string;
        category: string;
        stage: string;
        agent: string;
        mergeFields: string[];
      }> = [];

      // Add initial templates
      ATLANTIC_COAST_LIBRARY.initial.templates.forEach((t) => {
        templatesData.push({
          name: t.name,
          content: t.content,
          category: "carrier_initial",
          stage: "initial",
          agent: "GIANNA",
          mergeFields: t.mergeFields,
        });
      });

      // Add nudge templates
      ATLANTIC_COAST_LIBRARY.nudge.templates.forEach((t) => {
        templatesData.push({
          name: t.name,
          content: t.content,
          category: "carrier_nudge",
          stage: "nudge",
          agent: "CATHY",
          mergeFields: t.mergeFields,
        });
      });

      // Add appointment templates
      ATLANTIC_COAST_LIBRARY.appointment.templates.forEach((t) => {
        templatesData.push({
          name: t.name,
          content: t.content,
          category: "carrier_appointment",
          stage: "appointment",
          agent: "SABRINA",
          mergeFields: t.mergeFields,
        });
      });

      // Add retarget templates
      ATLANTIC_COAST_LIBRARY.retarget.templates.forEach((t) => {
        templatesData.push({
          name: t.name,
          content: t.content,
          category: "carrier_retarget",
          stage: "retarget",
          agent: "GIANNA",
          mergeFields: t.mergeFields,
        });
      });

      // Bulk import
      const response = await fetch(`/api/t/${teamId}/template-library/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templates: templatesData, source: "atlantic-coast" }),
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: "Templates imported",
          description: `Successfully imported ${result.count} Atlantic Coast templates`,
        });
        fetchTemplates();
      }
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Error",
        description: "Failed to import templates",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setIsImportModalOpen(false);
    }
  };

  // Extract merge fields from content
  const extractMergeFields = (content: string): string[] => {
    const regex = /\{([^}]+)\}/g;
    const fields: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      const field = match[1].trim();
      if (!fields.includes(field)) fields.push(field);
    }
    return fields;
  };

  // Preview with sample data
  const previewContent = (content: string): string => {
    let preview = content;
    Object.entries(ATLANTIC_COAST_MERGE_FIELDS).forEach(([key, config]) => {
      preview = preview.replace(new RegExp(`\\{${key}\\}`, "g"), config.example);
    });
    return preview;
  };

  if (!isTeamReady) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Template Library</h1>
          <p className="text-muted-foreground mt-2">
            Manage SMS templates for your outreach campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import Templates
          </Button>
          <Button onClick={handleCreateTemplate}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCategory || "all"} onValueChange={(v) => setSelectedCategory(v === "all" ? null : v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No templates found</p>
            <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import Atlantic Coast Templates
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => {
            const catInfo = CATEGORIES.find((c) => c.id === category);
            const stageInfo = catInfo?.stage ? STAGES[catInfo.stage as keyof typeof STAGES] : null;

            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-semibold">{catInfo?.name || category}</h2>
                  {catInfo?.agent && (
                    <Badge variant="secondary">{catInfo.agent}</Badge>
                  )}
                  {stageInfo && (
                    <Badge variant="outline" className="gap-1">
                      <stageInfo.icon className="h-3 w-3" />
                      {stageInfo.name}
                    </Badge>
                  )}
                  <Badge variant="outline">{categoryTemplates.length} templates</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryTemplates.map((template) => (
                    <Card key={template.id} className="hover:border-primary transition-colors">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium">{template.name}</CardTitle>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreviewTemplate(template)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyTemplate(template.content)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditTemplate(template)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDeleteTemplate(template.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-3">{template.content}</p>
                        <div className="flex flex-wrap gap-1 mt-3">
                          {template.mergeFields?.map((field) => (
                            <Badge key={field} variant="outline" className="text-xs">
                              {`{${field}}`}
                            </Badge>
                          ))}
                        </div>
                        {template.sendCount > 0 && (
                          <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                            <span>Sent: {template.sendCount}</span>
                            <span>Response: {template.responseCount}</span>
                            <span>Conv: {template.conversionCount}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{currentTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
            <DialogDescription>
              {currentTemplate ? "Update the template details below" : "Create a new SMS template for your outreach"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Template name"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => {
                  const cat = CATEGORIES.find((c) => c.id === v);
                  setFormData({
                    ...formData,
                    category: v,
                    stage: cat?.stage || "",
                    agent: cat?.agent || "",
                  });
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select value={formData.stage} onValueChange={(v) => setFormData({ ...formData, stage: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initial">Initial</SelectItem>
                    <SelectItem value="nudge">Nudge</SelectItem>
                    <SelectItem value="retarget">Retarget</SelectItem>
                    <SelectItem value="appointment">Appointment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Agent</Label>
                <Select value={formData.agent} onValueChange={(v) => setFormData({ ...formData, agent: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GIANNA">GIANNA</SelectItem>
                    <SelectItem value="CATHY">CATHY</SelectItem>
                    <SelectItem value="SABRINA">SABRINA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Content</Label>
                <span className="text-xs text-muted-foreground">
                  {formData.content.length} / 160 chars
                </span>
              </div>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Template content with {merge_fields}"
                rows={4}
              />
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground">Available fields:</span>
                {Object.keys(ATLANTIC_COAST_MERGE_FIELDS).map((field) => (
                  <Badge
                    key={field}
                    variant="outline"
                    className="text-xs cursor-pointer hover:bg-secondary"
                    onClick={() => setFormData({ ...formData, content: formData.content + `{${field}}` })}
                  >
                    {`{${field}}`}
                  </Badge>
                ))}
              </div>
            </div>
            {formData.content && (
              <div className="space-y-2 p-3 bg-muted rounded-lg">
                <Label className="text-xs">Preview</Label>
                <p className="text-sm">{previewContent(formData.content)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTemplate} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {currentTemplate ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>{currentTemplate?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm whitespace-pre-wrap">
                {currentTemplate ? previewContent(currentTemplate.content) : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {currentTemplate?.mergeFields?.map((field) => (
                <Badge key={field} variant="secondary" className="text-xs">
                  {field}: {ATLANTIC_COAST_MERGE_FIELDS[field as keyof typeof ATLANTIC_COAST_MERGE_FIELDS]?.example || "N/A"}
                </Badge>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Templates</DialogTitle>
            <DialogDescription>Import pre-built templates for your outreach campaigns</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={handleImportAtlanticCoast}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <MessageSquare className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Atlantic Coast Auto Transport</h3>
                    <p className="text-sm text-muted-foreground">
                      15 templates for carrier partnerships (Initial, Nudge, Appointment, Retarget)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
