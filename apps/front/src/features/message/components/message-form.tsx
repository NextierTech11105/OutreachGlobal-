"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, MessageSquare, Phone, Clock, Save } from "lucide-react";
import { MessageType } from "@nextier/common";
import { Badge } from "@/components/ui/badge";
import { useCurrentTeam } from "@/features/team/team.context";
import { useForm } from "@/lib/hook-form/hooks/use-form";
import { zodResolver } from "@/lib/hook-form/resolvers/zod";
import { CreateMessageDto, createMessageSchema } from "@nextier/dto";
import { useApiError } from "@/hooks/use-api-error";
import { useApolloClient, useMutation } from "@apollo/client";
import { CREATE_MESSAGE_MUTATION } from "../mutations/message.mutations";
import { useWatch } from "react-hook-form";
import { MESSAGES_EVICT } from "../queries/message.queries";
import { toast } from "sonner";

export interface MessageFormProps {
  onSend?: (replyText: string) => void | Promise<void>;
  onCancel?: () => void;
  name: string;
  address: string;
  type: MessageType;
  message?: {
    id: string;
    subject?: string;
    body?: string;
  };
  leadId?: string;
}

export function MessageForm({
  onSend,
  message,
  onCancel,
  name: defaultName,
  address: defaultAddress,
  type,
  leadId,
}: MessageFormProps) {
  const { team } = useCurrentTeam();
  const { register, registerError, handleSubmit, control } = useForm({
    resolver: zodResolver(createMessageSchema),
    defaultValues: {
      toName: defaultName,
      toAddress: defaultAddress,
      body: "",
    },
  });
  const [loading, setLoading] = useState(false);
  const { showError } = useApiError();
  const { cache } = useApolloClient();
  const [createMessage] = useMutation(CREATE_MESSAGE_MUTATION);
  const [replyText] = useWatch({ control, name: ["body"] });

  const sendMessage = async (input: CreateMessageDto) => {
    setLoading(true);
    try {
      await createMessage({
        variables: {
          teamId: team.id,
          leadId,
          type,
          input,
        },
      });
      cache.evict(MESSAGES_EVICT);
      toast.success("Message sent");
      onSend?.(replyText);
    } catch (error) {
      showError(error, { gql: true });
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case MessageType.EMAIL:
        return <Mail className="size-4" />;
      case MessageType.SMS:
        return <MessageSquare className="size-4" />;
      case MessageType.VOICE:
        return <Phone className="size-4" />;
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit(sendMessage)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              {!!message && (
                <CardTitle>Reply: {message.subject || "No Subject"}</CardTitle>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge>{getTypeIcon()}</Badge>
              {/* <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-1"
            >
              <FileText className="size-4" />
              <span>Templates</span>
            </Button> */}
              {/* <Button
              variant={useAI ? "default" : "outline"}
              size="sm"
              onClick={handleGenerateAIResponse}
              disabled={isGenerating}
              className="flex items-center gap-1"
            >
              <Sparkles className="size-4" />
              <span>{isGenerating ? "Generating..." : "AI Assist"}</span>
            </Button> */}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            To: {defaultName} {defaultAddress && `<${defaultAddress}>`}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {type === MessageType.EMAIL && (
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  {...register("subject")}
                  id="subject"
                  placeholder="Enter subject"
                  required
                />
              </div>
            )}

            {!!message?.body && (
              <div className="border-l-4 border-muted pl-4 mb-4 italic text-sm text-muted-foreground">
                <p>{message?.body}</p>
              </div>
            )}

            <Tabs defaultValue="compose">
              <TabsList className="mb-2">
                <TabsTrigger value="compose">Compose</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="compose">
                <Textarea
                  {...register("body")}
                  placeholder={`Type your ${type === MessageType.VOICE ? "voice script" : "reply"} here...`}
                  className="min-h-[200px] font-mono text-sm"
                />
              </TabsContent>
              <TabsContent value="preview">
                <div className="min-h-[200px] p-4 border rounded-md whitespace-pre-line">
                  {replyText || (
                    <span className="text-muted-foreground italic">
                      No content to preview
                    </span>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div>
                {type === MessageType.SMS && (
                  <span>{replyText.length} / 160 characters</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={!replyText?.trim()} loading={loading} type="submit">
            Send Message
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
