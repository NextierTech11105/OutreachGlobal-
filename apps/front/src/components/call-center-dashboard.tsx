"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Users } from "lucide-react";
import { PowerDialer } from "./power-dialer";
import { ContactsList } from "./contacts-list";
import { useRouter } from "next/navigation";
import { ConferenceManager } from "./conference-manager";

export function CallCenterDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialer, setShowDialer] = useState(false);
  const [showConference, setShowConference] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [selectedContacts, setSelectedContacts] = useState<any[]>([]);
  const router = useRouter();

  // Remove the direct use of useCallState
  // const { activateCall, isCallActive } = useCallState()

  // Instead, create local state to track call status
  const [isCallActive, setIsCallActive] = useState(false);

  // Handle the conference call button in the header
  useEffect(() => {
    const conferenceBtn = document.getElementById("conference-call-btn");
    if (conferenceBtn) {
      conferenceBtn.addEventListener("click", () => {
        setShowConference(true);
      });
    }

    return () => {
      if (conferenceBtn) {
        conferenceBtn.removeEventListener("click", () => {
          setShowConference(true);
        });
      }
    };
  }, []);

  const handleStartCall = (contact: any) => {
    // Instead of using the call state provider directly
    // activateCall(contact.phone, contact.name, {
    //   company: contact.company,
    //   position: contact.position,
    //   location: contact.location,
    //   source: contact.source,
    //   status: contact.status,
    // })

    // Use a custom function to handle call activation
    setSelectedContact(contact);
    setShowDialer(true);
    setIsCallActive(true);

    // If you need to use the CallStateProvider functionality,
    // you can dispatch a custom event that will be caught by CallStateBridge
    const callEvent = new CustomEvent("nextier:startCall", {
      detail: {
        phoneNumber: contact.phone,
        contactName: contact.name,
        contactInfo: {
          company: contact.company,
          position: contact.position,
          location: contact.location,
          source: contact.source,
          status: contact.status,
        },
      },
    });
    document.dispatchEvent(callEvent);
  };

  const handleCloseDialer = () => {
    setShowDialer(false);
    setSelectedContact(null);
    setIsCallActive(false);
  };

  const handleCallComplete = (duration: number, notes: string) => {
    console.log("Call completed", { duration, notes });
    // In a real app, save this data to the database
    setIsCallActive(false);
  };

  const handleStartConference = (contacts: any[]) => {
    setSelectedContacts(contacts);
    setShowConference(true);
  };

  const handleCloseConference = () => {
    setShowConference(false);
    setSelectedContacts([]);
  };

  const handleNewCall = () => {
    // Start a new call with no pre-selected contact
    // Instead of using activateCall directly
    // activateCall("", "New Call")

    // Use the custom event approach
    const callEvent = new CustomEvent("nextier:startCall", {
      detail: {
        phoneNumber: "",
        contactName: "New Call",
      },
    });
    document.dispatchEvent(callEvent);

    setIsCallActive(true);
  };

  return (
    <div className="space-y-4">
      {showDialer && !isCallActive ? (
        <PowerDialer
          leadName={selectedContact?.name}
          leadPhone={selectedContact?.phone}
          leadCompany={selectedContact?.company}
          leadPosition={selectedContact?.position}
          leadLocation={selectedContact?.location}
          leadSource={selectedContact?.source}
          leadStatus={selectedContact?.status}
          onCallComplete={handleCallComplete}
          onClose={handleCloseDialer}
        />
      ) : showConference ? (
        <ConferenceManager
          initialParticipants={selectedContacts.map((contact) => contact.phone)}
          onClose={handleCloseConference}
          isDemo={true}
        />
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search contacts..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowConference(true)}>
                <Users className="h-4 w-4 mr-2" />
                Conference Call
              </Button>
              <Button onClick={handleNewCall}>
                <Plus className="h-4 w-4 mr-2" />
                New Call
              </Button>
            </div>
          </div>

          <ContactsList
            onStartCall={handleStartCall}
            onStartConference={handleStartConference}
            searchQuery={searchQuery}
          />
        </div>
      )}
    </div>
  );
}
