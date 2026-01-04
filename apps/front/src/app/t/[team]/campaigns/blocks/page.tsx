"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Blocks,
  Plus,
  Play,
  Pause,
  RotateCcw,
  MoreVertical,
  Users,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CAMPAIGN_BLOCKS_QUERY,
  type CampaignBlock,
} from "@/features/campaign/queries/campaign-block.queries";
import {
  CREATE_CAMPAIGN_BLOCK_MUTATION,
  UPDATE_CAMPAIGN_BLOCK_STATUS_MUTATION,
} from "@/features/campaign/mutations/campaign-block.mutations";

/**
 * Campaign Blocks UI
 *
 * Kanban-style board for managing 2000-lead campaign blocks.
 * Blocks flow through: preparing → active → paused → completed
 */

type BlockStatus = "preparing" | "active" | "paused" | "completed";

const STATUS_CONFIG = {
  preparing: {
    label: "Preparing",
    color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    icon: Clock,
    description: "Loading leads into block",
  },
  active: {
    label: "Active",
    color: "bg-green-500/10 text-green-500 border-green-500/20",
    icon: Play,
    description: "Sending messages",
  },
  paused: {
    label: "Paused",
    color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    icon: Pause,
    description: "Temporarily stopped",
  },
  completed: {
    label: "Completed",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    icon: CheckCircle2,
    description: "All touches sent",
  },
};

