"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Package,
  Check,
  X,
  Search,
  MessageSquare,
  Send,
  Building2,
  Wrench,
  Home,
  MessageCircle,
  Calendar,
  RefreshCw,
  Loader2,
  Eye,
  Copy,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileText,
} from "lucide-react";
import {
  cartridgeManager,
  CARTRIDGE_LIBRARY,
  type TemplateCartridge,
  type SMSTemplate,
  TemplateLifecycle,
} from "@/lib/sms/template-cartridges";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ═══════════════════════════════════════════════════════════════════════════
// CARTRIDGE ICON MAP
// ═══════════════════════════════════════════════════════════════════════════

const CARTRIDGE_ICONS: Record<string, React.ReactNode> = {
  "business-brokering": <Building2 className="h-5 w-5" />,
  "crm-consultants": <Sparkles className="h-5 w-5" />,
  "blue-collar": <Wrench className="h-5 w-5" />,
  "real-estate": <Home className="h-5 w-5" />,
  "cathy-nudge": <MessageCircle className="h-5 w-5" />,
  "sabrina-objection": <MessageSquare className="h-5 w-5" />,
  "sabrina-booking": <Calendar className="h-5 w-5" />,
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function CartridgesPage() {
  const [cartridges, setCartridges] = useState<
    Array<{
      id: string;
      name: string;
      active: boolean;
      templateCount: number;
    }>
  >([]);
  const [selectedCartridge, setSelectedCartridge] =
    useState<TemplateCartridge | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load cartridges on mount
  useEffect(() => {
    loadCartridges();
  }, []);

  const loadCartridges = () => {
    setIsLoading(true);
    const list = cartridgeManager.listCartridges();
    setCartridges(list);
    setIsLoading(false);
  };

  const handleToggleCartridge = (cartridgeId: string, active: boolean) => {
    if (active) {
      cartridgeManager.activate(cartridgeId);
      toast.success(`Activated: ${cartridgeId}`);
    } else {
      cartridgeManager.deactivate(cartridgeId);
      toast.success(`Deactivated: ${cartridgeId}`);
    }
    loadCartridges();
  };

  const handleResetToDefaults = () => {
    cartridgeManager.resetToDefault();
    toast.success("Reset to default cartridges");
    loadCartridges();
  };

  const handleAutoActivate = (industry: string) => {
    const activated = cartridgeManager.autoActivateForIndustry(industry);
    if (activated.length > 0) {
      toast.success(
        `Auto-activated ${activated.length} cartridge(s) for "${industry}"`,
      );
    } else {
      toast.info(`No cartridges match industry "${industry}"`);
    }
    loadCartridges();
  };

  const handleCopyTemplateId = (templateId: string) => {
    navigator.clipboard.writeText(templateId);
    setCopiedId(templateId);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success(`Copied: ${templateId}`);
  };

  const getFullCartridge = (
    cartridgeId: string,
  ): TemplateCartridge | undefined => {
    return CARTRIDGE_LIBRARY.find((c) => c.id === cartridgeId);
  };

  const activeCount = cartridges.filter((c) => c.active).length;
  const totalTemplates = cartridges
    .filter((c) => c.active)
    .reduce((sum, c) => sum + c.templateCount, 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Template Cartridges
          </h1>
          <p className="text-muted-foreground mt-1">
            Activate modular SMS template packs for your campaigns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadCartridges}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleResetToDefaults}>
            Reset Defaults
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Cartridges
                </p>
                <p className="text-2xl font-bold">
                  {activeCount} / {cartridges.length}
                </p>
              </div>
              <Package className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Available Templates
                </p>
                <p className="text-2xl font-bold">{totalTemplates}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  SignalHouse Status
                </p>
                <p className="text-2xl font-bold text-green-500">Connected</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auto-Activate by Industry */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Auto-Activate by Industry</CardTitle>
          <CardDescription>
            Quickly activate all cartridges that match an industry keyword
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {[
              "construction",
              "technology",
              "real estate",
              "professional services",
              "healthcare",
            ].map((industry) => (
              <Button
                key={industry}
                variant="outline"
                size="sm"
                onClick={() => handleAutoActivate(industry)}
              >
                {industry}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cartridge Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          cartridges.map((cartridge) => {
            const fullCartridge = getFullCartridge(cartridge.id);
            return (
              <Card
                key={cartridge.id}
                className={`transition-all ${cartridge.active ? "border-primary/50 bg-primary/5" : ""}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-2 rounded-lg ${cartridge.active ? "bg-primary/20" : "bg-muted"}`}
                      >
                        {CARTRIDGE_ICONS[cartridge.id] || (
                          <Package className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {cartridge.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {cartridge.id}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={cartridge.active}
                      onCheckedChange={(checked) =>
                        handleToggleCartridge(cartridge.id, checked)
                      }
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {fullCartridge?.description || "No description"}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge variant={cartridge.active ? "default" : "secondary"}>
                      {cartridge.templateCount} templates
                    </Badge>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setSelectedCartridge(fullCartridge || null)
                          }
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh]">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            {CARTRIDGE_ICONS[cartridge.id] || (
                              <Package className="h-5 w-5" />
                            )}
                            {cartridge.name}
                          </DialogTitle>
                          <DialogDescription>
                            {fullCartridge?.audience}
                          </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="h-[400px] pr-4">
                          <div className="space-y-3">
                            {fullCartridge?.templates.map((template) => (
                              <Card key={template.id} className="p-3">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <p className="font-medium text-sm">
                                      {template.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      ID: {template.id} • {template.charCount}{" "}
                                      chars • {template.worker}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() =>
                                      handleCopyTemplateId(template.id)
                                    }
                                  >
                                    {copiedId === template.id ? (
                                      <Check className="h-3 w-3 text-green-500" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                                <p className="text-sm bg-muted p-2 rounded text-muted-foreground">
                                  {template.message}
                                </p>
                                <div className="flex gap-1 mt-2 flex-wrap">
                                  <Badge variant="outline" className="text-xs">
                                    {template.stage}
                                  </Badge>
                                  {template.tags.slice(0, 3).map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </Card>
                            ))}
                          </div>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {fullCartridge?.sicCodes && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {fullCartridge.sicCodes.slice(0, 3).map((sic) => (
                        <Badge key={sic} variant="outline" className="text-xs">
                          SIC: {sic}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            How to Use Cartridges
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>1. Activate Cartridges</strong> - Toggle on the cartridges
            that match your campaign audience
          </p>
          <p>
            <strong>2. Preview Templates</strong> - Click "Preview" to see all
            templates in a cartridge
          </p>
          <p>
            <strong>3. Copy Template IDs</strong> - Use template IDs when
            creating campaigns
          </p>
          <p>
            <strong>4. Auto-Activate</strong> - Use industry buttons to activate
            matching cartridges automatically
          </p>
          <p>
            <strong>5. SignalHouse Sync</strong> - Active templates are synced
            with SignalHouse for 10DLC compliance
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
