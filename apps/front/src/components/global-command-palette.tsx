"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Phone,
  Calendar,
  Users,
  Building2,
  Search,
  Home,
  Settings,
  Mail,
  Clock,
  Send,
  PhoneOutgoing,
  CalendarPlus,
  ExternalLink,
  Zap,
  Target,
  FileText,
  BarChart3,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useGlobalActions } from "@/lib/providers/global-actions-provider";
import { Badge } from "@/components/ui/badge";

export function GlobalCommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const {
    pushToSMSCampaign,
    pushToPhoneCenter,
    openCalendar,
    selectedLead,
    teamId
  } = useGlobalActions();

  // Keyboard shortcut - Cmd+K or Ctrl+K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      // Quick actions shortcuts
      if (e.key === "m" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        if (selectedLead) pushToSMSCampaign(selectedLead);
      }
      if (e.key === "p" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        if (selectedLead) pushToPhoneCenter(selectedLead);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [selectedLead, pushToSMSCampaign, pushToPhoneCenter]);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const basePath = teamId ? `/t/${teamId}` : "";

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Quick Actions - Always Available */}
        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() => runCommand(() => {
              if (selectedLead) {
                pushToSMSCampaign(selectedLead);
              } else {
                // Open SMS campaign page
                router.push(`${basePath}/campaigns`);
              }
            })}
          >
            <Send className="mr-2 h-4 w-4 text-blue-500" />
            <span>Push to SMS Campaign Queue</span>
            {selectedLead && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {selectedLead.name || selectedLead.phone}
              </Badge>
            )}
            <CommandShortcut>⇧⌘M</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => {
              if (selectedLead) {
                pushToPhoneCenter(selectedLead);
              } else {
                router.push(`${basePath}/power-dialer`);
              }
            })}
          >
            <PhoneOutgoing className="mr-2 h-4 w-4 text-green-500" />
            <span>Push to Phone Center (Schedule Call)</span>
            {selectedLead && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {selectedLead.name || selectedLead.phone}
              </Badge>
            )}
            <CommandShortcut>⇧⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => openCalendar())}
          >
            <CalendarPlus className="mr-2 h-4 w-4 text-purple-500" />
            <span>Open Calendar</span>
            <CommandShortcut>⇧⌘C</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push(`${basePath}/dashboard`))}>
            <Home className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push(`${basePath}/leads`))}>
            <Users className="mr-2 h-4 w-4" />
            <span>Leads</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push(`${basePath}/properties`))}>
            <Building2 className="mr-2 h-4 w-4" />
            <span>Properties</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push(`${basePath}/campaigns`))}>
            <Target className="mr-2 h-4 w-4" />
            <span>Campaigns</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push(`${basePath}/power-dialer`))}>
            <Phone className="mr-2 h-4 w-4" />
            <span>Power Dialer</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push(`${basePath}/inbox`))}>
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Inbox</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Calendar Integration */}
        <CommandGroup heading="Calendar">
          <CommandItem
            onSelect={() => runCommand(() => {
              window.open("https://calendar.google.com", "_blank");
            })}
          >
            <Calendar className="mr-2 h-4 w-4 text-red-500" />
            <span>Open Google Calendar</span>
            <ExternalLink className="ml-auto h-3 w-3 opacity-50" />
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => {
              // Create a new Google Calendar event
              const now = new Date();
              const later = new Date(now.getTime() + 60 * 60 * 1000);
              const eventTitle = selectedLead
                ? `Call with ${selectedLead.name || 'Lead'}`
                : 'New Event';
              const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${formatGoogleDate(now)}/${formatGoogleDate(later)}`;
              window.open(url, "_blank");
            })}
          >
            <CalendarPlus className="mr-2 h-4 w-4 text-green-500" />
            <span>Create Google Calendar Event</span>
            <ExternalLink className="ml-auto h-3 w-3 opacity-50" />
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Tools */}
        <CommandGroup heading="Tools">
          <CommandItem onSelect={() => runCommand(() => router.push(`${basePath}/skip-trace`))}>
            <Search className="mr-2 h-4 w-4" />
            <span>Skip Trace</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push(`${basePath}/valuation`))}>
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>Property Valuation</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push(`${basePath}/research-library`))}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Research Library</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push(`${basePath}/automations`))}>
            <Zap className="mr-2 h-4 w-4" />
            <span>Automations</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Settings */}
        <CommandGroup heading="Settings">
          <CommandItem onSelect={() => runCommand(() => router.push(`${basePath}/settings`))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Team Settings</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push(`${basePath}/integrations`))}>
            <Mail className="mr-2 h-4 w-4" />
            <span>Integrations</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

// Helper to format date for Google Calendar URL
function formatGoogleDate(date: Date): string {
  return date.toISOString().replace(/-|:|\.\d{3}/g, "");
}
