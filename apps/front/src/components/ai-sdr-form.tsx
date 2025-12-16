"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Trash2 } from "lucide-react";
import type { AiSdr } from "./ai-sdr-manager";
import { AI_ASSISTANT_NAME, APP_NAME } from "@/config/branding";

interface AiSdrFormProps {
  initialData?: AiSdr;
  onSave: (data: Omit<AiSdr, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
}

export function AiSdrForm({ initialData, onSave, onCancel }: AiSdrFormProps) {
  const [formData, setFormData] = useState<
    Omit<AiSdr, "id" | "createdAt" | "updatedAt">
  >({
    name: "",
    description: "",
    personality: "",
    voiceType: "Professional Female",
    avatarUrl: "/stylized-letters-sj.png",
    isActive: true,
    industry: "",
    mission: "",
    goal: "",
    role: [""],
    faqs: [{ question: "", answer: "", category: "" }],
    tags: [],
  });

  const [newTag, setNewTag] = useState("");
  const [activeTab, setActiveTab] = useState("basic");

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        description: initialData.description,
        personality: initialData.personality,
        voiceType: initialData.voiceType,
        avatarUrl: initialData.avatarUrl,
        isActive: initialData.isActive,
        industry: initialData.industry,
        mission: initialData.mission,
        goal: initialData.goal,
        role: initialData.role,
        faqs: initialData.faqs,
        tags: initialData.tags,
      });
    }
  }, [initialData]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isActive: checked }));
  };

  const handleSelectChange = (value: string, field: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRoleChange = (index: number, value: string) => {
    const updatedRoles = [...formData.role];
    updatedRoles[index] = value;
    setFormData((prev) => ({ ...prev, role: updatedRoles }));
  };

  const addRoleItem = () => {
    setFormData((prev) => ({ ...prev, role: [...prev.role, ""] }));
  };

  const removeRoleItem = (index: number) => {
    const updatedRoles = [...formData.role];
    updatedRoles.splice(index, 1);
    setFormData((prev) => ({ ...prev, role: updatedRoles }));
  };

  const handleFaqChange = (
    index: number,
    field: "question" | "answer" | "category",
    value: string,
  ) => {
    const updatedFaqs = [...formData.faqs];
    updatedFaqs[index] = { ...updatedFaqs[index], [field]: value };
    setFormData((prev) => ({ ...prev, faqs: updatedFaqs }));
  };

  const addFaqItem = () => {
    setFormData((prev) => ({
      ...prev,
      faqs: [...prev.faqs, { question: "", answer: "", category: "" }],
    }));
  };

  const removeFaqItem = (index: number) => {
    const updatedFaqs = [...formData.faqs];
    updatedFaqs.splice(index, 1);
    setFormData((prev) => ({ ...prev, faqs: updatedFaqs }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="basic">Basic Information</TabsTrigger>
          <TabsTrigger value="details">Details & Mission</TabsTrigger>
          <TabsTrigger value="faqs">FAQs & Knowledge</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Avatar Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder={`e.g., ${AI_ASSISTANT_NAME} for ${APP_NAME} Business Broker`}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                name="industry"
                value={formData.industry}
                onChange={handleInputChange}
                placeholder="e.g., Real Estate - Foreclosure"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Short Description</Label>
              <Input
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="e.g., AI-Powered Foreclosure Strategist & Homeowner Advocate"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="voiceType">Voice Type</Label>
              <Select
                value={formData.voiceType}
                onValueChange={(value) =>
                  handleSelectChange(value, "voiceType")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Professional Female">
                    Professional Female
                  </SelectItem>
                  <SelectItem value="Professional Male">
                    Professional Male
                  </SelectItem>
                  <SelectItem value="Casual Female">Casual Female</SelectItem>
                  <SelectItem value="Casual Male">Casual Male</SelectItem>
                  <SelectItem value="Energetic Female">
                    Energetic Female
                  </SelectItem>
                  <SelectItem value="Energetic Male">Energetic Male</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="personality">Personality</Label>
              <Input
                id="personality"
                name="personality"
                value={formData.personality}
                onChange={handleInputChange}
                placeholder="e.g., Empathetic, knowledgeable, and solution-oriented"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatarUrl">Avatar Image URL</Label>
              <Input
                id="avatarUrl"
                name="avatarUrl"
                value={formData.avatarUrl}
                onChange={handleInputChange}
                placeholder="/path/to/avatar.png"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex space-x-2">
                <Input
                  id="newTag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button type="button" onClick={addTag} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="isActive">Status</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={handleSwitchChange}
                />
                <Label htmlFor="isActive">
                  {formData.isActive ? "Active" : "Inactive"}
                </Label>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mission">Mission</Label>
            <Textarea
              id="mission"
              name="mission"
              value={formData.mission}
              onChange={handleInputChange}
              placeholder="e.g., Guide homeowners through foreclosure, auction delays, loan modifications, and equity recovery."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">Goal</Label>
            <Textarea
              id="goal"
              name="goal"
              value={formData.goal}
              onChange={handleInputChange}
              placeholder="e.g., Help clients navigate legal, financial, and strategic options at zero cost while leading them to a consultation."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Role & Responsibilities</Label>
              <Button
                type="button"
                onClick={addRoleItem}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            {formData.role.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Input
                  value={item}
                  onChange={(e) => handleRoleChange(index, e.target.value)}
                  placeholder="e.g., Engage personally (mentions the homeowner's name)."
                  required
                />
                <Button
                  type="button"
                  onClick={() => removeRoleItem(index)}
                  size="icon"
                  variant="ghost"
                  disabled={formData.role.length <= 1}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="faqs" className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>Frequently Asked Questions</Label>
            <Button
              type="button"
              onClick={addFaqItem}
              size="sm"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add FAQ
            </Button>
          </div>

          {formData.faqs.map((faq, index) => (
            <Card key={index} className="relative">
              <Button
                type="button"
                onClick={() => removeFaqItem(index)}
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2"
                disabled={formData.faqs.length <= 1}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>

              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`faq-question-${index}`}>Question</Label>
                  <Input
                    id={`faq-question-${index}`}
                    value={faq.question}
                    onChange={(e) =>
                      handleFaqChange(index, "question", e.target.value)
                    }
                    placeholder="e.g., How is Elite Homeowner Advisor different from an attorney?"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`faq-answer-${index}`}>Answer</Label>
                  <Textarea
                    id={`faq-answer-${index}`}
                    value={faq.answer}
                    onChange={(e) =>
                      handleFaqChange(index, "answer", e.target.value)
                    }
                    placeholder="e.g., We provide free advisory services to help homeowners understand their situation, while attorneys charge substantial legal fees."
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`faq-category-${index}`}>
                    Category (Optional)
                  </Label>
                  <Input
                    id={`faq-category-${index}`}
                    value={faq.category || ""}
                    onChange={(e) =>
                      handleFaqChange(index, "category", e.target.value)
                    }
                    placeholder="e.g., services, legal, pricing"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-2 mt-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData ? "Update Avatar" : "Create Avatar"}
        </Button>
      </div>
    </form>
  );
}
