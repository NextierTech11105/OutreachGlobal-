"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Megaphone,
  Phone,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";

// Types
interface Brand {
  brandId: string;
  brandName: string;
  legalCompanyName: string;
  status?: string;
}

interface Campaign {
  campaignId: string;
  usecase: string;
  status?: string;
}

interface PhoneNumber {
  phoneNumber: string;
  friendlyName?: string;
  status?: string;
}

interface WizardState {
  brand: Brand | null;
  campaign: Campaign | null;
  phoneNumber: PhoneNumber | null;
}

const STEPS = [
  {
    id: "brand",
    title: "Register Brand",
    icon: Building2,
    description: "10DLC business registration",
  },
  {
    id: "campaign",
    title: "Create Campaign",
    icon: Megaphone,
    description: "Set up your SMS campaign",
  },
  {
    id: "phone",
    title: "Get Phone Number",
    icon: Phone,
    description: "Purchase a sending number",
  },
  {
    id: "complete",
    title: "Ready to Send",
    icon: CheckCircle2,
    description: "Start sending messages",
  },
];

const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

const CAMPAIGN_USECASES = [
  {
    value: "LOW_VOLUME",
    label: "Low Volume Mixed",
    description: "< 6,000 msgs/day",
  },
  {
    value: "MARKETING",
    label: "Marketing",
    description: "Promotional messages",
  },
  {
    value: "CUSTOMER_CARE",
    label: "Customer Care",
    description: "Support messages",
  },
  { value: "MIXED", label: "Mixed", description: "Multiple use cases" },
];

