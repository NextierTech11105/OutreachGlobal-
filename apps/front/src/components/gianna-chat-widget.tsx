"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Send,
  X,
  Minimize2,
  Sparkles,
  Loader2,
  MessageSquare,
  Zap,
  ChevronDown,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Clock,
  User,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface GiannaChatWidgetProps {
  context?: {
    page?: string;
    leadName?: string;
    leadPhone?: string;
    leadEmail?: string;
    campaignType?: string;
  };
  // Action callbacks
  onScheduleCall?: (leadPhone?: string) => void;
  onSendSms?: (leadPhone?: string) => void;
  onSendEmail?: (leadEmail?: string) => void;
  onScheduleVisit?: () => void;
}

export function GiannaChatWidget({
  context,
  onScheduleCall,
  onSendSms,
  onSendEmail,
  onScheduleVisit,
}: GiannaChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hey! I'm Gianna, your AI SDR. I'm watching your inbox and ready to help with responses. What do you need?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingResponses, setPendingResponses] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized && !showSettings) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized, showSettings]);

  // Load settings from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const settings = localStorage.getItem("gianna_settings");
      if (settings) {
        const parsed = JSON.parse(settings);
        setAutoMode(parsed.mode === "full-auto");
      }
    }
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          history: conversationHistory,
          context: {
            ...context,
            currentPage: window.location.pathname,
          },
        }),
      });

      const data = await response.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: "Sorry, I'm having trouble right now. Try again in a moment.",
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: data.response || data.message || "I processed your request.",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error("Gianna chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Connection issue. Check your network and try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, context]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleAutoMode = () => {
    const newMode = !autoMode;
    setAutoMode(newMode);

    // Save to localStorage
    const settings = localStorage.getItem("gianna_settings");
    const parsed = settings ? JSON.parse(settings) : {};
    parsed.mode = newMode ? "full-auto" : "human-in-loop";
    localStorage.setItem("gianna_settings", JSON.stringify(parsed));
  };

  // Quick actions for inbox
  const quickActions = [
    { label: "Draft Reply", icon: MessageSquare, action: "Help me draft a reply to this lead" },
    { label: "Objection Help", icon: Zap, action: "How should I handle this objection?" },
    { label: "Follow-up", icon: Clock, action: "Write a follow-up message for a ghosted lead" },
  ];

  const handleQuickAction = (action: string) => {
    setInput(action);
    setTimeout(() => sendMessage(), 100);
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg shadow-purple-500/30 flex items-center justify-center cursor-pointer group"
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Brain className="w-7 h-7 text-white" />
            </motion.div>

            {/* Pulse ring */}
            <motion.div
              animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-purple-500"
            />

            {/* Status badge */}
            {autoMode && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-zinc-900 flex items-center justify-center">
                <Zap className="w-3 h-3 text-white" />
              </div>
            )}

            {/* Pending count */}
            {pendingResponses > 0 && (
              <div className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 rounded-full border-2 border-zinc-900 flex items-center justify-center text-[10px] font-bold text-white">
                {pendingResponses}
              </div>
            )}

            {/* Tooltip */}
            <div className="absolute right-full mr-3 px-3 py-1.5 bg-zinc-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {autoMode ? "Gianna (Auto)" : "Chat with Gianna"}
              <Sparkles className="w-3 h-3 inline ml-1 text-purple-400" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: isMinimized ? "auto" : 520,
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-96 bg-zinc-900 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border-b border-purple-500/30">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  {/* Online indicator */}
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-900",
                    autoMode ? "bg-green-500" : "bg-yellow-500"
                  )} />
                </div>
                <div>
                  <h3 className="font-semibold text-white flex items-center gap-1">
                    Gianna
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {autoMode ? "Auto-Reply Active" : "Human-in-Loop Mode"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-zinc-400 hover:text-white"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-zinc-400 hover:text-white"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  {isMinimized ? <ChevronDown className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-zinc-400 hover:text-white"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Chat Content */}
            {!isMinimized && (
              <>
                {/* Settings Panel */}
                {showSettings ? (
                  <div className="flex-1 p-4 space-y-4">
                    <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Zap className={cn("w-5 h-5", autoMode ? "text-green-400" : "text-zinc-400")} />
                        <div>
                          <p className="text-sm font-medium text-white">Auto-Reply Mode</p>
                          <p className="text-xs text-zinc-500">Gianna responds automatically</p>
                        </div>
                      </div>
                      <Switch checked={autoMode} onCheckedChange={toggleAutoMode} />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-zinc-500 uppercase tracking-wide">Quick Actions</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          className="h-auto py-3 flex flex-col items-center gap-1"
                          onClick={() => onScheduleCall?.(context?.leadPhone)}
                        >
                          <Phone className="w-5 h-5 text-green-400" />
                          <span className="text-xs">Schedule Call</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-auto py-3 flex flex-col items-center gap-1"
                          onClick={() => onSendSms?.(context?.leadPhone)}
                        >
                          <MessageSquare className="w-5 h-5 text-blue-400" />
                          <span className="text-xs">Send SMS</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-auto py-3 flex flex-col items-center gap-1"
                          onClick={() => onSendEmail?.(context?.leadEmail)}
                        >
                          <Mail className="w-5 h-5 text-purple-400" />
                          <span className="text-xs">Send Email</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-auto py-3 flex flex-col items-center gap-1"
                          onClick={() => onScheduleVisit?.()}
                        >
                          <MapPin className="w-5 h-5 text-orange-400" />
                          <span className="text-xs">Schedule Visit</span>
                        </Button>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      className="w-full text-zinc-400"
                      onClick={() => setShowSettings(false)}
                    >
                      Back to Chat
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                              "flex gap-3",
                              message.role === "user" ? "flex-row-reverse" : "flex-row"
                            )}
                          >
                            {/* Avatar */}
                            <div
                              className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                message.role === "assistant"
                                  ? "bg-gradient-to-br from-purple-500 to-indigo-600"
                                  : "bg-zinc-700"
                              )}
                            >
                              {message.role === "assistant" ? (
                                <Brain className="w-4 h-4 text-white" />
                              ) : (
                                <User className="w-4 h-4 text-zinc-300" />
                              )}
                            </div>

                            {/* Message bubble */}
                            <div
                              className={cn(
                                "max-w-[75%] rounded-2xl px-4 py-2.5",
                                message.role === "assistant"
                                  ? "bg-zinc-800 text-zinc-100 rounded-tl-sm"
                                  : "bg-purple-600 text-white rounded-tr-sm"
                              )}
                            >
                              <p className="text-sm leading-relaxed">{message.content}</p>
                            </div>
                          </motion.div>
                        ))}

                        {/* Loading indicator */}
                        {isLoading && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-3"
                          >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                              <Brain className="w-4 h-4 text-white" />
                            </div>
                            <div className="bg-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3">
                              <motion.div
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="flex items-center gap-2"
                              >
                                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                                <span className="text-sm text-zinc-400">Gianna is thinking...</span>
                              </motion.div>
                            </div>
                          </motion.div>
                        )}

                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>

                    {/* Quick Actions */}
                    {messages.length <= 2 && (
                      <div className="px-4 pb-2">
                        <div className="flex flex-wrap gap-2">
                          {quickActions.map((qa) => (
                            <button
                              key={qa.label}
                              onClick={() => handleQuickAction(qa.action)}
                              className="px-3 py-1.5 text-xs bg-purple-500/20 text-purple-300 rounded-full hover:bg-purple-500/30 transition-colors flex items-center gap-1"
                            >
                              <qa.icon className="w-3 h-3" />
                              {qa.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons Bar */}
                    <div className="px-4 py-2 border-t border-zinc-800 flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => onScheduleCall?.(context?.leadPhone)}
                      >
                        <Phone className="w-3 h-3 mr-1 text-green-400" />
                        Call
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => onSendSms?.(context?.leadPhone)}
                      >
                        <MessageSquare className="w-3 h-3 mr-1 text-blue-400" />
                        SMS
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => onSendEmail?.(context?.leadEmail)}
                      >
                        <Mail className="w-3 h-3 mr-1 text-purple-400" />
                        Email
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => onScheduleVisit?.()}
                      >
                        <MapPin className="w-3 h-3 mr-1 text-orange-400" />
                        Visit
                      </Button>
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-zinc-800">
                      <div className="flex gap-2">
                        <Input
                          ref={inputRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Ask Gianna anything..."
                          className="bg-zinc-800 border-zinc-700 focus:border-purple-500 text-white placeholder:text-zinc-500"
                          disabled={isLoading}
                        />
                        <Button
                          onClick={sendMessage}
                          disabled={!input.trim() || isLoading}
                          className="bg-purple-600 hover:bg-purple-700 px-3"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default GiannaChatWidget;