export default function CampaignBlocksPage() {
  const params = useParams();
  const teamId = params.team as string;

  const [selectedBlock, setSelectedBlock] = useState<CampaignBlock | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCampaignId, setNewCampaignId] = useState("");
  const [newMaxLeads, setNewMaxLeads] = useState("2000");
  const [newMaxTouches, setNewMaxTouches] = useState("6");

  const { data, loading, error, refetch } = useQuery(CAMPAIGN_BLOCKS_QUERY, {
    variables: { teamId },
    skip: !teamId,
  });

  const [createBlock, { loading: creating }] = useMutation(
    CREATE_CAMPAIGN_BLOCK_MUTATION,
    {
      onCompleted: () => {
        toast.success("Block created successfully");
        setIsCreateOpen(false);
        setNewCampaignId("");
        refetch();
      },
      onError: (err) => {
        toast.error(err.message || "Failed to create block");
      },
    }
  );

  const [updateBlockStatus] = useMutation(
    UPDATE_CAMPAIGN_BLOCK_STATUS_MUTATION,
    {
      onCompleted: () => {
        toast.success("Block status updated");
        refetch();
      },
      onError: (err) => {
        toast.error(err.message || "Failed to update block");
      },
    }
  );

  const blocks = data?.campaignBlocks?.nodes || [];

  const getBlocksByStatus = (status: BlockStatus) =>
    blocks.filter((b) => b.status === status);

  const handleStartBlock = async (blockId: string) => {
    setActionLoading(blockId);
    try {
      await updateBlockStatus({
        variables: { teamId, id: blockId, status: "active" },
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePauseBlock = async (blockId: string) => {
    setActionLoading(blockId);
    try {
      await updateBlockStatus({
        variables: { teamId, id: blockId, status: "paused" },
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResumeBlock = async (blockId: string) => {
    setActionLoading(blockId);
    try {
      await updateBlockStatus({
        variables: { teamId, id: blockId, status: "active" },
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateBlock = async () => {
    if (!newCampaignId) {
      toast.error("Please enter a campaign ID");
      return;
    }
    await createBlock({
      variables: {
        teamId,
        input: {
          campaignId: newCampaignId,
          maxLeads: parseInt(newMaxLeads) || 2000,
          maxTouches: parseInt(newMaxTouches) || 6,
        },
      },
    });
  };

  const BlockCard = ({ block }: { block: CampaignBlock }) => {
    const statusConfig = STATUS_CONFIG[block.status];
    const StatusIcon = statusConfig.icon;
    const progress = Math.round((block.touchesSent / block.targetTouches) * 100) || 0;
    const leadProgress = Math.round((block.leadsLoaded / block.maxLeads) * 100) || 0;
    const isLoading = actionLoading === block.id;

    return (
      <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-zinc-400">
                  Block #{block.blockNumber}
                </span>
                <Badge variant="outline" className={cn("text-xs", statusConfig.color)}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusConfig.label}
                </Badge>
              </div>
              <p className="text-sm font-medium mt-1 truncate max-w-[200px] font-mono text-zinc-500">
                {block.campaignId}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MoreVertical className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {block.status === "preparing" && (
                  <DropdownMenuItem onClick={() => handleStartBlock(block.id)}>
                    <Play className="w-4 h-4 mr-2" />
                    Start Block
                  </DropdownMenuItem>
                )}
                {block.status === "active" && (
                  <DropdownMenuItem onClick={() => handlePauseBlock(block.id)}>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause Block
                  </DropdownMenuItem>
                )}
                {block.status === "paused" && (
                  <DropdownMenuItem onClick={() => handleResumeBlock(block.id)}>
                    <Play className="w-4 h-4 mr-2" />
                    Resume Block
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedBlock(block)}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1 text-zinc-400">
              <Users className="w-3 h-3" />
              <span>
                {block.leadsLoaded.toLocaleString()}/{block.maxLeads.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1 text-zinc-400">
              <MessageSquare className="w-3 h-3" />
              <span>
                Touch {block.currentTouch}/{block.maxTouches}
              </span>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-1">
            {block.status === "preparing" ? (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Loading leads</span>
                  <span className="text-zinc-400">{leadProgress}%</span>
                </div>
                <Progress value={leadProgress} className="h-1.5" />
              </>
            ) : (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">
                    {block.touchesSent.toLocaleString()} sent
                  </span>
                  <span className="text-zinc-400">{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const KanbanColumn = ({
    status,
    blocks,
  }: {
    status: BlockStatus;
    blocks: CampaignBlock[];
  }) => {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;

    return (
      <div className="flex-1 min-w-[280px]">
        <div className="flex items-center gap-2 mb-4">
          <Icon className={cn("w-4 h-4", config.color.split(" ")[1])} />
          <h3 className="font-medium">{config.label}</h3>
          <Badge variant="secondary" className="ml-auto">
            {blocks.length}
          </Badge>
        </div>
        <div className="space-y-3">
          {blocks.length === 0 ? (
            <div className="p-4 border border-dashed border-zinc-800 rounded-lg text-center text-sm text-zinc-500">
              No blocks in {config.label.toLowerCase()}
            </div>
          ) : (
            blocks.map((block) => <BlockCard key={block.id} block={block} />)
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-muted-foreground">Failed to load campaign blocks</p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 space-y-6 p-8 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Blocks className="h-8 w-8" />
              Campaign Blocks
            </h2>
            <p className="text-muted-foreground">
              Manage 2,000-lead blocks across your campaigns
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Block
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Block</DialogTitle>
                <DialogDescription>
                  Add a new 2,000-lead block to an existing campaign
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Campaign ID</Label>
                  <Input
                    placeholder="Enter campaign ID..."
                    className="bg-zinc-800"
                    value={newCampaignId}
                    onChange={(e) => setNewCampaignId(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Leads</Label>
                    <Input
                      type="number"
                      placeholder="2000"
                      className="bg-zinc-800"
                      value={newMaxLeads}
                      onChange={(e) => setNewMaxLeads(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Touches</Label>
                    <Input
                      type="number"
                      placeholder="6"
                      className="bg-zinc-800"
                      value={newMaxTouches}
                      onChange={(e) => setNewMaxTouches(e.target.value)}
                    />
                  </div>
                </div>
                <div className="p-3 bg-zinc-800 rounded-lg">
                  <p className="text-sm text-zinc-400">
                    Block will automatically load up to {newMaxLeads || 2000} leads from the selected source.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateBlock} disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Block
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {getBlocksByStatus("preparing").length}
                  </p>
                  <p className="text-xs text-zinc-500">Preparing</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Play className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {getBlocksByStatus("active").length}
                  </p>
                  <p className="text-xs text-zinc-500">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Pause className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {getBlocksByStatus("paused").length}
                  </p>
                  <p className="text-xs text-zinc-500">Paused</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {getBlocksByStatus("completed").length}
                  </p>
                  <p className="text-xs text-zinc-500">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-6 overflow-x-auto pb-4">
          <KanbanColumn status="preparing" blocks={getBlocksByStatus("preparing")} />
          <KanbanColumn status="active" blocks={getBlocksByStatus("active")} />
          <KanbanColumn status="paused" blocks={getBlocksByStatus("paused")} />
          <KanbanColumn status="completed" blocks={getBlocksByStatus("completed")} />
        </div>

        {/* Block Detail Dialog */}
        <Dialog open={!!selectedBlock} onOpenChange={() => setSelectedBlock(null)}>
          <DialogContent className="max-w-lg">
            {selectedBlock && (
              <>
                <DialogHeader>
                  <DialogTitle>
                    Block #{selectedBlock.blockNumber} Details
                  </DialogTitle>
                  <DialogDescription className="font-mono">
                    {selectedBlock.campaignId}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-zinc-800 rounded-lg">
                      <p className="text-xs text-zinc-500">Status</p>
                      <Badge
                        variant="outline"
                        className={cn("mt-1", STATUS_CONFIG[selectedBlock.status].color)}
                      >
                        {STATUS_CONFIG[selectedBlock.status].label}
                      </Badge>
                    </div>
                    <div className="p-3 bg-zinc-800 rounded-lg">
                      <p className="text-xs text-zinc-500">Current Touch</p>
                      <p className="text-lg font-bold">
                        {selectedBlock.currentTouch} / {selectedBlock.maxTouches}
                      </p>
                    </div>
                    <div className="p-3 bg-zinc-800 rounded-lg">
                      <p className="text-xs text-zinc-500">Leads Loaded</p>
                      <p className="text-lg font-bold">
                        {selectedBlock.leadsLoaded.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-zinc-800 rounded-lg">
                      <p className="text-xs text-zinc-500">Messages Sent</p>
                      <p className="text-lg font-bold">
                        {selectedBlock.touchesSent.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-zinc-400">Overall Progress</p>
                    <Progress
                      value={(selectedBlock.touchesSent / selectedBlock.targetTouches) * 100 || 0}
                      className="h-2"
                    />
                    <p className="text-xs text-zinc-500 text-right">
                      {Math.round((selectedBlock.touchesSent / selectedBlock.targetTouches) * 100) || 0}% complete
                    </p>
                  </div>
                  {selectedBlock.startedAt && (
                    <div className="text-xs text-zinc-500">
                      Started: {new Date(selectedBlock.startedAt).toLocaleString()}
                    </div>
                  )}
                  {selectedBlock.completedAt && (
                    <div className="text-xs text-zinc-500">
                      Completed: {new Date(selectedBlock.completedAt).toLocaleString()}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  {selectedBlock.status === "preparing" && (
                    <Button onClick={() => handleStartBlock(selectedBlock.id)}>
                      <Play className="w-4 h-4 mr-2" />
                      Start Block
                    </Button>
                  )}
                  {selectedBlock.status === "active" && (
                    <Button
                      variant="outline"
                      onClick={() => handlePauseBlock(selectedBlock.id)}
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Pause Block
                    </Button>
                  )}
                  {selectedBlock.status === "paused" && (
                    <Button onClick={() => handleResumeBlock(selectedBlock.id)}>
                      <Play className="w-4 h-4 mr-2" />
                      Resume Block
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
