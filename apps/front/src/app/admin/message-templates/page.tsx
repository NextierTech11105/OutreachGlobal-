"use client";

import { sf } from "@/lib/utils/safe-format";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  MessageSquare,
  TrendingUp,
  Eye,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface TemplateData {
  content: string;
  category: string;
  timesUsed: number;
  responseRate: number;
  isActive: boolean;
}

interface MessageTemplate {
  id: string;
  teamId: string;
  name: string;
  type: string;
  data: TemplateData;
  createdAt: string;
  updatedAt: string;
}

const categories = [
  "INTRODUCTION",
  "FOLLOW_UP",
  "PROPERTY_SPECIFIC",
  "MARKET_UPDATE",
  "RE_ENGAGEMENT",
  "SEASONAL",
];

const tokens = [
  { token: "{{firstName}}", desc: "Lead's first name" },
  { token: "{{lastName}}", desc: "Lead's last name" },
  { token: "{{company}}", desc: "Company name" },
  { token: "{{propertyAddress}}", desc: "Property address" },
  { token: "{{city}}", desc: "Property city" },
  { token: "{{state}}", desc: "Property state" },
  { token: "{{equity}}", desc: "Estimated equity" },
  { token: "{{phone}}", desc: "Lead's phone" },
  { token: "{{email}}", desc: "Lead's email" },
];

// Default team ID for admin - in production, get from session
const DEFAULT_TEAM_ID = "admin";

export default function MessageTemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "",
    content: "",
  });

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/message-templates?teamId=${DEFAULT_TEAM_ID}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setTemplates(result.data);
      } else {
        console.error("Failed to fetch templates:", result.error);
        toast.error("Failed to load templates");
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newTemplate.name || !newTemplate.content) {
      toast.error("Name and content are required");
      return;
    }

    setIsSaving(true);
    try {
      if (editingTemplate) {
        // Update existing template
        const response = await fetch("/api/message-templates", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingTemplate.id,
            name: newTemplate.name,
            content: newTemplate.content,
            category: newTemplate.category,
          }),
        });

        if (response.ok) {
          toast.success("Template updated!");
          await fetchTemplates();
        } else {
          const result = await response.json();
          toast.error(result.error || "Failed to update template");
        }
      } else {
        // Create new template
        const response = await fetch("/api/message-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamId: DEFAULT_TEAM_ID,
            name: newTemplate.name,
            content: newTemplate.content,
            category: newTemplate.category,
            type: "sms",
          }),
        });

        if (response.ok) {
          toast.success("Template created!");
          await fetchTemplates();
        } else {
          const result = await response.json();
          toast.error(result.error || "Failed to create template");
        }
      }

      setIsOpen(false);
      setNewTemplate({ name: "", category: "", content: "" });
      setEditingTemplate(null);
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const response = await fetch(`/api/message-templates?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Template deleted");
        setTemplates(templates.filter((t) => t.id !== id));
      } else {
        const result = await response.json();
        toast.error(result.error || "Failed to delete template");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete template");
    }
  };

  const duplicateTemplate = async (template: MessageTemplate) => {
    try {
      const response = await fetch("/api/message-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: DEFAULT_TEAM_ID,
          name: `${template.name} (Copy)`,
          content: template.data.content,
          category: template.data.category,
          type: template.type,
        }),
      });

      if (response.ok) {
        toast.success("Template duplicated!");
        await fetchTemplates();
      } else {
        const result = await response.json();
        toast.error(result.error || "Failed to duplicate template");
      }
    } catch (error) {
      console.error("Duplicate error:", error);
      toast.error("Failed to duplicate template");
    }
  };

  const getTemplateContent = (t: MessageTemplate) => t.data?.content || "";
  const getTemplateCategory = (t: MessageTemplate) => t.data?.category || "general";
  const getTimesUsed = (t: MessageTemplate) => t.data?.timesUsed || 0;
  const getResponseRate = (t: MessageTemplate) => t.data?.responseRate || 0;
  const getIsActive = (t: MessageTemplate) => t.data?.isActive !== false;

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Message Templates</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage SMS/email templates for campaigns
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit Template" : "Create New Template"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input
                    value={newTemplate.name}
                    onChange={(e) =>
                      setNewTemplate({ ...newTemplate, name: e.target.value })
                    }
                    placeholder="e.g., Initial Outreach"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={newTemplate.category}
                    onValueChange={(value) =>
                      setNewTemplate({ ...newTemplate, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Message Content</Label>
                <Textarea
                  value={newTemplate.content}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, content: e.target.value })
                  }
                  placeholder="Hi {{firstName}}, I noticed your property..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  {newTemplate.content.length} characters
                </p>
              </div>

              <div className="space-y-2">
                <Label>Available Tokens</Label>
                <div className="flex flex-wrap gap-2">
                  {tokens.map(({ token, desc }) => (
                    <Button
                      key={token}
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setNewTemplate({
                          ...newTemplate,
                          content: newTemplate.content + token,
                        })
                      }
                    >
                      {token}
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({desc})
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingTemplate ? "Save Changes" : "Create Template"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Total Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Total Sends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sf(templates.reduce((sum, t) => sum + getTimesUsed(t), 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Response Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {templates.length > 0
                ? (
                    templates.reduce((sum, t) => sum + getResponseRate(t), 0) /
                    templates.length
                  ).toFixed(1)
                : "0"}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Templates</CardTitle>
          <CardDescription>
            {templates.filter((t) => getIsActive(t)).length} active templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead className="text-right">Used</TableHead>
                  <TableHead className="text-right">Response</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-12 text-muted-foreground"
                    >
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No Templates Yet</p>
                      <p className="text-sm">
                        Create your first message template to get started
                      </p>
                    </TableCell>
                  </TableRow>
                ) : null}
                {templates.map((template) => (
                  <TableRow
                    key={template.id}
                    className={!getIsActive(template) ? "opacity-50" : ""}
                  >
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getTemplateCategory(template).replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                      {getTemplateContent(template)}
                    </TableCell>
                    <TableCell className="text-right">
                      {sf(getTimesUsed(template))}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          getResponseRate(template) > 10 ? "text-green-500" : ""
                        }
                      >
                        {getResponseRate(template)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingTemplate(template);
                            setNewTemplate({
                              name: template.name,
                              category: getTemplateCategory(template),
                              content: getTemplateContent(template),
                            });
                            setIsOpen(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => duplicateTemplate(template)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTemplate(template.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
