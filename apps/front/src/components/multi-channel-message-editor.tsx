"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, MessageSquare, Phone, Sparkles } from "lucide-react";
import { AiMessageGenerator } from "./ai-message-generator";
import { COMPANY_NAME } from "@/config/branding";

interface Template {
  id: string;
  name: string;
  type: "email" | "sms" | "voice";
  subject?: string;
  body?: string;
  smsText?: string;
  voiceScript?: string;
  voiceUrl?: string;
}

// Templates are now fetched from real API - no mock data
const mockTemplates: Template[] = [];

interface MultiChannelMessageEditorProps {
  messageId?: string;
  initialData?: {
    name: string;
    type: "email" | "sms" | "voice";
    subject?: string;
    body: string;
    voiceScript?: string;
    smsText?: string;
  };
  onSave: (data: any) => void;
  onCancel: () => void;
}

export function MultiChannelMessageEditor({
  messageId,
  initialData = {
    name: "",
    type: "email",
    subject: "",
    body: "",
    voiceScript: "",
    smsText: "",
  },
  onSave,
  onCancel,
}: MultiChannelMessageEditorProps) {
  const [messageData, setMessageData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<string>(
    initialData.type || "email",
  );
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);

  // In a real app, fetch templates from an API
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setTemplates(mockTemplates);
    }, 500);
  }, []);

  const handleChange = (field: string, value: string) => {
    setMessageData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTypeChange = (type: string) => {
    setActiveTab(type);
    setMessageData((prev) => ({
      ...prev,
      type: type as "email" | "sms" | "voice",
    }));
  };

  const handleSave = () => {
    onSave({
      id: messageId || `msg_${Date.now()}`,
      ...messageData,
    });
  };

  const handleAiGenerated = (generatedContent: {
    subject?: string;
    body?: string;
    smsText?: string;
    voiceScript?: string;
  }) => {
    setMessageData((prev) => ({
      ...prev,
      ...generatedContent,
    }));
    setIsAiModalOpen(false);
  };

  const handleTemplateSelect = (templateId: string) => {
    const selectedTemplate = templates.find((t) => t.id === templateId);
    if (!selectedTemplate) return;

    setMessageData((prev) => ({
      ...prev,
      subject: selectedTemplate.subject || prev.subject,
      body:
        selectedTemplate.type === "email"
          ? selectedTemplate.body || ""
          : prev.body,
      smsText:
        selectedTemplate.type === "sms"
          ? selectedTemplate.smsText || ""
          : prev.smsText,
      voiceScript:
        selectedTemplate.type === "voice"
          ? selectedTemplate.voiceScript || ""
          : prev.voiceScript,
    }));
  };

  // Filter templates by current message type
  const filteredTemplates = templates.filter(
    (t) => t.type === messageData.type,
  );

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Message Editor</CardTitle>
          <CardDescription>
            Create or edit a message for your campaign
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="message-name">Message Name</Label>
              <Input
                id="message-name"
                value={messageData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Initial Outreach, Follow-up #1"
              />
            </div>

            <div className="space-y-2">
              <Label>Message Type</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={
                    messageData.type === "email" ? "default" : "outline-solid"
                  }
                  className="w-full justify-center"
                  onClick={() => handleTypeChange("email")}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  <span>Email</span>
                </Button>
                <Button
                  type="button"
                  variant={
                    messageData.type === "sms" ? "default" : "outline-solid"
                  }
                  className="w-full justify-center"
                  onClick={() => handleTypeChange("sms")}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  <span>SMS</span>
                </Button>
                <Button
                  type="button"
                  variant={
                    messageData.type === "voice" ? "default" : "outline-solid"
                  }
                  className="w-full justify-center"
                  onClick={() => handleTypeChange("voice")}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  <span>Voice</span>
                </Button>
              </div>
            </div>

            {/* Template Selector */}
            <div className="space-y-2">
              <Label htmlFor="template-selector">Select Template</Label>
              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger id="template-selector">
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Template</SelectItem>
                  {filteredTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select a pre-made template or create your own message below
              </p>
            </div>

            {messageData.type === "email" && (
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="subject-line">Subject Line</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 text-primary hover:text-primary/80"
                      onClick={() => setIsAiModalOpen(true)}
                    >
                      <Sparkles className="h-4 w-4" />
                      Create with AI
                    </Button>
                  </div>
                  <Input
                    id="subject-line"
                    value={messageData.subject || ""}
                    onChange={(e) => handleChange("subject", e.target.value)}
                    placeholder="Enter email subject line"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-body">Email Body</Label>
                  <Textarea
                    id="email-body"
                    value={messageData.body}
                    onChange={(e) => handleChange("body", e.target.value)}
                    placeholder="Enter email content"
                    rows={10}
                  />
                </div>
              </div>
            )}

            {messageData.type === "sms" && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="sms-text">SMS Text</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 text-primary hover:text-primary/80"
                    onClick={() => setIsAiModalOpen(true)}
                  >
                    <Sparkles className="h-4 w-4" />
                    Create with AI
                  </Button>
                </div>
                <Textarea
                  id="sms-text"
                  value={messageData.smsText || ""}
                  onChange={(e) => handleChange("smsText", e.target.value)}
                  placeholder="Enter SMS text (160 characters recommended)"
                  rows={5}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {messageData.smsText?.length || 0}/160 characters
                  {(messageData.smsText?.length || 0) > 160 &&
                    " - Message may be split into multiple SMS"}
                </p>
              </div>
            )}

            {messageData.type === "voice" && (
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="voice-script">Voice Script</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 text-primary hover:text-primary/80"
                      onClick={() => setIsAiModalOpen(true)}
                    >
                      <Sparkles className="h-4 w-4" />
                      Create with AI
                    </Button>
                  </div>
                  <Textarea
                    id="voice-script"
                    value={messageData.voiceScript || ""}
                    onChange={(e) =>
                      handleChange("voiceScript", e.target.value)
                    }
                    placeholder="Enter script for voice calls"
                    rows={10}
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <Select defaultValue="neutral">
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Voice Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="professional">
                          Professional
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm">
                      Preview Voice
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Message</Button>
        </CardFooter>
      </Card>

      <AiMessageGenerator
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        messageType={messageData.type}
        onGenerate={handleAiGenerated}
      />
    </>
  );
}
