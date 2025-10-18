"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Plus,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  UserPlus,
  UserMinus,
  RepeatIcon as Record,
  StopCircle,
  Headphones,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { twilioService } from "@/lib/services/twilio-service";

interface ConferenceManagerProps {
  initialParticipants?: string[];
  onClose?: () => void;
  isDemo?: boolean;
}

interface Participant {
  id: string;
  name: string;
  phone: string;
  status: "connecting" | "connected" | "onHold" | "muted" | "left";
  role: "participant" | "moderator" | "monitor" | "coach";
  avatar: string;
}

export function ConferenceManager({
  initialParticipants = [],
  onClose,
  isDemo = true,
}: ConferenceManagerProps) {
  const [conferenceName, setConferenceName] = useState(
    `Conference-${Date.now()}`,
  );
  const [conferenceStatus, setConferenceStatus] = useState<
    "setup" | "active" | "ended"
  >("setup");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newParticipantPhone, setNewParticipantPhone] = useState("");
  const [newParticipantName, setNewParticipantName] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [announceOnJoin, setAnnounceOnJoin] = useState(true);
  const [activeTab, setActiveTab] = useState("participants");
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(
    null,
  );
  const [transferType, setTransferType] = useState<"warm" | "cold">("warm");
  const [userRole, setUserRole] = useState<"moderator" | "coach" | "monitor">(
    "moderator",
  );
  const { toast } = useToast();

  // Initialize with current user as moderator
  useEffect(() => {
    if (conferenceStatus === "setup") {
      setParticipants([
        {
          id: "user-1",
          name: "You (Agent)",
          phone: "(555) 987-6543",
          status: "connected",
          role: "moderator",
          avatar: "/placeholder.svg?height=40&width=40",
        },
      ]);

      // Add initial participants if provided
      if (initialParticipants.length > 0) {
        const initialParticipantObjects = initialParticipants.map(
          (phone, index) => ({
            id: `participant-${index + 1}`,
            name: `Participant ${index + 1}`,
            phone,
            status: "connected" as const,
            role: "participant" as const,
            avatar: `/placeholder.svg?height=40&width=40&query=person${index + 1}`,
          }),
        );

        setParticipants((prev) => [...prev, ...initialParticipantObjects]);
      }
    }
  }, [conferenceStatus, initialParticipants]);

  // Start the conference
  const startConference = () => {
    if (isDemo) {
      setConferenceStatus("active");
      toast({
        title: "Conference Started",
        description: "Demo conference has been initiated",
      });
      return;
    }

    // In a real implementation, this would call the Twilio API to create a conference
    twilioService
      .createConference(conferenceName, announceOnJoin)
      .then(() => {
        setConferenceStatus("active");
        toast({
          title: "Conference Started",
          description: "Conference has been initiated",
        });
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: "Failed to start conference",
          variant: "destructive",
        });
        console.error("Error starting conference:", error);
      });
  };

  // End the conference
  const endConference = () => {
    if (isDemo) {
      setConferenceStatus("ended");
      toast({
        title: "Conference Ended",
        description: "Demo conference has been terminated",
      });
      if (onClose) onClose();
      return;
    }

    // In a real implementation, this would call the Twilio API to end the conference
    twilioService
      .endConference(conferenceName)
      .then(() => {
        setConferenceStatus("ended");
        toast({
          title: "Conference Ended",
          description: "Conference has been terminated",
        });
        if (onClose) onClose();
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: "Failed to end conference",
          variant: "destructive",
        });
        console.error("Error ending conference:", error);
      });
  };

  // Add a participant to the conference
  const addParticipant = () => {
    if (!newParticipantPhone) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    const newParticipant: Participant = {
      id: `participant-${participants.length}`,
      name: newParticipantName || `Participant ${participants.length}`,
      phone: newParticipantPhone,
      status: "connecting",
      role: "participant",
      avatar: `/placeholder.svg?height=40&width=40&query=person${participants.length}`,
    };

    setParticipants((prev) => [...prev, newParticipant]);
    setNewParticipantPhone("");
    setNewParticipantName("");

    if (isDemo) {
      // Simulate connecting
      setTimeout(() => {
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === newParticipant.id ? { ...p, status: "connected" } : p,
          ),
        );

        if (announceOnJoin) {
          toast({
            title: "Participant Joined",
            description: `${newParticipant.name} has joined the conference`,
          });
        }
      }, 2000);
      return;
    }

    // In a real implementation, this would call the Twilio API to add a participant
    twilioService
      .addParticipantToConference(conferenceName, newParticipantPhone)
      .then(() => {
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === newParticipant.id ? { ...p, status: "connected" } : p,
          ),
        );

        if (announceOnJoin) {
          toast({
            title: "Participant Joined",
            description: `${newParticipant.name} has joined the conference`,
          });
        }
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: "Failed to add participant",
          variant: "destructive",
        });
        console.error("Error adding participant:", error);

        // Update participant status to show error
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === newParticipant.id ? { ...p, status: "left" } : p,
          ),
        );
      });
  };

  // Toggle recording
  const toggleRecording = () => {
    if (isDemo) {
      setIsRecording(!isRecording);
      toast({
        title: isRecording ? "Recording Stopped" : "Recording Started",
        description: isRecording
          ? "Conference recording has been stopped"
          : "Conference is now being recorded",
      });
      return;
    }

    // In a real implementation, this would call the Twilio API to start/stop recording
    if (isRecording) {
      twilioService
        .stopConferenceRecording(conferenceName)
        .then(() => {
          setIsRecording(false);
          toast({
            title: "Recording Stopped",
            description: "Conference recording has been stopped",
          });
        })
        .catch((error) => {
          toast({
            title: "Error",
            description: "Failed to stop recording",
            variant: "destructive",
          });
          console.error("Error stopping recording:", error);
        });
    } else {
      twilioService
        .startConferenceRecording(conferenceName)
        .then(() => {
          setIsRecording(true);
          toast({
            title: "Recording Started",
            description: "Conference is now being recorded",
          });
        })
        .catch((error) => {
          toast({
            title: "Error",
            description: "Failed to start recording",
            variant: "destructive",
          });
          console.error("Error starting recording:", error);
        });
    }
  };

  // Mute/unmute a participant
  const toggleMuteParticipant = (participantId: string) => {
    const participant = participants.find((p) => p.id === participantId);
    if (!participant) return;

    const isMuted = participant.status === "muted";

    if (isDemo) {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === participantId
            ? { ...p, status: isMuted ? "connected" : "muted" }
            : p,
        ),
      );

      toast({
        title: isMuted ? "Participant Unmuted" : "Participant Muted",
        description: `${participant.name} has been ${isMuted ? "unmuted" : "muted"}`,
      });
      return;
    }

    // In a real implementation, this would call the Twilio API to mute/unmute
    twilioService
      .muteParticipant(conferenceName, participant.phone, !isMuted)
      .then(() => {
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === participantId
              ? { ...p, status: isMuted ? "connected" : "muted" }
              : p,
          ),
        );

        toast({
          title: isMuted ? "Participant Unmuted" : "Participant Muted",
          description: `${participant.name} has been ${isMuted ? "unmuted" : "muted"}`,
        });
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: `Failed to ${isMuted ? "unmute" : "mute"} participant`,
          variant: "destructive",
        });
        console.error(
          `Error ${isMuted ? "unmuting" : "muting"} participant:`,
          error,
        );
      });
  };

  // Hold/unhold a participant
  const toggleHoldParticipant = (participantId: string) => {
    const participant = participants.find((p) => p.id === participantId);
    if (!participant) return;

    const isOnHold = participant.status === "onHold";

    if (isDemo) {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === participantId
            ? { ...p, status: isOnHold ? "connected" : "onHold" }
            : p,
        ),
      );

      toast({
        title: isOnHold ? "Participant Resumed" : "Participant On Hold",
        description: `${participant.name} has been ${isOnHold ? "taken off hold" : "placed on hold"}`,
      });
      return;
    }

    // In a real implementation, this would call the Twilio API to hold/unhold
    twilioService
      .holdParticipant(conferenceName, participant.phone, !isOnHold)
      .then(() => {
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === participantId
              ? { ...p, status: isOnHold ? "connected" : "onHold" }
              : p,
          ),
        );

        toast({
          title: isOnHold ? "Participant Resumed" : "Participant On Hold",
          description: `${participant.name} has been ${isOnHold ? "taken off hold" : "placed on hold"}`,
        });
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: `Failed to ${isOnHold ? "resume" : "hold"} participant`,
          variant: "destructive",
        });
        console.error(
          `Error ${isOnHold ? "resuming" : "holding"} participant:`,
          error,
        );
      });
  };

  // Remove a participant
  const removeParticipant = (participantId: string) => {
    const participant = participants.find((p) => p.id === participantId);
    if (!participant) return;

    if (isDemo) {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === participantId ? { ...p, status: "left" } : p,
        ),
      );

      toast({
        title: "Participant Removed",
        description: `${participant.name} has been removed from the conference`,
      });
      return;
    }

    // In a real implementation, this would call the Twilio API to remove a participant
    twilioService
      .removeParticipant(conferenceName, participant.phone)
      .then(() => {
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === participantId ? { ...p, status: "left" } : p,
          ),
        );

        toast({
          title: "Participant Removed",
          description: `${participant.name} has been removed from the conference`,
        });
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: "Failed to remove participant",
          variant: "destructive",
        });
        console.error("Error removing participant:", error);
      });
  };

  // Change participant role
  const changeParticipantRole = (
    participantId: string,
    role: Participant["role"],
  ) => {
    const participant = participants.find((p) => p.id === participantId);
    if (!participant) return;

    if (isDemo) {
      setParticipants((prev) =>
        prev.map((p) => (p.id === participantId ? { ...p, role } : p)),
      );

      toast({
        title: "Role Changed",
        description: `${participant.name} is now a ${role}`,
      });
      return;
    }

    // In a real implementation, this would call the Twilio API to change role
    twilioService
      .changeParticipantRole(conferenceName, participant.phone, role)
      .then(() => {
        setParticipants((prev) =>
          prev.map((p) => (p.id === participantId ? { ...p, role } : p)),
        );

        toast({
          title: "Role Changed",
          description: `${participant.name} is now a ${role}`,
        });
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: "Failed to change participant role",
          variant: "destructive",
        });
        console.error("Error changing participant role:", error);
      });
  };

  // Initiate a transfer
  const initiateTransfer = () => {
    if (!selectedParticipant || !newParticipantPhone) {
      toast({
        title: "Error",
        description: "Please select a participant and enter a transfer number",
        variant: "destructive",
      });
      return;
    }

    const participant = participants.find((p) => p.id === selectedParticipant);
    if (!participant) return;

    const newParticipantObj: Participant = {
      id: `transfer-${participants.length}`,
      name: newParticipantName || `Transfer ${participants.length}`,
      phone: newParticipantPhone,
      status: "connecting",
      role: "participant",
      avatar: `/placeholder.svg?height=40&width=40&query=person${participants.length}`,
    };

    setParticipants((prev) => [...prev, newParticipantObj]);
    setNewParticipantPhone("");
    setNewParticipantName("");

    if (isDemo) {
      // Simulate connecting
      setTimeout(() => {
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === newParticipantObj.id ? { ...p, status: "connected" } : p,
          ),
        );

        toast({
          title: "Transfer Connected",
          description: `${newParticipantObj.name} has joined the conference`,
        });

        // For cold transfer, remove the agent immediately
        if (transferType === "cold") {
          setParticipants((prev) =>
            prev.map((p) => (p.id === "user-1" ? { ...p, status: "left" } : p)),
          );

          toast({
            title: "Cold Transfer Complete",
            description: "You have left the conference",
          });
        }
      }, 2000);
      return;
    }

    // In a real implementation, this would call the Twilio API to add a participant for transfer
    twilioService
      .addParticipantToConference(conferenceName, newParticipantPhone)
      .then(() => {
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === newParticipantObj.id ? { ...p, status: "connected" } : p,
          ),
        );

        toast({
          title: "Transfer Connected",
          description: `${newParticipantObj.name} has joined the conference`,
        });

        // For cold transfer, remove the agent immediately
        if (transferType === "cold") {
          twilioService.removeParticipant(conferenceName, "user-1").then(() => {
            setParticipants((prev) =>
              prev.map((p) =>
                p.id === "user-1" ? { ...p, status: "left" } : p,
              ),
            );

            toast({
              title: "Cold Transfer Complete",
              description: "You have left the conference",
            });
          });
        }
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: "Failed to connect transfer",
          variant: "destructive",
        });
        console.error("Error connecting transfer:", error);

        // Update participant status to show error
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === newParticipantObj.id ? { ...p, status: "left" } : p,
          ),
        );
      });
  };

  // Complete a warm transfer (agent leaves)
  const completeWarmTransfer = () => {
    if (isDemo) {
      setParticipants((prev) =>
        prev.map((p) => (p.id === "user-1" ? { ...p, status: "left" } : p)),
      );

      toast({
        title: "Warm Transfer Complete",
        description: "You have left the conference",
      });
      return;
    }

    // In a real implementation, this would call the Twilio API to remove the agent
    twilioService
      .removeParticipant(conferenceName, "user-1")
      .then(() => {
        setParticipants((prev) =>
          prev.map((p) => (p.id === "user-1" ? { ...p, status: "left" } : p)),
        );

        toast({
          title: "Warm Transfer Complete",
          description: "You have left the conference",
        });
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: "Failed to complete transfer",
          variant: "destructive",
        });
        console.error("Error completing transfer:", error);
      });
  };

  // Send an announcement to a participant
  const sendAnnouncement = (participantId: string, message: string) => {
    const participant = participants.find((p) => p.id === participantId);
    if (!participant) return;

    if (isDemo) {
      toast({
        title: "Announcement Sent",
        description: `Announcement sent to ${participant.name}`,
      });
      return;
    }

    // In a real implementation, this would call the Twilio API to send an announcement
    twilioService
      .sendAnnouncementToParticipant(conferenceName, participant.phone, message)
      .then(() => {
        toast({
          title: "Announcement Sent",
          description: `Announcement sent to ${participant.name}`,
        });
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: "Failed to send announcement",
          variant: "destructive",
        });
        console.error("Error sending announcement:", error);
      });
  };

  // Whisper to a participant (coach mode)
  const whisperToParticipant = (participantId: string) => {
    const participant = participants.find((p) => p.id === participantId);
    if (!participant) return;

    if (isDemo) {
      // Change user role to coach
      setUserRole("coach");
      setParticipants((prev) =>
        prev.map((p) => (p.id === "user-1" ? { ...p, role: "coach" } : p)),
      );

      toast({
        title: "Coach Mode Activated",
        description: `You can now whisper to ${participant.name}`,
      });
      return;
    }

    // In a real implementation, this would call the Twilio API to enable whisper mode
    twilioService
      .enableCoachMode(conferenceName, participant.phone)
      .then(() => {
        // Change user role to coach
        setUserRole("coach");
        setParticipants((prev) =>
          prev.map((p) => (p.id === "user-1" ? { ...p, role: "coach" } : p)),
        );

        toast({
          title: "Coach Mode Activated",
          description: `You can now whisper to ${participant.name}`,
        });
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: "Failed to activate coach mode",
          variant: "destructive",
        });
        console.error("Error activating coach mode:", error);
      });
  };

  // Monitor the conference (listen only)
  const monitorConference = () => {
    if (isDemo) {
      // Change user role to monitor
      setUserRole("monitor");
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === "user-1" ? { ...p, role: "monitor", status: "muted" } : p,
        ),
      );

      toast({
        title: "Monitor Mode Activated",
        description: "You are now monitoring the conference",
      });
      return;
    }

    // In a real implementation, this would call the Twilio API to enable monitor mode
    twilioService
      .enableMonitorMode(conferenceName)
      .then(() => {
        // Change user role to monitor
        setUserRole("monitor");
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === "user-1" ? { ...p, role: "monitor", status: "muted" } : p,
          ),
        );

        toast({
          title: "Monitor Mode Activated",
          description: "You are now monitoring the conference",
        });
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: "Failed to activate monitor mode",
          variant: "destructive",
        });
        console.error("Error activating monitor mode:", error);
      });
  };

  // Return to moderator role
  const returnToModeratorRole = () => {
    if (isDemo) {
      // Change user role back to moderator
      setUserRole("moderator");
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === "user-1"
            ? { ...p, role: "moderator", status: "connected" }
            : p,
        ),
      );

      toast({
        title: "Moderator Mode Activated",
        description: "You are now a moderator in the conference",
      });
      return;
    }

    // In a real implementation, this would call the Twilio API to return to moderator role
    twilioService
      .changeParticipantRole(conferenceName, "user-1", "moderator")
      .then(() => {
        // Change user role back to moderator
        setUserRole("moderator");
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === "user-1"
              ? { ...p, role: "moderator", status: "connected" }
              : p,
          ),
        );

        toast({
          title: "Moderator Mode Activated",
          description: "You are now a moderator in the conference",
        });
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: "Failed to return to moderator role",
          variant: "destructive",
        });
        console.error("Error returning to moderator role:", error);
      });
  };

  // Get status badge color
  const getStatusBadgeColor = (status: Participant["status"]) => {
    switch (status) {
      case "connected":
        return "bg-green-100 text-green-800 border-green-200";
      case "connecting":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "onHold":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "muted":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "left":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get role badge color
  const getRoleBadgeColor = (role: Participant["role"]) => {
    switch (role) {
      case "moderator":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "coach":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "monitor":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {conferenceStatus === "setup"
            ? "Set Up Conference Call"
            : conferenceStatus === "active"
              ? "Active Conference Call"
              : "Conference Ended"}
        </CardTitle>
        <CardDescription>
          {conferenceStatus === "setup"
            ? "Configure your conference settings"
            : conferenceStatus === "active"
              ? "Manage participants and conference features"
              : "The conference has ended"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {conferenceStatus === "setup" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="conferenceName">Conference Name</Label>
              <Input
                id="conferenceName"
                value={conferenceName}
                onChange={(e) => setConferenceName(e.target.value)}
                placeholder="Enter conference name"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="announceOnJoin"
                checked={announceOnJoin}
                onCheckedChange={setAnnounceOnJoin}
              />
              <Label htmlFor="announceOnJoin">
                Play sound when participants join
              </Label>
            </div>

            <div className="pt-4">
              <Button onClick={startConference} className="w-full">
                <Users className="mr-2 h-4 w-4" />
                Start Conference
              </Button>
            </div>
          </div>
        ) : conferenceStatus === "active" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Conference ID</h3>
                <p className="text-sm text-muted-foreground">
                  {conferenceName}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant={isRecording ? "destructive" : "outline-solid"}
                  size="sm"
                  onClick={toggleRecording}
                >
                  {isRecording ? (
                    <>
                      <StopCircle className="mr-2 h-4 w-4" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Record className="mr-2 h-4 w-4" />
                      Record
                    </>
                  )}
                </Button>
                <Button variant="destructive" size="sm" onClick={endConference}>
                  End Conference
                </Button>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="participants">Participants</TabsTrigger>
                <TabsTrigger value="transfer">Transfer</TabsTrigger>
                <TabsTrigger value="coaching">Coaching</TabsTrigger>
              </TabsList>

              <TabsContent value="participants" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <div className="flex items-end space-x-2">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="newParticipantPhone">
                        Add Participant
                      </Label>
                      <Input
                        id="newParticipantPhone"
                        value={newParticipantPhone}
                        onChange={(e) => setNewParticipantPhone(e.target.value)}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="newParticipantName">
                        Name (Optional)
                      </Label>
                      <Input
                        id="newParticipantName"
                        value={newParticipantName}
                        onChange={(e) => setNewParticipantName(e.target.value)}
                        placeholder="Enter name"
                      />
                    </div>
                    <Button onClick={addParticipant} className="mb-0.5">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="border rounded-md">
                  <ScrollArea className="h-[300px]">
                    <div className="p-4 space-y-4">
                      {participants.map((participant) => (
                        <div
                          key={participant.id}
                          className={`p-3 border rounded-md ${participant.status === "left" ? "opacity-60" : ""}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar>
                                <AvatarImage
                                  src={participant.avatar || "/placeholder.svg"}
                                  alt={participant.name}
                                />
                                <AvatarFallback>
                                  {participant.name[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {participant.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {participant.phone}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant="outline"
                                className={getStatusBadgeColor(
                                  participant.status,
                                )}
                              >
                                {participant.status === "connected"
                                  ? "Connected"
                                  : participant.status === "connecting"
                                    ? "Connecting"
                                    : participant.status === "onHold"
                                      ? "On Hold"
                                      : participant.status === "muted"
                                        ? "Muted"
                                        : "Left"}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={getRoleBadgeColor(participant.role)}
                              >
                                {participant.role}
                              </Badge>
                            </div>
                          </div>

                          {participant.status !== "left" &&
                            participant.id !== "user-1" && (
                              <div className="mt-3 flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    toggleMuteParticipant(participant.id)
                                  }
                                >
                                  {participant.status === "muted" ? (
                                    <>
                                      <Mic className="mr-1 h-3 w-3" />
                                      Unmute
                                    </>
                                  ) : (
                                    <>
                                      <MicOff className="mr-1 h-3 w-3" />
                                      Mute
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    toggleHoldParticipant(participant.id)
                                  }
                                >
                                  {participant.status === "onHold" ? (
                                    <>
                                      <Volume2 className="mr-1 h-3 w-3" />
                                      Resume
                                    </>
                                  ) : (
                                    <>
                                      <VolumeX className="mr-1 h-3 w-3" />
                                      Hold
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    sendAnnouncement(
                                      participant.id,
                                      "This is an important announcement",
                                    )
                                  }
                                >
                                  <AlertCircle className="mr-1 h-3 w-3" />
                                  Announce
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    removeParticipant(participant.id)
                                  }
                                >
                                  <UserMinus className="mr-1 h-3 w-3" />
                                  Remove
                                </Button>
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="transfer" className="space-y-4 pt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Transfer Type</Label>
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="warmTransfer"
                          name="transferType"
                          checked={transferType === "warm"}
                          onChange={() => setTransferType("warm")}
                        />
                        <Label htmlFor="warmTransfer">
                          Warm Transfer (Stay on call)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="coldTransfer"
                          name="transferType"
                          checked={transferType === "cold"}
                          onChange={() => setTransferType("cold")}
                        />
                        <Label htmlFor="coldTransfer">
                          Cold Transfer (Drop off immediately)
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transferParticipant">
                      Select Participant to Transfer
                    </Label>
                    <Select
                      value={selectedParticipant || ""}
                      onValueChange={setSelectedParticipant}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select participant" />
                      </SelectTrigger>
                      <SelectContent>
                        {participants
                          .filter(
                            (p) => p.status !== "left" && p.id !== "user-1",
                          )
                          .map((participant) => (
                            <SelectItem
                              key={participant.id}
                              value={participant.id}
                            >
                              {participant.name} ({participant.phone})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transferToPhone">Transfer To</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="transferToPhone"
                        value={newParticipantPhone}
                        onChange={(e) => setNewParticipantPhone(e.target.value)}
                        placeholder="Enter phone number"
                      />
                      <Input
                        id="transferToName"
                        value={newParticipantName}
                        onChange={(e) => setNewParticipantName(e.target.value)}
                        placeholder="Name (optional)"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={initiateTransfer}
                    disabled={!selectedParticipant || !newParticipantPhone}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Initiate Transfer
                  </Button>

                  {transferType === "warm" && (
                    <div className="pt-4">
                      <Separator className="my-4" />
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">
                          Complete Warm Transfer
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Once you've introduced the new participant, you can
                          complete the transfer by leaving the call.
                        </p>
                        <Button
                          variant="outline"
                          onClick={completeWarmTransfer}
                        >
                          Complete Transfer & Leave
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="coaching" className="space-y-4 pt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">
                      Coaching & Monitoring
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Choose your role in the conference. As a monitor, you can
                      listen silently. As a coach, you can whisper to specific
                      participants.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <Card
                      className={`cursor-pointer border-2 ${userRole === "moderator" ? "border-primary" : "border-transparent"}`}
                      onClick={returnToModeratorRole}
                    >
                      <CardContent className="p-4 text-center">
                        <Users className="h-8 w-8 mx-auto mb-2" />
                        <h3 className="font-medium">Moderator</h3>
                        <p className="text-xs text-muted-foreground">
                          Full participation
                        </p>
                      </CardContent>
                    </Card>

                    <Card
                      className={`cursor-pointer border-2 ${userRole === "coach" ? "border-primary" : "border-transparent"}`}
                    >
                      <CardContent className="p-4 text-center">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                        <h3 className="font-medium">Coach</h3>
                        <p className="text-xs text-muted-foreground">
                          Whisper to participants
                        </p>
                      </CardContent>
                    </Card>

                    <Card
                      className={`cursor-pointer border-2 ${userRole === "monitor" ? "border-primary" : "border-transparent"}`}
                      onClick={monitorConference}
                    >
                      <CardContent className="p-4 text-center">
                        <Headphones className="h-8 w-8 mx-auto mb-2" />
                        <h3 className="font-medium">Monitor</h3>
                        <p className="text-xs text-muted-foreground">
                          Listen only
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {userRole === "coach" && (
                    <div className="space-y-2 pt-4">
                      <Label htmlFor="coachTarget">
                        Select Participant to Coach
                      </Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select participant to whisper to" />
                        </SelectTrigger>
                        <SelectContent>
                          {participants
                            .filter(
                              (p) => p.status !== "left" && p.id !== "user-1",
                            )
                            .map((participant) => (
                              <SelectItem
                                key={participant.id}
                                value={participant.id}
                              >
                                {participant.name} ({participant.phone})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>

                      <div className="pt-2">
                        <Button
                          onClick={() =>
                            whisperToParticipant(participants[1]?.id || "")
                          }
                        >
                          Start Coaching
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-8">
            <h3 className="text-lg font-medium">Conference has ended</h3>
            <p className="text-muted-foreground mt-2">
              The conference call has been terminated
            </p>
            <Button onClick={onClose} className="mt-4">
              Close
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
