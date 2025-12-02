"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Mail,
  Linkedin,
  Building2,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  Zap,
  TrendingUp,
  Users,
  DollarSign,
  Briefcase,
  MessageSquare,
  Copy,
  Check,
} from "lucide-react";

// Per playbook: Apollo Lead Card with data lineage tags, activity, and playbook snippets
export interface ApolloLeadData {
  id: string;
  // Contact info
  name: string;
  firstName?: string;
  lastName?: string;
  title: string;
  email?: string;
  emailStatus?: "verified" | "guessed" | "unavailable";
  phone?: string;
  linkedinUrl?: string;
  photoUrl?: string;
  // Company info
  company: string;
  companyDomain?: string;
  companyLogo?: string;
  industry?: string;
  employeeRange?: string;
  revenueRange?: string;
  location?: string;
  // Apollo signals & lineage
  source: "apollo_firmo" | "apollo_intent" | "manual" | "enriched";
  signals: string[]; // e.g., "hiring surge", "funding", "news"
  intentScore?: number;
  lastUpdated?: string;
  confidence?: number; // 0-100
  // Activity tracking
  lastActivity?: {
    type: "email" | "linkedin" | "call" | "meeting";
    date: string;
    note?: string;
  };
  // Playbook
  recommendedAction?: string;
  talkingPoints?: string[];
  painFlags?: string[]; // e.g., "recruiting pressure", "cash flow issues"
}

interface ApolloLeadCardProps {
  lead: ApolloLeadData;
  onCall?: (lead: ApolloLeadData) => void;
  onEmail?: (lead: ApolloLeadData) => void;
  onLinkedIn?: (lead: ApolloLeadData) => void;
  onAddToSequence?: (lead: ApolloLeadData) => void;
  compact?: boolean;
}

// Source badge styling
const sourceStyles = {
  apollo_firmo: { label: "Apollo Firmo", className: "bg-purple-600 text-white" },
  apollo_intent: { label: "Apollo Intent", className: "bg-orange-500 text-white" },
  manual: { label: "Manual", className: "bg-zinc-600 text-white" },
  enriched: { label: "Enriched", className: "bg-cyan-600 text-white" },
};

// Email status indicators
const emailStatusStyles = {
  verified: { icon: Check, className: "text-green-500" },
  guessed: { icon: Clock, className: "text-yellow-500" },
  unavailable: { icon: null, className: "text-red-500" },
};

