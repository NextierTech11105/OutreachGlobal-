"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Mail, MessageSquare, Phone, Reply } from "lucide-react";

interface Message {
  id: string;
  type: "sms" | "email" | "call";
  direction: "inbound" | "outbound";
  content?: string | null;
  subject?: string | null;
  createdAt: string;
  lead?: {
    id: string;
    name?: string | null;
  } | null;
}

interface MessageDetailProps {
  message: Message | null;
  onReply?: () => void;
}

export function MessageDetail({ message, onReply }: MessageDetailProps) {
  if (!message) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a message to view details
      </div>
    );
  }

  const getIcon = () => {
    switch (message.type) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "sms":
        return <MessageSquare className="h-4 w-4" />;
      case "call":
        return <Phone className="h-4 w-4" />;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>
                {message.lead?.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">
                {message.lead?.name || "Unknown"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(message.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              {getIcon()}
              {message.type.toUpperCase()}
            </Badge>
            <Badge
              variant={
                message.direction === "inbound" ? "default" : "secondary"
              }
            >
              {message.direction}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {message.subject && (
          <h3 className="font-medium mb-2">{message.subject}</h3>
        )}
        <div className="prose prose-sm max-w-none">
          {message.content || "No content"}
        </div>
        {onReply && (
          <div className="mt-4 pt-4 border-t">
            <Button onClick={onReply} variant="outline">
              <Reply className="h-4 w-4 mr-2" />
              Reply
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
