"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Filter,
  RefreshCw,
  User,
} from "lucide-react";

import {
  GIANNA,
  CATHY,
  SABRINA,
  type DigitalWorkerId,
  type DigitalWorkerProfile,
} from "@/lib/ai-workers/digital-workers";
import {
  getConversationsByWorker,
  getEscalatedConversations,
  type ConversationState,
} from "@/lib/ai-workers/scheduling-engine";

// Worker configs - SMS workers only (GIANNA, CATHY, SABRINA)
// NEVA and LUCY are browser-based, not SMS
type SMSWorkerId = "gianna" | "cathy" | "sabrina";
const WORKERS: Record<SMSWorkerId, DigitalWorkerProfile> = {
  gianna: GIANNA,
  cathy: CATHY,
  sabrina: SABRINA,
};

// Response classification colors - GREEN = Priority/Automatable
const CLASSIFICATION_COLORS: Record<string, string> = {
  "email-capture": "bg-green-500 text-white border-green-600", // GREEN - Auto
  interested: "bg-green-500 text-white border-green-600", // GREEN - Auto
  question: "bg-green-500 text-white border-green-600", // GREEN - Auto
  "called-back": "bg-green-500 text-white border-green-600", // GREEN - High Intent
  objection: "bg-yellow-100 text-yellow-800 border-yellow-200", // YELLOW - Human review
  "not-interested": "bg-gray-100 text-gray-600 border-gray-200", // SUPPRESSED
  "opt-out": "bg-red-100 text-red-800 border-red-200", // SUPPRESSED
  profanity: "bg-gray-100 text-gray-600 border-gray-200", // SUPPRESSED
  "wrong-number": "bg-gray-100 text-gray-600 border-gray-200", // SUPPRESSED
  other: "bg-gray-100 text-gray-600 border-gray-200",
};

// Priority classifications - these get shown in the main inbox
const PRIORITY_CLASSIFICATIONS = [
  "email-capture",
  "interested",
  "question",
  "called-back",
];

// Suppressed classifications - reviewed in bulk later
const SUPPRESSED_CLASSIFICATIONS = [
  "opt-out",
  "profanity",
  "wrong-number",
  "not-interested",
];

interface InboundMessage {
  id: string;
  leadId: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  message: string;
  receivedAt: string;
  classification: string;
  campaignId: string;
  campaignName: string;
  attemptNumber: number;
  status: "pending" | "replied" | "escalated";
  suggestedReply?: string;
}

interface WorkerInboundCenterProps {
  workerId: SMSWorkerId; // GIANNA, CATHY, SABRINA only (SMS workers)
}

