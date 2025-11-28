"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { Device, Call } from "@twilio/voice-sdk";
import { useCurrentTeam } from "@/features/team/team.context";
import { $http } from "@/lib/http";
import { toast } from "sonner";
import { CheckIcon } from "lucide-react";

export const TwilioTestVoice = () => {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("idle");
  const [status, setStatus] = useState("idle");
  const [device, setDevice] = useState<Device | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const { team } = useCurrentTeam();

  const createToken = async () => {
    setLoading(true);

    try {
      const { data } = await $http.post(`/voice/${team.id}/token`, {});
      setToken(data.token);
    } catch (error) {
      toast.error("failed to create token");
    } finally {
      setLoading(false);
    }
  };

  const initDevice = () => {
    if (!token) {
      return toast.error("token is required");
    }

    if (!device) {
      const newDevice = new Device(token, {
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
      });

      setDevice(newDevice);
    } else {
      toast.error("device is already initialized");
    }
  };

  const hangUp = () => {
    if (activeCall) {
      activeCall.disconnect();
    }
  };

  const startCall = async () => {
    if (!device) {
      return toast.error("no device");
    }

    if (!phone) {
      return toast.error("phone number is required");
    }

    setLoading(true);

    setMessage("Connecting Call...");
    try {
      const call = await device.connect({
        params: { To: phone },
      });

      call.on("accept", () => {
        setMessage("Call accepted");
      });
      call.on("cancel", () => {
        setMessage("Call Cancelled");
      });

      call.on("disconnect", () => {
        setMessage("Call Disconnected");
      });

      call.on("error", (error) => {
        console.error("Call error:", error);
        toast.error("Call error: " + error.message);
      });

      setActiveCall(call);
    } catch (error) {
      toast.error("failed to connect call");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (device) {
      console.log("registering device events");
      device.on("registered", () => {
        console.log("READY");
        setMessage("Device Registered");
      });
      device.on("ready", () => {
        console.log("READY");
        setMessage("Device Ready - Click to Call");
        setStatus("ready");
      });
      device.register();

      device.on("error", (error) => {
        console.log(error);
        setMessage(`device error: ${error.message}`);
      });

      device.on("connect", (call: Call) => {
        setActiveCall(call);
        setMessage("Call connected, you can now talk!");
      });

      device.on("disconnect", () => {
        setMessage("call ended, disconnected");
        setStatus("ready");
        setActiveCall(null);
      });
      console.log(device);

      return () => {
        console.log("destroying device");
        device.destroy();
      };
    }
  }, [device]);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(() => {
        console.log("Microphone permission granted");
      })
      .catch((error) => {
        console.error("Microphone permission denied:", error);
        setMessage("Microphone permission is required for calls");
      });
  }, []);

  return (
    <Card className="max-w-lg">
      <CardHeader className="flex justify-between items-center">
        <CardTitle>Test Voice</CardTitle>

        <Button
          variant="outline"
          onClick={createToken}
          disabled={token !== null}
          loading={loading}
        >
          {!token ? (
            "Create Token"
          ) : (
            <>
              <CheckIcon />
              Token Ready
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <Input
            id="phone"
            onChange={(e) => setPhone(e.target.value)}
            placeholder="phone number"
            value={phone}
          />
        </div>

        <div>
          <span className="text-sm">{message}</span>
        </div>
      </CardContent>
      <CardFooter className="flex items-center">
        {!device ? (
          <Button onClick={initDevice} disabled={!token}>
            Initialize Device
          </Button>
        ) : (
          <Button
            disabled={activeCall !== null}
            loading={loading}
            onClick={startCall}
          >
            Start Calling {device.state}
          </Button>
        )}

        {!!activeCall && (
          <Button variant="destructive" onClick={hangUp}>
            Hangup
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
