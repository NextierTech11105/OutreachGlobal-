"use client";

import { useState, useEffect } from "react";
import { useCurrentTeam } from "@/features/team/team.context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  ExternalLink,
  Copy,
  Eye,
  Pencil,
  Trash2,
  Globe,
  FileText,
  Loader2,
  Layout,
  Droplets,
  Building,
} from "lucide-react";
import { toast } from "sonner";

/**
 * LANDING PAGES MANAGEMENT
 * ═══════════════════════════════════════════════════════════════════════════════
 * Create, edit, and publish landing pages from the Content Library
 *
 * Templates:
 * - Skyline: NYC blimp background, premium feel
 * - Watershed: Water flow animation, execution loop
 * - Minimal: Clean, simple, fast
 * - Bold: High contrast, attention-grabbing
 *
 * Each page gets a unique URL: /p/[slug]
 * ═══════════════════════════════════════════════════════════════════════════════
 */

interface LandingPage {
  id: string;
  slug: string;
  title: string;
  description?: string;
  template: string;
  status: "draft" | "published" | "archived";
  views?: number;
  conversions?: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

const TEMPLATE_INFO = {
  skyline: {
    name: "Skyline",
    description: "NYC background with premium feel",
    icon: Building,
    color: "bg-cyan-500",
  },
  watershed: {
    name: "Watershed",
    description: "Water flow animation, execution loop",
    icon: Droplets,
    color: "bg-blue-500",
  },
  minimal: {
    name: "Minimal",
    description: "Clean, simple, fast-loading",
    icon: Layout,
    color: "bg-gray-500",
  },
  bold: {
    name: "Bold",
    description: "High contrast, attention-grabbing",
    icon: FileText,
    color: "bg-purple-500",
  },
};

export default function LandingPagesPage() {
  const { teamId, isTeamReady } = useCurrentTeam();
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Create dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageTemplate, setNewPageTemplate] = useState("skyline");

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  // Fetch pages
  const fetchPages = async () => {
    if (!teamId || !isTeamReady) return;

    try {
      const response = await fetch(`/api/landing-pages?teamId=${teamId}`);
      if (response.ok) {
        const data = await response.json();
        setPages(data.pages || []);
      }
    } catch (error) {
      console.error("Failed to fetch pages:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, [teamId, isTeamReady]);

  // Create page
  const handleCreate = async () => {
    if (!newPageTitle.trim()) {
      toast.error("Please enter a title");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/landing-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          title: newPageTitle,
          template: newPageTemplate,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Landing page created!");
        setShowCreateDialog(false);
        setNewPageTitle("");
        fetchPages();

        // Open preview
        window.open(data.previewUrl, "_blank");
      } else {
        toast.error("Failed to create page");
      }
    } catch (error) {
      toast.error("Failed to create page");
    } finally {
      setCreating(false);
    }
  };

  // Publish/Unpublish page
  const handleTogglePublish = async (page: LandingPage) => {
    const newStatus = page.status === "published" ? "draft" : "published";

    try {
      const response = await fetch("/api/landing-pages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: page.id,
          status: newStatus,
        }),
      });

      if (response.ok) {
        toast.success(
          newStatus === "published" ? "Page published!" : "Page unpublished",
        );
        fetchPages();
      }
    } catch (error) {
      toast.error("Failed to update page");
    }
  };

  // Copy URL
  const copyUrl = (slug: string) => {
    const url = `${baseUrl}/p/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
  };

  // Delete page
  const handleDelete = async (page: LandingPage) => {
    if (!confirm(`Delete "${page.title}"? This cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/landing-pages?id=${page.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Page deleted");
        fetchPages();
      }
    } catch (error) {
      toast.error("Failed to delete page");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Landing Pages</h1>
          <p className="text-muted-foreground mt-1">
            Create and publish landing pages for your campaigns
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Landing Page
        </Button>
      </div>

      {/* Templates Quick Start */}
      {pages.length === 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">
            Choose a Template to Start
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(TEMPLATE_INFO).map(([key, info]) => {
              const Icon = info.icon;
              return (
                <Card
                  key={key}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => {
                    setNewPageTemplate(key);
                    setShowCreateDialog(true);
                  }}
                >
                  <CardContent className="p-6">
                    <div
                      className={`w-12 h-12 rounded-lg ${info.color} flex items-center justify-center mb-4`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold">{info.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {info.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Pages List */}
      {pages.length > 0 && (
        <div className="space-y-4">
          {pages.map((page) => {
            const template =
              TEMPLATE_INFO[page.template as keyof typeof TEMPLATE_INFO] ||
              TEMPLATE_INFO.minimal;
            const Icon = template.icon;

            return (
              <Card key={page.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-lg ${template.color} flex items-center justify-center flex-shrink-0`}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">
                            {page.title}
                          </h3>
                          <Badge
                            variant={
                              page.status === "published"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {page.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          /p/{page.slug}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>{page.views || 0} views</span>
                          <span>{page.conversions || 0} conversions</span>
                          <span>
                            Updated{" "}
                            {new Date(page.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Preview */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(`/p/${page.slug}?preview=true`, "_blank")
                        }
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      {/* Copy URL */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyUrl(page.slug)}
                        disabled={page.status !== "published"}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>

                      {/* Open Live */}
                      {page.status === "published" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            window.open(`/p/${page.slug}`, "_blank")
                          }
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}

                      {/* Publish/Unpublish */}
                      <Button
                        variant={
                          page.status === "published" ? "secondary" : "default"
                        }
                        size="sm"
                        onClick={() => handleTogglePublish(page)}
                      >
                        <Globe className="w-4 h-4 mr-1" />
                        {page.status === "published" ? "Unpublish" : "Publish"}
                      </Button>

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(page)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Landing Page</DialogTitle>
            <DialogDescription>
              Create a new landing page from a template
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Page Title</Label>
              <Input
                id="title"
                placeholder="e.g., Partnership Program"
                value={newPageTitle}
                onChange={(e) => setNewPageTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template">Template</Label>
              <Select
                value={newPageTemplate}
                onValueChange={setNewPageTemplate}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TEMPLATE_INFO).map(([key, info]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span>{info.name}</span>
                        <span className="text-muted-foreground">
                          - {info.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
