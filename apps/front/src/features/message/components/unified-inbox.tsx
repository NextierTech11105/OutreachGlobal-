"use client";

import { useState, useEffect } from "react";
import { MessageReply } from "@/components/message-reply";
import { InboxToolbar } from "@/components/inbox-toolbar";
import { InboundCallPanel } from "@/components/inbound-call-panel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ChevronLeft, Mail, Phone, PhoneCall, PenSquare, Calendar, Users, Search, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useCurrentTeam } from "@/features/team/team.context";
import { useCallState } from "@/lib/providers/call-state-provider";
import type { Message, MessageStatus, MessageType } from "@/types/message";
import { fetchMessages } from "@/lib/services/message-service";
import { InboxMessages } from "./inbox-messages";
import { InboxSidebar } from "./inbox-sidebar";
import { useInboxContext } from "../inbox.context";
import { MessageDetail } from "./message-detail";
import { GmailEmailComposer } from "@/components/gmail-email-composer";
import { LeadResearchPanel, type LeadResearchResult } from "@/components/lead-research-panel";

export function UnifiedInbox() {
  const router = useRouter();
  const { team } = useCurrentTeam();
  const { activateCall } = useCallState();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyMode, setReplyMode] = useState(false);
  const [{ activeTab }, dispatch] = useInboxContext();
  
  // NEVA Research state
  const [researchResult, setResearchResult] = useState<LeadResearchResult | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [showResearchPanel, setShowResearchPanel] = useState(false);
  
  const [filters, setFilters] = useState({
    search: "",
    status: [] as MessageStatus[],
    dateRange: { from: null, to: null } as {
      from: Date | null;
      to: null | Date;
    },
    campaigns: [] as string[],
    assignedTo: [] as string[],
    type: "email" as MessageType,
  });
  const [showSidebar, setShowSidebar] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    if (isMobile) {
      setShowSidebar(false);
    } else {
      setShowSidebar(true);
    }
  }, [isMobile]);

  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      try {
        const data = await fetchMessages(filters);
        setMessages(data);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [filters]);

  const handleViewMessage = (message: Message) => {
    setSelectedMessage(message);
    setReplyMode(false);
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  const handleReplyMessage = (message: Message) => {
    setSelectedMessage(message);
    setReplyMode(true);
  };

  const handleSendReply = async (replyText: string) => {
    if (!selectedMessage) return;

    try {
      // In a real app, this would call an API to send the reply
      console.log(`Sending reply to ${selectedMessage.from}: ${replyText}`);
      // Update the message status in the UI
      setMessages(
        messages.map((msg) =>
          msg.id === selectedMessage.id
            ? { ...msg, status: "replied" as MessageStatus }
            : msg,
        ),
      );

      // Reset the UI state
      setReplyMode(false);
      setSelectedMessage(null);
    } catch (error) {
      console.error("Failed to send reply:", error);
    }
  };

  const handleCloseDetail = () => {
    setSelectedMessage(null);
    setReplyMode(false);
  };

  const handleTabChange = (value: string) => {
    dispatch({
      activeTab: value as any,
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // EASIFY-STYLE ACTION HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════════

  // Call Now - Immediate dial via Twilio softphone (stays on inbox page)
  const handleCallNow = (message: Message) => {
    const phone = message.phone || message.from;
    if (!phone) {
      toast.error("No phone number available");
      return;
    }

    // Trigger softphone immediately
    activateCall(phone, message.fromName || message.from, {
      source: "inbox",
      status: message.status,
      leadId: message.leadId,
    });
    toast.success(`Calling ${message.fromName || phone}...`);
  };

  // Add to Automated Call Queue - Schedules for later automated dialing
  const handleAddToCallQueue = async (message: Message) => {
    const phone = message.phone || message.from;
    if (!phone) {
      toast.error("No phone number available");
      return;
    }

    try {
      // Call the queue API to add this lead
      await fetch(`/api/call-queue/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          name: message.fromName || message.from,
          leadId: message.leadId,
          source: "inbox",
          priority: "high",
          teamId: team?.id,
        }),
      });
      toast.success(
        `Added ${message.fromName || phone} to automated call queue`,
      );
    } catch (error) {
      console.error("Failed to add to call queue:", error);
      toast.error("Failed to add to call queue");
    }
  };

  // Push To Leads - Creates/updates lead record
  const handlePushToLeads = async (message: Message) => {
    try {
      await fetch(`/api/leads/from-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: message.id,
          phone: message.phone || message.from,
          name: message.fromName,
          email: message.email,
          teamId: team?.id,
        }),
      });
      toast.success("Pushed to Leads");
    } catch (error) {
      toast.error("Failed to push to leads");
    }
  };

  // Insert Template - Opens template selector
  const handleInsertTemplate = (message: Message) => {
    setSelectedMessage(message);
    setReplyMode(true);
    toast.info("Select a template from the reply composer");
  };

  // Add Booking Event
  const handleAddBooking = (message: Message) => {
    const params = new URLSearchParams({
      phone: message.phone || message.from || "",
      name: message.fromName || "",
      source: "inbox",
    });
    router.push(`/t/${team?.slug}/calendar/new?${params.toString()}`);
  };

  // Add Appointment Link - Generates and copies scheduling link
  const handleAddAppointmentLink = async (message: Message) => {
    try {
      // Generate appointment link for this lead
      const link = `${window.location.origin}/book/${team?.slug}?ref=${message.id}`;
      await navigator.clipboard.writeText(link);
      toast.success("Appointment link copied to clipboard");
    } catch (error) {
      toast.error("Failed to generate appointment link");
    }
  };

  // Push to CRM
  const handlePushToCRM = async (message: Message) => {
    try {
      await fetch(`/api/crm/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: message.id,
          phone: message.phone || message.from,
          name: message.fromName,
          teamId: team?.id,
        }),
      });
      toast.success("Pushed to CRM");
    } catch (error) {
      toast.error("Failed to push to CRM");
    }
  };

  // Add Note
  const handleAddNote = (message: Message) => {
    setSelectedMessage(message);
    setReplyMode(false);
    toast.info("Open message detail to add notes");
  };

  // Add to Blacklist
  const handleAddToBlacklist = async (message: Message) => {
    const phone = message.phone || message.from;
    if (!phone) return;

    try {
      await fetch(`/api/blacklist/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          reason: "manual_blacklist",
          teamId: team?.id,
        }),
      });
      toast.warning(`${phone} added to blacklist`);
    } catch (error) {
      toast.error("Failed to add to blacklist");
    }
  };

  // Block Contact
  const handleBlockContact = async (message: Message) => {
    const phone = message.phone || message.from;
    if (!phone) return;

    try {
      await fetch(`/api/contacts/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          messageId: message.id,
          teamId: team?.id,
        }),
      });
      toast.warning(`Contact blocked`);
    } catch (error) {
      toast.error("Failed to block contact");
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // NEVA PERPLEXITY RESEARCH - Deep lead intelligence before calls/appointments
  // ═══════════════════════════════════════════════════════════════════════════════

  // Research Lead - Triggers NEVA deep research for call prep
  const handleResearchLead = async (message: Message) => {
    const companyName = message.companyName || message.fromName || "Unknown Company";
    const contactName = message.fromName || "";
    
    setIsResearching(true);
    setShowResearchPanel(true);
    setSelectedMessage(message);
    
    toast.info(`🔍 Researching ${companyName}...`, { duration: 3000 });
    
    try {
      // Call NEVA research API
      const response = await fetch(`/api/neva/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          contactName,
          phone: message.phone || message.from,
          email: message.email,
          address: message.address ? {
            city: message.city || "",
            state: message.state || "",
          } : undefined,
          industry: message.industry,
          teamId: team?.id,
          leadId: message.leadId,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Research request failed");
      }
      
      const data = await response.json();
      setResearchResult(data);
      toast.success(`✨ Research complete for ${companyName}`);
    } catch (error) {
      console.error("Research failed:", error);
      toast.error("Research failed. Please try again.");
      setShowResearchPanel(false);
    } finally {
      setIsResearching(false);
    }
  };

  // Close research panel
  const handleCloseResearch = () => {
    setShowResearchPanel(false);
    setResearchResult(null);
  };

  // Legacy quick call handler (kept for compatibility)
  const handleQuickCall = (message: Message) => {
    handleCallNow(message);
  };

  const filteredMessages = messages.filter((message) => {
    // Filter by type based on active tab
    if (activeTab === "email" && message.type !== "email") return false;
    if (activeTab === "sms" && message.type !== "sms") return false;
    if (activeTab === "voice" && message.type !== "voice") return false;

    return true;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] border rounded-lg overflow-hidden bg-background">
      {/* Header with tabs and toolbar */}
      <div className="border-b p-2 bg-muted/30">
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            {(selectedMessage || showCompose) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1"
                onClick={() => {
                  handleCloseDetail();
                  setShowCompose(false);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            {!selectedMessage && !showCompose && (
              <Tabs
                defaultValue="all"
                value={activeTab}
                onValueChange={handleTabChange}
              >
                <TabsList className="h-8 w-[250px]">
                  <TabsTrigger value="all" className="text-xs">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="email" className="text-xs">
                    Email
                  </TabsTrigger>
                  <TabsTrigger value="sms" className="text-xs">
                    SMS
                  </TabsTrigger>
                  <TabsTrigger value="voice" className="text-xs">
                    Voice
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!selectedMessage && !showCompose && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1"
                  onClick={() => setShowCompose(true)}
                >
                  <PenSquare className="h-4 w-4" />
                  Compose
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1"
                  onClick={() => router.push(`/t/${team?.slug || ""}/appointments`)}
                >
                  <Calendar className="h-4 w-4" />
                  Calendar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1"
                  onClick={() => router.push(`/t/${team?.slug || ""}/leads`)}
                >
                  <Users className="h-4 w-4" />
                  Leads
                </Button>
              </>
            )}
            {!selectedMessage && !showCompose && (
              <Button
                size="sm"
                className="h-8 gap-1 bg-green-600 hover:bg-green-700"
                onClick={() => {
                  // Navigate to call center - if a message is selected, pass the phone
                  const params = new URLSearchParams();
                  // Could add selected message phone here if needed
                  router.push(`/t/${team?.slug || ""}/call-center`);
                }}
              >
                <Phone className="h-4 w-4" />
                Call Center
              </Button>
            )}
            {selectedMessage && (
              <Button
                size="sm"
                className="h-8 gap-1 bg-green-600 hover:bg-green-700"
                onClick={() => handleQuickCall(selectedMessage)}
              >
                <PhoneCall className="h-4 w-4" />
                Quick Call
              </Button>
            )}
            <InboxToolbar
              onToggleSidebar={() => setShowSidebar(!showSidebar)}
              showSidebar={showSidebar}
            />
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {showSidebar && !selectedMessage && !showCompose && (
          <div className="w-56 md:w-64 border-r bg-muted/10 overflow-y-auto">
            <div className="p-2 space-y-4">
              {/* Inbound Call Panel - Always visible at top */}
              <InboundCallPanel />
              <InboxSidebar />
            </div>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-auto">
          <div className="p-4">
            {showCompose ? (
              <div className="max-w-2xl mx-auto">
                <GmailEmailComposer
                  onSent={() => setShowCompose(false)}
                  onCancel={() => setShowCompose(false)}
                />
              </div>
            ) : showResearchPanel && selectedMessage ? (
              <LeadResearchPanel
                message={selectedMessage}
                result={researchResult}
                isLoading={isResearching}
                onClose={handleCloseResearch}
                onCallNow={() => handleCallNow(selectedMessage)}
                onAddBooking={() => handleAddBooking(selectedMessage)}
              />
            ) : !selectedMessage ? (
              <InboxMessages
                onViewMessage={handleViewMessage}
                onReplyMessage={handleReplyMessage}
                onCallBack={handleQuickCall}
                // Easify-style actions
                onCallNow={handleCallNow}
                onAddToCallQueue={handleAddToCallQueue}
                onPushToLeads={handlePushToLeads}
                onInsertTemplate={handleInsertTemplate}
                onAddBooking={handleAddBooking}
                onAddAppointmentLink={handleAddAppointmentLink}
                onPushToCRM={handlePushToCRM}
                onAddNote={handleAddNote}
                onAddToBlacklist={handleAddToBlacklist}
                onBlockContact={handleBlockContact}
                onResearchLead={handleResearchLead}
              />
            ) : replyMode ? (
              <MessageReply
                message={selectedMessage}
                onSend={handleSendReply}
                onCancel={handleCloseDetail}
              />
            ) : (
              <MessageDetail
                message={selectedMessage}
                onReply={() => setReplyMode(true)}
                onClose={handleCloseDetail}
                onResearchLead={() => handleResearchLead(selectedMessage)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
