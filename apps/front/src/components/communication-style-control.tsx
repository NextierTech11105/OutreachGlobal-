"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  straightLineEngine,
  CharacterInfluence,
  CommunicationStyle,
  StraightLineStage,
  CHARACTER_STYLES,
} from "@/lib/engines/straight-line-engine";
import {
  Smile,
  Frown,
  Target,
  MessageSquare,
  Zap,
  Heart,
  Clock,
  Sparkles,
  Users,
  RefreshCw,
} from "lucide-react";

interface CommunicationStyleControlProps {
  onStyleChange?: (style: CommunicationStyle) => void;
  onCharacterChange?: (character: CharacterInfluence) => void;
  onPreviewGenerated?: (preview: string) => void;
  className?: string;
}

const CHARACTER_INFO: Record<CharacterInfluence, { name: string; tagline: string; emoji: string }> = {
  mr_wonderful: {
    name: "Mr. Wonderful",
    tagline: "Money-focused, blunt closer",
    emoji: "💰"
  },
  grant_cardone: {
    name: "Grant Cardone",
    tagline: "10X energy, aggressive",
    emoji: "🔥"
  },
  gary_vee: {
    name: "Gary Vaynerchuk",
    tagline: "Authentic hustle",
    emoji: "🎯"
  },
  daymond_john: {
    name: "Daymond John",
    tagline: "Resourceful, calculated",
    emoji: "👔"
  },
  mark_cuban: {
    name: "Mark Cuban",
    tagline: "No-nonsense, analytical",
    emoji: "📊"
  },
  lori_greiner: {
    name: "Lori Greiner",
    tagline: "Confident, value-focused",
    emoji: "👑"
  },
  barbara_corcoran: {
    name: "Barbara Corcoran",
    tagline: "Warm, storytelling",
    emoji: "🏠"
  },
  candace_owens: {
    name: "Candace Owens",
    tagline: "Bold, articulate, direct",
    emoji: "⚡"
  },
  jordan_belfort: {
    name: "Jordan Belfort",
    tagline: "Straight Line closer",
    emoji: "🐺"
  }
};

