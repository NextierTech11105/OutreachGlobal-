"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Trash2,
  Play,
  Pause,
  Zap,
  ArrowRight,
  Settings,
} from "lucide-react";

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  isActive: boolean;
  executionCount: number;
}

const defaultRules: AutomationRule[] = [
  {
    id: "1",
    name: "Positive Response → Assign SDR",
    trigger: "response_positive",
    action: "assign_sdr",
    isActive: true,
    executionCount: 234,
  },
  {
    id: "2",
    name: "Wrong Number → Suppress",
    trigger: "response_wrong_number",
    action: "add_suppression",
    isActive: true,
    executionCount: 89,
  },
  {
    id: "3",
    name: "No Response 3 Days → Follow Up",
    trigger: "no_response_3d",
    action: "send_followup",
    isActive: false,
    executionCount: 567,
  },
  {
    id: "4",
    name: "Lead Score > 80 → Priority Queue",
    trigger: "lead_score_high",
    action: "move_priority",
    isActive: true,
    executionCount: 123,
  },
];

export default function CampaignAutomationPage() {
  const [rules, setRules] = useState<AutomationRule[]>(defaultRules);
  const [showNewRule, setShowNewRule] = useState(false);

  const toggleRule = (id: string) => {
    setRules(rules.map(r =>
      r.id === id ? { ...r, isActive: !r.isActive } : r
    ));
  };

  const deleteRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Automation Rules</h1>
          <p className="text-muted-foreground mt-1">
            Configure automatic actions based on campaign events
          </p>
        </div>
        <Button onClick={() => setShowNewRule(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Rule
        </Button>
      </div>

      {showNewRule && (
        <Card>
          <CardHeader>
            <CardTitle>Create Automation Rule</CardTitle>
            <CardDescription>
              Define trigger conditions and resulting actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rule Name</Label>
                <Input placeholder="e.g., Auto-assign positive responses" />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select defaultValue="normal">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label>When this happens (Trigger)</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="response_positive">Positive Response</SelectItem>
                    <SelectItem value="response_negative">Negative Response</SelectItem>
                    <SelectItem value="response_wrong_number">Wrong Number</SelectItem>
                    <SelectItem value="response_profanity">Profanity Detected</SelectItem>
                    <SelectItem value="no_response_1d">No Response (1 day)</SelectItem>
                    <SelectItem value="no_response_3d">No Response (3 days)</SelectItem>
                    <SelectItem value="lead_score_high">Lead Score &gt; 80</SelectItem>
                    <SelectItem value="phone_verified">Phone Verified</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-center pb-2">
                <ArrowRight className="h-6 w-6 text-muted-foreground" />
              </div>

              <div className="space-y-2">
                <Label>Do this (Action)</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select action..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assign_sdr">Assign to Sabrina SDR</SelectItem>
                    <SelectItem value="add_suppression">Add to Suppression List</SelectItem>
                    <SelectItem value="move_priority">Move to Priority Queue</SelectItem>
                    <SelectItem value="send_followup">Send Follow-up Message</SelectItem>
                    <SelectItem value="add_tag">Add Tag</SelectItem>
                    <SelectItem value="update_score">Update Lead Score</SelectItem>
                    <SelectItem value="notify_user">Notify Team Member</SelectItem>
                    <SelectItem value="move_bucket">Move to Bucket</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewRule(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowNewRule(false)}>
                <Zap className="mr-2 h-4 w-4" />
                Create Rule
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Active Rules</CardTitle>
          <CardDescription>
            {rules.filter(r => r.isActive).length} of {rules.length} rules enabled
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="text-right">Executions</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {rule.trigger}
                    </code>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {rule.action}
                    </code>
                  </TableCell>
                  <TableCell className="text-right">{rule.executionCount}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={() => toggleRule(rule.id)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
