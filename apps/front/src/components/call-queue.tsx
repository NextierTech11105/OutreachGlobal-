"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Phone,
  PhoneCall,
  Clock,
  User,
  MoreVertical,
  Loader2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CallQueueItem {
  id: string;
  name: string;
  phone: string;
  waitTime?: string;
  scheduledTime?: string;
  source?: string;
  campaign?: string;
  avatar?: string;
}

export function CallQueue() {
  const [activeTab, setActiveTab] = useState("inbound");
  const [inboundCalls, setInboundCalls] = useState<CallQueueItem[]>([]);
  const [outboundCalls, setOutboundCalls] = useState<CallQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCallQueues() {
      setLoading(true);
      try {
        // Fetch inbound calls from leads with recent inbound messages
        const inboundRes = await fetch("/api/leads?status=inbound&limit=10");
        if (inboundRes.ok) {
          const data = await inboundRes.json();
          setInboundCalls(
            (data.leads || []).map((lead: any) => ({
              id: lead.id,
              name: lead.name || lead.firstName || "Unknown",
              phone: lead.phone || lead.mobilePhone || "",
              waitTime: getWaitTime(lead.lastContactedAt),
              source: lead.source || "Direct",
              avatar: lead.avatarUrl,
            })),
          );
        }

        // Fetch outbound calls from scheduled campaigns
        const outboundRes = await fetch(
          "/api/call-center/queue?type=outbound&limit=10",
        );
        if (outboundRes.ok) {
          const data = await outboundRes.json();
          setOutboundCalls(
            (data.queue || []).map((item: any) => ({
              id: item.id,
              name: item.leadName || item.name || "Unknown",
              phone: item.phone || "",
              scheduledTime: formatTime(item.scheduledAt),
              campaign: item.campaignName || "Outreach",
              avatar: item.avatarUrl,
            })),
          );
        }
      } catch (error) {
        console.error("Failed to fetch call queues:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchCallQueues();
  }, []);

  function getWaitTime(timestamp: string | null): string {
    if (!timestamp) return "0:00";
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function formatTime(timestamp: string | null): string {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Call Queue</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs
          defaultValue="inbound"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="inbound">
                Inbound
                <Badge variant="secondary" className="ml-2">
                  {inboundCalls.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="outbound">
                Outbound
                <Badge variant="secondary" className="ml-2">
                  {outboundCalls.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="inbound" className="mt-0">
            <div className="px-6 py-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium">Inbound Queue</h3>
                <Button variant="outline" size="sm">
                  Manage Queue
                </Button>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {inboundCalls.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <PhoneCall className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No calls in queue</p>
                    </div>
                  ) : (
                    inboundCalls.map((call) => (
                      <div
                        key={call.id}
                        className="flex items-center justify-between p-3 rounded-md border"
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={call.avatar || "/placeholder.svg"}
                              alt={call.name}
                            />
                            <AvatarFallback>
                              {call.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{call.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {call.phone}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex flex-col items-end">
                            <div className="flex items-center">
                              <Clock className="h-3.5 w-3.5 mr-1 text-amber-500" />
                              <span className="text-sm font-medium">
                                {call.waitTime}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {call.source}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="outbound" className="mt-0">
            <div className="px-6 py-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium">Outbound Queue</h3>
                <Button variant="outline" size="sm">
                  Schedule Call
                </Button>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {outboundCalls.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <User className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">
                        No scheduled calls
                      </p>
                    </div>
                  ) : (
                    outboundCalls.map((call) => (
                      <div
                        key={call.id}
                        className="flex items-center justify-between p-3 rounded-md border"
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={call.avatar || "/placeholder.svg"}
                              alt={call.name}
                            />
                            <AvatarFallback>
                              {call.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{call.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {call.phone}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex flex-col items-end">
                            <div className="flex items-center">
                              <Clock className="h-3.5 w-3.5 mr-1 text-blue-500" />
                              <span className="text-sm font-medium">
                                {call.scheduledTime}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {call.campaign}
                            </span>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Phone className="h-4 w-4 mr-2" />
                                Call Now
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Clock className="h-4 w-4 mr-2" />
                                Reschedule
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <User className="h-4 w-4 mr-2" />
                                View Contact
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
