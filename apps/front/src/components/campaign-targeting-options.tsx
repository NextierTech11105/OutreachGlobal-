"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Filter, Search, X } from "lucide-react";

interface CampaignTargetingOptionsProps {
  initialData?: any;
  onChange?: (targetingData: any) => void;
}

export function CampaignTargetingOptions({
  initialData,
  onChange,
}: CampaignTargetingOptionsProps) {
  const [targetingMethod, setTargetingMethod] = useState(
    initialData?.targetingMethod || "score",
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    initialData?.selectedTags || [],
  );
  const [scoreRange, setScoreRange] = useState(
    initialData?.scoreRange || [30, 100],
  );

  useEffect(() => {
    if (onChange) {
      onChange({
        targetingMethod,
        selectedTags,
        scoreRange,
      });
    }
  }, [targetingMethod, selectedTags, scoreRange, onChange]);

  const availableTags = [
    "HighEquity",
    "LowEquity",
    "Underwater",
    "PreForeclosure",
    "SeniorOwner",
    "VacantProp",
    "NonOccupant",
    "LoanMaturityRisk",
    "BuildableZoning",
  ];

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Targeting Method</Label>
          <RadioGroup
            defaultValue="score"
            value={targetingMethod}
            onValueChange={setTargetingMethod}
          >
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center space-x-2 rounded-md border p-4">
                <RadioGroupItem value="score" id="score" />
                <Label
                  htmlFor="score"
                  className="flex cursor-pointer items-center"
                >
                  <span className="text-sm font-medium">Score-Based</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-md border p-4">
                <RadioGroupItem value="tags" id="tags" />
                <Label
                  htmlFor="tags"
                  className="flex cursor-pointer items-center"
                >
                  <span className="text-sm font-medium">Tag-Based</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-md border p-4">
                <RadioGroupItem value="custom" id="custom" />
                <Label
                  htmlFor="custom"
                  className="flex cursor-pointer items-center"
                >
                  <span className="text-sm font-medium">Custom Query</span>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {targetingMethod === "score" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Lead Score Range</Label>
                <span className="text-sm text-muted-foreground">
                  {scoreRange[0]} - {scoreRange[1]}
                </span>
              </div>
              <Slider
                defaultValue={[30, 100]}
                max={100}
                step={1}
                value={scoreRange}
                onValueChange={setScoreRange}
              />
            </div>

            <div className="rounded-md border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-medium">Estimated Lead Count</h3>
                  <p className="text-sm text-muted-foreground">
                    Based on current database
                  </p>
                </div>
                <Badge className="text-lg py-1 px-3">248</Badge>
              </div>
            </div>
          </div>
        )}

        {targetingMethod === "tags" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Tags</Label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                    {selectedTags.includes(tag) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tag Matching</Label>
              <RadioGroup defaultValue="any">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="any" id="any" />
                  <Label htmlFor="any">Match Any Selected Tag</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all">Match All Selected Tags</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="rounded-md border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-medium">Estimated Lead Count</h3>
                  <p className="text-sm text-muted-foreground">
                    Based on selected tags
                  </p>
                </div>
                <Badge className="text-lg py-1 px-3">
                  {selectedTags.length > 0 ? "195" : "0"}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {targetingMethod === "custom" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Custom Query</Label>
              <div className="flex space-x-2">
                <Button variant="outline" className="flex items-center">
                  <Filter className="mr-2 h-4 w-4" />
                  <span>Build Query</span>
                </Button>
                <Button variant="outline" className="flex items-center">
                  <Search className="mr-2 h-4 w-4" />
                  <span>Use Saved Search</span>
                </Button>
              </div>
            </div>

            <div className="rounded-md border p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground">
                No custom query selected. Use the buttons above to build a query
                or select a saved search.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Additional Filters</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="max-leads">Maximum Leads</Label>
            <Input
              id="max-leads"
              type="number"
              placeholder="Enter maximum number of leads"
              defaultValue="250"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Select defaultValue="all">
              <SelectTrigger id="location">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="ny">New York</SelectItem>
                <SelectItem value="queens">Queens County, NY</SelectItem>
                <SelectItem value="brooklyn">Kings County, NY</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Exclusions</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox id="exclude-contacted" />
              <Label htmlFor="exclude-contacted">
                Exclude previously contacted leads
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="exclude-campaigns" />
              <Label htmlFor="exclude-campaigns">
                Exclude leads in active campaigns
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="exclude-closed" />
              <Label htmlFor="exclude-closed">Exclude closed/lost leads</Label>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Target Audience Summary</CardTitle>
          <CardDescription>Based on your targeting criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Estimated Lead Count</p>
              <p className="text-2xl font-bold">
                {targetingMethod === "score"
                  ? "248"
                  : targetingMethod === "tags" && selectedTags.length > 0
                    ? "195"
                    : "0"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Primary Tags</p>
              <div className="flex flex-wrap gap-1">
                {targetingMethod === "score" ? (
                  <>
                    <Badge variant="outline">HighEquity</Badge>
                    <Badge variant="outline">PreForeclosure</Badge>
                  </>
                ) : targetingMethod === "tags" && selectedTags.length > 0 ? (
                  selectedTags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    No tags selected
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
