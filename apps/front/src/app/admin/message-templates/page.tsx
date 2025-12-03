"use client";

import { useState } from "react";
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
} from "lucide-react";

interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  timesUsed: number;
  responseRate: number;
  isActive: boolean;
}

const defaultTemplates: MessageTemplate[] = [
  {
    id: "1",
    name: "Initial Property Inquiry",
    category: "INTRODUCTION",
    content: "Hi {{firstName}}, I noticed your property at {{propertyAddress}}. Are you considering selling? I have buyers looking in {{city}}.",
    timesUsed: 1234,
    responseRate: 12.5,
    isActive: true,
  },
  {
    id: "2",
    name: "Follow-up - No Response",
    category: "FOLLOW_UP",
    content: "Hi {{firstName}}, just following up on my previous message about {{propertyAddress}}. Would you have a few minutes to chat?",
    timesUsed: 856,
    responseRate: 8.2,
    isActive: true,
  },
  {
    id: "3",
    name: "Equity Offer",
    category: "PROPERTY_SPECIFIC",
    content: "{{firstName}}, based on current market data, your property at {{propertyAddress}} may have significant equity. Interested in a no-obligation estimate?",
    timesUsed: 567,
    responseRate: 15.7,
    isActive: true,
  },
  {
    id: "4",
    name: "Market Update",
    category: "MARKET_UPDATE",
    content: "Hi {{firstName}}, properties in {{city}} are moving fast! Homes similar to yours at {{propertyAddress}} are selling above asking. Curious what yours is worth?",
    timesUsed: 432,
    responseRate: 11.3,
    isActive: false,
  },
];

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

export default function MessageTemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>(defaultTemplates);
  const [isOpen, setIsOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({ name: "", category: "", content: "" });

  const handleSave = () => {
    if (editingTemplate) {
      setTemplates(templates.map(t =>
        t.id === editingTemplate.id ? { ...editingTemplate, ...newTemplate } : t
      ));
    } else {
      setTemplates([...templates, {
        id: `${Date.now()}`,
        ...newTemplate,
        timesUsed: 0,
        responseRate: 0,
        isActive: true,
      }]);
    }
    setIsOpen(false);
    setNewTemplate({ name: "", category: "", content: "" });
    setEditingTemplate(null);
  };

  const deleteTemplate = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
  };

  const duplicateTemplate = (template: MessageTemplate) => {
    setTemplates([...templates, {
      ...template,
      id: `${Date.now()}`,
      name: `${template.name} (Copy)`,
      timesUsed: 0,
    }]);
  };

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
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="e.g., Initial Outreach"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={newTemplate.category}
                    onValueChange={(value) => setNewTemplate({ ...newTemplate, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat.replace("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Message Content</Label>
                <Textarea
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
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
                      onClick={() => setNewTemplate({
                        ...newTemplate,
                        content: newTemplate.content + token
                      })}
                    >
                      {token}
                      <span className="ml-1 text-xs text-muted-foreground">({desc})</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
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
              {templates.reduce((sum, t) => sum + t.timesUsed, 0).toLocaleString()}
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
              {(templates.reduce((sum, t) => sum + t.responseRate, 0) / templates.length).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Templates</CardTitle>
          <CardDescription>
            {templates.filter(t => t.isActive).length} active templates
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              {templates.map((template) => (
                <TableRow key={template.id} className={!template.isActive ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{template.category.replace("_", " ")}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                    {template.content}
                  </TableCell>
                  <TableCell className="text-right">{template.timesUsed.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <span className={template.responseRate > 10 ? "text-green-500" : ""}>
                      {template.responseRate}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingTemplate(template);
                          setNewTemplate({ name: template.name, category: template.category, content: template.content });
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
        </CardContent>
      </Card>
    </div>
  );
}
