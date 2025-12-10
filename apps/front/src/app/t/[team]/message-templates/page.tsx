"use client";

import { useState } from "react";
import { TeamHeader } from "@/features/team/layouts/team-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Phone,
  Copy,
  Check,
  Eye,
  Sparkles,
  User,
  Bot,
  Building,
  MapPin,
  DollarSign,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

// Personalization variables available
const PERSONALIZATION_VARS = [
  { key: "{{name}}", label: "Lead Name", example: "John" },
  { key: "{{first_name}}", label: "First Name", example: "John" },
  { key: "{{last_name}}", label: "Last Name", example: "Smith" },
  {
    key: "{{business_name}}",
    label: "Business Name",
    example: "Smith Auto Repair",
  },
  { key: "{{sender_name}}", label: "Sender Name", example: "Gianna" },
  { key: "{{company}}", label: "Your Company", example: "Nextier" },
  { key: "{{city}}", label: "City", example: "Brooklyn" },
  { key: "{{state}}", label: "State", example: "NY" },
  { key: "{{industry}}", label: "Industry", example: "auto repair" },
  { key: "{{revenue_range}}", label: "Revenue Range", example: "$1-5M" },
];

// SMS Templates - Gianna's voice (or configurable sender)
const INITIAL_SMS_TEMPLATES = [
  {
    id: "sms-1",
    name: "Valuation Curiosity",
    message:
      "Hey {{name}}, {{sender_name}} with {{company}}. Quick one — ever wonder what your business could actually sell for? I can get you a valuation. Best email?",
    category: "opening",
    tags: ["valuation", "soft-open"],
  },
  {
    id: "sms-2",
    name: "Hidden Value",
    message:
      "Hey {{name}}, can you get a quick valuation on your business? Most owners I talk to have no idea what they're sitting on. Best email to send details?",
    category: "opening",
    tags: ["valuation", "curiosity"],
  },
  {
    id: "sms-3",
    name: "Expand or Exit",
    message:
      "{{sender_name}} here — have you thought about expanding or exiting anytime soon? I can get you a clean valuation. What's a good email?",
    category: "opening",
    tags: ["exit", "expansion"],
  },
  {
    id: "sms-4",
    name: "Free Valuation Offer",
    message:
      "Hey {{name}}, I help owners understand what their business can sell for. Want me to send you a valuation? What email should I use?",
    category: "opening",
    tags: ["valuation", "offer"],
  },
  {
    id: "sms-5",
    name: "Know Your Number",
    message:
      "Curious — do you know what your business would sell for right now? I can show you. Best email?",
    category: "opening",
    tags: ["valuation", "direct"],
  },
  {
    id: "sms-6",
    name: "15-Min Chat",
    message:
      "{{sender_name}} from {{company}} — I can get you a free business valuation. Worth a 15-min chat. What email should I send it to?",
    category: "opening",
    tags: ["meeting", "valuation"],
  },
  {
    id: "sms-7",
    name: "Growth or Exit Check",
    message:
      "Hey {{name}}, are you in growth mode or thinking about stepping back? I can get you a valuation either way. Best email?",
    category: "opening",
    tags: ["qualification", "valuation"],
  },
  {
    id: "sms-8",
    name: "Tomorrow's Offer",
    message:
      "If someone made you an offer tomorrow — do you know your number? I can get you a valuation. What's a good email?",
    category: "opening",
    tags: ["urgency", "valuation"],
  },
  {
    id: "sms-9",
    name: "Worth Mapping",
    message:
      "{{sender_name}} here — I help owners map out what they're worth. Quick valuation if you want it. Email?",
    category: "opening",
    tags: ["valuation", "short"],
  },
  {
    id: "sms-10",
    name: "1-2 Year Horizon",
    message:
      "Hey {{name}}, thinking expansion or exit in the next year or two? Either way, I can get you a valuation. Email?",
    category: "opening",
    tags: ["timeline", "valuation"],
  },
  {
    id: "sms-11",
    name: "This Week",
    message:
      "I can run your business valuation this week. Want it? What's the best email for you?",
    category: "opening",
    tags: ["urgency", "action"],
  },
  {
    id: "sms-12",
    name: "Exit Number",
    message:
      "Hey {{name}}, most owners I talk to don't know their exit number. Want yours? Best email?",
    category: "opening",
    tags: ["exit", "curiosity"],
  },
  {
    id: "sms-13",
    name: "Quick Intro",
    message:
      "{{sender_name}} with {{company}} — I run valuations for business owners. Want me to send you yours? Email?",
    category: "opening",
    tags: ["intro", "valuation"],
  },
  {
    id: "sms-14",
    name: "Head Number",
    message:
      "If you ever sold, what number's in your head? I can get you the real one. Send me your best email?",
    category: "opening",
    tags: ["direct", "valuation"],
  },
  {
    id: "sms-15",
    name: "Step Back Question",
    message:
      "Quick one — have you thought about stepping back or selling someday? I can get you a valuation. Email?",
    category: "opening",
    tags: ["soft", "exit"],
  },
  {
    id: "sms-16",
    name: "True Worth",
    message:
      "{{sender_name}} here — I help owners figure out what they're really worth. Want yours? What email should I send it to?",
    category: "opening",
    tags: ["valuation", "worth"],
  },
  {
    id: "sms-17",
    name: "Market Value",
    message:
      "Hey {{name}}, do you know your current market value? I can get it for you. Best email?",
    category: "opening",
    tags: ["market", "valuation"],
  },
  {
    id: "sms-18",
    name: "Buyer Snapshot",
    message:
      "I can get you a full valuation + snapshot of what buyers would pay. Want it? Email?",
    category: "opening",
    tags: ["buyers", "valuation"],
  },
  {
    id: "sms-19",
    name: "This Week Batch",
    message:
      "{{sender_name}} at {{company}} — I'm doing valuations this week for business owners. Want yours? Email?",
    category: "opening",
    tags: ["batch", "urgency"],
  },
  {
    id: "sms-20",
    name: "Full Valuation",
    message:
      "Ever thought about expanding or exiting? I can get you a full valuation. What's the best email for you?",
    category: "opening",
    tags: ["complete", "valuation"],
  },
];

