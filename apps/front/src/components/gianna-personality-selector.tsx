"use client";

import { useState, useMemo } from "react";
import {
  PERSONALITY_ARCHETYPES,
  PersonalityArchetype,
  PersonalityDNA,
  HUMOR_DNA,
  HumorStyle,
  generateMessageWithDNA,
  ConversationContext,
} from "@/lib/gianna/personality-dna";

interface PersonalitySelectorProps {
  onSelect?: (personality: PersonalityDNA) => void;
  onGenerateMessage?: (message: string, personality: PersonalityArchetype) => void;
  leadContext?: {
    firstName: string;
    companyName?: string;
    industry?: string;
  };
  showPreview?: boolean;
}

const ARCHETYPE_ICONS: Record<PersonalityArchetype, string> = {
  brooklyn_bestie: "🗽",
  sharp_professional: "💼",
  hustler_heart: "🔥",
  wise_mentor: "🦉",
  playful_closer: "😄",
  empathetic_advisor: "💚",
  straight_shooter: "🎯",
  charming_connector: "🤝",
};

const HUMOR_ICONS: Record<HumorStyle, string> = {
  self_deprecating: "😅",
  observational: "🔍",
  dry_wit: "😏",
  playful_tease: "😜",
  naked_truth: "💯",
  absurdist: "🤪",
  confident_swagger: "😎",
  none: "😐",
};

