"use client";

import { sf, sfd } from "@/lib/utils/safe-format";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  UserSearch,
  Building2,
  Phone,
  Mail,
  MessageSquare,
  Zap,
  Play,
  Eye,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Database,
  FileSpreadsheet,
} from "lucide-react";

interface ActionBarProps {
  // Selection context
  selectedCount?: number;
  selectedIds?: string[];
  selectedItems?: any[];

  // What type of data is selected
  dataType?: "property" | "business" | "lead" | "contact";

  // Callbacks for each action
  onSkipTrace?: (ids: string[]) => Promise<any>;
  onPropertyDetail?: (ids: string[]) => Promise<any>;
  onApolloEnrich?: (ids: string[]) => Promise<any>;
  onDatalakeEnrich?: (ids: string[]) => Promise<any>;
  onPushToSMS?: (ids: string[]) => Promise<any>;
  onPushToEmail?: (ids: string[]) => Promise<any>;
  onPushToDialer?: (ids: string[]) => Promise<any>;

  // Custom actions
  customActions?: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    color: string;
    onClick: (ids: string[]) => Promise<any>;
    requiresSelection?: boolean;
  }>;
}

interface BatchInfo {
  batchSize: number;
  maxAllowed: number;
  totalBatches: number;
  willProcess: number;
  perBatchLabel: string;
  maxLabel: string;
}

interface ActionState {
  action: string;
  stage: "prep" | "preview" | "executing" | "done" | "error";
  preview?: {
    count: number;
    estimatedCost?: number;
    estimatedTime?: string;
    warnings?: string[];
    batchInfo?: BatchInfo | null;
  };
  progress?: number;
  result?: any;
  error?: string;
}

