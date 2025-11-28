"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, PlusIcon } from "lucide-react";
import {
  TwilioSettings as TwilioSettingsDto,
  twilioSettingsSchema,
} from "@nextier/dto";
import { useForm } from "@/lib/hook-form/hooks/use-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useApiError } from "@/hooks/use-api-error";
import { useMutation } from "@apollo/client";
import {
  TEST_TWILIO_SEND_SMS_MUTATION,
  UPDATE_TWILIO_SETTINGS_MUTATION,
} from "../mutations/twilio.mutations";
import { useCurrentTeam } from "@/features/team/team.context";
import { toast } from "sonner";
import { FieldErrors } from "@/components/errors/field-errors";
import { PasswordInput } from "@/components/ui/input/password-input";
import { Controller } from "react-hook-form";
import { TwilioPhoneList } from "./twilio-phone-list";
import { AnimatePresence } from "motion/react";
import { TwilioPhoneModal } from "./twilio-phone-modal";

interface Props {
  defaultValues?: Partial<TwilioSettingsDto>;
}

export function TwilioIntegrationContent({ defaultValues }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [isPortingDialogOpen, setIsPortingDialogOpen] = useState(false);
  const [isNumberDialogOpen, setIsNumberDialogOpen] = useState(false);

  const { handleSubmit, register, registerError, control } = useForm({
    resolver: zodResolver(twilioSettingsSchema),
    defaultValues,
  });
  const { showError } = useApiError();
  const [updateTwilioSettings] = useMutation(UPDATE_TWILIO_SETTINGS_MUTATION);
  const [testTwilioConnection] = useMutation(TEST_TWILIO_SEND_SMS_MUTATION);
  const { team } = useCurrentTeam();

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

  const handleTestConnection = async () => {
    setIsLoading(true);

    try {
      await testTwilioConnection({ variables: { teamId: team.id } });
      toast.success("Twilio connection test passed");
    } catch (err) {
      showError(err, { gql: true });
    } finally {
      setIsLoading(false);
    }
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

  const updateSettings = async (input: TwilioSettingsDto) => {
    setIsLoading(true);

    try {
      await updateTwilioSettings({
        variables: {
          input,
          teamId: team.id,
        },
      });

      toast.success("Twilio settings updated");
    } catch (error) {
      showError(error, { gql: true });
    } finally {
      setIsLoading(false);
    }
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
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="voice">Voice</TabsTrigger>
            <TabsTrigger value="sms">SMS</TabsTrigger>
            <TabsTrigger value="numbers">Phone Numbers</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <form className="space-y-4" onSubmit={handleSubmit(updateSettings)}>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accountSid">Account SID</Label>
                  <Input
                    {...register("twilioAccountSid")}
                    id="accountSid"
                    placeholder="Enter your Twilio Account SID"
                  />
                  <FieldErrors {...registerError("twilioAccountSid")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="authToken">Auth Token</Label>
                  <Input
                    {...register("twilioAuthToken")}
                    id="authToken"
                    type="password"
                    placeholder="Enter your Twilio Auth Token"
                  />
                  <FieldErrors {...registerError("twilioAuthToken")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twilioDefaultPhoneNumber">
                    Default Phone Number
                  </Label>
                  <Input
                    {...register("twilioDefaultPhoneNumber")}
                    id="twilioDefaultPhoneNumber"
                    placeholder="+1234567890"
                  />
                  <FieldErrors {...registerError("twilioDefaultPhoneNumber")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    {...register("twilioApiKey")}
                    id="apiKey"
                    placeholder="Enter your Twilio API Key"
                  />
                  <FieldErrors {...registerError("twilioApiKey")} />
                  <p className="text-xs text-muted-foreground">
                    Using API Keys is more secure than using your Auth Token
                    directly
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiSecret">API Secret</Label>
                  <PasswordInput
                    {...register("twilioApiSecret")}
                    id="apiSecret"
                  />
                  <FieldErrors {...registerError("twilioApiSecret")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appSid">TwiML App SID</Label>
                  <Input
                    {...register("twiMLAppSid")}
                    id="appSid"
                    placeholder="Enter your TwiML App SID"
                  />
                  <FieldErrors {...registerError("twiMLAppSid")} />
                  <p className="text-xs text-muted-foreground">
                    Used for voice applications
                  </p>
                </div>
              </div>

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

                <Button type="submit" disabled={isLoading}>
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
            </form>
          </TabsContent>

          <TabsContent value="voice" className="space-y-4 mt-4">
            <form className="space-y-6" onSubmit={handleSubmit(updateSettings)}>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableVoice">Enable Voice Calls</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow making and receiving voice calls
                  </p>
                </div>
                <Controller
                  control={control}
                  name="twilioEnableVoiceCalls"
                  render={({ field }) => (
                    <Switch
                      id="enableVoice"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
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
                <Controller
                  control={control}
                  name="twilioEnableRecordCalls"
                  render={({ field }) => (
                    <Switch
                      id="recordCalls"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
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
                <Controller
                  control={control}
                  name="twilioTranscribeVoicemail"
                  render={({ field }) => (
                    <Switch
                      id="transcribeVoicemail"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="callTimeout">Call Timeout (seconds)</Label>
                <Input
                  type="number"
                  {...register("twilioCallTimeout", {
                    valueAsNumber: true,
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  How long to ring before sending to voicemail
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="twilioDefaultVoiceMessage">
                  Default Voice Message
                </Label>
                <Input
                  id="twilioDefaultVoiceMessage"
                  {...register("twilioDefaultVoiceMessage")}
                  placeholder="Enter default greeting message"
                />
                <FieldErrors {...registerError("twilioDefaultVoiceMessage")} />
                <p className="text-xs text-muted-foreground">
                  Default voicemail greeting message
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading}>
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
            </form>
          </TabsContent>

          <TabsContent value="sms" className="space-y-4 mt-4">
            <form className="space-y-6" onSubmit={handleSubmit(updateSettings)}>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableSMS">Enable SMS</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow sending and receiving SMS messages
                  </p>
                </div>
                <Controller
                  control={control}
                  name="twilioEnableSms"
                  render={({ field }) => (
                    <Switch
                      id="enableSMS"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading}>
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
            </form>
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
                <Button onClick={() => setIsNumberDialogOpen(true)}>
                  <PlusIcon /> Add Number
                </Button>
              </div>
            </div>
            <TwilioPhoneList />
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Add Phone Number Dialog */}
      <AnimatePresence>
        {isNumberDialogOpen && (
          <TwilioPhoneModal
            open={isNumberDialogOpen}
            onOpenChange={setIsNumberDialogOpen}
          />
        )}
      </AnimatePresence>
    </Card>
  );
}