// Cold Call Scripts - for Call Center reference
const COLD_CALL_SCRIPTS = [
  {
    id: "call-1",
    name: "Quick Question Open",
    script:
      "Hey, it's {{sender_name}} with {{company}}. Quick question — have you thought about expanding or possibly exiting in the next year or two?",
    tags: ["direct", "timeline"],
  },
  {
    id: "call-2",
    name: "Worth Statement",
    script:
      "{{sender_name}} here with {{company}}. I help owners understand what their business could actually sell for. Worth a quick minute?",
    tags: ["value-prop", "soft"],
  },
  {
    id: "call-3",
    name: "Direction Check",
    script:
      "Calling to see where you're heading — growth, maintaining, or exploring an exit. Mind if I ask one quick thing?",
    tags: ["qualification", "open"],
  },
  {
    id: "call-4",
    name: "Valuation Specialty",
    script:
      "{{sender_name}} at {{company}} — I specialize in business valuations. Wanted to see if you've ever wondered what yours could fetch.",
    tags: ["specialty", "curiosity"],
  },
  {
    id: "call-5",
    name: "Tomorrow Offer",
    script:
      "Quick one — if someone made you an offer tomorrow, do you even know what your business is worth? That's why I'm calling.",
    tags: ["urgency", "direct"],
  },
  {
    id: "call-6",
    name: "No Selling",
    script:
      "I'm not selling anything — just want to see if you've ever thought about expansion or stepping back at any point.",
    tags: ["disarm", "soft"],
  },
  {
    id: "call-7",
    name: "Realistic Number",
    script:
      "{{sender_name}} here — I help owners get a realistic number of what they could sell for. Curious if that's ever crossed your mind?",
    tags: ["realistic", "curiosity"],
  },
  {
    id: "call-8",
    name: "30 Seconds",
    script:
      "Do you have 30 seconds? I'm calling because I can get you a valuation on what your business is worth right now.",
    tags: ["time-bound", "direct"],
  },
  {
    id: "call-9",
    name: "One Sentence",
    script:
      "I'll be quick — I help owners figure out the true market value of their business. Want me to explain in one sentence?",
    tags: ["brief", "hook"],
  },
  {
    id: "call-10",
    name: "Ever Wondered",
    script:
      "Have you ever wondered what your business could sell for? That's exactly what I'm calling about.",
    tags: ["simple", "direct"],
  },
  {
    id: "call-11",
    name: "Industry Talk",
    script:
      "{{sender_name}} here. I talk to a lot of owners in your industry — some expanding, some thinking about an exit. Which bucket are you in?",
    tags: ["industry", "qualification"],
  },
  {
    id: "call-12",
    name: "Real Position",
    script:
      "Not sure if this applies, but I can get you a full valuation on your business so you know your real position.",
    tags: ["no-pressure", "value"],
  },
  {
    id: "call-13",
    name: "7-Figure Exit",
    script:
      "I help owners find out if they're sitting on a potential 7-figure exit. Mind if I ask a quick question to see if it applies to you?",
    tags: ["big-number", "hook"],
  },
  {
    id: "call-14",
    name: "Not a Broker",
    script:
      "I'm not a broker — I originate sellers. Wanted to see if getting a valuation would be useful for you.",
    tags: ["differentiation", "value"],
  },
  {
    id: "call-15",
    name: "Step Back",
    script:
      "Curious — have you ever thought about stepping back or selling someday? That's what I specialize in.",
    tags: ["future", "specialty"],
  },
  {
    id: "call-16",
    name: "Mode Check",
    script:
      "Quick check-in — are you in growth mode, maintain mode, or possibly considering an exit?",
    tags: ["qualification", "modes"],
  },
  {
    id: "call-17",
    name: "Clarity Offer",
    script:
      "I help business owners get clarity on what their business could be worth. Worth a quick conversation?",
    tags: ["clarity", "value"],
  },
  {
    id: "call-18",
    name: "No Pressure",
    script:
      "I can get you a no-pressure valuation so you know what you're sitting on. Interested?",
    tags: ["no-pressure", "direct"],
  },
  {
    id: "call-19",
    name: "Most Don't Know",
    script:
      "Out of curiosity — do you know what your business would sell for today? Most owners don't. I can show you.",
    tags: ["statistics", "value"],
  },
  {
    id: "call-20",
    name: "Send Details",
    script:
      "This is {{sender_name}} with {{company}}. I help owners understand their exit value. Want me to send you the details?",
    tags: ["info-offer", "soft"],
  },
];

