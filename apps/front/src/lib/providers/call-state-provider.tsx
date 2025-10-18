"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

interface ContactInfo {
  company?: string;
  position?: string;
  location?: string;
  source?: string;
  status?: string;
  campaignId?: string;
}

interface CallState {
  isCallActive: boolean;
  isCallMinimized: boolean;
  isMuted: boolean;
  phoneNumber: string;
  contactName: string;
  contactInfo?: ContactInfo;
  startTime: Date | null;
  activateCall: (
    phoneNumber: string,
    contactName?: string,
    contactInfo?: ContactInfo,
  ) => void;
  minimizeCall: () => void;
  maximizeCall: () => void;
  toggleMute: () => void;
  endCall: () => void;
}

const CallStateContext = createContext<CallState | undefined>(undefined);

export function CallStateProvider({ children }: { children: ReactNode }) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactInfo, setContactInfo] = useState<ContactInfo | undefined>(
    undefined,
  );
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Load call state from localStorage on mount
  useEffect(() => {
    const savedCallState = localStorage.getItem("callState");
    if (savedCallState) {
      try {
        const parsedState = JSON.parse(savedCallState);
        setIsCallActive(parsedState.isCallActive);
        setIsCallMinimized(parsedState.isCallMinimized);
        setIsMuted(parsedState.isMuted || false);
        setPhoneNumber(parsedState.phoneNumber);
        setContactName(parsedState.contactName);
        setContactInfo(parsedState.contactInfo);
        if (parsedState.startTime) {
          setStartTime(new Date(parsedState.startTime));
        }
      } catch (error) {
        console.error("Error parsing saved call state:", error);
        localStorage.removeItem("callState");
      }
    }
  }, []);

  // Save call state to localStorage when it changes
  useEffect(() => {
    if (isCallActive) {
      localStorage.setItem(
        "callState",
        JSON.stringify({
          isCallActive,
          isCallMinimized,
          isMuted,
          phoneNumber,
          contactName,
          contactInfo,
          startTime: startTime?.toISOString(),
        }),
      );
    } else {
      localStorage.removeItem("callState");
    }
  }, [
    isCallActive,
    isCallMinimized,
    isMuted,
    phoneNumber,
    contactName,
    contactInfo,
    startTime,
  ]);

  const activateCall = (number: string, name?: string, info?: ContactInfo) => {
    setPhoneNumber(number);
    setContactName(name || "");
    setContactInfo(info);
    setStartTime(new Date());
    setIsCallActive(true);
    setIsCallMinimized(false);
    setIsMuted(false);
  };

  const minimizeCall = () => {
    setIsCallMinimized(true);
  };

  const maximizeCall = () => {
    setIsCallMinimized(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const endCall = () => {
    setIsCallActive(false);
    setIsCallMinimized(false);
    setIsMuted(false);
    setPhoneNumber("");
    setContactName("");
    setContactInfo(undefined);
    setStartTime(null);
  };

  return (
    <CallStateContext.Provider
      value={{
        isCallActive,
        isCallMinimized,
        isMuted,
        phoneNumber,
        contactName,
        contactInfo,
        startTime,
        activateCall,
        minimizeCall,
        maximizeCall,
        toggleMute,
        endCall,
      }}
    >
      {children}
    </CallStateContext.Provider>
  );
}

export function useCallState() {
  const context = useContext(CallStateContext);
  if (context === undefined) {
    throw new Error("useCallState must be used within a CallStateProvider");
  }
  return context;
}
