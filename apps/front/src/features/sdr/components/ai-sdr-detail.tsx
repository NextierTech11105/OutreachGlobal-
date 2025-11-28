"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Edit,
  CheckCircle,
  XCircle,
  MessageSquare,
  Target,
  Lightbulb,
  Tag,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AiSdrNode } from "../queries/sdr.queries";

interface AiSdrDetailProps {
  sdr: AiSdrNode;
  onEdit: () => void;
  onBack: () => void;
}

export function AiSdrDetail({ sdr, onEdit, onBack }: AiSdrDetailProps) {
  // Group FAQs by category
  const faqsByCategory: Record<string, typeof sdr.faqs> = {};

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to List
        </Button>
        <Button onClick={onEdit}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Avatar
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-center">
                <div className="h-24 w-24 rounded-full overflow-hidden">
                  <img
                    src={sdr.avatarUrl || "/placeholder.svg"}
                    alt={sdr.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-center">
              <h2 className="text-2xl font-bold">{sdr.name}</h2>
              <p className="text-muted-foreground">{sdr.description}</p>

              <div className="mt-4 flex justify-center">
                {sdr.isActive ? (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                    <CheckCircle className="mr-1 h-4 w-4" />
                    Active
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-red-100 text-red-800 hover:bg-red-200"
                  >
                    <XCircle className="mr-1 h-4 w-4" />
                    Inactive
                  </Badge>
                )}
              </div>

              <div className="mt-6 space-y-2 text-left">
                <div>
                  <span className="font-semibold">Industry:</span>{" "}
                  {sdr.industry}
                </div>
                <div>
                  <span className="font-semibold">Voice Type:</span>{" "}
                  {sdr.voiceType}
                </div>
                <div>
                  <span className="font-semibold">Personality:</span>{" "}
                  {sdr.personality}
                </div>
              </div>

              <div className="mt-4">
                <h3 className="font-semibold mb-2 flex items-center">
                  <Tag className="mr-1 h-4 w-4" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-1 justify-center">
                  {sdr.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:w-2/3">
          <Tabs defaultValue="mission">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="mission">
                <Target className="mr-1 h-4 w-4" />
                Mission & Goals
              </TabsTrigger>
              <TabsTrigger value="role">
                <MessageSquare className="mr-1 h-4 w-4" />
                Role
              </TabsTrigger>
              <TabsTrigger value="faqs">
                <Lightbulb className="mr-1 h-4 w-4" />
                FAQs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mission">
              <Card>
                <CardHeader>
                  <CardTitle>Mission & Goals</CardTitle>
                  <CardDescription>
                    The purpose and objectives of this AI SDR avatar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Mission</h3>
                    <p>{sdr.mission}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Goal</h3>
                    <p>{sdr.goal}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="role">
              <Card>
                <CardHeader>
                  <CardTitle>Role & Responsibilities</CardTitle>
                  <CardDescription>
                    What this AI SDR avatar does and how it interacts with
                    prospects
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 list-disc pl-5">
                    {sdr.role.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="faqs">
              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                  <CardDescription>
                    Knowledge base for this AI SDR avatar to answer common
                    questions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {Object.entries(faqsByCategory).map(([category, faqs]) => (
                      <AccordionItem key={category} value={category}>
                        <AccordionTrigger>
                          {category} ({faqs.length})
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4">
                            {faqs.map((faq, index) => (
                              <div
                                key={index}
                                className="border-b pb-4 last:border-0"
                              >
                                <h4 className="font-medium">{faq.question}</h4>
                                <p className="text-muted-foreground mt-1">
                                  {faq.answer}
                                </p>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
