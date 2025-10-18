"use client";

import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Mail, MessageSquare, Phone, Trash2, GripVertical } from "lucide-react";
import { CampaignDto } from "@nextier/dto";
import { useFormContext } from "@/lib/hook-form/form-provider";
import { Label } from "@/components/ui/label";

type Sequence = CampaignDto["sequences"][number];

interface Props {
  sequences?: Sequence[];
  onChange?: (messages: Sequence[]) => void;
}

const getMessageIcon = (type: string) => {
  switch (type) {
    case "EMAIL":
      return <Mail className="h-4 w-4" />;
    case "SMS":
      return <MessageSquare className="h-4 w-4" />;
    case "VOICE":
      return <Phone className="h-4 w-4" />;
    default:
      return <Mail className="h-4 w-4" />;
  }
};

export function CampaignSequenceBuilder({ sequences = [], onChange }: Props) {
  const { register } = useFormContext<CampaignDto>();

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(sequences);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onChange?.(
      items.map((item, index) => ({
        ...item,
        position: index + 1,
      })),
    );
  };

  const handleDeleteMessage = (sequence: Sequence) => {
    const updatedSequences = sequences.filter((msg) => msg.id !== sequence.id);
    onChange?.(updatedSequences);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="messages">
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="space-y-3"
          >
            {sequences.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <p className="text-muted-foreground mb-4">
                    No messages added to this campaign yet
                  </p>
                </CardContent>
              </Card>
            ) : (
              sequences.map((sequence, index) => (
                <Draggable
                  key={sequence.id || index}
                  draggableId={sequence.id || String(index)}
                  index={index}
                >
                  {(provided) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="border"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            {...provided.dragHandleProps}
                            className="cursor-grab"
                          >
                            <GripVertical className="h-5 w-5 text-muted-foreground" />
                          </div>

                          <div className="flex items-center gap-2 ml-2">
                            {getMessageIcon(sequence.type)}
                            <span className="font-medium">{sequence.name}</span>
                          </div>

                          <div className="ml-auto flex items-center gap-2">
                            {/* <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditMessage(sequence)}
                            >
                              Edit
                            </Button> */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMessage(sequence)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <Label>Delay Hours</Label>
                            <div className="flex items-center gap-1">
                              <Input
                                {...register(`sequences.${index}.delayHours`, {
                                  $number: true,
                                })}
                                type="number"
                                className="w-16 h-8"
                                min={0}
                                required
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Label>Delay Days</Label>
                            <div className="flex items-center gap-1">
                              <Input
                                {...register(`sequences.${index}.delayDays`, {
                                  $number: true,
                                })}
                                type="number"
                                min={0}
                                className="w-16 h-8"
                                required
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </Draggable>
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
