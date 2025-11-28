"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X,
  Phone,
  Clock,
  Building,
  Mail,
  MapPin,
  User,
  Bot,
  MessageSquare,
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  Play,
  Download,
  Copy,
  Tag,
  Calendar,
  PhoneCall,
} from "lucide-react";

interface Contact {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  location: string;
  tags: string[];
}

interface CallLog {
  id: string;
  contactId: string;
  contact: Contact;
  duration: number;
  disposition: string;
  notes: string;
  timestamp: Date;
  callSid?: string;
  sentiment?: {
    overallSentiment: "positive" | "negative" | "neutral" | "analyzing";
    sentimentScore: number;
    emotions: string[];
    keyPhrases: string[];
    speakerAnalysis: {
      agent?: { sentiment: string; talkTime: number };
      customer?: { sentiment: string; talkTime: number };
    };
    callQuality: {
      audioQuality?: string;
      connectionStability?: string;
    };
  };
  recordings?: {
    sid: string;
    status: string;
    duration: string;
    playbackUrl: string;
    startTime: string;
  }[];
  dialerMode: "manual" | "ai-sdr";
  agentName?: string;
  aiSdrName?: string;
}

interface CallReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  callData: CallLog;
}

export function CallReviewModal({
  isOpen,
  onClose,
  callData,
}: CallReviewModalProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "text-green-600";
      case "negative":
        return "text-red-600";
      case "neutral":
        return "text-gray-600";
      default:
        return "text-blue-600";
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <TrendingUp className="w-4 h-4" />;
      case "negative":
        return <TrendingDown className="w-4 h-4" />;
      case "neutral":
        return <Minus className="w-4 h-4" />;
      default:
        return <Brain className="w-4 h-4" />;
    }
  };

  const getDispositionColor = (disposition: string) => {
    switch (disposition) {
      case "interested":
      case "meeting-scheduled":
        return "bg-green-100 text-green-800 border-green-200";
      case "not-interested":
      case "wrong-number":
        return "bg-red-100 text-red-800 border-red-200";
      case "callback":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "voicemail":
      case "no-answer":
      case "busy":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    console.log("Copied to clipboard:", text);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <Card className="shadow-2xl">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <PhoneCall className="w-5 h-5" />
                  Call Review - {callData.contact.name}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {callData.timestamp.toLocaleDateString()} at{" "}
                    {callData.timestamp.toLocaleTimeString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatTime(callData.duration)}
                  </div>
                  {callData.callSid && (
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs">
                        SID: {callData.callSid.slice(-8)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(callData.callSid!)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="h-[calc(90vh-120px)]"
            >
              <div className="border-b px-6 pt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
                  <TabsTrigger value="recordings">Recordings</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="h-full">
                <div className="p-6">
                  <TabsContent value="overview" className="space-y-6 mt-0">
                    {/* Contact Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Contact Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-semibold text-lg">
                              {callData.contact.name}
                            </h4>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Building className="w-4 h-4" />
                              <span>{callData.contact.company}</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              <span className="font-mono">
                                {callData.contact.phone}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  copyToClipboard(callData.contact.phone)
                                }
                                className="h-6 w-6 p-0"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              <span>{callData.contact.email}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  copyToClipboard(callData.contact.email)
                                }
                                className="h-6 w-6 p-0"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>{callData.contact.location}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {callData.contact.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-xs gap-1"
                              >
                                <Tag className="w-3 h-3" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          {/* Call Details */}
                          <div className="space-y-3">
                            <h4 className="font-medium">Call Details</h4>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                  Duration:
                                </span>
                                <span className="font-mono">
                                  {formatTime(callData.duration)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                  Disposition:
                                </span>
                                <Badge
                                  className={getDispositionColor(
                                    callData.disposition,
                                  )}
                                >
                                  {callData.disposition
                                    .replace("-", " ")
                                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                  Mode:
                                </span>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={
                                      callData.dialerMode === "ai-sdr"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="gap-1"
                                  >
                                    {callData.dialerMode === "ai-sdr" ? (
                                      <Bot className="w-3 h-3" />
                                    ) : (
                                      <User className="w-3 h-3" />
                                    )}
                                    {callData.dialerMode === "ai-sdr"
                                      ? "AI SDR"
                                      : "Manual"}
                                  </Badge>
                                </div>
                              </div>
                              {callData.dialerMode === "ai-sdr" &&
                                callData.aiSdrName && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">
                                      AI SDR:
                                    </span>
                                    <span className="text-sm">
                                      {callData.aiSdrName}
                                    </span>
                                  </div>
                                )}
                              {callData.dialerMode === "manual" &&
                                callData.agentName && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">
                                      Agent:
                                    </span>
                                    <span className="text-sm">
                                      {callData.agentName}
                                    </span>
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Quick Sentiment Overview */}
                    {callData.sentiment && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Brain className="w-5 h-5" />
                            Sentiment Overview
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex items-center gap-2 text-lg font-medium ${getSentimentColor(callData.sentiment.overallSentiment)}`}
                              >
                                {getSentimentIcon(
                                  callData.sentiment.overallSentiment,
                                )}
                                <span className="capitalize">
                                  {callData.sentiment.overallSentiment}
                                </span>
                              </div>
                              {callData.sentiment.sentimentScore > 0 && (
                                <span className="text-muted-foreground">
                                  (
                                  {Math.round(
                                    callData.sentiment.sentimentScore * 100,
                                  )}
                                  % confidence)
                                </span>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => setActiveTab("sentiment")}
                            >
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="sentiment" className="space-y-6 mt-0">
                    {callData.sentiment ? (
                      <>
                        {/* Overall Sentiment */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Brain className="w-5 h-5" />
                              Overall Sentiment Analysis
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="text-center">
                              <div
                                className={`flex items-center justify-center gap-2 text-2xl font-medium ${getSentimentColor(callData.sentiment.overallSentiment)}`}
                              >
                                {getSentimentIcon(
                                  callData.sentiment.overallSentiment,
                                )}
                                <span className="capitalize">
                                  {callData.sentiment.overallSentiment}
                                </span>
                              </div>
                              {callData.sentiment.sentimentScore > 0 && (
                                <div className="mt-4">
                                  <div className="flex justify-between text-sm mb-2">
                                    <span>Confidence Score</span>
                                    <span>
                                      {Math.round(
                                        callData.sentiment.sentimentScore * 100,
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <Progress
                                    value={
                                      callData.sentiment.sentimentScore * 100
                                    }
                                    className="h-3"
                                  />
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Emotions */}
                        {callData.sentiment.emotions &&
                          callData.sentiment.emotions.length > 0 && (
                            <Card>
                              <CardHeader>
                                <CardTitle>Detected Emotions</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="flex flex-wrap gap-2">
                                  {callData.sentiment.emotions.map(
                                    (emotion, index) => (
                                      <Badge
                                        key={index}
                                        variant="secondary"
                                        className="text-sm"
                                      >
                                        {emotion}
                                      </Badge>
                                    ),
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                        {/* Key Phrases */}
                        {callData.sentiment.keyPhrases &&
                          callData.sentiment.keyPhrases.length > 0 && (
                            <Card>
                              <CardHeader>
                                <CardTitle>Key Phrases</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2">
                                  {callData.sentiment.keyPhrases.map(
                                    (phrase, index) => (
                                      <div
                                        key={index}
                                        className="p-2 bg-muted rounded-lg"
                                      >
                                        <p className="text-sm">"{phrase}"</p>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                        {/* Speaker Analysis */}
                        {callData.sentiment.speakerAnalysis &&
                          Object.keys(callData.sentiment.speakerAnalysis)
                            .length > 0 && (
                            <Card>
                              <CardHeader>
                                <CardTitle>Speaker Analysis</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {callData.sentiment.speakerAnalysis.agent && (
                                    <div className="space-y-2">
                                      <h4 className="font-medium">Agent</h4>
                                      <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                          <span>Sentiment:</span>
                                          <span className="capitalize">
                                            {
                                              callData.sentiment.speakerAnalysis
                                                .agent.sentiment
                                            }
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Talk Time:</span>
                                          <span>
                                            {
                                              callData.sentiment.speakerAnalysis
                                                .agent.talkTime
                                            }
                                            %
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {callData.sentiment.speakerAnalysis
                                    .customer && (
                                    <div className="space-y-2">
                                      <h4 className="font-medium">Customer</h4>
                                      <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                          <span>Sentiment:</span>
                                          <span className="capitalize">
                                            {
                                              callData.sentiment.speakerAnalysis
                                                .customer.sentiment
                                            }
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Talk Time:</span>
                                          <span>
                                            {
                                              callData.sentiment.speakerAnalysis
                                                .customer.talkTime
                                            }
                                            %
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                        {/* Call Quality */}
                        {callData.sentiment.callQuality &&
                          Object.keys(callData.sentiment.callQuality).length >
                            0 && (
                            <Card>
                              <CardHeader>
                                <CardTitle>Call Quality</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2 text-sm">
                                  {callData.sentiment.callQuality
                                    .audioQuality && (
                                    <div className="flex justify-between">
                                      <span>Audio Quality:</span>
                                      <Badge
                                        variant="outline"
                                        className="capitalize"
                                      >
                                        {
                                          callData.sentiment.callQuality
                                            .audioQuality
                                        }
                                      </Badge>
                                    </div>
                                  )}
                                  {callData.sentiment.callQuality
                                    .connectionStability && (
                                    <div className="flex justify-between">
                                      <span>Connection:</span>
                                      <Badge
                                        variant="outline"
                                        className="capitalize"
                                      >
                                        {
                                          callData.sentiment.callQuality
                                            .connectionStability
                                        }
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                      </>
                    ) : (
                      <Card>
                        <CardContent className="text-center py-8">
                          <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">
                            No sentiment analysis available for this call.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="recordings" className="space-y-6 mt-0">
                    {callData.recordings && callData.recordings.length > 0 ? (
                      <div className="space-y-4">
                        {callData.recordings.map((recording) => (
                          <Card key={recording.sid}>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">
                                  Call Recording
                                </CardTitle>
                                <Badge variant="outline" className="capitalize">
                                  {recording.status}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Recording ID:
                                  </span>
                                  <span className="font-mono">
                                    {recording.sid.slice(-8)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Duration:
                                  </span>
                                  <span>{recording.duration}s</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Started:
                                  </span>
                                  <span>
                                    {new Date(
                                      recording.startTime,
                                    ).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Status:
                                  </span>
                                  <span className="capitalize">
                                    {recording.status}
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button className="gap-2" disabled>
                                  <Play className="w-4 h-4" />
                                  Play Recording
                                </Button>
                                <Button
                                  variant="outline"
                                  className="gap-2 bg-transparent"
                                  disabled
                                >
                                  <Download className="w-4 h-4" />
                                  Download
                                </Button>
                              </div>

                              <p className="text-xs text-muted-foreground">
                                Note: Recording playback is available in
                                production with proper Twilio authentication.
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="text-center py-8">
                          <Phone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">
                            No recordings available for this call.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="notes" className="space-y-6 mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5" />
                          Call Notes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {callData.notes ? (
                          <div className="space-y-4">
                            <div className="p-4 bg-muted rounded-lg">
                              <p className="whitespace-pre-wrap">
                                {callData.notes}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => copyToClipboard(callData.notes)}
                              className="gap-2"
                            >
                              <Copy className="w-4 h-4" />
                              Copy Notes
                            </Button>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">
                              No notes were recorded for this call.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
