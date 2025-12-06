"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search, Loader2, MapPin, Home, DollarSign, TrendingUp, TrendingDown,
  Building2, Calendar, Ruler, Bath, BedDouble, Download, Printer,
  Camera, Map, BarChart3, ArrowUpRight, ArrowDownRight, Minus,
  CheckCircle2, AlertCircle, Info, FileText, Sparkles, Mail, MessageSquare,
  Share2, Link2, Copy, ExternalLink, Brain, User, Landmark, Percent, CreditCard
} from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with mapbox-gl
const DualMapView = dynamic(
  () => import("@/components/mapbox-property-view").then((mod) => mod.DualMapView),
  { ssr: false, loading: () => <div className="w-full h-64 bg-muted animate-pulse rounded-lg" /> }
);

interface AddressSuggestion {
  id?: string | number; // Property ID from RealEstateAPI
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  zipCode?: string;
  fullAddress?: string;
  latitude?: number;
  longitude?: number;
  propertyType?: string;
}

const US_STATES = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" }, { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" }, { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" }, { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" }, { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" }, { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" }, { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" }, { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" }, { value: "MN", label: "Minnesota" }, { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" }, { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" }, { value: "NH", label: "New Hampshire" }, { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" }, { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" }, { value: "OH", label: "Ohio" }, { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" }, { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" }, { value: "SD", label: "South Dakota" }, { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" }, { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" }, { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" }
];

interface ValuationReport {
  property: {
    id: string | number;
    address: {
      address?: string;
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
      latitude?: number;
      longitude?: number;
    };
    propertyType?: string;
    bedrooms?: number;
    beds?: number;
    bathrooms?: number;
    baths?: number;
    squareFeet?: number;
    buildingSize?: number;
    lotSize?: number;
    lotSquareFeet?: number;
    yearBuilt?: number;
    estimatedValue?: number;
    avm?: number;
    lastSaleAmount?: number;
    lastSaleDate?: string;
    openMortgageBalance?: number;
    mortgageBalance?: number;
    estimatedEquity?: number;
    owner1FirstName?: string;
    owner1LastName?: string;
    ownerOccupied?: boolean;
    latitude?: number;
    longitude?: number;
  };
  comparables: Array<{
    id: string;
    address?: { address?: string; city?: string; state?: string; zip?: string };
    bedrooms?: number;
    beds?: number;
    bathrooms?: number;
    baths?: number;
    squareFeet?: number;
    buildingSize?: number;
    estimatedValue?: number;
    avm?: number;
    lastSaleAmount?: number;
    lastSaleDate?: string;
    yearBuilt?: number;
  }>;
  valuation: {
    estimatedValue: number;
    pricePerSqft: number;
    comparableAvg: number;
    comparablePricePerSqft: number;
    equityEstimate: number;
    confidence: "high" | "medium" | "low";
    adjustments: Array<{ factor: string; impact: number; description: string }>;
  };
  neighborhood: {
    medianValue: number;
    avgPricePerSqft: number;
    totalProperties: number;
    avgYearBuilt: number;
    priceHistory: Array<{ year: number; avgPrice: number }>;
  };
  streetViewUrl: string | null;
  mapUrl: string | null;
}

interface AIAnalysis {
  executiveSummary: string;
  valuationAnalysis: {
    marketPosition: string;
    valueDrivers: string[];
    valueDetractors: string[];
    appreciationPotential: string;
    fairMarketValueRange?: {
      low: string;
      mid: string;
      high: string;
    };
  };
  neighborhoodHistory?: {
    overview: string;
    decadeByDecade: Array<{
      decade: string;
      description: string;
      avgHomePrice: string;
      keyEvents: string[];
    }>;
    futureOutlook: string;
    gentrificationStatus: string;
  };
  priceEvolution?: {
    chartData: Array<{
      year: number;
      avgPrice: number | string;
      thisProperty: number | string | null;
    }>;
    totalAppreciation: string;
    annualizedReturn: string;
  };
  investmentInsights: {
    investorProfile: string;
    rentalPotential: string | {
      estimatedMonthlyRent: string;
      grossYield: string;
      netYield: string;
      rentToValueRatio: string;
    };
    flipPotential: string | {
      rehabCostEstimate: string;
      afterRepairValue: string;
      potentialProfit: string;
      recommendation: string;
    };
    holdStrategy: string;
    cashFlowAnalysis?: {
      monthlyMortgage: string;
      monthlyCashFlow: string;
      breakEvenPoint: string;
    };
  };
  marketTrends: {
    neighborhoodOutlook: string;
    supplyDemand: string | {
      inventoryLevel: string;
      daysOnMarket: string;
      buyerDemand: string;
      priceDirection: string;
    };
    bestTimeToSell: string;
    economicFactors?: string[];
    competingListings?: string;
  };
  comparableAnalysis?: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    pricePositioning: string;
  };
  recommendations: string[];
  riskFactors: string[];
  actionPlan?: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  equityUnlockingStrategies?: {
    zoningOpportunities: {
      currentZoning: string;
      potentialUpzoning: string;
      additionalUnits: string;
      commercialPotential: string;
    };
    lotDevelopment: {
      lotUtilization: string;
      subdivisionPotential: string;
      buildableArea: string;
      landscapingValue: string;
    };
    structuralOpportunities: {
      additionPotential: string;
      conversionOptions: string;
      modernizationROI: string;
    };
    financialStrategies: {
      cashOutRefi: string;
      heloc: string;
      rentalIncome: string;
      shortTermRental: string;
    };
    neighborhoodLeverage: {
      developmentTrends: string;
      infrastructureChanges: string;
      comparableProjects: string;
    };
    estimatedEquityUnlock: string;
    recommendedStrategy: string;
  };
  confidenceScore: number;
  analysisDate: string;
  disclaimer?: string;
}

