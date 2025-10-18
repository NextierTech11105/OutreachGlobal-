"use client";

import { useState } from "react";
import { Search, ArrowLeftRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Agent {
  id: string;
  name: string;
  department: string;
  status: "available" | "on-call" | "offline";
  avatar: string;
}

interface CallTransferProps {
  onTransfer: (agentId: string) => void;
  onCancel: () => void;
  isTransferring?: boolean;
  className?: string;
}

export function CallTransfer({
  onTransfer,
  onCancel,
  isTransferring = false,
  className,
}: CallTransferProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // Mock agents data - in a real app, this would come from an API
  const agents: Agent[] = [
    {
      id: "agent-1",
      name: "Sarah Johnson",
      department: "Sales",
      status: "available",
      avatar: "/stylized-letters-sj.png",
    },
    {
      id: "agent-2",
      name: "Michael Chen",
      department: "Customer Support",
      status: "available",
      avatar: "/microphone-concert-stage.png",
    },
    {
      id: "agent-3",
      name: "Jessica Williams",
      department: "Sales",
      status: "on-call",
      avatar: "/intertwined-letters.png",
    },
    {
      id: "agent-4",
      name: "David Rodriguez",
      department: "Technical Support",
      status: "available",
      avatar: "/abstract-geometric-DR.png",
    },
    {
      id: "agent-5",
      name: "Emily Taylor",
      department: "Customer Success",
      status: "offline",
      avatar: "/et-phone-home.png",
    },
    {
      id: "agent-6",
      name: "James Wilson",
      department: "Sales",
      status: "available",
      avatar: "/intertwined-letters.png",
    },
    {
      id: "agent-7",
      name: "Sophia Garcia",
      department: "Technical Support",
      status: "on-call",
      avatar: "/abstract-geometric-sg.png",
    },
    {
      id: "agent-8",
      name: "Daniel Martinez",
      department: "Customer Success",
      status: "available",
      avatar: "/direct-message-interface.png",
    },
    {
      id: "agent-9",
      name: "Olivia Brown",
      department: "Sales",
      status: "offline",
      avatar: "/abstract-geometric-ob.png",
    },
    {
      id: "agent-10",
      name: "William Lee",
      department: "Technical Support",
      status: "available",
      avatar: "/abstract-geometric-WL.png",
    },
  ];

  // Filter agents based on search query
  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.department.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Handle transfer confirmation
  const handleTransfer = () => {
    if (selectedAgent) {
      onTransfer(selectedAgent);
    }
  };

  const handleTransferSelect = (option: Agent) => {
    setSelectedAgent(option.id);
    onTransfer(option.id);
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-1">Transfer Call</h3>
        <p className="text-sm text-muted-foreground">
          Select an agent to transfer this call to
        </p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search agents or departments..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-medium mb-2">Transfer To</h3>
        <ScrollArea className="h-[200px] rounded-md border p-2">
          <div className="space-y-2">
            {filteredAgents.map((option) => (
              <div
                key={option.id}
                className={cn(
                  "flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer",
                  selectedAgent === option.id && "bg-muted",
                )}
                onClick={() => setSelectedAgent(option.id)}
              >
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarImage
                      src={option.avatar || "/placeholder.svg"}
                      alt={option.name}
                    />
                    <AvatarFallback>{option.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{option.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {option.department}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    option.status === "available"
                      ? "default"
                      : option.status === "on-call"
                        ? "secondary"
                        : "outline-solid"
                  }
                  className="text-xs"
                >
                  {option.status}
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex justify-between mt-4 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isTransferring}>
          Cancel
        </Button>
        <Button
          onClick={handleTransfer}
          disabled={!selectedAgent || isTransferring}
          className={
            selectedAgent ? "bg-blue-600 hover:bg-blue-700" : undefined
          }
        >
          {isTransferring ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Transferring...
            </>
          ) : (
            <>
              <ArrowLeftRight className="mr-2 h-4 w-4" /> Transfer Call
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
