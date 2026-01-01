"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  GitBranch,
  Play,
  Pause,
  Copy,
  Trash2,
  MoreVertical,
  Calendar,
  MessageSquare,
  Zap,
  Bell,
  Clock,
  CheckCircle2,
  Users,
  TrendingUp,
} from "lucide-react";
import { SequenceDesigner } from "@/components/sequence-designer";
import {
  SEQUENCE_PRESETS,
  WORKER_META,
} from "@/lib/templates/nextier-defaults";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Mock sequences data
const MOCK_SEQUENCES = [
  {
    id: "seq-1",
    name: "CRM Consultant Opener",
    description: "Standard opener for management consulting sector",
    status: "active",
    steps: 10,
    totalDays: 10,
    leadsEnrolled: 1245,
    responseRate: 18.5,
    worker: "gianna" as const,
    createdAt: new Date("2025-12-15"),
  },
  {
    id: "seq-2",
    name: "Business Broker Trades",
    description: "Exit strategy outreach for plumbing/HVAC owners",
    status: "active",
    steps: 9,
    totalDays: 8,
    leadsEnrolled: 856,
    responseRate: 22.3,
    worker: "gianna" as const,
    createdAt: new Date("2025-12-18"),
  },
  {
    id: "seq-3",
    name: "Real Estate Agent",
    description: "Lead gen outreach for real estate agents",
    status: "paused",
    steps: 11,
    totalDays: 12,
    leadsEnrolled: 432,
    responseRate: 15.8,
    worker: "gianna" as const,
    createdAt: new Date("2025-12-20"),
  },
  {
    id: "seq-4",
    name: "CATHY Retarget - Week 2",
    description: "Nudge sequence for unresponsive leads",
    status: "active",
    steps: 6,
    totalDays: 5,
    leadsEnrolled: 678,
    responseRate: 12.4,
    worker: "cathy" as const,
    createdAt: new Date("2025-12-22"),
  },
];

const WORKER_CONFIG = {
  gianna: {
    name: "GIANNA",
    icon: Zap,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  cathy: {
    name: "CATHY",
    icon: Bell,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
  sabrina: {
    name: "SABRINA",
    icon: Calendar,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
};

export default function SequencesPage() {
  const [showDesigner, setShowDesigner] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState<
    (typeof MOCK_SEQUENCES)[0] | null
  >(null);
  const [sequences, setSequences] = useState(MOCK_SEQUENCES);

  const handleNewSequence = () => {
    setSelectedSequence(null);
    setShowDesigner(true);
  };

  const handleEditSequence = (sequence: (typeof MOCK_SEQUENCES)[0]) => {
    setSelectedSequence(sequence);
    setShowDesigner(true);
  };

  const handleToggleStatus = (sequenceId: string) => {
    setSequences((prev) =>
      prev.map((s) =>
        s.id === sequenceId
          ? { ...s, status: s.status === "active" ? "paused" : "active" }
          : s,
      ),
    );
  };

  const handleDuplicate = (sequence: (typeof MOCK_SEQUENCES)[0]) => {
    const newSequence = {
      ...sequence,
      id: `seq-${Date.now()}`,
      name: `${sequence.name} (Copy)`,
      status: "paused" as const,
      leadsEnrolled: 0,
      createdAt: new Date(),
    };
    setSequences((prev) => [...prev, newSequence]);
  };

  // Stats
  const totalActive = sequences.filter((s) => s.status === "active").length;
  const totalLeads = sequences.reduce((acc, s) => acc + s.leadsEnrolled, 0);
  const avgResponseRate =
    sequences.reduce((acc, s) => acc + s.responseRate, 0) / sequences.length;

  if (showDesigner) {
    return (
      <div className="h-full">
        <div className="border-b px-6 py-3 flex items-center justify-between bg-background">
          <Button variant="ghost" onClick={() => setShowDesigner(false)}>
            ← Back to Sequences
          </Button>
        </div>
        <SequenceDesigner
          sequenceId={selectedSequence?.id}
          onSave={(steps) => {
            console.log("Saved steps:", steps);
            setShowDesigner(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-purple-500" />
            Sequence Designer
          </h1>
          <p className="text-muted-foreground mt-1">
            Build N8N-style automated outreach sequences with If/Then logic
          </p>
        </div>
        <Button onClick={handleNewSequence}>
          <Plus className="h-4 w-4 mr-2" />
          New Sequence
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalActive}</p>
                <p className="text-sm text-muted-foreground">
                  Active Sequences
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {totalLeads.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Leads Enrolled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-100">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {avgResponseRate.toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">
                  Avg Response Rate
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-100">
                <MessageSquare className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {sequences.reduce((acc, s) => acc + s.steps, 0)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total Touchpoints
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Quick Start Presets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {SEQUENCE_PRESETS.map((preset) => (
              <Card
                key={preset.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setSelectedSequence(null);
                  setShowDesigner(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{preset.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {preset.description}
                      </p>
                    </div>
                    <Badge variant="outline">{preset.vertical}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      {preset.steps.length} steps
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {preset.totalDays} days
                    </span>
                    <Badge className="bg-green-100 text-green-700 text-[10px]">
                      {preset.complianceScore}% compliant
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sequences List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Your Sequences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sequences.map((sequence) => {
              const workerConfig = WORKER_CONFIG[sequence.worker];
              return (
                <Card
                  key={sequence.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleEditSequence(sequence)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={cn("p-2 rounded-lg", workerConfig.bgColor)}
                        >
                          <workerConfig.icon
                            className={cn("h-5 w-5", workerConfig.color)}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{sequence.name}</h4>
                            <Badge
                              variant={
                                sequence.status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                              className={cn(
                                sequence.status === "active"
                                  ? "bg-green-500"
                                  : "bg-gray-400",
                              )}
                            >
                              {sequence.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {sequence.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {sequence.leadsEnrolled.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            enrolled
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-600">
                            {sequence.responseRate}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            response
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <GitBranch className="h-3 w-3" />
                            {sequence.steps}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {sequence.totalDays}d
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(sequence.id);
                            }}
                          >
                            {sequence.status === "active" ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEditSequence(sequence)}
                              >
                                <GitBranch className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDuplicate(sequence)}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
