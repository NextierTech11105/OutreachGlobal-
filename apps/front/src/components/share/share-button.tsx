"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Share2,
  Copy,
  Check,
  Link2,
  Mail,
  Clock,
  Shield,
  Loader2,
  ExternalLink,
  Users,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";

interface ShareButtonProps {
  resourceType:
    | "lead"
    | "valuation_report"
    | "property"
    | "bucket"
    | "campaign";
  resourceId: string;
  resourceName?: string;
  variant?: "button" | "icon" | "dropdown";
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function ShareButton({
  resourceType,
  resourceId,
  resourceName,
  variant = "button",
  size = "default",
  className,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Options
  const [isPublic, setIsPublic] = useState(true);
  const [expiresIn, setExpiresIn] = useState<number | null>(null); // hours
  const [allowedEmails, setAllowedEmails] = useState("");

  const createShareLink = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceType,
          resourceId,
          isPublic,
          requireAuth: !isPublic,
          expiresInHours: expiresIn,
          allowedEmails: allowedEmails
            ? allowedEmails.split(",").map((e) => e.trim())
            : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create share link");
      }

      setShareUrl(data.shareLink.url);
      toast.success("Share link created!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create link",
      );
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const resetState = () => {
    setShareUrl(null);
    setCopied(false);
    setIsPublic(true);
    setExpiresIn(null);
    setAllowedEmails("");
  };

  const triggerElement = () => {
    if (variant === "icon") {
      return (
        <Button variant="ghost" size="icon" className={className}>
          <Share2 className="h-4 w-4" />
        </Button>
      );
    }
    if (variant === "dropdown") {
      return (
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </DropdownMenuItem>
      );
    }
    return (
      <Button variant="outline" size={size} className={className}>
        <Share2 className="mr-2 h-4 w-4" />
        Share
      </Button>
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) resetState();
      }}
    >
      <DialogTrigger asChild>{triggerElement()}</DialogTrigger>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-blue-400" />
            Share {resourceType.replace("_", " ")}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {resourceName
              ? `Share "${resourceName}" with your team or externally`
              : "Create a shareable link"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!shareUrl ? (
            <>
              {/* Public/Private Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Public Link</Label>
                  <p className="text-xs text-zinc-500">
                    Anyone with the link can view
                  </p>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>

              {/* Expiration */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Link Expiration
                </Label>
                <div className="flex gap-2">
                  {[
                    { label: "Never", value: null },
                    { label: "1 hour", value: 1 },
                    { label: "24 hours", value: 24 },
                    { label: "7 days", value: 168 },
                    { label: "30 days", value: 720 },
                  ].map((opt) => (
                    <Button
                      key={opt.label}
                      variant={expiresIn === opt.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setExpiresIn(opt.value)}
                      className="flex-1"
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Allowed Emails (if not public) */}
              {!isPublic && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Allowed Emails
                  </Label>
                  <Input
                    placeholder="email1@example.com, email2@example.com"
                    value={allowedEmails}
                    onChange={(e) => setAllowedEmails(e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                  />
                  <p className="text-xs text-zinc-500">
                    Comma-separated list of emails that can view this link
                  </p>
                </div>
              )}

              {/* Create Button */}
              <Button
                onClick={createShareLink}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Link2 className="mr-2 h-4 w-4" />
                    Create Share Link
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {/* Share URL Display */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Share Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="bg-zinc-800 border-zinc-700 text-zinc-300"
                  />
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Link Info */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  {isPublic ? "Public" : "Private"}
                </Badge>
                {expiresIn && (
                  <Badge variant="outline" className="text-xs">
                    Expires in {expiresIn}h
                  </Badge>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(shareUrl, "_blank")}
                  className="flex-1"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.open(
                      `mailto:?subject=Shared ${resourceType}&body=Check out this ${resourceType}: ${shareUrl}`,
                      "_blank",
                    );
                  }}
                  className="flex-1"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </Button>
              </div>

              {/* Create Another */}
              <Button
                variant="ghost"
                size="sm"
                onClick={resetState}
                className="w-full text-zinc-400"
              >
                Create Another Link
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Quick share function for programmatic use
export async function quickShare(
  resourceType: ShareButtonProps["resourceType"],
  resourceId: string,
  options?: {
    isPublic?: boolean;
    expiresInHours?: number;
  },
): Promise<{ url: string; token: string } | null> {
  try {
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resourceType,
        resourceId,
        isPublic: options?.isPublic ?? true,
        requireAuth: !(options?.isPublic ?? true),
        expiresInHours: options?.expiresInHours,
      }),
    });

    const data = await res.json();
    if (!res.ok) return null;

    return {
      url: data.shareLink.url,
      token: data.shareLink.token,
    };
  } catch {
    return null;
  }
}
