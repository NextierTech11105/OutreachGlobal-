"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash,
  Edit,
  MoreHorizontal,
  Copy,
  ArrowUp,
  ArrowDown,
  Mail,
  MessageSquare,
  Phone,
  Sparkles,
} from "lucide-react";
import type {
  AutoReplyRule,
  MessageTemplate,
  MessageType,
} from "@/types/message";

export function AutoReplySettings() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState("rules");
  const [promptText, setPromptText] = useState(
    "You are an AI assistant managing email, SMS, and voice responses for a business. " +
      "When replying to messages, be professional, concise, and helpful. " +
      "If someone expresses interest in our products, thank them and offer to schedule a demo. " +
      "If someone asks to be removed from our list, apologize and confirm they will be removed. " +
      "For general inquiries, provide relevant information and offer to connect them with a team member. " +
      "For SMS, keep responses under 160 characters when possible. " +
      "For voice scripts, use natural language and clear instructions.",
  );
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [currentTemplate, setCurrentTemplate] =
    useState<MessageTemplate | null>(null);
  const [isEditingRule, setIsEditingRule] = useState(false);
  const [currentRule, setCurrentRule] = useState<AutoReplyRule | null>(null);

  // Sample data - in a real app, these would be fetched from the backend
  const [templates, setTemplates] = useState<MessageTemplate[]>([
    {
      id: "template1",
      name: "Interested Lead - Email",
      type: "email",
      subject: "Thank you for your interest in our products",
      body: "Dear {{first_name}},\n\nThank you for your interest in {{product_name}}. I'd be happy to provide more information and schedule a demo at your convenience.\n\nWhen would be a good time for you?\n\nBest regards,\n{{agent_name}}",
    },
    {
      id: "template2",
      name: "Unsubscribe Request - Email",
      type: "email",
      subject: "Confirmation of Unsubscription",
      body: "Dear {{first_name}},\n\nI apologize for the inconvenience. I've removed your email from our contact list, and you won't receive any further communications from us.\n\nThank you for your time.\n\nBest regards,\n{{agent_name}}",
    },
    {
      id: "template3",
      name: "Interested Lead - SMS",
      type: "sms",
      smsText:
        "Thanks for your interest in {{product_name}}! When would be a good time to schedule a demo? Reply with your preferred date/time. {{agent_name}}",
    },
    {
      id: "template4",
      name: "Unsubscribe Request - SMS",
      type: "sms",
      smsText:
        "You've been unsubscribed from our messages. We won't contact you again. If this was a mistake, reply 'SUBSCRIBE'.",
    },
    {
      id: "template5",
      name: "Interested Lead - Voice",
      type: "voice",
      voiceScript:
        "Thank you for your interest in our products. Our team will review your inquiry and get back to you shortly with more information. If you'd like to schedule a demo, please press 1 to be connected with a sales representative.",
    },
  ]);

  const [rules, setRules] = useState<AutoReplyRule[]>([
    {
      id: "rule1",
      name: "Interested Lead Detection",
      conditions: {
        type: ["email", "sms"],
        contains: ["interested", "demo", "pricing", "more information"],
      },
      templateId: "template1",
      active: true,
      priority: 1,
    },
    {
      id: "rule2",
      name: "Unsubscribe Request",
      conditions: {
        type: ["email", "sms"],
        contains: ["unsubscribe", "remove", "stop", "opt out"],
      },
      templateId: "template2",
      active: true,
      priority: 2,
    },
    {
      id: "rule3",
      name: "SMS Lead Response",
      conditions: {
        type: ["sms"],
        contains: ["interested", "demo", "pricing"],
      },
      templateId: "template3",
      active: true,
      priority: 3,
    },
  ]);

  const handleAddTemplate = () => {
    setCurrentTemplate({
      id: `template${templates.length + 1}`,
      name: "",
      type: "email",
      subject: "",
      body: "",
    });
    setIsEditingTemplate(true);
  };

  const handleEditTemplate = (template: MessageTemplate) => {
    setCurrentTemplate({ ...template });
    setIsEditingTemplate(true);
  };

  const handleSaveTemplate = () => {
    if (!currentTemplate) return;

    const isNew = !templates.some((t) => t.id === currentTemplate.id);

    if (isNew) {
      setTemplates([...templates, currentTemplate]);
    } else {
      setTemplates(
        templates.map((t) =>
          t.id === currentTemplate.id ? currentTemplate : t,
        ),
      );
    }

    setIsEditingTemplate(false);
    setCurrentTemplate(null);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates(templates.filter((t) => t.id !== id));

    // Also update any rules that use this template
    setRules(
      rules.map((rule) =>
        rule.templateId === id ? { ...rule, templateId: "" } : rule,
      ),
    );
  };

  const handleAddRule = () => {
    setCurrentRule({
      id: `rule${rules.length + 1}`,
      name: "",
      conditions: {
        type: [],
        contains: [],
      },
      templateId: "",
      active: true,
      priority: rules.length + 1,
    });
    setIsEditingRule(true);
  };

  const handleEditRule = (rule: AutoReplyRule) => {
    setCurrentRule({ ...rule });
    setIsEditingRule(true);
  };

  const handleSaveRule = () => {
    if (!currentRule) return;

    const isNew = !rules.some((r) => r.id === currentRule.id);

    if (isNew) {
      setRules([...rules, currentRule]);
    } else {
      setRules(rules.map((r) => (r.id === currentRule.id ? currentRule : r)));
    }

    setIsEditingRule(false);
    setCurrentRule(null);
  };

  const handleDeleteRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
  };

  const handleToggleRule = (id: string, active: boolean) => {
    setRules(rules.map((r) => (r.id === id ? { ...r, active } : r)));
  };

  const handleMovePriority = (id: string, direction: "up" | "down") => {
    const index = rules.findIndex((r) => r.id === id);
    if (index === -1) return;

    if (direction === "up" && index > 0) {
      const newRules = [...rules];
      const temp = newRules[index - 1].priority;
      newRules[index - 1].priority = newRules[index].priority;
      newRules[index].priority = temp;
      setRules(newRules.sort((a, b) => a.priority - b.priority));
    } else if (direction === "down" && index < rules.length - 1) {
      const newRules = [...rules];
      const temp = newRules[index + 1].priority;
      newRules[index + 1].priority = newRules[index].priority;
      newRules[index].priority = temp;
      setRules(newRules.sort((a, b) => a.priority - b.priority));
    }
  };

  const getTemplateTypeIcon = (type: MessageType) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "sms":
        return <MessageSquare className="h-4 w-4" />;
      case "voice":
        return <Phone className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold">Auto-Reply Settings</h2>
          <p className="text-muted-foreground">
            Configure automatic responses to incoming messages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={isEnabled ? "text-green-500" : "text-muted-foreground"}
          >
            {isEnabled ? "Enabled" : "Disabled"}
          </span>
          <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
        </div>
      </div>

      <Tabs defaultValue="rules" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rules">Reply Rules</TabsTrigger>
          <TabsTrigger value="templates">Response Templates</TabsTrigger>
          <TabsTrigger value="prompt">AI Prompt</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Auto-Reply Rules</h3>
            <Button onClick={handleAddRule}>
              <Plus className="mr-2 h-4 w-4" /> Add Rule
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Status</TableHead>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Conditions</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead className="w-[100px]">Priority</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6">
                        No rules configured. Click "Add Rule" to create your
                        first rule.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <Switch
                            checked={rule.active}
                            onCheckedChange={(checked) =>
                              handleToggleRule(rule.id, checked)
                            }
                            aria-label={`${rule.active ? "Disable" : "Enable"} rule`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {rule.name}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {rule.conditions.type &&
                              rule.conditions.type.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {rule.conditions.type.map((type) => (
                                    <Badge
                                      key={type}
                                      variant="outline"
                                      className="capitalize"
                                    >
                                      {type}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            {rule.conditions.contains &&
                              rule.conditions.contains.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  Contains:{" "}
                                  {rule.conditions.contains.join(", ")}
                                </div>
                              )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {templates.find((t) => t.id === rule.templateId)
                            ?.name || (
                            <span className="text-muted-foreground italic">
                              No template selected
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{rule.priority}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEditRule(rule)}
                              >
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleMovePriority(rule.id, "up")
                                }
                              >
                                <ArrowUp className="mr-2 h-4 w-4" /> Move Up
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleMovePriority(rule.id, "down")
                                }
                              >
                                <ArrowDown className="mr-2 h-4 w-4" /> Move Down
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteRule(rule.id)}
                              >
                                <Trash className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="settings">
              <AccordionTrigger>Advanced Settings</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="delay">Response Delay (minutes)</Label>
                      <Input
                        id="delay"
                        type="number"
                        defaultValue="15"
                        min="0"
                        max="1440"
                      />
                      <p className="text-sm text-muted-foreground">
                        Set a delay before sending automatic replies to make
                        them appear more natural.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max-replies">
                        Maximum Replies Per Thread
                      </Label>
                      <Input
                        id="max-replies"
                        type="number"
                        defaultValue="1"
                        min="0"
                        max="10"
                      />
                      <p className="text-sm text-muted-foreground">
                        Set the maximum number of automatic replies per
                        conversation thread.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="weekend" defaultChecked />
                        <Label htmlFor="weekend">Reply on weekends</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Enable or disable automatic replies on weekends.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="business-hours" defaultChecked />
                        <Label htmlFor="business-hours">
                          Only reply during business hours
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Only send automatic replies during specified business
                        hours.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="business-hours-range">Business Hours</Label>
                    <div className="flex items-center gap-2">
                      <Select defaultValue="9">
                        <SelectTrigger className="w-[100px]">
                          <SelectValue placeholder="Start" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }).map((_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i === 0
                                ? "12 AM"
                                : i < 12
                                  ? `${i} AM`
                                  : i === 12
                                    ? "12 PM"
                                    : `${i - 12} PM`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span>to</span>
                      <Select defaultValue="17">
                        <SelectTrigger className="w-[100px]">
                          <SelectValue placeholder="End" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }).map((_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i === 0
                                ? "12 AM"
                                : i < 12
                                  ? `${i} AM`
                                  : i === 12
                                    ? "12 PM"
                                    : `${i - 12} PM`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button>Save Settings</Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Response Templates</h3>
            <Button onClick={handleAddTemplate}>
              <Plus className="mr-2 h-4 w-4" /> Add Template
            </Button>
          </div>

          <div className="grid gap-4">
            {templates.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-6">
                  <p className="text-muted-foreground mb-4">
                    No templates configured.
                  </p>
                  <Button onClick={handleAddTemplate}>
                    <Plus className="mr-2 h-4 w-4" /> Add Template
                  </Button>
                </CardContent>
              </Card>
            ) : (
              templates.map((template) => (
                <Card key={template.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle>{template.name}</CardTitle>
                          {getTemplateTypeIcon(template.type)}
                          <Badge variant="outline" className="capitalize">
                            {template.type}
                          </Badge>
                        </div>
                        {template.subject && (
                          <CardDescription>
                            Subject: {template.subject}
                          </CardDescription>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEditTemplate(template)}
                          >
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleEditTemplate({
                                ...template,
                                id: `template${templates.length + 1}`,
                                name: `${template.name} (Copy)`,
                              })
                            }
                          >
                            <Copy className="mr-2 h-4 w-4" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/40 p-3 rounded-md text-sm whitespace-pre-line">
                      {template.type === "email" && template.body
                        ? template.body
                        : template.type === "sms" && template.smsText
                          ? template.smsText
                          : template.type === "voice" && template.voiceScript
                            ? template.voiceScript
                            : "No content"}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditTemplate(template)}
                    >
                      Edit Template
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="prompt" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Assistant Prompt</CardTitle>
              <CardDescription>
                This prompt guides the AI assistant on how to respond to
                different types of messages.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  <Label htmlFor="prompt" className="font-medium">
                    System Prompt
                  </Label>
                </div>
                <Textarea
                  id="prompt"
                  rows={12}
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  Use variables like {{ first_name }}, {{ last_name }},{" "}
                  {{ email }}, {{ phone }}, {{ company }}, {{ product_name }},{" "}
                  {{ agent_name }} to personalize responses.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Reset to Default</Button>
              <Button>Save Prompt</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Response Settings</CardTitle>
              <CardDescription>
                Configure how the AI generates responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="model">AI Model</Label>
                    <Select defaultValue="gpt-4o">
                      <SelectTrigger id="model">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                        <SelectItem value="gpt-4">GPT-4</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">
                          GPT-3.5 Turbo
                        </SelectItem>
                        <SelectItem value="claude-3-opus">
                          Claude 3 Opus
                        </SelectItem>
                        <SelectItem value="claude-3-sonnet">
                          Claude 3 Sonnet
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="temperature">Temperature</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="temperature"
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        defaultValue="0.7"
                        className="w-full"
                      />
                      <span className="w-8 text-center">0.7</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Lower values produce more consistent responses, higher
                      values more creative ones.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="human-review" defaultChecked />
                    <Label htmlFor="human-review">
                      Require human review for high-risk messages
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    AI will flag messages that may require human attention
                    before sending.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="context" defaultChecked />
                    <Label htmlFor="context">
                      Include conversation history for context
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    AI will consider previous messages in the conversation when
                    generating responses.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="ml-auto">Save Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Edit Dialog */}
      <Dialog open={isEditingTemplate} onOpenChange={setIsEditingTemplate}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {currentTemplate?.id.includes("new")
                ? "Add Template"
                : "Edit Template"}
            </DialogTitle>
            <DialogDescription>
              Create or modify a response template for automatic replies.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="template-name" className="text-right">
                Name
              </Label>
              <Input
                id="template-name"
                value={currentTemplate?.name || ""}
                onChange={(e) =>
                  setCurrentTemplate((prev) =>
                    prev ? { ...prev, name: e.target.value } : null,
                  )
                }
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="template-type" className="text-right">
                Type
              </Label>
              <Select
                value={currentTemplate?.type || "email"}
                onValueChange={(value) =>
                  setCurrentTemplate((prev) =>
                    prev ? { ...prev, type: value as MessageType } : null,
                  )
                }
              >
                <SelectTrigger id="template-type" className="col-span-3">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="voice">Voice</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {currentTemplate?.type === "email" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="template-subject" className="text-right">
                  Subject
                </Label>
                <Input
                  id="template-subject"
                  value={currentTemplate?.subject || ""}
                  onChange={(e) =>
                    setCurrentTemplate((prev) =>
                      prev ? { ...prev, subject: e.target.value } : null,
                    )
                  }
                  className="col-span-3"
                />
              </div>
            )}

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="template-content" className="text-right pt-2">
                Content
              </Label>
              <Textarea
                id="template-content"
                rows={8}
                value={
                  currentTemplate?.type === "email"
                    ? currentTemplate?.body || ""
                    : currentTemplate?.type === "sms"
                      ? currentTemplate?.smsText || ""
                      : currentTemplate?.type === "voice"
                        ? currentTemplate?.voiceScript || ""
                        : ""
                }
                onChange={(e) => {
                  if (!currentTemplate) return;

                  if (currentTemplate.type === "email") {
                    setCurrentTemplate({
                      ...currentTemplate,
                      body: e.target.value,
                    });
                  } else if (currentTemplate.type === "sms") {
                    setCurrentTemplate({
                      ...currentTemplate,
                      smsText: e.target.value,
                    });
                  } else if (currentTemplate.type === "voice") {
                    setCurrentTemplate({
                      ...currentTemplate,
                      voiceScript: e.target.value,
                    });
                  }
                }}
                className="col-span-3"
                placeholder={
                  currentTemplate?.type === "email"
                    ? "Enter email body..."
                    : currentTemplate?.type === "sms"
                      ? "Enter SMS text..."
                      : currentTemplate?.type === "voice"
                        ? "Enter voice script..."
                        : ""
                }
              />
            </div>

            <div className="col-span-4 text-xs text-muted-foreground">
              <p>
                Available variables: {{ first_name }}, {{ last_name }},{" "}
                {{ email }}, {{ phone }}, {{ company }}, {{ product_name }},{" "}
                {{ agent_name }}
              </p>
              {currentTemplate?.type === "sms" && (
                <p className="mt-1">
                  Character count: {currentTemplate?.smsText?.length || 0}
                  {(currentTemplate?.smsText?.length || 0) > 160 &&
                    " (SMS will be split into multiple messages)"}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditingTemplate(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rule Edit Dialog */}
      <Dialog open={isEditingRule} onOpenChange={setIsEditingRule}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {currentRule?.id.includes("new") ? "Add Rule" : "Edit Rule"}
            </DialogTitle>
            <DialogDescription>
              Configure when and how auto-replies are triggered.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rule-name" className="text-right">
                Name
              </Label>
              <Input
                id="rule-name"
                value={currentRule?.name || ""}
                onChange={(e) =>
                  setCurrentRule((prev) =>
                    prev ? { ...prev, name: e.target.value } : null,
                  )
                }
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rule-active" className="text-right">
                Status
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Switch
                  id="rule-active"
                  checked={currentRule?.active || false}
                  onCheckedChange={(checked) =>
                    setCurrentRule((prev) =>
                      prev ? { ...prev, active: checked } : null,
                    )
                  }
                />
                <Label htmlFor="rule-active">
                  {currentRule?.active ? "Active" : "Inactive"}
                </Label>
              </div>
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Message Types</Label>
              <div className="col-span-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {(["email", "sms", "voice"] as MessageType[]).map((type) => (
                    <Badge
                      key={type}
                      variant={
                        (currentRule?.conditions.type || []).includes(type)
                          ? "default"
                          : "outline-solid"
                      }
                      className="cursor-pointer capitalize"
                      onClick={() => {
                        if (!currentRule) return;

                        const types = currentRule.conditions.type || [];
                        const newTypes = types.includes(type)
                          ? types.filter((t) => t !== type)
                          : [...types, type];

                        setCurrentRule({
                          ...currentRule,
                          conditions: {
                            ...currentRule.conditions,
                            type: newTypes,
                          },
                        });
                      }}
                    >
                      {getTemplateTypeIcon(type)}
                      <span className="ml-1">{type}</span>
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select which message types this rule applies to.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="rule-keywords" className="text-right pt-2">
                Keywords
              </Label>
              <div className="col-span-3">
                <Textarea
                  id="rule-keywords"
                  value={(currentRule?.conditions.contains || []).join(", ")}
                  onChange={(e) => {
                    if (!currentRule) return;

                    const keywords = e.target.value
                      .split(",")
                      .map((k) => k.trim())
                      .filter((k) => k.length > 0);

                    setCurrentRule({
                      ...currentRule,
                      conditions: {
                        ...currentRule.conditions,
                        contains: keywords,
                      },
                    });
                  }}
                  placeholder="Enter keywords separated by commas"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter keywords or phrases that trigger this rule, separated by
                  commas.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rule-template" className="text-right">
                Template
              </Label>
              <Select
                value={currentRule?.templateId || ""}
                onValueChange={(value) =>
                  setCurrentRule((prev) =>
                    prev ? { ...prev, templateId: value } : null,
                  )
                }
              >
                <SelectTrigger id="rule-template" className="col-span-3">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rule-priority" className="text-right">
                Priority
              </Label>
              <Input
                id="rule-priority"
                type="number"
                min="1"
                value={currentRule?.priority || 1}
                onChange={(e) =>
                  setCurrentRule((prev) =>
                    prev
                      ? {
                          ...prev,
                          priority: Number.parseInt(e.target.value) || 1,
                        }
                      : null,
                  )
                }
                className="col-span-3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingRule(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRule}>Save Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
