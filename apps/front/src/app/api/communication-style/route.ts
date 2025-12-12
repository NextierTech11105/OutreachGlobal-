import { NextRequest, NextResponse } from "next/server";
import {
  StraightLineEngine,
  CharacterInfluence,
  CommunicationStyle,
  StraightLineStage,
  CHARACTER_STYLES,
} from "@/lib/engines/straight-line-engine";

// POST /api/communication-style - Generate message with style settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      first_name,
      company_name,
      industry,
      stage = "open",
      character,
      style,
      mix_characters,
      preset,
    } = body;

    if (!first_name) {
      return NextResponse.json(
        { error: "first_name is required" },
        { status: 400 },
      );
    }

    const engine = new StraightLineEngine();

    // Apply preset if specified
    if (preset) {
      switch (preset) {
        case "shark_ladies":
          engine.useSharkTankLadiesMix();
          break;
        case "mr_wonderful":
          engine.useMrWonderfulStyle();
          break;
        case "10x":
          engine.use10XStyle();
          break;
        case "straight_line":
          engine.useStraightLineCloser();
          break;
      }
    }

    // Apply character if specified (overrides preset)
    if (character && !preset) {
      engine.setCharacter(character as CharacterInfluence);
    }

    // Apply character mix if specified (overrides single character)
    if (
      mix_characters &&
      Array.isArray(mix_characters) &&
      mix_characters.length > 0
    ) {
      engine.mixCharacters(mix_characters as CharacterInfluence[]);
    }

    // Apply custom style settings (overrides character defaults)
    if (style) {
      engine.setStyle(style as Partial<CommunicationStyle>);
    }

    // Generate message
    const result = engine.generateMessage({
      first_name,
      company_name,
      industry,
      stage: stage as StraightLineStage,
    });

    return NextResponse.json({
      success: true,
      ...result,
      current_style: engine.getStyle(),
    });
  } catch (error) {
    console.error("[Communication Style API] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate message" },
      { status: 500 },
    );
  }
}

// GET /api/communication-style - Get available characters and presets
export async function GET() {
  try {
    const characters = Object.entries(CHARACTER_STYLES).map(([id, style]) => ({
      id,
      name: getCharacterName(id as CharacterInfluence),
      tagline: getCharacterTagline(id as CharacterInfluence),
      style: {
        humor: style.humor,
        directness: style.directness,
        warmth: style.warmth,
        energy: style.energy,
        urgency: style.urgency,
      },
      signature_phrases: style.signature_phrases,
    }));

    const presets = [
      {
        id: "shark_ladies",
        name: "Shark Tank Ladies",
        description: "Lori + Barbara + Candace mix - confident, warm, direct",
      },
      {
        id: "mr_wonderful",
        name: "Mr. Wonderful",
        description: "Blunt, money-focused closer",
      },
      {
        id: "10x",
        name: "10X Energy",
        description: "Grant Cardone style - aggressive, high energy",
      },
      {
        id: "straight_line",
        name: "Straight Line Closer",
        description: "Jordan Belfort methodology - relentless closer",
      },
    ];

    const stages: StraightLineStage[] = [
      "open",
      "rapport",
      "qualify",
      "present",
      "objection",
      "close",
    ];

    return NextResponse.json({
      success: true,
      characters,
      presets,
      stages,
      style_ranges: {
        humor: { min: 0, max: 100, default: 40, label: "Serious ↔ Funny" },
        directness: {
          min: 0,
          max: 100,
          default: 70,
          label: "Conversational ↔ Direct",
        },
        warmth: {
          min: 0,
          max: 100,
          default: 75,
          label: "Professional ↔ Warm",
        },
        energy: { min: 0, max: 100, default: 70, label: "Calm ↔ High Energy" },
        urgency: { min: 0, max: 100, default: 60, label: "Relaxed ↔ Urgent" },
      },
    });
  } catch (error) {
    console.error("[Communication Style API] Error:", error);
    return NextResponse.json(
      { error: "Failed to get communication style options" },
      { status: 500 },
    );
  }
}

function getCharacterName(id: CharacterInfluence): string {
  const names: Record<CharacterInfluence, string> = {
    mr_wonderful: "Mr. Wonderful (Kevin O'Leary)",
    grant_cardone: "Grant Cardone",
    gary_vee: "Gary Vaynerchuk",
    daymond_john: "Daymond John",
    mark_cuban: "Mark Cuban",
    lori_greiner: "Lori Greiner",
    barbara_corcoran: "Barbara Corcoran",
    candace_owens: "Candace Owens",
    jordan_belfort: "Jordan Belfort",
  };
  return names[id];
}

function getCharacterTagline(id: CharacterInfluence): string {
  const taglines: Record<CharacterInfluence, string> = {
    mr_wonderful: "Money-focused, blunt closer",
    grant_cardone: "10X energy, aggressive",
    gary_vee: "Authentic hustle",
    daymond_john: "Resourceful, calculated",
    mark_cuban: "No-nonsense, analytical",
    lori_greiner: "Confident, value-focused",
    barbara_corcoran: "Warm, storytelling",
    candace_owens: "Bold, articulate, direct",
    jordan_belfort: "Straight Line closer",
  };
  return taglines[id];
}
