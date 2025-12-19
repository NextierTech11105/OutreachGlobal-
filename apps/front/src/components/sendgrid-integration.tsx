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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Check,
  Copy,
  Eye,
  EyeOff,
  Key,
  Mail,
  RefreshCw,
  Save,
  Send,
  Settings,
  Shield,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function SendgridIntegration() {
  const [apiKey, setApiKey] = useState(
    "SG.•••••••••••••••••••••••••••••••••••••••••••••••••••••••",
  );
  const [fromEmail, setFromEmail] = useState("outreach@outreachglobal.com");
  const [fromName, setFromName] = useState("OutreachGlobal");
  const [replyTo, setReplyTo] = useState("support@outreachglobal.com");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [sandboxMode, setSandboxMode] = useState(false);
  const [ipPool, setIpPool] = useState("marketing");
  const [emailCategory, setEmailCategory] = useState("marketing");
  const [testEmail, setTestEmail] = useState("");
  const [webhookUrl, setWebhookUrl] = useState(
    `${process.env.BASE_URL}/api/sendgrid/webhook`,
  );
  const [eventTypes, setEventTypes] = useState([
    "delivered",
    "opened",
    "clicked",
  ]);
  const [dailyLimit, setDailyLimit] = useState("10000");
  const [batchSize, setBatchSize] = useState("1000");
  const [templates, setTemplates] = useState([
    {
      id: "d-f3ecde774a7641b88f3d0d7a16377963",
      name: "Welcome Email",
      type: "transactional",
    },
    {
      id: "d-12c7e580ffe84d3b95d7c3b4b9a9f8e7",
      name: "Lead Nurture - Day 1",
      type: "marketing",
    },
    {
      id: "d-456e789a123b456c789d123e456f789g",
      name: "Lead Nurture - Day 3",
      type: "marketing",
    },
    {
      id: "d-789a123b456c789d123e456f789g123h",
      name: "Lead Nurture - Day 7",
      type: "marketing",
    },
    {
      id: "d-a123b456c789d123e456f789g123h456",
      name: "Property Alert",
      type: "transactional",
    },
  ]);

  // Template variables as string literals
  const templateVariables = {
    firstName: "{{first_name}}",
    lastName: "{{last_name}}",
    companyName: "{{company_name}}",
    unsubscribeLink: "{{unsubscribe_link}}",
  };

  const [connectionStatus, setConnectionStatus] = useState<"success" | "error" | null>(null);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(null);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const response = await fetch("/api/sendgrid/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.includes("•") ? undefined : apiKey,
          fromEmail,
          fromName,
          replyTo,
          sandboxMode,
          ipPool,
          emailCategory,
          dailyLimit: parseInt(dailyLimit),
          batchSize: parseInt(batchSize),
        }),
      });
      if (!response.ok) throw new Error("Failed to save");
      setSaveStatus("success");
    } catch (err) {
      setSaveStatus("error");
      console.error("Save failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionStatus(null);
    try {
      const response = await fetch("/api/sendgrid/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.includes("•") ? undefined : apiKey,
        }),
      });
      if (!response.ok) throw new Error("Connection failed");
      setConnectionStatus("success");
    } catch (err) {
      setConnectionStatus("error");
      console.error("Connection test failed:", err);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) return;
    try {
      const response = await fetch("/api/sendgrid/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testEmail,
          fromEmail,
          fromName,
        }),
      });
      if (!response.ok) throw new Error("Failed to send test email");
      alert("Test email sent successfully!");
    } catch (err) {
      alert("Failed to send test email");
      console.error("Test email failed:", err);
    }
  };

  const toggleEventType = (type: string) => {
    if (eventTypes.includes(type)) {
      setEventTypes(eventTypes.filter((t) => t !== type));
    } else {
      setEventTypes([...eventTypes, type]);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Tabs defaultValue="general" className="space-y-4">
      <TabsList>
        <TabsTrigger value="general">General Settings</TabsTrigger>
        <TabsTrigger value="templates">Email Templates</TabsTrigger>
        <TabsTrigger value="webhooks">Webhooks & Events</TabsTrigger>
        <TabsTrigger value="limits">Sending Limits</TabsTrigger>
        <TabsTrigger value="advanced">Advanced</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>SendGrid API Configuration</CardTitle>
            <CardDescription>
              Configure your SendGrid API credentials and sender information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-base font-medium">
                  SendGrid Integration Status
                </h3>
                <p className="text-sm text-muted-foreground">
                  Enable or disable SendGrid email sending
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isEnabled}
                  onCheckedChange={setIsEnabled}
                  id="sendgrid-enabled"
                />
                <Label htmlFor="sendgrid-enabled">Enabled</Label>
              </div>
            </div>

            <Separator />

            <div className="grid gap-3">
              <Label htmlFor="api-key">API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="api-key"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="outline" size="icon">
                  <Key className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Your SendGrid API key is used to authenticate requests to the
                SendGrid API.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="from-email">From Email Address</Label>
                <Input
                  id="from-email"
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  This email address will be used as the sender for all emails.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="from-name">From Name</Label>
                <Input
                  id="from-name"
                  type="text"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  This name will be displayed as the sender for all emails.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reply-to">Reply-To Email Address</Label>
              <Input
                id="reply-to"
                type="email"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Replies to your emails will be sent to this address.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Test Connection</Label>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  variant="outline"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Test Connection
                    </>
                  )}
                </Button>
                {!isTesting && (
                  <div className="flex items-center text-sm text-green-600">
                    <Check className="mr-1 h-4 w-4" />
                    Connected successfully
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                checked={sandboxMode}
                onCheckedChange={setSandboxMode}
                id="sandbox-mode"
              />
              <Label htmlFor="sandbox-mode">Sandbox Mode</Label>
              <span className="text-xs text-muted-foreground">
                (Emails won't be sent)
              </span>
            </div>
            <Button onClick={handleSaveSettings} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Send Test Email</CardTitle>
            <CardDescription>
              Verify your configuration by sending a test email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Recipient Email</Label>
              <div className="flex gap-2">
                <Input
                  id="test-email"
                  type="email"
                  placeholder="Enter recipient email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSendTestEmail} disabled={!testEmail}>
                  <Send className="mr-2 h-4 w-4" />
                  Send Test
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="templates" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Email Templates</CardTitle>
            <CardDescription>
              Manage your SendGrid Dynamic Templates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-medium">Configured Templates</h3>
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Templates
              </Button>
            </div>

            <div className="space-y-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-4 border rounded-md"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{template.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {template.id}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        template.type === "transactional"
                          ? "outline-solid"
                          : "secondary"
                      }
                    >
                      {template.type}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <Button variant="outline">Add Template</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Template Variables</CardTitle>
            <CardDescription>
              Common variables available in all email templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-md">
                  <div className="font-mono text-sm">
                    {templateVariables.firstName}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Recipient's first name
                  </div>
                </div>
                <div className="p-3 border rounded-md">
                  <div className="font-mono text-sm">
                    {templateVariables.lastName}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Recipient's last name
                  </div>
                </div>
                <div className="p-3 border rounded-md">
                  <div className="font-mono text-sm">
                    {templateVariables.companyName}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Recipient's company
                  </div>
                </div>
                <div className="p-3 border rounded-md">
                  <div className="font-mono text-sm">
                    {templateVariables.unsubscribeLink}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Unsubscribe link (required)
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="webhooks" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Event Webhooks</CardTitle>
            <CardDescription>
              Configure webhooks to receive email event data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  id="webhook-url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(webhookUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                SendGrid will send event data to this URL when emails are
                processed.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Event Types</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {[
                  "processed",
                  "delivered",
                  "opened",
                  "clicked",
                  "bounced",
                  "dropped",
                  "spamreport",
                  "unsubscribe",
                  "group_unsubscribe",
                  "group_resubscribe",
                ].map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Switch
                      id={`event-${type}`}
                      checked={eventTypes.includes(type)}
                      onCheckedChange={() => toggleEventType(type)}
                    />
                    <Label
                      htmlFor={`event-${type}`}
                      className="text-sm capitalize"
                    >
                      {type.replace("_", " ")}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                You must also configure the webhook in your SendGrid dashboard
                to point to the URL above.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="limits" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Sending Limits</CardTitle>
            <CardDescription>
              Configure email sending limits and throttling
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="daily-limit">Daily Sending Limit</Label>
                <Select value={dailyLimit} onValueChange={setDailyLimit}>
                  <SelectTrigger id="daily-limit">
                    <SelectValue placeholder="Select limit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1000">1,000 emails</SelectItem>
                    <SelectItem value="5000">5,000 emails</SelectItem>
                    <SelectItem value="10000">10,000 emails</SelectItem>
                    <SelectItem value="50000">50,000 emails</SelectItem>
                    <SelectItem value="100000">100,000 emails</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Maximum number of emails to send per day.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="batch-size">Batch Size</Label>
                <Select value={batchSize} onValueChange={setBatchSize}>
                  <SelectTrigger id="batch-size">
                    <SelectValue placeholder="Select batch size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">100 emails</SelectItem>
                    <SelectItem value="500">500 emails</SelectItem>
                    <SelectItem value="1000">1,000 emails</SelectItem>
                    <SelectItem value="5000">5,000 emails</SelectItem>
                    <SelectItem value="10000">10,000 emails</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Number of emails to send in a single batch.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ip-pool">IP Pool</Label>
              <Select value={ipPool} onValueChange={setIpPool}>
                <SelectTrigger id="ip-pool">
                  <SelectValue placeholder="Select IP pool" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="transactional">Transactional</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                IP pool to use for sending emails. Only applicable if you have
                dedicated IPs.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-category">Default Email Category</Label>
              <Select value={emailCategory} onValueChange={setEmailCategory}>
                <SelectTrigger id="email-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="transactional">Transactional</SelectItem>
                  <SelectItem value="notification">Notification</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Default category for emails. Used for analytics and reporting.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="advanced" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Advanced Settings</CardTitle>
            <CardDescription>
              Configure advanced SendGrid settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="tracking-settings">Click Tracking</Label>
              <div className="flex items-center space-x-2">
                <Switch id="click-tracking" defaultChecked />
                <Label htmlFor="click-tracking">Enable click tracking</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Track when recipients click links in your emails.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="open-tracking">Open Tracking</Label>
              <div className="flex items-center space-x-2">
                <Switch id="open-tracking" defaultChecked />
                <Label htmlFor="open-tracking">Enable open tracking</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Track when recipients open your emails.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subscription-tracking">
                Subscription Tracking
              </Label>
              <div className="flex items-center space-x-2">
                <Switch id="subscription-tracking" defaultChecked />
                <Label htmlFor="subscription-tracking">
                  Enable subscription tracking
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Add unsubscribe links to your emails automatically.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="footer">Default Footer</Label>
              <Textarea
                id="footer"
                defaultValue={`© 2025 OutreachGlobal. All rights reserved.\n${templateVariables.unsubscribeLink}`}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Default footer to add to all emails. Use{" "}
                {templateVariables.unsubscribeLink} to add the unsubscribe link.
              </p>
            </div>

            <div className="space-y-2">
              <Label>DKIM Authentication</Label>
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">
                  DKIM Authentication is enabled
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                DKIM authentication helps prevent email spoofing and improves
                deliverability.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
