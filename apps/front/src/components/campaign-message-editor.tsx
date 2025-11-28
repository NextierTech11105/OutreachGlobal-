"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Copy,
  MessageSquare,
  Plus,
  Trash,
  CheckCircle,
} from "lucide-react";

interface CampaignMessageEditorProps {
  campaignType: string;
  selectedAiSdrId?: number | null;
}

export function CampaignMessageEditor({
  campaignType,
  selectedAiSdrId,
}: CampaignMessageEditorProps) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      name: "Initial Outreach",
      subject: "Property opportunity in Queens",
      body: "Hello {{first_name}},\n\nI noticed you own the property at {{property_address}} and wanted to discuss a potential opportunity. Our company specializes in helping property owners like yourself maximize their investment.\n\nWould you be open to a brief conversation about your property?\n\nBest regards,\n{{agent_name}}",
    },
    {
      id: 2,
      name: "Follow-up #1",
      subject: "Following up on our property discussion",
      body: "Hello {{first_name}},\n\nI wanted to follow up on my previous message about your property at {{property_address}}. I understand you're likely busy, but I believe we could provide significant value.\n\nWould you have 15 minutes this week for a quick call?\n\nBest regards,\n{{agent_name}}",
    },
  ]);

  const [activeMessageId, setActiveMessageId] = useState(1);

  const addNewMessage = () => {
    const newId = Math.max(...messages.map((m) => m.id)) + 1;
    const newMessage = {
      id: newId,
      name: `Message #${newId}`,
      subject: "",
      body: "",
    };
    setMessages([...messages, newMessage]);
    setActiveMessageId(newId);
  };

  const deleteMessage = (id: number) => {
    if (messages.length <= 1) return;
    const newMessages = messages.filter((m) => m.id !== id);
    setMessages(newMessages);
    setActiveMessageId(newMessages[0].id);
  };

  const updateMessage = (id: number, field: string, value: string) => {
    setMessages(
      messages.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
    );
  };

  const activeMessage =
    messages.find((m) => m.id === activeMessageId) || messages[0];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Campaign Messages</h3>
          <Button variant="outline" size="sm" onClick={addNewMessage}>
            <Plus className="mr-2 h-4 w-4" />
            Add Message
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-1 space-y-4">
            <div className="space-y-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-center justify-between rounded-md border p-3 cursor-pointer ${
                    activeMessageId === message.id
                      ? "border-primary bg-primary/5"
                      : ""
                  }`}
                  onClick={() => setActiveMessageId(message.id)}
                >
                  <div className="truncate">
                    <p className="text-sm font-medium">{message.name}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMessage(message.id);
                    }}
                    disabled={messages.length <= 1}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Message Variables</Label>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <code>{"{{first_name}}"}</code>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <code>{"{{last_name}}"}</code>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <code>{"{{property_address}}"}</code>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <code>{"{{agent_name}}"}</code>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <code>{"{{company_name}}"}</code>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-3 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message-name">Message Name</Label>
              <Input
                id="message-name"
                value={activeMessage.name}
                onChange={(e) =>
                  updateMessage(activeMessageId, "name", e.target.value)
                }
              />
            </div>

            {campaignType !== "nurture" && (
              <div className="space-y-2">
                <Label htmlFor="message-subject">Subject Line</Label>
                <Input
                  id="message-subject"
                  value={activeMessage.subject}
                  onChange={(e) =>
                    updateMessage(activeMessageId, "subject", e.target.value)
                  }
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="message-body">Message Body</Label>
              <Textarea
                id="message-body"
                rows={10}
                value={activeMessage.body}
                onChange={(e) =>
                  updateMessage(activeMessageId, "body", e.target.value)
                }
                className="font-mono text-sm"
              />
            </div>

            {campaignType === "ai" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">AI Assistance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center"
                    >
                      <Bot className="mr-2 h-4 w-4" />
                      <span>Generate Message</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center"
                    >
                      <Bot className="mr-2 h-4 w-4" />
                      <span>Improve Message</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center"
                    >
                      <Bot className="mr-2 h-4 w-4" />
                      <span>Check Tone</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {campaignType === "ai" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">AI SDR Message Templates</h3>
            {selectedAiSdrId ? (
              <Badge variant="outline" className="bg-green-50">
                <CheckCircle className="mr-1 h-3 w-3 text-green-500" />
                AI SDR Selected
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-800">
                No AI SDR Selected
              </Badge>
            )}
          </div>
          <h3 className="text-lg font-medium">AI Conversation Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ai-persona">AI Persona</Label>
              <Select defaultValue="professional">
                <SelectTrigger id="ai-persona">
                  <SelectValue placeholder="Select persona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="response-time">Response Time</Label>
              <Select defaultValue="fast">
                <SelectTrigger id="response-time">
                  <SelectValue placeholder="Select response time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">Instant (&lt; 1 min)</SelectItem>
                  <SelectItem value="fast">Fast (1-5 mins)</SelectItem>
                  <SelectItem value="normal">Normal (5-30 mins)</SelectItem>
                  <SelectItem value="delayed">Delayed (1-4 hours)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-instructions">AI Instructions</Label>
            <Textarea
              id="ai-instructions"
              rows={3}
              placeholder="Provide specific instructions for the AI agent"
              defaultValue="Focus on the property's potential value and the owner's equity position. Be respectful and professional. If the lead expresses interest, offer to schedule a call with a human agent."
            />
          </div>

          <div className="space-y-2">
            <Label>Conversation Handling</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-md border p-4">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-medium">
                    Human Handoff Triggers
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    When to transfer the conversation to a human agent
                  </p>
                </div>
                <Badge className="flex items-center">
                  <MessageSquare className="mr-1 h-3 w-3" />
                  <span>3 Triggers</span>
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-md border p-4">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-medium">Objection Handling</h3>
                  <p className="text-sm text-muted-foreground">
                    How the AI should respond to common objections
                  </p>
                </div>
                <Badge className="flex items-center">
                  <MessageSquare className="mr-1 h-3 w-3" />
                  <span>5 Responses</span>
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {campaignType === "nurture" && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Drip Campaign Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">Message Frequency</Label>
              <Select defaultValue="weekly">
                <SelectTrigger id="frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Campaign Duration</Label>
              <Select defaultValue="3months">
                <SelectTrigger id="duration">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1month">1 Month</SelectItem>
                  <SelectItem value="3months">3 Months</SelectItem>
                  <SelectItem value="6months">6 Months</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