export function WorkerInboundCenter({ workerId }: WorkerInboundCenterProps) {
  const worker = WORKERS[workerId];
  const [filter, setFilter] = useState<string>("all");
  const [selectedMessage, setSelectedMessage] = useState<InboundMessage | null>(
    null,
  );
  const [replyText, setReplyText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Example messages - in production these come from the database
  const [messages, setMessages] = useState<InboundMessage[]>([
    {
      id: "msg_001",
      leadId: "lead_abc123",
      firstName: "John",
      lastName: "Smith",
      phone: "+1 (555) 123-4567",
      message: "Yes I'm interested! My email is john@email.com",
      receivedAt: new Date(Date.now() - 5 * 60000).toISOString(),
      classification: "email-capture",
      campaignId: "camp_001",
      campaignName: "Queens Homeowners Q4",
      attemptNumber: 1,
      status: "pending",
      suggestedReply: `Excellent John! I'll have that Property Valuation Report sent to your email shortly. Talk soon! - ${worker.name}`,
    },
    {
      id: "msg_002",
      leadId: "lead_def456",
      firstName: "Sarah",
      phone: "+1 (555) 234-5678",
      message: "How much are you offering for the property?",
      receivedAt: new Date(Date.now() - 15 * 60000).toISOString(),
      classification: "question",
      campaignId: "camp_001",
      campaignName: "Queens Homeowners Q4",
      attemptNumber: 2,
      status: "pending",
      suggestedReply: `Great question Sarah! The offer depends on a few factors. Easiest thing is to hop on for 10 mins - I can walk you through it. Got time this week? - ${worker.name}`,
    },
    {
      id: "msg_003",
      leadId: "lead_ghi789",
      firstName: "Mike",
      lastName: "Johnson",
      phone: "+1 (555) 345-6789",
      email: "mike.j@company.com",
      message: "Not right now, maybe in the spring",
      receivedAt: new Date(Date.now() - 45 * 60000).toISOString(),
      classification: "objection",
      campaignId: "camp_002",
      campaignName: "Brooklyn Investors",
      attemptNumber: 3,
      status: "pending",
      suggestedReply: `Totally get it Mike - timing is everything. I'll set a reminder to reach back in spring. Before I go though - would it help to at least know what the numbers look like now? No commitment. - ${worker.name}`,
    },
  ]);

  const filteredMessages = messages.filter((msg) => {
    if (filter === "all") return true;
    if (filter === "pending") return msg.status === "pending";
    if (filter === "replied") return msg.status === "replied";
    return msg.classification === filter;
  });

  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;

    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === selectedMessage.id
          ? { ...msg, status: "replied" as const }
          : msg,
      ),
    );
    setSelectedMessage(null);
    setReplyText("");
    setIsLoading(false);
  };

  const getTimeAgo = (isoString: string) => {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Message List */}
      <div className="lg:col-span-2 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full text-white ${
                workerId === "gianna"
                  ? "bg-blue-500"
                  : workerId === "cathy"
                    ? "bg-purple-500"
                    : "bg-green-500"
              }`}
            >
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {worker.name}&apos;s Inbox
              </h2>
              <p className="text-sm text-muted-foreground">
                {filteredMessages.filter((m) => m.status === "pending").length}{" "}
                pending responses
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Messages</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="replied">Replied</SelectItem>
                <SelectItem value="email-capture">Email Captures</SelectItem>
                <SelectItem value="question">Questions</SelectItem>
                <SelectItem value="interested">Interested</SelectItem>
                <SelectItem value="objection">Objections</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Message Cards */}
        <ScrollArea className="h-[600px]">
          <div className="space-y-3 pr-4">
            {filteredMessages.map((msg) => (
              <Card
                key={msg.id}
                className={`cursor-pointer transition-all hover:border-primary ${
                  selectedMessage?.id === msg.id
                    ? "border-primary bg-primary/5"
                    : ""
                } ${msg.status === "replied" ? "opacity-60" : ""}`}
                onClick={() => {
                  setSelectedMessage(msg);
                  setReplyText(msg.suggestedReply || "");
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-muted rounded-full">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {msg.firstName} {msg.lastName || ""}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              CLASSIFICATION_COLORS[msg.classification] ||
                              CLASSIFICATION_COLORS.other
                            }
                          >
                            {msg.classification.replace("-", " ")}
                          </Badge>
                          {msg.status === "replied" && (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Replied
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {msg.phone}
                        </p>
                        <p className="text-sm mt-2">{msg.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getTimeAgo(msg.receivedAt)}
                          </span>
                          <span>Campaign: {msg.campaignName}</span>
                          <span>Attempt #{msg.attemptNumber}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Reply Panel */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Reply</CardTitle>
            <CardDescription>
              {selectedMessage
                ? `Replying to ${selectedMessage.firstName}`
                : `Select a message to reply as ${worker.name}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedMessage ? (
              <>
                {/* Lead Info */}
                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {selectedMessage.firstName}{" "}
                      {selectedMessage.lastName || ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedMessage.phone}</span>
                  </div>
                  {selectedMessage.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedMessage.email}</span>
                    </div>
                  )}
                </div>

                {/* Their Message */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Their message:
                  </p>
                  <p className="text-sm p-3 bg-muted/30 rounded-lg italic">
                    &quot;{selectedMessage.message}&quot;
                  </p>
                </div>

                {/* Reply Textarea */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Your reply as {worker.name}:
                  </p>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Type your reply...`}
                    className="min-h-[120px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {replyText.length} characters (
                    {Math.ceil(replyText.length / 160)} SMS segments)
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || isLoading}
                    className="flex-1"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isLoading ? "Sending..." : "Send Reply"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedMessage(null);
                      setReplyText("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Select a message to start replying</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Worker Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {worker.name}&apos;s Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold">
                  {messages.filter((m) => m.status === "pending").length}
                </p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {messages.filter((m) => m.status === "replied").length}
                </p>
                <p className="text-xs text-muted-foreground">Replied</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {
                    messages.filter((m) => m.classification === "email-capture")
                      .length
                  }
                </p>
                <p className="text-xs text-muted-foreground">Emails Captured</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {
                    messages.filter((m) => m.classification === "question")
                      .length
                  }
                </p>
                <p className="text-xs text-muted-foreground">Questions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
