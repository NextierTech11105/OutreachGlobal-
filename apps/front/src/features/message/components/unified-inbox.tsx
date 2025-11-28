"use client";

import { useState, useEffect } from "react";
import { MessageReply } from "@/components/message-reply";
import { InboxToolbar } from "@/components/inbox-toolbar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ChevronLeft, Plus } from "lucide-react";
import type { Message, MessageStatus, MessageType } from "@/types/message";
import { fetchMessages } from "@/lib/services/message-service";
import { InboxMessages } from "./inbox-messages";
import { InboxSidebar } from "./inbox-sidebar";
import { useInboxContext } from "../inbox.context";
import { MessageDetail } from "./message-detail";

export function UnifiedInbox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyMode, setReplyMode] = useState(false);
  const [{ activeTab }, dispatch] = useInboxContext();
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
            {!selectedMessage && (
              <Button size="sm" className="h-8 gap-1">
                <Plus className="h-4 w-4" />
                Compose
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
        {showSidebar && !selectedMessage && (
          <div className="w-56 md:w-64 border-r bg-muted/10 overflow-y-auto">
            <div className="p-2">
              <InboxSidebar />
            </div>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-auto">
          <div className="p-4">
            {!selectedMessage ? (
              <InboxMessages />
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
        </div>
      </div>
    </div>
  );
}