export default function MessageTemplatesPage() {
  const [activeTab, setActiveTab] = useState("sms");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  // Sender configuration
  const [senderName, setSenderName] = useState("Gianna");
  const [companyName, setCompanyName] = useState("Nextier");

  // Preview variables
  const [previewVars, setPreviewVars] = useState({
    name: "John",
    first_name: "John",
    last_name: "Smith",
    business_name: "Smith Auto Repair",
    city: "Brooklyn",
    state: "NY",
    industry: "auto repair",
    revenue_range: "$1-5M",
  });

  // Replace variables in template
  const replaceVariables = (template: string) => {
    let result = template;
    result = result.replace(/\{\{sender_name\}\}/g, senderName);
    result = result.replace(/\{\{company\}\}/g, companyName);
    result = result.replace(/\{\{name\}\}/g, previewVars.name);
    result = result.replace(/\{\{first_name\}\}/g, previewVars.first_name);
    result = result.replace(/\{\{last_name\}\}/g, previewVars.last_name);
    result = result.replace(
      /\{\{business_name\}\}/g,
      previewVars.business_name,
    );
    result = result.replace(/\{\{city\}\}/g, previewVars.city);
    result = result.replace(/\{\{state\}\}/g, previewVars.state);
    result = result.replace(/\{\{industry\}\}/g, previewVars.industry);
    result = result.replace(
      /\{\{revenue_range\}\}/g,
      previewVars.revenue_range,
    );
    return result;
  };

  // Copy to clipboard
  const handleCopy = async (text: string, id: string) => {
    const processed = replaceVariables(text);
    await navigator.clipboard.writeText(processed);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter templates by search
  const filteredSMS = INITIAL_SMS_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
  );

  const filteredCalls = COLD_CALL_SCRIPTS.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.script.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
  );

  return (
    <>
      <TeamHeader
        title="Message Templates"
        links={[{ href: "/campaigns", title: "Campaigns" }]}
      />

      <div className="p-6">
        {/* Hero Section */}
        <Card className="mb-6 bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border-blue-500/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <MessageSquare className="w-8 h-8 text-white" />
                </motion.div>
                <div>
                  <CardTitle className="text-2xl">
                    Initial Outreach Templates
                  </CardTitle>
                  <CardDescription className="text-base">
                    Hyperpersonalized SMS & Cold Call scripts with plug-and-play
                    variables
                  </CardDescription>
                </div>
              </div>

              {/* Sender Config */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">
                    Sender:
                  </Label>
                  <Select value={senderName} onValueChange={setSenderName}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Gianna">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4" />
                          Gianna (AI)
                        </div>
                      </SelectItem>
                      <SelectItem value="Tommy">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Tommy
                        </div>
                      </SelectItem>
                      <SelectItem value="Tommy Borruso">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Tommy Borruso
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">
                    Company:
                  </Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-28"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Variable Reference */}
            <div className="flex flex-wrap gap-2 mt-2">
              {PERSONALIZATION_VARS.map((v) => (
                <Badge
                  key={v.key}
                  variant="outline"
                  className="text-xs cursor-pointer hover:bg-blue-500/20"
                  onClick={() => {
                    navigator.clipboard.writeText(v.key);
                    toast.success(`Copied ${v.key}`);
                  }}
                >
                  {v.key} → {v.example}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="sms" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                SMS Templates ({filteredSMS.length})
              </TabsTrigger>
              <TabsTrigger value="calls" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Cold Call Scripts ({filteredCalls.length})
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Preview & Test
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Template
              </Button>
            </div>
          </div>

          {/* SMS Templates Tab */}
          <TabsContent value="sms" className="space-y-3">
            {filteredSMS.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="hover:border-blue-500/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{template.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {template.category}
                          </Badge>
                          {template.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground font-mono bg-muted/30 p-3 rounded-md">
                          {template.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Preview:{" "}
                          {replaceVariables(template.message).slice(0, 80)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setPreviewTemplate(template.message);
                            setShowPreviewDialog(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleCopy(template.message, template.id)
                          }
                        >
                          {copiedId === template.id ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          {/* Cold Call Scripts Tab */}
          <TabsContent value="calls" className="space-y-3">
            {filteredCalls.map((script, index) => (
              <motion.div
                key={script.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="hover:border-green-500/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Phone className="w-4 h-4 text-green-500" />
                          <span className="font-medium">{script.name}</span>
                          {script.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm font-mono bg-muted/30 p-3 rounded-md">
                          "{replaceVariables(script.script)}"
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopy(script.script, script.id)}
                        >
                          {copiedId === script.id ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          {/* Preview & Test Tab */}
          <TabsContent value="preview" className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              {/* Variable Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    Preview Variables
                  </CardTitle>
                  <CardDescription>
                    Set sample values to preview how templates will look
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Lead Name
                      </Label>
                      <Input
                        value={previewVars.name}
                        onChange={(e) =>
                          setPreviewVars({
                            ...previewVars,
                            name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        Business Name
                      </Label>
                      <Input
                        value={previewVars.business_name}
                        onChange={(e) =>
                          setPreviewVars({
                            ...previewVars,
                            business_name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        City
                      </Label>
                      <Input
                        value={previewVars.city}
                        onChange={(e) =>
                          setPreviewVars({
                            ...previewVars,
                            city: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input
                        value={previewVars.state}
                        onChange={(e) =>
                          setPreviewVars({
                            ...previewVars,
                            state: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Input
                        value={previewVars.industry}
                        onChange={(e) =>
                          setPreviewVars({
                            ...previewVars,
                            industry: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Revenue Range
                      </Label>
                      <Input
                        value={previewVars.revenue_range}
                        onChange={(e) =>
                          setPreviewVars({
                            ...previewVars,
                            revenue_range: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Live Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="w-5 h-5 text-blue-500" />
                    Live Preview
                  </CardTitle>
                  <CardDescription>
                    See how your message will appear to leads
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4 min-h-[200px]">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                        {senderName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{senderName}</span>
                          <span className="text-xs text-muted-foreground">
                            via {companyName}
                          </span>
                        </div>
                        <div className="bg-blue-500/20 rounded-lg p-3 text-sm">
                          {previewTemplate
                            ? replaceVariables(previewTemplate)
                            : replaceVariables(
                                INITIAL_SMS_TEMPLATES[0].message,
                              )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          {
                            (previewTemplate
                              ? replaceVariables(previewTemplate)
                              : replaceVariables(
                                  INITIAL_SMS_TEMPLATES[0].message,
                                )
                            ).length
                          }{" "}
                          characters
                          {(previewTemplate
                            ? replaceVariables(previewTemplate)
                            : replaceVariables(INITIAL_SMS_TEMPLATES[0].message)
                          ).length > 160 && (
                            <span className="text-yellow-500 ml-2">
                              (May split into multiple messages)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        const msg =
                          previewTemplate || INITIAL_SMS_TEMPLATES[0].message;
                        handleCopy(msg, "preview");
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Message
                    </Button>
                    <Button className="flex-1">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Use in Campaign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Template Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Select Template to Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2">
                  {INITIAL_SMS_TEMPLATES.map((t) => (
                    <Button
                      key={t.id}
                      variant={
                        previewTemplate === t.message ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setPreviewTemplate(t.message)}
                      className="justify-start text-xs"
                    >
                      {t.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message Preview</DialogTitle>
            <DialogDescription>
              This is how your message will appear with current variables
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                {senderName.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="font-medium mb-1">{senderName}</div>
                <div className="bg-blue-500/20 rounded-lg p-3 text-sm">
                  {previewTemplate ? replaceVariables(previewTemplate) : ""}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (previewTemplate) handleCopy(previewTemplate, "dialog");
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            <Button onClick={() => setShowPreviewDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