export default function ValuationPage() {
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ValuationReport | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Store coordinates from Mapbox autocomplete
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);

  // Debounced address autocomplete
  const fetchSuggestions = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 3) {
      setSuggestions([]);
      return;
    }

    setAutocompleteLoading(true);
    try {
      const response = await fetch(`/api/address/autocomplete?q=${encodeURIComponent(searchTerm)}&type=address`);
      const data = await response.json();

      if (data.data && Array.isArray(data.data)) {
        setSuggestions(data.data.slice(0, 8));
      } else if (Array.isArray(data)) {
        setSuggestions(data.slice(0, 8));
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Autocomplete error:", error);
      setSuggestions([]);
    } finally {
      setAutocompleteLoading(false);
    }
  }, []);

  const handleAddressChange = (value: string) => {
    setAddress(value);
    setShowSuggestions(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  const handleSelectAddress = async (suggestion: AddressSuggestion) => {
    // Fill in address fields from suggestion
    const streetAddress = suggestion.street || suggestion.address || "";
    const suggestionCity = suggestion.city || "";
    const suggestionState = suggestion.state || "";
    const suggestionZip = suggestion.zip || suggestion.zipCode || "";

    setAddress(streetAddress);
    setCity(suggestionCity);
    setState(suggestionState);
    setZip(suggestionZip);
    setSuggestions([]);
    setShowSuggestions(false);

    // Store coordinates for later use (e.g., if user clicks "Generate" button)
    setSelectedLat(suggestion.latitude || null);
    setSelectedLng(suggestion.longitude || null);

    // Auto-run property detail/valuation
    toast.info("Fetching property details...");
    setLoading(true);

    console.log("[Valuation Page] Selected suggestion:", suggestion);
    console.log("[Valuation Page] Property ID from autocomplete:", suggestion.id);

    try {
      const response = await fetch("/api/property/valuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: suggestion.id, // PASS THE PROPERTY ID FROM REALESTATE API AUTOCOMPLETE!
          address: streetAddress,
          city: suggestionCity,
          state: suggestionState,
          zip: suggestionZip,
          latitude: suggestion.latitude,
          longitude: suggestion.longitude,
          fullAddress: suggestion.fullAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to generate valuation report");
        return;
      }

      setReport(data);
      toast.success("Valuation report generated!");
    } catch (error) {
      console.error("Valuation error:", error);
      toast.error("Failed to generate valuation report");
    } finally {
      setLoading(false);
    }
  };

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Auto-trigger AI analysis when report loads
  useEffect(() => {
    if (report && !aiAnalysis && !aiLoading) {
      // Delay slightly to let UI render first
      const timer = setTimeout(() => {
        handleAIAnalysis();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [report]);

  const handleSearch = async () => {
    if (!address && !zip) {
      toast.error("Please enter an address or zip code");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/property/valuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          city,
          state,
          zip,
          latitude: selectedLat,
          longitude: selectedLng,
          fullAddress: `${address}, ${city}, ${state} ${zip}`.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to generate valuation report");
        return;
      }

      setReport(data);
      toast.success("Valuation report generated successfully!");
    } catch (error) {
      console.error("Valuation error:", error);
      toast.error("Failed to generate valuation report");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Generate AI Analysis
  const handleAIAnalysis = async () => {
    if (!report) {
      toast.error("Generate a valuation report first");
      return;
    }

    setAiLoading(true);
    try {
      const response = await fetch("/api/property/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property: report.property,
          comparables: report.comparables,
          valuation: report.valuation,
          neighborhood: report.neighborhood,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "AI analysis failed");
        return;
      }

      setAiAnalysis(data.analysis);
      toast.success("AI analysis complete!");
    } catch (error) {
      console.error("AI analysis error:", error);
      toast.error("Failed to generate AI analysis");
    } finally {
      setAiLoading(false);
    }
  };

  // Generate and download PDF
  const handleDownloadPDF = async () => {
    if (!report) return;

    toast.info("Generating PDF...");

    // Create a printable version
    const printContent = reportRef.current;
    if (!printContent) return;

    // Use browser print with PDF option
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to download PDF");
      return;
    }

    const prop = report.property;
    const val = report.valuation;
    const fullAddress = `${prop?.address?.address || prop?.address?.street}, ${prop?.address?.city}, ${prop?.address?.state} ${prop?.address?.zip}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Property Valuation Report - ${fullAddress}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #1a1a1a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
          h2 { color: #374151; margin-top: 30px; }
          .value-box { background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .value-box .amount { font-size: 36px; color: #3b82f6; font-weight: bold; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
          .stat { padding: 15px; background: #f9fafb; border-radius: 6px; }
          .stat-label { color: #6b7280; font-size: 14px; }
          .stat-value { font-size: 18px; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          th { background: #f3f4f6; font-weight: 600; }
          .ai-section { background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .ai-section h3 { color: #1e40af; }
          ul { padding-left: 20px; }
          li { margin: 8px 0; }
          .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Property Valuation Report</h1>
        <p><strong>Address:</strong> ${fullAddress}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>

        <div class="value-box">
          <div class="amount">$${(val?.estimatedValue || 0).toLocaleString()}</div>
          <div>Estimated Value</div>
        </div>

        <h2>Property Details</h2>
        <div class="grid">
          <div class="stat">
            <div class="stat-label">Type</div>
            <div class="stat-value">${prop?.propertyType || "Residential"}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Beds/Baths</div>
            <div class="stat-value">${prop?.bedrooms || prop?.beds || 0}/${prop?.bathrooms || prop?.baths || 0}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Square Feet</div>
            <div class="stat-value">${(prop?.squareFeet || prop?.buildingSize || 0).toLocaleString()}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Year Built</div>
            <div class="stat-value">${prop?.yearBuilt || "N/A"}</div>
          </div>
        </div>

        <h2>Valuation Metrics</h2>
        <div class="grid">
          <div class="stat">
            <div class="stat-label">Price per Sq Ft</div>
            <div class="stat-value">$${val?.pricePerSqft || 0}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Estimated Equity</div>
            <div class="stat-value">$${(val?.equityEstimate || 0).toLocaleString()}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Comparable Avg</div>
            <div class="stat-value">$${(val?.comparableAvg || 0).toLocaleString()}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Confidence</div>
            <div class="stat-value">${(val?.confidence || "medium").toUpperCase()}</div>
          </div>
        </div>

        ${aiAnalysis ? `
        <div class="ai-section">
          <h3>AI Analysis</h3>
          <p><strong>Summary:</strong> ${aiAnalysis.executiveSummary}</p>
          <p><strong>Market Position:</strong> ${aiAnalysis.valuationAnalysis?.marketPosition}</p>
          <p><strong>Appreciation Potential:</strong> ${aiAnalysis.valuationAnalysis?.appreciationPotential}</p>

          <h4>Recommendations</h4>
          <ul>
            ${(aiAnalysis.recommendations || []).map((r: string) => `<li>${r}</li>`).join("")}
          </ul>

          <h4>Risk Factors</h4>
          <ul>
            ${(aiAnalysis.riskFactors || []).map((r: string) => `<li>${r}</li>`).join("")}
          </ul>
        </div>
        ` : ""}

        <h2>Comparable Sales (${report.comparables.length})</h2>
        <table>
          <tr>
            <th>Address</th>
            <th>Beds/Baths</th>
            <th>Sq Ft</th>
            <th>Sale Price</th>
          </tr>
          ${report.comparables.slice(0, 5).map((c: any) => `
            <tr>
              <td>${c.address?.address || "N/A"}</td>
              <td>${c.bedrooms || c.beds || 0}/${c.bathrooms || c.baths || 0}</td>
              <td>${(c.squareFeet || c.buildingSize || 0).toLocaleString()}</td>
              <td>$${(c.lastSaleAmount || c.estimatedValue || 0).toLocaleString()}</td>
            </tr>
          `).join("")}
        </table>

        <div class="footer">
          <p>This report is for informational purposes only. Values are estimates.</p>
          <p>Generated by Outreach Global - Powered by AI</p>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);

    toast.success("PDF ready for download");
  };

  // Share via email
  const handleShareEmail = () => {
    if (!report) return;

    const prop = report.property;
    const val = report.valuation;
    const fullAddress = `${prop?.address?.address || prop?.address?.street}, ${prop?.address?.city}, ${prop?.address?.state} ${prop?.address?.zip}`;

    const subject = encodeURIComponent(`Property Valuation Report - ${fullAddress}`);
    const body = encodeURIComponent(
      `Property Valuation Report\n\n` +
      `Address: ${fullAddress}\n` +
      `Estimated Value: $${(val?.estimatedValue || 0).toLocaleString()}\n` +
      `Price per Sq Ft: $${val?.pricePerSqft || 0}\n` +
      `Beds/Baths: ${prop?.bedrooms || prop?.beds || 0}/${prop?.bathrooms || prop?.baths || 0}\n` +
      `Square Feet: ${(prop?.squareFeet || prop?.buildingSize || 0).toLocaleString()}\n\n` +
      (aiAnalysis ? `AI Analysis Summary:\n${aiAnalysis.executiveSummary}\n\n` : "") +
      `View full report online or contact us for more details.\n\n` +
      `Generated by Outreach Global`
    );

    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
    toast.success("Email client opened");
  };

  // Share via SMS
  const handleShareSMS = () => {
    if (!report) return;

    const prop = report.property;
    const val = report.valuation;
    const fullAddress = `${prop?.address?.address || prop?.address?.street}, ${prop?.address?.city}, ${prop?.address?.state}`;

    const message = encodeURIComponent(
      `Property Valuation: ${fullAddress}\n` +
      `Est. Value: $${(val?.estimatedValue || 0).toLocaleString()}\n` +
      `${prop?.bedrooms || prop?.beds || 0}bd/${prop?.bathrooms || prop?.baths || 0}ba | ${(prop?.squareFeet || prop?.buildingSize || 0).toLocaleString()} sqft`
    );

    // Works on mobile devices
    window.open(`sms:?body=${message}`, "_blank");
    toast.success("SMS opened");
  };

  // Copy link
  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case "high":
        return <Badge className="bg-green-500">High Confidence</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500">Medium Confidence</Badge>;
      case "low":
        return <Badge className="bg-red-500">Low Confidence</Badge>;
      default:
        return null;
    }
  };

  const prop = report?.property;
  const val = report?.valuation;
  const neighborhood = report?.neighborhood;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8" />
          Property Valuation Report
        </h1>
        <p className="text-muted-foreground mt-2">
          Generate a comprehensive valuation report with comparables and neighborhood analysis
        </p>
      </div>

      {/* Search Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Property Lookup
          </CardTitle>
          <CardDescription>
            Enter the property address to generate a valuation report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2 relative">
              <Label htmlFor="address">Street Address</Label>
              <div className="relative">
                <Input
                  id="address"
                  placeholder="Start typing an address..."
                  value={address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="pr-8"
                />
                {autocompleteLoading && (
                  <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {/* Autocomplete dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-64 overflow-auto">
                  {suggestions.map((suggestion, idx) => {
                    const displayAddress = suggestion.fullAddress ||
                      `${suggestion.street || suggestion.address || ""}, ${suggestion.city || ""}, ${suggestion.state || ""} ${suggestion.zip || suggestion.zipCode || ""}`.trim();
                    return (
                      <button
                        key={suggestion.id || idx}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2 transition-colors"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectAddress(suggestion)}
                      >
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{displayAddress}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="Miami"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                placeholder="33101"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleSearch} disabled={loading} className="w-full md:w-auto">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Generate Valuation Report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report */}
      {report && (
        <div ref={reportRef} className="space-y-6 print:space-y-4">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 justify-end print:hidden">
            {/* AI Analysis Button */}
            <Button
              onClick={handleAIAnalysis}
              disabled={aiLoading}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  AI Analysis
                </>
              )}
            </Button>

            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>

            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>

            {/* Share Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowShareMenu(!showShareMenu)}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              {showShareMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-background border rounded-md shadow-lg z-50">
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                    onClick={() => { handleShareEmail(); setShowShareMenu(false); }}
                  >
                    <Mail className="h-4 w-4" />
                    Email Report
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                    onClick={() => { handleShareSMS(); setShowShareMenu(false); }}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Send via SMS
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                    onClick={() => { handleCopyLink(); setShowShareMenu(false); }}
                  >
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Property Header with Key Stats */}
          <Card className="border-2 border-primary/50 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Home className="h-6 w-6" />
                    {prop?.address?.address || prop?.address?.street || "Property"}
                  </CardTitle>
                  <CardDescription className="text-lg mt-1">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    {prop?.address?.city}, {prop?.address?.state} {prop?.address?.zip}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="text-lg px-3 py-1" variant="outline">
                    {prop?.propertyType || "Residential"}
                  </Badge>
                  <Badge className="text-lg px-3 py-1 bg-green-600">
                    {formatCurrency(prop?.estimatedValue || val?.estimatedValue || 0)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="text-center p-3 bg-background rounded-lg">
                  <BedDouble className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xl font-bold">{prop?.bedrooms || prop?.beds || "N/A"}</p>
                  <p className="text-xs text-muted-foreground">Beds</p>
                </div>
                <div className="text-center p-3 bg-background rounded-lg">
                  <Bath className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xl font-bold">{prop?.bathrooms || prop?.baths || "N/A"}</p>
                  <p className="text-xs text-muted-foreground">Baths</p>
                </div>
                <div className="text-center p-3 bg-background rounded-lg">
                  <Ruler className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xl font-bold">{formatNumber(prop?.squareFeet || prop?.buildingSize || 0)}</p>
                  <p className="text-xs text-muted-foreground">Sq Ft</p>
                </div>
                <div className="text-center p-3 bg-background rounded-lg">
                  <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xl font-bold">{prop?.yearBuilt || "N/A"}</p>
                  <p className="text-xs text-muted-foreground">Year Built</p>
                </div>
                <div className="text-center p-3 bg-background rounded-lg">
                  <Map className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xl font-bold">{formatNumber(prop?.lotSquareFeet || prop?.lotSize || 0)}</p>
                  <p className="text-xs text-muted-foreground">Lot Sq Ft</p>
                </div>
                <div className="text-center p-3 bg-background rounded-lg">
                  <DollarSign className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xl font-bold">${val?.pricePerSqft || 0}</p>
                  <p className="text-xs text-muted-foreground">Per Sq Ft</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabbed Property Details */}
          <Tabs defaultValue="property" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="property" className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Property</span>
              </TabsTrigger>
              <TabsTrigger value="owner" className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Owner</span>
              </TabsTrigger>
              <TabsTrigger value="financial" className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Financial</span>
              </TabsTrigger>
              <TabsTrigger value="location" className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Location</span>
              </TabsTrigger>
              <TabsTrigger value="map" className="flex items-center gap-1">
                <Map className="h-4 w-4" />
                <span className="hidden sm:inline">Map</span>
              </TabsTrigger>
            </TabsList>

            {/* Property Tab */}
            <TabsContent value="property">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Property Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Basic Info</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Property ID</span>
                          <span className="font-mono font-medium">{prop?.id || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Property Type</span>
                          <span className="font-medium">{prop?.propertyType || "Unknown"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Year Built</span>
                          <span className="font-medium">{prop?.yearBuilt || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Property Age</span>
                          <span className="font-medium">{prop?.yearBuilt ? `${new Date().getFullYear() - prop.yearBuilt} years` : "N/A"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Size & Layout</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Bedrooms</span>
                          <span className="font-medium">{prop?.bedrooms || prop?.beds || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Bathrooms</span>
                          <span className="font-medium">{prop?.bathrooms || prop?.baths || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Living Area</span>
                          <span className="font-medium">{formatNumber(prop?.squareFeet || prop?.buildingSize || 0)} sq ft</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Lot Size</span>
                          <span className="font-medium">{formatNumber(prop?.lotSquareFeet || prop?.lotSize || 0)} sq ft</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Valuation</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Estimated Value</span>
                          <span className="font-medium text-green-600">{formatCurrency(prop?.estimatedValue || val?.estimatedValue || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Price/Sq Ft</span>
                          <span className="font-medium">{formatCurrency(val?.pricePerSqft || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Comp Average</span>
                          <span className="font-medium">{formatCurrency(val?.comparableAvg || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Confidence</span>
                          {val && getConfidenceBadge(val.confidence)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Owner Tab */}
            <TabsContent value="owner">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Owner Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Owner Details</h4>
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="text-lg font-semibold">
                              {[prop?.owner1FirstName, prop?.owner1LastName].filter(Boolean).join(" ") || "Owner Name Not Available"}
                            </p>
                            <Badge variant={prop?.ownerOccupied ? "default" : "secondary"}>
                              {prop?.ownerOccupied ? "Owner Occupied" : "Non-Owner Occupied"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Ownership Status</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span className="text-muted-foreground">Occupancy</span>
                          <Badge variant={prop?.ownerOccupied ? "default" : "outline"}>
                            {prop?.ownerOccupied ? "Owner Occupied" : "Tenant/Vacant"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Financial Tab */}
            <TabsContent value="financial">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Landmark className="h-5 w-5" />
                    Financial Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Equity Card */}
                    <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                      <div className="flex items-center gap-2 mb-3">
                        <Percent className="h-5 w-5 text-green-600" />
                        <h4 className="font-semibold text-green-800 dark:text-green-400">Equity Position</h4>
                      </div>
                      <p className="text-3xl font-bold text-green-600">{formatCurrency(val?.equityEstimate || prop?.estimatedEquity || 0)}</p>
                      <p className="text-sm text-green-700 dark:text-green-500 mt-1">
                        {((val?.equityEstimate || 0) / (prop?.estimatedValue || 1) * 100).toFixed(0)}% of property value
                      </p>
                    </div>

                    {/* Mortgage Card */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                      <div className="flex items-center gap-2 mb-3">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        <h4 className="font-semibold text-blue-800 dark:text-blue-400">Mortgage Balance</h4>
                      </div>
                      <p className="text-3xl font-bold text-blue-600">{formatCurrency(prop?.openMortgageBalance || prop?.mortgageBalance || 0)}</p>
                      <p className="text-sm text-blue-700 dark:text-blue-500 mt-1">Outstanding balance</p>
                    </div>

                    {/* Last Sale Card */}
                    <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="h-5 w-5 text-purple-600" />
                        <h4 className="font-semibold text-purple-800 dark:text-purple-400">Last Sale</h4>
                      </div>
                      <p className="text-3xl font-bold text-purple-600">{formatCurrency(prop?.lastSaleAmount || 0)}</p>
                      <p className="text-sm text-purple-700 dark:text-purple-500 mt-1">
                        {prop?.lastSaleDate ? new Date(prop.lastSaleDate).toLocaleDateString() : "Date not available"}
                      </p>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Value Breakdown</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between p-2 hover:bg-muted rounded">
                          <span className="text-muted-foreground">Estimated Value</span>
                          <span className="font-semibold">{formatCurrency(prop?.estimatedValue || val?.estimatedValue || 0)}</span>
                        </div>
                        <div className="flex justify-between p-2 hover:bg-muted rounded">
                          <span className="text-muted-foreground">Mortgage Balance</span>
                          <span className="font-semibold text-red-600">-{formatCurrency(prop?.openMortgageBalance || 0)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between p-2 bg-green-50 dark:bg-green-950/20 rounded">
                          <span className="font-medium">Estimated Equity</span>
                          <span className="font-bold text-green-600">{formatCurrency(val?.equityEstimate || 0)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Appreciation</h4>
                      <div className="space-y-3">
                        {prop?.lastSaleAmount && prop?.estimatedValue ? (
                          <>
                            <div className="flex justify-between p-2 hover:bg-muted rounded">
                              <span className="text-muted-foreground">Purchase Price</span>
                              <span className="font-semibold">{formatCurrency(prop.lastSaleAmount)}</span>
                            </div>
                            <div className="flex justify-between p-2 hover:bg-muted rounded">
                              <span className="text-muted-foreground">Current Value</span>
                              <span className="font-semibold">{formatCurrency(prop.estimatedValue)}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-green-50 dark:bg-green-950/20 rounded">
                              <span className="font-medium">Total Appreciation</span>
                              <span className="font-bold text-green-600">
                                +{formatCurrency(prop.estimatedValue - prop.lastSaleAmount)}
                                ({(((prop.estimatedValue - prop.lastSaleAmount) / prop.lastSaleAmount) * 100).toFixed(1)}%)
                              </span>
                            </div>
                          </>
                        ) : (
                          <p className="text-muted-foreground">Sale history not available</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Location Tab */}
            <TabsContent value="location">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Address</h4>
                      <div className="p-4 bg-muted rounded-lg space-y-2">
                        <p className="font-semibold text-lg">{prop?.address?.address || prop?.address?.street}</p>
                        <p>{prop?.address?.city}, {prop?.address?.state} {prop?.address?.zip}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Coordinates</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between p-2 bg-muted rounded">
                          <span className="text-muted-foreground">Latitude</span>
                          <span className="font-mono font-medium">{prop?.address?.latitude || prop?.latitude || "N/A"}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted rounded">
                          <span className="text-muted-foreground">Longitude</span>
                          <span className="font-mono font-medium">{prop?.address?.longitude || prop?.longitude || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Map Tab */}
            <TabsContent value="map">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Property Map & Street View
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(prop?.address?.latitude && prop?.address?.longitude) || (prop?.latitude && prop?.longitude) ? (
                    <DualMapView
                      latitude={Number(prop?.address?.latitude || prop?.latitude)}
                      longitude={Number(prop?.address?.longitude || prop?.longitude)}
                      address={`${prop?.address?.address || prop?.address?.street || ""}, ${prop?.address?.city || ""}, ${prop?.address?.state || ""}`}
                    />
                  ) : (
                    <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <Map className="h-12 w-12 mx-auto mb-2" />
                        <p>Property view not available</p>
                        <p className="text-sm">Coordinates not found for this property</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Valuation Summary */}
          <Card className="border-2 border-primary">
            <CardHeader className="bg-primary/5">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <DollarSign className="h-6 w-6" />
                    Estimated Value
                  </CardTitle>
                  <CardDescription>
                    Based on property details and comparable sales
                  </CardDescription>
                </div>
                {val && getConfidenceBadge(val.confidence)}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-4xl font-bold text-primary">
                    {formatCurrency(val?.estimatedValue || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Estimated Value</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold">
                    {formatCurrency(val?.pricePerSqft || 0)}/sq ft
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Price per Sq Ft</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-green-600">
                    {formatCurrency(val?.equityEstimate || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Estimated Equity</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold">
                    {formatCurrency(val?.comparableAvg || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Comp Average</p>
                </div>
              </div>

              {/* Value Adjustments */}
              {val?.adjustments && val.adjustments.length > 0 && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Value Adjustments
                    </h4>
                    <div className="space-y-2">
                      {val.adjustments.map((adj, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2">
                            {adj.impact > 0 ? (
                              <ArrowUpRight className="h-4 w-4 text-green-500" />
                            ) : adj.impact < 0 ? (
                              <ArrowDownRight className="h-4 w-4 text-red-500" />
                            ) : (
                              <Minus className="h-4 w-4 text-gray-500" />
                            )}
                            <div>
                              <p className="font-medium">{adj.factor}</p>
                              <p className="text-sm text-muted-foreground">{adj.description}</p>
                            </div>
                          </div>
                          <Badge variant={adj.impact > 0 ? "default" : adj.impact < 0 ? "destructive" : "secondary"}>
                            {adj.impact > 0 ? "+" : ""}{adj.impact}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* AI Analysis Results */}
          {aiAnalysis && (
            <Card className="border-2 border-purple-500/50 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Brain className="h-6 w-6 text-purple-600" />
                      AI Investment Analysis
                    </CardTitle>
                    <CardDescription>
                      Powered by Claude AI - Generated {aiAnalysis.analysisDate}
                    </CardDescription>
                  </div>
                  <Badge className="bg-purple-600">
                    {aiAnalysis.confidenceScore}% Confidence
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Executive Summary */}
                <div className="p-4 bg-background rounded-lg border">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    Executive Summary
                  </h4>
                  <p className="text-muted-foreground">{aiAnalysis.executiveSummary}</p>
                </div>

                {/* Neighborhood History Section */}
                {aiAnalysis.neighborhoodHistory && (
                  <div className="p-4 bg-background rounded-lg border">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-indigo-600" />
                      Neighborhood History & Evolution
                    </h4>
                    <p className="text-muted-foreground mb-4">{aiAnalysis.neighborhoodHistory.overview}</p>

                    {/* Decade by Decade Timeline */}
                    <div className="space-y-4">
                      <h5 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Decade by Decade</h5>
                      <div className="relative">
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500"></div>
                        {aiAnalysis.neighborhoodHistory.decadeByDecade?.map((decade, idx) => (
                          <div key={idx} className="relative pl-10 pb-6 last:pb-0">
                            <div className="absolute left-2.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-background"></div>
                            <div className="bg-muted/50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-lg">{decade.decade}</span>
                                <Badge variant="outline">{decade.avgHomePrice}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{decade.description}</p>
                              {decade.keyEvents?.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {decade.keyEvents.map((event, eventIdx) => (
                                    <Badge key={eventIdx} variant="secondary" className="text-xs">{event}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Future Outlook (5-10 years)</p>
                        <p className="font-medium">{aiAnalysis.neighborhoodHistory.futureOutlook}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Gentrification Status</p>
                        <Badge variant="outline">{aiAnalysis.neighborhoodHistory.gentrificationStatus}</Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* Price Evolution Chart */}
                {aiAnalysis.priceEvolution?.chartData && (
                  <div className="p-4 bg-background rounded-lg border">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-green-600" />
                      Price Evolution Over Time
                    </h4>
                    <div className="h-48 flex items-end gap-2">
                      {aiAnalysis.priceEvolution.chartData.filter(d => typeof d.avgPrice === 'number').map((point, idx) => {
                        const maxPrice = Math.max(...aiAnalysis.priceEvolution!.chartData.filter(d => typeof d.avgPrice === 'number').map(d => d.avgPrice as number));
                        const height = maxPrice > 0 ? ((point.avgPrice as number) / maxPrice) * 100 : 0;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center">
                            <div className="relative w-full">
                              <div
                                className="w-full bg-gradient-to-t from-green-600 to-green-400 rounded-t transition-all"
                                style={{ height: `${height * 1.5}px` }}
                              />
                              {point.thisProperty && typeof point.thisProperty === 'number' && (
                                <div
                                  className="absolute w-3 h-3 rounded-full bg-purple-600 border-2 border-white left-1/2 -translate-x-1/2"
                                  style={{ bottom: `${(point.thisProperty / maxPrice) * 100 * 1.5}px` }}
                                />
                              )}
                            </div>
                            <p className="text-xs mt-1 font-medium">{point.year}</p>
                            <p className="text-xs text-muted-foreground">
                              ${typeof point.avgPrice === 'number' ? (point.avgPrice / 1000).toFixed(0) + 'K' : '-'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-center gap-6 mt-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        <span>Area Avg</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                        <span>This Property</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{aiAnalysis.priceEvolution.totalAppreciation}</p>
                        <p className="text-xs text-muted-foreground">Total Appreciation</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{aiAnalysis.priceEvolution.annualizedReturn}</p>
                        <p className="text-xs text-muted-foreground">Annualized Return</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Analysis Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Valuation Analysis */}
                  <div className="p-4 bg-background rounded-lg border">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      Valuation Analysis
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Market Position</p>
                        <p className="font-medium">{aiAnalysis.valuationAnalysis?.marketPosition}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Appreciation Potential</p>
                        <p className="font-medium">{aiAnalysis.valuationAnalysis?.appreciationPotential}</p>
                      </div>
                      {aiAnalysis.valuationAnalysis?.fairMarketValueRange && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Fair Market Value Range</p>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-red-600">{aiAnalysis.valuationAnalysis.fairMarketValueRange.low}</Badge>
                            <Badge className="bg-green-600">{aiAnalysis.valuationAnalysis.fairMarketValueRange.mid}</Badge>
                            <Badge variant="outline" className="text-green-600">{aiAnalysis.valuationAnalysis.fairMarketValueRange.high}</Badge>
                          </div>
                        </div>
                      )}
                      {aiAnalysis.valuationAnalysis?.valueDrivers?.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Value Drivers</p>
                          <ul className="text-sm space-y-1">
                            {aiAnalysis.valuationAnalysis.valueDrivers.map((driver, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                {driver}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Investment Insights */}
                  <div className="p-4 bg-background rounded-lg border">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      Investment Insights
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Investor Profile</p>
                        <p className="font-medium">{aiAnalysis.investmentInsights?.investorProfile}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Rental Potential</p>
                        <p className="font-medium">
                          {typeof aiAnalysis.investmentInsights?.rentalPotential === 'string'
                            ? aiAnalysis.investmentInsights.rentalPotential
                            : aiAnalysis.investmentInsights?.rentalPotential?.estimatedMonthlyRent}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Flip Potential</p>
                        <p className="font-medium">
                          {typeof aiAnalysis.investmentInsights?.flipPotential === 'string'
                            ? aiAnalysis.investmentInsights.flipPotential
                            : aiAnalysis.investmentInsights?.flipPotential?.recommendation}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Hold Strategy</p>
                        <p className="font-medium">{aiAnalysis.investmentInsights?.holdStrategy}</p>
                      </div>
                    </div>
                  </div>

                  {/* Market Trends */}
                  <div className="p-4 bg-background rounded-lg border">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-orange-600" />
                      Market Trends
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Neighborhood Outlook</p>
                        <p className="font-medium">{aiAnalysis.marketTrends?.neighborhoodOutlook}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Supply & Demand</p>
                        <p className="font-medium">
                          {typeof aiAnalysis.marketTrends?.supplyDemand === 'string'
                            ? aiAnalysis.marketTrends.supplyDemand
                            : `${aiAnalysis.marketTrends?.supplyDemand?.inventoryLevel} inventory, ${aiAnalysis.marketTrends?.supplyDemand?.priceDirection}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Best Time to Sell</p>
                        <p className="font-medium">{aiAnalysis.marketTrends?.bestTimeToSell}</p>
                      </div>
                      {aiAnalysis.marketTrends?.economicFactors && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Economic Factors</p>
                          <div className="flex flex-wrap gap-1">
                            {aiAnalysis.marketTrends.economicFactors.map((factor, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">{factor}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recommendations & Risks */}
                  <div className="p-4 bg-background rounded-lg border">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Info className="h-4 w-4 text-purple-600" />
                      Recommendations & Risks
                    </h4>
                    {aiAnalysis.recommendations?.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm text-muted-foreground mb-2">Recommendations</p>
                        <ul className="text-sm space-y-1">
                          {aiAnalysis.recommendations.slice(0, 5).map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <ArrowUpRight className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiAnalysis.riskFactors?.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Risk Factors</p>
                        <ul className="text-sm space-y-1">
                          {aiAnalysis.riskFactors.slice(0, 4).map((risk, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                              {risk}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Equity Unlocking Strategies */}
                {aiAnalysis.equityUnlockingStrategies && (
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg border border-green-200 dark:border-green-900">
                    <h4 className="font-semibold mb-4 flex items-center gap-2 text-green-800 dark:text-green-400">
                      <Landmark className="h-5 w-5" />
                      Equity Unlocking Strategies
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Zoning Opportunities */}
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium mb-2 flex items-center gap-1 text-sm">
                          <Building2 className="h-4 w-4" />
                          Zoning Opportunities
                        </h5>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Current:</span>
                            <p className="font-medium">{aiAnalysis.equityUnlockingStrategies.zoningOpportunities.currentZoning}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">ADU/Additional Units:</span>
                            <p className="font-medium">{aiAnalysis.equityUnlockingStrategies.zoningOpportunities.additionalUnits}</p>
                          </div>
                        </div>
                      </div>

                      {/* Lot Development */}
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium mb-2 flex items-center gap-1 text-sm">
                          <Map className="h-4 w-4" />
                          Lot Development
                        </h5>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Subdivision:</span>
                            <p className="font-medium">{aiAnalysis.equityUnlockingStrategies.lotDevelopment.subdivisionPotential}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Buildable Area:</span>
                            <p className="font-medium">{aiAnalysis.equityUnlockingStrategies.lotDevelopment.buildableArea}</p>
                          </div>
                        </div>
                      </div>

                      {/* Financial Strategies */}
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium mb-2 flex items-center gap-1 text-sm">
                          <CreditCard className="h-4 w-4" />
                          Financial Strategies
                        </h5>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Cash-Out Refi:</span>
                            <p className="font-medium">{aiAnalysis.equityUnlockingStrategies.financialStrategies.cashOutRefi}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">HELOC:</span>
                            <p className="font-medium">{aiAnalysis.equityUnlockingStrategies.financialStrategies.heloc}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Estimated Equity Unlock Potential</p>
                        <p className="text-2xl font-bold text-green-600">{aiAnalysis.equityUnlockingStrategies.estimatedEquityUnlock}</p>
                      </div>
                      <div className="flex-1 max-w-md">
                        <p className="text-sm text-muted-foreground">Recommended Strategy</p>
                        <p className="font-medium">{aiAnalysis.equityUnlockingStrategies.recommendedStrategy}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Plan */}
                {aiAnalysis.actionPlan && (
                  <div className="p-4 bg-background rounded-lg border">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      Action Plan
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-orange-600 mb-2">Immediate (30 days)</p>
                        <ul className="text-sm space-y-1">
                          {aiAnalysis.actionPlan.immediate?.map((action, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-orange-500">•</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-600 mb-2">Short-Term (3-6 months)</p>
                        <ul className="text-sm space-y-1">
                          {aiAnalysis.actionPlan.shortTerm?.map((action, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-blue-500">•</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-600 mb-2">Long-Term (1-5 years)</p>
                        <ul className="text-sm space-y-1">
                          {aiAnalysis.actionPlan.longTerm?.map((action, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-green-500">•</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Disclaimer */}
                {aiAnalysis.disclaimer && (
                  <p className="text-xs text-muted-foreground text-center italic">{aiAnalysis.disclaimer}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Comparable Sales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Comparable Sales
              </CardTitle>
              <CardDescription>
                Recent sales of similar properties in the area
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report.comparables.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Address</TableHead>
                      <TableHead>Beds/Baths</TableHead>
                      <TableHead>Sq Ft</TableHead>
                      <TableHead>Year Built</TableHead>
                      <TableHead>Sale Price</TableHead>
                      <TableHead>$/Sq Ft</TableHead>
                      <TableHead>Sale Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.comparables.map((comp, idx) => {
                      const compSqft = comp.squareFeet || comp.buildingSize || 0;
                      const compValue = comp.lastSaleAmount || comp.estimatedValue || comp.avm || 0;
                      const compPricePerSqft = compSqft > 0 ? compValue / compSqft : 0;

                      return (
                        <TableRow key={comp.id || idx}>
                          <TableCell className="font-medium">
                            {comp.address?.address || "N/A"}, {comp.address?.city}
                          </TableCell>
                          <TableCell>
                            {comp.bedrooms || comp.beds || 0}/{comp.bathrooms || comp.baths || 0}
                          </TableCell>
                          <TableCell>{formatNumber(compSqft)}</TableCell>
                          <TableCell>{comp.yearBuilt || "N/A"}</TableCell>
                          <TableCell>{formatCurrency(compValue)}</TableCell>
                          <TableCell>{formatCurrency(Math.round(compPricePerSqft))}</TableCell>
                          <TableCell>
                            {comp.lastSaleDate
                              ? new Date(comp.lastSaleDate).toLocaleDateString()
                              : "N/A"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="h-8 w-8 mx-auto mb-2" />
                  <p>No comparable sales found in the area</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Neighborhood Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Neighborhood Analysis
              </CardTitle>
              <CardDescription>
                Market statistics for {prop?.address?.zip || prop?.address?.city}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{formatCurrency(neighborhood?.medianValue || 0)}</p>
                  <p className="text-sm text-muted-foreground">Median Home Value</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{formatCurrency(neighborhood?.avgPricePerSqft || 0)}/sq ft</p>
                  <p className="text-sm text-muted-foreground">Avg Price per Sq Ft</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{formatNumber(neighborhood?.totalProperties || 0)}</p>
                  <p className="text-sm text-muted-foreground">Total Properties</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{neighborhood?.avgYearBuilt || "N/A"}</p>
                  <p className="text-sm text-muted-foreground">Avg Year Built</p>
                </div>
              </div>

              {/* Price History Chart (simplified) */}
              {neighborhood?.priceHistory && neighborhood.priceHistory.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Price History Trend</h4>
                  <div className="flex items-end gap-2 h-32">
                    {neighborhood.priceHistory.map((ph, idx) => {
                      const maxPrice = Math.max(...neighborhood.priceHistory.map((p) => p.avgPrice));
                      const height = maxPrice > 0 ? (ph.avgPrice / maxPrice) * 100 : 0;

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center">
                          <div
                            className="w-full bg-primary rounded-t transition-all"
                            style={{ height: `${height}%` }}
                          />
                          <p className="text-xs mt-1">{ph.year}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(ph.avgPrice).replace("$", "").replace(",000", "K")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Report Footer */}
          <div className="text-center text-sm text-muted-foreground py-4 print:py-8">
            <p>Report generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
            <p className="mt-1">Data provided by RealEstateAPI. Values are estimates only.</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!report && !loading && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Report Generated</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Enter a property address above to generate a comprehensive valuation report
              with comparable sales, neighborhood analysis, and Street View photos.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:space-y-4, .print\\:space-y-4 * {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
          .container {
            max-width: 100% !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
