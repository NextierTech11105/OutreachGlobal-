"use client";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalCloseX,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalPortal,
  ModalProps,
  ModalTitle,
} from "@/components/ui/modal";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCurrentTeam } from "@/features/team/team.context";
import { useSingleQuery } from "@/graphql/hooks/use-single-query";
import type { ImportLeadPresetsQuery } from "@/graphql/types";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import { IMPORT_LEAD_PRESETS_QUERY } from "../queries/import-lead-preset.queries";

type Preset = ImportLeadPresetsQuery["importLeadPresets"][number];

interface Props extends ModalProps {
  selectedPreset?: Preset | null;
  onPresetSelect?: (preset: Preset) => void;
}

export const LoadPresetModal: React.FC<Props> = ({
  onOpenChange,
  selectedPreset: defaultSelectedPreset,
  onPresetSelect,
  ...props
}) => {
  const { teamId, isTeamReady } = useCurrentTeam();
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(
    defaultSelectedPreset || null,
  );
  const [presets] = useSingleQuery(IMPORT_LEAD_PRESETS_QUERY, {
    pick: "importLeadPresets",
    variables: { teamId },
    skip: !isTeamReady,
  });

  const handlePresetChange = (presetId: string) => {
    const preset = presets?.find((value) => value.id === presetId);
    if (preset) {
      setSelectedPreset(preset);
    }
  };

  const handlePresetSelect = () => {
    if (!selectedPreset) {
      return toast.error("no selected preset");
    }
    onPresetSelect?.(selectedPreset);
    onOpenChange?.(false);
  };

  return (
    <Modal {...props} onOpenChange={onOpenChange}>
      <ModalContent widthClass="w-full lg:max-w-screen-md">
        <ModalHeader className="flex justify-between items-center">
          <ModalTitle>Select Preset</ModalTitle>
          <ModalCloseX />
        </ModalHeader>
        <ModalBody className="space-y-4">
          <RadioGroup
            value={selectedPreset?.id}
            onValueChange={handlePresetChange}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {presets?.map((preset) => (
                <Card
                  key={preset.id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedPreset?.id === preset.id ? "border-primary" : "",
                  )}
                  onClick={() => handlePresetChange(preset.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">
                            {preset.name}
                          </CardTitle>
                        </div>
                      </div>
                      <RadioGroupItem
                        value={preset.id}
                        id={preset.id}
                        className="mt-1"
                      />
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </RadioGroup>

          {!presets?.length && (
            <div className="flex h-[100px] items-center justify-center rounded-md border border-dashed">
              <div className="text-center">
                <h3 className="text-lg font-medium">No presets found</h3>
                <p className="text-sm text-muted-foreground">
                  Add a preset first
                </p>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter className="flex justify-end gap-x-2">
          <ModalClose asChild>
            <Button variant="outline">Cancel</Button>
          </ModalClose>

          <Button disabled={!selectedPreset} onClick={handlePresetSelect}>
            Select Preset
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
