"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ChevronRight, Database, Layers, Search } from "lucide-react";
import {
  SECTOR_WORKSPACES,
  Sector,
  SectorWorkspace,
  getAllSectors,
} from "@/config/sectors";

interface SectorWorkspaceSelectorProps {
  onSelectSector: (sector: Sector) => void;
  selectedSectorId?: string;
  showTrigger?: boolean;
}

export function SectorWorkspaceSelector({
  onSelectSector,
  selectedSectorId,
  showTrigger = true,
}: SectorWorkspaceSelectorProps) {
  const [open, setOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<string>("real_estate");

  const selectedSector = selectedSectorId
    ? getAllSectors().find((s) => s.id === selectedSectorId)
    : null;

  const handleSelectSector = (sector: Sector) => {
    onSelectSector(sector);
    setOpen(false);
  };

  const SectorCard = ({ sector }: { sector: Sector }) => {
    const Icon = sector.icon;
    const isSelected = selectedSectorId === sector.id;

    return (
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          isSelected && "ring-2 ring-primary"
        )}
        onClick={() => handleSelectSector(sector)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className={cn("p-2 rounded-lg", sector.bgColor)}>
              <Icon className={cn("h-5 w-5", sector.color)} />
            </div>
            {isSelected && (
              <Badge variant="default" className="text-xs">
                Active
              </Badge>
            )}
          </div>
          <CardTitle className="text-sm mt-2">{sector.name}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">{sector.description}</p>
          {sector.leadTypes && sector.leadTypes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {sector.leadTypes.map((type) => (
                <Badge key={type} variant="outline" className="text-xs">
                  {type.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          )}
          {sector.sicCodes && sector.sicCodes.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              SIC: {sector.sicCodes.slice(0, 3).join(", ")}
              {sector.sicCodes.length > 3 && ` +${sector.sicCodes.length - 3}`}
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  const WorkspaceTab = ({ workspace }: { workspace: SectorWorkspace }) => {
    const Icon = workspace.icon;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Icon className={cn("h-5 w-5", workspace.color)} />
          <div>
            <h3 className="font-semibold">{workspace.name}</h3>
            <p className="text-sm text-muted-foreground">
              {workspace.description}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {workspace.sectors.map((sector) => (
            <SectorCard key={sector.id} sector={sector} />
          ))}
        </div>
      </div>
    );
  };

  const content = (
    <Tabs
      defaultValue={activeWorkspace}
      onValueChange={setActiveWorkspace}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-4">
        {SECTOR_WORKSPACES.map((ws) => {
          const Icon = ws.icon;
          return (
            <TabsTrigger
              key={ws.id}
              value={ws.id}
              className="flex items-center gap-1"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{ws.name}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
      <ScrollArea className="h-[500px] mt-4">
        {SECTOR_WORKSPACES.map((ws) => (
          <TabsContent key={ws.id} value={ws.id} className="mt-0">
            <WorkspaceTab workspace={ws} />
          </TabsContent>
        ))}
      </ScrollArea>
    </Tabs>
  );

  if (!showTrigger) {
    return content;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Layers className="h-4 w-4" />
          {selectedSector ? (
            <>
              <span className="hidden sm:inline">{selectedSector.shortName}</span>
              <Badge variant="secondary" className="ml-1">
                {selectedSector.category.replace(/_/g, " ")}
              </Badge>
            </>
          ) : (
            <span>Select Sector</span>
          )}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Sector Workspaces
          </SheetTitle>
          <SheetDescription>
            Select a sector to filter your property search and leads
          </SheetDescription>
        </SheetHeader>
        <Separator className="my-4" />
        {content}
      </SheetContent>
    </Sheet>
  );
}

// Quick sector badges for inline display
export function SectorBadges({
  sectors,
  onRemove,
}: {
  sectors: Sector[];
  onRemove?: (sectorId: string) => void;
}) {
  if (sectors.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {sectors.map((sector) => {
        const Icon = sector.icon;
        return (
          <Badge
            key={sector.id}
            variant="secondary"
            className={cn("gap-1", sector.bgColor, sector.color)}
          >
            <Icon className="h-3 w-3" />
            {sector.shortName}
            {onRemove && (
              <button
                onClick={() => onRemove(sector.id)}
                className="ml-1 hover:text-destructive"
              >
                &times;
              </button>
            )}
          </Badge>
        );
      })}
    </div>
  );
}