export function ApolloLeadCard({
  lead,
  onCall,
  onEmail,
  onLinkedIn,
  onAddToSequence,
  compact = false,
}: ApolloLeadCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const sourceInfo = sourceStyles[lead.source];
  const emailStatus = lead.emailStatus ? emailStatusStyles[lead.emailStatus] : null;

  return (
    <Card className="bg-zinc-900 border-zinc-800 hover:border-purple-600/50 transition-all">
      <CardContent className={compact ? "p-3" : "p-4"}>
        <div className="flex gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {lead.photoUrl ? (
              <img
                src={lead.photoUrl}
                alt={lead.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-zinc-700"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">
                {lead.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header Row */}
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-white font-semibold text-lg">{lead.name}</h3>
                <p className="text-zinc-400 text-sm flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {lead.title}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {lead.intentScore && (
                  <div className="flex items-center gap-1 text-orange-400">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm font-medium">{lead.intentScore}</span>
                  </div>
                )}
                <Badge className={sourceInfo.className}>{sourceInfo.label}</Badge>
              </div>
            </div>

            {/* Company Row */}
            <div className="flex items-center gap-3 mb-3 text-sm">
              {lead.companyLogo ? (
                <img src={lead.companyLogo} alt={lead.company} className="h-5 w-5 rounded" />
              ) : (
                <Building2 className="h-4 w-4 text-zinc-500" />
              )}
              <span className="text-white font-medium">{lead.company}</span>
              {lead.industry && (
                <span className="text-zinc-500">• {lead.industry}</span>
              )}
              {lead.location && (
                <span className="text-zinc-500 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {lead.location}
                </span>
              )}
            </div>

            {/* Company Metrics */}
            <div className="flex flex-wrap gap-2 mb-3">
              {lead.employeeRange && (
                <Badge variant="outline" className="border-blue-600 text-blue-400">
                  <Users className="h-3 w-3 mr-1" />
                  {lead.employeeRange}
                </Badge>
              )}
              {lead.revenueRange && (
                <Badge variant="outline" className="border-green-600 text-green-400">
                  <DollarSign className="h-3 w-3 mr-1" />
                  {lead.revenueRange}
                </Badge>
              )}
              {/* Apollo Signals */}
              {lead.signals.map((signal, i) => (
                <Badge key={i} variant="outline" className="border-purple-600 text-purple-400">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {signal}
                </Badge>
              ))}
            </div>

            {/* Pain Flags (from playbook) */}
            {lead.painFlags && lead.painFlags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {lead.painFlags.map((flag, i) => (
                  <Badge key={i} className="bg-red-900/50 text-red-400 border border-red-800">
                    {flag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Contact Info */}
            <div className="flex items-center gap-4 mb-3 text-sm">
              {lead.email && (
                <button
                  onClick={() => copyToClipboard(lead.email!, "email")}
                  className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
                >
                  <Mail className="h-3 w-3" />
                  <span className="truncate max-w-[200px]">{lead.email}</span>
                  {emailStatus?.icon && <emailStatus.icon className={`h-3 w-3 ${emailStatus.className}`} />}
                  {copied === "email" && <Check className="h-3 w-3 text-green-500" />}
                </button>
              )}
              {lead.phone && (
                <button
                  onClick={() => copyToClipboard(lead.phone!, "phone")}
                  className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
                >
                  <Phone className="h-3 w-3" />
                  {lead.phone}
                  {copied === "phone" && <Check className="h-3 w-3 text-green-500" />}
                </button>
              )}
            </div>

            {/* Last Activity */}
            {lead.lastActivity && (
              <div className="text-xs text-zinc-500 mb-3 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last {lead.lastActivity.type}: {new Date(lead.lastActivity.date).toLocaleDateString()}
                {lead.lastActivity.note && ` - "${lead.lastActivity.note}"`}
              </div>
            )}

            {/* Expandable Playbook Section */}
            {(lead.recommendedAction || lead.talkingPoints?.length) && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className="text-purple-400 hover:text-purple-300 p-0 h-auto mb-2"
                >
                  {expanded ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                  Playbook Snippet
                </Button>

                {expanded && (
                  <div className="bg-zinc-800/50 rounded-lg p-3 mb-3 border border-zinc-700">
                    {lead.recommendedAction && (
                      <div className="mb-2">
                        <span className="text-xs text-zinc-500 uppercase tracking-wide">Recommended Action</span>
                        <p className="text-amber-400 font-medium">{lead.recommendedAction}</p>
                      </div>
                    )}
                    {lead.talkingPoints && lead.talkingPoints.length > 0 && (
                      <div>
                        <span className="text-xs text-zinc-500 uppercase tracking-wide">Talking Points</span>
                        <ul className="list-disc list-inside text-zinc-300 text-sm space-y-1 mt-1">
                          {lead.talkingPoints.map((point, i) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {lead.phone && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onCall?.(lead);
                    window.open(`tel:${lead.phone}`);
                  }}
                  className="border-green-600 text-green-400 hover:bg-green-600/20"
                >
                  <Phone className="h-3 w-3 mr-1" />
                  Call
                </Button>
              )}
              {lead.email && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onEmail?.(lead);
                    window.open(`mailto:${lead.email}`);
                  }}
                  className="border-blue-600 text-blue-400 hover:bg-blue-600/20"
                >
                  <Mail className="h-3 w-3 mr-1" />
                  Email
                </Button>
              )}
              {lead.linkedinUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onLinkedIn?.(lead);
                    window.open(lead.linkedinUrl, "_blank");
                  }}
                  className="border-cyan-600 text-cyan-400 hover:bg-cyan-600/20"
                >
                  <Linkedin className="h-3 w-3 mr-1" />
                  LinkedIn
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => onAddToSequence?.(lead)}
                className="bg-purple-600 hover:bg-purple-700 ml-auto"
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Add to Sequence
              </Button>
            </div>

            {/* Data Freshness Indicator */}
            {lead.lastUpdated && (
              <div className="mt-3 flex items-center gap-2 text-xs text-zinc-600">
                <span>Apollo data from {new Date(lead.lastUpdated).toLocaleDateString()}</span>
                {lead.confidence && (
                  <span className="text-purple-500">• {lead.confidence}% confidence</span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact list version for tables
export function ApolloLeadRow({ lead, onSelect }: { lead: ApolloLeadData; onSelect?: () => void }) {
  return (
    <tr
      onClick={onSelect}
      className="hover:bg-zinc-800/50 cursor-pointer border-b border-zinc-800"
    >
      <td className="p-3">
        <div className="flex items-center gap-3">
          {lead.photoUrl ? (
            <img src={lead.photoUrl} alt={lead.name} className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-medium">
              {lead.name.charAt(0)}
            </div>
          )}
          <div>
            <div className="text-white font-medium">{lead.name}</div>
            <div className="text-zinc-500 text-xs">{lead.title}</div>
          </div>
        </div>
      </td>
      <td className="p-3 text-zinc-400">{lead.company}</td>
      <td className="p-3">
        <div className="flex gap-1">
          {lead.signals.slice(0, 2).map((s, i) => (
            <Badge key={i} variant="outline" className="border-purple-600 text-purple-400 text-xs">
              {s}
            </Badge>
          ))}
        </div>
      </td>
      <td className="p-3 text-zinc-400">{lead.location}</td>
      <td className="p-3">
        <Badge className={sourceStyles[lead.source].className}>
          {sourceStyles[lead.source].label}
        </Badge>
      </td>
    </tr>
  );
}
