"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Phone,
  Save,
  Plus,
  Trash2,
  Edit,
  AlertTriangle,
  BarChart3,
  PhoneCall,
  MessageSquare,
  FileText,
  Settings,
  Upload,
  Bell,
  Shield,
  ArrowUpDown,
  ExternalLink,
} from "lucide-react";

export function TwilioIntegration() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [isPortingDialogOpen, setIsPortingDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isWebhookDialogOpen, setIsWebhookDialogOpen] = useState(false);
  const [isNumberDialogOpen, setIsNumberDialogOpen] = useState(false);

  const [credentials, setCredentials] = useState({
    accountSid: process.env.TWILIO_ACCOUNT_SID || "",
    authToken: process.env.TWILIO_AUTH_TOKEN || "",
    phoneNumber: process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER || "",
    appSid: process.env.TWILIO_APP_SID || "",
    apiKey: process.env.TWILIO_API_KEY || "",
    apiSecret: "",
  });

  const [settings, setSettings] = useState({
    enableVoice: true,
    enableSMS: true,
    recordCalls: true,
    transcribeVoicemail: true,
    callTimeout: "30",
    defaultGreeting:
      "Hello, thank you for calling. Please leave a message after the tone.",
    enableOptOutManagement: true,
    storeConsentRecords: true,
    respectDoNotCall: true,
    enableTimeRestrictions: true,
    callStartTime: "08:00",
    callEndTime: "20:00",
    smsStartTime: "09:00",
    smsEndTime: "20:00",
    respectTimeZones: true,
    defaultTimeZone: "America/New_York",
    maxRetries: "3",
    retryInterval: "10",
    alertOnFailure: true,
    alertEmail: "",
    fallbackToEmail: false,
    usageAlertThreshold: "80",
    deliveryRateThreshold: "90",
    budgetLimit: "1000",
    signatureValidation: true,
  });

  const [templates, setTemplates] = useState([
    {
      id: "template-1",
      name: "Initial Contact",
      description: "First outreach to a new lead",
      content:
        "Hi {{ name }}, this is {{ agent }} from Nextier. I'd like to discuss...",
      tags: ["outreach", "initial"],
      channel: "sms",
      isActive: true,
    },
    {
      id: "template-2",
      name: "Follow Up",
      description: "Follow up after initial contact",
      content: "Hi {{ name }}, just following up on our conversation about...",
      tags: ["follow-up"],
      channel: "sms",
      isActive: true,
    },
    {
      id: "template-3",
      name: "Appointment Reminder",
      description: "Reminder for scheduled appointments",
      content:
        "Reminder: You have an appointment with {{ agent }} on {{ date }} at {{ time }}...",
      tags: ["appointment", "reminder"],
      channel: "sms",
      isActive: true,
    },
    {
      id: "template-4",
      name: "Property Update",
      description: "Updates about property status",
      content:
        "Hi {{ name }}, there's an update about the property at {{ address }}...",
      tags: ["property", "update"],
      channel: "sms",
      isActive: false,
    },
    {
      id: "template-5",
      name: "Standard Voicemail",
      description: "Default voicemail message",
      content:
        "Hello, you've reached {{ agent }} at Nextier. I'm not available right now, but please leave a message and I'll get back to you as soon as possible.",
      tags: ["voicemail"],
      channel: "voice",
      isActive: true,
    },
  ]);

  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    content: "",
    tags: "",
    channel: "sms",
  });

  const [phoneNumbers, setPhoneNumbers] = useState([
    {
      id: "PN123456789",
      phoneNumber: "+1 (555) 123-4567",
      friendlyName: "Sales Team",
      capabilities: { voice: true, sms: true, mms: true },
      status: "active",
      usage: { voice: 245, sms: 1250 },
      monthlyPrice: 1.0,
      dateAdded: "2023-01-15",
    },
    {
      id: "PN234567890",
      phoneNumber: "+1 (555) 234-5678",
      friendlyName: "Support Team",
      capabilities: { voice: true, sms: true, mms: true },
      status: "active",
      usage: { voice: 120, sms: 850 },
      monthlyPrice: 1.0,
      dateAdded: "2023-02-20",
    },
    {
      id: "PN345678901",
      phoneNumber: "+1 (555) 345-6789",
      friendlyName: "Marketing",
      capabilities: { voice: false, sms: true, mms: true },
      status: "active",
      usage: { voice: 0, sms: 3200 },
      monthlyPrice: 1.0,
      dateAdded: "2023-03-10",
    },
  ]);

  const [webhooks, setWebhooks] = useState([
    {
      id: "wh-1",
      name: "Incoming SMS",
      url: "https://example.com/api/twilio/sms/incoming",
      method: "POST",
      eventType: "incoming_message",
      isActive: true,
    },
    {
      id: "wh-2",
      name: "Message Status",
      url: "https://example.com/api/twilio/sms/status",
      method: "POST",
      eventType: "message_status",
      isActive: true,
    },
    {
      id: "wh-3",
      name: "Incoming Call",
      url: "https://example.com/api/twilio/voice/incoming",
      method: "POST",
      eventType: "incoming_call",
      isActive: true,
    },
  ]);

  const [newWebhook, setNewWebhook] = useState({
    name: "",
    url: "",
    method: "POST",
    eventType: "incoming_message",
  });

  const [portingRequest, setPortingRequest] = useState({
    phoneNumbers: "",
    currentProvider: "",
    accountNumber: "",
    pinCode: "",
    authorizedName: "",
    authorizedPosition: "",
    companyName: "",
    serviceAddress: "",
    city: "",
    state: "",
    zipCode: "",
    billUploadUrl: "",
    letterOfAuthorizationUrl: "",
    requestedPortDate: "",
  });

  const [newPhoneNumber, setNewPhoneNumber] = useState({
    areaCode: "",
    capabilities: { voice: true, sms: true, mms: true },
    friendlyName: "",
  });

  const [usageData, setUsageData] = useState({
    voice: {
      current: 450,
      limit: 1000,
      lastMonth: 380,
    },
    sms: {
      current: 5300,
      limit: 10000,
      lastMonth: 4800,
    },
    phoneNumbers: {
      current: 3,
      limit: 10,
    },
    spending: {
      current: 350,
      budget: 1000,
      lastMonth: 320,
    },
  });

  const handleCredentialChange = (field: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [field]: value }));
  };

  const handleSettingChange = (field: string, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleNewTemplateChange = (field: string, value: string) => {
    setNewTemplate((prev) => ({ ...prev, [field]: value }));
  };

  const handleNewWebhookChange = (field: string, value: string) => {
    setNewWebhook((prev) => ({ ...prev, [field]: value }));
  };

  const handlePortingRequestChange = (field: string, value: string) => {
    setPortingRequest((prev) => ({ ...prev, [field]: value }));
  };

  const handleNewPhoneNumberChange = (field: string, value: any) => {
    if (field.startsWith("capabilities.")) {
      const capabilityField = field.split(".")[1];
      setNewPhoneNumber((prev) => ({
        ...prev,
        capabilities: {
          ...prev.capabilities,
          [capabilityField]: value,
        },
      }));
    } else {
      setNewPhoneNumber((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSaveCredentials = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Success
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save credentials",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Success
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Success
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to connect to Twilio",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTemplate = () => {
    if (!newTemplate.name || !newTemplate.content) {
      setError("Template name and content are required");
      return;
    }

    const newTemplateObj = {
      id: `template-${templates.length + 1}`,
      name: newTemplate.name,
      description: newTemplate.description,
      content: newTemplate.content,
      tags: newTemplate.tags.split(",").map((tag) => tag.trim()),
      channel: newTemplate.channel,
      isActive: true,
    };

    setTemplates([...templates, newTemplateObj]);
    setNewTemplate({
      name: "",
      description: "",
      content: "",
      tags: "",
      channel: "sms",
    });
    setIsTemplateDialogOpen(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates(templates.filter((template) => template.id !== id));
  };

  const handleToggleTemplateStatus = (id: string) => {
    setTemplates(
      templates.map((template) =>
        template.id === id
          ? { ...template, isActive: !template.isActive }
          : template,
      ),
    );
  };

  const handleAddWebhook = () => {
    if (!newWebhook.name || !newWebhook.url) {
      setError("Webhook name and URL are required");
      return;
    }

    const newWebhookObj = {
      id: `wh-${webhooks.length + 1}`,
      name: newWebhook.name,
      url: newWebhook.url,
      method: newWebhook.method,
      eventType: newWebhook.eventType,
      isActive: true,
    };

    setWebhooks([...webhooks, newWebhookObj]);
    setNewWebhook({
      name: "",
      url: "",
      method: "POST",
      eventType: "incoming_message",
    });
    setIsWebhookDialogOpen(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleDeleteWebhook = (id: string) => {
    setWebhooks(webhooks.filter((webhook) => webhook.id !== id));
  };

  const handleToggleWebhookStatus = (id: string) => {
    setWebhooks(
      webhooks.map((webhook) =>
        webhook.id === id
          ? { ...webhook, isActive: !webhook.isActive }
          : webhook,
      ),
    );
  };

  const handleSubmitPortingRequest = () => {
    setIsLoading(true);
    setError(null);

    // Validate form
    if (
      !portingRequest.phoneNumbers ||
      !portingRequest.currentProvider ||
      !portingRequest.authorizedName
    ) {
      setError("Please fill in all required fields");
      setIsLoading(false);
      return;
    }

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setSuccess(true);
      setIsPortingDialogOpen(false);

      // Reset form
      setPortingRequest({
        phoneNumbers: "",
        currentProvider: "",
        accountNumber: "",
        pinCode: "",
        authorizedName: "",
        authorizedPosition: "",
        companyName: "",
        serviceAddress: "",
        city: "",
        state: "",
        zipCode: "",
        billUploadUrl: "",
        letterOfAuthorizationUrl: "",
        requestedPortDate: "",
      });

      setTimeout(() => setSuccess(false), 3000);
    }, 1500);
  };

  const handleAddPhoneNumber = () => {
    if (!newPhoneNumber.areaCode || !newPhoneNumber.friendlyName) {
      setError("Area code and friendly name are required");
      return;
    }

    // Simulate API call to purchase number
    setIsLoading(true);
    setTimeout(() => {
      const newNumber = {
        id: `PN${Date.now()}`,
        phoneNumber: `+1 (${newPhoneNumber.areaCode}) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`,
        friendlyName: newPhoneNumber.friendlyName,
        capabilities: newPhoneNumber.capabilities,
        status: "active",
        usage: { voice: 0, sms: 0 },
        monthlyPrice: 1.0,
        dateAdded: new Date().toISOString().split("T")[0],
      };

      setPhoneNumbers([...phoneNumbers, newNumber]);
      setNewPhoneNumber({
        areaCode: "",
        capabilities: { voice: true, sms: true, mms: true },
        friendlyName: "",
      });
      setIsNumberDialogOpen(false);
      setIsLoading(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 1500);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Twilio Integration</CardTitle>
            <CardDescription>
              Configure Twilio for voice and SMS capabilities
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className="bg-green-500/10 text-green-500 border-green-500/20"
          >
            Connected
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="voice">Voice</TabsTrigger>
            <TabsTrigger value="sms">SMS</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="numbers">Phone Numbers</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accountSid">Account SID</Label>
                  <Input
                    id="accountSid"
                    value={credentials.accountSid}
                    onChange={(e) =>
                      handleCredentialChange("accountSid", e.target.value)
                    }
                    placeholder="Enter your Twilio Account SID"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="authToken">Auth Token</Label>
                  <Input
                    id="authToken"
                    type="password"
                    value={credentials.authToken}
                    onChange={(e) =>
                      handleCredentialChange("authToken", e.target.value)
                    }
                    placeholder="Enter your Twilio Auth Token"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">
                    API Key (recommended for production)
                  </Label>
                  <Input
                    id="apiKey"
                    value={credentials.apiKey}
                    onChange={(e) =>
                      handleCredentialChange("apiKey", e.target.value)
                    }
                    placeholder="Enter your Twilio API Key"
                  />
                  <p className="text-xs text-muted-foreground">
                    Using API Keys is more secure than using your Auth Token
                    directly
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiSecret">API Secret</Label>
                  <Input
                    id="apiSecret"
                    type="password"
                    value={credentials.apiSecret}
                    onChange={(e) =>
                      handleCredentialChange("apiSecret", e.target.value)
                    }
                    placeholder="Enter your Twilio API Secret"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appSid">TwiML App SID</Label>
                  <Input
                    id="appSid"
                    value={credentials.appSid}
                    onChange={(e) =>
                      handleCredentialChange("appSid", e.target.value)
                    }
                    placeholder="Enter your TwiML App SID"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for voice applications
                  </p>
                </div>
              </div>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="webhooks">
                  <AccordionTrigger>
                    <div className="flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      Webhook Configuration
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-medium">
                          Configured Webhooks
                        </h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsWebhookDialogOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add Webhook
                        </Button>
                      </div>

                      <div className="border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Event Type</TableHead>
                              <TableHead>URL</TableHead>
                              <TableHead>Method</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {webhooks.map((webhook) => (
                              <TableRow key={webhook.id}>
                                <TableCell>{webhook.name}</TableCell>
                                <TableCell>
                                  {webhook.eventType === "incoming_message"
                                    ? "Incoming Message"
                                    : webhook.eventType === "message_status"
                                      ? "Message Status"
                                      : webhook.eventType === "incoming_call"
                                        ? "Incoming Call"
                                        : webhook.eventType}
                                </TableCell>
                                <TableCell className="font-mono text-xs truncate max-w-[200px]">
                                  {webhook.url}
                                </TableCell>
                                <TableCell>{webhook.method}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      webhook.isActive ? "default" : "secondary"
                                    }
                                  >
                                    {webhook.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        handleToggleWebhookStatus(webhook.id)
                                      }
                                    >
                                      {webhook.isActive ? (
                                        <XCircle className="h-4 w-4 text-muted-foreground" />
                                      ) : (
                                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        handleDeleteWebhook(webhook.id)
                                      }
                                    >
                                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <AlertTriangle className="h-4 w-4" />
                        <p>
                          Webhooks must be publicly accessible and respond
                          within 15 seconds
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="security">
                  <AccordionTrigger>
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      Security Settings
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="signatureValidation">
                            Signature Validation
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Validate that requests are coming from Twilio
                          </p>
                        </div>
                        <Switch
                          id="signatureValidation"
                          checked={settings.signatureValidation}
                          onCheckedChange={(checked) =>
                            handleSettingChange("signatureValidation", checked)
                          }
                        />
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label>Allowed IP Addresses</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Twilio's IP addresses are automatically allowed. Add
                          additional IPs if needed.
                        </p>
                        <div className="flex space-x-2">
                          <Input placeholder="Enter IP address" />
                          <Button variant="outline">Add</Button>
                        </div>
                      </div>

                      <div className="rounded-md bg-muted p-4">
                        <div className="flex items-start space-x-3">
                          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-medium">
                              Security Recommendation
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              For production environments, we recommend using
                              API Keys instead of your Auth Token, enabling
                              signature validation, and setting up IP
                              restrictions.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </Button>

                <Button onClick={handleSaveCredentials} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Credentials
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="voice" className="space-y-4 mt-4">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableVoice">Enable Voice Calls</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow making and receiving voice calls
                  </p>
                </div>
                <Switch
                  id="enableVoice"
                  checked={settings.enableVoice}
                  onCheckedChange={(checked) =>
                    handleSettingChange("enableVoice", checked)
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="recordCalls">Record Calls</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically record all calls for quality and training
                  </p>
                </div>
                <Switch
                  id="recordCalls"
                  checked={settings.recordCalls}
                  onCheckedChange={(checked) =>
                    handleSettingChange("recordCalls", checked)
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="transcribeVoicemail">
                    Transcribe Voicemail
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically transcribe voicemail messages
                  </p>
                </div>
                <Switch
                  id="transcribeVoicemail"
                  checked={settings.transcribeVoicemail}
                  onCheckedChange={(checked) =>
                    handleSettingChange("transcribeVoicemail", checked)
                  }
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="callTimeout">Call Timeout (seconds)</Label>
                <Select
                  value={settings.callTimeout}
                  onValueChange={(value) =>
                    handleSettingChange("callTimeout", value)
                  }
                >
                  <SelectTrigger id="callTimeout">
                    <SelectValue placeholder="Select timeout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="45">45 seconds</SelectItem>
                    <SelectItem value="60">60 seconds</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How long to ring before sending to voicemail
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultGreeting">Default Greeting</Label>
                <Input
                  id="defaultGreeting"
                  value={settings.defaultGreeting}
                  onChange={(e) =>
                    handleSettingChange("defaultGreeting", e.target.value)
                  }
                  placeholder="Enter default greeting message"
                />
                <p className="text-xs text-muted-foreground">
                  Default voicemail greeting message
                </p>
              </div>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="compliance">
                  <AccordionTrigger>
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      Compliance Settings
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="respectDoNotCall">
                            Respect Do Not Call List
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Automatically block calls to numbers on the Do Not
                            Call list
                          </p>
                        </div>
                        <Switch
                          id="respectDoNotCall"
                          checked={settings.respectDoNotCall}
                          onCheckedChange={(checked) =>
                            handleSettingChange("respectDoNotCall", checked)
                          }
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="enableTimeRestrictions">
                            Enable Time Restrictions
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Restrict outbound calls to certain hours
                          </p>
                        </div>
                        <Switch
                          id="enableTimeRestrictions"
                          checked={settings.enableTimeRestrictions}
                          onCheckedChange={(checked) =>
                            handleSettingChange(
                              "enableTimeRestrictions",
                              checked,
                            )
                          }
                        />
                      </div>

                      {settings.enableTimeRestrictions && (
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div className="space-y-2">
                            <Label htmlFor="callStartTime">Start Time</Label>
                            <Input
                              id="callStartTime"
                              type="time"
                              value={settings.callStartTime}
                              onChange={(e) =>
                                handleSettingChange(
                                  "callStartTime",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="callEndTime">End Time</Label>
                            <Input
                              id="callEndTime"
                              type="time"
                              value={settings.callEndTime}
                              onChange={(e) =>
                                handleSettingChange(
                                  "callEndTime",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        </div>
                      )}

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="respectTimeZones">
                            Respect Time Zones
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Apply time restrictions based on recipient's time
                            zone
                          </p>
                        </div>
                        <Switch
                          id="respectTimeZones"
                          checked={settings.respectTimeZones}
                          onCheckedChange={(checked) =>
                            handleSettingChange("respectTimeZones", checked)
                          }
                        />
                      </div>

                      {settings.respectTimeZones && (
                        <div className="space-y-2 mt-2">
                          <Label htmlFor="defaultTimeZone">
                            Default Time Zone
                          </Label>
                          <Select
                            value={settings.defaultTimeZone}
                            onValueChange={(value) =>
                              handleSettingChange("defaultTimeZone", value)
                            }
                          >
                            <SelectTrigger id="defaultTimeZone">
                              <SelectValue placeholder="Select default time zone" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="America/New_York">
                                Eastern Time (ET)
                              </SelectItem>
                              <SelectItem value="America/Chicago">
                                Central Time (CT)
                              </SelectItem>
                              <SelectItem value="America/Denver">
                                Mountain Time (MT)
                              </SelectItem>
                              <SelectItem value="America/Los_Angeles">
                                Pacific Time (PT)
                              </SelectItem>
                              <SelectItem value="America/Anchorage">
                                Alaska Time (AKT)
                              </SelectItem>
                              <SelectItem value="Pacific/Honolulu">
                                Hawaii Time (HT)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Used when recipient's time zone cannot be determined
                          </p>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveSettings} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Voice Settings
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sms" className="space-y-4 mt-4">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableSMS">Enable SMS</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow sending and receiving SMS messages
                  </p>
                </div>
                <Switch
                  id="enableSMS"
                  checked={settings.enableSMS}
                  onCheckedChange={(checked) =>
                    handleSettingChange("enableSMS", checked)
                  }
                />
              </div>

              <Separator />

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="compliance">
                  <AccordionTrigger>
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      Compliance Settings
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="enableOptOutManagement">
                            Opt-out Management
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Automatically handle STOP, CANCEL, UNSUBSCRIBE
                            responses
                          </p>
                        </div>
                        <Switch
                          id="enableOptOutManagement"
                          checked={settings.enableOptOutManagement}
                          onCheckedChange={(checked) =>
                            handleSettingChange(
                              "enableOptOutManagement",
                              checked,
                            )
                          }
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="storeConsentRecords">
                            Store Consent Records
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Keep records of consent for messaging
                          </p>
                        </div>
                        <Switch
                          id="storeConsentRecords"
                          checked={settings.storeConsentRecords}
                          onCheckedChange={(checked) =>
                            handleSettingChange("storeConsentRecords", checked)
                          }
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="enableTimeRestrictions">
                            Enable Time Restrictions
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Restrict SMS sending to certain hours
                          </p>
                        </div>
                        <Switch
                          id="enableTimeRestrictions"
                          checked={settings.enableTimeRestrictions}
                          onCheckedChange={(checked) =>
                            handleSettingChange(
                              "enableTimeRestrictions",
                              checked,
                            )
                          }
                        />
                      </div>

                      {settings.enableTimeRestrictions && (
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div className="space-y-2">
                            <Label htmlFor="smsStartTime">Start Time</Label>
                            <Input
                              id="smsStartTime"
                              type="time"
                              value={settings.smsStartTime}
                              onChange={(e) =>
                                handleSettingChange(
                                  "smsStartTime",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="smsEndTime">End Time</Label>
                            <Input
                              id="smsEndTime"
                              type="time"
                              value={settings.smsEndTime}
                              onChange={(e) =>
                                handleSettingChange(
                                  "smsEndTime",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="error-handling">
                  <AccordionTrigger>
                    <div className="flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Error Handling
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="maxRetries">Max Retries</Label>
                        <Select
                          value={settings.maxRetries}
                          onValueChange={(value) =>
                            handleSettingChange("maxRetries", value)
                          }
                        >
                          <SelectTrigger id="maxRetries">
                            <SelectValue placeholder="Select max retries" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">No retries</SelectItem>
                            <SelectItem value="1">1 retry</SelectItem>
                            <SelectItem value="2">2 retries</SelectItem>
                            <SelectItem value="3">3 retries</SelectItem>
                            <SelectItem value="5">5 retries</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Number of times to retry failed messages
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="retryInterval">
                          Retry Interval (minutes)
                        </Label>
                        <Select
                          value={settings.retryInterval}
                          onValueChange={(value) =>
                            handleSettingChange("retryInterval", value)
                          }
                        >
                          <SelectTrigger id="retryInterval">
                            <SelectValue placeholder="Select retry interval" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 minutes</SelectItem>
                            <SelectItem value="10">10 minutes</SelectItem>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="alertOnFailure">
                            Alert on Failure
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Send notifications for failed messages
                          </p>
                        </div>
                        <Switch
                          id="alertOnFailure"
                          checked={settings.alertOnFailure}
                          onCheckedChange={(checked) =>
                            handleSettingChange("alertOnFailure", checked)
                          }
                        />
                      </div>

                      {settings.alertOnFailure && (
                        <div className="space-y-2 mt-2">
                          <Label htmlFor="alertEmail">Alert Email</Label>
                          <Input
                            id="alertEmail"
                            type="email"
                            value={settings.alertEmail}
                            onChange={(e) =>
                              handleSettingChange("alertEmail", e.target.value)
                            }
                            placeholder="Enter email for alerts"
                          />
                        </div>
                      )}

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="fallbackToEmail">
                            Fallback to Email
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Send email when SMS delivery fails
                          </p>
                        </div>
                        <Switch
                          id="fallbackToEmail"
                          checked={settings.fallbackToEmail}
                          onCheckedChange={(checked) =>
                            handleSettingChange("fallbackToEmail", checked)
                          }
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("templates")}
                >
                  Manage Templates
                </Button>

                <Button onClick={handleSaveSettings} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save SMS Settings
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Message Templates</h3>
                <p className="text-sm text-muted-foreground">
                  Create and manage templates for SMS and voice messages
                </p>
              </div>
              <Button onClick={() => setIsTemplateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Template
              </Button>
            </div>

            <Tabs defaultValue="sms" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sms">SMS Templates</TabsTrigger>
                <TabsTrigger value="voice">Voice Templates</TabsTrigger>
              </TabsList>

              <TabsContent value="sms" className="mt-4">
                <div className="space-y-4">
                  {templates
                    .filter((template) => template.channel === "sms")
                    .map((template) => (
                      <Card key={template.id}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-base">
                                {template.name}
                              </CardTitle>
                              <CardDescription>
                                {template.description}
                              </CardDescription>
                            </div>
                            <Badge
                              variant={
                                template.isActive ? "default" : "secondary"
                              }
                            >
                              {template.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <div className="bg-muted p-3 rounded-md text-sm">
                            {template.content}
                          </div>
                          {template.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {template.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                        <CardFooter className="flex justify-end space-x-2 pt-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleToggleTemplateStatus(template.id)
                            }
                          >
                            {template.isActive ? "Disable" : "Enable"}
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="voice" className="mt-4">
                <div className="space-y-4">
                  {templates
                    .filter((template) => template.channel === "voice")
                    .map((template) => (
                      <Card key={template.id}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-base">
                                {template.name}
                              </CardTitle>
                              <CardDescription>
                                {template.description}
                              </CardDescription>
                            </div>
                            <Badge
                              variant={
                                template.isActive ? "default" : "secondary"
                              }
                            >
                              {template.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <div className="bg-muted p-3 rounded-md text-sm">
                            {template.content}
                          </div>
                          {template.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {template.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                        <CardFooter className="flex justify-end space-x-2 pt-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleToggleTemplateStatus(template.id)
                            }
                          >
                            {template.isActive ? "Disable" : "Enable"}
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}

                  {templates.filter((template) => template.channel === "voice")
                    .length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        No voice templates found
                      </p>
                      <Button
                        variant="outline"
                        className="mt-2"
                        onClick={() => {
                          setNewTemplate({ ...newTemplate, channel: "voice" });
                          setIsTemplateDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add Voice Template
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="rounded-md bg-muted p-4 mt-4">
              <div className="flex items-start space-x-3">
                <FileText className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium">Template Variables</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use double curly braces to insert variables:{" "}
                    <code className="bg-background px-1 py-0.5 rounded">
                      {"{{ variable_name }}"}
                    </code>
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="text-xs">
                      <code className="bg-background px-1 py-0.5 rounded">
                        {"{{ name }}"}
                      </code>{" "}
                      - Contact name
                    </div>
                    <div className="text-xs">
                      <code className="bg-background px-1 py-0.5 rounded">
                        {"{{ agent }}"}
                      </code>{" "}
                      - Agent name
                    </div>
                    <div className="text-xs">
                      <code className="bg-background px-1 py-0.5 rounded">
                        {"{{ date }}"}
                      </code>{" "}
                      - Formatted date
                    </div>
                    <div className="text-xs">
                      <code className="bg-background px-1 py-0.5 rounded">
                        {"{{ time }}"}
                      </code>{" "}
                      - Formatted time
                    </div>
                    <div className="text-xs">
                      <code className="bg-background px-1 py-0.5 rounded">
                        {"{{ address }}"}
                      </code>{" "}
                      - Property address
                    </div>
                    <div className="text-xs">
                      <code className="bg-background px-1 py-0.5 rounded">
                        {"{{ company }}"}
                      </code>{" "}
                      - Company name
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="numbers" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Phone Numbers</h3>
                <p className="text-sm text-muted-foreground">
                  Manage your Twilio phone numbers
                </p>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsPortingDialogOpen(true)}
                >
                  <Upload className="h-4 w-4 mr-2" /> Port Numbers
                </Button>
                <Button onClick={() => setIsNumberDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Number
                </Button>
              </div>
            </div>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Friendly Name</TableHead>
                    <TableHead>Capabilities</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {phoneNumbers.map((number) => (
                    <TableRow key={number.id}>
                      <TableCell className="font-medium">
                        {number.phoneNumber}
                      </TableCell>
                      <TableCell>{number.friendlyName}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          {number.capabilities.voice && (
                            <Badge
                              variant="outline"
                              className="bg-blue-500/10 text-blue-500 border-blue-500/20"
                            >
                              Voice
                            </Badge>
                          )}
                          {number.capabilities.sms && (
                            <Badge
                              variant="outline"
                              className="bg-green-500/10 text-green-500 border-green-500/20"
                            >
                              SMS
                            </Badge>
                          )}
                          {number.capabilities.mms && (
                            <Badge
                              variant="outline"
                              className="bg-purple-500/10 text-purple-500 border-purple-500/20"
                            >
                              MMS
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            number.status === "active" ? "default" : "secondary"
                          }
                        >
                          {number.status === "active" ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          <div className="flex items-center">
                            <PhoneCall className="h-3 w-3 mr-1" />{" "}
                            {number.usage.voice} calls
                          </div>
                          <div className="flex items-center mt-1">
                            <MessageSquare className="h-3 w-3 mr-1" />{" "}
                            {number.usage.sms} messages
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button variant="ghost" size="icon">
                            <Settings className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="number-pool">
                <AccordionTrigger>
                  <div className="flex items-center">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    Number Pool Management
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <p className="text-sm text-muted-foreground">
                      Number pooling helps avoid carrier filtering by rotating
                      through multiple phone numbers for high-volume messaging.
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Number Pooling</Label>
                        <p className="text-xs text-muted-foreground">
                          Automatically rotate through available numbers
                        </p>
                      </div>
                      <Switch />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Pooling Strategy</Label>
                      <RadioGroup defaultValue="round-robin">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value="round-robin"
                            id="round-robin"
                          />
                          <Label htmlFor="round-robin">Round Robin</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="least-used" id="least-used" />
                          <Label htmlFor="least-used">Least Used First</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value="area-code-match"
                            id="area-code-match"
                          />
                          <Label htmlFor="area-code-match">
                            Area Code Matching
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Daily Message Limit Per Number</Label>
                      <Select defaultValue="200">
                        <SelectTrigger>
                          <SelectValue placeholder="Select limit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="100">100 messages</SelectItem>
                          <SelectItem value="200">200 messages</SelectItem>
                          <SelectItem value="500">500 messages</SelectItem>
                          <SelectItem value="1000">1,000 messages</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Recommended: 200 messages per number per day to avoid
                        carrier filtering
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Voice Usage</CardTitle>
                  <CardDescription>Current billing cycle</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Minutes Used</span>
                        <span className="font-medium">
                          {usageData.voice.current} / {usageData.voice.limit}
                        </span>
                      </div>
                      <Progress
                        value={
                          (usageData.voice.current / usageData.voice.limit) *
                          100
                        }
                      />
                    </div>

                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        Last Month: {usageData.voice.lastMonth} minutes
                      </span>
                      <span>
                        {Math.round(
                          (usageData.voice.current / usageData.voice.limit) *
                            100,
                        )}
                        % of limit
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">SMS Usage</CardTitle>
                  <CardDescription>Current billing cycle</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Messages Sent</span>
                        <span className="font-medium">
                          {usageData.sms.current} / {usageData.sms.limit}
                        </span>
                      </div>
                      <Progress
                        value={
                          (usageData.sms.current / usageData.sms.limit) * 100
                        }
                      />
                    </div>

                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        Last Month: {usageData.sms.lastMonth} messages
                      </span>
                      <span>
                        {Math.round(
                          (usageData.sms.current / usageData.sms.limit) * 100,
                        )}
                        % of limit
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Phone Numbers</CardTitle>
                  <CardDescription>Active numbers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Active Numbers</span>
                        <span className="font-medium">
                          {usageData.phoneNumbers.current} /{" "}
                          {usageData.phoneNumbers.limit}
                        </span>
                      </div>
                      <Progress
                        value={
                          (usageData.phoneNumbers.current /
                            usageData.phoneNumbers.limit) *
                          100
                        }
                      />
                    </div>

                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        Voice & SMS Capable:{" "}
                        {
                          phoneNumbers.filter(
                            (n) => n.capabilities.voice && n.capabilities.sms,
                          ).length
                        }
                      </span>
                      <span>
                        SMS Only:{" "}
                        {
                          phoneNumbers.filter(
                            (n) => !n.capabilities.voice && n.capabilities.sms,
                          ).length
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Spending</CardTitle>
                  <CardDescription>Current billing cycle</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Current Spend</span>
                        <span className="font-medium">
                          ${usageData.spending.current} / $
                          {usageData.spending.budget}
                        </span>
                      </div>
                      <Progress
                        value={
                          (usageData.spending.current /
                            usageData.spending.budget) *
                          100
                        }
                      />
                    </div>

                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Last Month: ${usageData.spending.lastMonth}</span>
                      <span>
                        {Math.round(
                          (usageData.spending.current /
                            usageData.spending.budget) *
                            100,
                        )}
                        % of budget
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="alerts">
                <AccordionTrigger>
                  <div className="flex items-center">
                    <Bell className="h-4 w-4 mr-2" />
                    Usage Alerts
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="usageAlertThreshold">
                        Usage Alert Threshold (%)
                      </Label>
                      <Select
                        value={settings.usageAlertThreshold}
                        onValueChange={(value) =>
                          handleSettingChange("usageAlertThreshold", value)
                        }
                      >
                        <SelectTrigger id="usageAlertThreshold">
                          <SelectValue placeholder="Select threshold" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="50">50% of limit</SelectItem>
                          <SelectItem value="75">75% of limit</SelectItem>
                          <SelectItem value="80">80% of limit</SelectItem>
                          <SelectItem value="90">90% of limit</SelectItem>
                          <SelectItem value="95">95% of limit</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Send alerts when usage reaches this percentage of your
                        limit
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deliveryRateThreshold">
                        Delivery Rate Alert Threshold (%)
                      </Label>
                      <Select
                        value={settings.deliveryRateThreshold}
                        onValueChange={(value) =>
                          handleSettingChange("deliveryRateThreshold", value)
                        }
                      >
                        <SelectTrigger id="deliveryRateThreshold">
                          <SelectValue placeholder="Select threshold" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="80">Below 80%</SelectItem>
                          <SelectItem value="85">Below 85%</SelectItem>
                          <SelectItem value="90">Below 90%</SelectItem>
                          <SelectItem value="95">Below 95%</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Alert when message delivery rate falls below this
                        threshold
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="budgetLimit">
                        Monthly Budget Limit ($)
                      </Label>
                      <Input
                        id="budgetLimit"
                        value={settings.budgetLimit}
                        onChange={(e) =>
                          handleSettingChange("budgetLimit", e.target.value)
                        }
                        placeholder="Enter budget limit"
                      />
                      <p className="text-xs text-muted-foreground">
                        Set a monthly spending limit for Twilio services
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Alert Recipients</Label>
                      <Input placeholder="Enter email addresses (comma separated)" />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="delivery-reports">
                <AccordionTrigger>
                  <div className="flex items-center">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Delivery Reports
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Daily Delivery Reports</Label>
                        <p className="text-xs text-muted-foreground">
                          Receive daily reports on message delivery statistics
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Weekly Usage Summary</Label>
                        <p className="text-xs text-muted-foreground">
                          Receive weekly summary of usage and costs
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Error Reports</Label>
                        <p className="text-xs text-muted-foreground">
                          Receive reports on message delivery errors
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex justify-end pt-4">
              <Button
                variant="outline"
                onClick={() =>
                  window.open("https://www.twilio.com/console", "_blank")
                }
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Twilio Dashboard
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mt-4 border-green-500/50 text-green-500 bg-green-500/10">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              {activeTab === "general"
                ? "Twilio credentials saved successfully."
                : activeTab === "voice"
                  ? "Voice settings saved successfully."
                  : activeTab === "sms"
                    ? "SMS settings saved successfully."
                    : activeTab === "templates"
                      ? "Templates updated successfully."
                      : "Settings saved successfully."}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t px-6 py-4">
        <div className="flex items-center text-sm text-muted-foreground">
          <Phone className="mr-2 h-4 w-4" />
          Last connected: 10 minutes ago
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            window.open("https://www.twilio.com/console", "_blank")
          }
        >
          View Twilio Dashboard
        </Button>
      </CardFooter>

      {/* Add Template Dialog */}
      <Dialog
        open={isTemplateDialogOpen}
        onOpenChange={setIsTemplateDialogOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Message Template</DialogTitle>
            <DialogDescription>
              Create a new template for SMS or voice messages.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                value={newTemplate.name}
                onChange={(e) =>
                  handleNewTemplateChange("name", e.target.value)
                }
                placeholder="e.g., Welcome Message"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateDescription">
                Description (optional)
              </Label>
              <Input
                id="templateDescription"
                value={newTemplate.description}
                onChange={(e) =>
                  handleNewTemplateChange("description", e.target.value)
                }
                placeholder="Brief description of this template"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateChannel">Channel</Label>
              <Select
                value={newTemplate.channel}
                onValueChange={(value) =>
                  handleNewTemplateChange("channel", value)
                }
              >
                <SelectTrigger id="templateChannel">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="voice">Voice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateContent">Content</Label>
              <Textarea
                id="templateContent"
                value={newTemplate.content}
                onChange={(e) =>
                  handleNewTemplateChange("content", e.target.value)
                }
                placeholder={
                  newTemplate.channel === "sms"
                    ? "Hi {{ name }}, this is {{ agent }} from..."
                    : "Hello, you've reached {{ agent }} at..."
                }
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                Use {"{{"} variable_name {"}}"} for dynamic content
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateTags">Tags (comma separated)</Label>
              <Input
                id="templateTags"
                value={newTemplate.tags}
                onChange={(e) =>
                  handleNewTemplateChange("tags", e.target.value)
                }
                placeholder="e.g., welcome, introduction, new-lead"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTemplateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddTemplate}>Add Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Webhook Dialog */}
      <Dialog open={isWebhookDialogOpen} onOpenChange={setIsWebhookDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Webhook</DialogTitle>
            <DialogDescription>
              Configure a webhook endpoint for Twilio events.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="webhookName">Webhook Name</Label>
              <Input
                id="webhookName"
                value={newWebhook.name}
                onChange={(e) => handleNewWebhookChange("name", e.target.value)}
                placeholder="e.g., Incoming SMS Handler"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhookUrl">URL</Label>
              <Input
                id="webhookUrl"
                value={newWebhook.url}
                onChange={(e) => handleNewWebhookChange("url", e.target.value)}
                placeholder="https://example.com/api/webhook"
              />
              <p className="text-xs text-muted-foreground">
                Must be a publicly accessible HTTPS URL
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhookMethod">HTTP Method</Label>
              <Select
                value={newWebhook.method}
                onValueChange={(value) =>
                  handleNewWebhookChange("method", value)
                }
              >
                <SelectTrigger id="webhookMethod">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhookEventType">Event Type</Label>
              <Select
                value={newWebhook.eventType}
                onValueChange={(value) =>
                  handleNewWebhookChange("eventType", value)
                }
              >
                <SelectTrigger id="webhookEventType">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incoming_message">
                    Incoming Message
                  </SelectItem>
                  <SelectItem value="message_status">Message Status</SelectItem>
                  <SelectItem value="incoming_call">Incoming Call</SelectItem>
                  <SelectItem value="call_status">Call Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsWebhookDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddWebhook}>Add Webhook</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Port Numbers Dialog */}
      <Dialog open={isPortingDialogOpen} onOpenChange={setIsPortingDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Port Existing Phone Numbers</DialogTitle>
            <DialogDescription>
              Transfer your existing phone numbers from another carrier to
              Twilio.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="portingPhoneNumbers">Phone Numbers to Port</Label>
              <Textarea
                id="portingPhoneNumbers"
                value={portingRequest.phoneNumbers}
                onChange={(e) =>
                  handlePortingRequestChange("phoneNumbers", e.target.value)
                }
                placeholder="Enter phone numbers, one per line"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Format: +1XXXXXXXXXX, one number per line
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentProvider">Current Service Provider</Label>
              <Input
                id="currentProvider"
                value={portingRequest.currentProvider}
                onChange={(e) =>
                  handlePortingRequestChange("currentProvider", e.target.value)
                }
                placeholder="e.g., Verizon, AT&T"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  value={portingRequest.accountNumber}
                  onChange={(e) =>
                    handlePortingRequestChange("accountNumber", e.target.value)
                  }
                  placeholder="Account number with current provider"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pinCode">PIN/Password</Label>
                <Input
                  id="pinCode"
                  type="password"
                  value={portingRequest.pinCode}
                  onChange={(e) =>
                    handlePortingRequestChange("pinCode", e.target.value)
                  }
                  placeholder="PIN or password if required"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="authorizedName">Authorized Name</Label>
              <Input
                id="authorizedName"
                value={portingRequest.authorizedName}
                onChange={(e) =>
                  handlePortingRequestChange("authorizedName", e.target.value)
                }
                placeholder="Name of authorized account holder"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="authorizedPosition">Position/Title</Label>
                <Input
                  id="authorizedPosition"
                  value={portingRequest.authorizedPosition}
                  onChange={(e) =>
                    handlePortingRequestChange(
                      "authorizedPosition",
                      e.target.value,
                    )
                  }
                  placeholder="e.g., Owner, Manager"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={portingRequest.companyName}
                  onChange={(e) =>
                    handlePortingRequestChange("companyName", e.target.value)
                  }
                  placeholder="If applicable"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="serviceAddress">Service Address</Label>
              <Input
                id="serviceAddress"
                value={portingRequest.serviceAddress}
                onChange={(e) =>
                  handlePortingRequestChange("serviceAddress", e.target.value)
                }
                placeholder="Address on file with current provider"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={portingRequest.city}
                  onChange={(e) =>
                    handlePortingRequestChange("city", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={portingRequest.state}
                  onChange={(e) =>
                    handlePortingRequestChange("state", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  value={portingRequest.zipCode}
                  onChange={(e) =>
                    handlePortingRequestChange("zipCode", e.target.value)
                  }
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Required Documents</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Please upload the following documents to complete your porting
                request.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="billUpload">Recent Bill (last 30 days)</Label>
                  <div className="flex items-center gap-2">
                    <Input id="billUpload" type="file" className="flex-1" />
                    <Button variant="outline" size="icon">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loaUpload">Letter of Authorization</Label>
                  <div className="flex items-center gap-2">
                    <Input id="loaUpload" type="file" className="flex-1" />
                    <Button variant="outline" size="icon">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <a href="#" className="text-primary underline">
                      Download LOA template
                    </a>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="requestedPortDate">Requested Port Date</Label>
              <Input
                id="requestedPortDate"
                type="date"
                value={portingRequest.requestedPortDate}
                onChange={(e) =>
                  handlePortingRequestChange(
                    "requestedPortDate",
                    e.target.value,
                  )
                }
              />
              <p className="text-xs text-muted-foreground">
                Porting typically takes 2-4 weeks to complete
              </p>
            </div>

            <div className="rounded-md bg-muted p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium">Important Information</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Do not cancel service with your current provider until the
                    porting process is complete. Canceling service before
                    completion may result in losing your phone numbers.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPortingDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitPortingRequest} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Porting Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Phone Number Dialog */}
      <Dialog open={isNumberDialogOpen} onOpenChange={setIsNumberDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Phone Number</DialogTitle>
            <DialogDescription>
              Purchase a new phone number from Twilio.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="areaCode">Area Code</Label>
              <Input
                id="areaCode"
                value={newPhoneNumber.areaCode}
                onChange={(e) =>
                  handleNewPhoneNumberChange("areaCode", e.target.value)
                }
                placeholder="e.g., 415"
                maxLength={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="friendlyName">Friendly Name</Label>
              <Input
                id="friendlyName"
                value={newPhoneNumber.friendlyName}
                onChange={(e) =>
                  handleNewPhoneNumberChange("friendlyName", e.target.value)
                }
                placeholder="e.g., Sales Team"
              />
            </div>

            <div className="space-y-2">
              <Label>Capabilities</Label>
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="voiceCapability"
                    checked={newPhoneNumber.capabilities.voice}
                    onCheckedChange={(checked) =>
                      handleNewPhoneNumberChange(
                        "capabilities.voice",
                        checked === true,
                      )
                    }
                  />
                  <Label
                    htmlFor="voiceCapability"
                    className="text-sm font-normal"
                  >
                    Voice
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="smsCapability"
                    checked={newPhoneNumber.capabilities.sms}
                    onCheckedChange={(checked) =>
                      handleNewPhoneNumberChange(
                        "capabilities.sms",
                        checked === true,
                      )
                    }
                  />
                  <Label
                    htmlFor="smsCapability"
                    className="text-sm font-normal"
                  >
                    SMS
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mmsCapability"
                    checked={newPhoneNumber.capabilities.mms}
                    onCheckedChange={(checked) =>
                      handleNewPhoneNumberChange(
                        "capabilities.mms",
                        checked === true,
                      )
                    }
                  />
                  <Label
                    htmlFor="mmsCapability"
                    className="text-sm font-normal"
                  >
                    MMS
                  </Label>
                </div>
              </div>
            </div>

            <div className="rounded-md bg-muted p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium">Number Availability</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Number availability varies by area code and capabilities. If
                    no numbers are available with your selected criteria, try a
                    different area code.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsNumberDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddPhoneNumber} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Purchasing...
                </>
              ) : (
                "Purchase Number"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
