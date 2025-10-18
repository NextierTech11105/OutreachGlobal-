"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Mail, MessageSquare, Phone, Clock } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Contact {
  id: string;
  type: "email" | "call" | "sms";
  direction: "inbound" | "outbound";
  subject?: string;
  content: string;
  timestamp: string;
  duration?: number; // in seconds, for calls
  user: {
    name: string;
    initials: string;
  };
}

interface Props {
  leadId: string;
}

export function LeadMessageHistory({ leadId }: Props) {
  // In a real app, you would fetch this data from an API
  const [contacts] = useState<Contact[]>([]);

  const getContactIcon = (type: Contact["type"]) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "call":
        return <Phone className="h-4 w-4" />;
      case "sms":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const getContactIconColor = (type: Contact["type"]) => {
    switch (type) {
      case "email":
        return "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300";
      case "call":
        return "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300";
      case "sms":
        return "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="calls">Calls</TabsTrigger>
          <TabsTrigger value="emails">Emails</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="space-y-4 mt-4">
          {contacts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No communication history</p>
            </div>
          ) : (
            contacts.map((contact) => (
              <div key={contact.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-1 rounded-full ${getContactIconColor(contact.type)}`}
                    >
                      {getContactIcon(contact.type)}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">
                        {contact.type === "email"
                          ? "Email"
                          : contact.type === "call"
                            ? "Call"
                            : "SMS"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        (
                        {contact.direction === "inbound"
                          ? "Inbound"
                          : "Outbound"}
                        )
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {contact.duration && (
                      <>
                        <Clock className="h-3 w-3" />
                        <span>{formatDuration(contact.duration)}</span>
                        <span>•</span>
                      </>
                    )}
                    <span>
                      {formatDistanceToNow(new Date(contact.timestamp), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
                {contact.subject && (
                  <p className="font-medium text-sm">{contact.subject}</p>
                )}
                <p className="text-sm whitespace-pre-line">{contact.content}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px]">
                      {contact.user.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span>{contact.user.name}</span>
                </div>
              </div>
            ))
          )}
        </TabsContent>
        <TabsContent value="calls" className="space-y-4 mt-4">
          {contacts.filter((c) => c.type === "call").length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No call history</p>
            </div>
          ) : (
            contacts
              .filter((c) => c.type === "call")
              .map((contact) => (
                <div
                  key={contact.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1 rounded-full ${getContactIconColor(contact.type)}`}
                      >
                        {getContactIcon(contact.type)}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Call</span>
                        <span className="text-xs text-muted-foreground">
                          (
                          {contact.direction === "inbound"
                            ? "Inbound"
                            : "Outbound"}
                          )
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {contact.duration && (
                        <>
                          <Clock className="h-3 w-3" />
                          <span>{formatDuration(contact.duration)}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>
                        {formatDistanceToNow(new Date(contact.timestamp), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm">{contact.content}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px]">
                        {contact.user.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span>{contact.user.name}</span>
                  </div>
                </div>
              ))
          )}
        </TabsContent>
        <TabsContent value="emails" className="space-y-4 mt-4">
          {contacts.filter((c) => c.type === "email").length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No email history</p>
            </div>
          ) : (
            contacts
              .filter((c) => c.type === "email")
              .map((contact) => (
                <div
                  key={contact.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1 rounded-full ${getContactIconColor(contact.type)}`}
                      >
                        {getContactIcon(contact.type)}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Email</span>
                        <span className="text-xs text-muted-foreground">
                          (
                          {contact.direction === "inbound"
                            ? "Inbound"
                            : "Outbound"}
                          )
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {formatDistanceToNow(new Date(contact.timestamp), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                  {contact.subject && (
                    <p className="font-medium text-sm">{contact.subject}</p>
                  )}
                  <p className="text-sm whitespace-pre-line">
                    {contact.content}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px]">
                        {contact.user.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span>{contact.user.name}</span>
                  </div>
                </div>
              ))
          )}
        </TabsContent>
        <TabsContent value="sms" className="space-y-4 mt-4">
          {contacts.filter((c) => c.type === "sms").length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No SMS history</p>
            </div>
          ) : (
            contacts
              .filter((c) => c.type === "sms")
              .map((contact) => (
                <div
                  key={contact.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1 rounded-full ${getContactIconColor(contact.type)}`}
                      >
                        {getContactIcon(contact.type)}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">SMS</span>
                        <span className="text-xs text-muted-foreground">
                          (
                          {contact.direction === "inbound"
                            ? "Inbound"
                            : "Outbound"}
                          )
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {formatDistanceToNow(new Date(contact.timestamp), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm">{contact.content}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px]">
                        {contact.user.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span>{contact.user.name}</span>
                  </div>
                </div>
              ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