export function SMSOnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wizardState, setWizardState] = useState<WizardState>({
    brand: null,
    campaign: null,
    phoneNumber: null,
  });

  // Brand form state
  const [brandForm, setBrandForm] = useState({
    legalCompanyName: "",
    brandName: "",
    ein: "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    website: "",
    vertical: "REAL_ESTATE",
    entityType: "PRIVATE_PROFIT",
  });

  // Campaign form state
  const [campaignForm, setCampaignForm] = useState({
    usecase: "LOW_VOLUME",
    description: "",
    sampleMessage:
      "Hi {{firstName}}, I noticed your property at {{address}}. Would you consider selling?",
    helpMessage: "Reply HELP for assistance. Msg&data rates may apply.",
    optoutMessage: "Reply STOP to unsubscribe from future messages.",
  });

  // Phone form state
  const [phoneForm, setPhoneForm] = useState({
    areaCode: "",
    friendlyName: "",
    selectedNumber: "",
  });
  const [availableNumbers, setAvailableNumbers] = useState<
    { phoneNumber: string; locality?: string }[]
  >([]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      setError(null);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  // Step 1: Register Brand
  const handleRegisterBrand = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/signalhouse/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brandForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to register brand");
      }

      setWizardState((prev) => ({ ...prev, brand: data.brand }));
      handleNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register brand");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Create Campaign
  const handleCreateCampaign = async () => {
    if (!wizardState.brand?.brandId) {
      setError("Brand not registered");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/signalhouse/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: wizardState.brand.brandId,
          usecase: campaignForm.usecase,
          description:
            campaignForm.description || `${brandForm.brandName} SMS outreach`,
          sampleMessages: [campaignForm.sampleMessage],
          helpMessage: campaignForm.helpMessage,
          optoutMessage: campaignForm.optoutMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create campaign");
      }

      setWizardState((prev) => ({ ...prev, campaign: data.campaign }));
      handleNext();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create campaign",
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Search for phone numbers
  const handleSearchNumbers = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ action: "available" });
      if (phoneForm.areaCode) params.append("areaCode", phoneForm.areaCode);

      const response = await fetch(`/api/signalhouse/numbers?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to search numbers");
      }

      setAvailableNumbers(data.available || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search numbers");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Buy phone number
  const handleBuyNumber = async () => {
    if (!phoneForm.selectedNumber) {
      setError("Please select a phone number");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/signalhouse/numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "buy",
          phoneNumber: phoneForm.selectedNumber,
          friendlyName: phoneForm.friendlyName || brandForm.brandName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to purchase number");
      }

      // Configure the number with campaign
      if (wizardState.campaign?.campaignId) {
        await fetch("/api/signalhouse/numbers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "configure",
            phoneNumber: phoneForm.selectedNumber,
            campaignId: wizardState.campaign.campaignId,
          }),
        });
      }

      setWizardState((prev) => ({ ...prev, phoneNumber: data.number }));
      handleNext();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to purchase number",
      );
    } finally {
      setLoading(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Brand Registration
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="legalCompanyName">Legal Company Name *</Label>
                <Input
                  id="legalCompanyName"
                  placeholder="Acme Real Estate LLC"
                  value={brandForm.legalCompanyName}
                  onChange={(e) =>
                    setBrandForm({
                      ...brandForm,
                      legalCompanyName: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brandName">Brand/DBA Name *</Label>
                <Input
                  id="brandName"
                  placeholder="Acme Realty"
                  value={brandForm.brandName}
                  onChange={(e) =>
                    setBrandForm({ ...brandForm, brandName: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ein">EIN / Tax ID</Label>
                <Input
                  id="ein"
                  placeholder="XX-XXXXXXX"
                  value={brandForm.ein}
                  onChange={(e) =>
                    setBrandForm({ ...brandForm, ein: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  placeholder="https://example.com"
                  value={brandForm.website}
                  onChange={(e) =>
                    setBrandForm({ ...brandForm, website: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                placeholder="123 Main Street"
                value={brandForm.street}
                onChange={(e) =>
                  setBrandForm({ ...brandForm, street: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Miami"
                  value={brandForm.city}
                  onChange={(e) =>
                    setBrandForm({ ...brandForm, city: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Select
                  value={brandForm.state}
                  onValueChange={(v) =>
                    setBrandForm({ ...brandForm, state: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">ZIP Code</Label>
                <Input
                  id="postalCode"
                  placeholder="33101"
                  value={brandForm.postalCode}
                  onChange={(e) =>
                    setBrandForm({ ...brandForm, postalCode: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entityType">Entity Type</Label>
                <Select
                  value={brandForm.entityType}
                  onValueChange={(v) =>
                    setBrandForm({ ...brandForm, entityType: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRIVATE_PROFIT">
                      Private Company
                    </SelectItem>
                    <SelectItem value="PUBLIC_PROFIT">
                      Public Company
                    </SelectItem>
                    <SelectItem value="SOLE_PROPRIETOR">
                      Sole Proprietor
                    </SelectItem>
                    <SelectItem value="NON_PROFIT">Non-Profit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vertical">Industry</Label>
                <Select
                  value={brandForm.vertical}
                  onValueChange={(v) =>
                    setBrandForm({ ...brandForm, vertical: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REAL_ESTATE">Real Estate</SelectItem>
                    <SelectItem value="FINANCIAL">
                      Financial Services
                    </SelectItem>
                    <SelectItem value="INSURANCE">Insurance</SelectItem>
                    <SelectItem value="PROFESSIONAL">
                      Professional Services
                    </SelectItem>
                    <SelectItem value="RETAIL">Retail</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleRegisterBrand}
              disabled={
                loading || !brandForm.legalCompanyName || !brandForm.brandName
              }
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Register Brand
            </Button>
          </div>
        );

      case 1: // Campaign Creation
        return (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Registered Brand:{" "}
                <strong>{wizardState.brand?.brandName}</strong>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="usecase">Campaign Type *</Label>
              <Select
                value={campaignForm.usecase}
                onValueChange={(v) =>
                  setCampaignForm({ ...campaignForm, usecase: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_USECASES.map((uc) => (
                    <SelectItem key={uc.value} value={uc.value}>
                      <div>
                        <span>{uc.label}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          ({uc.description})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Campaign Description</Label>
              <Input
                id="description"
                placeholder="Brief description of your SMS campaign"
                value={campaignForm.description}
                onChange={(e) =>
                  setCampaignForm({
                    ...campaignForm,
                    description: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sampleMessage">Sample Message *</Label>
              <Textarea
                id="sampleMessage"
                placeholder="Example message you'll send"
                value={campaignForm.sampleMessage}
                onChange={(e) =>
                  setCampaignForm({
                    ...campaignForm,
                    sampleMessage: e.target.value,
                  })
                }
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Use {"{{firstName}}"}, {"{{lastName}}"}, {"{{address}}"} for
                personalization
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="helpMessage">HELP Response</Label>
                <Input
                  id="helpMessage"
                  value={campaignForm.helpMessage}
                  onChange={(e) =>
                    setCampaignForm({
                      ...campaignForm,
                      helpMessage: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="optoutMessage">STOP Response</Label>
                <Input
                  id="optoutMessage"
                  value={campaignForm.optoutMessage}
                  onChange={(e) =>
                    setCampaignForm({
                      ...campaignForm,
                      optoutMessage: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleCreateCampaign}
              disabled={loading || !campaignForm.sampleMessage}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Create Campaign
            </Button>
          </div>
        );

      case 2: // Phone Number
        return (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-1">
              <p className="text-sm text-muted-foreground">
                Brand: <strong>{wizardState.brand?.brandName}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Campaign: <strong>{wizardState.campaign?.usecase}</strong>
              </p>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="areaCode">Area Code (optional)</Label>
                <Input
                  id="areaCode"
                  placeholder="305"
                  maxLength={3}
                  value={phoneForm.areaCode}
                  onChange={(e) =>
                    setPhoneForm({ ...phoneForm, areaCode: e.target.value })
                  }
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="secondary"
                  onClick={handleSearchNumbers}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Search Numbers"
                  )}
                </Button>
              </div>
            </div>

            {availableNumbers.length > 0 && (
              <div className="space-y-2">
                <Label>Select a Number</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {availableNumbers.map((num) => (
                    <div
                      key={num.phoneNumber}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        phoneForm.selectedNumber === num.phoneNumber
                          ? "border-primary bg-primary/10"
                          : "hover:border-muted-foreground"
                      }`}
                      onClick={() =>
                        setPhoneForm({
                          ...phoneForm,
                          selectedNumber: num.phoneNumber,
                        })
                      }
                    >
                      <p className="font-mono text-sm">{num.phoneNumber}</p>
                      {num.locality && (
                        <p className="text-xs text-muted-foreground">
                          {num.locality}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="friendlyName">Friendly Name (optional)</Label>
              <Input
                id="friendlyName"
                placeholder="My Campaign Number"
                value={phoneForm.friendlyName}
                onChange={(e) =>
                  setPhoneForm({ ...phoneForm, friendlyName: e.target.value })
                }
              />
            </div>

            <Button
              className="w-full"
              onClick={handleBuyNumber}
              disabled={loading || !phoneForm.selectedNumber}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Purchase Number
            </Button>
          </div>
        );

      case 3: // Complete
        return (
          <div className="space-y-6 text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">You're All Set!</h3>
              <p className="text-muted-foreground mt-2">
                Your SMS campaign is ready to go
              </p>
            </div>

            <div className="text-left space-y-3 bg-muted p-4 rounded-lg">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Brand:</span>
                <span className="font-medium">
                  {wizardState.brand?.brandName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Campaign:</span>
                <Badge variant="secondary">
                  {wizardState.campaign?.usecase}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone Number:</span>
                <span className="font-mono">
                  {wizardState.phoneNumber?.phoneNumber}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Button className="w-full" asChild>
                <a href="/t/default/campaigns/new">
                  Create Your First Campaign
                </a>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <a href="/t/default/sms">Go to SMS Dashboard</a>
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isComplete = index < currentStep;

            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isComplete
                        ? "bg-green-500 text-white"
                        : isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={`text-xs mt-2 ${isActive ? "font-medium" : "text-muted-foreground"}`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-full h-0.5 mx-2 ${
                      index < currentStep ? "bg-green-500" : "bg-muted"
                    }`}
                    style={{ minWidth: "60px" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep].title}</CardTitle>
          <CardDescription>{STEPS[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      {currentStep < STEPS.length - 1 && currentStep > 0 && (
        <div className="mt-4 flex justify-between">
          <Button variant="outline" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button variant="ghost" onClick={handleNext}>
            Skip
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
