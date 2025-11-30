"use client";

import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Save, RotateCcw, TrendingUp, Target, Star, Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ScoringFactor {
  id: string;
  name: string;
  description: string;
  weight: number;
  category: "property" | "loan" | "lead" | "engagement" | "distressed";
  isCustom?: boolean;
}

// NO DEFAULTS - User adds their own factors

export default function CampaignScoringPage() {
  const [factors, setFactors] = useState<ScoringFactor[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newFactor, setNewFactor] = useState({ name: "", description: "", weight: 10, category: "loan" as ScoringFactor["category"] });

  // Load from localStorage - no defaults, user adds their own
  useEffect(() => {
    const saved = localStorage.getItem("scoringFactors");
    if (saved) {
      setFactors(JSON.parse(saved));
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (factors.length > 0) {
      localStorage.setItem("scoringFactors", JSON.stringify(factors));
    }
  }, [factors]);

  const updateWeight = (id: string, weight: number) => {
    setFactors(factors.map(f => f.id === id ? { ...f, weight } : f));
    setHasChanges(true);
  };

  const deleteFactor = (id: string) => {
    setFactors(factors.filter(f => f.id !== id));
    setHasChanges(true);
    toast.success("Factor removed");
  };

  const addCustomFactor = () => {
    if (!newFactor.name.trim()) {
      toast.error("Enter a factor name");
      return;
    }
    const factor: ScoringFactor = {
      id: `custom_${Date.now()}`,
      name: newFactor.name.trim(),
      description: newFactor.description.trim() || "Custom scoring factor",
      weight: newFactor.weight,
      category: newFactor.category,
      isCustom: true,
    };
    setFactors([...factors, factor]);
    setNewFactor({ name: "", description: "", weight: 10, category: "loan" });
    setShowAddDialog(false);
    setHasChanges(true);
    toast.success(`Added "${factor.name}"`);
  };

  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const activeFactors = factors.filter(f => f.weight > 0);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "property": return "bg-blue-500/20 text-blue-400 border-blue-500/50";
      case "loan": return "bg-pink-500/20 text-pink-400 border-pink-500/50";
      case "lead": return "bg-green-500/20 text-green-400 border-green-500/50";
      case "engagement": return "bg-purple-500/20 text-purple-400 border-purple-500/50";
      case "distressed": return "bg-red-500/20 text-red-400 border-red-500/50";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/50";
    }
  };

  const saveChanges = () => {
    localStorage.setItem("scoringFactors", JSON.stringify(factors));
    setHasChanges(false);
    toast.success("Scoring factors saved");
  };

  const resetFactors = () => {
    setFactors([]);
    localStorage.removeItem("scoringFactors");
    setHasChanges(false);
    toast.success("Cleared all factors");
  };


  return (
    <div className="p-8 space-y-6 bg-zinc-950 min-h-screen text-white">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Lead Scoring Factors</h1>
          <p className="text-zinc-400 mt-1">
            Configure which factors determine lead priority
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetFactors}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={() => setShowAddDialog(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Factor
          </Button>
          <Button disabled={!hasChanges} onClick={saveChanges} className="bg-blue-600 hover:bg-blue-700">
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <Target className="h-4 w-4" />
              Total Weight
            </div>
            <div className="text-2xl font-bold mt-1">{totalWeight}%</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <Star className="h-4 w-4" />
              Active Factors
            </div>
            <div className="text-2xl font-bold mt-1">{activeFactors.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <AlertTriangle className="h-4 w-4" />
              Distress Factors
            </div>
            <div className="text-2xl font-bold mt-1 text-red-400">
              {factors.filter(f => f.category === "distressed" && f.weight > 0).length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <TrendingUp className="h-4 w-4" />
              Loan Factors
            </div>
            <div className="text-2xl font-bold mt-1 text-pink-400">
              {factors.filter(f => f.category === "loan" && f.weight > 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ALL FACTORS - User defines their own */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Your Scoring Factors</CardTitle>
          <CardDescription className="text-zinc-500">
            Add your own factors - you decide what matters
          </CardDescription>
        </CardHeader>
        <CardContent>
          {factors.length === 0 ? (
            <div className="text-center py-12">
              <Plus className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
              <p className="text-zinc-400 mb-4">No scoring factors yet</p>
              <Button onClick={() => setShowAddDialog(true)} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Factor
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {factors.map((factor) => (
                <div key={factor.id} className="flex items-center gap-4 p-3 bg-zinc-800/50 rounded-lg">
                  <Badge className={getCategoryColor(factor.category)}>{factor.category}</Badge>
                  <div className="flex-1">
                    <span className="font-medium text-white">{factor.name}</span>
                    <p className="text-sm text-zinc-500">{factor.description}</p>
                  </div>
                  <div className="w-48">
                    <Slider
                      value={[factor.weight]}
                      onValueChange={([value]) => updateWeight(factor.id, value)}
                      max={50}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  <div className="w-16 text-right font-mono text-lg">
                    {factor.weight}%
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteFactor(factor.id)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Factor Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Add Custom Scoring Factor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-zinc-300">Factor Name</Label>
              <Input
                value={newFactor.name}
                onChange={(e) => setNewFactor({ ...newFactor, name: e.target.value })}
                placeholder="e.g., Divorce Filing"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label className="text-zinc-300">Description</Label>
              <Input
                value={newFactor.description}
                onChange={(e) => setNewFactor({ ...newFactor, description: e.target.value })}
                placeholder="e.g., Recent divorce = forced sale"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label className="text-zinc-300">Category</Label>
              <select
                value={newFactor.category}
                onChange={(e) => setNewFactor({ ...newFactor, category: e.target.value as ScoringFactor["category"] })}
                aria-label="Select category"
                className="w-full h-10 px-3 rounded bg-zinc-800 border border-zinc-700 text-white"
              >
                <option value="distressed">Distress Indicator</option>
                <option value="loan">Loan Type</option>
                <option value="property">Property</option>
                <option value="lead">Lead Quality</option>
                <option value="engagement">Engagement</option>
              </select>
            </div>
            <div>
              <Label className="text-zinc-300">Initial Weight: {newFactor.weight}%</Label>
              <Slider
                value={[newFactor.weight]}
                onValueChange={([value]) => setNewFactor({ ...newFactor, weight: value })}
                max={50}
                step={5}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={addCustomFactor} className="bg-green-600 hover:bg-green-700">Add Factor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