export function GiannaPersonalitySelector({
  onSelect,
  onGenerateMessage,
  leadContext,
  showPreview = true,
}: PersonalitySelectorProps) {
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityArchetype>("brooklyn_bestie");
  const [humorOverride, setHumorOverride] = useState<number | null>(null);
  const [directnessOverride, setDirectnessOverride] = useState<number | null>(null);
  const [previewMessage, setPreviewMessage] = useState<string>("");

  const personality = PERSONALITY_ARCHETYPES[selectedPersonality];

  const effectiveHumor = humorOverride ?? personality.humor;
  const effectiveDirectness = directnessOverride ?? personality.directness;

  // Generate preview message
  const generatePreview = () => {
    if (!leadContext) return;

    const context: ConversationContext = {
      firstName: leadContext.firstName,
      companyName: leadContext.companyName,
      industry: leadContext.industry,
      stage: "cold_open",
      messageNumber: 1,
      preferredPersonality: selectedPersonality,
      humorLevel: humorOverride ?? undefined,
    };

    const result = generateMessageWithDNA(context);
    setPreviewMessage(result.message);

    if (onGenerateMessage) {
      onGenerateMessage(result.message, selectedPersonality);
    }
  };

  // Handle personality selection
  const handleSelect = (id: PersonalityArchetype) => {
    setSelectedPersonality(id);
    const p = PERSONALITY_ARCHETYPES[id];
    if (onSelect) {
      onSelect(p);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-900 rounded-xl border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Gianna Personality DNA</h2>
          <p className="text-gray-400 text-sm">Select how Gianna communicates</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{ARCHETYPE_ICONS[selectedPersonality]}</span>
          <span className="text-white font-medium">{personality.name}</span>
        </div>
      </div>

      {/* Personality Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(PERSONALITY_ARCHETYPES).map(([id, p]) => (
          <button
            key={id}
            onClick={() => handleSelect(id as PersonalityArchetype)}
            className={`p-4 rounded-lg border transition-all text-left ${
              selectedPersonality === id
                ? "border-purple-500 bg-purple-500/10"
                : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{ARCHETYPE_ICONS[id as PersonalityArchetype]}</span>
              <span className="text-white font-medium text-sm">{p.name}</span>
            </div>
            <p className="text-gray-400 text-xs line-clamp-2">{p.tagline}</p>
          </button>
        ))}
      </div>

      {/* Selected Personality Details */}
      <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
        <div>
          <h3 className="text-white font-medium mb-1">{personality.name}</h3>
          <p className="text-gray-400 text-sm">{personality.description}</p>
        </div>

        {/* Trait Bars */}
        <div className="grid grid-cols-2 gap-4">
          <TraitBar label="Warmth" value={personality.warmth} color="pink" />
          <TraitBar label="Directness" value={effectiveDirectness} color="blue" />
          <TraitBar label="Humor" value={effectiveHumor} color="yellow" />
          <TraitBar label="Energy" value={personality.energy} color="green" />
          <TraitBar label="Assertiveness" value={personality.assertiveness} color="purple" />
        </div>

        {/* Humor Styles */}
        <div>
          <h4 className="text-gray-300 text-sm font-medium mb-2">Humor Styles</h4>
          <div className="flex flex-wrap gap-2">
            {personality.humorStyles.map((style) => (
              <span
                key={style}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700 rounded text-xs text-gray-300"
              >
                {HUMOR_ICONS[style]} {style.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>

        {/* Signature Phrases */}
        <div>
          <h4 className="text-gray-300 text-sm font-medium mb-2">Signature Phrases</h4>
          <div className="flex flex-wrap gap-2">
            {personality.signaturePhrases.slice(0, 5).map((phrase, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-gray-700/50 rounded text-xs text-gray-400 italic"
              >
                "{phrase}"
              </span>
            ))}
          </div>
        </div>

        {/* Best For */}
        <div>
          <h4 className="text-gray-300 text-sm font-medium mb-2">Best For</h4>
          <div className="flex flex-wrap gap-2">
            {personality.bestFor.map((use, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-xs text-purple-300"
              >
                {use}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Override Sliders */}
      <div className="space-y-4">
        <h3 className="text-white font-medium">Fine-Tune (Optional)</h3>

        <div className="space-y-3">
          <SliderControl
            label="Humor Level"
            value={humorOverride ?? personality.humor}
            onChange={(v) => setHumorOverride(v)}
            onReset={() => setHumorOverride(null)}
            hasOverride={humorOverride !== null}
          />
          <SliderControl
            label="Directness"
            value={directnessOverride ?? personality.directness}
            onChange={(v) => setDirectnessOverride(v)}
            onReset={() => setDirectnessOverride(null)}
            hasOverride={directnessOverride !== null}
          />
        </div>
      </div>

      {/* Preview Section */}
      {showPreview && leadContext && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium">Message Preview</h3>
            <button
              onClick={generatePreview}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-colors"
            >
              Generate Preview
            </button>
          </div>

          {previewMessage && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-gray-200 text-sm leading-relaxed">{previewMessage}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>{previewMessage.length} characters</span>
                <span>
                  {previewMessage.length <= 160
                    ? "1 SMS segment"
                    : `${Math.ceil(previewMessage.length / 160)} SMS segments`}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Humor Samples */}
      <div className="space-y-3">
        <h3 className="text-white font-medium">Humor Samples</h3>
        <div className="grid gap-2">
          {personality.humorStyles.slice(0, 3).map((style) => {
            const humorData = HUMOR_DNA[style as keyof typeof HUMOR_DNA];
            if (!humorData || !("phrases" in humorData)) return null;

            return (
              <div key={style} className="bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span>{HUMOR_ICONS[style]}</span>
                  <span className="text-gray-300 text-sm font-medium capitalize">
                    {style.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-gray-400 text-sm italic">
                  "{humorData.phrases[0]}"
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function TraitBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "pink" | "blue" | "yellow" | "green" | "purple";
}) {
  const colorClasses = {
    pink: "bg-pink-500",
    blue: "bg-blue-500",
    yellow: "bg-yellow-500",
    green: "bg-green-500",
    purple: "bg-purple-500",
  };

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-500">{value}</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} rounded-full transition-all duration-300`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function SliderControl({
  label,
  value,
  onChange,
  onReset,
  hasOverride,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onReset: () => void;
  hasOverride: boolean;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-gray-400 text-sm w-24">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
      />
      <span className="text-gray-500 text-sm w-8">{value}</span>
      {hasOverride && (
        <button
          onClick={onReset}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          Reset
        </button>
      )}
    </div>
  );
}

export default GiannaPersonalitySelector;
