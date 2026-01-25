"use client";

import { forwardRef } from "react";
import { useQuery, gql, TypedDocumentNode } from "@apollo/client";
import { useCurrentTeam } from "@/features/team/team.context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bot, Sparkles, Calendar } from "lucide-react";

// Default AI SDRs - GIANNA (opener), CATHY (nurture), SABRINA (closer)
const DEFAULT_AI_SDRS = [
  {
    id: "gianna",
    name: "GIANNA",
    role: "Opener",
    description: "Cold outreach specialist - First contact & qualification",
    color: "bg-blue-500",
    icon: Bot,
  },
  {
    id: "cathy",
    name: "CATHY",
    role: "Nurture",
    description: "Relationship builder - Follow-up & objection handling",
    color: "bg-purple-500",
    icon: Sparkles,
  },
  {
    id: "sabrina",
    name: "SABRINA",
    role: "Closer",
    description: "High-intent closer - Meeting booking & scheduling",
    color: "bg-green-500",
    icon: Calendar,
  },
];

interface AiSdrAvatarsQuery {
  aiSdrAvatars: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  }[];
}

const AI_SDR_AVATARS_QUERY: TypedDocumentNode<AiSdrAvatarsQuery> = gql`
  query AiSdrAvatars($teamId: ID!) {
    aiSdrAvatars(teamId: $teamId) {
      id
      name
      avatarUrl
    }
  }
`;

// Response handling modes
const RESPONSE_MODES = [
  {
    id: "auto",
    name: "Auto Respond",
    description: "AI responds automatically with 5 min delay",
    badge: "Hands-off",
  },
  {
    id: "assisted",
    name: "AI Assisted",
    description: "AI drafts response, you approve before sending",
    badge: "Review First",
  },
  {
    id: "manual",
    name: "Manual Only",
    description: "All responses require human action",
    badge: "Full Control",
  },
];

// Human oversight levels
const OVERSIGHT_LEVELS = [
  {
    id: "minimal",
    name: "Minimal",
    description: "Only flag high-risk or angry responses",
    threshold: 30,
  },
  {
    id: "moderate",
    name: "Moderate",
    description: "Review objections and uncertain classifications",
    threshold: 70,
  },
  {
    id: "strict",
    name: "Strict",
    description: "Review all AI-generated responses",
    threshold: 100,
  },
];

interface AiSdrSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  responseMode?: string;
  onResponseModeChange?: (value: string) => void;
  oversightLevel?: string;
  onOversightLevelChange?: (value: string) => void;
}

export const AiSdrSelector = forwardRef<HTMLButtonElement, AiSdrSelectorProps>(
  ({
    value,
    onChange,
    responseMode = "auto",
    onResponseModeChange,
    oversightLevel = "moderate",
    onOversightLevelChange,
  }, ref) => {
    const { teamId, isTeamReady } = useCurrentTeam();
    const { data, loading } = useQuery(AI_SDR_AVATARS_QUERY, {
      variables: { teamId },
      skip: !isTeamReady,
    });

    // Use database avatars if available, otherwise use defaults
    const dbAvatars = data?.aiSdrAvatars || [];
    const useDefaults = dbAvatars.length === 0;

    const selectedSdr = DEFAULT_AI_SDRS.find((sdr) => sdr.id === value);
    const selectedMode = RESPONSE_MODES.find((m) => m.id === responseMode);
    const selectedOversight = OVERSIGHT_LEVELS.find((o) => o.id === oversightLevel);

    return (
      <div className="space-y-6">
        {/* AI SDR Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">AI SDR Assistant</Label>
            {selectedSdr && (
              <Badge variant="outline" className={`${selectedSdr.color} text-white border-0`}>
                {selectedSdr.role}
              </Badge>
            )}
          </div>

          {useDefaults ? (
            <div className="grid gap-3">
              {DEFAULT_AI_SDRS.map((sdr) => {
                const isSelected = value === sdr.id;
                const Icon = sdr.icon;
                return (
                  <button
                    key={sdr.id}
                    type="button"
                    onClick={() => onChange?.(sdr.id)}
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <div className={`p-2 rounded-full ${sdr.color}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{sdr.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {sdr.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {sdr.description}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <Select value={value} onValueChange={onChange}>
              <SelectTrigger ref={ref}>
                <SelectValue placeholder="Select an AI SDR" />
              </SelectTrigger>
              <SelectContent>
                {loading ? (
                  <SelectItem value="__loading__" disabled>
                    Loading...
                  </SelectItem>
                ) : (
                  dbAvatars.map((avatar) => (
                    <SelectItem key={avatar.id} value={avatar.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={avatar.avatarUrl || undefined} />
                          <AvatarFallback>
                            {avatar.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{avatar.name}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Response Mode Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Response Mode</Label>
            {selectedMode && (
              <Badge variant="outline">{selectedMode.badge}</Badge>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {RESPONSE_MODES.map((mode) => {
              const isSelected = responseMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onResponseModeChange?.(mode.id)}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50"
                  }`}
                >
                  <div className="font-medium text-sm">{mode.name}</div>
                  <div className="text-xs text-muted-foreground mt-1 hidden sm:block">
                    {mode.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Human Oversight Level */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Human Oversight</Label>
            {selectedOversight && (
              <Badge variant="outline">
                {selectedOversight.threshold}% review threshold
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {OVERSIGHT_LEVELS.map((level) => {
              const isSelected = oversightLevel === level.id;
              return (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => onOversightLevelChange?.(level.id)}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50"
                  }`}
                >
                  <div className="font-medium text-sm">{level.name}</div>
                  <div className="text-xs text-muted-foreground mt-1 hidden sm:block">
                    {level.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        {selectedSdr && (
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <strong>{selectedSdr.name}</strong> will handle this campaign.{" "}
            {responseMode === "auto" && "Responses sent automatically after 5 min delay."}
            {responseMode === "assisted" && "AI drafts responses for your approval."}
            {responseMode === "manual" && "All responses require your action."}
            {" "}
            {oversightLevel === "minimal" && "Only high-risk messages flagged for review."}
            {oversightLevel === "moderate" && "Objections and uncertain messages queued for review."}
            {oversightLevel === "strict" && "All AI responses require approval before sending."}
          </div>
        )}
      </div>
    );
  },
);

AiSdrSelector.displayName = "AiSdrSelector";
