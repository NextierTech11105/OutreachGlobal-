"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Gift,
  Building2,
  Plus,
  Loader2,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Ticket,
  TrendingUp,
  Search,
  CheckCircle,
  XCircle,
  Wrench,
  Truck,
  ClipboardCheck,
  Landmark,
  Shield,
  Leaf,
  Sparkles,
  Bug,
  Scale,
  FileText,
} from "lucide-react";

interface PartnerOffer {
  id: string;
  businessName: string;
  category: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  offer: string;
  discount: string;
  terms?: string;
  couponCode?: string;
  expiresAt: string;
  isActive: boolean;
  redemptions: number;
  maxRedemptions?: number;
}

interface PartnerCategory {
  id: string;
  name: string;
  description: string;
  sicCodes: string[];
  offerCount: number;
}

const categoryIcons: Record<string, React.ReactNode> = {
  home_services: <Wrench className="h-5 w-5" />,
  moving_storage: <Truck className="h-5 w-5" />,
  home_inspection: <ClipboardCheck className="h-5 w-5" />,
  mortgage_lending: <Landmark className="h-5 w-5" />,
  insurance: <Shield className="h-5 w-5" />,
  landscaping: <Leaf className="h-5 w-5" />,
  cleaning: <Sparkles className="h-5 w-5" />,
  pest_control: <Bug className="h-5 w-5" />,
  legal: <Scale className="h-5 w-5" />,
  title_escrow: <FileText className="h-5 w-5" />,
};

