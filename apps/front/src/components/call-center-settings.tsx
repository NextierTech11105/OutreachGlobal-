"use client";

import { Textarea } from "@/components/ui/textarea";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Phone, Save, Key, Clock, Bot, MessageSquare } from "lucide-react";
import { PLATFORM_NAME } from "@/config/branding";

export function CallCenterSettings() {
  const [activeTab, setActiveTab] = useState("twilio");

  return (
    <div className="space-y-6">
      <Tabs
        defaultValue="twilio"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="twilio">
            <Phone className="h-4 w-4 mr-2" />
            Twilio
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Bot className="h-4 w-4 mr-2" />
            AI Settings
          </TabsTrigger>
          <TabsTrigger value="hours">
            <Clock className="h-4 w-4 mr-2" />
            Hours & Routing
          </TabsTrigger>
          <TabsTrigger value="messaging">
            <MessageSquare className="h-4 w-4 mr-2" />
            Messaging
          </TabsTrigger>
        </TabsList>

        <TabsContent value="twilio" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Twilio Configuration</CardTitle>
              <CardDescription>
                Configure your Twilio account settings for the call center
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="account-sid">Account SID</Label>
                  <div className="flex">
                    <Input
                      id="account-sid"
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    />
                    <Button variant="ghost" size="icon" className="ml-2">
                      <Key className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your Twilio Account SID from the Twilio Console
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auth-token">Auth Token</Label>
                  <div className="flex">
                    <Input
                      id="auth-token"
                      type="password"
                      placeholder="••••••••••••••••••••••••••••••"
                    />
                    <Button variant="ghost" size="icon" className="ml-2">
                      <Key className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your Twilio Auth Token from the Twilio Console
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Phone Numbers</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="outbound-number">
                      Primary Outbound Number
                    </Label>
                    <Input
                      id="outbound-number"
                      placeholder="+1 (555) 123-4567"
                    />
                    <p className="text-sm text-muted-foreground">
                      The phone number to use for outbound calls
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inbound-number">
                      Primary Inbound Number
                    </Label>
                    <Input
                      id="inbound-number"
                      placeholder="+1 (555) 123-4567"
                    />
                    <p className="text-sm text-muted-foreground">
                      The phone number to receive inbound calls
                    </p>
                  </div>
                </div>

                <Button variant="outline">
                  <Phone className="h-4 w-4 mr-2" />
                  Add Phone Number
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">
                  Recording & Transcription
                </h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="call-recording">Call Recording</Label>
                    <p className="text-sm text-muted-foreground">
                      Record all calls for quality assurance and training
                    </p>
                  </div>
                  <Switch id="call-recording" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="transcription">Call Transcription</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically transcribe calls for analysis
                    </p>
                  </div>
                  <Switch id="transcription" defaultChecked />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recording-retention">
                    Recording Retention
                  </Label>
                  <Select defaultValue="90">
                    <SelectTrigger id="recording-retention">
                      <SelectValue placeholder="Select retention period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    How long to keep call recordings before automatic deletion
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save Twilio Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Settings</CardTitle>
              <CardDescription>
                Configure AI assistant and automation settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">AI Assistant</h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="ai-assistant">Enable AI Assistant</Label>
                    <p className="text-sm text-muted-foreground">
                      Provide real-time assistance during calls
                    </p>
                  </div>
                  <Switch id="ai-assistant" defaultChecked />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai-model">AI Model</Label>
                  <Select defaultValue="gpt-4">
                    <SelectTrigger id="ai-model">
                      <SelectValue placeholder="Select AI model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-3.5">GPT-3.5</SelectItem>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="claude">Claude</SelectItem>
                      <SelectItem value="custom">Custom Model</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    The AI model to use for the assistant
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">AI SDR</h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="ai-sdr">Enable AI SDR</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow AI to make automated outbound calls
                    </p>
                  </div>
                  <Switch id="ai-sdr" defaultChecked />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai-voice">AI Voice</Label>
                  <Select defaultValue="alloy">
                    <SelectTrigger id="ai-voice">
                      <SelectValue placeholder="Select AI voice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alloy">Alloy</SelectItem>
                      <SelectItem value="echo">Echo</SelectItem>
                      <SelectItem value="fable">Fable</SelectItem>
                      <SelectItem value="onyx">Onyx</SelectItem>
                      <SelectItem value="nova">Nova</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    The voice to use for AI SDR calls
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-concurrent">Max Concurrent Calls</Label>
                  <Input id="max-concurrent" type="number" defaultValue="5" />
                  <p className="text-sm text-muted-foreground">
                    Maximum number of concurrent AI SDR calls
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save AI Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Hours & Routing</CardTitle>
              <CardDescription>
                Configure operating hours and call routing settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Operating Hours</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Monday - Friday</Label>
                    <div className="flex items-center gap-2">
                      <Select defaultValue="9">
                        <SelectTrigger>
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
                        <SelectTrigger>
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

                  <div className="space-y-2">
                    <Label>Saturday - Sunday</Label>
                    <div className="flex items-center gap-2">
                      <Select defaultValue="closed">
                        <SelectTrigger>
                          <SelectValue placeholder="Start" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="closed">Closed</SelectItem>
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
                      <Select defaultValue="closed">
                        <SelectTrigger>
                          <SelectValue placeholder="End" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="closed">Closed</SelectItem>
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
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="after-hours">After Hours Voicemail</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable voicemail for calls outside operating hours
                    </p>
                  </div>
                  <Switch id="after-hours" defaultChecked />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Call Routing</h3>

                <div className="space-y-2">
                  <Label htmlFor="routing-strategy">Routing Strategy</Label>
                  <Select defaultValue="round-robin">
                    <SelectTrigger id="routing-strategy">
                      <SelectValue placeholder="Select routing strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="round-robin">Round Robin</SelectItem>
                      <SelectItem value="longest-idle">Longest Idle</SelectItem>
                      <SelectItem value="skills-based">Skills Based</SelectItem>
                      <SelectItem value="priority">Priority Queue</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    How to distribute incoming calls to agents
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="queue-timeout">Queue Timeout</Label>
                  <div className="flex items-center gap-2">
                    <Input id="queue-timeout" type="number" defaultValue="60" />
                    <span className="text-sm text-muted-foreground">
                      seconds
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    How long to keep callers in queue before fallback action
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fallback-action">Fallback Action</Label>
                  <Select defaultValue="voicemail">
                    <SelectTrigger id="fallback-action">
                      <SelectValue placeholder="Select fallback action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="voicemail">Voicemail</SelectItem>
                      <SelectItem value="callback">Offer Callback</SelectItem>
                      <SelectItem value="ai-agent">AI Agent</SelectItem>
                      <SelectItem value="transfer">
                        Transfer to Number
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    What to do when queue timeout is reached
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save Hours & Routing
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messaging" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Messaging Settings</CardTitle>
              <CardDescription>
                Configure SMS and messaging settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">SMS Settings</h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sms-enabled">Enable SMS</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow sending and receiving SMS messages
                    </p>
                  </div>
                  <Switch id="sms-enabled" defaultChecked />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sms-number">SMS Phone Number</Label>
                  <Input id="sms-number" placeholder="+1 (555) 123-4567" />
                  <p className="text-sm text-muted-foreground">
                    The phone number to use for SMS messaging
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Automated Messages</h3>

                <div className="space-y-2">
                  <Label htmlFor="welcome-message">Welcome Message</Label>
                  <Textarea
                    id="welcome-message"
                    placeholder="Enter welcome message"
                    defaultValue={`Thank you for contacting ${PLATFORM_NAME}. How can we help you today?`}
                  />
                  <p className="text-sm text-muted-foreground">
                    Message sent when a conversation starts
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="after-hours-message">
                    After Hours Message
                  </Label>
                  <Textarea
                    id="after-hours-message"
                    placeholder="Enter after hours message"
                    defaultValue="Thank you for your message. Our office is currently closed. We'll respond during our next business day."
                  />
                  <p className="text-sm text-muted-foreground">
                    Message sent outside of operating hours
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-replies">Automated Replies</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable AI-powered automated replies
                    </p>
                  </div>
                  <Switch id="auto-replies" defaultChecked />
                </div>
              </div>

              <div className="flex justify-end">
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save Messaging Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
