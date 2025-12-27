"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateMessageTemplateButton } from "@/features/message-template/components/create-message-template-button";
import { MessageTemplateType } from "@/graphql/types";

interface Template {
  id: string;
  name: string;
  type: MessageTemplateType;
  subject?: string;
  body?: string;
  smsText?: string;
  voiceScript?: string;
  voiceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface Prompt {
  id: string;
  name: string;
  description: string;
  type: MessageTemplateType;
  prompt: string;
  category: string;
}

export function MessageTemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [activeTab, setActiveTab] = useState<MessageTemplateType>(
    MessageTemplateType.EMAIL,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<Partial<Template>>({
    type: MessageTemplateType.EMAIL,
    name: "",
    subject: "",
    body: "",
    smsText: "",
    voiceScript: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch templates and prompts from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [templatesRes, promptsRes] = await Promise.all([
          fetch("/api/message-templates"),
          fetch("/api/message-prompts"),
        ]);

        if (templatesRes.ok) {
          const templatesData = await templatesRes.json();
          setTemplates(templatesData.templates || []);
        }

        if (promptsRes.ok) {
          const promptsData = await promptsRes.json();
          setPrompts(promptsData.prompts || []);
        }
      } catch (error) {
        console.error("Failed to fetch templates/prompts:", error);
        setTemplates([]);
        setPrompts([]);
      }
    };

    fetchData();
  }, []);

  const handleEdit = (template: Template) => {
    setCurrentTemplate(template);
    setSelectedPromptId("");
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDuplicate = (template: Template) => {
    const newTemplate = {
      ...template,
      id: undefined,
      name: `${template.name} (Copy)`,
    };
    setCurrentTemplate(newTemplate);
    setSelectedPromptId("");
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    // In a real app, call API to delete
    setTemplates(templates.filter((t) => t.id !== id));
  };

  const handleSaveTemplate = () => {
    if (!currentTemplate.name) return;

    if (isEditing && currentTemplate.id) {
      // Update existing template
      setTemplates(
        templates.map((t) =>
          t.id === currentTemplate.id
            ? { ...t, ...currentTemplate, updatedAt: new Date().toISOString() }
            : t,
        ),
      );
    } else {
      // Create new template
      const newTemplate = {
        ...currentTemplate,
        id: `template-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Template;

      setTemplates([...templates, newTemplate]);
    }

    setIsDialogOpen(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setCurrentTemplate((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePromptSelect = (promptId: string) => {
    setSelectedPromptId(promptId);
  };

  const handleGenerateFromPrompt = async () => {
    if (!selectedPromptId) return;

    setIsGenerating(true);

    const selectedPrompt = prompts.find((p) => p.id === selectedPromptId);
    if (!selectedPrompt) {
      setIsGenerating(false);
      return;
    }

    // In a real app, this would be an API call to generate content
    // Simulating API call with timeout
    setTimeout(() => {
      let generatedContent = "";

      // Mock generated content based on prompt type
      if (selectedPrompt.type === MessageTemplateType.EMAIL) {
        const subject = "Discover how we can boost your business growth";
        const body = `Dear {{first_name}},

I hope this email finds you well. I'm reaching out because I believe our services at NextierData could significantly benefit {{company_name}}.

Our platform has helped businesses similar to yours achieve an average of 35% increase in qualified leads and a 28% reduction in customer acquisition costs. We specialize in providing data-driven solutions that help you:

1. Identify and target high-value prospects
2. Streamline your outreach processes
3. Increase conversion rates through personalized engagement

Would you be available for a brief 15-minute call next week to discuss how we might be able to help {{company_name}} reach its growth objectives?

Looking forward to connecting with you.

Best regards,
{{user_name}}
{{user_title}}
NextierData`;

        handleInputChange("subject", subject);
        handleInputChange("body", body);
      } else if (selectedPrompt.type === MessageTemplateType.SMS) {
        generatedContent = `Hi {{first_name}}, {{user_name}} from NextierData here. Our platform has helped companies like {{company_name}} increase leads by 35%. Would you be interested in a quick demo? Reply YES to learn more.`;
        handleInputChange("smsText", generatedContent);
      } else if (selectedPrompt.type === MessageTemplateType.VOICE) {
        generatedContent = `Hello {{first_name}}, this is {{user_name}} calling from NextierData.

I'm reaching out because we've helped several companies in your industry improve their lead generation and customer acquisition processes.

Our platform has helped businesses similar to {{company_name}} achieve significant improvements in their sales pipeline, with an average 35% increase in qualified leads.

I was wondering if you'd be interested in learning more about how we might be able to help your team achieve similar results?

[If yes] Great! I'd love to schedule a brief demo to show you exactly how our platform works. Would you have about 20 minutes available later this week?

[If no] I understand. Would it be alright if I send you some information via email for you to review at your convenience?

Thank you for your time, {{first_name}}. Have a great day!`;
        handleInputChange("voiceScript", generatedContent);
      }

      setIsGenerating(false);
    }, 1500);
  };

  // Filter templates by current tab
  const filteredTemplates = templates.filter((t) => t.type === activeTab);

  // Filter prompts by current template type
  const filteredPrompts = prompts.filter(
    (p) => p.type === currentTemplate.type,
  );

  const handleInsertVariable = (variable: string) => {
    const field =
      currentTemplate.type === MessageTemplateType.EMAIL
        ? "body"
        : currentTemplate.type === MessageTemplateType.SMS
          ? "smsText"
          : "voiceScript";
    const currentValue = currentTemplate[field as keyof Template] || "";
    handleInputChange(field, `${currentValue}{{${variable}}}`);
  };

  return (
    <div className="space-y-6">
      <Tabs
        defaultValue={MessageTemplateType as any}
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as MessageTemplateType)}
      >
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger
              value={MessageTemplateType.EMAIL}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              <span>Email Templates</span>
            </TabsTrigger>
            <TabsTrigger
              value={MessageTemplateType.SMS}
              className="flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              <span>SMS Templates</span>
            </TabsTrigger>
            <TabsTrigger
              value={MessageTemplateType.VOICE}
              className="flex items-center gap-2"
            >
              <Phone className="h-4 w-4" />
              <span>Voice Templates</span>
            </TabsTrigger>
          </TabsList>

          <CreateMessageTemplateButton type={activeTab} />
        </div>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sms" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="voice" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Template" : "Create New Template"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update your message template details below"
                : "Fill in the details to create a new message template"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="template-name" className="text-right">
                Name
              </Label>
              <Input
                id="template-name"
                value={currentTemplate.name || ""}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="col-span-3"
                placeholder="Template name"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="prompt-select" className="text-right">
                Use Prompt
              </Label>
              <div className="col-span-3 flex gap-2">
                <Select
                  value={selectedPromptId}
                  onValueChange={handlePromptSelect}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a prompt to generate content" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredPrompts.map((prompt) => (
                      <SelectItem key={prompt.id} value={prompt.id}>
                        {prompt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleGenerateFromPrompt}
                  disabled={!selectedPromptId || isGenerating}
                  className="flex items-center gap-1"
                >
                  <Sparkles className="h-4 w-4" />
                  {isGenerating ? "Generating..." : "Generate"}
                </Button>
              </div>
            </div>

            {currentTemplate.type === MessageTemplateType.EMAIL && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="template-subject" className="text-right">
                    Subject
                  </Label>
                  <Input
                    id="template-subject"
                    value={currentTemplate.subject || ""}
                    onChange={(e) =>
                      handleInputChange("subject", e.target.value)
                    }
                    className="col-span-3"
                    placeholder="Email subject line"
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="template-body" className="text-right pt-2">
                    Body
                  </Label>
                  <Textarea
                    id="template-body"
                    value={currentTemplate.body || ""}
                    onChange={(e) => handleInputChange("body", e.target.value)}
                    className="col-span-3"
                    rows={10}
                    placeholder="Email body content"
                  />
                </div>
              </>
            )}

            {currentTemplate.type === MessageTemplateType.SMS && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="template-sms" className="text-right pt-2">
                  SMS Text
                </Label>
                <div className="col-span-3 space-y-2">
                  <Textarea
                    id="template-sms"
                    value={currentTemplate.smsText || ""}
                    onChange={(e) =>
                      handleInputChange("smsText", e.target.value)
                    }
                    rows={5}
                    placeholder="SMS message content"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {currentTemplate.smsText?.length || 0}/160 characters
                  </p>
                </div>
              </div>
            )}

            {currentTemplate.type === MessageTemplateType.VOICE && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="template-voice" className="text-right pt-2">
                  Voice Script
                </Label>
                <Textarea
                  id="template-voice"
                  value={currentTemplate.voiceScript || ""}
                  onChange={(e) =>
                    handleInputChange("voiceScript", e.target.value)
                  }
                  className="col-span-3"
                  rows={10}
                  placeholder="Voice call script"
                />
              </div>
            )}

            <div className="grid grid-cols-4 items-start gap-4">
              <div className="text-right pt-2">
                <Label>Variables</Label>
              </div>
              <div className="col-span-3 flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-secondary"
                  onClick={() => handleInsertVariable("first_name")}
                >
                  {"{"}
                  {"{"} first_name {"}"}
                  {"}"}
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-secondary"
                  onClick={() => handleInsertVariable("last_name")}
                >
                  {"{"}
                  {"{"} last_name {"}"}
                  {"}"}
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-secondary"
                  onClick={() => handleInsertVariable("company_name")}
                >
                  {"{"}
                  {"{"} company_name {"}"}
                  {"}"}
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-secondary"
                  onClick={() => handleInsertVariable("user_name")}
                >
                  {"{"}
                  {"{"} user_name {"}"}
                  {"}"}
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-secondary"
                  onClick={() => handleInsertVariable("user_title")}
                >
                  {"{"}
                  {"{"} user_title {"}"}
                  {"}"}
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>
              {isEditing ? "Update Template" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TemplateCardProps {
  template: Template;
  onEdit: (template: Template) => void;
  onDuplicate: (template: Template) => void;
  onDelete: (id: string) => void;
}

function TemplateCard({
  template,
  onEdit,
  onDuplicate,
  onDelete,
}: TemplateCardProps) {
  const getTemplateIcon = (type: string) => {
    switch (type) {
      case MessageTemplateType.EMAIL:
        return <Mail className="h-4 w-4" />;
      case MessageTemplateType.SMS:
        return <MessageSquare className="h-4 w-4" />;
      case MessageTemplateType.VOICE:
        return <Phone className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTemplatePreview = (template: Template) => {
    if (template.type === MessageTemplateType.EMAIL) {
      return template.body?.substring(0, 100) + "...";
    } else if (template.type === MessageTemplateType.SMS) {
      return template.smsText;
    } else {
      return template.voiceScript?.substring(0, 100) + "...";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-base">{template.name}</CardTitle>
            <CardDescription className="flex items-center gap-1">
              {getTemplateIcon(template.type)}
              <span className="capitalize">{template.type}</span>
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(template)}
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDuplicate(template)}
            >
              <Copy className="h-4 w-4" />
              <span className="sr-only">Duplicate</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(template.id)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {template.type === MessageTemplateType.EMAIL && template.subject && (
          <p className="text-sm font-medium mb-1">
            Subject: {template.subject}
          </p>
        )}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {getTemplatePreview(template)}
        </p>
      </CardContent>
      <CardFooter className="pt-1">
        <p className="text-xs text-muted-foreground">
          Updated {new Date(template.updatedAt).toLocaleDateString()}
        </p>
      </CardFooter>
    </Card>
  );
}
