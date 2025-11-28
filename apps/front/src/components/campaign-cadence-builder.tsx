"use client";

import { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Trash2,
  GripVertical,
  Clock,
} from "lucide-react";
import { MultiChannelMessageEditor } from "./multi-channel-message-editor";

interface Message {
  id: string;
  name: string;
  type: "email" | "sms" | "voice";
  subject?: string;
  body?: string;
  voiceScript?: string;
  smsText?: string;
  delay: number;
  delayUnit: "hours" | "days";
}

interface CampaignCadenceBuilderProps {
  initialMessages?: Message[];
  onChange: (messages: Message[]) => void;
}

export function CampaignCadenceBuilder({
  initialMessages = [],
  onChange,
}: CampaignCadenceBuilderProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(messages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setMessages(items);
    onChange(items);
  };

  const handleAddMessage = () => {
    setEditingMessage(null);
    setIsDialogOpen(true);
  };

  const handleEditMessage = (message: Message) => {
    setEditingMessage(message);
    setIsDialogOpen(true);
  };

  const handleDeleteMessage = (id: string) => {
    const updatedMessages = messages.filter((msg) => msg.id !== id);
    setMessages(updatedMessages);
    onChange(updatedMessages);
  };

  const handleSaveMessage = (messageData: any) => {
    let updatedMessages: Message[];

    if (editingMessage) {
      // Editing existing message
      updatedMessages = messages.map((msg) =>
        msg.id === messageData.id ? { ...msg, ...messageData } : msg,
      );
    } else {
      // Adding new message
      const newMessage: Message = {
        ...messageData,
        delay: 1,
        delayUnit: "days",
      };
      updatedMessages = [...messages, newMessage];
    }

    setMessages(updatedMessages);
    onChange(updatedMessages);
    setIsDialogOpen(false);
  };

  const handleDelayChange = (
    id: string,
    field: "delay" | "delayUnit",
    value: any,
  ) => {
    const updatedMessages = messages.map((msg) =>
      msg.id === id ? { ...msg, [field]: value } : msg,
    );
    setMessages(updatedMessages);
    onChange(updatedMessages);
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "sms":
        return <MessageSquare className="h-4 w-4" />;
      case "voice":
        return <Phone className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Campaign Cadence</h3>
        <Button onClick={handleAddMessage} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span>Add Message</span>
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="messages">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-3"
            >
              {messages.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center p-6">
                    <p className="text-muted-foreground mb-4">
                      No messages added to this campaign yet
                    </p>
                    <Button onClick={handleAddMessage} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Message
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                messages.map((message, index) => (
                  <Draggable
                    key={message.id}
                    draggableId={message.id}
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

                            {index === 0 ? (
                              <div className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                                Initial
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min="1"
                                    value={message.delay}
                                    onChange={(e) =>
                                      handleDelayChange(
                                        message.id,
                                        "delay",
                                        Number.parseInt(e.target.value) || 1,
                                      )
                                    }
                                    className="w-16 h-8"
                                  />
                                  <Select
                                    value={message.delayUnit}
                                    onValueChange={(value) =>
                                      handleDelayChange(
                                        message.id,
                                        "delayUnit",
                                        value,
                                      )
                                    }
                                  >
                                    <SelectTrigger className="w-24 h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="hours">
                                        Hours
                                      </SelectItem>
                                      <SelectItem value="days">Days</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <span className="text-sm text-muted-foreground">
                                    after previous
                                  </span>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-2 ml-2">
                              {getMessageIcon(message.type)}
                              <span className="font-medium">
                                {message.name}
                              </span>
                            </div>

                            <div className="ml-auto flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditMessage(message)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteMessage(message.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl bg-black text-white border-gray-800">
          <MultiChannelMessageEditor
            messageId={editingMessage?.id}
            initialData={editingMessage || undefined}
            onSave={handleSaveMessage}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
