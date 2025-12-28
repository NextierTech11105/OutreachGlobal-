"use client";

import { cn } from "@/lib/utils";

/**
 * AI PERSONA AVATARS
 * ═══════════════════════════════════════════════════════════════════════════════
 * The three AI workers who power "The Machine"
 *
 * GIANNA - Opener: Sends first message, captures emails
 * CATHY - Nudger: Re-engages leads who go quiet
 * SABRINA - Closer: Books the meetings
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export type PersonaType = "GIANNA" | "CATHY" | "SABRINA";

interface PersonaConfig {
  name: string;
  role: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  initial: string;
  tagline: string;
}

const PERSONAS: Record<PersonaType, PersonaConfig> = {
  GIANNA: {
    name: "GIANNA",
    role: "Opener",
    description: "I send the first message and capture emails",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    borderColor: "border-purple-300 dark:border-purple-700",
    initial: "G",
    tagline: "Let's get you started!",
  },
  CATHY: {
    name: "CATHY",
    role: "Nudger",
    description: "I re-engage leads who go quiet",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    borderColor: "border-blue-300 dark:border-blue-700",
    initial: "C",
    tagline: "I never let a lead slip away.",
  },
  SABRINA: {
    name: "SABRINA",
    role: "Closer",
    description: "I book the meetings",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-300 dark:border-green-700",
    initial: "S",
    tagline: "Let's get you on the calendar.",
  },
};

interface PersonaAvatarProps {
  persona: PersonaType;
  size?: "sm" | "md" | "lg" | "xl";
  showName?: boolean;
  showRole?: boolean;
  showDescription?: boolean;
  animated?: boolean;
  className?: string;
}

export function PersonaAvatar({
  persona,
  size = "md",
  showName = false,
  showRole = false,
  showDescription = false,
  animated = false,
  className,
}: PersonaAvatarProps) {
  const config = PERSONAS[persona];

  const sizeClasses = {
    sm: "h-8 w-8 text-sm",
    md: "h-12 w-12 text-lg",
    lg: "h-16 w-16 text-2xl",
    xl: "h-24 w-24 text-4xl",
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "rounded-full flex items-center justify-center font-bold border-2",
          config.bgColor,
          config.color,
          config.borderColor,
          sizeClasses[size],
          animated && "animate-pulse",
        )}
      >
        {config.initial}
      </div>
      {(showName || showRole || showDescription) && (
        <div className="flex flex-col">
          {showName && (
            <span className={cn("font-bold", config.color)}>{config.name}</span>
          )}
          {showRole && (
            <span className="text-sm text-muted-foreground">{config.role}</span>
          )}
          {showDescription && (
            <span className="text-xs text-muted-foreground">
              {config.description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface PersonaMessageProps {
  persona: PersonaType;
  message: string;
  className?: string;
}

export function PersonaMessage({
  persona,
  message,
  className,
}: PersonaMessageProps) {
  const config = PERSONAS[persona];

  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 rounded-lg border",
        config.bgColor,
        config.borderColor,
        className,
      )}
    >
      <PersonaAvatar persona={persona} size="md" />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("font-bold", config.color)}>{config.name}</span>
          <span className="text-xs text-muted-foreground">({config.role})</span>
        </div>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}

interface PersonaTeamProps {
  className?: string;
}

export function PersonaTeam({ className }: PersonaTeamProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-3", className)}>
      {(Object.keys(PERSONAS) as PersonaType[]).map((persona) => {
        const config = PERSONAS[persona];
        return (
          <div
            key={persona}
            className={cn(
              "p-4 rounded-lg border text-center",
              config.bgColor,
              config.borderColor,
            )}
          >
            <div
              className={cn(
                "mx-auto rounded-full flex items-center justify-center font-bold border-2 h-16 w-16 text-2xl mb-3",
                config.bgColor,
                config.color,
                config.borderColor,
              )}
            >
              {config.initial}
            </div>
            <h3 className={cn("font-bold text-lg", config.color)}>
              {config.name}
            </h3>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {config.role}
            </p>
            <p className="text-xs text-muted-foreground">
              {config.description}
            </p>
            <p className={cn("text-xs mt-2 italic", config.color)}>
              &ldquo;{config.tagline}&rdquo;
            </p>
          </div>
        );
      })}
    </div>
  );
}

export { PERSONAS };
