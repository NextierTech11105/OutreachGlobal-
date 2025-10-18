declare global {
  interface Window {
    callState?: {
      isCallActive: boolean;
      isCallMinimized: boolean;
      isMuted: boolean;
      phoneNumber: string;
      contactName: string;
      contactInfo?: {
        company?: string;
        position?: string;
        location?: string;
        source?: string;
        status?: string;
        campaignId?: string;
      };
      startTime: Date | null;
      activateCall: (
        phoneNumber: string,
        contactName?: string,
        contactInfo?: any,
      ) => void;
      minimizeCall: () => void;
      maximizeCall: () => void;
      toggleMute: () => void;
      endCall: () => void;
    };
  }
}
