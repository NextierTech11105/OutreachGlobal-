"use client";

import { CardFooter } from "@/components/ui/card";

// Update imports to include the AI assistant service
import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Search, Copy, Tag, Clock, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getAIAssistantItems,
  type AIAssistantItem,
  type AIAssistantCategory,
} from "@/lib/services/ai-assistant-service";

interface AiAssistantProps {
  leadInfo: {
    name: string;
    phone: string;
    company: string;
    position: string;
    location: string;
    source: string;
    status: string;
    campaignId: string;
  };
  isCallActive: boolean;
  callStatus: string;
}

// Change the export name to match what's being imported in power-dialer.tsx
export function AiAssistant({
  leadInfo,
  isCallActive,
  callStatus,
}: AiAssistantProps) {
  const [activeTab, setActiveTab] = useState<AIAssistantCategory>("scripts");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<AIAssistantItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<AIAssistantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<AIAssistantItem | null>(
    null,
  );

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getAIAssistantItems(activeTab);
        setItems(data);
        setFilteredItems(data);
      } catch (error) {
        console.error("Error fetching AI assistant data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredItems(items);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredItems(
        items.filter(
          (item) =>
            item.title.toLowerCase().includes(query) ||
            item.content.toLowerCase().includes(query) ||
            item.tags.some((tag) => tag.toLowerCase().includes(query)),
        ),
      );
    }
  }, [searchQuery, items]);

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        // Could add a toast notification here
        console.log("Copied to clipboard");
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  };

  const getTabTitle = (category: AIAssistantCategory): string => {
    switch (category) {
      case "scripts":
        return "Scripts";
      case "objections":
        return "Objections";
      case "keyPoints":
        return "Key Points";
      default:
        return "Scripts";
    }
  };

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-3">
        <CardTitle>AI Assistant</CardTitle>
        <CardDescription>
          Access scripts, objection handlers, and key information
        </CardDescription>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs
          defaultValue="scripts"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as AIAssistantCategory)}
        >
          <TabsList className="grid grid-cols-3 mx-6">
            <TabsTrigger value="scripts">Scripts</TabsTrigger>
            <TabsTrigger value="objections">Objections</TabsTrigger>
            <TabsTrigger value="keyPoints">Key Points</TabsTrigger>
          </TabsList>

          <div className="px-6 py-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium">{getTabTitle(activeTab)}</h3>
              <Button variant="outline" size="sm" asChild>
                <a href="/campaigns/voice/manage">Manage</a>
              </Button>
            </div>

            <ScrollArea className="h-[300px] pr-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">
                    No items found
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-md border cursor-pointer transition-colors ${
                        selectedItem?.id === item.id
                          ? "bg-muted border-primary"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm">{item.title}</h4>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {item.content}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex flex-wrap gap-1">
                          {item.tags.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {item.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{item.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                        <div className="ml-auto flex items-center text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(item.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </Tabs>
      </CardContent>
      {selectedItem && (
        <CardFooter className="flex flex-col items-start border-t p-6">
          <div className="flex justify-between items-center w-full">
            <h3 className="font-medium">{selectedItem.title}</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCopyToClipboard(selectedItem.content)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Separator className="my-2" />
          <ScrollArea className="w-full h-[120px]">
            <p className="text-sm">{selectedItem.content}</p>
          </ScrollArea>
          <div className="flex flex-wrap gap-1 mt-3">
            {selectedItem.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
