"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContactSelector } from "./contact-selector";
import { DialerConfigComponent } from "./dialer-config";
import { DialpadModal } from "./dialpad-modal";
import { CallHistoryTable } from "./call-history-table";
import {
  Phone,
  PhoneOff,
  SkipForward,
  Clock,
  Building,
  Mail,
  MapPin,
  CheckCircle,
  MessageSquare,
  AlertCircle,
  Bot,
  User,
  Grid3X3,
  History,
} from "lucide-react";
import { useCurrentTeam } from "@/features/team/team.context";
import { PowerDialerDetailsQuery } from "@/graphql/types";
import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";
import {
  DIALER_CONTACTS_EVICT,
  DIALER_CONTACTS_QUERY,
} from "../queries/dialer-contact.queries";
import { usePowerDialerContext } from "../power-dialer.context";
import { DialerMode } from "@nextier/common";
import {
  CALL_HISTORIES_EVICT,
  CALL_HISTORIES_QUERY,
} from "../queries/call-history.queries";
import { useApolloClient, useMutation } from "@apollo/client";
import { CREATE_CALL_HISTORY_MUTATION } from "../mutations/call-history.mutations";
import { useApiError } from "@/hooks/use-api-error";
import { $http } from "@/lib/http";
import { toast } from "sonner";
import type { Call, Device } from "@twilio/voice-sdk";

interface Props {
  powerDialer: PowerDialerDetailsQuery["powerDialer"];
}

