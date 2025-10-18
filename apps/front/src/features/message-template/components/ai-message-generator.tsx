"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AiMessageGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  messageType: "email" | "sms" | "voice";
  onGenerate: (content: any) => void;
}

export function AiMessageGenerator({
  isOpen,
  onClose,
  messageType,
  onGenerate,
}: AiMessageGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedPromptId, setSelectedPromptId] = useState<string>("custom");
  const [isGenerating, setIsGenerating] = useState(false);
  const [promptLibrary, setPromptLibrary] = useState<any[]>([]);
  const { toast } = useToast();

  // Fetch prompt library on open
  const fetchPromptLibrary = async () => {
    try {
      const response = await fetch(
        `/api/admin/prompt-library?type=${messageType}`,
      );
      if (response.ok) {
        const data = await response.json();
        setPromptLibrary(data.prompts);
      }
    } catch (error) {
      console.error("Error fetching prompt library:", error);
    }
  };

  const handlePromptSelect = (promptId: string) => {
    setSelectedPromptId(promptId);
    if (promptId === "custom") {
      setPrompt("");
      return;
    }

    const selectedPrompt = promptLibrary.find((p) => p.id === promptId);
    if (selectedPrompt) {
      setPrompt(selectedPrompt.prompt);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a prompt or select one from the library",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageType,
          prompt,
          promptId:
            selectedPromptId !== "custom" ? selectedPromptId : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate message");
      }

      const data = await response.json();

      // Format the response based on message type
      let formattedContent = {};

      if (messageType === "email") {
        formattedContent = {
          subject: data.subject,
          body: data.content,
        };
      } else if (messageType === "sms") {
        formattedContent = {
          smsText: data.content,
        };
      } else if (messageType === "voice") {
        formattedContent = {
          voiceScript: data.content,
        };
      }

      onGenerate(formattedContent);

      toast({
        title: "Message generated",
        description: "AI has successfully created your message content",
      });
    } catch (error) {
      console.error("Error generating message:", error);
      toast({
        title: "Generation failed",
        description:
          "There was an error generating your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (open) {
          fetchPromptLibrary();
        } else {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate{" "}
            {messageType.charAt(0).toUpperCase() + messageType.slice(1)} with AI
          </DialogTitle>
          <DialogDescription>
            Use AI to create compelling {messageType} content for your campaign
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="prompt-template">Prompt Template</Label>
            <Select value={selectedPromptId} onValueChange={handlePromptSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a prompt template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom Prompt</SelectItem>
                {promptLibrary.map((prompt) => (
                  <SelectItem key={prompt.id} value={prompt.id}>
                    {prompt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">Your Prompt</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Describe what kind of ${messageType} you want to generate...`}
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Include details about tone, purpose, target audience, and key
              points to cover.
            </p>
          </div>

          {messageType === "email" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email Type</Label>
                <Select defaultValue="outreach">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outreach">Initial Outreach</SelectItem>
                    <SelectItem value="followup">Follow-up</SelectItem>
                    <SelectItem value="nurture">Nurture</SelectItem>
                    <SelectItem value="conversion">Conversion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select defaultValue="professional">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {messageType === "sms" && (
            <div className="space-y-2">
              <Label>SMS Length</Label>
              <Select defaultValue="standard">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short (Under 100 chars)</SelectItem>
                  <SelectItem value="standard">
                    Standard (100-160 chars)
                  </SelectItem>
                  <SelectItem value="extended">
                    Extended (Multi-part SMS)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {messageType === "voice" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Script Duration</Label>
                <Select defaultValue="30sec">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15sec">15 seconds</SelectItem>
                    <SelectItem value="30sec">30 seconds</SelectItem>
                    <SelectItem value="60sec">60 seconds</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Voice Style</Label>
                <Select defaultValue="conversational">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conversational">
                      Conversational
                    </SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                    <SelectItem value="calm">Calm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