export function CommunicationStyleControl({
  onStyleChange,
  onCharacterChange,
  onPreviewGenerated,
  className = "",
}: CommunicationStyleControlProps) {
  const [style, setStyle] = useState<CommunicationStyle>({
    humor: 40,
    directness: 70,
    warmth: 75,
    energy: 70,
    urgency: 60,
  });
  const [character, setCharacter] = useState<CharacterInfluence>("lori_greiner");
  const [selectedCharacters, setSelectedCharacters] = useState<CharacterInfluence[]>([
    "lori_greiner",
    "barbara_corcoran",
    "candace_owens"
  ]);
  const [previewStage, setPreviewStage] = useState<StraightLineStage>("open");
  const [previewMessage, setPreviewMessage] = useState("");

  // Apply style changes to engine
  useEffect(() => {
    straightLineEngine.setStyle(style);
    onStyleChange?.(style);
    generatePreview();
  }, [style]);

  // Apply character change
  const handleCharacterChange = (char: CharacterInfluence) => {
    setCharacter(char);
    straightLineEngine.setCharacter(char);
    const newStyle = straightLineEngine.getStyle();
    setStyle(newStyle);
    onCharacterChange?.(char);
  };

  // Mix selected characters
  const handleMixCharacters = () => {
    if (selectedCharacters.length > 0) {
      straightLineEngine.mixCharacters(selectedCharacters);
      const newStyle = straightLineEngine.getStyle();
      setStyle(newStyle);
      setCharacter(selectedCharacters[0]);
    }
  };

  // Toggle character in mix
  const toggleCharacterInMix = (char: CharacterInfluence) => {
    setSelectedCharacters(prev => {
      if (prev.includes(char)) {
        return prev.filter(c => c !== char);
      }
      if (prev.length < 3) {
        return [...prev, char];
      }
      return prev;
    });
  };

  // Use presets
  const usePreset = (preset: "shark_ladies" | "mr_wonderful" | "10x" | "straight_line") => {
    switch (preset) {
      case "shark_ladies":
        straightLineEngine.useSharkTankLadiesMix();
        break;
      case "mr_wonderful":
        straightLineEngine.useMrWonderfulStyle();
        break;
      case "10x":
        straightLineEngine.use10XStyle();
        break;
      case "straight_line":
        straightLineEngine.useStraightLineCloser();
        break;
    }
    const newStyle = straightLineEngine.getStyle();
    const newChar = straightLineEngine.getCharacter();
    setStyle(newStyle);
    setCharacter(newChar);
    onStyleChange?.(newStyle);
    onCharacterChange?.(newChar);
  };

  // Generate preview message
  const generatePreview = () => {
    const result = straightLineEngine.generateMessage({
      first_name: "Michael",
      company_name: "Acme Industries",
      industry: "Manufacturing",
      stage: previewStage,
    });
    setPreviewMessage(result.message);
    onPreviewGenerated?.(result.message);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Style Sliders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Communication Style
          </CardTitle>
          <CardDescription>
            Adjust sliders to customize your messaging tone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Humor Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="flex items-center gap-2">
                <Frown className="h-4 w-4 text-muted-foreground" />
                Serious
              </Label>
              <span className="text-sm font-medium">{style.humor}%</span>
              <Label className="flex items-center gap-2">
                Funny
                <Smile className="h-4 w-4 text-yellow-500" />
              </Label>
            </div>
            <Slider
              value={[style.humor]}
              onValueChange={([v]) => setStyle(prev => ({ ...prev, humor: v }))}
              max={100}
              step={5}
              className="cursor-pointer"
            />
          </div>

          {/* Directness Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Conversational
              </Label>
              <span className="text-sm font-medium">{style.directness}%</span>
              <Label className="flex items-center gap-2">
                Direct
                <Target className="h-4 w-4 text-red-500" />
              </Label>
            </div>
            <Slider
              value={[style.directness]}
              onValueChange={([v]) => setStyle(prev => ({ ...prev, directness: v }))}
              max={100}
              step={5}
              className="cursor-pointer"
            />
          </div>

          {/* Warmth Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                Professional
              </Label>
              <span className="text-sm font-medium">{style.warmth}%</span>
              <Label className="flex items-center gap-2">
                Warm
                <Heart className="h-4 w-4 text-pink-500" />
              </Label>
            </div>
            <Slider
              value={[style.warmth]}
              onValueChange={([v]) => setStyle(prev => ({ ...prev, warmth: v }))}
              max={100}
              step={5}
              className="cursor-pointer"
            />
          </div>

          {/* Energy Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="flex items-center gap-2">
                Calm
              </Label>
              <span className="text-sm font-medium">{style.energy}%</span>
              <Label className="flex items-center gap-2">
                High Energy
                <Zap className="h-4 w-4 text-yellow-500" />
              </Label>
            </div>
            <Slider
              value={[style.energy]}
              onValueChange={([v]) => setStyle(prev => ({ ...prev, energy: v }))}
              max={100}
              step={5}
              className="cursor-pointer"
            />
          </div>

          {/* Urgency Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="flex items-center gap-2">
                Relaxed
              </Label>
              <span className="text-sm font-medium">{style.urgency}%</span>
              <Label className="flex items-center gap-2">
                Urgent
                <Clock className="h-4 w-4 text-orange-500" />
              </Label>
            </div>
            <Slider
              value={[style.urgency]}
              onValueChange={([v]) => setStyle(prev => ({ ...prev, urgency: v }))}
              max={100}
              step={5}
              className="cursor-pointer"
            />
          </div>
        </CardContent>
      </Card>

      {/* Character Influence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Character Influence
          </CardTitle>
          <CardDescription>
            Choose a personality style or mix up to 3 characters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Single Character Select */}
          <div className="space-y-2">
            <Label>Primary Character</Label>
            <Select value={character} onValueChange={(v) => handleCharacterChange(v as CharacterInfluence)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CHARACTER_INFO).map(([id, info]) => (
                  <SelectItem key={id} value={id}>
                    <span className="flex items-center gap-2">
                      <span>{info.emoji}</span>
                      <span>{info.name}</span>
                      <span className="text-xs text-muted-foreground">— {info.tagline}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Character Mix Selection */}
          <div className="space-y-2">
            <Label>Mix Characters (select up to 3)</Label>
            <div className="flex flex-wrap gap-2">
              <TooltipProvider>
                {Object.entries(CHARACTER_INFO).map(([id, info]) => (
                  <Tooltip key={id}>
                    <TooltipTrigger asChild>
                      <Badge
                        variant={selectedCharacters.includes(id as CharacterInfluence) ? "default" : "outline"}
                        className="cursor-pointer transition-all hover:scale-105"
                        onClick={() => toggleCharacterInMix(id as CharacterInfluence)}
                      >
                        {info.emoji} {info.name}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{info.tagline}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMixCharacters}
              disabled={selectedCharacters.length === 0}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Apply Mix
            </Button>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <Label>Quick Presets</Label>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => usePreset("shark_ladies")}>
                👑 Shark Tank Ladies
              </Button>
              <Button variant="secondary" size="sm" onClick={() => usePreset("mr_wonderful")}>
                💰 Mr. Wonderful
              </Button>
              <Button variant="secondary" size="sm" onClick={() => usePreset("10x")}>
                🔥 10X Energy
              </Button>
              <Button variant="secondary" size="sm" onClick={() => usePreset("straight_line")}>
                🐺 Straight Line Closer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
          <CardDescription>
            See how your style settings affect messaging
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label>Stage:</Label>
            <Select value={previewStage} onValueChange={(v) => setPreviewStage(v as StraightLineStage)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="rapport">Build Rapport</SelectItem>
                <SelectItem value="qualify">Qualify</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="close">Close</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={generatePreview} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate
            </Button>
          </div>
          <div className="bg-muted rounded-lg p-4 min-h-[100px]">
            <p className="text-sm leading-relaxed">{previewMessage || "Click 'Regenerate' to see a preview"}</p>
          </div>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">
              {CHARACTER_INFO[character].emoji} {CHARACTER_INFO[character].name}
            </Badge>
            <Badge variant="outline">Humor: {style.humor}%</Badge>
            <Badge variant="outline">Direct: {style.directness}%</Badge>
            <Badge variant="outline">Warmth: {style.warmth}%</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