export function PowerDialer({ powerDialer }: Props) {
  const [activeTab, setActiveTab] = useState("dialer");
  const [currentContactIndex, setCurrentContactIndex] = useState(0);
  const [isDialing, setIsDialing] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callNotes, setCallNotes] = useState("");
  const [callDisposition, setCallDisposition] = useState("");
  const { teamId, isTeamReady } = useCurrentTeam();
  const [{ mode, aiSdrAvatar, activeCall, device }, dispatch] =
    usePowerDialerContext();
  const [contacts = []] = useConnectionQuery(DIALER_CONTACTS_QUERY, {
    pick: "dialerContacts",
    variables: {
      powerDialerId: powerDialer.id,
      teamId,
      first: 200,
    },
    skip: !isTeamReady,
  });
  const { cache } = useApolloClient();
  const [createCallHistory, { loading: createCallHistoryLoading }] =
    useMutation(CREATE_CALL_HISTORY_MUTATION);

  const [histories = [], pageInfo] = useConnectionQuery(CALL_HISTORIES_QUERY, {
    pick: "callHistories",
    variables: {
      teamId,
      powerDialerId: powerDialer.id,
    },
    skip: !isTeamReady,
  });

  const { showError } = useApiError();

  const [currentCallSid, setCurrentCallSid] = useState<string | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [showDialpad, setShowDialpad] = useState(false);

  const currentContact = contacts[currentContactIndex];
  const completedCalls = 0;
  const totalCalls = contacts.length;
  const progressPercentage =
    totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleContactsChange = (newContacts: any[]) => {
    setCurrentContactIndex(0);
    setCallNotes("");
    setCallDisposition("");
    setCallError(null);
  };

  const handleNext = useCallback(() => {
    if (currentContactIndex < contacts.length - 1) {
      setCurrentContactIndex((prev) => prev + 1);
      setCallNotes("");
      setCallDisposition("");
      setCallError(null);
    }
  }, [currentContactIndex, contacts.length]);

  const handleDial = useCallback(async () => {
    if (!currentContact) {
      handleNext();
      return;
    }

    if (mode === DialerMode.AI_SDR && !aiSdrAvatar) {
      setCallError("Please select an AI SDR for automated calls");
      return;
    }

    setIsDialing(true);
    setCallDuration(0);
    setCallError(null);

    // Simulate call initiation for preview mode
    try {
      const mockCallSid = `CA${Math.random().toString(36).substr(2, 32)}`;
      setCurrentCallSid(mockCallSid);

      if (!device) {
        const {
          data: { token },
        } = await $http.post(`/voice/${teamId}/token`, {});

        // Dynamic import to avoid SSR issues with Twilio Voice SDK
        const { Device: TwilioDevice, Call: TwilioCall } = await import(
          "@twilio/voice-sdk"
        );
        const newDevice = new TwilioDevice(token, {
          codecPreferences: [TwilioCall.Codec.Opus, TwilioCall.Codec.PCMU],
        });

        await newDevice.register();
        if (!currentContact.lead.phone) {
          throw new Error("Phone number is required");
        }
        const call = await newDevice.connect({
          params: {
            To: currentContact.lead.phone,
          },
        });
        dispatch({ device: newDevice, activeCall: call });
      } else {
        if (!currentContact.lead.phone) {
          throw new Error("Phone number is required");
        }
        const call = await device.connect({
          params: {
            To: currentContact.lead.phone,
          },
        });
        dispatch({ activeCall: call });
      }

      // Simulate dialing delay
      setTimeout(() => {
        setIsDialing(false);
        setIsInCall(true);
        setShowDialpad(true); // Show dialpad when call connects
      }, 2000);
    } catch (error) {
      console.error("Call initiation failed:", error);
      toast.error("Failed to initiate call");
      setIsDialing(false);
    }
  }, [currentContact, mode, aiSdrAvatar, handleNext, device, dispatch, teamId]);

  const handleHangup = async () => {
    setIsInCall(false);
    setIsDialing(false);
    setCallDuration(0);
    setCurrentCallSid(null);
    setCallError(null);
    setShowDialpad(false);
    if (activeCall) {
      activeCall.disconnect();
      dispatch({ activeCall: null });
    }
  };

  const handlePrevious = () => {
    if (currentContactIndex > 0) {
      setCurrentContactIndex((prev) => prev - 1);
      setCallNotes("");
      setCallDisposition("");
      setCallError(null);
    }
  };

  const handleCompleteCall = async () => {
    try {
      // await createCallHistory({
      //   variables: {
      //     teamId,
      //     powerDialerId: powerDialer.id,
      //     dialerContactId: currentContact.id,
      //     markAsCompleted: true,
      //     input: {
      //       dialerMode: mode,
      //       duration: callDuration,
      //       notes: callNotes,
      //       disposition: callDisposition,
      //     },
      //   },
      // });

      cache.evict(CALL_HISTORIES_EVICT);
      cache.evict(DIALER_CONTACTS_EVICT);
      await handleHangup();
    } catch (error) {
      showError(error, { gql: true });
    }
  };

  const handleSendDTMF = (digit: string) => {
    // In production, this would send DTMF tones via Twilio
    console.log(`📞 Sending DTMF tone: ${digit}`);
  };

  // Call timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isInCall) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isInCall]);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(() => {
        console.log("Microphone permission granted");
      })
      .catch((error) => {
        console.error("Microphone permission denied:", error);
        toast.error("microphone permission is required for calls");
      });
  }, []);

  useEffect(() => {
    if (device) {
      return () => {
        device.destroy();
      };
    }
  }, [device]);

  // Show initial contact selector if no contacts
  if (contacts.length === 0 && activeTab === "dialer") {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Power Dialer</h1>
          <p className="text-muted-foreground">
            Select contacts to start your calling campaign
          </p>
        </div>
        <div className="mt-8">
          <ContactSelector
            selectedContacts={contacts}
            onContactsChange={() => {}}
            powerDialerId={powerDialer.id}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Power Dialer</h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">
              {mode === DialerMode.AI_SDR ? "AI-powered" : "Manual"} outreach
              calls
            </p>
            {mode === DialerMode.AI_SDR && aiSdrAvatar && (
              <Badge variant="secondary" className="gap-1">
                <Bot className="w-3 h-3" />
                {aiSdrAvatar.name}
              </Badge>
            )}
          </div>
        </div>
        {activeTab === "dialer" && (
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-sm">
              {completedCalls} / {totalCalls} completed
            </Badge>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dialer" className="gap-2">
            <Phone className="w-4 h-4" />
            Dialer
            {contacts.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {contacts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            Call History
          </TabsTrigger>
        </TabsList>

        {/* Dialer Tab Content */}
        <TabsContent value="dialer" className="space-y-6 mt-6">
          {contacts.length === 0 ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Select contacts to start your calling campaign
              </p>
              <ContactSelector
                selectedContacts={contacts}
                onContactsChange={handleContactsChange}
                powerDialerId={powerDialer.id}
              />
            </div>
          ) : (
            <>
              {/* Contact Selector */}
              <ContactSelector
                selectedContacts={contacts}
                onContactsChange={handleContactsChange}
                powerDialerId={powerDialer.id}
              />

              {/* Dialer Configuration */}
              <DialerConfigComponent />

              {/* Progress */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Campaign Progress</span>
                      <span>{Math.round(progressPercentage)}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Current Contact */}
                <div className="lg:col-span-2 space-y-6">
                  {!!currentContact && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          {mode === DialerMode.AI_SDR ? (
                            <Bot className="w-5 h-5" />
                          ) : (
                            <User className="w-5 h-5" />
                          )}
                          Current Contact ({currentContactIndex + 1} of{" "}
                          {totalCalls})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {callError && (
                          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-destructive" />
                            <span className="text-sm text-destructive">
                              {callError}
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div>
                              <h3 className="text-xl font-semibold">
                                {currentContact.lead.name}
                              </h3>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Building className="w-4 h-4" />
                                <span>{currentContact.lead.company}</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                <span className="font-mono">
                                  {currentContact.lead.phone}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                <span>{currentContact.lead.email}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{currentContact.lead.address}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-1">
                              {currentContact.lead.tags?.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-4">
                            {isInCall && (
                              <div className="flex items-center gap-2 text-lg font-mono">
                                <Clock className="w-5 h-5 text-green-500" />
                                <span className="text-green-500">
                                  {formatTime(callDuration)}
                                </span>
                              </div>
                            )}

                            {currentCallSid && (
                              <div className="text-xs text-muted-foreground font-mono">
                                Call SID: {currentCallSid}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Call Controls */}
                        <div className="flex items-center gap-3 pt-4 border-t">
                          <Button
                            onClick={handleDial}
                            disabled={isDialing || isInCall}
                            className="gap-2"
                            size="lg"
                          >
                            <Phone className="w-4 h-4" />
                            {isDialing ? "Dialing..." : "Dial"}
                          </Button>

                          <Button
                            onClick={handleHangup}
                            disabled={!isInCall && !isDialing}
                            variant="destructive"
                            className="gap-2"
                            size="lg"
                          >
                            <PhoneOff className="w-4 h-4" />
                            Hang Up
                          </Button>

                          {isInCall && (
                            <Button
                              onClick={() => setShowDialpad(true)}
                              variant="outline"
                              className="gap-2"
                              size="lg"
                            >
                              <Grid3X3 className="w-4 h-4" />
                              Dialpad
                            </Button>
                          )}

                          <div className="flex gap-2 ml-auto">
                            <Button
                              onClick={handlePrevious}
                              disabled={currentContactIndex === 0}
                              variant="outline"
                              size="sm"
                            >
                              Previous
                            </Button>
                            <Button
                              onClick={handleNext}
                              disabled={
                                currentContactIndex === contacts.length - 1
                              }
                              variant="outline"
                              size="sm"
                              className="gap-2 bg-transparent"
                            >
                              <SkipForward className="w-4 h-4" />
                              Next
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Call Notes */}
                  {(isInCall || callNotes) && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5" />
                          Call Notes & Disposition
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Call Disposition
                          </label>
                          <Select
                            value={callDisposition}
                            onValueChange={setCallDisposition}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select call outcome" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="interested">
                                Interested
                              </SelectItem>
                              <SelectItem value="not-interested">
                                Not Interested
                              </SelectItem>
                              <SelectItem value="callback">
                                Callback Requested
                              </SelectItem>
                              <SelectItem value="voicemail">
                                Voicemail
                              </SelectItem>
                              <SelectItem value="no-answer">
                                No Answer
                              </SelectItem>
                              <SelectItem value="wrong-number">
                                Wrong Number
                              </SelectItem>
                              <SelectItem value="busy">Busy</SelectItem>
                              <SelectItem value="meeting-scheduled">
                                Meeting Scheduled
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Notes
                          </label>
                          <Textarea
                            value={callNotes}
                            onChange={(e) => setCallNotes(e.target.value)}
                            placeholder="Add call notes..."
                            rows={4}
                          />
                        </div>

                        <Button
                          onClick={handleCompleteCall}
                          disabled={!callDisposition}
                          className="w-full gap-2"
                          loading={createCallHistoryLoading}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Complete Call
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Contact List */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Contact Queue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {contacts.map((contact, index) => (
                          <div
                            key={contact.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              index === currentContactIndex
                                ? "border-primary bg-primary/5"
                                : "border-border hover:bg-muted/50"
                            }`}
                            onClick={() => setCurrentContactIndex(index)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">
                                  {contact.lead.name}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {contact.lead.company}
                                </p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {contact.lead.tags?.slice(0, 2).map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                  {(contact.lead.tags?.length || 0) > 2 && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      +{(contact.lead.tags?.length || 0) - 2}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* Call History Tab Content */}
        <TabsContent value="history" className="space-y-6 mt-6">
          {histories.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <History className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No Call History Yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Complete some calls to see detailed analytics and recordings
                  here.
                </p>
                <Button
                  onClick={() => setActiveTab("dialer")}
                  className="gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Start Dialing
                </Button>
              </CardContent>
            </Card>
          ) : (
            <CallHistoryTable />
          )}
        </TabsContent>
      </Tabs>

      {/* Dialpad Modal */}
      {currentContact && (
        <DialpadModal
          isOpen={showDialpad}
          onClose={() => setShowDialpad(false)}
          contactName={currentContact.lead.name || ""}
          contactPhone={currentContact.lead.phone || ""}
          callDuration={callDuration}
          callSid={currentCallSid}
          onHangup={handleHangup}
          onSendDTMF={handleSendDTMF}
        />
      )}
    </div>
  );
}
