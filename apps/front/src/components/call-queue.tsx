"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneCall, Clock, User, MoreVertical } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CallQueue() {
  const [activeTab, setActiveTab] = useState("inbound");

  // Mock data for inbound queue
  const inboundCalls = [
    {
      id: "call-1",
      name: "John Smith",
      phone: "(555) 123-4567",
      waitTime: "2:34",
      source: "Website",
      avatar: "/placeholder.svg?key=1",
    },
    {
      id: "call-2",
      name: "Sarah Johnson",
      phone: "(555) 234-5678",
      waitTime: "1:15",
      source: "Campaign",
      avatar: "/placeholder.svg?key=2",
    },
    {
      id: "call-3",
      name: "Michael Chen",
      phone: "(555) 345-6789",
      waitTime: "0:45",
      source: "Referral",
      avatar: "/placeholder.svg?key=3",
    },
  ];

  // Mock data for outbound queue
  const outboundCalls = [
    {
      id: "call-4",
      name: "Emily Davis",
      phone: "(555) 456-7890",
      scheduledTime: "10:30 AM",
      campaign: "Spring Outreach",
      avatar: "/placeholder.svg?key=4",
    },
    {
      id: "call-5",
      name: "Robert Wilson",
      phone: "(555) 567-8901",
      scheduledTime: "11:15 AM",
      campaign: "Follow-up",
      avatar: "/placeholder.svg?key=5",
    },
    {
      id: "call-6",
      name: "Jennifer Martinez",
      phone: "(555) 678-9012",
      scheduledTime: "1:45 PM",
      campaign: "New Listings",
      avatar: "/placeholder.svg?key=6",
    },
    {
      id: "call-7",
      name: "David Thompson",
      phone: "(555) 789-0123",
      scheduledTime: "2:30 PM",
      campaign: "Spring Outreach",
      avatar: "/placeholder.svg?key=7",
    },
    {
      id: "call-8",
      name: "Lisa Brown",
      phone: "(555) 890-1234",
      scheduledTime: "3:15 PM",
      campaign: "Follow-up",
      avatar: "/placeholder.svg?key=8",
    },
  ];

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
