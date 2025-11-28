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
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw, TrendingUp, Target, Star } from "lucide-react";

interface ScoringFactor {
  id: string;
  name: string;
  description: string;
  weight: number;
  category: "property" | "lead" | "engagement";
}

const defaultFactors: ScoringFactor[] = [
  { id: "1", name: "Equity Percentage", description: "Higher equity = higher score", weight: 25, category: "property" },
  { id: "2", name: "Property Value", description: "Properties over $300k", weight: 20, category: "property" },
  { id: "3", name: "Days on Market", description: "Recently listed properties", weight: 15, category: "property" },
  { id: "4", name: "Response Rate", description: "Previous engagement history", weight: 15, category: "engagement" },
  { id: "5", name: "Phone Verified", description: "Confirmed phone number", weight: 10, category: "lead" },
  { id: "6", name: "Email Valid", description: "Verified email address", weight: 5, category: "lead" },
  { id: "7", name: "Recent Activity", description: "Activity in last 30 days", weight: 10, category: "engagement" },
];

export default function CampaignScoringPage() {
  const [factors, setFactors] = useState<ScoringFactor[]>(defaultFactors);
  const [hasChanges, setHasChanges] = useState(false);

  const updateWeight = (id: string, weight: number) => {
    setFactors(factors.map(f => f.id === id ? { ...f, weight } : f));
    setHasChanges(true);
  };

  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "property": return "bg-blue-500/10 text-blue-500";
      case "lead": return "bg-green-500/10 text-green-500";
      case "engagement": return "bg-purple-500/10 text-purple-500";
      default: return "bg-gray-500/10 text-gray-500";
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Lead Scoring & Tagging</h1>
          <p className="text-muted-foreground mt-1">
            Configure how leads are scored and prioritized
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFactors(defaultFactors)}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button disabled={!hasChanges}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Total Weight
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalWeight}%
              {totalWeight !== 100 && (
                <span className="text-sm text-destructive ml-2">
                  (should be 100%)
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Lead Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">67.4</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4" />
              Hot Leads (80+)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scoring Factors</CardTitle>
          <CardDescription>
            Adjust weights to prioritize different lead attributes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Factor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[300px]">Weight</TableHead>
                <TableHead className="text-right w-[80px]">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {factors.map((factor) => (
                <TableRow key={factor.id}>
                  <TableCell className="font-medium">{factor.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={getCategoryColor(factor.category)}>
                      {factor.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {factor.description}
                  </TableCell>
                  <TableCell>
                    <Slider
                      value={[factor.weight]}
                      onValueChange={([value]) => updateWeight(factor.id, value)}
                      max={50}
                      step={5}
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {factor.weight}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Score Thresholds</CardTitle>
          <CardDescription>
            Define what scores qualify as hot, warm, or cold leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                Hot Lead Threshold
              </Label>
              <Input type="number" defaultValue="80" />
              <p className="text-xs text-muted-foreground">
                Scores above this are hot leads
              </p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                Warm Lead Threshold
              </Label>
              <Input type="number" defaultValue="50" />
              <p className="text-xs text-muted-foreground">
                Scores above this are warm leads
              </p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                Cold Lead Threshold
              </Label>
              <Input type="number" defaultValue="0" />
              <p className="text-xs text-muted-foreground">
                All other leads are cold
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