export function ActionBar({
  selectedCount = 0,
  selectedIds = [],
  selectedItems = [],
  dataType = "property",
  onSkipTrace,
  onPropertyDetail,
  onApolloEnrich,
  onDatalakeEnrich,
  onPushToSMS,
  onPushToEmail,
  onPushToDialer,
  customActions = [],
}: ActionBarProps) {
  const [actionState, setActionState] = useState<ActionState | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const hasSelection = selectedCount > 0;

  // Calculate batch info
  const getBatchInfo = (action: string, count: number) => {
    const isEnrichment = [
      "Skip Trace",
      "Property Detail",
      "Apollo Enrich",
    ].includes(action);
    const isCampaign = ["Push to SMS", "Power Dialer"].includes(action);

    if (isEnrichment) {
      const effectiveCount = Math.min(count, LIMITS.ENRICHMENT_MAX);
      const batches = Math.ceil(effectiveCount / LIMITS.ENRICHMENT_BATCH);
      return {
        batchSize: LIMITS.ENRICHMENT_BATCH,
        maxAllowed: LIMITS.ENRICHMENT_MAX,
        totalBatches: batches,
        willProcess: effectiveCount,
        perBatchLabel: "250/batch",
        maxLabel: "5,000/day max",
      };
    }

    if (isCampaign) {
      const effectiveCount = Math.min(count, LIMITS.CAMPAIGN_MAX);
      return {
        batchSize: LIMITS.CAMPAIGN_MAX,
        maxAllowed: LIMITS.CAMPAIGN_MAX,
        totalBatches: 1,
        willProcess: effectiveCount,
        perBatchLabel: "2,000 max",
        maxLabel: "2,000/push",
      };
    }

    return null;
  };

  // Start an action - show preview first
  const startAction = async (
    actionName: string,
    handler?: (ids: string[]) => Promise<any>,
  ) => {
    if (!handler) return;

    const batchInfo = getBatchInfo(actionName, selectedCount);

    setActionState({
      action: actionName,
      stage: "preview",
      preview: {
        count: selectedCount,
        estimatedCost: calculateCost(
          actionName,
          batchInfo?.willProcess || selectedCount,
        ),
        estimatedTime: estimateTime(
          actionName,
          batchInfo?.willProcess || selectedCount,
        ),
        warnings: getWarnings(actionName, selectedCount),
        batchInfo,
      },
    });
    setIsDialogOpen(true);
  };

  // Execute the action after preview
  const executeAction = async (handler: (ids: string[]) => Promise<any>) => {
    if (!actionState) return;

    setActionState((prev) =>
      prev ? { ...prev, stage: "executing", progress: 0 } : null,
    );

    try {
      const result = await handler(selectedIds);
      setActionState((prev) =>
        prev ? { ...prev, stage: "done", result, progress: 100 } : null,
      );
    } catch (err: any) {
      setActionState((prev) =>
        prev ? { ...prev, stage: "error", error: err.message } : null,
      );
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setTimeout(() => setActionState(null), 300);
  };

  // Batch limits
  const LIMITS = {
    ENRICHMENT_BATCH: 250, // Per batch for enrichment APIs
    ENRICHMENT_MAX: 5000, // Max per day for enrichment
    CAMPAIGN_MAX: 2000, // Max per campaign push (SMS/Call)
    APOLLO_RATE: 100, // Apollo rate limit per minute
  };

  // Cost estimation
  const calculateCost = (action: string, count: number): number => {
    const costs: Record<string, number> = {
      "Skip Trace": 0.05,
      "Property Detail": 0.01,
      "Apollo Enrich": 0.03,
      "Datalake Match": 0,
      "Push to SMS": 0.01,
      "Push to Email": 0.001,
      "Power Dialer": 0.02,
    };
    return (costs[action] || 0) * count;
  };

  // Time estimation
  const estimateTime = (action: string, count: number): string => {
    const secondsPerItem: Record<string, number> = {
      "Skip Trace": 2,
      "Property Detail": 1,
      "Apollo Enrich": 1.5,
      "Datalake Match": 0.1,
      "Push to SMS": 0.5,
      "Push to Email": 0.2,
      "Power Dialer": 0.1,
    };
    const totalSeconds = (secondsPerItem[action] || 1) * count;
    if (totalSeconds < 60) return `~${Math.ceil(totalSeconds)} seconds`;
    if (totalSeconds < 3600) return `~${Math.ceil(totalSeconds / 60)} minutes`;
    return `~${(totalSeconds / 3600).toFixed(1)} hours`;
  };

  // Warnings based on limits
  const getWarnings = (action: string, count: number): string[] => {
    const warnings: string[] = [];

    // Enrichment actions (250 per batch, 5,000 max)
    if (["Skip Trace", "Property Detail", "Apollo Enrich"].includes(action)) {
      if (count > LIMITS.ENRICHMENT_MAX) {
        warnings.push(
          `Daily limit is ${sf(LIMITS.ENRICHMENT_MAX)}. Will process first ${sf(LIMITS.ENRICHMENT_MAX)} records.`,
        );
      } else if (count > LIMITS.ENRICHMENT_BATCH) {
        const batches = Math.ceil(count / LIMITS.ENRICHMENT_BATCH);
        warnings.push(
          `Will process in ${batches} batches of ${LIMITS.ENRICHMENT_BATCH} each.`,
        );
      }
    }

    // Campaign actions (2,000 max per push)
    if (["Push to SMS", "Power Dialer"].includes(action)) {
      if (count > LIMITS.CAMPAIGN_MAX) {
        warnings.push(
          `Campaign limit is ${sf(LIMITS.CAMPAIGN_MAX)} per push. Will create multiple campaigns.`,
        );
      }
    }

    // Apollo specific rate limit
    if (action === "Apollo Enrich" && count > LIMITS.APOLLO_RATE) {
      const minutes = Math.ceil(count / LIMITS.APOLLO_RATE);
      warnings.push(
        `Apollo rate limit: ${LIMITS.APOLLO_RATE}/min. Will take ~${minutes} minutes.`,
      );
    }

    return warnings;
  };

  // Property actions
  const propertyActions = [
    {
      id: "skip-trace",
      label: "Skip Trace",
      icon: <UserSearch className="h-4 w-4" />,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10 hover:bg-purple-500/20",
      handler: onSkipTrace,
      description: "Get phone & email for property owners",
      cost: "$0.05/record",
    },
    {
      id: "property-detail",
      label: "Property Detail",
      icon: <Building2 className="h-4 w-4" />,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10 hover:bg-blue-500/20",
      handler: onPropertyDetail,
      description: "Full property data + valuation",
      cost: "$0.01/record",
    },
    {
      id: "datalake-enrich",
      label: "Datalake Match",
      icon: <Database className="h-4 w-4" />,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10 hover:bg-cyan-500/20",
      handler: onDatalakeEnrich,
      description: "Match against USBizData",
      cost: "Free",
    },
  ];

  // Business actions
  const businessActions = [
    {
      id: "apollo-enrich",
      label: "Apollo Enrich",
      icon: <Zap className="h-4 w-4" />,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10 hover:bg-orange-500/20",
      handler: onApolloEnrich,
      description: "Get contacts & company data",
      cost: "$0.03/record",
    },
    {
      id: "datalake-enrich",
      label: "Datalake Match",
      icon: <Database className="h-4 w-4" />,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10 hover:bg-cyan-500/20",
      handler: onDatalakeEnrich,
      description: "Match against USBizData",
      cost: "Free",
    },
  ];

  // Campaign actions (available for all types)
  const campaignActions = [
    {
      id: "sms",
      label: "Push to SMS",
      icon: <MessageSquare className="h-4 w-4" />,
      color: "text-green-500",
      bgColor: "bg-green-500/10 hover:bg-green-500/20",
      handler: onPushToSMS,
      description: "Add to SMS campaign queue",
      cost: "$0.01/msg",
    },
    {
      id: "email",
      label: "Push to Email",
      icon: <Mail className="h-4 w-4" />,
      color: "text-red-500",
      bgColor: "bg-red-500/10 hover:bg-red-500/20",
      handler: onPushToEmail,
      description: "Add to email campaign",
      cost: "$0.001/msg",
    },
    {
      id: "dialer",
      label: "Power Dialer",
      icon: <Phone className="h-4 w-4" />,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10 hover:bg-indigo-500/20",
      handler: onPushToDialer,
      description: "Add to call queue",
      cost: "$0.02/min",
    },
  ];

  const enrichActions =
    dataType === "business" ? businessActions : propertyActions;

  return (
    <>
      {/* Sticky Action Bar */}
      <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-3 z-50">
        <div className="flex items-center justify-between gap-4 max-w-screen-2xl mx-auto">
          {/* Selection Count */}
          <div className="flex items-center gap-3">
            <Badge
              variant={hasSelection ? "default" : "secondary"}
              className="text-sm px-3 py-1"
            >
              {hasSelection ? `${selectedCount} selected` : "No selection"}
            </Badge>
            {hasSelection && (
              <span className="text-sm text-muted-foreground">
                Select records to run actions
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Enrichment Actions */}
            <div className="flex items-center gap-1 border-r pr-3 mr-1">
              <span className="text-xs text-muted-foreground mr-2">
                Enrich:
              </span>
              {enrichActions.map((action) => (
                <Button
                  key={action.id}
                  variant="ghost"
                  size="sm"
                  disabled={!hasSelection || !action.handler}
                  onClick={() => startAction(action.label, action.handler)}
                  className={`gap-2 ${action.bgColor} ${action.color}`}
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
            </div>

            {/* Campaign Actions */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground mr-2">
                Campaign:
              </span>
              {campaignActions.map((action) => (
                <Button
                  key={action.id}
                  variant="ghost"
                  size="sm"
                  disabled={!hasSelection || !action.handler}
                  onClick={() => startAction(action.label, action.handler)}
                  className={`gap-2 ${action.bgColor} ${action.color}`}
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preview/Execute Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionState?.stage === "preview" && <Eye className="h-5 w-5" />}
              {actionState?.stage === "executing" && (
                <Loader2 className="h-5 w-5 animate-spin" />
              )}
              {actionState?.stage === "done" && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
              {actionState?.stage === "error" && (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              {actionState?.action}
            </DialogTitle>
            <DialogDescription>
              {actionState?.stage === "preview" && "Review before executing"}
              {actionState?.stage === "executing" && "Processing..."}
              {actionState?.stage === "done" && "Action completed successfully"}
              {actionState?.stage === "error" && "Action failed"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Preview Stage */}
            {actionState?.stage === "preview" && actionState.preview && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <div className="text-2xl font-bold">
                      {actionState.preview.count}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Selected
                    </div>
                  </div>
                  {actionState.preview.batchInfo && (
                    <div className="p-3 bg-blue-500/10 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-500">
                        {actionState.preview.batchInfo.willProcess}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Will Process
                      </div>
                    </div>
                  )}
                  <div className="p-3 bg-green-500/10 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-500">
                      ${actionState.preview.estimatedCost?.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Est. Cost
                    </div>
                  </div>
                </div>

                {/* Batch breakdown */}
                {actionState.preview.batchInfo &&
                  actionState.preview.batchInfo.totalBatches > 1 && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {actionState.preview.batchInfo.totalBatches} batches
                        </span>
                      </div>
                      <Badge variant="outline">
                        {actionState.preview.batchInfo.perBatchLabel}
                      </Badge>
                      <Badge variant="secondary">
                        {actionState.preview.batchInfo.maxLabel}
                      </Badge>
                    </div>
                  )}

                <div className="text-sm text-muted-foreground text-center">
                  Estimated time: {actionState.preview.estimatedTime}
                </div>

                {actionState.preview.warnings &&
                  actionState.preview.warnings.length > 0 && (
                    <div className="space-y-2">
                      {actionState.preview.warnings.map((warning, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 text-sm text-yellow-600 bg-yellow-500/10 p-2 rounded"
                        >
                          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                          {warning}
                        </div>
                      ))}
                    </div>
                  )}
              </>
            )}

            {/* Executing Stage */}
            {actionState?.stage === "executing" && (
              <div className="space-y-3">
                <Progress value={actionState.progress || 0} />
                <div className="text-sm text-center text-muted-foreground">
                  Processing {selectedCount} records...
                </div>
              </div>
            )}

            {/* Done Stage */}
            {actionState?.stage === "done" && actionState.result && (
              <div className="space-y-3">
                <div className="p-4 bg-green-500/10 rounded-lg text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <div className="font-medium">Successfully processed</div>
                  <div className="text-sm text-muted-foreground">
                    {actionState.result.processed || selectedCount} records
                  </div>
                </div>
                {actionState.result.stats && (
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    {actionState.result.stats.withPhone && (
                      <div className="p-2 bg-muted rounded">
                        <div className="font-medium">
                          {actionState.result.stats.withPhone}
                        </div>
                        <div className="text-muted-foreground">With Phone</div>
                      </div>
                    )}
                    {actionState.result.stats.withEmail && (
                      <div className="p-2 bg-muted rounded">
                        <div className="font-medium">
                          {actionState.result.stats.withEmail}
                        </div>
                        <div className="text-muted-foreground">With Email</div>
                      </div>
                    )}
                    {actionState.result.stats.cost && (
                      <div className="p-2 bg-muted rounded">
                        <div className="font-medium">
                          ${actionState.result.stats.cost}
                        </div>
                        <div className="text-muted-foreground">Total Cost</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Error Stage */}
            {actionState?.stage === "error" && (
              <div className="p-4 bg-red-500/10 rounded-lg text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <div className="font-medium">Error</div>
                <div className="text-sm text-muted-foreground">
                  {actionState.error}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {actionState?.stage === "preview" && (
              <>
                <Button variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const action = [...enrichActions, ...campaignActions].find(
                      (a) => a.label === actionState.action,
                    );
                    if (action?.handler) {
                      executeAction(action.handler);
                    }
                  }}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  Execute
                </Button>
              </>
            )}
            {(actionState?.stage === "done" ||
              actionState?.stage === "error") && (
              <Button onClick={closeDialog}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ActionBar;