export default function PartnershipsPage() {
  const [offers, setOffers] = useState<PartnerOffer[]>([]);
  const [categories, setCategories] = useState<PartnerCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPartner, setNewPartner] = useState({
    businessName: "",
    category: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "NY",
    zipCode: "",
    offer: "",
    discount: "",
    terms: "",
    couponCode: "",
    expiresAt: "",
    maxRedemptions: "",
  });

  const fetchPartnerships = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/partnerships");
      const data = await res.json();
      if (data.success) {
        setOffers(data.offers || []);
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error("Failed to fetch partnerships:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPartnerships();
  }, [fetchPartnerships]);

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/partnerships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          ...newPartner,
          maxRedemptions: newPartner.maxRedemptions
            ? parseInt(newPartner.maxRedemptions)
            : undefined,
        }),
      });

      if (res.ok) {
        setShowAddDialog(false);
        setNewPartner({
          businessName: "",
          category: "",
          contactName: "",
          email: "",
          phone: "",
          address: "",
          city: "",
          state: "NY",
          zipCode: "",
          offer: "",
          discount: "",
          terms: "",
          couponCode: "",
          expiresAt: "",
          maxRedemptions: "",
        });
        await fetchPartnerships();
      }
    } catch (err) {
      console.error("Failed to add partner:", err);
    }
  };

  const togglePartnerStatus = async (partnerId: string) => {
    try {
      await fetch("/api/partnerships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", partnerId }),
      });
      await fetchPartnerships();
    } catch (err) {
      console.error("Failed to toggle partner:", err);
    }
  };

  const filteredOffers =
    activeTab === "all"
      ? offers
      : offers.filter((o) => o.category === activeTab);

  const totalRedemptions = offers.reduce((sum, o) => sum + o.redemptions, 0);
  const activeOffers = offers.filter((o) => o.isActive).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Gift className="h-8 w-8 text-purple-500" />
            Local Business Partnerships
          </h1>
          <p className="text-muted-foreground mt-1">
            Partner with local businesses to offer exclusive coupons with
            valuation reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchPartnerships}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Partner
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Partner Business</DialogTitle>
                <DialogDescription>
                  Create a partnership with a local business to offer coupons
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddPartner} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Business Name *</Label>
                    <Input
                      value={newPartner.businessName}
                      onChange={(e) =>
                        setNewPartner({
                          ...newPartner,
                          businessName: e.target.value,
                        })
                      }
                      placeholder="Acme Home Services"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select
                      value={newPartner.category}
                      onValueChange={(v) =>
                        setNewPartner({ ...newPartner, category: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              {categoryIcons[cat.id]}
                              {cat.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Name</Label>
                    <Input
                      value={newPartner.contactName}
                      onChange={(e) =>
                        setNewPartner({
                          ...newPartner,
                          contactName: e.target.value,
                        })
                      }
                      placeholder="John Smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newPartner.email}
                      onChange={(e) =>
                        setNewPartner({ ...newPartner, email: e.target.value })
                      }
                      placeholder="john@business.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={newPartner.phone}
                      onChange={(e) =>
                        setNewPartner({ ...newPartner, phone: e.target.value })
                      }
                      placeholder="212-555-0100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={newPartner.city}
                      onChange={(e) =>
                        setNewPartner({ ...newPartner, city: e.target.value })
                      }
                      placeholder="New York"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Offer Description *</Label>
                  <Textarea
                    value={newPartner.offer}
                    onChange={(e) =>
                      setNewPartner({ ...newPartner, offer: e.target.value })
                    }
                    placeholder="Free inspection with any service"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Discount Value *</Label>
                    <Input
                      value={newPartner.discount}
                      onChange={(e) =>
                        setNewPartner({
                          ...newPartner,
                          discount: e.target.value,
                        })
                      }
                      placeholder="$100 value"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Coupon Code</Label>
                    <Input
                      value={newPartner.couponCode}
                      onChange={(e) =>
                        setNewPartner({
                          ...newPartner,
                          couponCode: e.target.value,
                        })
                      }
                      placeholder="NEXTIER100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expires</Label>
                    <Input
                      type="date"
                      value={newPartner.expiresAt}
                      onChange={(e) =>
                        setNewPartner({
                          ...newPartner,
                          expiresAt: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Terms & Conditions</Label>
                  <Textarea
                    value={newPartner.terms}
                    onChange={(e) =>
                      setNewPartner({ ...newPartner, terms: e.target.value })
                    }
                    placeholder="Valid for new customers only..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Create Partnership
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{offers.length}</div>
            <div className="text-sm text-muted-foreground">Total Partners</div>
          </CardContent>
        </Card>
        <Card className="border-green-500/50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500">
              {activeOffers}
            </div>
            <div className="text-sm text-muted-foreground">Active Offers</div>
          </CardContent>
        </Card>
        <Card className="border-purple-500/50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-500">
              {totalRedemptions}
            </div>
            <div className="text-sm text-muted-foreground">
              Total Redemptions
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{categories.length}</div>
            <div className="text-sm text-muted-foreground">Categories</div>
          </CardContent>
        </Card>
      </div>

      {/* Categories Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Partner Categories</CardTitle>
          <CardDescription>
            Browse partners by business category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {categories.map((cat) => (
              <Card
                key={cat.id}
                className={`cursor-pointer transition-colors ${
                  activeTab === cat.id
                    ? "border-purple-500 bg-purple-500/10"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => setActiveTab(cat.id)}
              >
                <CardContent className="p-4 text-center">
                  <div className="flex justify-center mb-2 text-purple-500">
                    {categoryIcons[cat.id]}
                  </div>
                  <div className="font-medium text-sm">{cat.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {cat.offerCount} offers
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Partner Offers */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Partner Offers</CardTitle>
              <CardDescription>
                {activeTab === "all"
                  ? "All partner offers"
                  : `${categories.find((c) => c.id === activeTab)?.name || ""} partners`}
              </CardDescription>
            </div>
            {activeTab !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab("all")}
              >
                Show All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {filteredOffers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No partner offers in this category</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setShowAddDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Partner
                  </Button>
                </div>
              ) : (
                filteredOffers.map((offer) => (
                  <Card
                    key={offer.id}
                    className={!offer.isActive ? "opacity-60" : ""}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4">
                          <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                            {categoryIcons[offer.category] || (
                              <Building2 className="h-6 w-6" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">
                                {offer.businessName}
                              </h3>
                              {offer.isActive ? (
                                <Badge className="bg-green-500">Active</Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </div>
                            <p className="text-sm text-purple-500 font-medium">
                              {offer.offer}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Ticket className="h-3 w-3" />
                                {offer.discount}
                              </span>
                              {offer.couponCode && (
                                <span className="font-mono bg-muted px-2 py-0.5 rounded">
                                  {offer.couponCode}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Expires{" "}
                                {new Date(offer.expiresAt).toLocaleDateString()}
                              </span>
                            </div>
                            {offer.contactName && (
                              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                                <span>{offer.contactName}</span>
                                {offer.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {offer.phone}
                                  </span>
                                )}
                                {offer.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {offer.email}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <span className="font-semibold">
                              {offer.redemptions}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {offer.maxRedemptions
                                ? `/ ${offer.maxRedemptions}`
                                : "redeemed"}
                            </span>
                          </div>
                          <Switch
                            checked={offer.isActive}
                            onCheckedChange={() =>
                              togglePartnerStatus(offer.id)
                            }
                          />
                        </div>
                      </div>
                      {offer.terms && (
                        <div className="mt-3 text-xs text-muted-foreground border-t pt-2">
                          <strong>Terms:</strong> {offer.terms}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Find Partners Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Find Potential Partners
          </CardTitle>
          <CardDescription>
            Search the NY Business database to find potential partner businesses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      {categoryIcons[cat.id]}
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="City or ZIP code" className="w-[200px]" />
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Search className="h-4 w-4 mr-2" />
              Search Businesses
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Searches the NY Business database (5.5M records) by SIC code to find
            relevant local businesses
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
