"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash, Edit, Save, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ScoringRule {
  id: number;
  signal: string;
  score: number;
  tag: string;
}

interface CampaignMatrixEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function CampaignMatrixEditor({
  open,
  onOpenChange,
  onSave,
}: CampaignMatrixEditorProps) {
  const [matrixItems, setMatrixItems] = useState<ScoringRule[]>([
    { id: 1, signal: "Lis Pendens", score: 10, tag: "PreForeclosure" },
    { id: 2, signal: "Reverse Mortgage", score: 8, tag: "SeniorOwner" },
    { id: 3, signal: "Vacant", score: 6, tag: "VacantProp" },
    {
      id: 4,
      signal: "Owner Type: Estate or Trust",
      score: 6,
      tag: "NonOccupant",
    },
    { id: 5, signal: "Equity Percent > 80%", score: 8, tag: "HighEquity" },
    { id: 6, signal: "Equity Percent < 30%", score: 6, tag: "LowEquity" },
    { id: 7, signal: "Negative Equity", score: 10, tag: "Underwater" },
    {
      id: 8,
      signal: "Maturity Date < 12 months",
      score: 6,
      tag: "LoanMaturityRisk",
    },
    { id: 9, signal: "Zoning: [R6, R7, R8]", score: 3, tag: "BuildableZoning" },
  ]);

  const [editingItem, setEditingItem] = useState<{
    id: number | null;
    signal: string;
    score: number;
    tag: string;
  }>({
    id: null,
    signal: "",
    score: 0,
    tag: "",
  });

  const [activeTab, setActiveTab] = useState<string>("matrix");
  const [isEditing, setIsEditing] = useState(false);
  const [thresholds, setThresholds] = useState({
    high: 30,
    medium: 20,
    low: 10,
  });

  const totalPossibleScore = matrixItems.reduce(
    (sum, item) => sum + item.score,
    0,
  );

  const handleAddItem = () => {
    setEditingItem({
      id: null,
      signal: "",
      score: 5,
      tag: "",
    });
    setIsEditing(true);
  };

  const handleEditItem = (item: ScoringRule) => {
    setEditingItem({
      id: item.id,
      signal: item.signal,
      score: item.score,
      tag: item.tag,
    });
    setIsEditing(true);
  };

  const handleDeleteItem = (id: number) => {
    setMatrixItems(matrixItems.filter((item) => item.id !== id));
  };

  const handleSaveItem = () => {
    if (!editingItem.signal || !editingItem.tag) {
      // Show validation error
      return;
    }

    if (editingItem.id === null) {
      // Add new item
      const newId = Math.max(0, ...matrixItems.map((item) => item.id)) + 1;
      setMatrixItems([...matrixItems, { ...editingItem, id: newId }]);
    } else {
      // Update existing item
      setMatrixItems(
        matrixItems.map((item) =>
          item.id === editingItem.id ? { ...editingItem } : item,
        ),
      );
    }
    setIsEditing(false);
  };

  const handleSaveMatrix = () => {
    // In a real app, you would save the matrix to your backend here
    onSave();
    onOpenChange(false);
  };

  const handleThresholdChange = (
    type: "high" | "medium" | "low",
    value: number,
  ) => {
    setThresholds({
      ...thresholds,
      [type]: value,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Scoring Matrix</DialogTitle>
          <DialogDescription>
            Adjust scoring signals, values, and tags to determine how leads are
            scored and routed.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="matrix"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="matrix">Scoring Matrix</TabsTrigger>
            <TabsTrigger value="thresholds">Thresholds & Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="matrix" className="space-y-4 pt-4">
            {isEditing ? (
              <div className="space-y-4 p-4 border rounded-md bg-muted/20">
                <h3 className="text-lg font-medium">
                  {editingItem.id === null ? "Add New Signal" : "Edit Signal"}
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signal">Signal</Label>
                    <Input
                      id="signal"
                      value={editingItem.signal}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          signal: e.target.value,
                        })
                      }
                      placeholder="e.g., Lis Pendens, Vacant, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="score">Score</Label>
                    <Input
                      id="score"
                      type="number"
                      min="-10"
                      max="10"
                      value={editingItem.score}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          score: Number.parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="e.g., 10, 5, etc."
                    />
                    <p className="text-xs text-muted-foreground">
                      Scores can range from -10 to +10. Negative scores reduce
                      the lead's priority.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tag">Tag</Label>
                    <Input
                      id="tag"
                      value={editingItem.tag}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, tag: e.target.value })
                      }
                      placeholder="e.g., PreForeclosure, HighEquity, etc."
                    />
                    <p className="text-xs text-muted-foreground">
                      Tags are used for filtering and segmentation in campaigns.
                    </p>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveItem}>
                      <Save className="mr-2 h-4 w-4" />
                      Save Item
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <h3 className="text-lg font-medium">Scoring Signals</h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="ml-1">
                            <Info className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p>
                            Signals are property or owner characteristics that
                            affect lead scoring. Each signal contributes its
                            score to the lead's total score, which determines
                            routing.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Button onClick={handleAddItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Signal
                  </Button>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Signal</TableHead>
                        <TableHead className="w-[100px] text-center">
                          Score
                        </TableHead>
                        <TableHead className="w-[150px]">Tag</TableHead>
                        <TableHead className="w-[100px] text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matrixItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.signal}
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={
                                item.score > 0
                                  ? "text-green-600"
                                  : item.score < 0
                                    ? "text-red-600"
                                    : ""
                              }
                            >
                              {item.score > 0 ? `+${item.score}` : item.score}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="bg-primary/10 text-primary"
                            >
                              {item.tag}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditItem(item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteItem(item.id)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="thresholds" className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Routing Thresholds</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Info className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p>
                        Thresholds determine which queue a lead is routed to
                        based on its total score. Adjust these values to control
                        the volume of leads in each queue.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="high-threshold">AI SDR Threshold</Label>
                    <Badge
                      variant="outline"
                      className="bg-primary/10 text-primary"
                    >
                      High Priority
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="high-threshold"
                      type="number"
                      min="0"
                      max={totalPossibleScore}
                      value={thresholds.high}
                      onChange={(e) =>
                        handleThresholdChange(
                          "high",
                          Number.parseInt(e.target.value) || 0,
                        )
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      points+
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="medium-threshold">
                      Human SDR Threshold
                    </Label>
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    >
                      Medium Priority
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="medium-threshold"
                      type="number"
                      min="0"
                      max={thresholds.high - 1}
                      value={thresholds.medium}
                      onChange={(e) =>
                        handleThresholdChange(
                          "medium",
                          Number.parseInt(e.target.value) || 0,
                        )
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      points+
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="low-threshold">Nurture Threshold</Label>
                    <Badge variant="outline">Low Priority</Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="low-threshold"
                      type="number"
                      min="0"
                      max={thresholds.medium - 1}
                      value={thresholds.low}
                      onChange={(e) =>
                        handleThresholdChange(
                          "low",
                          Number.parseInt(e.target.value) || 0,
                        )
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      points+
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6 border rounded-md bg-muted/10">
              <h3 className="text-lg font-medium">Scoring Preview</h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Maximum Possible Score:</span>
                  <span className="text-xl font-bold">
                    {totalPossibleScore}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{
                        width: `${(thresholds.high / totalPossibleScore) * 100}%`,
                      }}
                    ></div>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span>0</span>
                    <span>{Math.floor(totalPossibleScore / 4)}</span>
                    <span>{Math.floor(totalPossibleScore / 2)}</span>
                    <span>{Math.floor((totalPossibleScore * 3) / 4)}</span>
                    <span>{totalPossibleScore}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="p-4 border rounded-md bg-primary/5">
                    <div className="flex flex-col space-y-2">
                      <Badge
                        variant="outline"
                        className="self-start bg-primary/10 text-primary"
                      >
                        AI SDR Queue
                      </Badge>
                      <span className="text-sm">
                        Leads with {thresholds.high}+ points
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Highest priority leads handled by AI SDR
                      </span>
                    </div>
                  </div>

                  <div className="p-4 border rounded-md bg-amber-50/20 dark:bg-amber-950/20">
                    <div className="flex flex-col space-y-2">
                      <Badge
                        variant="outline"
                        className="self-start bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      >
                        Human SDR Queue
                      </Badge>
                      <span className="text-sm">
                        Leads with {thresholds.medium}-{thresholds.high - 1}{" "}
                        points
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Medium priority leads handled by human SDRs
                      </span>
                    </div>
                  </div>

                  <div className="p-4 border rounded-md">
                    <div className="flex flex-col space-y-2">
                      <Badge variant="outline" className="self-start">
                        Nurture Queue
                      </Badge>
                      <span className="text-sm">
                        Leads with {thresholds.low}-{thresholds.medium - 1}{" "}
                        points
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Lower priority leads for nurturing campaigns
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveMatrix}>
            <Save className="mr-2 h-4 w-4" />
            Save Matrix
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
