"use client";

import { Button } from "@/components/ui/button";

const options = [
  "{{lead.firstName}}",
  "{{lead.lastName}}",
  "{{lead.company}}",
  "{{lead.title}}",
];

interface Props {
  onInsert?: (value: string) => void;
}

export const MessageTemplateVariables: React.FC<Props> = ({ onInsert }) => {
  return (
    <>
      <div className="col-span-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            variant="outline"
            className="cursor-pointer hover:bg-secondary"
            onClick={() => onInsert?.(option)}
            key={option}
            size="xs"
          >
            {option}
          </Button>
        ))}
      </div>
    </>
  );
};
