"use client";

import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, PhoneOff, UserPlus } from "lucide-react";

interface CallControlsProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onHangup: () => void;
  onTransferCall?: () => void;
  onBargeIn?: () => void;
  disabled?: boolean;
}

export function CallControls({
  isMuted,
  onToggleMute,
  onHangup,
  onTransferCall,
  onBargeIn,
  disabled = false,
}: CallControlsProps) {
  return (
    <div className="flex justify-center space-x-3">
      <Button
        variant="outline"
        size="icon"
        onClick={onToggleMute}
        disabled={disabled}
        className={isMuted ? "bg-red-100" : ""}
      >
        {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>

      {onTransferCall && (
        <Button
          variant="outline"
          size="icon"
          onClick={onTransferCall}
          disabled={disabled}
        >
          <UserPlus className="h-4 w-4" />
        </Button>
      )}

      {onBargeIn && (
        <Button
          variant="outline"
          size="icon"
          onClick={onBargeIn}
          disabled={disabled}
        >
          <Volume2 className="h-4 w-4" />
        </Button>
      )}

      <Button
        variant="destructive"
        size="icon"
        onClick={onHangup}
        disabled={disabled}
      >
        <PhoneOff className="h-4 w-4" />
      </Button>
    </div>
  );
}
