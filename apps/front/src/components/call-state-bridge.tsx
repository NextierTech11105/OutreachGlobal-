"use client";

import { useEffect } from "react";
import { useCallState } from "@/lib/providers/call-state-provider";

// This component bridges the call state to custom events
// so it can be accessed from anywhere in the application
export function CallStateBridge() {
  const callState = useCallState();

  useEffect(() => {
    // Make the call state available globally
    // This is a workaround to allow components that aren't in the React tree
    // to access the call state
    window.callState = callState;

    // Listen for custom call events
    const handleStartCall = (event: CustomEvent) => {
      const { phoneNumber, contactName, contactInfo } = event.detail;
      console.log("Starting call to:", phoneNumber, contactName, contactInfo);
      callState.activateCall(phoneNumber, contactName, contactInfo);
    };

    const handleEndCall = () => {
      callState.endCall();
    };

    // Add event listeners
    document.addEventListener(
      "nextier:startCall",
      handleStartCall as EventListener,
    );
    document.addEventListener("nextier:endCall", handleEndCall);

    // Clean up
    return () => {
      delete window.callState;
      document.removeEventListener(
        "nextier:startCall",
        handleStartCall as EventListener,
      );
      document.removeEventListener("nextier:endCall", handleEndCall);
    };
  }, [callState]);

  return null;
}
