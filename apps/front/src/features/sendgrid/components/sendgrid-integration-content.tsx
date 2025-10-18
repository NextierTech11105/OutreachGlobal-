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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, Send } from "lucide-react";
import {
  SendgridSettings as SendgridSettingsDto,
  sendgridSettingsSchema,
} from "@nextier/dto";
import { useApiError } from "@/hooks/use-api-error";
import { useForm } from "@/lib/hook-form/hooks/use-form";
import { zodResolver } from "@/lib/hook-form/resolvers/zod";
import { PasswordInput } from "@/components/ui/input/password-input";
import { FieldErrors } from "@/components/errors/field-errors";
import { toast } from "sonner";
import { useMutation } from "@apollo/client";
import {
  TEST_SENDGRID_SEND_EMAIL_MUTATION,
  UPDATE_SENDGRID_SETTINGS_MUTATION,
} from "../mutations/sendgrid.mutations";
import { useCurrentTeam } from "@/features/team/team.context";
import { Controller } from "react-hook-form";

interface Props {
  defaultValues?: Partial<SendgridSettingsDto>;
}

export function SendgridIntegrationContent({ defaultValues }: Props) {
  const [ipPool, setIpPool] = useState("marketing");
  const [emailCategory, setEmailCategory] = useState("marketing");
  const [testEmail, setTestEmail] = useState("");
  const [eventTypes, setEventTypes] = useState(
    defaultValues?.sendgridEventTypes || ["delivered", "opened", "clicked"],
  );
  const [dailyLimit, setDailyLimit] = useState("10000");
  const [batchSize, setBatchSize] = useState("1000");

  const { handleSubmit, register, registerError, control } = useForm({
    resolver: zodResolver(sendgridSettingsSchema),
    defaultValues,
  });

  const { showError } = useApiError();
  const [loading, setLoading] = useState(false);
  const [updateSendgrid] = useMutation(UPDATE_SENDGRID_SETTINGS_MUTATION);
  const [testSendgrid, { loading: testLoading }] = useMutation(
    TEST_SENDGRID_SEND_EMAIL_MUTATION,
  );
  const { team } = useCurrentTeam();

  const updateSettings = async (input: SendgridSettingsDto) => {
    setLoading(true);
    try {
      await updateSendgrid({
        variables: {
          teamId: team.id,
          input: {
            ...input,
            sendgridEventTypes: eventTypes,
          },
        },
      });
      toast.success("SendGrid settings updated successfully");
    } catch (error) {
      showError(error, { gql: true });
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    try {
      await testSendgrid({
        variables: {
          teamId: team.id,
          email: testEmail,
        },
      });
      setTestEmail("");
      return toast.success(`Test email sent to ${testEmail}`);
    } catch (error) {
      showError(error, { gql: true });
    }
  };

  const toggleEventType = (type: string) => {
    if (eventTypes.includes(type)) {
      setEventTypes(eventTypes.filter((t) => t !== type));
    } else {
      setEventTypes([...eventTypes, type]);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(updateSettings)}>
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">General Settings</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks & Events</TabsTrigger>
            <TabsTrigger value="limits">Sending Limits</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <Card>
            <TabsContent value="general" className="space-y-4">
              <CardHeader>
                <CardTitle>SendGrid API Configuration</CardTitle>
                <CardDescription>
                  Configure your SendGrid API credentials and sender information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <Label htmlFor="api-key">API Key</Label>
                  <PasswordInput
                    {...register("sendgridApiKey")}
                    id="api-key"
                    placeholder="SG..."
                  />
                  <FieldErrors {...registerError("sendgridApiKey")} />
                  <p className="text-xs text-muted-foreground">
                    Your SendGrid API key is used to authenticate requests to
                    the SendGrid API.
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="from-email">From Email Address</Label>
                    <Input
                      {...register("sendgridFromEmail")}
                      id="from-email"
                      type="email"
                    />
                    <FieldErrors {...registerError("sendgridFromEmail")} />
                    <p className="text-xs text-muted-foreground">
                      This email address will be used as the sender for all
                      emails.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="from-name">From Name</Label>
                    <Input
                      {...register("sendgridFromName")}
                      id="from-name"
                      type="text"
                    />
                    <FieldErrors {...registerError("sendgridFromName")} />
                    <p className="text-xs text-muted-foreground">
                      This name will be displayed as the sender for all emails.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reply-to">Reply-To Email Address</Label>
                  <Input
                    {...register("sendgridReplyToEmail")}
                    id="reply-to"
                    type="email"
                  />
                  <FieldErrors {...registerError("sendgridReplyToEmail")} />
                  <p className="text-xs text-muted-foreground">
                    Replies to your emails will be sent to this address.
                  </p>
                </div>
              </CardContent>
            </TabsContent>

            <TabsContent value="webhooks" className="space-y-4">
              <CardHeader>
                <CardTitle>Event Webhooks</CardTitle>
                <CardDescription>
                  Configure webhooks to receive email event data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
              </CardContent>
            </TabsContent>

            <TabsContent value="limits" className="space-y-4">
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
                    <Input
                      type="number"
                      {...register("sendgridDailyLimit", {
                        valueAsNumber: true,
                      })}
                    />
                    <FieldErrors {...registerError("sendgridDailyLimit")} />
                    <p className="text-xs text-muted-foreground">
                      Maximum number of emails to send per day.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="batch-size">Batch Size</Label>
                    <Input
                      type="number"
                      {...register("sendgridBatchSize", {
                        valueAsNumber: true,
                      })}
                    />
                    <FieldErrors {...registerError("sendgridBatchSize")} />
                    <p className="text-xs text-muted-foreground">
                      Number of emails to send in a single batch.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ip-pool">IP Pool</Label>
                  <Controller
                    control={control}
                    name="sendgridIpPool"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="ip-pool">
                          <SelectValue placeholder="Select IP pool" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="transactional">
                            Transactional
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    IP pool to use for sending emails. Only applicable if you
                    have dedicated IPs.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-category">Default Email Category</Label>
                  <Controller
                    control={control}
                    name="sendgridEmailCategory"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="email-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="transactional">
                            Transactional
                          </SelectItem>
                          <SelectItem value="notification">
                            Notification
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    Default category for emails. Used for analytics and
                    reporting.
                  </p>
                </div>
              </CardContent>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
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
                    <Controller
                      control={control}
                      name="sendgridEnableClickTracking"
                      render={({ field }) => (
                        <Switch
                          id="click-tracking"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label htmlFor="click-tracking">
                      Enable click tracking
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Track when recipients click links in your emails.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="open-tracking">Open Tracking</Label>
                  <div className="flex items-center space-x-2">
                    <Controller
                      control={control}
                      name="sendgridEnableOpenTracking"
                      render={({ field }) => (
                        <Switch
                          id="open-tracking"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
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
                    <Controller
                      control={control}
                      name="sendgridEnableSubscriptionTracking"
                      render={({ field }) => (
                        <Switch
                          id="subscription-tracking"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
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
                    {...register("sendgridDefaultFooter")}
                    id="footer"
                    rows={3}
                  />
                </div>
              </CardContent>
            </TabsContent>

            <CardFooter className="flex justify-between">
              <Button type="submit" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Saving..." : "Save Settings"}
              </Button>
            </CardFooter>
          </Card>
        </Tabs>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Send Test Email</CardTitle>
          <CardDescription>
            You need to save settings first to send test email.
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
              <Button
                onClick={handleSendTestEmail}
                disabled={!testEmail || testLoading}
                loading={testLoading}
              >
                <Send />
                Send Test
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
