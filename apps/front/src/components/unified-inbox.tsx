"use client";

import { useState, useEffect } from "react";
import { InboxMessages } from "@/components/inbox-messages";
import { MessageDetail } from "@/components/message-detail";
import { MessageReply } from "@/components/message-reply";
import { InboxSidebar } from "@/components/inbox-sidebar";
import { InboxToolbar } from "@/components/inbox-toolbar";
import { InboxFilters } from "@/components/inbox-filters";
import { InboxAnalytics } from "@/components/inbox-analytics";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ChevronLeft, Plus } from "lucide-react";
import type { Message, MessageType, MessageStatus } from "@/types/message";
import { fetchMessages } from "@/lib/services/message-service";

export function UnifiedInbox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyMode, setReplyMode] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "all" | "email" | "sms" | "voice" | "analytics"
  >("all");
  const [filters, setFilters] = useState({
    search: "",
    status: [] as MessageStatus[],
    dateRange: { from: null, to: null } as {
      from: Date | null;
      to: null | Date;
    },
    campaigns: [] as string[],
    assignedTo: [] as string[],
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { toast } = useToast();

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
        toast({
          title: "Error",
          description: "Failed to load messages. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [filters, toast]);

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

      toast({
        title: "Reply sent",
        description: `Your reply to ${selectedMessage.from} has been sent.`,
      });

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
      toast({
        title: "Error",
        description: "Failed to send reply. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCloseDetail = () => {
    setSelectedMessage(null);
    setReplyMode(false);
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as typeof activeTab);

    // Update filters based on the selected tab
    if (value === "all") {
      setFilters({ ...filters, type: undefined });
    } else if (value === "email" || value === "sms" || value === "voice") {
      setFilters({ ...filters, type: value as MessageType });
    }
  };

  const filteredMessages = messages.filter((message) => {
    // Filter by type based on active tab
    if (activeTab === "email" && message.type !== "email") return false;
    if (activeTab === "sms" && message.type !== "sms") return false;
    if (activeTab === "voice" && message.type !== "voice") return false;

    return true;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] border rounded-lg overflow-hidden bg-background">
      {/* Header with tabs and toolbar */}
      <div className="border-b p-2 bg-muted/30">
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            {selectedMessage && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1"
                onClick={handleCloseDetail}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            {!selectedMessage && (
              <Tabs
                defaultValue="all"
                value={activeTab}
                onValueChange={handleTabChange}
                className="w-full"
              >
                <TabsList className="h-8">
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
                  <TabsTrigger value="analytics" className="text-xs">
                    Analytics
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!selectedMessage && (
              <Button size="sm" className="h-8 gap-1">
                <Plus className="h-4 w-4" />
                Compose
              </Button>
            )}
            <InboxToolbar
              onToggleFilters={() => setShowFilters(!showFilters)}
              onToggleSidebar={() => setShowSidebar(!showSidebar)}
              showFilters={showFilters}
              showSidebar={showSidebar}
            />
          </div>
        </div>

        {showFilters && !selectedMessage && (
          <div className="mt-2 pt-2 border-t">
            <InboxFilters
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </div>
        )}
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {showSidebar && !selectedMessage && (
          <div className="w-56 md:w-64 border-r bg-muted/10 overflow-y-auto">
            <div className="p-2">
              <InboxSidebar />
            </div>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-auto">
          {activeTab === "analytics" && !selectedMessage ? (
            <div className="p-4">
              <InboxAnalytics />
            </div>
          ) : (
            <div className="p-4">
              {!selectedMessage ? (
                <InboxMessages
                  messages={filteredMessages}
                  loading={loading}
                  onViewMessage={handleViewMessage}
                  onReplyMessage={handleReplyMessage}
                  filters={filters}
                  onFilterChange={handleFilterChange}
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
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
