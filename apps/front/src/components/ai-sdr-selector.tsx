"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APP_NAME, AI_ASSISTANT_NAME } from "@/config/branding";

interface AiSdr {
  id: string;
  name: string;
  model: string;
  description: string;
  industry: string;
  tags: string[];
  avatar: string;
  mission: string;
  goal: string;
  role: string[];
  faqs: { question: string; answer: string }[];
}

interface AiSdrSelectorProps {
  selectedAiSdrId: string | null;
  onSelectAiSdr: (id: string) => void;
}

export function AiSdrSelector({
  selectedAiSdrId,
  onSelectAiSdr,
}: AiSdrSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSdr, setSelectedSdr] = useState<AiSdr | null>(null);
  const [aiSdrs, setAiSdrs] = useState<AiSdr[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAiSdrs() {
      setLoading(true);
      try {
        const res = await fetch("/api/ai-sdr");
        if (res.ok) {
          const data = await res.json();
          setAiSdrs(data.sdrs || data || []);
        }
      } catch (error) {
        console.error("Failed to fetch AI SDRs:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAiSdrs();
  }, []);

  const filteredSdrs = aiSdrs.filter((sdr) => {
    const matchesSearch =
      sdr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sdr.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sdr.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    const matchesIndustry =
      industryFilter === "all" || sdr.industry === industryFilter;

    return matchesSearch && matchesIndustry;
  });

  const handleViewDetails = (sdr: (typeof aiSdrs)[0], e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSdr(sdr);
    setDetailsOpen(true);
  };

  const handleSelectSdr = (id: string) => {
    onSelectAiSdr(id);
    setDetailsOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Select AI SDR Avatar</h3>
        <div className="flex items-center space-x-2">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search avatars..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Tabs
        defaultValue="all"
        value={industryFilter}
        onValueChange={setIndustryFilter}
      >
        <TabsList>
          <TabsTrigger value="all">All Industries</TabsTrigger>
          <TabsTrigger value="real-estate">Real Estate</TabsTrigger>
          <TabsTrigger value="commercial">Commercial</TabsTrigger>
          <TabsTrigger value="residential">Residential</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filteredSdrs.map((sdr) => (
          <Card
            key={sdr.id}
            className={`cursor-pointer transition-all hover:border-primary ${selectedAiSdrId === sdr.id ? "border-2 border-primary" : ""}`}
            onClick={() => handleSelectSdr(sdr.id)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2">
                <Avatar>
                  <AvatarImage
                    src={sdr.avatar || "/placeholder.svg"}
                    alt={sdr.name}
                  />
                  <AvatarFallback>{sdr.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-sm font-medium">
                    {sdr.name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {sdr.model}
                  </CardDescription>
                </div>
              </div>
              {selectedAiSdrId === sdr.id && (
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  Selected
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm">{sdr.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {sdr.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={(e) => handleViewDetails(sdr, e)}
              >
                View Details
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        {selectedSdr && (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={selectedSdr.avatar || "/placeholder.svg"}
                    alt={selectedSdr.name}
                  />
                  <AvatarFallback>
                    {selectedSdr.name.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                {selectedSdr.name} - {selectedSdr.model}
              </DialogTitle>
              <DialogDescription>{selectedSdr.description}</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="profile">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="role">Role</TabsTrigger>
                <TabsTrigger value="faqs">FAQs</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4">
                <div>
                  <h4 className="font-medium">Mission</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedSdr.mission}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Goal</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedSdr.goal}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Tags</h4>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedSdr.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="role" className="space-y-4">
                <div>
                  <h4 className="font-medium">Role & Responsibilities</h4>
                  <ul className="mt-2 space-y-2">
                    {selectedSdr.role.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2 text-primary">•</span>
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="faqs" className="space-y-4">
                <div>
                  <h4 className="font-medium">Frequently Asked Questions</h4>
                  <div className="mt-2 space-y-4">
                    {selectedSdr.faqs.map((faq, index) => (
                      <div key={index} className="space-y-1">
                        <h5 className="text-sm font-medium">{faq.question}</h5>
                        <p className="text-sm text-muted-foreground">
                          {faq.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleSelectSdr(selectedSdr.id)}>
                Select Avatar
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
