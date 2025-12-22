"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, CheckCircle, AlertCircle, User, Bot } from "lucide-react";
import { useCurrentTeam } from "@/features/team/team.context";
import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";
import { AI_SDR_AVATARS_QUERY } from "@/features/sdr/queries/sdr.queries";
import { usePowerDialerContext } from "../power-dialer.context";
import { toast } from "sonner";
import { DialerMode } from "@nextier/common";

export function DialerConfigComponent() {
  const { teamId, isTeamReady } = useCurrentTeam();
  const [aiSdrs = []] = useConnectionQuery(AI_SDR_AVATARS_QUERY, {
    pick: "aiSdrAvatars",
    skip: !isTeamReady,
    variables: { teamId, first: 100 },
  });
  const [{ mode, aiSdrAvatar }, dispatch] = usePowerDialerContext();

  // Early return AFTER all hooks
  if (!isTeamReady) {
    return null;
  }

  const handleModeChange = (mode: DialerMode) => {
    dispatch({ mode });
  };

  const handleAiSdrChange = (aiSdrId: string) => {
    const selected = aiSdrs.find((sdr) => sdr.id === aiSdrId);
    if (!selected) {
      toast.error("not found ai sdr");
    } else {
      dispatch({ aiSdrAvatar: selected });
    }
  };

  const isConfigValid = () => {
    if (mode === DialerMode.AI_SDR && !aiSdrAvatar) {
      return false;
    }
    return true;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Call Mode Configuration
          {isConfigValid() && (
            <CheckCircle className="w-5 h-5 text-green-500" />
          )}
          {!isConfigValid() && (
            <AlertCircle className="w-5 h-5 text-orange-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mode Selection */}
        <div className="space-y-4">
          <label className="text-sm font-medium">Select Call Mode</label>
          <Tabs
            value={mode}
            onValueChange={(value) => handleModeChange(value as DialerMode)}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value={DialerMode.MANUAL} className="gap-2">
                <User className="w-4 h-4" />
                Manual Calls
              </TabsTrigger>
              <TabsTrigger value={DialerMode.AI_SDR} className="gap-2">
                <Bot className="w-4 h-4" />
                AI SDR
              </TabsTrigger>
            </TabsList>

            <TabsContent value={DialerMode.MANUAL} className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Manual Call Mode</h4>
                <p className="text-sm text-muted-foreground">
                  You will handle all calls personally. Calls will be connected
                  directly to you for high-touch, personalized conversations
                  with prospects.
                </p>
                <div className="mt-4 p-3 bg-background border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">You (Current User)</p>
                      <p className="text-sm text-muted-foreground">
                        All calls will be connected to your line
                      </p>
                    </div>
                    <Badge variant="outline">Active</Badge>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value={DialerMode.AI_SDR} className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">AI SDR Mode</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  AI-powered conversations that can qualify prospects, handle
                  objections, and schedule follow-ups automatically while you
                  focus on other tasks.
                </p>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Select AI SDR</label>
                  <Select
                    value={aiSdrAvatar?.id || ""}
                    onValueChange={handleAiSdrChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an AI SDR personality" />
                    </SelectTrigger>
                    <SelectContent>
                      {aiSdrs.map((aiSdr) => (
                        <SelectItem key={aiSdr.id} value={aiSdr.id}>
                          <div className="flex items-center justify-start gap-3">
                            <div className="size-6 bg-primary/10 rounded-full flex items-center justify-center">
                              <Bot className="size-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{aiSdr.name}</p>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {aiSdrAvatar && (
                  <div className="mt-4 p-3 bg-background border rounded-lg space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Bot className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{aiSdrAvatar.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {aiSdrAvatar.description}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">Personality</h5>
                      <p className="text-sm text-muted-foreground">
                        {aiSdrAvatar.personality}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Configuration Status */}
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          {isConfigValid() ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-green-700">
                Configuration Complete - Ready to Dial
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium text-orange-700">
                {mode === DialerMode.AI_SDR
                  ? "Please select an AI SDR to continue"
                  : "Configuration incomplete"}
              </span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
