"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Plus, X, Target } from "lucide-react";
import { PersonaMessage } from "../persona-avatar";
import type { OnboardingData } from "../onboarding-wizard";

/**
 * STEP 2: Define Your Ideal Audience
 * ═══════════════════════════════════════════════════════════════════════════════
 * Configure target roles, geography, company size, SIC codes
 * Shows "Audience Score" indicator for targeting precision
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

const COMPANY_SIZE_OPTIONS = [
  { value: "1-5", label: "1-5 employees" },
  { value: "5-10", label: "5-10 employees" },
  { value: "10-25", label: "10-25 employees" },
  { value: "25-50", label: "25-50 employees" },
  { value: "50-100", label: "50-100 employees" },
  { value: "100-500", label: "100-500 employees" },
  { value: "500+", label: "500+ employees" },
];

interface AudienceStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function AudienceStep({
  data,
  updateData,
  onNext,
  onBack,
}: AudienceStepProps) {
  const [newRole, setNewRole] = useState("");
  const [newSicCode, setNewSicCode] = useState("");
  const [newState, setNewState] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newZip, setNewZip] = useState("");

  const profile = data.audienceProfile;

  // Calculate audience score based on completeness
  const calculateScore = () => {
    let score = 0;
    if (profile.targetRoles.length > 0) score += 25;
    if (profile.targetRoles.length >= 3) score += 10;
    if (profile.sicCodes.length > 0) score += 20;
    if (profile.companySizeRange) score += 15;
    if (
      profile.geography.states.length > 0 ||
      profile.geography.cities.length > 0 ||
      profile.geography.zips.length > 0
    )
      score += 20;
    if (profile.revenueRange) score += 10;
    return Math.min(100, score);
  };

  const audienceScore = calculateScore();

  const updateProfile = (
    updates: Partial<OnboardingData["audienceProfile"]>,
  ) => {
    updateData({
      audienceProfile: { ...profile, ...updates },
    });
  };

  const addRole = () => {
    if (newRole && !profile.targetRoles.includes(newRole)) {
      updateProfile({ targetRoles: [...profile.targetRoles, newRole] });
      setNewRole("");
    }
  };

  const removeRole = (role: string) => {
    updateProfile({
      targetRoles: profile.targetRoles.filter((r) => r !== role),
    });
  };

  const addSicCode = () => {
    if (newSicCode && !profile.sicCodes.includes(newSicCode)) {
      updateProfile({ sicCodes: [...profile.sicCodes, newSicCode] });
      setNewSicCode("");
    }
  };

  const removeSicCode = (code: string) => {
    updateProfile({
      sicCodes: profile.sicCodes.filter((c) => c !== code),
    });
  };

  const addState = () => {
    if (newState && !profile.geography.states.includes(newState)) {
      updateProfile({
        geography: {
          ...profile.geography,
          states: [...profile.geography.states, newState],
        },
      });
      setNewState("");
    }
  };

  const removeState = (state: string) => {
    updateProfile({
      geography: {
        ...profile.geography,
        states: profile.geography.states.filter((s) => s !== state),
      },
    });
  };

  const addCity = () => {
    if (newCity && !profile.geography.cities.includes(newCity)) {
      updateProfile({
        geography: {
          ...profile.geography,
          cities: [...profile.geography.cities, newCity],
        },
      });
      setNewCity("");
    }
  };

  const removeCity = (city: string) => {
    updateProfile({
      geography: {
        ...profile.geography,
        cities: profile.geography.cities.filter((c) => c !== city),
      },
    });
  };

  const addZip = () => {
    if (newZip && !profile.geography.zips.includes(newZip)) {
      updateProfile({
        geography: {
          ...profile.geography,
          zips: [...profile.geography.zips, newZip],
        },
      });
      setNewZip("");
    }
  };

  const removeZip = (zip: string) => {
    updateProfile({
      geography: {
        ...profile.geography,
        zips: profile.geography.zips.filter((z) => z !== zip),
      },
    });
  };

  const canContinue = profile.targetRoles.length > 0;

  return (
    <div className="space-y-6">
      {/* Persona Introduction */}
      <PersonaMessage
        persona="GIANNA"
        message={`Perfect! Now let's dial in your ideal audience. I've pre-filled some defaults based on ${data.preset?.displayName || "your selection"}, but feel free to customize.`}
      />

      {/* Audience Score */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <span className="font-medium">Audience Score:</span>
        </div>
        <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${audienceScore}%` }}
          />
        </div>
        <span className="font-bold text-primary">{audienceScore}%</span>
      </div>

      {/* Target Roles */}
      <div className="space-y-2">
        <Label>Target Roles</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Add a role (e.g., Sales Manager)"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addRole()}
          />
          <Button variant="outline" size="icon" onClick={addRole}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile.targetRoles.map((role) => (
            <Badge
              key={role}
              variant="secondary"
              className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => removeRole(role)}
            >
              {role}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      </div>

      {/* Geography */}
      <div className="space-y-4">
        <Label>Geography</Label>

        {/* States */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">States</Label>
          <div className="flex gap-2">
            <Select value={newState} onValueChange={setNewState}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.filter(
                  (s) => !profile.geography.states.includes(s),
                ).map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={addState}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.geography.states.map((state) => (
              <Badge
                key={state}
                variant="secondary"
                className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => removeState(state)}
              >
                {state}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
        </div>

        {/* Cities */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Cities</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add a city"
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCity()}
            />
            <Button variant="outline" size="icon" onClick={addCity}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.geography.cities.map((city) => (
              <Badge
                key={city}
                variant="secondary"
                className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => removeCity(city)}
              >
                {city}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
        </div>

        {/* Zip Codes */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Zip Codes</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add a zip code"
              value={newZip}
              onChange={(e) => setNewZip(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addZip()}
            />
            <Button variant="outline" size="icon" onClick={addZip}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.geography.zips.map((zip) => (
              <Badge
                key={zip}
                variant="secondary"
                className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => removeZip(zip)}
              >
                {zip}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Company Size */}
      <div className="space-y-2">
        <Label>Company Size</Label>
        <Select
          value={profile.companySizeRange}
          onValueChange={(value) => updateProfile({ companySizeRange: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select company size" />
          </SelectTrigger>
          <SelectContent>
            {COMPANY_SIZE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* SIC Codes */}
      <div className="space-y-2">
        <Label>SIC Codes</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Add SIC code (e.g., 6531)"
            value={newSicCode}
            onChange={(e) => setNewSicCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSicCode()}
          />
          <Button variant="outline" size="icon" onClick={addSicCode}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile.sicCodes.map((code) => (
            <Badge
              key={code}
              variant="secondary"
              className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => removeSicCode(code)}
            >
              {code}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          SIC codes help identify companies by industry classification
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!canContinue} size="lg">
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
