"use client";

import { useState } from "react";
import {
  Palette,
  Plus,
  Edit,
  Trash2,
  Bot,
  MessageSquare,
  Phone,
  Mail,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SDRAvatar {
  id: string;
  name: string;
  role: string;
  personality: string;
  tone: string;
  channels: ("sms" | "email" | "voice")[];
  messagesHandled: number;
  avgResponseTime: string;
  isActive: boolean;
}

export default function AiSdrAvatarsPage() {
  const [avatars] = useState<SDRAvatar[]>([
    {
      id: "1",
      name: "Gianna",
      role: "Initial Outreach Specialist",
      personality: "Friendly and professional",
      tone: "Warm, conversational",
      channels: ["sms"],
      messagesHandled: 2456,
      avgResponseTime: "2.3s",
      isActive: true,
    },
    {
      id: "2",
      name: "Marcus",
      role: "Enterprise Account Rep",
      personality: "Consultative and knowledgeable",
      tone: "Professional, solution-focused",
      channels: ["email", "voice"],
      messagesHandled: 1234,
      avgResponseTime: "3.1s",
      isActive: true,
    },
    {
      id: "3",
      name: "Cathy",
      role: "Appointment Scheduler",
      personality: "Efficient and helpful",
      tone: "Direct but friendly",
      channels: ["sms", "voice"],
      messagesHandled: 890,
      avgResponseTime: "1.8s",
      isActive: true,
    },
    {
      id: "4",
      name: "Sabrina",
      role: "Lead Nurture Specialist",
      personality: "Patient and persistent",
      tone: "Educational, value-driven",
      channels: ["sms", "email"],
      messagesHandled: 567,
      avgResponseTime: "2.9s",
      isActive: false,
    },
  ]);

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "sms":
        return <MessageSquare className="h-3 w-3" />;
      case "email":
        return <Mail className="h-3 w-3" />;
      case "voice":
        return <Phone className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-orange-500",
      "bg-green-500",
      "bg-teal-500",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SDR Avatars</h1>
          <p className="text-muted-foreground">
            AI personality profiles for your digital sales team
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Avatar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Avatars
            </CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avatars.filter((a) => a.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Messages Handled
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avatars
                .reduce((sum, a) => sum + a.messagesHandled, 0)
                .toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.5s</div>
          </CardContent>
        </Card>
      </div>

      {/* Avatars Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {avatars.map((avatar) => (
          <Card
            key={avatar.id}
            className={`transition-all ${!avatar.isActive ? "opacity-60" : ""}`}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar
                    className={`h-14 w-14 ${getAvatarColor(avatar.name)}`}
                  >
                    <AvatarFallback className="text-white text-lg font-bold">
                      {getInitials(avatar.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {avatar.name}
                      {avatar.isActive ? (
                        <Badge
                          variant="secondary"
                          className="bg-green-500/20 text-green-700"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{avatar.role}</CardDescription>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Personality</span>
                    <p className="font-medium">{avatar.personality}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tone</span>
                    <p className="font-medium">{avatar.tone}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {avatar.channels.map((channel) => (
                      <Badge
                        key={channel}
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        {getChannelIcon(channel)}
                        {channel.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {avatar.messagesHandled.toLocaleString()} messages
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
